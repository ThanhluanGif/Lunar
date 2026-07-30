const express = require('express');
const crypto = require('crypto');
const { verifyToken } = require('../middleware/auth');
const { getPool } = require('../db/connection');
const { isScannable, scanFile, supportedLanguages, ruleCount } = require('../services/sastEngine');
const { dispatchCriticalAlert } = require('./notificationRoutes');

const router = express.Router();
const MAX_FILES = Number.parseInt(process.env.DEEP_SCAN_MAX_FILES, 10) || 250;
const MAX_FILE_BYTES = Number.parseInt(process.env.DEEP_SCAN_MAX_FILE_BYTES, 10) || 512000;
const MAX_TOTAL_BYTES = Number.parseInt(process.env.DEEP_SCAN_MAX_TOTAL_BYTES, 10) || 5000000;
const CONCURRENCY = Math.min(Number.parseInt(process.env.DEEP_SCAN_CONCURRENCY, 10) || 5, 10);
const IGNORED_PARTS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'vendor', 'coverage', '.next',
  'target', 'bin', 'obj', '__pycache__', '.venv', 'venv'
]);

function decryptToken(value) {
  const encryptionSecret = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!encryptionSecret || encryptionSecret.length < 32) {
    throw Object.assign(new Error('GitHub token encryption is not configured.'), { status: 503 });
  }
  const [ivValue, tagValue, ciphertextValue] = String(value).split('.');
  const key = crypto.createHash('sha256').update(encryptionSecret).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

async function githubRequest(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Lunar-Deep-Scanner'
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `GitHub request failed (${response.status}).`);
    error.status = response.status === 404 ? 404 : 502;
    throw error;
  }
  return payload;
}

function safeRepositoryName(value) {
  const name = String(value || '').trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(name)) return null;
  return name;
}

function shouldScan(item) {
  if (item.type !== 'blob' || !isScannable(item.path)) return false;
  if (item.size > MAX_FILE_BYTES) return false;
  return !item.path.split('/').some((part) => IGNORED_PARTS.has(part));
}

async function mapConcurrent(items, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run));
  return results;
}

function severityScore(findings) {
  return Math.max(0, 100 - findings.reduce((penalty, finding) => (
    penalty + ({ critical: 20, high: 10, medium: 5, low: 2 }[finding.severity] || 1)
  ), 0));
}

router.get('/capabilities', verifyToken, (req, res) => {
  res.json({
    success: true,
    supportedLanguages,
    rules: ruleCount,
    limits: {
      maxFiles: MAX_FILES,
      maxFileBytes: MAX_FILE_BYTES,
      maxTotalBytes: MAX_TOTAL_BYTES,
      concurrency: CONCURRENCY
    }
  });
});

