const crypto = require('crypto');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const AUTH_WINDOW_MS = 60 * 1000;

function configuredInstanceCount(env = process.env) {
  const value = Number.parseInt(env.WEB_CONCURRENCY || env.LUNAR_INSTANCE_COUNT || '1', 10);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function validateRateLimitDeployment(env = process.env) {
  if (env.NODE_ENV === 'production' && configuredInstanceCount(env) > 1) {
    throw new Error(
      'Multi-instance production requires a shared rate-limit store; run one instance until one is configured.'
    );
  }
}

function normalizedAuthIdentifier(req) {
  const candidate = req.body?.email
    || req.body?.nickname
    || req.body?.token
    || req.user?.email
    || req.user?.id
    || '';
  return typeof candidate === 'string'
    ? candidate.trim().toLowerCase().slice(0, 512)
    : '';
}

function authIdentifierKey(req) {
  const identifier = normalizedAuthIdentifier(req);
  if (!identifier) return `missing:${ipKeyGenerator(req.ip)}`;
  return `identifier:${crypto.createHash('sha256').update(identifier).digest('hex')}`;
}

validateRateLimitDeployment();

// 1. Auth Rate Limiter - Chống Brute-Force Password & Enumeration (Max 5 req / 1 phút)
const authRateLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS: Quá nhiều lần thử đăng nhập/đăng ký. Vui lòng thử lại sau 1 phút.'
  }
});

// Keep the IP and account limits separate so distributed guessing against one
// identifier cannot bypass the normal per-IP brute-force protection.
const authIdentifierRateLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: 5,
  keyGenerator: authIdentifierKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS: Quá nhiều lần thử cho thông tin đăng nhập này. Vui lòng thử lại sau 1 phút.'
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

const accountRecoveryIdentifierRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: authIdentifierKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS: Quá nhiều yêu cầu khôi phục cho định danh này.'
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

const githubAuthStartRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS: Quá nhiều yêu cầu bắt đầu đăng nhập GitHub.'
  }
});

const githubAuthPollRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS: Quá nhiều yêu cầu kiểm tra xác thực GitHub.'
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
  AUTH_WINDOW_MS,
  authIdentifierKey,
  authRateLimiter,
  authIdentifierRateLimiter,
  accountRecoveryRateLimiter,
  accountRecoveryIdentifierRateLimiter,
  accountMutationRateLimiter,
  githubAuthStartRateLimiter,
  githubAuthPollRateLimiter,
  paymentRateLimiter,
  publicApiRateLimiter,
  assistantRateLimiter,
  scanQuotaLimiter,
  scanRateLimiter,
  deepScanRateLimiter,
  reportRateLimiter,
  aiRateLimiter,
  configuredInstanceCount,
  normalizedAuthIdentifier,
  validateRateLimitDeployment
};
