const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { reportRateLimiter } = require('../middleware/rateLimiter');
const { getPool } = require('../db/connection');
const {
  UUID_PATTERN,
  createAuditReportCsv,
  createAuditReportMarkdown,
  createAuditReportPdf,
  loadOwnedScanSummary,
  normalizePortableReport,
  safeFilename
} = require('../services/reportService');

const router = express.Router();

router.post('/export', verifyToken, reportRateLimiter, async (req, res) => {
  const scanId = String(req.body?.scanId || '').trim();
  if (!UUID_PATTERN.test(scanId)) {
    return res.status(400).json({ success: false, error: 'A valid scanId is required.' });
  }
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const report = await loadOwnedScanSummary(pool, scanId, req.user.id);
  if (!report) return res.status(404).json({ success: false, error: 'Scan not found.' });
  return res.json({
    success: true,
    report: {
      scanId: report.scanId,
      projectName: report.projectTitle,
      downloadUrl: `/api/v1/reports/export/pdf/${encodeURIComponent(report.scanId)}`,
      csvDownloadUrl: `/api/v1/reports/export/csv/${encodeURIComponent(report.scanId)}`,
      markdownDownloadUrl: `/api/v1/reports/export/markdown/${encodeURIComponent(report.scanId)}`
    }
  });
});

router.get('/export/pdf/:scanId', verifyToken, reportRateLimiter, async (req, res) => {
  const scanId = String(req.params.scanId || '').trim();
  if (!UUID_PATTERN.test(scanId)) {
    return res.status(400).json({ success: false, error: 'A valid scanId is required.' });
  }
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const report = await loadOwnedScanSummary(pool, scanId, req.user.id);
  if (!report) return res.status(404).json({ success: false, error: 'Scan not found.' });
  const pdf = createAuditReportPdf(report.projectTitle, {
    ...report.summary,
    metadata: report.metadata,
    findings: report.findings
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(report.projectTitle)}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.send(pdf);
});

router.get('/export/markdown/:scanId', verifyToken, reportRateLimiter, async (req, res) => {
  const scanId = String(req.params.scanId || '').trim();
  if (!UUID_PATTERN.test(scanId)) {
    return res.status(400).json({ success: false, error: 'A valid scanId is required.' });
  }
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const report = await loadOwnedScanSummary(pool, scanId, req.user.id);
  if (!report) return res.status(404).json({ success: false, error: 'Scan not found.' });
  const markdown = createAuditReportMarkdown(report.projectTitle, {
    ...report.summary,
    metadata: report.metadata,
    findings: report.findings
  });
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(report.projectTitle, 'md')}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.send(markdown);
});

router.post('/export/portable/:format', verifyToken, reportRateLimiter, (req, res) => {
  const format = String(req.params.format || '').trim().toLowerCase();
  if (!['pdf', 'markdown'].includes(format)) {
    return res.status(400).json({ success: false, error: 'Portable report format must be pdf or markdown.' });
  }
  let report;
  try {
    report = normalizePortableReport(req.body);
  } catch (error) {
    return res.status(error.status || 400).json({
      success: false,
      error: error.status === 413 ? error.message : 'Portable report payload is invalid.'
    });
  }
  const summary = {
    ...report.summary,
    metadata: report.metadata,
    findings: report.findings
  };
  const isMarkdown = format === 'markdown';
  const artifact = isMarkdown
    ? createAuditReportMarkdown(report.projectTitle, summary)
    : createAuditReportPdf(report.projectTitle, summary);
  res.setHeader('Content-Type', isMarkdown ? 'text/markdown; charset=utf-8' : 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeFilename(report.projectTitle, isMarkdown ? 'md' : 'pdf')}"`
  );
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  req.log?.info('Portable remediation report exported.', {
    format,
    findings: report.findings.length
  });
  return res.send(artifact);
});

router.get('/export/csv/:scanId', verifyToken, reportRateLimiter, async (req, res) => {
  const scanId = String(req.params.scanId || '').trim();
  if (!UUID_PATTERN.test(scanId)) {
    return res.status(400).json({ success: false, error: 'A valid scanId is required.' });
  }
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const report = await loadOwnedScanSummary(pool, scanId, req.user.id);
  if (!report) return res.status(404).json({ success: false, error: 'Scan not found.' });

  const csv = createAuditReportCsv(report.projectTitle, {
    ...report.summary,
    metadata: report.metadata,
    findings: report.findings
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(report.projectTitle, 'csv')}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  req.log?.info('CSV audit report exported.', { scanId });
  return res.send(csv);
});

module.exports = router;
