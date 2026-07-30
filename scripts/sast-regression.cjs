const assert = require('assert/strict');

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

  console.log('SAST regression: PASS');
}

run().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
