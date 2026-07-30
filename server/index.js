require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Security Middlewares
const securityHeaders = require('./middleware/securityHeaders');
const inputSanitizer = require('./middleware/inputSanitizer');
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

const { initPgDatabase, getIsPgConnected } = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 5000;

// Disable Express fingerprinting
app.disable('x-powered-by');

// 1. OWASP ASVS Security Headers
app.use(securityHeaders);

// 2. CORS configuration with credential & origin validation
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Body parser with 10MB payload size limit (Anti-DDOS Buffer Overflow)
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buffer) => {
    if (
      req.originalUrl?.startsWith('/api/v1/payment/webhook')
      || req.originalUrl?.startsWith('/api/v1/github/webhook')
    ) {
      req.rawBody = Buffer.from(buffer);
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Input Sanitizer (Anti XSS / SQLi)
app.use(inputSanitizer);

// 5. Global Rate Limiter for general public endpoints
app.use('/api/v1/public', publicApiRateLimiter);

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

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Lunar Security Zero-Trust REST API Engine',
    securityLevel: 'OWASP ASVS Level 2 Standard Compliant',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/ready', (req, res) => {
  const databaseConnected = getIsPgConnected();
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'READY' : 'NOT_READY',
    database: databaseConnected ? 'CONNECTED' : 'UNAVAILABLE',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', (req, res) => {
  return res.status(404).json({
    success: false,
    error: 'API endpoint not found.'
  });
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
  console.log(`🛡️ Lunar Zero-Trust REST API Server running on port ${PORT}`);
  await initPgDatabase();
});
