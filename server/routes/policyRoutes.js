const express = require('express');
const { verifyToken } = require('../middleware/auth');
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
router.post('/', verifyToken, (req, res) => {
  const { name, category, description } = req.body;

  const newPolicy = {
    id: `pol-${Date.now()}`,
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
router.patch('/:id/toggle', verifyToken, (req, res) => {
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
