import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import {
  buildFindingRemediationDetails,
  buildPortableRemediationReport
} from '../src/services/remediationReport.js';

const require = createRequire(import.meta.url);
const {
  createAuditReportMarkdown,
  createAuditReportPdf,
  normalizePortableReport,
  safeFilename
} = require('../server/services/reportService.js');

const finding = buildFindingRemediationDetails({
  id: 'LUNAR-001-12',
  ruleId: 'LUNAR-001',
  cwe: 'CWE-798',
  title: 'Hardcoded credential',
  severity: 'CRITICAL',
  cvss: 9.1,
  filePath: 'server/config.js',
  line: 12,
  evidence: { matchedSource: 'const password = "qa-super-secret";' },
  triageStatus: 'TRUE_POSITIVE',
  aiReason: 'The credential is embedded in executable configuration.',
  remediation: {
    defenseStrategy: 'Move the value to a required runtime secret and rotate it.',
    stepByStepGuide: ['Remove the literal.', 'Load the value from a secret manager.'],
    validationSteps: ['Start without the secret and confirm fail-closed behavior.']
  }
});

assert.equal(finding.rootCause.includes('Credential') || finding.rootCause.includes('credential'), true);
assert.equal(finding.whyThisIsValid.includes('embedded'), true);
assert.equal(finding.remediationSteps.length, 2);
assert.equal(finding.validationSteps.length, 1);
assert.equal(finding.patchAvailable, false);

const clientPayload = buildPortableRemediationReport({
  project: { title: 'QA Project', githubUrl: 'https://example.test/qa/project' },
  scanResult: {
    stats: { total: 1, criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0, maxCvss: 9.1 },
    vulnerabilities: [finding]
  }
});
assert.equal(clientPayload.findings.length, 1);
assert.equal(clientPayload.findings[0].validationSteps.length, 1);

const report = normalizePortableReport(clientPayload);
const reportSummary = {
  ...report.summary,
  metadata: report.metadata,
  findings: report.findings
};
const markdown = createAuditReportMarkdown(report.projectTitle, reportSummary).toString('utf8');
const pdf = createAuditReportPdf(report.projectTitle, reportSummary);
const pdfText = pdf.toString('latin1');

if (process.env.WRITE_REMEDIATION_SAMPLE === '1') {
  fs.mkdirSync('output/pdf', { recursive: true });
  fs.writeFileSync('output/pdf/lunar-security-remediation-sample.pdf', pdf);
}

for (const section of [
  'Handoff Instructions For Developers And AI Agents',
  'Root Cause',
  'Recommended Fix Strategy',
  'Implementation Steps',
  'Validation Checklist'
]) {
  assert.equal(markdown.includes(section), true, `Markdown report is missing ${section}.`);
}
assert.equal(markdown.includes('qa-super-secret'), false);
assert.equal(markdown.includes('[REDACTED]'), true);
assert.equal(pdfText.startsWith('%PDF-1.4'), true);
assert.equal(pdfText.includes('Root cause:'), true);
assert.equal(pdfText.includes('Validation checklist:'), true);
assert.equal(pdfText.includes('qa-super-secret'), false);
assert.equal(safeFilename('QA Project', 'md').endsWith('.md'), true);

const modalSource = fs.readFileSync('src/components/AuditReportExportModal.jsx', 'utf8');
const patcherSource = fs.readFileSync('src/components/VulnerabilityPatcher.jsx', 'utf8');
const routeSource = fs.readFileSync('server/routes/reportRoutes.js', 'utf8');
const aiRouteSource = fs.readFileSync('server/routes/aiRoutes.js', 'utf8');
assert.match(modalSource, /downloadPortableRemediationReport/);
assert.match(modalSource, /Tải AI Fix Handoff \(README\.md\)/);
assert.match(patcherSource, /Finding \{activeIndex \+ 1\}\/\{enrichedVulnerabilities\.length\}/);
assert.match(patcherSource, /Definition of done \/ checklist rescan/);
assert.match(routeSource, /router\.post\('\/export\/portable\/:format', verifyToken, reportRateLimiter/);
assert.match(routeSource, /text\/markdown; charset=utf-8/);
assert.match(aiRouteSource, /whyThisIsValid/);
assert.match(aiRouteSource, /validationSteps/);

console.log(JSON.stringify({
  detailedFindingContract: 'PASS',
  developerAndAiMarkdownHandoff: 'PASS',
  professionalPdfContent: 'PASS',
  reportSecretRedaction: 'PASS',
  authenticatedPortableExportWiring: 'PASS',
  slideNavigationAndValidationChecklist: 'PASS'
}, null, 2));
