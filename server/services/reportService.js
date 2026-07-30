const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeFilename(value) {
  const base = String(value || 'lunar-security-audit')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'lunar-security-audit'}-audit-report.pdf`;
}

async function loadOwnedScanSummary(pool, scanId, userId) {
  const result = await pool.query(
    `SELECT
       s.id,
       COALESCE(p.name, 'Lunar Security Audit') AS project_name,
       COUNT(v.id)::int AS total,
       COUNT(v.id) FILTER (WHERE v.severity = 'critical')::int AS critical_count,
       COUNT(v.id) FILTER (WHERE v.severity = 'warning')::int AS high_count,
       COUNT(v.id) FILTER (WHERE v.severity = 'info')::int AS medium_count
     FROM scans s
     LEFT JOIN projects p ON p.id = s.project_id
     LEFT JOIN vulnerabilities v ON v.scan_id = s.id
     WHERE s.id = $1 AND s.user_id = $2
     GROUP BY s.id, p.name`,
    [scanId, userId]
  );
  const scan = result.rows[0];
  if (!scan) return null;
  return {
    scanId: scan.id,
    projectTitle: scan.project_name,
    summary: {
      criticalCount: scan.critical_count,
      highCount: scan.high_count,
      mediumCount: scan.medium_count,
      total: scan.total,
      maxCvss: scan.critical_count > 0 ? 9.2 : scan.high_count > 0 ? 7.5 : scan.medium_count > 0 ? 5 : 0
    }
  };
}

module.exports = {
  UUID_PATTERN,
  loadOwnedScanSummary,
  safeFilename
};
