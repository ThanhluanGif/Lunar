const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const {
  isScannable,
  isLikelyTestOrFixture,
  scanFile
} = require('../server/services/sastEngine');

const MAX_FILE_BYTES = 512000;
const MAX_FILES = 500;
// Agent/Flow skills are pinned development tooling, not code packaged into the
// Vite frontend or Render backend. Some intentionally execute operator-authored
// verification commands, so scanning that vendored toolchain as application
// code creates release-blocking false positives.
const IGNORED_PREFIXES = [
  '.claude/skills/'
];
const IGNORED_PARTS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'vendor',
  'coverage',
  '.next',
  'target',
  'bin',
  'obj',
  '__pycache__',
  '.venv',
  'venv'
]);

function repositoryFiles() {
  return execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    { encoding: 'utf8' }
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((filePath) => (
      isScannable(filePath)
      && !isLikelyTestOrFixture(filePath)
      && !IGNORED_PREFIXES.some((prefix) => filePath.startsWith(prefix))
      && !filePath.split('/').some((part) => IGNORED_PARTS.has(part))
      && fs.statSync(filePath).size <= MAX_FILE_BYTES
    ))
    .slice(0, MAX_FILES);
}

function assertNoBrowserExposedSecrets(files) {
  const allowedPublicVariables = new Set([
    'VITE_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  ]);
  const publicVariablePattern = /import\.meta\.env\.((?:VITE|NEXT_PUBLIC)_[A-Z0-9_]*(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|KEY))\b/g;

  for (const filePath of files) {
    if (!/\.[cm]?[jt]sx?$/.test(filePath)) continue;
    const source = fs.readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(publicVariablePattern)) {
      if (!allowedPublicVariables.has(match[1])) {
        throw new Error(
          `Browser-exposed secret configuration detected: ${filePath} references ${match[1]}.`
        );
      }
    }
  }
}

function assertScannerPrecision() {
  const relativeImport = scanFile(
    'server/routes/example.js',
    "const service = require('../services/example');"
  );
  const embeddedFixture = scanFile(
    'src/data/example.js',
    "const example = 'eval(userInput)';"
  );
  const pathTraversal = scanFile(
    'server/routes/download.js',
    "const target = path.join('/uploads', req.query.filename);"
  );
  const sqlInjection = scanFile(
    'server/routes/users.js',
    'const sql = "SELECT * FROM users WHERE id = " + req.query.id;'
  );
  const dynamicExecution = scanFile(
    'server/routes/runtime.js',
    'eval(req.query.code);'
  );
  if (relativeImport.length || embeddedFixture.length) {
    throw new Error('SAST precision regression: imports or embedded fixtures produced findings.');
  }
  if (!pathTraversal.some((finding) => finding.cwe === 'CWE-22')) {
    throw new Error('SAST recall regression: dynamic path traversal was not detected.');
  }
  if (!sqlInjection.some((finding) => finding.cwe === 'CWE-89')) {
    throw new Error('SAST recall regression: SQL string construction was not detected.');
  }
  if (dynamicExecution.filter((finding) => finding.cwe === 'CWE-95').length !== 1) {
    throw new Error('SAST deduplication regression: dynamic execution should produce one finding.');
  }
}

assertScannerPrecision();
const files = repositoryFiles();
assertNoBrowserExposedSecrets(files);
const findings = files.flatMap((filePath) => (
  scanFile(filePath, fs.readFileSync(filePath, 'utf8'))
));
const blocking = findings.filter((finding) => (
  finding.severity === 'critical' || finding.severity === 'high'
));
const summary = {
  filesScanned: files.length,
  findings: findings.length,
  critical: findings.filter((finding) => finding.severity === 'critical').length,
  high: findings.filter((finding) => finding.severity === 'high').length,
  medium: findings.filter((finding) => finding.severity === 'medium').length,
  status: blocking.length ? 'FAIL' : 'PASS'
};

console.log(JSON.stringify(summary, null, 2));
if (blocking.length) {
  for (const finding of blocking.slice(0, 30)) {
    console.error(
      `${finding.severity.toUpperCase()} ${finding.ruleId} `
      + `${finding.filePath}:${finding.line} ${finding.title}`
    );
  }
  process.exitCode = 1;
}
