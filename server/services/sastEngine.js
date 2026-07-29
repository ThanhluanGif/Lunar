const path = require('path');
const { parse } = require('@babel/parser');

const EXTENSIONS = new Map(Object.entries({
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript', '.py': 'python', '.java': 'java',
  '.go': 'go', '.php': 'php', '.rb': 'ruby', '.cs': 'csharp', '.rs': 'rust',
  '.sql': 'sql', '.yml': 'yaml', '.yaml': 'yaml', '.json': 'json', '.xml': 'xml',
  '.html': 'html', '.htm': 'html', '.css': 'css', '.sh': 'shell', '.bash': 'shell',
  '.kt': 'kotlin', '.kts': 'kotlin', '.swift': 'swift', '.dart': 'dart',
  '.tf': 'terraform', '.tfvars': 'terraform', '.ps1': 'powershell'
}));

const RULES = [
  ['LUNAR-001', 'CWE-798', 'Hardcoded credential', 'critical', /\b(password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\b\s*[:=]\s*["'][^"']{8,}["']/i],
  ['LUNAR-002', 'CWE-89', 'SQL injection through string construction', 'critical', /\b(select|insert|update|delete)\b.+(\+|`\$\{|%s|format\()/i],
  ['LUNAR-003', 'CWE-79', 'Unsafe HTML injection', 'high', /(innerHTML\s*=|dangerouslySetInnerHTML|document\.write\s*\()/i],
  ['LUNAR-004', 'CWE-95', 'Dynamic code execution', 'critical', /\b(eval|exec)\s*\(/i],
  ['LUNAR-005', 'CWE-78', 'OS command execution', 'critical', /(child_process|execSync|Runtime\.getRuntime\(\)\.exec|os\.system|subprocess\.(run|Popen)|shell_exec)/i],
  ['LUNAR-006', 'CWE-22', 'Potential path traversal', 'high', /(\.\.[/\\]|path\.join\([^)]*(req\.|request\.|params|query))/i],
  ['LUNAR-007', 'CWE-918', 'Potential SSRF sink', 'high', /(fetch|axios\.(get|post)|requests\.(get|post)|http\.Get)\s*\([^)]*(req\.|request\.|params|query|input)/i],
  ['LUNAR-008', 'CWE-502', 'Unsafe deserialization', 'critical', /(pickle\.loads|yaml\.load\(|ObjectInputStream|BinaryFormatter|Marshal\.load|unserialize\()/i],
  ['LUNAR-009', 'CWE-327', 'Weak cryptographic algorithm', 'medium', /\b(md5|sha1|des|rc4)\b/i],
  ['LUNAR-010', 'CWE-295', 'TLS verification disabled', 'critical', /(rejectUnauthorized\s*:\s*false|verify\s*=\s*False|InsecureSkipVerify\s*:\s*true)/i],
  ['LUNAR-011', 'CWE-601', 'Unvalidated redirect', 'medium', /(redirect|location\.href|Response\.Redirect)\s*\([^)]*(req\.|request\.|query|params|input)/i],
  ['LUNAR-012', 'CWE-117', 'Log injection risk', 'medium', /(console\.log|logger\.(info|warn|error)|print)\s*\([^)]*(req\.|request\.|input|params)/i],
  ['LUNAR-013', 'CWE-20', 'Permissive CORS origin', 'high', /(Access-Control-Allow-Origin.{0,20}\*|origin\s*:\s*['"]\*['"])/i],
  ['LUNAR-014', 'CWE-1321', 'Prototype pollution sink', 'high', /(Object\.assign|merge|defaultsDeep|set)\s*\([^)]*(req\.body|request\.body|input)/i],
  ['LUNAR-015', 'CWE-611', 'XML external entity risk', 'high', /(DocumentBuilderFactory|SAXParserFactory|XMLInputFactory|lxml|simplexml_load_string)/i],
  ['LUNAR-016', 'CWE-330', 'Security-sensitive weak randomness', 'high', /(Math\.random|random\.random|rand\(\)|java\.util\.Random).*(token|secret|password|nonce|session)/i],
  ['LUNAR-017', 'CWE-347', 'JWT decoded without verification', 'critical', /(jwt\.decode|parseJwt|DecodeJwtToken)\s*\(/i],
  ['LUNAR-018', 'CWE-494', 'Remote script execution', 'critical', /(curl|wget).{0,120}\|\s*(sh|bash|zsh|powershell)/i],
  ['LUNAR-019', 'CWE-732', 'Overly permissive filesystem mode', 'high', /(chmod\s+777|chmod\s+-R\s+777|FullControl.*Everyone)/i],
  ['LUNAR-020', 'CWE-1333', 'Potential regular expression denial of service', 'medium', /(\([^)]*[+*][^)]*\))[+*]|\.\*\.\*/i]
];

function languageFromPath(filePath) {
  const base = path.basename(filePath).toLowerCase();
  if (base === 'dockerfile' || base.startsWith('dockerfile.')) return 'dockerfile';
  return EXTENSIONS.get(path.extname(base)) || null;
}

function isScannable(filePath) {
  return Boolean(languageFromPath(filePath));
}

function scanFile(filePath, content) {
  const language = languageFromPath(filePath);
  const findings = [];
  String(content || '').split(/\r?\n/).forEach((lineText, index) => {
    const trimmed = lineText.trim();
    if (!trimmed || /^(\/\/|\/\*|\*|#\s)/.test(trimmed)) return;
    RULES.forEach(([ruleId, cwe, title, severity, pattern]) => {
      if (!pattern.test(lineText)) return;
      findings.push({
        ruleId,
        cwe,
        title,
        severity,
        line: index + 1,
        filePath,
        language,
        codeSnippet: trimmed.slice(0, 500),
        recommendation: recommendationFor(cwe)
      });
    });
  });
  if (['javascript', 'typescript'].includes(language)) {
    findings.push(...scanJavaScriptAst(filePath, content));
  }
  return findings;
}

function scanJavaScriptAst(filePath, content) {
  let ast;
  try {
    ast = parse(String(content || ''), {
      sourceType: 'unambiguous',
      errorRecovery: true,
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'optionalChaining']
    });
  } catch {
    return [];
  }
  const findings = [];
  walk(ast.program, (node) => {
    if (node.type !== 'CallExpression') return;
    const name = calleeName(node.callee);
    if (name === 'eval' || name.endsWith('.eval') || name === 'Function') {
      findings.push({
        ruleId: 'AST-JS-001',
        cwe: 'CWE-95',
        title: 'Dynamic code execution call',
        severity: 'critical',
        line: node.loc?.start?.line || 0,
        filePath,
        language: languageFromPath(filePath),
        codeSnippet: String(content).slice(node.start, node.end).slice(0, 500),
        recommendation: 'Replace dynamic execution with a strict parser or allowlisted dispatcher.'
      });
    }
  });
  return findings;
}

function calleeName(node) {
  if (!node) return '';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') return `${calleeName(node.object)}.${calleeName(node.property)}`;
  return '';
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'extra', 'comments', 'tokens'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}

function recommendationFor(cwe) {
  return ({
    'CWE-798': 'Move the secret to a managed secret store or environment variable.',
    'CWE-89': 'Use a parameterized query.',
    'CWE-79': 'Encode output and sanitize explicitly trusted HTML.',
    'CWE-78': 'Avoid shell execution and pass fixed arguments.',
    'CWE-22': 'Resolve against an allowlisted base directory.',
    'CWE-918': 'Allowlist destinations and block private address ranges.'
  })[cwe] || 'Review the evidence and apply the least-privilege safe pattern.';
}

module.exports = {
  languageFromPath,
  isScannable,
  scanFile,
  supportedLanguages: Array.from(new Set(EXTENSIONS.values())),
  ruleCount: RULES.length
};
