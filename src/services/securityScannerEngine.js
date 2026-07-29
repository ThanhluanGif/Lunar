import { analyzeJavaScriptAst } from './astParser.js';

/**
 * Deterministic multi-language SAST engine.
 * Rules are intentionally conservative and every finding includes direct line evidence.
 * AI triage is a separate server-side step and never changes deterministic evidence.
 */

export const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'go', 'php', 'ruby', 'csharp',
  'rust', 'sql', 'dockerfile', 'yaml', 'json', 'xml', 'html', 'css', 'shell',
  'kotlin', 'swift', 'dart', 'terraform', 'powershell'
];

const ALL = SUPPORTED_LANGUAGES;
const JS = ['javascript', 'typescript'];
const JVM = ['java', 'kotlin'];
const WEB = ['javascript', 'typescript', 'html', 'php'];

const RULES = [
  rule('LUNAR-001', 'CWE-798', 'Hardcoded credential', 'CRITICAL', 9.1, ALL, /\b(password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\b\s*[:=]\s*["'][^"']{8,}["']/i, 'Move secrets to a secret manager or environment variable.'),
  rule('LUNAR-002', 'CWE-89', 'SQL injection through string construction', 'CRITICAL', 9.8, ALL, /\b(select|insert|update|delete)\b.+(\+|`\$\{|%s|format\()/i, 'Use a parameterized query and bind user values separately.'),
  rule('LUNAR-003', 'CWE-79', 'Unsafe HTML injection', 'HIGH', 8.2, WEB, /(innerHTML\s*=|dangerouslySetInnerHTML|document\.write\s*\()/i, 'Render text safely or sanitize trusted HTML with an allowlist.'),
  rule('LUNAR-004', 'CWE-95', 'Dynamic code execution', 'CRITICAL', 9.8, ['javascript', 'typescript', 'python', 'php', 'ruby'], /\b(eval|exec)\s*\(/i, 'Remove dynamic execution or use a strict parser/allowlist.'),
  rule('LUNAR-005', 'CWE-78', 'OS command execution', 'CRITICAL', 9.8, ALL, /(child_process|execSync|Runtime\.getRuntime\(\)\.exec|os\.system|subprocess\.(run|Popen)|shell_exec|Process\.start)/i, 'Avoid shell execution; pass fixed arguments to a safe process API.'),
  rule('LUNAR-006', 'CWE-22', 'Potential path traversal', 'HIGH', 7.5, ALL, /(\.\.[/\\]|path\.join\([^)]*(req\.|request\.|params|query)|sendFile\([^)]*(req\.|request\.))/i, 'Resolve against an allowlisted base directory and reject escapes.'),
  rule('LUNAR-007', 'CWE-918', 'Server-side request forgery sink', 'HIGH', 8.2, ALL, /(fetch|axios\.(get|post)|requests\.(get|post)|http\.Get|HttpClient)\s*\([^)]*(req\.|request\.|params|query|input)/i, 'Allowlist destinations and block private/link-local address ranges.'),
  rule('LUNAR-008', 'CWE-502', 'Unsafe deserialization', 'CRITICAL', 9.8, ALL, /(pickle\.loads|yaml\.load\(|ObjectInputStream|BinaryFormatter|Marshal\.load|unserialize\()/i, 'Use a safe data format and never deserialize untrusted objects.'),
  rule('LUNAR-009', 'CWE-327', 'Weak cryptographic algorithm', 'MEDIUM', 5.9, ALL, /\b(md5|sha1|des|rc4)\b/i, 'Use SHA-256+ for integrity and an authenticated modern cipher for encryption.'),
  rule('LUNAR-010', 'CWE-326', 'Weak RSA key size', 'HIGH', 7.4, ALL, /(rsa|generateKeyPair).{0,80}\b(512|768|1024)\b/i, 'Use RSA 2048 bits or stronger, or a modern elliptic curve.'),
  rule('LUNAR-011', 'CWE-295', 'TLS certificate verification disabled', 'CRITICAL', 9.1, ALL, /(rejectUnauthorized\s*:\s*false|verify\s*=\s*False|InsecureSkipVerify\s*:\s*true|TrustAllCerts|CURLOPT_SSL_VERIFYPEER\s*,\s*false)/i, 'Keep certificate and hostname validation enabled.'),
  rule('LUNAR-012', 'CWE-614', 'Cookie missing secure attributes', 'MEDIUM', 5.4, JS, /res\.cookie\s*\([^)]*\)(?![^;]*(httpOnly|secure|sameSite))/i, 'Set HttpOnly, Secure, and an appropriate SameSite policy.'),
  rule('LUNAR-013', 'CWE-352', 'State-changing route without visible CSRF control', 'MEDIUM', 6.5, JS, /app\.(post|put|patch|delete)\s*\(/i, 'For cookie-authenticated routes, validate Origin/CSRF tokens.'),
  rule('LUNAR-014', 'CWE-601', 'Unvalidated redirect', 'MEDIUM', 6.1, ALL, /(redirect|location\.href|Response\.Redirect)\s*\([^)]*(req\.|request\.|query|params|input)/i, 'Allowlist local redirect targets.'),
  rule('LUNAR-015', 'CWE-200', 'Sensitive debug output', 'LOW', 3.7, ALL, /(console\.log|print|logger\.(debug|info)).*(password|secret|token|authorization)/i, 'Never log credentials, tokens, or authorization headers.'),
  rule('LUNAR-016', 'CWE-117', 'Log injection risk', 'MEDIUM', 5.3, ALL, /(console\.log|logger\.(info|warn|error)|print)\s*\([^)]*(req\.|request\.|input|params)/i, 'Normalize CR/LF and use structured logging fields.'),
  rule('LUNAR-017', 'CWE-20', 'Permissive CORS origin', 'HIGH', 7.5, WEB, /(Access-Control-Allow-Origin.{0,20}\*|cors\s*\(\s*\{\s*origin\s*:\s*['"]\*['"])/i, 'Allowlist trusted origins and do not combine wildcard origins with credentials.'),
  rule('LUNAR-018', 'CWE-862', 'Route appears to lack authorization middleware', 'HIGH', 8.1, JS, /router\.(post|put|patch|delete)\s*\(\s*['"][^'"]+['"]\s*,\s*async/i, 'Enforce authentication and object-level authorization before the handler.'),
  rule('LUNAR-019', 'CWE-639', 'Potential IDOR identifier use', 'HIGH', 8.1, ALL, /(findById|WHERE\s+id\s*=|\/users\/:id).*(params\.id|req\.params|request\.)/i, 'Scope object lookup to the authenticated owner or privileged role.'),
  rule('LUNAR-020', 'CWE-400', 'Unbounded collection or payload processing', 'MEDIUM', 5.3, ALL, /(readFileSync|read_to_end|ReadAllBytes|request\.body|req\.body).*(map|forEach|for\s*\()/i, 'Set payload, file-size, item-count, concurrency, and timeout limits.'),
  rule('LUNAR-021', 'CWE-770', 'Unbounded pagination', 'MEDIUM', 5.3, ALL, /(limit|per_page|pageSize)\s*[:=]\s*(req\.|request\.|query|params)/i, 'Clamp pagination to a server-defined maximum.'),
  rule('LUNAR-022', 'CWE-1321', 'Prototype pollution sink', 'HIGH', 8.1, JS, /(Object\.assign|merge|defaultsDeep|set)\s*\([^)]*(req\.body|request\.body|input)/i, 'Reject prototype keys and merge only an explicit property allowlist.'),
  rule('LUNAR-023', 'CWE-94', 'Template/code injection sink', 'CRITICAL', 9.8, ALL, /(new Function|compile\(|render_template_string|Template\().*(req\.|request\.|input|params)/i, 'Use static templates and pass untrusted values only as data.'),
  rule('LUNAR-024', 'CWE-611', 'XML external entity risk', 'HIGH', 8.2, ['java', 'kotlin', 'csharp', 'python', 'php', 'ruby', 'xml'], /(DocumentBuilderFactory|SAXParserFactory|XMLInputFactory|lxml|simplexml_load_string)/i, 'Disable DTDs and external entity resolution in the parser.'),
  rule('LUNAR-025', 'CWE-434', 'Unrestricted file upload', 'HIGH', 8.1, ALL, /(multer|move_uploaded_file|MultipartFile|IFormFile|save\().*(originalname|filename|upload)/i, 'Validate content, extension, size and store outside the web root.'),
  rule('LUNAR-026', 'CWE-312', 'Sensitive data stored in browser storage', 'HIGH', 7.5, JS, /(localStorage|sessionStorage)\.setItem\s*\([^)]*(token|secret|password|auth)/i, 'Use a Secure HttpOnly cookie for session credentials.'),
  rule('LUNAR-027', 'CWE-330', 'Security-sensitive weak randomness', 'HIGH', 7.5, ALL, /(Math\.random|random\.random|rand\(\)|java\.util\.Random).*(token|secret|password|nonce|session)/i, 'Use a cryptographically secure random generator.'),
  rule('LUNAR-028', 'CWE-347', 'JWT decoded without signature verification', 'CRITICAL', 9.1, ALL, /(jwt\.decode|parseJwt|DecodeJwtToken)\s*\(/i, 'Verify signature, issuer, audience, expiry and algorithm.'),
  rule('LUNAR-029', 'CWE-347', 'JWT algorithm confusion risk', 'HIGH', 8.1, ALL, /(algorithms?\s*:\s*\[[^\]]*(none|\*)|verify_signature\s*:\s*false)/i, 'Pin the expected asymmetric or symmetric algorithm.'),
  rule('LUNAR-030', 'CWE-521', 'Weak password policy', 'MEDIUM', 5.3, ALL, /(password\.length|len\(password\)).{0,20}[<]=?\s*[1-7]\b/i, 'Require at least 8 characters and support breached-password checks.'),
  rule('LUNAR-031', 'CWE-307', 'Authentication route without visible throttling', 'MEDIUM', 6.5, JS, /router\.post\s*\(\s*['"]\/(login|signin|register)['"]\s*,\s*async/i, 'Apply per-IP and per-account throttling.'),
  rule('LUNAR-032', 'CWE-16', 'Container runs as root', 'MEDIUM', 6.3, ['dockerfile'], /^FROM\s+.+$(?![\s\S]*^USER\s+\w+)/im, 'Create and switch to a non-root runtime user.'),
  rule('LUNAR-033', 'CWE-829', 'Unpinned container image', 'MEDIUM', 5.8, ['dockerfile', 'yaml'], /(FROM\s+\S+:latest|image:\s*\S+:latest)/i, 'Pin an immutable image digest or reviewed version.'),
  rule('LUNAR-034', 'CWE-798', 'Secret-like value in deployment manifest', 'CRITICAL', 9.1, ['yaml', 'json', 'terraform'], /(password|secret|token|apiKey)\s*[:=]\s*["']?[A-Za-z0-9_\-\/+=]{12,}/i, 'Reference a secret manager, never commit the secret value.'),
  rule('LUNAR-035', 'CWE-732', 'Overly permissive filesystem mode', 'HIGH', 7.5, ['shell', 'dockerfile', 'powershell'], /(chmod\s+777|chmod\s+-R\s+777|FullControl.*Everyone)/i, 'Grant the minimum required permissions.'),
  rule('LUNAR-036', 'CWE-250', 'Privileged container configuration', 'CRITICAL', 9.1, ['yaml', 'dockerfile'], /(privileged:\s*true|--privileged|cap_add:\s*\n\s*-\s*ALL)/i, 'Remove privileged mode and grant only required capabilities.'),
  rule('LUNAR-037', 'CWE-942', 'Public cloud resource policy', 'CRITICAL', 9.1, ['terraform', 'json', 'yaml'], /(0\.0\.0\.0\/0|Principal\s*[:=]\s*["']\*["']).*(22|3389|Action)/i, 'Restrict network and IAM principals to required identities.'),
  rule('LUNAR-038', 'CWE-494', 'Remote script execution', 'CRITICAL', 9.1, ['shell', 'dockerfile', 'powershell'], /(curl|wget).{0,120}\|\s*(sh|bash|zsh|powershell)/i, 'Download, verify checksum/signature, then execute a pinned artifact.'),
  rule('LUNAR-039', 'CWE-377', 'Insecure temporary file', 'MEDIUM', 5.5, ALL, /(\/tmp\/[A-Za-z0-9_.-]+|tempfile\s*=\s*["'])/i, 'Use a secure random temporary-file API with exclusive creation.'),
  rule('LUNAR-040', 'CWE-1333', 'Potential regular expression denial of service', 'MEDIUM', 5.3, ALL, /(\([^)]*[+*][^)]*\))[+*]|\.\*\.\*/i, 'Use a linear-time expression and cap input length.')
];

// More than 100 language-rule signatures are active while keeping one canonical rule ID.
export const SECURITY_RULE_SIGNATURE_COUNT = RULES.reduce((count, item) => count + item.languages.length, 0);

function rule(id, cwe, title, severity, cvss, languages, pattern, recommendation) {
  return { id, cwe, title, severity, cvss, languages, pattern, recommendation };
}

export function languageFromPath(filePath = '') {
  const name = String(filePath).toLowerCase();
  if (name.endsWith('dockerfile') || name.includes('/dockerfile')) return 'dockerfile';
  const extension = name.split('.').pop();
  return ({
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript', py: 'python', java: 'java', go: 'go',
    php: 'php', rb: 'ruby', cs: 'csharp', rs: 'rust', sql: 'sql',
    yml: 'yaml', yaml: 'yaml', json: 'json', xml: 'xml', html: 'html',
    htm: 'html', css: 'css', sh: 'shell', bash: 'shell', kt: 'kotlin',
    kts: 'kotlin', swift: 'swift', dart: 'dart', tf: 'terraform',
    tfvars: 'terraform', ps1: 'powershell'
  })[extension] || 'plaintext';
}

function safeLine(line) {
  const value = String(line || '').trim();
  return value.length > 240 ? `${value.slice(0, 240)}…` : value;
}

export function scanCodeForSecurityVulnerabilities(fileContent, filePath = 'server/index.js', language) {
  const code = String(fileContent || '');
  const detectedLanguage = language && language !== 'plaintext' ? language.toLowerCase() : languageFromPath(filePath);
  const lines = code.split(/\r?\n/);
  const vulnerabilities = [];

  for (const currentRule of RULES) {
    if (!currentRule.languages.includes(detectedLanguage)) continue;
    lines.forEach((lineText, index) => {
      const trimmed = lineText.trim();
      if (!trimmed || /^(\/\/|\/\*|\*|#\s)/.test(trimmed)) return;
      const pattern = new RegExp(currentRule.pattern.source, currentRule.pattern.flags.replace('g', ''));
      if (!pattern.test(lineText)) return;
      vulnerabilities.push({
        id: `${currentRule.id}-${index + 1}`,
        ruleId: currentRule.id,
        line: index + 1,
        filePath,
        language: detectedLanguage,
        cwe: currentRule.cwe,
        category: currentRule.cwe,
        title: currentRule.title,
        severity: currentRule.severity,
        cvss: currentRule.cvss,
        aiVerdict: 'Requires review',
        aiConfidence: null,
        aiReason: 'Deterministic pattern match with direct source evidence.',
        description: currentRule.title,
        impact: `Potential ${currentRule.cwe} weakness.`,
        originalCode: safeLine(lineText),
        patchedCode: '',
        recommendation: currentRule.recommendation
      });
    });
  }

  if (JS.includes(detectedLanguage)) {
    const astResult = analyzeJavaScriptAst(code, filePath);
    vulnerabilities.push(...astResult.findings.map((item) => ({
      ...item,
      id: `${item.ruleId}-${item.line}`,
      filePath,
      language: detectedLanguage,
      category: item.cwe,
      description: item.title,
      impact: `Potential ${item.cwe} weakness.`
    })));
  }

  const unique = Array.from(new Map(
    vulnerabilities.map((finding) => [`${finding.ruleId}:${finding.line}`, finding])
  ).values());
  const maxCvss = unique.reduce((max, finding) => Math.max(max, finding.cvss), 0);

  return {
    filePath,
    language: detectedLanguage,
    supported: SUPPORTED_LANGUAGES.includes(detectedLanguage),
    ruleSignatures: SECURITY_RULE_SIGNATURE_COUNT,
    vulnerabilities: unique,
    stats: {
      total: unique.length,
      maxCvss,
      criticalCount: unique.filter((item) => item.severity === 'CRITICAL').length,
      highCount: unique.filter((item) => item.severity === 'HIGH').length,
      mediumCount: unique.filter((item) => item.severity === 'MEDIUM').length,
      lowCount: unique.filter((item) => item.severity === 'LOW').length
    }
  };
}
