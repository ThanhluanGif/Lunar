const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  accountMutationRateLimiter,
  accountRecoveryRateLimiter,
  accountRecoveryIdentifierRateLimiter
} = require('../middleware/rateLimiter');
const { JWT_SECRET, verifyToken } = require('../middleware/auth');
const { getPool } = require('../db/connection');
const {
  getAccountEmailConfiguration,
  sendEmailVerification,
  sendPasswordResetEmail
} = require('../services/accountEmailService');
const {
  PURPOSES,
  hashAccountToken,
  issueAccountToken
} = require('../services/accountTokenService');
const { createCookieOptions } = require('../services/cookiePolicy');
const { serializeUser } = require('../services/userSerializer');

const router = express.Router();
const GENERIC_FORGOT_RESPONSE = 'Nếu email tồn tại, Lunar đã gửi liên kết đặt lại mật khẩu.';
const COOKIE_BASE_OPTIONS = createCookieOptions({ defaultSameSite: 'strict' });
const COOKIE_OPTIONS = {
  ...COOKIE_BASE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000
};

function passwordIsValid(password) {
  return typeof password === 'string'
    && password.length >= 8
    && Buffer.byteLength(password, 'utf8') <= 72;
}

router.post('/forgot-password', accountRecoveryRateLimiter, accountRecoveryIdentifierRateLimiter, async (req, res) => {
  const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
  }

  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, email, name FROM users WHERE email = $1 AND status = $2',
      [cleanEmail, 'ACTIVE']
    );
    const user = userResult.rows[0];
    if (user && getAccountEmailConfiguration().configured) {
      const token = await issueAccountToken(pool, {
        userId: user.id,
        purpose: PURPOSES.PASSWORD_RESET,
        ttlMinutes: 30
      });
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        token,
        correlationId: req.correlationId
      }).catch((error) => {
        req.log?.warn('Password-reset email delivery failed.', error);
      });
    }
    return res.json({ success: true, message: GENERIC_FORGOT_RESPONSE });
  } catch (error) {
    req.log?.error('Forgot-password request failed.', error, 500);
    return res.json({ success: true, message: GENERIC_FORGOT_RESPONSE });
  }
});

router.post('/reset-password', accountRecoveryRateLimiter, accountRecoveryIdentifierRateLimiter, async (req, res) => {
  const token = String(req.body?.token || '');
  const newPassword = req.body?.password;
  if (token.length < 32 || !passwordIsValid(newPassword)) {
    return res.status(400).json({
      success: false,
      error: 'Token không hợp lệ hoặc mật khẩu phải có tối thiểu 8 ký tự và tối đa 72 byte.'
    });
  }

  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tokenResult = await client.query(
      `SELECT id, user_id
       FROM account_action_tokens
       WHERE token_hash = $1
         AND purpose = $2
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [hashAccountToken(token), PURPOSES.PASSWORD_RESET]
    );
    const actionToken = tokenResult.rows[0];
    if (!actionToken) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Liên kết đã hết hạn hoặc đã được sử dụng.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await client.query(
      `UPDATE users
       SET password_hash = $1,
           auth_version = auth_version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [passwordHash, actionToken.user_id]
    );
    await client.query(
      `UPDATE account_action_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
      [actionToken.user_id, PURPOSES.PASSWORD_RESET]
    );
    await client.query('COMMIT');
    res.clearCookie('access_token', COOKIE_BASE_OPTIONS);
    return res.json({ success: true, message: 'Mật khẩu đã được đặt lại. Hãy đăng nhập lại.' });
  } catch (error) {
    await client.query('ROLLBACK');
    req.log?.error('Reset-password request failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Không thể đặt lại mật khẩu.' });
  } finally {
    client.release();
  }
});

router.post('/verify-email', accountRecoveryRateLimiter, accountRecoveryIdentifierRateLimiter, async (req, res) => {
  const token = String(req.body?.token || '');
  if (token.length < 32) {
    return res.status(400).json({ success: false, error: 'Token xác minh không hợp lệ.' });
  }
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tokenResult = await client.query(
      `SELECT id, user_id
       FROM account_action_tokens
       WHERE token_hash = $1
         AND purpose = $2
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [hashAccountToken(token), PURPOSES.EMAIL_VERIFICATION]
    );
    const actionToken = tokenResult.rows[0];
    if (!actionToken) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Liên kết xác minh đã hết hạn hoặc đã dùng.' });
    }
    await client.query(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [actionToken.user_id]
    );
    await client.query(
      'UPDATE account_action_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [actionToken.id]
    );
    await client.query('COMMIT');
    return res.json({ success: true, message: 'Email đã được xác minh thành công.' });
  } catch (error) {
    await client.query('ROLLBACK');
    req.log?.error('Email verification failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Không thể xác minh email.' });
  } finally {
    client.release();
  }
});

