const express = require('express');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Memory fallback store for community audits
const communityAudits = [
  {
    id: 'audit-1',
    author: '@alex_whitehat',
    title: 'Phát hiện lỗ hổng JWT Decode Không Chữ Ký (CWE-347) trên Node.js',
    targetRepo: 'facebook/react',
    vulnerabilityType: 'Insecure JWT Authentication',
    severity: 'critical',
    content: 'Khi ứng dụng decode JWT token mà không kiểm tra secret signature, hacker có thể giả mạo token với role admin.',
    upvotes: 42,
    createdAt: new Date().toISOString()
  },
  {
    id: 'audit-2',
    author: '@sarah_sec',
    title: 'Cảnh báo SQL Injection nguy hiểm với chuỗi truy vấn PostgreSQL',
    targetRepo: 'expressjs/express',
    vulnerabilityType: 'SQL Injection (CWE-89)',
    severity: 'critical',
    content: 'Ghép chuỗi SQL trực tiếp mà không dùng Parameterized Query làm lộ thông tin database.',
    upvotes: 28,
    createdAt: new Date().toISOString()
  }
];

/**
 * GET /api/v1/community/audits
 * Fetch community audit reports
 */
router.get('/audits', (req, res) => {
  res.json({
    success: true,
    audits: communityAudits
  });
});

/**
 * POST /api/v1/community/audits
 * Submit a new community security audit write-up (Grants +50 Karma)
 */
router.post('/audits', verifyToken, (req, res) => {
  const { title, targetRepo, vulnerabilityType, severity, content } = req.body;

  const newAudit = {
    id: `audit-${Date.now()}`,
    author: req.user.nickname || '@whitehat',
    title: title || 'Lỗ hổng bảo mật mới',
    targetRepo: targetRepo || 'OpenSource/Project',
    vulnerabilityType: vulnerabilityType || 'SAST Vulnerability',
    severity: severity || 'critical',
    content: content || 'Mô tả chi tiết lỗ hổng...',
    upvotes: 1,
    createdAt: new Date().toISOString()
  };

  communityAudits.unshift(newAudit);

  res.json({
    success: true,
    audit: newAudit,
    karmaGranted: 50
  });
});

/**
 * POST /api/v1/community/audits/:id/upvote
 * Upvote an audit write-up
 */
router.post('/audits/:id/upvote', (req, res) => {
  const { id } = req.params;
  const audit = communityAudits.find(a => a.id === id);
  if (audit) {
    audit.upvotes += 1;
  }
  res.json({
    success: true,
    upvotes: audit ? audit.upvotes : 1
  });
});

module.exports = router;
