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

const accountRecoveryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS: Quá nhiều yêu cầu khôi phục tài khoản. Vui lòng thử lại sau.'
  }
});

const accountMutationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS: Quá nhiều thay đổi bảo mật tài khoản.'
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

const assistantRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS: Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau.'
  }
});

// Guest scans are intentionally IP-based. express-rate-limit owns expiration
// and cleanup, avoiding the unbounded Map used by the previous implementation.
const scanQuotaLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    quotaExceeded: true,
    error: 'TOO_MANY_REQUESTS: Hạn mức 5 lượt quét/ngày cho khách đã hết.'
  }
});

const scanRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'TOO_MANY_REQUESTS: Quá nhiều yêu cầu quét trong thời gian ngắn.' }
});

const deepScanRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'TOO_MANY_REQUESTS: Quá nhiều deep scan. Vui lòng thử lại sau.' }
});

const reportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'TOO_MANY_REQUESTS: Quá nhiều yêu cầu xuất báo cáo.' }
});

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'TOO_MANY_REQUESTS: Quá nhiều yêu cầu AI trong thời gian ngắn.' }
});

module.exports = {
  authRateLimiter,
  accountRecoveryRateLimiter,
  accountMutationRateLimiter,
  paymentRateLimiter,
  publicApiRateLimiter,
  assistantRateLimiter,
  scanQuotaLimiter,
  scanRateLimiter,
  deepScanRateLimiter,
  reportRateLimiter,
  aiRateLimiter
};
