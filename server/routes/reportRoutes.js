const express = require('express');
const router = express.Router();

/**
 * POST /api/v1/reports/export
 * Generates structured Executive Security Audit Report JSON / HTML format
 */
router.post('/export', (req, res) => {
  const { projectName, cvssScore, vulnerabilities, author } = req.body;

  const reportData = {
    reportId: `LUNAR-AUDIT-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    organization: 'Lunar.dev AI Security Workbench',
    project: {
      name: projectName || 'Lunar Security Audit Target',
      author: author || 'Lead Security Engineer',
      cvssScore: cvssScore || 9.2,
      riskLevel: cvssScore >= 9.0 ? 'CRITICAL' : cvssScore >= 7.0 ? 'HIGH' : 'MEDIUM'
    },
    executiveSummary: 'AI SAST Scanner executed comprehensive vulnerability assessment based on OWASP Top 10 (2025) and CWE standards.',
    vulnerabilities: vulnerabilities || [
      { cve: 'CWE-798', severity: 'CRITICAL', title: 'Hardcoded Secret', line: 12 },
      { cve: 'CWE-89', severity: 'HIGH', title: 'SQL Injection via String Concat', line: 45 }
    ],
    downloadUrl: `/reports/export/pdf/LUNAR-AUDIT-${Date.now()}.pdf`
  };

  res.json({
    success: true,
    report: reportData
  });
});

module.exports = router;
