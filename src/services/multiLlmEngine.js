import { lunarApi } from './lunarApi';
import { scanCodeForSecurityVulnerabilities } from './securityScannerEngine';
import { unavailableAutoPatch } from './autoPatchPolicy';

export const AI_PROVIDERS = [
  { id: 'gemini', name: 'Gemini', badge: 'Configured on server' },
  { id: 'openai', name: 'OpenAI', badge: 'Optional server provider' },
  { id: 'anthropic', name: 'Anthropic', badge: 'Optional server provider' },
  { id: 'lunar-sast-native', name: 'Lunar Native SAST', badge: 'Offline deterministic' }
];

export async function runMultiLlmAudit({
  code,
  filename,
  language = 'plaintext',
  provider = 'gemini',
  customPolicies = []
}) {
  if (provider === 'lunar-sast-native') {
    const scan = scanCodeForSecurityVulnerabilities(code, filename, language);
    return {
      providerUsed: AI_PROVIDERS.find((item) => item.id === provider),
      latencyMs: 0,
      scannedFilename: filename,
      securityScore: Math.max(0, 100 - scan.stats.criticalCount * 20 - scan.stats.highCount * 10),
      maxCvss: scan.stats.maxCvss,
      vulnerabilities: scan.vulnerabilities,
      summary: `Deterministic SAST found ${scan.stats.total} findings.`
    };
  }

  const response = await lunarApi.reviewCodeWithAi({
    code,
    filename,
    language,
    provider,
    operation: 'security-audit',
    customPolicies
  });
  const findings = response.review.findings || [];
  return {
    providerUsed: {
      id: response.provider,
      name: response.provider,
      model: response.model
    },
    latencyMs: response.latencyMs,
    scannedFilename: filename,
    securityScore: response.review.scores?.security ?? 0,
    maxCvss: findings.reduce((max, item) => Math.max(max, item.cvss || 0), 0),
    vulnerabilities: findings.map((finding, index) => {
      const unavailable = unavailableAutoPatch(
        'Đề xuất từ AI chưa qua kiểm tra conflict, validation và rescan.'
      );
      return {
        id: `ai-${index}-${finding.line}`,
        cwe: finding.cwe,
        title: finding.title,
        severity: String(finding.severity || 'info').toUpperCase(),
        line: finding.line,
        originalCode: '',
        patchedCode: null,
        aiReason: finding.explanation,
        rootCause: finding.rootCause,
        whyThisIsValid: finding.whyThisIsValid,
        hackerAttackVector: finding.hackerAttackVector,
        ...unavailable,
        remediation: {
          ...(finding.remediation || {}),
          ...unavailable,
          patchCode: null
        }
      };
    }),
    summary: response.review.summary
  };
}