router.post(
  '/resend-verification',
  verifyToken,
  accountRecoveryRateLimiter,
  accountRecoveryIdentifierRateLimiter,
  async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  if (!getAccountEmailConfiguration().configured) {
    return res.status(503).json({
      success: false,
      error: 'Email hệ thống chưa được cấu hình.'
    });
  }
  const userResult = await pool.query(
    'SELECT id, email, name, email_verified_at FROM users WHERE id = $1',
    [req.user.id]
  );
  const user = userResult.rows[0];
  if (!user) return res.status(401).json({ success: false, error: 'Tài khoản không còn tồn tại.' });
  if (user.email_verified_at) {
    return res.json({ success: true, alreadyVerified: true, message: 'Email đã được xác minh.' });
  }

  try {
    const token = await issueAccountToken(pool, {
      userId: user.id,
      purpose: PURPOSES.EMAIL_VERIFICATION,
      ttlMinutes: 24 * 60
    });
    await sendEmailVerification({
      email: user.email,
      name: user.name,
      token,
      correlationId: req.correlationId
    });
    return res.json({ success: true, message: 'Đã gửi lại email xác minh.' });
  } catch (error) {
    req.log?.error('Verification email resend failed.', error, 500);
    return res.status(502).json({ success: false, error: 'Không thể gửi email xác minh.' });
  }
  }
);

router.patch('/account', verifyToken, accountMutationRateLimiter, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (name.length < 2 || name.length > 120) {
    return res.status(400).json({ success: false, error: 'Tên phải có từ 2 đến 120 ký tự.' });
  }
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const result = await pool.query(
    `UPDATE users u
     SET name = $2, updated_at = CURRENT_TIMESTAMP
     WHERE u.id = $1
     RETURNING u.id, u.nickname, u.name, u.email, u.email_verified_at,
               u.tier, u.role, u.status, u.daily_scans_used,
               (SELECT avatar_url FROM github_connections WHERE user_id = u.id) AS avatar_url`,
    [req.user.id, name]
  );
  if (!result.rows[0]) return res.status(401).json({ success: false, error: 'Tài khoản không còn tồn tại.' });
  return res.json({ success: true, user: serializeUser(result.rows[0]) });
});

router.post('/change-password', verifyToken, accountMutationRateLimiter, async (req, res) => {
  const currentPassword = req.body?.currentPassword;
  const newPassword = req.body?.newPassword;
  if (!currentPassword || !passwordIsValid(newPassword)) {
    return res.status(400).json({
      success: false,
      error: 'Mật khẩu hiện tại và mật khẩu mới từ 8 ký tự, tối đa 72 byte là bắt buộc.'
    });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ success: false, error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
  }
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!result.rows[0] || !(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
    return res.status(401).json({ success: false, error: 'Mật khẩu hiện tại không chính xác.' });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updatedUser = await pool.query(
    `UPDATE users
     SET password_hash = $2,
         auth_version = auth_version + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, email, nickname, tier, role, status, auth_version`,
    [req.user.id, passwordHash]
  );
  await pool.query(
    `UPDATE account_action_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [req.user.id, PURPOSES.PASSWORD_RESET]
  );
  const user = updatedUser.rows[0];
  const token = jwt.sign({
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    tier: user.tier,
    role: user.role,
    status: user.status,
    authVersion: user.auth_version
  }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('access_token', token, COOKIE_OPTIONS);
  return res.json({ success: true, message: 'Mật khẩu đã được thay đổi và các phiên cũ đã bị thu hồi.' });
});

router.get('/scan-history', verifyToken, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 100);
  const result = await pool.query(
    `SELECT s.id,
            s.project_id AS "projectId",
            p.name AS "projectName",
            p.repo_url AS "repoUrl",
            s.score,
            s.issues_count AS "issuesCount",
            s.ai_model_used AS "engine",
            s.created_at AS "createdAt",
            COUNT(*) FILTER (WHERE v.severity = 'critical')::int AS "criticalCount",
            COUNT(*) FILTER (WHERE v.severity = 'warning')::int AS "warningCount"
     FROM scans s
     JOIN projects p ON p.id = s.project_id
     LEFT JOIN vulnerabilities v ON v.scan_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id, p.id
     ORDER BY s.created_at DESC
     LIMIT $2`,
    [req.user.id, limit]
  );
  return res.json({ success: true, scans: result.rows });
});

module.exports = router;
