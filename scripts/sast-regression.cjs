const assert = require('assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function run() {
  const { scanCodeForSecurityVulnerabilities } = await import('../src/services/securityScannerEngine.js');

  const secureDockerfile = scanCodeForSecurityVulnerabilities(
    'FROM node:22-alpine\nUSER node',
    'Dockerfile'
  );
  assert.equal(
    secureDockerfile.vulnerabilities.some((finding) => finding.ruleId === 'LUNAR-032'),
    false,
    'A Dockerfile with USER must not be flagged as root'
  );

  const privilegedCompose = scanCodeForSecurityVulnerabilities(
    'services:\n  app:\n    cap_add:\n      - ALL',
    'docker-compose.yml'
  );
  assert.equal(
    privilegedCompose.vulnerabilities.some((finding) => finding.ruleId === 'LUNAR-036'),
    true,
    'cap_add ALL must be detected across lines'
  );

  const secureCookie = scanCodeForSecurityVulnerabilities(
    "res.cookie('token', value, { httpOnly: true, secure: true, sameSite: 'strict' });",
    'server.js'
  );
  assert.equal(
    secureCookie.vulnerabilities.some((finding) => finding.ruleId === 'LUNAR-012'),
    false,
    'A cookie with security attributes must not be flagged'
  );

  const insecureCookie = scanCodeForSecurityVulnerabilities(
    "res.cookie('token', value);",
    'server.js'
  );
  assert.equal(
    insecureCookie.vulnerabilities.some((finding) => finding.ruleId === 'LUNAR-012'),
    true,
    'A cookie without security attributes must be detected'
  );
  const cookieFinding = insecureCookie.vulnerabilities.find((finding) => finding.ruleId === 'LUNAR-012');
  assert.equal(cookieFinding.triageStatus, 'NEEDS_REVIEW');
  assert.equal(cookieFinding.available, false);
  assert.equal(cookieFinding.patchAvailable, false);
  assert.equal(cookieFinding.after, null);
  assert.equal(cookieFinding.unifiedDiff, null);
  assert.equal(cookieFinding.patchedCode, null);
  assert.equal(cookieFinding.remediation.patchCode, null);
  assert.ok(cookieFinding.reasonUnavailable);
  assert.ok(cookieFinding.evidence?.matchedSource.includes('res.cookie'));

  const inheritedRouterAuth = scanCodeForSecurityVulnerabilities(
    [
      'router.use(verifyToken, requireRole(\'ADMIN\'));',
      "router.patch('/users/:id', async (req, res) => res.json({ ok: true }));"
    ].join('\n'),
    'adminRoutes.js'
  );
  assert.equal(
    inheritedRouterAuth.vulnerabilities.some((finding) => finding.ruleId === 'LUNAR-018'),
    false,
    'Router-level authorization must satisfy the route authorization rule'
  );

  const unthrottledLogin = scanCodeForSecurityVulnerabilities(
    "router.post('/login', async (req, res) => res.json({ ok: true }));",
    'authRoutes.js'
  );
  assert.equal(
    unthrottledLogin.vulnerabilities.some((finding) => finding.ruleId === 'LUNAR-031'),
    true,
    'An authentication route without visible throttling must be detected'
  );

  const scannerFixture = scanCodeForSecurityVulnerabilities(
    "const commandRule = /execSync\\s*\\(/;\nconst keySizeRule = /(rsa).{0,80}1024/;",
    'securityScannerEngine.js'
  );
  assert.equal(scannerFixture.stats.total, 0, 'Scanner regex fixtures must not be treated as executable sinks');

  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'lunar-command-payload-'));
  const marker = path.join(sandbox, 'side-effect-created');
  const payloads = [
    `; touch ${marker}`,
    '&& whoami',
    '$(id)',
    '`id`',
    `line-one\ntouch ${marker}`,
    '--require=/tmp/attacker.js',
    '../../etc/passwd'
  ];
  try {
    for (const payload of payloads) {
      scanCodeForSecurityVulnerabilities(
        `const untrustedPayload = ${JSON.stringify(payload)};`,
        'src/payload-fixture.js'
      );
      assert.equal(fs.existsSync(marker), false, `Scanner executed payload: ${JSON.stringify(payload)}`);
    }
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }

  assert.equal(
    insecureCookie.stats.total,
    insecureCookie.stats.criticalCount
      + insecureCookie.stats.highCount
      + insecureCookie.stats.mediumCount
      + insecureCookie.stats.lowCount,
    'Severity totals must equal the total finding count'
  );
  assert.equal(insecureCookie.stats.maxFindingCvss, insecureCookie.stats.maxCvss);
  assert.equal(insecureCookie.stats.projectRiskScore, null);

  console.log('SAST regression: PASS');
}

run().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
