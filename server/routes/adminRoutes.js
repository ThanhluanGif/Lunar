const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { getPool } = require('../db/connection');
const {
  realUsersStore,
  realPaymentsStore,
  realAuditLogsStore,
  realLoginEventsStore,
  findUserById
} = require('../services/userStore');

const router = express.Router();
router.use(verifyToken, requireRole('ADMIN'));

const VALID_TIERS = new Set(['FREE', 'PRO', 'ENTERPRISE']);
const VALID_ROLES = new Set(['USER', 'ADMIN']);
const VALID_USER_STATUSES = new Set(['ACTIVE', 'SUSPENDED']);
const VALID_PAYMENT_STATUSES = new Set(['SUCCESS', 'FAILED', 'EXPIRED']);

function requireReason(req, res) {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 5 || reason.length > 500) {
    res.status(400).json({ success: false, error: 'Cần cung cấp lý do từ 5 đến 500 ký tự.' });
    return null;
  }
  return reason;
}

function sanitizeUser(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    name: row.name,
    email: row.email,
    tier: row.tier,
    role: row.role,
    status: row.status,
    dailyScansUsed: row.daily_scans_used ?? row.dailyScansUsed ?? 0,
    lastScanResetAt: row.last_scan_reset_at ?? row.lastScanResetAt,
    lastLoginAt: row.last_login_at ?? row.lastLoginAt,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt
  };
}

