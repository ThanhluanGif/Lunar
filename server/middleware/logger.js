const crypto = require('crypto');
const net = require('net');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_PATTERN = /^[0-9a-f]{16,64}$/i;
const LEVEL_PRIORITY = Object.freeze({ DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 });
const REDACTED = '[REDACTED]';
const REDACTED_PII = '[REDACTED_PII]';
const SENSITIVE_KEY_PATTERN = /(?:authorization|proxy-authorization|cookie|set-cookie|password|passwd|passphrase|token|secret|api[_-]?key|client[_-]?secret|private[_-]?key|signature|credential|session|card|cvv|cvc|bank[_-]?account|account[_-]?(?:no|number)|payment)/i;
const BODY_KEY_PATTERN = /^(?:body|requestBody|responseBody|payload|rawBody)$/i;
const PII_KEY_PATTERN = /^(?:email|phone|phoneNumber|address|fullName|firstName|lastName)$/i;
const IP_KEY_PATTERN = /^(?:ip|clientIp|remoteAddress)$/i;

function correlationIdFromRequest(value, trusted = false) {
  const candidate = String(value || '').trim();
  if (trusted && (UUID_PATTERN.test(candidate) || HEX_PATTERN.test(candidate))) {
    return candidate.toLowerCase();
  }
  return crypto.randomUUID();
}

function maskIp(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return null;
  const normalized = candidate.replace(/^::ffff:/, '');
  if (net.isIP(normalized) === 4) {
    return normalized.replace(/\.\d{1,3}$/, '.0');
  }
  if (net.isIP(normalized) === 6) {
    const [left = ''] = normalized.split('::');
    const groups = left.split(':').filter(Boolean).slice(0, 4);
    while (groups.length < 4) groups.push('0');
    return `${groups.join(':')}::/64`;
  }
  return '[REDACTED_IP]';
}

function redactText(value) {
  return String(value || '')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [REDACTED]')
    .replace(/\b(set-cookie|cookie)\s*:\s*[^\r\n]+/gi, '$1: [REDACTED]')
    .replace(/([?&](?:access_token|auth|authorization|code|credential|key|password|secret|signature|token)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/\b(password|passwd|passphrase|access[_-]?token|refresh[_-]?token|api[_-]?key|client[_-]?secret|private[_-]?key|secret)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1=[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_PAYMENT_DATA]')
    .replace(/\b(phone|tel)\s*[:=]\s*\+?[\d .()-]{8,}\d/gi, '$1=[REDACTED_PHONE]');
}

function cleanLogMessage(value) {
  return redactText(value)
    .replace(/[\r\n\0]+/g, ' ')
    .trim()
    .slice(0, 1000) || 'Request event';
}

function sanitizeLogValue(
  value,
  key = '',
  state = { depth: 0, budget: { nodes: 0 }, seen: new WeakSet() }
) {
  if (BODY_KEY_PATTERN.test(key) || SENSITIVE_KEY_PATTERN.test(key)) return REDACTED;
  if (PII_KEY_PATTERN.test(key)) return REDACTED_PII;
  if (IP_KEY_PATTERN.test(key)) return maskIp(value);
  if (value instanceof Error) {
    return {
      errorName: value.name || 'Error',
      errorCode: value.code || null
    };
  }
  if (typeof value === 'string') return redactText(value).slice(0, 4000);
  if (typeof value === 'bigint') return String(value);
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }
  if (Buffer.isBuffer(value)) return `[BUFFER:${value.length}]`;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return String(value);
  if (state.depth >= 8 || state.budget.nodes >= 1000) return '[TRUNCATED]';
  if (state.seen.has(value)) return '[Circular]';

  state.seen.add(value);
  state.budget.nodes += 1;
  const childState = { ...state, depth: state.depth + 1 };
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeLogValue(item, '', childState));
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 100)
      .map(([childKey, childValue]) => [
        childKey,
        sanitizeLogValue(childValue, childKey, childState)
      ])
  );
}

function serializeLogEntry(entry) {
  return JSON.stringify(sanitizeLogValue(entry));
}

function configuredLogLevel() {
  const fallback = process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG';
  const configured = String(process.env.LOG_LEVEL || fallback).trim().toUpperCase();
  return Object.hasOwn(LEVEL_PRIORITY, configured) ? configured : fallback;
}

function shouldLog(level) {
  const normalized = String(level || 'INFO').toUpperCase();
  return (LEVEL_PRIORITY[normalized] || LEVEL_PRIORITY.INFO) >= LEVEL_PRIORITY[configuredLogLevel()];
}

function emitStructuredLog(entry, details) {
  if (!shouldLog(entry.level)) return;
  const completeEntry = details && typeof details === 'object'
    ? { ...entry, details }
    : entry;

  let serialized;
  try {
    serialized = serializeLogEntry(completeEntry);
  } catch {
    serialized = JSON.stringify({
      ...entry,
      details: { serializationError: true }
    });
  }
  if (entry.level === 'ERROR') console.error(serialized);
  else if (entry.level === 'WARN') console.warn(serialized);
  else console.log(serialized);
}

function writeStructuredLog(req, level, message, status = 0, details) {
  emitStructuredLog({
    timestamp: new Date().toISOString(),
    level,
    correlationId: req.correlationId || null,
    userId: req.user?.id || null,
    ip: req.ip || req.socket?.remoteAddress || null,
    method: req.method,
    path: String(req.originalUrl || req.path || '').split('?')[0],
    status: Number(status) || 0,
    message: cleanLogMessage(message)
  }, details);
}

function writeSystemLog(level, message, details, context = {}) {
  emitStructuredLog({
    timestamp: new Date().toISOString(),
    level,
    correlationId: context.correlationId || null,
    userId: context.userId || null,
    ip: null,
    method: null,
    path: null,
    status: Number(context.status) || 0,
    message: cleanLogMessage(message)
  }, details);
}

function correlationLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const trustedProxyRequest = Array.isArray(req.ips) && req.ips.length > 0;
  const correlationId = correlationIdFromRequest(
    req.get('x-correlation-id'),
    trustedProxyRequest
  );
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  req.log = {
    debug: (message, details, status = res.statusCode) => writeStructuredLog(req, 'DEBUG', message, status, details),
    info: (message, details, status = res.statusCode) => writeStructuredLog(req, 'INFO', message, status, details),
    warn: (message, details, status = res.statusCode) => writeStructuredLog(req, 'WARN', message, status, details),
    error: (message, details, status = res.statusCode) => writeStructuredLog(req, 'ERROR', message, status, details)
  };

  let completed = false;
  res.on('finish', () => {
    completed = true;
    const status = res.statusCode;
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    writeStructuredLog(req, level, 'HTTP request completed', status, {
      durationMs: Number(durationMs.toFixed(2))
    });
  });
  res.on('close', () => {
    if (!completed) {
      writeStructuredLog(req, 'WARN', 'HTTP request closed before completion', 499);
    }
  });

  return next();
}

module.exports = {
  REDACTED,
  REDACTED_PII,
  cleanLogMessage,
  correlationIdFromRequest,
  correlationLogger,
  configuredLogLevel,
  maskIp,
  redactText,
  sanitizeLogValue,
  serializeLogEntry,
  shouldLog,
  writeSystemLog,
  writeStructuredLog
};
