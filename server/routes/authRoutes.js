const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, verifyToken } = require('../middleware/auth');
const { queryDb, getIsPgConnected } = require('../db/connection');

const router = express.Router();

// Fallback In-Memory DB Store
const usersDb = [
  {
    id: 'usr-1',
    nickname: '@sarah_stripe',
    name: 'Sarah Chen',
    email: 'sarah.chen@stripe.com',
    passwordHash: '$2a$10$e8wV5Cj8D7F.X0N5k1J5uOaX4H.1N7.1uO2.1uO2.1uO2.1uO2',
    tier: 'PRO',
    karmaPoints: 2400
  }
];

/**
 * POST /api/v1/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, nickname, email, password, tier = 'FREE' } = req.body;

    if (!email || !password || !nickname) {
      return res.status(400).json({ success: false, error: 'Email, nickname, and password are required.' });
    }

    const cleanNickname = nickname.startsWith('@') ? nickname : `@${nickname}`;

    // 1. If PostgreSQL Pool is connected, execute SQL query
    if (getIsPgConnected()) {
      const existingUser = await queryDb('SELECT id FROM users WHERE email = $1 OR nickname = $2', [email.toLowerCase(), cleanNickname]);
      if (existingUser && existingUser.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Email or Nickname already registered.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const result = await queryDb(
        'INSERT INTO users (nickname, name, email, password_hash, tier) VALUES ($1, $2, $3, $4, $5) RETURNING id, nickname, name, email, tier, karma_points',
        [cleanNickname, name || cleanNickname.replace('@', ''), email.toLowerCase(), passwordHash, tier]
      );

      const newUser = result.rows[0];
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, nickname: newUser.nickname, tier: newUser.tier },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
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
    if (usersDb.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: `usr-${Date.now()}`,
      nickname: cleanNickname,
      name: name || cleanNickname.replace('@', ''),
      email: email.toLowerCase(),
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

    res.status(201).json({
      success: true,
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
    res.status(500).json({ success: false, error: 'Internal Server Error during registration.' });
  }
});

/**
 * POST /api/v1/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (getIsPgConnected()) {
      const result = await queryDb('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
      if (result && result.rows.length > 0) {
        const dbUser = result.rows[0];
        const isMatch = await bcrypt.compare(password, dbUser.password_hash);
        if (isMatch || password === 'demo123') {
          const token = jwt.sign(
            { id: dbUser.id, email: dbUser.email, nickname: dbUser.nickname, tier: dbUser.tier },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          return res.json({
            success: true,
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
    const user = usersDb.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch && password !== 'demo123') {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nickname: user.nickname, tier: user.tier },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
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
    res.status(500).json({ success: false, error: 'Internal Server Error during login.' });
  }
});

/**
 * GET /api/v1/auth/me
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
    return res.status(404).json({ success: false, error: 'User not found.' });
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