async function writeAudit(client, req, {
  actionType,
  targetType,
  targetId,
  targetUserId = null,
  reason,
  beforeState,
  afterState
}) {
  if (!client) {
    realAuditLogsStore.unshift({
      id: Date.now(),
      actionType,
      targetType,
      targetId: String(targetId),
      reason,
      createdAt: new Date().toISOString(),
      actorEmail: req.user?.email || 'admin@lunar.dev'
    });
    return;
  }

  await client.query(
    `INSERT INTO admin_action_logs (
       actor_user_id, target_user_id, action_type, target_type, target_id,
       reason, before_state, after_state, ip_address, user_agent, correlation_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      req.user.id,
      targetUserId,
      actionType,
      targetType,
      String(targetId),
      reason,
      beforeState,
      afterState,
      req.ip,
      req.get('user-agent') || null,
      req.correlationId
    ]
  );
}

// 1. GET /api/v1/admin/overview
router.get('/overview', async (req, res) => {
  const pool = getPool();
  if (!pool) {
    // Return strictly real runtime data from realUsersStore and real logs (no mock data)
    const activeUsersList = realUsersStore.filter((u) => u.status === 'ACTIVE');
    const adminCount = realUsersStore.filter((u) => u.role === 'ADMIN').length;
    const currentMonthRevenue = realPaymentsStore
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogins = realLoginEventsStore.filter((e) => e.created_at?.startsWith(todayStr)).length;

    const freeCount = realUsersStore.filter((u) => u.tier === 'FREE').length;
    const proCount = realUsersStore.filter((u) => u.tier === 'PRO').length;
    const entCount = realUsersStore.filter((u) => u.tier === 'ENTERPRISE').length;

    return res.json({
      success: true,
      source: 'real_runtime_sync',
      scope: 'SYSTEM',
      generatedAt: new Date().toISOString(),
      metrics: {
        totalUsers: realUsersStore.length,
        activeUsers: activeUsersList.length,
        admins: adminCount,
        newUsers30d: realUsersStore.length,
        loginEventsToday: todayLogins,
        totalProjects: 0,
        totalScans: 0,
        scans30d: 0,
        openFindings: 0,
        patchedFindings: 0,
        revenueCurrentMonth: currentMonthRevenue,
        revenuePreviousMonth: 0,
        revenueGrowthPercent: null
      },
      usersByTier: [
        { tier: 'FREE', count: freeCount },
        { tier: 'PRO', count: proCount },
        { tier: 'ENTERPRISE', count: entCount }
      ],
      paymentsByStatus: [
        { status: 'SUCCESS', count: realPaymentsStore.filter((p) => p.status === 'SUCCESS').length, amount: currentMonthRevenue }
      ],
      recentPayments: realPaymentsStore,
      recentAdminActions: realAuditLogsStore
    });
  }

  try {
    const [kpis, tiers, payments, recentPayments, recentActions] = await Promise.all([
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM users) AS total_users,
           (SELECT COUNT(*)::int FROM users WHERE status = 'ACTIVE') AS active_users,
           (SELECT COUNT(*)::int FROM users WHERE role = 'ADMIN') AS admins,
           (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_30d,
           (SELECT COUNT(*)::int FROM user_login_events WHERE created_at >= CURRENT_DATE) AS login_events_today,
           (SELECT COUNT(*)::int FROM projects) AS total_projects,
           (SELECT COUNT(*)::int FROM scans) AS total_scans,
           (SELECT COUNT(*)::int FROM scans WHERE created_at >= NOW() - INTERVAL '30 days') AS scans_30d,
           (SELECT COUNT(*)::int FROM vulnerabilities WHERE status = 'open') AS open_findings,
           (SELECT COUNT(*)::int FROM vulnerabilities WHERE status = 'patched') AS patched_findings,
           (SELECT COALESCE(SUM(amount), 0)::bigint
              FROM payments
             WHERE status = 'SUCCESS'
               AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS revenue_current_month,
           (SELECT COALESCE(SUM(amount), 0)::bigint
              FROM payments
             WHERE status = 'SUCCESS'
               AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
               AND created_at < DATE_TRUNC('month', CURRENT_DATE)) AS revenue_previous_month`
      ),
      pool.query(
        `SELECT tier, COUNT(*)::int AS count
         FROM users
         GROUP BY tier
         ORDER BY tier`
      ),
      pool.query(
        `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::bigint AS amount
         FROM payments
         GROUP BY status
         ORDER BY status`
      ),
      pool.query(
        `SELECT
           p.order_code AS "orderCode",
           p.amount,
           p.currency,
           p.tier_target AS "tierTarget",
           p.payment_method AS "paymentMethod",
           p.status,
           p.created_at AS "createdAt",
           p.updated_at AS "updatedAt",
           u.id AS "userId",
           u.name AS "userName",
           u.email AS "userEmail"
         FROM payments p
         LEFT JOIN users u ON u.id = p.user_id
         ORDER BY p.created_at DESC
         LIMIT 25`
      ),
      pool.query(
        `SELECT
           l.id,
           l.action_type AS "actionType",
           l.target_type AS "targetType",
           l.target_id AS "targetId",
           l.reason,
           l.created_at AS "createdAt",
           actor.email AS "actorEmail"
         FROM admin_action_logs l
         LEFT JOIN users actor ON actor.id = l.actor_user_id
         ORDER BY l.created_at DESC
         LIMIT 20`
      )
    ]);

    const metrics = kpis.rows[0];
    const currentRevenue = Number(metrics.revenue_current_month);
    const previousRevenue = Number(metrics.revenue_previous_month);

    return res.json({
      success: true,
      source: 'postgresql',
      scope: 'SYSTEM',
      generatedAt: new Date().toISOString(),
      metrics: {
        totalUsers: metrics.total_users,
        activeUsers: metrics.active_users,
        admins: metrics.admins,
        newUsers30d: metrics.new_users_30d,
        loginEventsToday: metrics.login_events_today,
        totalProjects: metrics.total_projects,
        totalScans: metrics.total_scans,
        scans30d: metrics.scans_30d,
        openFindings: metrics.open_findings,
        patchedFindings: metrics.patched_findings,
        revenueCurrentMonth: currentRevenue,
        revenuePreviousMonth: previousRevenue,
        revenueGrowthPercent: previousRevenue > 0
          ? Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2))
          : null
      },
      usersByTier: tiers.rows,
      paymentsByStatus: payments.rows.map((row) => ({ ...row, amount: Number(row.amount) })),
      recentPayments: recentPayments.rows,
      recentAdminActions: recentActions.rows
    });
  } catch (error) {
    req.log?.error('Admin overview query failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Không thể tải dữ liệu tổng quan quản trị.' });
  }
});

