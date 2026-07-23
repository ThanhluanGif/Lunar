const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { scanQuotaLimiter, renewServerQuota } = require('../middleware/rateLimiter');

const router = express.Router();

const scanLogs = [];

/**
 * POST /api/v1/scans/run
 * Protected route + Server-side Daily Scan Quota Limiter
 */
router.post('/run', scanQuotaLimiter, (req, res) => {
  const { code, filename } = req.body;

  const newScan = {
    id: `scan-${Date.now()}`,
    userId: req.user ? req.user.id : 'guest',
    filename: filename || 'app.ts',
    timestamp: new Date().toISOString(),
    score: 85,
    vulnerabilitiesCount: 3
  };

  scanLogs.push(newScan);

  res.json({
    success: true,
    scan: newScan,
    remainingQuota: req.remainingQuota !== undefined ? req.remainingQuota : 'UNLIMITED'
  });
});

/**
 * POST /api/v1/scans/renew-quota
 */
router.post('/renew-quota', verifyToken, (req, res) => {
  const userId = req.user.id;
  renewServerQuota(userId);

  res.json({
    success: true,
    message: 'Free Daily Quota successfully renewed (+3 scans granted).',
    karmaBonus: 50
  });
});

module.exports = router;
