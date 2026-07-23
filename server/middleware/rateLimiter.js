/**
 * Server-Side Daily Scan Quota Rate Limiter & Memory Store
 * Prevents LocalStorage bypasses by tracking scan counts on the server per user / IP.
 */

const userScanStore = new Map(); // userId/IP -> { count, lastReset }

function scanQuotaLimiter(req, res, next) {
  const identifier = req.user ? req.user.id : req.ip;
  const userTier = req.user ? req.user.tier : 'FREE';

  // PRO and ENTERPRISE users have unlimited scans
  if (userTier === 'PRO' || userTier === 'ENTERPRISE') {
    return next();
  }

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const MAX_FREE_DAILY_SCANS = 5;

  let record = userScanStore.get(identifier);
  if (!record || (now - record.lastReset) >= ONE_DAY_MS) {
    record = { count: 0, lastReset: now };
    userScanStore.set(identifier, record);
  }

  if (record.count >= MAX_FREE_DAILY_SCANS) {
    return res.status(429).json({
      success: false,
      quotaExceeded: true,
      error: 'TOO_MANY_REQUESTS: Daily 5-scan quota limit exceeded for Free tier.',
      remaining: 0,
      resetInHours: Math.ceil((ONE_DAY_MS - (now - record.lastReset)) / (1000 * 60 * 60))
    });
  }

  record.count += 1;
  userScanStore.set(identifier, record);
  req.remainingQuota = MAX_FREE_DAILY_SCANS - record.count;

  next();
}

function renewServerQuota(identifier) {
  let record = userScanStore.get(identifier);
  if (record) {
    record.count = Math.max(0, record.count - 3); // Grant 3 extra scans
    userScanStore.set(identifier, record);
  }
}

module.exports = {
  scanQuotaLimiter,
  renewServerQuota
};
