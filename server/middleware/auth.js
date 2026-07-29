require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('💥 FATAL SECURITY ERROR: JWT_SECRET environment variable is not defined in Production!');
    process.exit(1);
  } else {
    console.warn('⚠️ SECURITY NOTICE: Using default development JWT Secret Key. Set JWT_SECRET in .env for production.');
  }
}

const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'lunar-zero-trust-secret-key-2026-secure';

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
function verifyToken(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'UNAUTHORIZED: Authentication token required via HttpOnly Cookie or Bearer Header.'
    });
  }

  try {
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      error: 'UNAUTHORIZED: Invalid or expired authentication token.'
    });
  }
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

module.exports = {
  JWT_SECRET: EFFECTIVE_JWT_SECRET,
  verifyToken,
  requireTier
};
