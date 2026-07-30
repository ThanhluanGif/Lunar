/**
 * OWASP ASVS Level 2 - Security Headers Middleware
 * Thắt chặt an ninh HTTP Response Headers chống XSS, Clickjacking, MIME Sniffing và MITM.
 */

function securityHeadersMiddleware(req, res, next) {
  // HTTP Strict Transport Security (HSTS) - Bắt buộc HTTPS 1 năm
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Chống Clickjacking attack (Không cho phép nhúng iframe từ bên ngoài)
  res.setHeader('X-Frame-Options', 'DENY');

  // Chống MIME Sniffing attack
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer Policy bảo vệ quyền riêng tư người dùng
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Disable the obsolete auditor, which can create side channels in legacy browsers.
  res.setHeader('X-XSS-Protection', '0');

  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Content Security Policy (CSP) nghiêm ngặt cho REST API
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self';"
  );

  // Vô hiệu hóa thông tin máy chủ (Server Header Disclosure)
  res.removeHeader('X-Powered-By');

  next();
}

module.exports = securityHeadersMiddleware;
