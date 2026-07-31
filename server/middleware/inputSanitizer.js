/**
 * Input Sanitizer & SQLi / XSS Attack Detector Middleware
 * Lọc sạch dữ liệu req.body, req.query, req.params trước khi đưa vào xử lý nghiệp vụ.
 */

const BLOCKED_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_INPUT_DEPTH = 64;
const MAX_INPUT_NODES = 20000;

function sanitizeValue(value) {
  if (typeof value !== 'object' || value === null) return value;

  const stack = [{ value, depth: 0 }];
  let visited = 0;
  while (stack.length) {
    const current = stack.pop();
    visited += 1;
    if (visited > MAX_INPUT_NODES || current.depth > MAX_INPUT_DEPTH) {
      const error = new Error('Request input is too deeply nested or complex.');
      error.code = 'INPUT_COMPLEXITY_LIMIT';
      throw error;
    }

    for (const key of Object.keys(current.value)) {
      if (BLOCKED_OBJECT_KEYS.has(key)) {
        delete current.value[key];
        continue;
      }
      const child = current.value[key];
      if (typeof child === 'string') {
        current.value[key] = child.replace(/\0/g, '');
      } else if (typeof child === 'object' && child !== null) {
        stack.push({ value: child, depth: current.depth + 1 });
      }
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

    return next();
  } catch (err) {
    if (err.code !== 'INPUT_COMPLEXITY_LIMIT') {
      req.log?.error('Input sanitizer failed.', err, 400);
    }
    return res.status(400).json({
      success: false,
      error: 'Request input is too deeply nested or invalid.'
    });
  }
}

module.exports = inputSanitizerMiddleware;
