/**
 * Input Sanitizer & SQLi / XSS Attack Detector Middleware
 * Lọc sạch dữ liệu req.body, req.query, req.params trước khi đưa vào xử lý nghiệp vụ.
 */

const SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION|TRUNCATE)\b)|(--)|(;)/i;
const XSS_SCRIPT_PATTERN = /(<script\b[^>]*>([\s\S]*?)<\/script>)|(javascript:)|(onerror=)|(onload=)/i;

function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Truncate overly long strings (> 100KB) to prevent ReDoS / Buffer Overflow
    if (value.length > 100000) {
      value = value.substring(0, 100000);
    }
    // Remove null bytes
    return value.replace(/\0/g, '');
  }
  if (typeof value === 'object' && value !== null) {
    for (const key in value) {
      value[key] = sanitizeValue(value[key]);
    }
  }
  return value;
}

function detectMaliciousPayload(data) {
  if (!data) return false;
  const str = JSON.stringify(data);
  if (XSS_SCRIPT_PATTERN.test(str)) {
    return 'XSS_ATTACK_DETECTED';
  }
  if (SQL_INJECTION_PATTERN.test(str)) {
    return 'SQL_INJECTION_DETECTED';
  }
  return null;
}

function inputSanitizerMiddleware(req, res, next) {
  try {
    // Detect malicious payload
    const threatInBody = detectMaliciousPayload(req.body);
    const threatInQuery = detectMaliciousPayload(req.query);

    if (threatInBody || threatInQuery) {
      console.warn(`🚨 SECURITY THREAT BLOCKED [${req.ip}]: ${threatInBody || threatInQuery} on ${req.originalUrl}`);
      return res.status(400).json({
        success: false,
        error: 'BAD_REQUEST: Phát hiện dữ liệu không an toàn (XSS/SQLi Pattern). Yêu cầu bị chặn bởi Zero-Trust Firewall.'
      });
    }

    // Sanitize input objects
    // Express 5 exposes req.query as a getter, so sanitize the existing
    // objects in place instead of assigning back to request properties.
    if (req.body) sanitizeValue(req.body);
    if (req.query) sanitizeValue(req.query);
    if (req.params) sanitizeValue(req.params);

    next();
  } catch (err) {
    console.error('Error in inputSanitizerMiddleware:', err);
    next();
  }
}

module.exports = inputSanitizerMiddleware;
