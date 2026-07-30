const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, verifyToken } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { queryDb, getIsPgConnected, getPool } = require('../db/connection');
const { getAccountEmailConfiguration, sendEmailVerification } = require('../services/accountEmailService');
const { PURPOSES, issueAccountToken } = require('../services/accountTokenService');
const { serializeUser, tokenPayload } = require('../services/userSerializer');

const router = express.Router();

// Fallback In-Memory DB Store
const usersDb = [
  {
    id: 'usr-1',
    nickname: '@sarah_stripe',
    name: 'Sarah Chen',
    email: 'sarah.chen@stripe.com',
    passwordHash: '$2a$12$e8wV5Cj8D7F.X0N5k1J5uOaX4H.1N7.1uO2.1uO2.1uO2.1uO2',
    tier: 'PRO',
    role: 'USER',
    status: 'ACTIVE',
    karmaPoints: 2400
  }
];

// Cookie security configuration (HttpOnly, Secure, SameSite=Strict)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
};

/**
 * POST /api/v1/auth/register
 * Zero-Trust Secured Registration Endpoint with Rate Limiter
 */
router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const { name, nickname, email, password } = req.body;

    if (!email || !password || !nickname) {
      return res.status(400).json({ success: false, error: 'Email, nickname và mật khẩu là bắt buộc.' });
    }

    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, error: 'Mật khẩu phải có tối thiểu 8 ký tự và tối đa 72 byte.' });
    }

    const cleanNickname = nickname.startsWith('@') ? nickname : `@${nickname}`;
    const cleanEmail = email.toLowerCase().trim();

    // 1. PostgreSQL DB Query
    if (getIsPgConnected()) {
      const existingUser = await queryDb('SELECT id FROM users WHERE email = $1 OR nickname = $2', [cleanEmail, cleanNickname]);
      if (existingUser && existingUser.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Email hoặc Nickname đã được đăng ký.' });
      }

      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      const result = await queryDb(
        `INSERT INTO users (nickname, name, email, password_hash, tier, role)
         VALUES ($1, $2, $3, $4, 'FREE', $5)
         RETURNING id, nickname, name, email, email_verified_at, auth_version,
                   tier, role, status, karma_points, daily_scans_used`,
        [cleanNickname, name || cleanNickname.replace('@', ''), cleanEmail, passwordHash, 'USER']
      );

      const newUser = result.rows[0];
      const token = jwt.sign(
        tokenPayload(newUser),
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Set HttpOnly Cookie
      res.cookie('access_token', token, COOKIE_OPTIONS);

      let verificationEmailSent = false;
      if (getAccountEmailConfiguration().configured) {
        try {
          const verificationToken = await issueAccountToken(getPool(), {
            userId: newUser.id,
            purpose: PURPOSES.EMAIL_VERIFICATION,
            ttlMinutes: 24 * 60
          });
          await sendEmailVerification({
            email: newUser.email,
            name: newUser.name,
            token: verificationToken
          });
          verificationEmailSent = true;
        } catch (emailError) {
          console.warn('Registration verification email failed:', emailError.message);
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công.',
        token,
        verificationEmailSent,
        user: serializeUser(newUser)
      });
    }

    // 2. In-memory Fallback
    if (usersDb.some(u => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Email đã được đăng ký.' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: `usr-${Date.now()}`,
      nickname: cleanNickname,
      name: name || cleanNickname.replace('@', ''),
      email: cleanEmail,
      passwordHash,
      tier: 'FREE',
      role: 'USER',
      status: 'ACTIVE',
      karmaPoints: 100,
      dailyScansUsed: 0,
      createdAt: new Date().toISOString()
    };

    usersDb.push(newUser);

    const token = jwt.sign(
      tokenPayload(newUser),
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('access_token', token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      token,
      user: serializeUser(newUser)
    });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống khi đăng ký tài khoản.' });
  }
});

