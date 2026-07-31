require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Security Middlewares
const securityHeaders = require('./middleware/securityHeaders');
const inputSanitizer = require('./middleware/inputSanitizer');
const { correlationLogger, writeSystemLog } = require('./middleware/logger');
const { publicApiRateLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const githubAuthRoutes = require('./routes/githubAuthRoutes');
const scanRoutes = require('./routes/scanRoutes');
const githubRoutes = require('./routes/githubRoutes');
const reportRoutes = require('./routes/reportRoutes');
const policyRoutes = require('./routes/policyRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { router: securityAuditRoutes } = require('./routes/securityAuditRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const deepScanRoutes = require('./routes/deepScanRoutes');
const publicRoutes = require('./routes/publicRoutes');

const { initPgDatabase, getIsPgConnected } = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 5000;

function trustProxySetting(value) {
  const configured = String(value || '').trim();
  if (!configured) return false;
  if (/^\d+$/.test(configured)) return Number.parseInt(configured, 10);
  return configured;
}

// Disable Express fingerprinting
app.disable('x-powered-by');
app.set('trust proxy', trustProxySetting(process.env.TRUST_PROXY));

// 1. OWASP ASVS Security Headers
app.use(securityHeaders);
app.use(correlationLogger);

// 2. CORS configuration with credential & origin validation
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5050,http://127.0.0.1:5050,http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => {
    try {
      return new URL(origin.trim()).origin;
    } catch {
      return '';
    }
  })
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
  exposedHeaders: ['X-Correlation-ID', 'Content-Disposition']
}));

// 3. Global payload bounds; scan routes enforce smaller field-level limits.
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buffer) => {
    if (
      req.originalUrl?.startsWith('/api/v1/payment/webhook')
      || req.originalUrl?.startsWith('/api/v1/github/webhook')
    ) {
      req.rawBody = Buffer.from(buffer);
    }
  }
}));
app.use(express.urlencoded({ extended: false, parameterLimit: 1000, limit: '256kb' }));
app.use(cookieParser());

// SameSite cookies are the primary CSRF control. Origin validation adds a
// server-side check for browsers that send an authenticated cookie.
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || !req.cookies?.access_token) {
    return next();
  }
  let requestOrigin = req.get('origin') || '';
  if (!requestOrigin && req.get('referer')) {
    try {
      requestOrigin = new URL(req.get('referer')).origin;
    } catch {
      return res.status(403).json({ success: false, error: 'CSRF origin validation failed.' });
    }
  }
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return next();
  if (!requestOrigin) return next();
  return res.status(403).json({ success: false, error: 'CSRF origin validation failed.' });
});

// 4. Input Sanitizer (Anti XSS / SQLi)
app.use(inputSanitizer);

// 5. Global Rate Limiter for general public endpoints
app.use('/api/v1/public', publicApiRateLimiter);

// Session responses must never be reused across login/logout transitions.
app.use('/api/v1/auth', (req, res, next) => {
  res.set('Cache-Control', 'no-store, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.vary('Cookie');
  return next();
});

// 6. Registered Business Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', accountRoutes);
app.use('/api/v1/auth/github', githubAuthRoutes);
app.use('/api/v1/scans', scanRoutes);
app.use('/api/v1/github', githubRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/policies', policyRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/security', securityAuditRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/assistant', assistantRoutes);
app.use('/api/v1/deep-scans', deepScanRoutes);
app.use('/api/v1/public', publicRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Lunar Security REST API Engine',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/ready', (req, res) => {
  const databaseConnected = getIsPgConnected();
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'READY' : 'NOT_READY',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', (req, res) => {
  return res.status(404).json({
    success: false,
    error: 'API endpoint not found.'
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.type === 'entity.too.large') {
    req.log?.warn('Rejected oversized request payload.', undefined, 413);
    return res.status(413).json({ success: false, error: 'Request payload exceeds the 1MB limit.' });
  }
  if (error instanceof SyntaxError && error.status === 400 && Object.hasOwn(error, 'body')) {
    req.log?.warn('Rejected malformed JSON request body.', undefined, 400);
    return res.status(400).json({ success: false, error: 'Malformed JSON request body.' });
  }
  req.log?.error('Unhandled Express request error.', {
    errorName: error?.name || 'Error',
    errorCode: error?.code || null
  }, 500);
  return res.status(500).json({ success: false, error: 'Internal server error.' });
});

// Serve the Mac frontend bundle in the production container.
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  return next();
});

app.listen(PORT, async () => {
  writeSystemLog('INFO', `Lunar Zero-Trust REST API server is running on port ${PORT}.`);
  await initPgDatabase();
});
