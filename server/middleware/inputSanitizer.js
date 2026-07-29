/**
 * Input Sanitizer & SQLi / XSS Attack Detector Middleware
 * Lọc sạch dữ liệu req.body, req.query, req.params trước khi đưa vào xử lý nghiệp vụ.
 */

const BLOCKED_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

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
    for (const key of Object.keys(value)) {
      if (BLOCKED_OBJECT_KEYS.has(key)) {
        delete value[key];
        continue;
      }
      value[key] = sanitizeValue(value[key]);
    }
  }
  return value;
}

function inputSanitizerMiddleware(req, res, next) {
  try {
    // Normalize input without SQL keyword blacklists. All database access must
    // use parameterized queries; keyword blocking would reject code submitted
    // for security analysis and legitimate admin reasons.
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
