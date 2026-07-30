const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getPool } = require('../db/connection');
const { scanQuotaLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const RULES = [
  {
    id: 'LUNAR-JS-EVAL',
    title: 'Dynamic code execution with eval',
    severity: 'critical',
    pattern: /\beval\s*\(/g,
    patch: 'Replace eval with a strict parser or an allow-listed command map.'
  },
  {
    id: 'LUNAR-DOM-XSS',
    title: 'Potential DOM XSS through innerHTML',
    severity: 'critical',
    pattern: /\.innerHTML\s*=/g,
    patch: 'Use textContent or sanitize trusted HTML with a maintained sanitizer.'
  },
  {
    id: 'LUNAR-SQL-TEMPLATE',
    title: 'Potential SQL injection through string interpolation',
    severity: 'critical',
    pattern: /(SELECT|INSERT|UPDATE|DELETE)[\s\S]{0,120}(\$\{|['"]\s*\+)/gi,
    patch: 'Use parameterized SQL statements and pass user input as query parameters.'
  },
  {
    id: 'LUNAR-HARDCODED-SECRET',
    title: 'Potential hard-coded credential',
    severity: 'warning',
    pattern: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    patch: 'Move the credential to a secret manager or environment variable and rotate it.'
  },
  {
    id: 'LUNAR-INSECURE-RANDOM',
    title: 'Security-sensitive use of Math.random',
    severity: 'warning',
    pattern: /Math\.random\s*\(/g,
    patch: 'Use crypto.randomUUID or crypto.getRandomValues for security-sensitive identifiers.'
  }
];

function inferLanguage(filename) {
  const extension = String(filename || '').split('.').pop().toLowerCase();
  return {
    js: 'JavaScript',
    jsx: 'JavaScript',
    ts: 'TypeScript',
    tsx: 'TypeScript',
    py: 'Python',
    go: 'Go',
    java: 'Java',
    rb: 'Ruby',
    php: 'PHP',
    sql: 'SQL'
  }[extension] || 'Other';
}

function lineNumberAt(code, index) {
  return code.slice(0, index).split('\n').length;
}

function analyzeCode(code) {
  const findings = [];

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(code)) !== null) {
      const lineNumber = lineNumberAt(code, match.index);
      const line = code.split('\n')[lineNumber - 1] || '';
      findings.push({
        cveId: rule.id,
        title: rule.title,
        severity: rule.severity,
        lineNumber,
        codeSnippet: line.slice(0, 500),
        suggestedPatch: rule.patch
      });
      if (match.index === rule.pattern.lastIndex) rule.pattern.lastIndex += 1;
    }
  }

  const penalty = findings.reduce(
    (total, finding) => total + (finding.severity === 'critical' ? 20 : 8),
    0
  );
  return {
    score: Math.max(0, 100 - penalty),
    findings
  };
}

router.post('/run', verifyToken, async (req, res) => {
  const { code, filename = 'app.ts', projectId, projectName, repoUrl } = req.body;
  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'A non-empty code string is required.' });
  }
  if (code.length > 500000) {
    return res.status(413).json({ success: false, error: 'Code payload exceeds the 500KB scan limit.' });
  }

  const pool = getPool();
  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'DATABASE_UNAVAILABLE: Verified scans require PostgreSQL persistence.'
    });
  }

  const analysis = analyzeCode(code);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const quotaResult = await client.query(
      `SELECT tier, daily_scans_used, last_scan_reset_at
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [req.user.id]
    );
    if (quotaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json({ success: false, error: 'Account no longer exists.' });
    }
    const quota = quotaResult.rows[0];
    const resetRequired = new Date(quota.last_scan_reset_at).toDateString() !== new Date().toDateString();
    const scansUsed = resetRequired ? 0 : quota.daily_scans_used;
    if (quota.tier === 'FREE' && scansUsed >= 5) {
      await client.query('ROLLBACK');
      return res.status(429).json({
        success: false,
        quotaExceeded: true,
        remaining: 0,
        error: 'FREE tier daily quota of 5 verified scans has been reached.'
      });
    }

    let project;
    if (projectId) {
      const projectResult = await client.query(
        'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, req.user.id]
      );
      if (projectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Project not found or not owned by this user.' });
      }
      project = projectResult.rows[0];
    } else {
      const createdProject = await client.query(
        `INSERT INTO projects (user_id, name, repo_url, language, security_score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          req.user.id,
          String(projectName || filename).slice(0, 255),
          repoUrl ? String(repoUrl).slice(0, 2000) : null,
          inferLanguage(filename),
          analysis.score
        ]
      );
      project = createdProject.rows[0];
    }

    const scanResult = await client.query(
      `INSERT INTO scans (project_id, user_id, score, issues_count, ai_model_used)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [project.id, req.user.id, analysis.score, analysis.findings.length, 'lunar-backend-rules-v1']
    );
    const scan = scanResult.rows[0];

    for (const finding of analysis.findings) {
      await client.query(
        `INSERT INTO vulnerabilities (
           scan_id, cve_id, title, severity, line_number, code_snippet, suggested_patch
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          scan.id,
          finding.cveId,
          finding.title,
          finding.severity,
          finding.lineNumber,
          finding.codeSnippet,
          finding.suggestedPatch
        ]
      );
    }

    await client.query(
      `UPDATE projects SET security_score = $1 WHERE id = $2`,
      [analysis.score, project.id]
    );
    const usageResult = await client.query(
      `UPDATE users
       SET daily_scans_used = $2,
           last_scan_reset_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE last_scan_reset_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING daily_scans_used`,
      [req.user.id, scansUsed + 1, resetRequired]
    );
    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      source: 'postgresql',
      scan: {
        id: scan.id,
        projectId: project.id,
        filename,
        score: analysis.score,
        issuesCount: analysis.findings.length,
        findings: analysis.findings,
        createdAt: scan.created_at
      },
      remainingQuota: quota.tier === 'FREE'
        ? Math.max(0, 5 - usageResult.rows[0].daily_scans_used)
        : null
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Verified scan failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to persist verified scan.' });
  } finally {
    client.release();
  }
});

/**
 * Public Guest Preview Scan Endpoint (Unauthenticated)
 * Provides high-level security threat score and issue counts without revealing deep line-by-line vulnerabilities or patches.
 */
router.post('/guest-preview', scanQuotaLimiter, (req, res) => {
  const { code, filename = 'app.ts' } = req.body || {};
  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'A non-empty code string is required for scanning.' });
  }
  if (Buffer.byteLength(code, 'utf8') > 100 * 1024) {
    return res.status(413).json({ success: false, error: 'Guest preview scan limit is 100KB. Sign in to scan larger repositories.' });
  }

  const analysis = analyzeCode(code);
  const criticalCount = analysis.findings.filter(f => f.severity === 'critical').length;
  const warningCount = analysis.findings.filter(f => f.severity === 'warning').length;
  const maxCvss = criticalCount > 0 ? 9.2 : warningCount > 0 ? 7.1 : 0;

  return res.json({
    success: true,
    isGuestPreview: true,
    filename: String(filename).slice(0, 255),
    score: analysis.score,
    stats: {
      total: analysis.findings.length,
      maxCvss,
      criticalCount,
      highCount: warningCount,
      mediumCount: 0,
      lowCount: 0
    },
    remainingQuota: req.remainingQuota,
    message: 'Guest Preview Scan Complete. Sign in to unlock full line-by-line annotations & AI Code Repair.'
  });
});

module.exports = router;
