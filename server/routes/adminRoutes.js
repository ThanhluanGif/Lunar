const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { getPool } = require('../db/connection');

const router = express.Router();
router.use(verifyToken, requireRole('ADMIN'));

const VALID_TIERS = new Set(['FREE', 'PRO', 'ENTERPRISE']);
const VALID_ROLES = new Set(['USER', 'ADMIN']);
const VALID_USER_STATUSES = new Set(['ACTIVE', 'SUSPENDED']);
const VALID_PAYMENT_STATUSES = new Set(['SUCCESS', 'FAILED', 'EXPIRED']);

function databaseRequired(res) {
  const pool = getPool();
  if (!pool) {
    res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE: Admin operations require PostgreSQL.' });
    return null;
  }
  return pool;
}

function requireReason(req, res) {
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 5 || reason.length > 500) {
    res.status(400).json({ success: false, error: 'A reason between 5 and 500 characters is required.' });
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
    dailyScansUsed: row.daily_scans_used,
    lastScanResetAt: row.last_scan_reset_at,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
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
  await client.query(
    `INSERT INTO admin_action_logs (
       actor_user_id, target_user_id, action_type, target_type, target_id,
       reason, before_state, after_state, ip_address, user_agent
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
      req.get('user-agent') || null
    ]
  );
}

router.get('/overview', async (req, res) => {
  const pool = databaseRequired(res);
  if (!pool) return;

  try {
    const [kpis, tiers, payments, recentPayments, recentActions] = await Promise.all([
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM users) AS total_users,
           (SELECT COUNT(*)::int FROM users WHERE status = 'ACTIVE') AS active_users,
           (SELECT COUNT(*)::int FROM users WHERE role = 'ADMIN') AS admins,
           (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_30d,
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
      generatedAt: new Date().toISOString(),
      metrics: {
        totalUsers: metrics.total_users,
        activeUsers: metrics.active_users,
        admins: metrics.admins,
        newUsers30d: metrics.new_users_30d,
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
    console.error('Admin overview query failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to load admin dashboard data.' });
  }
});

router.get('/users', async (req, res) => {
  const pool = databaseRequired(res);
  if (!pool) return;

  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const tier = VALID_TIERS.has(req.query.tier) ? req.query.tier : null;
  const role = VALID_ROLES.has(req.query.role) ? req.query.role : null;
  const status = VALID_USER_STATUSES.has(req.query.status) ? req.query.status : null;

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
       ORDER BY created_at DESC
       LIMIT $5 OFFSET $6`,
      [search, tier, role, status, limit, offset]
    );

    return res.json({
      success: true,
      page,
      limit,
      total: result.rows[0]?.total_count || 0,
      users: result.rows.map(sanitizeUser)
    });
  } catch (error) {
    console.error('Admin users query failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to load users.' });
  }
});