router.post('/repository', verifyToken, async (req, res) => {
  const repository = safeRepositoryName(req.body?.repository);
  if (!repository) {
    return res.status(400).json({ success: false, error: 'repository must be owner/name.' });
  }

  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });

  try {
    const connection = await pool.query(
      'SELECT access_token_encrypted FROM github_connections WHERE user_id = $1',
      [req.user.id]
    );
    if (!connection.rows[0]) {
      return res.status(409).json({ success: false, error: 'Connect GitHub before starting a deep scan.' });
    }
    const token = decryptToken(connection.rows[0].access_token_encrypted);
    const repo = await githubRequest(`/repos/${repository}`, token);
    const branch = String(req.body?.branch || repo.default_branch || 'main').slice(0, 255);
    const tree = await githubRequest(
      `/repos/${repository}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      token
    );
    if (tree.truncated) {
      return res.status(422).json({
        success: false,
        error: 'GitHub returned a truncated tree. Scan a smaller branch or repository.'
      });
    }

    const candidates = (tree.tree || []).filter(shouldScan).slice(0, MAX_FILES);
    let totalBytes = 0;
    const bounded = candidates.filter((item) => {
      const size = Number(item.size || 0);
      if (totalBytes + size > MAX_TOTAL_BYTES) return false;
      totalBytes += size;
      return true;
    });

    const fileResults = await mapConcurrent(bounded, async (item) => {
      try {
        const blob = await githubRequest(`/repos/${repository}/git/blobs/${item.sha}`, token);
        if (blob.encoding !== 'base64') throw new Error('Unsupported GitHub blob encoding.');
        const content = Buffer.from(String(blob.content).replace(/\s/g, ''), 'base64').toString('utf8');
        const findings = scanFile(item.path, content);
        return {
          path: item.path,
          sha: item.sha,
          size: item.size,
          content,
          status: findings.some((finding) => finding.severity === 'critical')
            ? 'critical'
            : findings.length ? 'warning' : 'safe',
          findings
        };
      } catch (error) {
        return { path: item.path, size: item.size, status: 'error', findings: [], error: error.message };
      }
    });

    const findings = fileResults.flatMap((file) => file.findings);
    const score = severityScore(findings);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const lockedUser = await client.query(
        'SELECT tier, daily_scans_used, last_scan_reset_at FROM users WHERE id = $1 FOR UPDATE',
        [req.user.id]
      );
      const quota = lockedUser.rows[0];
      const resetDue = new Date(quota.last_scan_reset_at).toDateString() !== new Date().toDateString();
      const scansUsed = resetDue ? 0 : quota.daily_scans_used;
      if (quota.tier === 'FREE' && scansUsed >= 5) {
        await client.query('ROLLBACK');
        return res.status(429).json({ success: false, error: 'FREE daily scan quota reached.' });
      }
      if (resetDue) {
        await client.query(
          'UPDATE users SET daily_scans_used = 0, last_scan_reset_at = CURRENT_TIMESTAMP WHERE id = $1',
          [req.user.id]
        );
      }

      const projectResult = await client.query(
        `INSERT INTO projects (
           user_id, name, repo_url, language, security_score,
           github_repo_id, is_private, synced_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, github_repo_id) WHERE github_repo_id IS NOT NULL
         DO UPDATE SET security_score = EXCLUDED.security_score, synced_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [req.user.id, repo.full_name, repo.html_url, repo.language || 'Mixed', score, repo.id, repo.private]
      );
      const projectId = projectResult.rows[0].id;
      const scanResult = await client.query(
        `INSERT INTO scans (project_id, user_id, score, issues_count, ai_model_used)
         VALUES ($1, $2, $3, $4, 'lunar-deep-sast-v1')
         RETURNING id, created_at`,
        [projectId, req.user.id, score, findings.length]
      );
      const scanId = scanResult.rows[0].id;
      for (const finding of findings.slice(0, 1000)) {
        await client.query(
          `INSERT INTO vulnerabilities (
             scan_id, cve_id, title, severity, line_number, file_path,
             code_snippet, suggested_patch, status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')`,
          [
            scanId,
            finding.cwe,
            finding.title,
            finding.severity === 'critical' ? 'critical' : finding.severity === 'high' ? 'warning' : 'info',
            finding.line,
            finding.filePath,
            finding.codeSnippet,
            finding.recommendation
          ]
        );
      }
      await client.query(
        'UPDATE users SET daily_scans_used = daily_scans_used + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [req.user.id]
      );
      await client.query('COMMIT');

      const criticalCount = findings.filter((item) => item.severity === 'critical').length;
      if (criticalCount > 0) {
        dispatchCriticalAlert({
          userId: req.user.id,
          projectTitle: repo.full_name,
          summary: {
            maxCvss: 9.2,
            criticalCount,
            highCount: findings.filter((item) => item.severity === 'high').length,
            mediumCount: findings.filter((item) => item.severity === 'medium').length,
            total: findings.length
          }
        }).catch((error) => console.warn('Deep scan Gmail notification skipped:', error.message));
      }

      return res.json({
        success: true,
        source: 'github',
        repository: repo.full_name,
        branch,
        scanId,
        projectId,
        score,
        filesDiscovered: (tree.tree || []).length,
        filesScanned: fileResults.length,
        bytesScanned: totalBytes,
        findings: findings.length,
        severity: {
          critical: findings.filter((item) => item.severity === 'critical').length,
          high: findings.filter((item) => item.severity === 'high').length,
          medium: findings.filter((item) => item.severity === 'medium').length,
          low: findings.filter((item) => item.severity === 'low').length
        },
        files: fileResults,
        createdAt: scanResult.rows[0].created_at
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Deep repository scan failed:', error.message);
    return res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

module.exports = router;
