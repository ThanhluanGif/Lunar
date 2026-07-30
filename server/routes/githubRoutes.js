const crypto = require('crypto');
const express = require('express');
const { getPool } = require('../db/connection');
const { verifyToken, requireTier } = require('../middleware/auth');
const { providerFetch } = require('../services/providerHttp');

const router = express.Router();
const SUPPORTED_PULL_REQUEST_ACTIONS = new Set(['opened', 'reopened', 'synchronize']);
const GITHUB_API = 'https://api.github.com';

function signatureMatches(rawBody, suppliedSignature, secret) {
  if (!rawBody || !suppliedSignature || !secret) return false;
  const normalized = String(suppliedSignature).replace(/^sha256=/i, '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(normalized, 'hex'), Buffer.from(expected, 'hex'));
}

function decryptAccessToken(value) {
  const encryptionSecret = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!encryptionSecret || encryptionSecret.length < 32) {
    throw new Error('GitHub token encryption is not configured.');
  }
  const [ivValue, tagValue, ciphertextValue] = String(value || '').split('.');
  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new Error('Stored GitHub authorization is invalid. Reconnect GitHub.');
  }
  const key = crypto.createHash('sha256').update(encryptionSecret).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

async function githubRequest(path, token, options = {}) {
  const response = await providerFetch(`${GITHUB_API}${path}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Lunar-Security-Dashboard',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  }, {
    correlationId: options.correlationId,
    timeoutMs: 15000,
    maxRetries: 1
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `GitHub API request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

router.post('/pull-requests', verifyToken, requireTier('ENTERPRISE'), async (req, res) => {
  const repository = String(req.body?.repository || '').trim();
  const filePath = String(req.body?.filePath || '').trim().replace(/^\/+/, '');
  const originalCode = req.body?.originalCode;
  const patchedCode = req.body?.patchedCode;
  const expectedBlobSha = String(req.body?.expectedBlobSha || '').trim().toLowerCase();
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
    || !filePath
    || filePath.includes('..')
    || typeof originalCode !== 'string'
    || typeof patchedCode !== 'string'
    || patchedCode === originalCode
    || (expectedBlobSha && !/^[a-f0-9]{40}$/.test(expectedBlobSha))
    || originalCode.length > 500000
    || patchedCode.length > 500000
  ) {
    return res.status(400).json({ success: false, error: 'A valid repository, file path and changed patch are required.' });
  }

  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const connection = await pool.query(
    `SELECT gc.access_token_encrypted
     FROM github_connections gc
     WHERE gc.user_id = $1
       AND EXISTS (
         SELECT 1 FROM projects p
         WHERE p.user_id = $1 AND lower(p.name) = lower($2)
       )`,
    [req.user.id, repository]
  );
  if (!connection.rows[0]) {
    return res.status(404).json({ success: false, error: 'The connected GitHub repository was not found.' });
  }

  try {
    const token = decryptAccessToken(connection.rows[0].access_token_encrypted);
    const repositoryPath = `/repos/${repository}`;
    const correlationId = req.correlationId;
    const metadata = await githubRequest(repositoryPath, token, { correlationId });
    const baseBranch = metadata.default_branch;
    const baseRef = await githubRequest(
      `${repositoryPath}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
      token,
      { correlationId }
    );
    const existingFile = await githubRequest(
      `${repositoryPath}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(baseBranch)}`,
      token,
      { correlationId }
    );
    if (expectedBlobSha && existingFile.sha !== expectedBlobSha) {
      return res.status(409).json({
        success: false,
        error: 'The GitHub file changed after the scan. Run a new scan before creating a pull request.'
      });
    }
    const currentContent = Buffer.from(existingFile.content || '', 'base64').toString('utf8');
    if (currentContent.replace(/\r\n/g, '\n') !== originalCode.replace(/\r\n/g, '\n')) {
      return res.status(409).json({
        success: false,
        error: 'The GitHub file changed after the scan. Run a new scan before creating a pull request.'
      });
    }

    const branchName = `lunar/security-fix-${crypto.randomBytes(5).toString('hex')}`;
    await githubRequest(`${repositoryPath}/git/refs`, token, {
      method: 'POST',
      correlationId,
      body: { ref: `refs/heads/${branchName}`, sha: baseRef.object.sha }
    });
    const title = String(req.body?.title || 'Lunar security remediation').slice(0, 120);
    await githubRequest(`${repositoryPath}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}`, token, {
      method: 'PUT',
      correlationId,
      body: {
        message: title,
        content: Buffer.from(patchedCode, 'utf8').toString('base64'),
        branch: branchName,
        sha: existingFile.sha
      }
    });
    const pullRequest = await githubRequest(`${repositoryPath}/pulls`, token, {
      method: 'POST',
      correlationId,
      body: {
        title,
        head: branchName,
        base: baseBranch,
        body: 'Automated security remediation generated from an authenticated Lunar scan. Review and test before merging.'
      }
    });
    return res.status(201).json({
      success: true,
      prNumber: pullRequest.number,
      prUrl: pullRequest.html_url,
      branchName,
      title: pullRequest.title
    });
  } catch (error) {
    req.log?.error('GitHub pull request creation failed.', error, 500);
    const status = error.status === 401 || error.status === 403 ? 409 : 502;
    return res.status(status).json({
      success: false,
      error: status === 409
        ? 'GitHub authorization lacks write access. Reconnect with repository write permission.'
        : 'Unable to create the GitHub pull request.'
    });
  }
});

router.post('/webhook', async (req, res) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) {
    return res.status(503).json({ success: false, error: 'GitHub webhook is not configured.' });
  }
  if (!signatureMatches(req.rawBody, req.get('x-hub-signature-256'), secret)) {
    return res.status(401).json({ success: false, error: 'Invalid GitHub webhook signature.' });
  }

  const event = String(req.get('x-github-event') || '').trim();
  const deliveryId = String(req.get('x-github-delivery') || '').trim();
  if (!event || !deliveryId || deliveryId.length > 255) {
    return res.status(400).json({
      success: false,
      error: 'GitHub event and delivery headers are required.'
    });
  }

  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  }

  const payloadHash = crypto.createHash('sha256').update(req.rawBody).digest('hex');
  const repository = String(req.body?.repository?.full_name || '').slice(0, 255) || null;
  const action = String(req.body?.action || '').slice(0, 80) || null;
  try {
    const inserted = await pool.query(
      `INSERT INTO github_webhook_deliveries (
         delivery_id, event_type, action, repository, payload_hash, status, correlation_id
       ) VALUES ($1, $2, $3, $4, $5, 'RECEIVED', $6)
       ON CONFLICT (delivery_id) DO NOTHING
       RETURNING delivery_id`,
      [deliveryId, event, action, repository, payloadHash, req.correlationId]
    );
    if (inserted.rows.length === 0) {
      return res.json({ success: true, idempotent: true, deliveryId });
    }

    if (event === 'ping') {
      await pool.query(
        `UPDATE github_webhook_deliveries
         SET status = 'PROCESSED', processed_at = CURRENT_TIMESTAMP
         WHERE delivery_id = $1`,
        [deliveryId]
      );
      return res.json({ success: true, idempotent: false, deliveryId, status: 'PROCESSED' });
    }

    if (event !== 'pull_request' || !SUPPORTED_PULL_REQUEST_ACTIONS.has(action)) {
      await pool.query(
        `UPDATE github_webhook_deliveries
         SET status = 'IGNORED', processed_at = CURRENT_TIMESTAMP
         WHERE delivery_id = $1`,
        [deliveryId]
      );
      return res.status(202).json({
        success: true,
        idempotent: false,
        deliveryId,
        status: 'IGNORED'
      });
    }

    // GH-002 will consume this durable receipt and scan the authenticated PR diff.
    return res.status(202).json({
      success: true,
      idempotent: false,
      deliveryId,
      status: 'RECEIVED',
      message: 'Pull request delivery accepted for security scanning.'
    });
  } catch (error) {
    req.log?.error('GitHub webhook receipt failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Unable to record GitHub webhook delivery.' });
  }
});

module.exports = router;