router.patch('/users/:userId', async (req, res) => {
  const pool = databaseRequired(res);
  if (!pool) return;
  const reason = requireReason(req, res);
  if (!reason) return;

  const changes = {};
  if (req.body.tier !== undefined) {
    if (!VALID_TIERS.has(req.body.tier)) {
      return res.status(400).json({ success: false, error: 'Invalid tier.' });
    }
    changes.tier = req.body.tier;
  }
  if (req.body.role !== undefined) {
    if (!VALID_ROLES.has(req.body.role)) {
      return res.status(400).json({ success: false, error: 'Invalid role.' });
    }
    changes.role = req.body.role;
  }
  if (req.body.status !== undefined) {
    if (!VALID_USER_STATUSES.has(req.body.status)) {
      return res.status(400).json({ success: false, error: 'Invalid user status.' });
    }
    changes.status = req.body.status;
  }
  if (Object.keys(changes).length === 0) {
    return res.status(400).json({ success: false, error: 'No supported changes supplied.' });
  }
  if (req.params.userId === String(req.user.id) && (changes.role || changes.status)) {
    return res.status(409).json({ success: false, error: 'Admins cannot change their own role or status.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const beforeResult = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.params.userId]);
    if (beforeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const fields = Object.keys(changes);
    const values = Object.values(changes);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const updatedResult = await client.query(
      `UPDATE users
       SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length + 1}
       RETURNING *`,
      [...values, req.params.userId]
    );

    const beforeUser = sanitizeUser(beforeResult.rows[0]);
    const updatedUser = sanitizeUser(updatedResult.rows[0]);
    await writeAudit(client, req, {
      actionType: 'USER_UPDATED',
      targetType: 'USER',
      targetId: req.params.userId,
      targetUserId: req.params.userId,
      reason,
      beforeState: beforeUser,
      afterState: updatedUser
    });
    await client.query('COMMIT');

    return res.json({ success: true, user: updatedUser });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Admin user update failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to update user.' });
  } finally {
    client.release();
  }
});

router.post('/users/:userId/reset-quota', async (req, res) => {
  const pool = databaseRequired(res);
  if (!pool) return;
  const reason = requireReason(req, res);
  if (!reason) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const beforeResult = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.params.userId]);
    if (beforeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    const updatedResult = await client.query(
      `UPDATE users
       SET daily_scans_used = 0,
           last_scan_reset_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [req.params.userId]
    );
    await client.query(
      `INSERT INTO quota_logs (user_id, action_type, scans_added)
       VALUES ($1, 'ADMIN_RESET', 0)`,
      [req.params.userId]
    );

    const beforeUser = sanitizeUser(beforeResult.rows[0]);
    const updatedUser = sanitizeUser(updatedResult.rows[0]);
    await writeAudit(client, req, {
      actionType: 'USER_QUOTA_RESET',
      targetType: 'USER',
      targetId: req.params.userId,
      targetUserId: req.params.userId,
      reason,
      beforeState: beforeUser,
      afterState: updatedUser
    });
    await client.query('COMMIT');
    return res.json({ success: true, user: updatedUser });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Admin quota reset failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to reset quota.' });
  } finally {
    client.release();
  }
});

router.get('/payments', async (req, res) => {
  const pool = databaseRequired(res);
  if (!pool) return;
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const validStatuses = new Set(['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED']);
  const status = validStatuses.has(req.query.status) ? req.query.status : null;

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
         u.email AS "userEmail",
         COUNT(*) OVER()::int AS total_count
       FROM payments p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE ($1 = '' OR p.order_code ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR p.status = $2)
       ORDER BY p.created_at DESC
       LIMIT $3 OFFSET $4`,
      [search, status, limit, offset]
    );

    return res.json({
      success: true,
      page,
      limit,
      total: result.rows[0]?.total_count || 0,
      payments: result.rows.map(({ total_count, ...payment }) => payment)
    });
  } catch (error) {
    console.error('Admin payments query failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to load payments.' });
  }
});

router.patch('/payments/:orderCode', async (req, res) => {
  const pool = databaseRequired(res);
  if (!pool) return;
  const reason = requireReason(req, res);
  if (!reason) return;
  if (!VALID_PAYMENT_STATUSES.has(req.body.status)) {
    return res.status(400).json({ success: false, error: 'Invalid final payment status.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const paymentResult = await client.query(
      'SELECT * FROM payments WHERE order_code = $1 FOR UPDATE',
      [req.params.orderCode]
    );
    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Payment not found.' });
    }
    const payment = paymentResult.rows[0];
    if (payment.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: `Payment is already final (${payment.status}) and cannot be overwritten.`
      });
    }

    const updatedResult = await client.query(
      `UPDATE payments
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE order_code = $2
       RETURNING *`,
      [req.body.status, req.params.orderCode]
    );

    if (req.body.status === 'SUCCESS') {
      await client.query(
        `UPDATE users SET tier = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [payment.tier_target, payment.user_id]
      );
      await client.query(
        `INSERT INTO subscriptions (user_id, tier, started_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [payment.user_id, payment.tier_target]
      );
    }

    await writeAudit(client, req, {
      actionType: `PAYMENT_${req.body.status}`,
      targetType: 'PAYMENT',
      targetId: req.params.orderCode,
      targetUserId: payment.user_id,
      reason,
      beforeState: payment,
      afterState: updatedResult.rows[0]
    });
    await client.query('COMMIT');

    return res.json({ success: true, payment: updatedResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Admin payment update failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to update payment.' });
  } finally {
    client.release();
  }
});

router.get('/audit-log', async (req, res) => {
  const pool = databaseRequired(res);
  if (!pool) return;
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);

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
         l.ip_address AS "ipAddress",
         l.user_agent AS "userAgent",
         l.created_at AS "createdAt",
         actor.id AS "actorUserId",
         actor.email AS "actorEmail"
       FROM admin_action_logs l
       LEFT JOIN users actor ON actor.id = l.actor_user_id
       ORDER BY l.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.json({ success: true, logs: result.rows });
  } catch (error) {
    console.error('Admin audit log query failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to load admin audit log.' });
  }
});

module.exports = router;