// 2. GET /api/v1/admin/users
router.get('/users', async (req, res) => {
  const pool = getPool();
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const tier = VALID_TIERS.has(req.query.tier) ? req.query.tier : null;
  const role = VALID_ROLES.has(req.query.role) ? req.query.role : null;
  const status = VALID_USER_STATUSES.has(req.query.status) ? req.query.status : null;
  const includeQa = req.query.includeQa === 'true';

  if (!pool) {
    let filtered = realUsersStore.filter((u) => (
      includeQa || (!u.email?.startsWith('qa-') && !u.email?.startsWith('browser-') && !u.email?.endsWith('@example.com'))
    ));
    if (search) {
      filtered = filtered.filter(
        (u) => u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search) || u.nickname?.toLowerCase().includes(search)
      );
    }
    if (tier) filtered = filtered.filter((u) => u.tier === tier);
    if (role) filtered = filtered.filter((u) => u.role === role);
    if (status) filtered = filtered.filter((u) => u.status === status);

    return res.json({
      success: true,
      source: 'real_runtime_sync',
      page: 1,
      limit: 100,
      total: filtered.length,
      users: filtered.map(sanitizeUser)
    });
  }

  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT
         id, nickname, name, email, tier, role, status,
         daily_scans_used, last_scan_reset_at, last_login_at, created_at, updated_at,
         COUNT(*) OVER()::int AS total_count
       FROM users
       WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%' OR nickname ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR tier = $2)
         AND ($3::text IS NULL OR role = $3)
         AND ($4::text IS NULL OR status = $4)
         AND ($7::boolean IS TRUE OR (email NOT LIKE 'qa-%' AND email NOT LIKE 'browser-%' AND email NOT LIKE '%@example.com'))
       ORDER BY created_at DESC
       LIMIT $5 OFFSET $6`,
      [search, tier, role, status, limit, offset, includeQa]
    );

    return res.json({
      success: true,
      page,
      limit,
      total: result.rows[0]?.total_count || 0,
      users: result.rows.map(sanitizeUser)
    });
  } catch (error) {
    req.log?.error('Admin users query failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Không thể tải danh sách người dùng.' });
  }
});

// 3. PATCH /api/v1/admin/users/:userId
router.patch('/users/:userId', async (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;

  const { tier, role, status } = req.body;
  if (!tier && !role && !status) {
    return res.status(400).json({ success: false, error: 'Cần cập nhật ít nhất 1 thuộc tính (tier, role, status).' });
  }
  if (tier && !VALID_TIERS.has(tier)) {
    return res.status(400).json({ success: false, error: 'Gói nâng cấp không hợp lệ.' });
  }
  if (role && !VALID_ROLES.has(role)) {
    return res.status(400).json({ success: false, error: 'Vai trò người dùng không hợp lệ.' });
  }
  if (status && !VALID_USER_STATUSES.has(status)) {
    return res.status(400).json({ success: false, error: 'Trạng thái người dùng không hợp lệ.' });
  }

  const pool = getPool();
  if (!pool) {
    const user = findUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });
    }
    const beforeState = JSON.stringify(sanitizeUser(user));
    if (tier) user.tier = tier;
    if (role) user.role = role;
    if (status) user.status = status;
    user.updated_at = new Date().toISOString();
    const afterState = JSON.stringify(sanitizeUser(user));

    await writeAudit(null, req, {
      actionType: tier ? 'UPDATE_TIER' : role ? 'UPDATE_ROLE' : 'UPDATE_STATUS',
      targetType: 'USER',
      targetId: req.params.userId,
      targetUserId: req.params.userId,
      reason,
      beforeState,
      afterState
    });

    return res.json({
      success: true,
      message: 'Cập nhật tài khoản người dùng thành công.',
      user: sanitizeUser(user)
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.params.userId]);
    if (!existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });
    }

    const beforeUser = sanitizeUser(existing.rows[0]);
    const nextTier = tier || beforeUser.tier;
    const nextRole = role || beforeUser.role;
    const nextStatus = status || beforeUser.status;

    const updated = await client.query(
      `UPDATE users
          SET tier = $1, role = $2, status = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *`,
      [nextTier, nextRole, nextStatus, req.params.userId]
    );

    const afterUser = sanitizeUser(updated.rows[0]);
    await writeAudit(client, req, {
      actionType: tier ? 'UPDATE_TIER' : role ? 'UPDATE_ROLE' : 'UPDATE_STATUS',
      targetType: 'USER',
      targetId: req.params.userId,
      targetUserId: req.params.userId,
      reason,
      beforeState: JSON.stringify(beforeUser),
      afterState: JSON.stringify(afterUser)
    });

    await client.query('COMMIT');
    return res.json({
      success: true,
      message: 'Cập nhật tài khoản người dùng thành công.',
      user: afterUser
    });
  } catch (error) {
    await client.query('ROLLBACK');
    req.log?.error('Admin user update failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Lỗi cập nhật người dùng.' });
  } finally {
    client.release();
  }
});

// 4. POST /api/v1/admin/users/:userId/reset-quota
router.post('/users/:userId/reset-quota', async (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;

  const pool = getPool();
  if (!pool) {
    const user = findUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });
    }
    user.daily_scans_used = 0;
    user.last_scan_reset_at = new Date().toISOString();
    return res.json({
      success: true,
      message: 'Đã reset hạn ngạch lượt quét hàng ngày thành công.',
      user: sanitizeUser(user)
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.params.userId]);
    if (!existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });
    }

    const beforeUser = sanitizeUser(existing.rows[0]);
    const updated = await client.query(
      `UPDATE users
          SET daily_scans_used = 0, last_scan_reset_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
      [req.params.userId]
    );
    const afterUser = sanitizeUser(updated.rows[0]);

    await writeAudit(client, req, {
      actionType: 'RESET_QUOTA',
      targetType: 'USER',
      targetId: req.params.userId,
      targetUserId: req.params.userId,
      reason,
      beforeState: JSON.stringify(beforeUser),
      afterState: JSON.stringify(afterUser)
    });

    await client.query('COMMIT');
    return res.json({
      success: true,
      message: 'Đã reset hạn ngạch lượt quét hàng ngày thành công.',
      user: afterUser
    });
  } catch (error) {
    await client.query('ROLLBACK');
    req.log?.error('Admin reset quota failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Lỗi reset hạn ngạch người dùng.' });
  } finally {
    client.release();
  }
});

