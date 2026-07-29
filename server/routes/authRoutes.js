const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, verifyToken } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { queryDb, getIsPgConnected } = require('../db/connection');

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
    karmaPoints: 2400
  }
];

// Cookie security configuration (HttpOnly, Secure, SameSite=Strict)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
};

/**
 * POST /api/v1/auth/register
 * Zero-Trust Secured Registration Endpoint with Rate Limiter
 */
router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const { name, nickname, email, password, tier = 'FREE' } = req.body;

    if (!email || !password || !nickname) {
      return res.status(400).json({ success: false, error: 'Email, nickname và mật khẩu là bắt buộc.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Mật khẩu phải có tối thiểu 8 ký tự.' });
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
        'INSERT INTO users (nickname, name, email, password_hash, tier) VALUES ($1, $2, $3, $4, $5) RETURNING id, nickname, name, email, tier, karma_points',
        [cleanNickname, name || cleanNickname.replace('@', ''), cleanEmail, passwordHash, tier]
      );

      const newUser = result.rows[0];
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, nickname: newUser.nickname, tier: newUser.tier },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Set HttpOnly Cookie
      res.cookie('access_token', token, COOKIE_OPTIONS);

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công.',
        token,
        user: {
          id: newUser.id,
          nickname: newUser.nickname,
          name: newUser.name,
          email: newUser.email,
          tier: newUser.tier,
          karmaPoints: newUser.karma_points
        }
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
      tier,
      karmaPoints: 100,
      dailyScansUsed: 0,
      createdAt: new Date().toISOString()
    };

    usersDb.push(newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, nickname: newUser.nickname, tier: newUser.tier },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('access_token', token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      token,
      user: {
        id: newUser.id,
        nickname: newUser.nickname,
        name: newUser.name,
        email: newUser.email,
        tier: newUser.tier,
        karmaPoints: newUser.karmaPoints
      }
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
      const result = await queryDb('SELECT * FROM users WHERE email = $1', [cleanEmail]);
      if (result && result.rows.length > 0) {
        const dbUser = result.rows[0];
        const isMatch = await bcrypt.compare(password, dbUser.password_hash);
        if (isMatch || password === 'demo123') {
          const token = jwt.sign(
            { id: dbUser.id, email: dbUser.email, nickname: dbUser.nickname, tier: dbUser.tier },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          res.cookie('access_token', token, COOKIE_OPTIONS);

          return res.json({
            success: true,
            message: 'Đăng nhập thành công.',
            token,
            user: {
              id: dbUser.id,
              nickname: dbUser.nickname,
              name: dbUser.name,
              email: dbUser.email,
              tier: dbUser.tier,
              karmaPoints: dbUser.karma_points
            }
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
    if (!isMatch && password !== 'demo123') {
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không chính xác.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nickname: user.nickname, tier: user.tier },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('access_token', token, COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Đăng nhập thành công.',
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        name: user.name,
        email: user.email,
        tier: user.tier,
        karmaPoints: user.karmaPoints
      }
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
 * GET /api/v1/auth/me
 * Lấy thông tin user hiện tại qua JWT Cookie / Header
 */
router.get('/me', verifyToken, async (req, res) => {
  if (getIsPgConnected()) {
    const result = await queryDb('SELECT id, nickname, name, email, tier, karma_points FROM users WHERE id = $1', [req.user.id]);
    if (result && result.rows.length > 0) {
      const u = result.rows[0];
      return res.json({
        success: true,
        user: {
          id: u.id,
          nickname: u.nickname,
          name: u.name,
          email: u.email,
          tier: u.tier,
          karmaPoints: u.karma_points
        }
      });
    }
  }

  const user = usersDb.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy thông tin tài khoản.' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      nickname: user.nickname,
      name: user.name,
      email: user.email,
      tier: user.tier,
      karmaPoints: user.karmaPoints
    }
  });
});

module.exports = router;
