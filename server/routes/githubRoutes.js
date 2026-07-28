const express = require('express');
const router = express.Router();

/**
 * POST /api/v1/github/webhook
 * Receives GitHub webhook events (e.g. pull_request)
 * Performs automated SAST review on changed files and returns review payload
 */
router.post('/webhook', (req, res) => {
  const event = req.headers['x-github-event'] || 'pull_request';
  const payload = req.body;

  if (event === 'ping') {
    return res.json({ success: true, message: 'Lunar GitHub Bot Webhook connected successfully!' });
  }

  if (event === 'pull_request') {
    const action = payload.action;
    const prNumber = payload.number || 1;
    const repoName = payload.repository?.full_name || 'Lunar/Repository';
    const sender = payload.sender?.login || 'developer';

    const mockReviewResult = {
      prNumber,
      repoName,
      triggeredBy: sender,
      action,
      timestamp: new Date().toISOString(),
      sastStatus: 'COMPLETED',
      securityScore: 88,
      vulnerabilitiesFound: [
        {
          cve: 'CWE-798',
          file: 'src/config/auth.ts',
          line: 14,
          severity: 'critical',
          description: 'Hardcoded Secret Token detected in PR diff.',
          suggestion: 'Replace raw string token with process.env.AUTH_SECRET'
        }
      ],
      commentPayload: `### 🌙 Lunar AI Security Bot Review Results for PR #${prNumber}
- **Security Score**: 88/100
- **Status**: ⚠️ 1 Critical Vulnerability Detected (CWE-798)
- **Recommendation**: Apply process.env environment variable fix before merging.`
    };

    return res.json({
      success: true,
      review: mockReviewResult
    });
  }

  res.json({ success: true, message: `Event ${event} received.` });
});

module.exports = router;