// 4b. POST /api/v1/admin/users/cleanup-qa
router.post('/users/cleanup-qa', async (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;

  const pool = getPool();
  if (!pool) {
    const originalCount = realUsersStore.length;
    for (let i = realUsersStore.length - 1; i >= 0; i--) {
      const email = realUsersStore[i].email || '';
      if (email.startsWith('qa-') || email.startsWith('browser-') || email.endsWith('@example.com')) {
        realUsersStore.splice(i, 1);
      }
    }
    const purgedCount = originalCount - realUsersStore.length;
    return res.json({
      success: true,
      message: `Đã dọn dẹp ${purgedCount} tài khoản QA test tự động khỏi bộ nhớ.`,
      purgedCount
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM user_login_events
       WHERE user_id IN (
         SELECT id FROM users
         WHERE email LIKE 'qa-%' OR email LIKE 'browser-%' OR email LIKE '%@example.com'
       )`
    );
    const deleteUsersRes = await client.query(
      `DELETE FROM users
       WHERE email LIKE 'qa-%' OR email LIKE 'browser-%' OR email LIKE '%@example.com'`
    );
    await client.query('COMMIT');
    return res.json({
      success: true,
      message: `Đã dọn dẹp ${deleteUsersRes.rowCount} tài khoản QA test khỏi PostgreSQL.`,
      purgedCount: deleteUsersRes.rowCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    req.log?.error('Admin QA cleanup failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Không thể dọn dẹp tài khoản QA test.' });
  } finally {
    client.release();
  }
});

// 5. GET /api/v1/admin/payments
router.get('/payments', async (req, res) => {
  const pool = getPool();
  if (!pool) {
    return res.json({
      success: true,
      source: 'real_runtime_sync',
      payments: realPaymentsStore
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         p.order_code AS "orderCode",
         p.amount,
         p.currency,
         p.tier_target AS "tierTarget",
         p.payment_method AS "paymentMethod",
         p.status,
         p.created_at AS "createdAt",
         p.updated_at AS "updatedAt",
         u.id AS "userId",
         u.name AS "userName",
         u.email AS "userEmail"
       FROM payments p
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 100`
    );

    return res.json({
      success: true,
      payments: result.rows
    });
  } catch (error) {
    req.log?.error('Admin payments query failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Không thể tải danh sách giao dịch.' });
  }
});

