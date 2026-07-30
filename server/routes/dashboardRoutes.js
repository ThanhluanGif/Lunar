const express = require('express');
const { optionalToken, verifyToken } = require('../middleware/auth');
const { getPool } = require('../db/connection');

const router = express.Router();

const ACCESS_PROFILES = {
  GUEST: {
    scope: 'PUBLIC',
    features: ['public_health', 'pricing', 'sign_in'],
    restrictions: ['no_private_projects', 'no_scans', 'no_admin_data']
  },
  FREE: {
    scope: 'OWN_ACCOUNT',
    dailyScanLimit: 5,
    features: ['own_metrics', 'own_projects', 'recent_scans', 'basic_findings']
  },
  PRO: {
    scope: 'OWN_ACCOUNT',
    dailyScanLimit: null,
    features: ['own_metrics', 'own_projects', 'recent_scans', 'full_findings', 'auto_fix', 'report_export']
  },
  ENTERPRISE: {
    scope: 'OWN_ACCOUNT',
    dailyScanLimit: null,
    features: ['own_metrics', 'own_projects', 'recent_scans', 'full_findings', 'auto_fix', 'report_export', 'priority_support']
  },
  ADMIN: {
    scope: 'SYSTEM',
    dailyScanLimit: null,
    features: ['system_metrics', 'user_management', 'payment_management', 'quota_management', 'audit_logs']
  }
};

function databaseRequired(res) {
  const pool = getPool();
  if (!pool) {
    res.status(503).json({
      success: false,
      error: 'DATABASE_UNAVAILABLE: Dashboard data cannot be verified right now.'
    });
    return null;
  }
  return pool;
}

function parseRangeDays(value) {
  const days = Number.parseInt(value, 10);
  return [7, 28, 30, 90].includes(days) ? days : 28;
}

router.get('/access', optionalToken, (req, res) => {
  if (!req.user) {
    return res.json({ success: true, identity: 'GUEST', access: ACCESS_PROFILES.GUEST });
  }

  const identity = req.user.role === 'ADMIN' ? 'ADMIN' : req.user.tier;
  return res.json({
    success: true,
    identity,
    role: req.user.role,
    tier: req.user.tier,
    access: ACCESS_PROFILES[identity]
  });
});

router.get('/overview', verifyToken, async (req, res) => {
  const pool = databaseRequired(res);
  if (!pool) return;

  const days = parseRangeDays(req.query.days);
  const userId = req.user.id;

  try {
    const [summaryResult, repositoriesResult, activityResult, severityResult, recentResult] = await Promise.all([
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM projects WHERE user_id = $1) AS "repositories",
           (SELECT COUNT(*)::int FROM scans WHERE user_id = $1 AND created_at >= NOW() - ($2 * INTERVAL '1 day')) AS "scansInRange",
           (SELECT COALESCE(ROUND(AVG(score)), 0)::int FROM scans WHERE user_id = $1 AND created_at >= NOW() - ($2 * INTERVAL '1 day')) AS "averageScore",
           (SELECT COALESCE(SUM(issues_count), 0)::int FROM scans WHERE user_id = $1 AND created_at >= NOW() - ($2 * INTERVAL '1 day')) AS findings,
           (SELECT COUNT(*)::int
              FROM vulnerabilities v
              JOIN scans s ON s.id = v.scan_id
             WHERE s.user_id = $1 AND v.status = 'open') AS "openFindings",
           (SELECT COUNT(*)::int
              FROM vulnerabilities v
              JOIN scans s ON s.id = v.scan_id
             WHERE s.user_id = $1 AND v.status = 'patched') AS "patchedFindings"`,
        [userId, days]
      ),
      pool.query(
        `SELECT
           p.id,
           p.name,
           p.repo_url AS "repoUrl",
           p.language,
           COALESCE(latest.score, p.security_score) AS "securityScore",
           COALESCE(latest.issues_count, 0) AS "issuesCount",
           latest.created_at AS "lastScannedAt",
           COUNT(s.id)::int AS "scanCount"
         FROM projects p
         LEFT JOIN scans s ON s.project_id = p.id
         LEFT JOIN LATERAL (
           SELECT score, issues_count, created_at
           FROM scans
           WHERE project_id = p.id
           ORDER BY created_at DESC
           LIMIT 1
         ) latest ON TRUE
         WHERE p.user_id = $1
         GROUP BY p.id, latest.score, latest.issues_count, latest.created_at
         ORDER BY latest.created_at DESC NULLS LAST, p.created_at DESC
         LIMIT 50`,
        [userId]
      ),
      pool.query(
        `SELECT
           day::date AS date,
           COUNT(s.id)::int AS reviews,
           COALESCE(SUM(s.issues_count), 0)::int AS findings
         FROM generate_series(
           CURRENT_DATE - (($2 - 1) * INTERVAL '1 day'),
           CURRENT_DATE,
           INTERVAL '1 day'
         ) day
         LEFT JOIN scans s
           ON s.user_id = $1
          AND s.created_at >= day
          AND s.created_at < day + INTERVAL '1 day'
         GROUP BY day
         ORDER BY day`,
        [userId, days]
      ),
      pool.query(
        `SELECT v.severity, COUNT(*)::int AS count
         FROM vulnerabilities v
         JOIN scans s ON s.id = v.scan_id
         WHERE s.user_id = $1
           AND s.created_at >= NOW() - ($2 * INTERVAL '1 day')
         GROUP BY v.severity
         ORDER BY count DESC`,
        [userId, days]
      ),
      pool.query(
        `SELECT
           s.id,
           p.name AS repository,
           s.score,
           s.issues_count AS "issuesCount",
           s.ai_model_used AS "modelUsed",
           s.created_at AS "createdAt"
         FROM scans s
         LEFT JOIN projects p ON p.id = s.project_id
         WHERE s.user_id = $1
         ORDER BY s.created_at DESC
         LIMIT 20`,
        [userId]
      )
    ]);

    return res.json({
      success: true,
      source: 'postgresql',
      generatedAt: new Date().toISOString(),
      rangeDays: days,
      identity: {
        role: req.user.role,
        tier: req.user.tier,
        access: ACCESS_PROFILES[req.user.role === 'ADMIN' ? 'ADMIN' : req.user.tier]
      },
      summary: summaryResult.rows[0],
      repositories: repositoriesResult.rows,
      activity: activityResult.rows,
      findingsBySeverity: severityResult.rows,
      recentScans: recentResult.rows
    });
  } catch (error) {
    req.log?.error('Dashboard overview query failed.', error, 500);
    return res.status(500).json({ success: false, error: 'Unable to load verified dashboard data.' });
  }
});

module.exports = router;
