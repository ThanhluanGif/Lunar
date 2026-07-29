const rateLimit = require('express-rate-limit');

// 1. Auth Rate Limiter - Chống Brute-Force Password & Enumeration (Max 5 req / 1 phút)
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS: Quá nhiều lần thử đăng nhập/đăng ký. Vui lòng thử lại sau 1 phút.'
  }
});

// 2. Payment Rate Limiter - Chống Spam đơn hàng thanh toán (Max 10 req / 1 phút)
const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS: Giới hạn khởi tạo đơn hàng thanh toán. Vui lòng đợi trong giây lát.'
  }
});

// 3. Public API Rate Limiter - Bảo vệ hạ tầng khỏi DDOS (Max 100 req / 15 phút)
const publicApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS: Bạn đã vượt quá giới hạn truy cập API công khai.'
  }
});

// 4. Daily Scan Quota Limiter cho tài khoản Free (Max 5 lượt quét / ngày)
const userScanStore = new Map();

function scanQuotaLimiter(req, res, next) {
  const identifier = req.user ? req.user.id : req.ip;
  const userTier = req.user ? req.user.tier : 'FREE';

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
      error: 'TOO_MANY_REQUESTS: Hạn mức 5 lượt quét/ngày cho tài khoản Free đã hết.',
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
    record.count = Math.max(0, record.count - 3);
    userScanStore.set(identifier, record);
  }
}

module.exports = {
  authRateLimiter,
  paymentRateLimiter,
  publicApiRateLimiter,
  scanQuotaLimiter,
  renewServerQuota
};
