require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db/connection');
const { writeSystemLog } = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    writeSystemLog('ERROR', 'JWT_SECRET must be at least 32 characters in production.');
    process.exit(1);
  }
  writeSystemLog('WARN', 'JWT_SECRET is not configured for development; using a random process-local secret.');
}

// Never use a source-controlled fallback. Development sessions intentionally
// become invalid after a restart when no local secret is configured.
const EFFECTIVE_JWT_SECRET = JWT_SECRET || crypto.randomBytes(32).toString('hex');

/**
 * Helper to extract JWT token from Cookie or Bearer Header
 */
function extractToken(req) {
  // 1. Check HttpOnly Cookie (Primary & Most Secure)
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }

  // 2. Check Authorization Header (Fallback for Mobile/Integrations)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
}

/**
 * Middleware to verify JWT authentication token with Zero-Trust enforcement
 */
async function resolveUserFromDatabase(decoded) {
  const pool = getPool();
  if (!pool) return process.env.NODE_ENV === 'production' ? null : decoded;

  const result = await pool.query(
    `SELECT id, email, nickname, name, tier, role, status, auth_version,
            daily_scans_used
     FROM users
     WHERE id = $1`,
    [decoded.id]
  );

  if (result.rows.length === 0) return null;
  const user = result.rows[0];
  if (Number(decoded.authVersion ?? 0) !== Number(user.auth_version ?? 0)) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    name: user.name,
    tier: user.tier,
    role: user.role,
    status: user.status,
    authVersion: user.auth_version,
    dailyScansUsed: user.daily_scans_used
  };
}

async function verifyToken(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'UNAUTHORIZED: Authentication token required via HttpOnly Cookie or Bearer Header.'
    });
  }

  try {
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET, { algorithms: ['HS256'] });
    const currentUser = await resolveUserFromDatabase(decoded);
    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED: Account no longer exists.' });
    }
    if (currentUser.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, error: 'ACCOUNT_SUSPENDED: Contact an administrator.' });
    }
    req.user = currentUser;
    return next();
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      error: 'UNAUTHORIZED: Invalid or expired authentication token.'
    });
  }
}

async function optionalToken(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET, { algorithms: ['HS256'] });
    const currentUser = await resolveUserFromDatabase(decoded);
    req.user = currentUser && currentUser.status !== 'SUSPENDED' ? currentUser : null;
  } catch {
    req.user = null;
  }
  return next();
}

/**
 * Middleware to enforce Server-Side RBAC Tier requirement (PRO or ENTERPRISE)
 */
function requireTier(requiredTier) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED: User authentication required.' });
    }

    if (req.user.tier !== requiredTier && req.user.tier !== 'ENTERPRISE') {
      return res.status(403).json({ 
        success: false, 
        error: `FORBIDDEN: Feature requires ${requiredTier} tier subscription. Current tier: ${req.user.tier}.` 
      });
    }
    next();
  };
}

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED: User authentication required.' });
    }
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        error: `FORBIDDEN: ${requiredRole} role required.`
      });
    }
    return next();
  };
}

module.exports = {
  JWT_SECRET: EFFECTIVE_JWT_SECRET,
  verifyToken,
  optionalToken,
  requireTier,
  requireRole
};