/**
 * POST /api/v1/auth/login
 * Zero-Trust Secured Login Endpoint (Brute-Force Protected & Anti-Enumeration)
 */
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp email và mật khẩu.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (getIsPgConnected()) {
      const result = await queryDb(
        `SELECT u.*, gc.avatar_url
         FROM users u
         LEFT JOIN github_connections gc ON gc.user_id = u.id
         WHERE u.email = $1`,
        [cleanEmail]
      );
      if (result && result.rows.length > 0) {
        const dbUser = result.rows[0];
        if (dbUser.status === 'SUSPENDED') {
          return res.status(403).json({ success: false, error: 'Tài khoản đã bị tạm khóa.' });
        }
        const isMatch = await bcrypt.compare(password, dbUser.password_hash);
        if (isMatch) {
          await queryDb('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [dbUser.id]);
          const token = jwt.sign(
            tokenPayload(dbUser),
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          res.cookie('access_token', token, COOKIE_OPTIONS);

          return res.json({
            success: true,
            message: 'Đăng nhập thành công.',
            token,
            user: serializeUser(dbUser)
          });
        }
      }
    }

    // In-memory fallback
    const user = usersDb.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không chính xác.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không chính xác.' });
    }

    const token = jwt.sign(
      tokenPayload(user),
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('access_token', token, COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Đăng nhập thành công.',
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xác thực đăng nhập.' });
  }
});

/**
 * POST /api/v1/auth/logout
 * Đăng xuất và xóa HttpOnly Auth Cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('access_token', COOKIE_OPTIONS);
  res.json({ success: true, message: 'Đã đăng xuất an toàn.' });
});

/**
 * POST /api/v1/auth/bootstrap-admin
 * One-time first-admin bootstrap. Disable the token after provisioning.
 */
router.post('/bootstrap-admin', verifyToken, async (req, res) => {
  const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  const suppliedToken = req.get('x-admin-bootstrap-token') || '';
  if (!expectedToken) {
    return res.status(404).json({ success: false, error: 'Admin bootstrap is disabled.' });
  }

  const expectedBuffer = Buffer.from(expectedToken);
  const suppliedBuffer = Buffer.from(suppliedToken);
  if (
    expectedBuffer.length !== suppliedBuffer.length
    || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return res.status(403).json({ success: false, error: 'Invalid admin bootstrap token.' });
  }

  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('lunar-first-admin-bootstrap'))`);
    const adminCount = await client.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'ADMIN'`);
    if (adminCount.rows[0].count > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'An administrator already exists.' });
    }

    const updated = await client.query(
      `UPDATE users
       SET role = 'ADMIN', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, nickname, name, email, auth_version, tier, role, status,
                 karma_points, daily_scans_used`,
      [req.user.id]
    );
    const adminUser = updated.rows[0];
    await client.query(
      `INSERT INTO admin_action_logs (
         actor_user_id, target_user_id, action_type, target_type, target_id,
         reason, before_state, after_state, ip_address, user_agent
       ) VALUES ($1::uuid, $1::uuid, 'ADMIN_BOOTSTRAPPED', 'USER', $1::text, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'Initial administrator provisioned with one-time bootstrap token.',
        { role: 'USER' },
        { role: 'ADMIN' },
        req.ip,
        req.get('user-agent') || null
      ]
    );
    await client.query('COMMIT');

    const token = jwt.sign(tokenPayload(adminUser), JWT_SECRET, { expiresIn: '7d' });
    res.cookie('access_token', token, COOKIE_OPTIONS);
    return res.json({
      success: true,
      message: 'Initial administrator provisioned. Remove ADMIN_BOOTSTRAP_TOKEN now.',
      token,
      user: serializeUser(adminUser)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Admin bootstrap failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to bootstrap administrator.' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/v1/auth/me
 * Lấy thông tin user hiện tại qua JWT Cookie / Header
 */
router.get('/me', verifyToken, async (req, res) => {
  if (getIsPgConnected()) {
    const result = await queryDb(
      `SELECT u.id, u.nickname, u.name, u.email, u.email_verified_at,
              u.tier, u.role, u.status, u.karma_points, u.daily_scans_used,
              gc.avatar_url
       FROM users u
       LEFT JOIN github_connections gc ON gc.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (result && result.rows.length > 0) {
      const u = result.rows[0];
      return res.json({
        success: true,
        user: serializeUser(u)
      });
    }
  }

  const user = usersDb.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy thông tin tài khoản.' });
  }

  res.json({
    success: true,
    user: serializeUser(user)
  });
});

module.exports = router;
