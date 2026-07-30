const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getPool } = require('../db/connection');

const router = express.Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'info']);

function requireDatabase(res) {
  const pool = getPool();
  if (!pool) {
    res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
    return null;
  }
  return pool;
}

router.get('/audits', async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const result = await pool.query(
      `SELECT ca.id,
              ca.author_nickname AS author,
              u.name AS "authorName",
              gc.avatar_url AS avatar,
              ca.title,
              ca.target_repo AS "targetRepo",
              ca.vulnerability_type AS "vulnerabilityType",
              UPPER(ca.severity) AS "severityFlag",
              ca.content AS comment,
              ca.upvotes AS likes,
              COUNT(ac.id)::int AS "commentCount",
              ca.created_at AS "createdAt"
       FROM community_audits ca
       JOIN users u ON u.id = ca.user_id
       LEFT JOIN github_connections gc ON gc.user_id = u.id
       LEFT JOIN audit_comments ac ON ac.audit_id = ca.id
       GROUP BY ca.id, u.id, gc.avatar_url
       ORDER BY ca.created_at DESC
       LIMIT 100`
    );
    return res.json({ success: true, audits: result.rows });
  } catch (error) {
    console.error('Community audits query failed:', error);
    return res.status(500).json({ success: false, error: 'Không thể tải bài viết cộng đồng.' });
  }
});

router.post('/audits', verifyToken, async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  const title = String(req.body?.title || '').trim();
  const targetRepo = String(req.body?.targetRepo || '').trim();
  const vulnerabilityType = String(req.body?.vulnerabilityType || '').trim();
  const content = String(req.body?.content || '').trim();
  const requestedSeverity = String(req.body?.severity || 'critical').toLowerCase();
  const severity = ALLOWED_SEVERITIES.has(requestedSeverity) ? requestedSeverity : 'critical';

  if (title.length < 5 || title.length > 255 || content.length < 20 || content.length > 10000) {
    return res.status(400).json({
      success: false,
      error: 'Tiêu đề phải có 5-255 ký tự và nội dung phải có 20-10.000 ký tự.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO community_audits (
         user_id, author_nickname, title, target_repo,
         vulnerability_type, severity, content, upvotes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
       RETURNING id,
                 author_nickname AS author,
                 title,
                 target_repo AS "targetRepo",
                 vulnerability_type AS "vulnerabilityType",
                 UPPER(severity) AS "severityFlag",
                 content AS comment,
                 upvotes AS likes,
                 created_at AS "createdAt"`,
      [
        req.user.id,
        req.user.nickname || '@whitehat',
        title,
        targetRepo.slice(0, 255) || null,
        vulnerabilityType.slice(0, 100) || null,
        severity,
        content
      ]
    );
    await client.query(
      `UPDATE users
       SET karma_points = karma_points + 50, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.user.id]
    );
    await client.query(
      `INSERT INTO karma_transactions (user_id, points, reason)
       VALUES ($1, 50, $2)`,
      [req.user.id, `Community security audit: ${title}`.slice(0, 255)]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      audit: { ...inserted.rows[0], commentCount: 0 },
      karmaGranted: 50
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Community audit creation failed:', error);
    return res.status(500).json({ success: false, error: 'Không thể đăng bài cộng đồng.' });
  } finally {
    client.release();
  }
});

router.post('/audits/:id/upvote', verifyToken, async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  const auditId = String(req.params.id);
  if (!UUID_PATTERN.test(auditId)) {
    return res.status(400).json({ success: false, error: 'Audit ID không hợp lệ.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO community_audit_upvotes (audit_id, user_id)
       SELECT $1, $2
       WHERE EXISTS (SELECT 1 FROM community_audits WHERE id = $1)
       ON CONFLICT DO NOTHING
       RETURNING audit_id`,
      [auditId, req.user.id]
    );
    if (!inserted.rows[0]) {
      const exists = await client.query('SELECT upvotes FROM community_audits WHERE id = $1', [auditId]);
      await client.query('COMMIT');
      if (!exists.rows[0]) {
        return res.status(404).json({ success: false, error: 'Bài viết không tồn tại.' });
      }
      return res.json({
        success: true,
        alreadyUpvoted: true,
        upvotes: exists.rows[0].upvotes
      });
    }
    const updated = await client.query(
      `UPDATE community_audits
       SET upvotes = upvotes + 1
       WHERE id = $1
       RETURNING upvotes`,
      [auditId]
    );
    await client.query('COMMIT');
    return res.json({ success: true, alreadyUpvoted: false, upvotes: updated.rows[0].upvotes });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Community upvote failed:', error);
    return res.status(500).json({ success: false, error: 'Không thể upvote bài viết.' });
  } finally {
    client.release();
  }
});

router.get('/leaderboard', async (req, res) => {
  const pool = requireDatabase(res);
  if (!pool) return;
  try {
    const [users, projects] = await Promise.all([
      pool.query(
        `SELECT u.id,
                u.name,
                u.nickname AS handle,
                u.karma_points AS karma,
                u.tier,
                gc.avatar_url AS avatar,
                COUNT(DISTINCT ca.id)::int AS "auditCount",
                COUNT(DISTINCT s.id)::int AS "scanCount"
         FROM users u
         LEFT JOIN github_connections gc ON gc.user_id = u.id
         LEFT JOIN community_audits ca ON ca.user_id = u.id
         LEFT JOIN scans s ON s.user_id = u.id
         WHERE u.status = 'ACTIVE'
         GROUP BY u.id, gc.avatar_url
         ORDER BY u.karma_points DESC, COUNT(DISTINCT ca.id) DESC, u.created_at ASC
         LIMIT 20`
      ),
      pool.query(
        `SELECT p.id,
                p.name AS title,
                p.language,
                p.repo_url AS "githubUrl",
                p.security_score AS "overallScore",
                u.name AS "authorName",
                u.nickname AS "authorHandle",
                gc.avatar_url AS "authorAvatar",
                COUNT(DISTINCT s.id)::int AS "scanCount",
                COUNT(DISTINCT ca.id)::int AS "communityReviews"
         FROM projects p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN github_connections gc ON gc.user_id = u.id
         LEFT JOIN scans s ON s.project_id = p.id
         LEFT JOIN community_audits ca ON ca.target_repo = p.name
         WHERE u.status = 'ACTIVE'
         GROUP BY p.id, u.id, gc.avatar_url
         ORDER BY p.security_score DESC, COUNT(DISTINCT s.id) DESC, p.created_at ASC
         LIMIT 50`
      )
    ]);
    return res.json({
      success: true,
      leaders: users.rows,
      projects: projects.rows
    });
  } catch (error) {
    console.error('Community leaderboard query failed:', error);
    return res.status(500).json({ success: false, error: 'Không thể tải bảng xếp hạng.' });
  }
});

module.exports = router;