// 6. PATCH /api/v1/admin/payments/:orderCode
router.patch('/payments/:orderCode', async (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;

  const { status } = req.body;
  if (!VALID_PAYMENT_STATUSES.has(status)) {
    return res.status(400).json({ success: false, error: 'Trạng thái thanh toán không hợp lệ.' });
  }

  const pool = getPool();
  if (!pool) {
    const paymentIndex = realPaymentsStore.findIndex((p) => p.orderCode === req.params.orderCode);
    if (paymentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch.' });
    }
    realPaymentsStore[paymentIndex].status = status;
    realPaymentsStore[paymentIndex].updatedAt = new Date().toISOString();

    return res.json({
      success: true,
      message: 'Cập nhật trạng thái thanh toán thành công.',
      payment: realPaymentsStore[paymentIndex]
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT * FROM payments WHERE order_code = $1 FOR UPDATE',
      [req.params.orderCode]
    );
    if (!existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch.' });
    }

    const beforePayment = existing.rows[0];
    const updated = await client.query(
      `UPDATE payments
          SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE order_code = $2
        RETURNING *`,
      [status, req.params.orderCode]
    );
    const afterPayment = updated.rows[0];

    if (status === 'SUCCESS' && beforePayment.status !== 'SUCCESS') {
      await client.query(
        `UPDATE users
            SET tier = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
        [beforePayment.tier_target, beforePayment.user_id]
      );
    }

    await writeAudit(client, req, {
      actionType: 'UPDATE_PAYMENT_STATUS',
      targetType: 'PAYMENT',
      targetId: req.params.orderCode,
      targetUserId: beforePayment.user_id,
      reason,
      beforeState: JSON.stringify(beforePayment),
      afterState: JSON.stringify(afterPayment)
    });

    await client.query('COMMIT');
    return res.json({
      success: true,
      message: 'Cập nhật trạng thái thanh toán thành công.',
      payment: afterPayment
    });
  } catch (error) {
    await client.query('ROLLBACK');
    req.log?.error('Admin payment update failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Lỗi cập nhật giao dịch.' });
  } finally {
    client.release();
  }
});

// 7. GET /api/v1/admin/audit-log
router.get('/audit-log', async (req, res) => {
  const pool = getPool();
  if (!pool) {
    return res.json({
      success: true,
      source: 'real_runtime_sync',
      logs: realAuditLogsStore
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         l.id,
         l.action_type AS "actionType",
         l.target_type AS "targetType",
         l.target_id AS "targetId",
         l.reason,
         l.before_state AS "beforeState",
         l.after_state AS "afterState",
         l.created_at AS "createdAt",
         actor.email AS "actorEmail"
       FROM admin_action_logs l
       LEFT JOIN users actor ON actor.id = l.actor_user_id
       ORDER BY l.created_at DESC
       LIMIT 100`
    );

    return res.json({ success: true, logs: result.rows });
  } catch (error) {
    req.log?.error('Admin audit log query failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Không thể tải nhật ký quản trị.' });
  }
});

// 8. GET /api/v1/admin/analytics
router.get('/analytics', async (req, res) => {
  const pool = getPool();
  const days = [7, 14, 30, 90].includes(Number.parseInt(req.query.days, 10))
    ? Number.parseInt(req.query.days, 10)
    : 14;

  if (!pool) {
    const now = new Date();
    // Compute strict real daily counts from realUsersStore & realLoginEventsStore (NO mock random numbers)
    const dailyActivity = Array.from({ length: days }).map((_, i) => {
      const dateStr = new Date(now.getTime() - (days - 1 - i) * 86400000).toISOString().split('T')[0];
      const newUsers = realUsersStore.filter((u) => u.created_at?.startsWith(dateStr)).length;
      const loginCount = realLoginEventsStore.filter((e) => e.created_at?.startsWith(dateStr)).length;
      return {
        date: dateStr,
        newUsers,
        loginCount,
        scansCount: 0,
        vulnsFound: 0,
        vulnsPatched: 0
      };
    });

    const recentLogins = realLoginEventsStore
      .filter((e) => {
        const u = findUserById(e.user_id);
        const email = (u?.email || '').toLowerCase();
        return u && !email.startsWith('qa-') && !email.startsWith('browser-') && !email.endsWith('@example.com');
      })
      .map((e) => {
        const u = findUserById(e.user_id) || {};
        return {
          loginEventId: e.id,
          id: e.user_id,
          nickname: u.nickname || '@user',
          name: u.name || 'User',
          email: u.email || 'user@lunar.dev',
          tier: u.tier || 'FREE',
          role: u.role || 'USER',
          status: u.status || 'ACTIVE',
          dailyScansUsed: u.daily_scans_used || 0,
          authMethod: e.auth_method || 'PASSWORD',
          loginAt: e.created_at,
          createdAt: u.created_at || e.created_at
        };
      });

    const freeCount = realUsersStore.filter((u) => u.tier === 'FREE').length;
    const proCount = realUsersStore.filter((u) => u.tier === 'PRO').length;
    const entCount = realUsersStore.filter((u) => u.tier === 'ENTERPRISE').length;

    return res.json({
      success: true,
      source: 'real_runtime_sync',
      scope: 'SYSTEM',
      generatedAt: new Date().toISOString(),
      rangeDays: days,
      dailyActivity,
      recentLogins,
      tierBreakdown: [
        { tier: 'FREE', count: freeCount },
        { tier: 'PRO', count: proCount },
        { tier: 'ENTERPRISE', count: entCount }
      ]
    });
  }

  try {
    const [activityResult, recentLoginsResult, tierBreakdownResult] = await Promise.all([
      pool.query(
        `SELECT
           day::date AS date,
           (SELECT COUNT(*)::int FROM users WHERE created_at >= day AND created_at < day + INTERVAL '1 day') AS "newUsers",
           (SELECT COUNT(*)::int FROM user_login_events WHERE created_at >= day AND created_at < day + INTERVAL '1 day') AS "loginCount",
           (SELECT COUNT(*)::int FROM scans WHERE created_at >= day AND created_at < day + INTERVAL '1 day') AS "scansCount",
           (SELECT COUNT(*)::int FROM vulnerabilities WHERE created_at >= day AND created_at < day + INTERVAL '1 day') AS "vulnsFound",
           (SELECT COUNT(*)::int FROM vulnerabilities WHERE status = 'patched' AND created_at >= day AND created_at < day + INTERVAL '1 day') AS "vulnsPatched"
         FROM generate_series(
           CURRENT_DATE - (($1 - 1) * INTERVAL '1 day'),
           CURRENT_DATE,
           INTERVAL '1 day'
         ) day
         ORDER BY day ASC`,
        [days]
      ),
      pool.query(
        `SELECT
           e.id AS "loginEventId",
           u.id, u.nickname, u.name, u.email, u.tier, u.role, u.status,
           u.daily_scans_used AS "dailyScansUsed",
           e.auth_method AS "authMethod",
           e.created_at AS "loginAt",
           u.created_at AS "createdAt"
         FROM user_login_events e
         JOIN users u ON u.id = e.user_id
         WHERE u.email NOT LIKE 'qa-%' AND u.email NOT LIKE 'browser-%' AND u.email NOT LIKE '%@example.com'
         ORDER BY e.created_at DESC
         LIMIT 30`
      ),
      pool.query(
        `SELECT tier, COUNT(*)::int AS count
         FROM users
         GROUP BY tier`
      )
    ]);

    return res.json({
      success: true,
      scope: 'SYSTEM',
      generatedAt: new Date().toISOString(),
      rangeDays: days,
      dailyActivity: activityResult.rows,
      recentLogins: recentLoginsResult.rows,
      tierBreakdown: tierBreakdownResult.rows
    });
  } catch (error) {
    req.log?.error('Admin analytics query failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Không thể tải biểu đồ phân tích.' });
  }
});

