const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeNumber(value, maximum = 100000) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(maximum, number));
}

function normalizeSummary(scanSummary) {
  const stats = scanSummary?.stats || scanSummary || {};
  return {
    maxCvss: Math.min(10, safeNumber(stats.maxCvss, 10)),
    criticalCount: safeNumber(stats.criticalCount),
    highCount: safeNumber(stats.highCount),
    mediumCount: safeNumber(stats.mediumCount),
    total: safeNumber(stats.total)
  };
}

function asciiPdfText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/([\\()])/g, '\\$1');
}

function safeFilename(value) {
  const base = String(value || 'lunar-security-audit')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'lunar-security-audit'}-audit-report.pdf`;
}

function createAuditReportPdf(projectTitle, scanSummary) {
  const summary = normalizeSummary(scanSummary);
  const risk = summary.criticalCount > 0
    ? 'CRITICAL'
    : summary.highCount > 0
      ? 'HIGH'
      : summary.mediumCount > 0
        ? 'MEDIUM'
        : 'LOW';
  const lines = [
    'LUNAR.DEV SECURITY AUDIT REPORT',
    '',
    `Project: ${asciiPdfText(projectTitle)}`,
    `Generated: ${new Date().toISOString()}`,
    `Risk: ${risk}`,
    `Maximum CVSS: ${summary.maxCvss.toFixed(1)} / 10.0`,
    '',
    `Critical findings: ${summary.criticalCount}`,
    `High findings: ${summary.highCount}`,
    `Medium findings: ${summary.mediumCount}`,
    `Total findings: ${summary.total}`,
    '',
    'Open the authenticated Lunar workspace to review line-level',
    'evidence and AI-assisted patch recommendations.'
  ];
  const textCommands = lines.map((line, index) => (
    index === 0
      ? `(${line}) Tj`
      : `0 -28 Td (${line}) Tj`
  ));
  const stream = [
    'BT',
    '/F1 16 Tf',
    '56 740 Td',
    ...textCommands,
    'ET'
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`
  ];
  const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary')];
  const offsets = [0];
  let byteOffset = chunks[0].length;

  objects.forEach((object, index) => {
    offsets.push(byteOffset);
    const chunk = Buffer.from(`${index + 1} 0 obj\n${object}\nendobj\n`, 'ascii');
    chunks.push(chunk);
    byteOffset += chunk.length;
  });

  const xrefOffset = byteOffset;
  const xref = [
    `xref\n0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    '%%EOF'
  ].join('\n');
  chunks.push(Buffer.from(`${xref}\n`, 'ascii'));
  return Buffer.concat(chunks);
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
  createAuditReportPdf,
  loadOwnedScanSummary,
  normalizeSummary,
  safeFilename
};
