const crypto = require('crypto');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_PATTERN = /^[0-9a-f]{16,64}$/i;

function correlationIdFromRequest(value) {
  const candidate = String(value || '').trim();
  if (UUID_PATTERN.test(candidate) || HEX_PATTERN.test(candidate)) {
    return candidate.toLowerCase();
  }
  return crypto.randomUUID();
}

function cleanLogMessage(value) {
  return String(value || 'Request event')
    .replace(/[\r\n\0]+/g, ' ')
    .trim()
    .slice(0, 1000);
}

function serializeLogEntry(entry) {
  const seen = new WeakSet();
  return JSON.stringify(entry, (key, value) => {
    if (value instanceof Error) {
      return {
        errorName: value.name || 'Error',
        errorCode: value.code || null
      };
    }
    if (typeof value === 'bigint') return String(value);
    if (value && typeof value === 'object') {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  });
}

function emitStructuredLog(entry, details) {
  if (details && typeof details === 'object') entry.details = details;

  let serialized;
  try {
    serialized = serializeLogEntry(entry);
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
    path: req.path || String(req.originalUrl || '').split('?')[0],
    status: Number(status) || 0,
    message: cleanLogMessage(message)
  }, details);
}

function writeSystemLog(level, message, details) {
  emitStructuredLog({
    timestamp: new Date().toISOString(),
    level,
    correlationId: null,
    userId: null,
    ip: null,
    method: null,
    path: null,
    status: 0,
    message: cleanLogMessage(message)
  }, details);
}

function correlationLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const correlationId = correlationIdFromRequest(req.get('x-correlation-id'));
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  req.log = {
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
  correlationIdFromRequest,
  correlationLogger,
  writeSystemLog,
  writeStructuredLog
};