// 9. POST /api/v1/admin/purge-old-data
router.post('/purge-old-data', async (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;

  const pool = getPool();
  if (!pool) {
    realLoginEventsStore.length = 0;
    realPaymentsStore.length = 0;
    realAuditLogsStore.length = 0;
    for (let i = realUsersStore.length - 1; i >= 0; i--) {
      const email = (realUsersStore[i].email || '').toLowerCase();
      if (email.startsWith('qa-') || email.startsWith('browser-') || email.endsWith('@example.com')) {
        realUsersStore.splice(i, 1);
      }
    }
    return res.json({
      success: true,
      message: 'Đã xóa toàn bộ dữ liệu lượt quét và nhật ký cũ khỏi bộ nhớ.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM vulnerabilities');
    const deletedScans = await client.query('DELETE FROM scans');
    const deletedLogins = await client.query('DELETE FROM user_login_events');
    const deleteQaUsers = await client.query(
      `DELETE FROM users
       WHERE email LIKE 'qa-%' OR email LIKE 'browser-%' OR email LIKE '%@example.com'`
    );
    await client.query('UPDATE users SET daily_scans_used = 0');
    await client.query('COMMIT');
    return res.json({
      success: true,
      message: `Đã xóa thành công ${deletedScans.rowCount} lượt quét cũ, ${deletedLogins.rowCount} lượt đăng nhập và ${deleteQaUsers.rowCount} tài khoản rác.`,
      purgedScans: deletedScans.rowCount,
      purgedLogins: deletedLogins.rowCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    req.log?.error('Admin purge old data failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Lỗi khi xóa dữ liệu cũ.' });
  } finally {
    client.release();
  }
});

module.exports = router;
