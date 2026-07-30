const express = require('express');
const crypto = require('crypto');
const { requireRole, verifyToken } = require('../middleware/auth');
const router = express.Router();

// Memory store for custom security policies
const defaultPolicies = [
  {
    id: 'pol-1',
    name: 'OWASP Top 10 (2025 Standard)',
    enabled: true,
    category: 'compliance',
    description: 'Enforces strict checks against SQLi, XSS, Hardcoded Secrets, and Insecure JWT.'
  },
  {
    id: 'pol-2',
    name: 'Financial Data Security Policy (PCI-DSS)',
    enabled: true,
    category: 'fintech',
    description: 'Prohibits plain-text credit card numbers and unencrypted PII storage.'
  },
  {
    id: 'pol-3',
    name: 'Zero Console/Debug Statement Policy',
    enabled: false,
    category: 'code-quality',
    description: 'Flag any leftover console.log, print statements or debugger keywords.'
  }
];

/**
 * GET /api/v1/policies
 * Fetch all enterprise security policies
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    policies: defaultPolicies
  });
});

/**
 * POST /api/v1/policies
 * Create a new custom security policy
 */
router.post('/', verifyToken, requireRole('ADMIN'), (req, res) => {
  const name = String(req.body?.name || '').trim();
  const category = String(req.body?.category || 'custom').trim();
  const description = String(req.body?.description || '').trim();
  if (name.length < 2 || name.length > 120 || category.length > 40 || description.length > 500) {
    return res.status(400).json({ success: false, error: 'Policy fields exceed the allowed length.' });
  }

  const newPolicy = {
    id: `pol-${crypto.randomUUID()}`,
    name: name || 'Custom Security Rule',
    enabled: true,
    category: category || 'custom',
    description: description || 'Tùy chỉnh quy tắc kiểm tra mã nguồn'
  };

  defaultPolicies.push(newPolicy);

  res.json({
    success: true,
    policy: newPolicy
  });
});

/**
 * PATCH /api/v1/policies/:id/toggle
 * Toggle policy status
 */
router.patch('/:id/toggle', verifyToken, requireRole('ADMIN'), (req, res) => {
  const { id } = req.params;
  const policy = defaultPolicies.find(p => p.id === id);
  if (policy) {
    policy.enabled = !policy.enabled;
  }
  res.json({
    success: true,
    policy
  });
});

module.exports = router;
