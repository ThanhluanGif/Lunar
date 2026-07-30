const { spawn } = require('child_process');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { correlationIdFromRequest } = require('../server/middleware/logger');
const { createAuditReportCsv, sanitizeCsvField } = require('../server/services/reportService');
const {
  UNVERIFIED_EMAIL_LINK_CODE,
  githubEmailMatchesLunarAccount,
  resolveVerifiedEmailAutoLink
} = require('../server/services/githubAccountLinking');

assert.equal(resolveVerifiedEmailAutoLink(null), null);
assert.equal(
  resolveVerifiedEmailAutoLink({ id: 'verified-user', email_verified_at: new Date() }),
  'verified-user'
);
assert.throws(
  () => resolveVerifiedEmailAutoLink({ id: 'unverified-user', email_verified_at: null }),
  (error) => error.code === UNVERIFIED_EMAIL_LINK_CODE && error.status === 409
);
assert.equal(githubEmailMatchesLunarAccount('Owner@Example.com', 'owner@example.com'), true);
assert.equal(githubEmailMatchesLunarAccount('attacker@example.com', 'victim@example.com'), false);

const acceptedCorrelationId = '0123456789abcdef0123456789abcdef';
assert.equal(correlationIdFromRequest(acceptedCorrelationId), acceptedCorrelationId);
assert.match(correlationIdFromRequest('invalid correlation id'), /^[0-9a-f-]{36}$/i);

for (const dangerousValue of ['=1+1', '+cmd', '-2+3', '@SUM(A1:A2)', '\t=1+1', '\r=1+1', '\n=1+1', '  =1+1']) {
  assert.equal(sanitizeCsvField(dangerousValue).startsWith("'"), true);
}

const csvFixture = createAuditReportCsv('=SUM(1,1) Tiếng Việt', {
  criticalCount: 1,
  total: 1,
  metadata: {
    scanId: '00000000-0000-4000-8000-000000000000',
    score: 10,
    engine: '+cmd'
  },
  findings: [{
    ruleId: '-RULE',
    cwe: '@CWE',
    title: '\t=HYPERLINK("https://attacker.invalid")',
    severity: 'critical',
    cvss: 9.8,
    filePath: '\r=FILE',
    line: 1,
    evidence: '@EVIDENCE',
    recommendation: '  =RECOMMENDATION',
    status: '-open'
  }]
}).toString('utf8');
assert.equal(csvFixture.startsWith('\ufeff'), true);
for (const safeFragment of ["'=SUM", "'+cmd", "'-RULE", "'@CWE", "'\t=HYPERLINK", "'\r=FILE", "'@EVIDENCE", "'  =RECOMMENDATION", "'-open"]) {
  assert.equal(csvFixture.includes(safeFragment), true, `CSV field was not neutralized: ${JSON.stringify(safeFragment)}`);
}

const modalFiles = [
  'AuthModal.jsx',
  'AccountSettingsModal.jsx',
  'PricingModal.jsx',
  'AuditReportExportModal.jsx',
  'GitBotConfigModal.jsx',
  'SubmitModal.jsx',
  'QuotaDepletedModal.jsx',
  'PortfolioBadgeModal.jsx'
];
for (const modalFile of modalFiles) {
  const source = fs.readFileSync(`src/components/${modalFile}`, 'utf8');
  assert.match(source, /useModalFocusTrap/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby=/);
  assert.match(source, /tabIndex=\{-1\}/);
}

const port = 6100 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'production',
    JWT_SECRET: 'regression-jwt-secret-at-least-32-characters',
    PAYMENT_WEBHOOK_SECRET: 'regression-payment-secret-at-least-32-characters',
    GITHUB_WEBHOOK_SECRET: 'regression-github-secret-at-least-32-characters',
    DATABASE_URL: 'postgresql://127.0.0.1:1/unavailable',
    ENABLE_PAYMENT_MOCK: 'true',
    GITHUB_CLIENT_ID: 'regression-client-id',
    GITHUB_CLIENT_SECRET: 'regression-client-secret',
    GITHUB_OAUTH_CALLBACK_URL: `${baseUrl}/api/v1/auth/github/callback`,
    GITHUB_AUTH_FLOW: 'web',
    GITHUB_OAUTH_REDIRECT_MODE: 'registered',
    GITHUB_TOKEN_ENCRYPTION_KEY: 'regression-github-encryption-key-at-least-32-characters',
    CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let logs = '';
child.stdout.on('data', (data) => { logs += data; });
child.stderr.on('data', (data) => { logs += data; });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/health`);
      if (response.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Server did not start.\n${logs}`);
}

async function expectStatus(path, options, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, options);
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: expected ${expectedStatus}, received ${response.status}.`);
  }
  return response;
}

async function run() {
  try {
    await waitForServer();
    const healthResponse = await fetch(`${baseUrl}/api/v1/health`);
    if (
      healthResponse.headers.get('x-xss-protection') !== '0'
      || !healthResponse.headers.get('permissions-policy')?.includes('camera=()')
      || healthResponse.headers.get('cross-origin-opener-policy') !== 'same-origin'
    ) {
      throw new Error('Hardened browser security headers are missing.');
    }

    const correlatedHealth = await fetch(`${baseUrl}/api/v1/health?token=must-not-be-logged`, {
      headers: {
        origin: 'http://localhost:3000',
        'x-correlation-id': acceptedCorrelationId
      }
    });
    if (
      correlatedHealth.headers.get('x-correlation-id') !== acceptedCorrelationId
      || !correlatedHealth.headers.get('access-control-expose-headers')?.includes('X-Correlation-ID')
    ) {
      throw new Error('Valid correlation IDs were not propagated and exposed through CORS.');
    }

    const replacedCorrelation = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { 'x-correlation-id': 'invalid correlation id' }
    });
    const generatedCorrelationId = replacedCorrelation.headers.get('x-correlation-id');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(generatedCorrelationId || '')) {
      throw new Error('Invalid correlation IDs were not replaced with UUIDv4 values.');
    }

    const malformedJson = await expectStatus('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-correlation-id': acceptedCorrelationId },
      body: '{malformed'
    }, 400);
    if (malformedJson.headers.get('x-correlation-id') !== acceptedCorrelationId) {
      throw new Error('Error responses did not retain the correlation ID.');
    }

    await expectStatus('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 42, nickname: {}, password: 42 })
    }, 400);

    let deeplyNested = { value: 'bounded' };
    for (let depth = 0; depth < 70; depth += 1) deeplyNested = { child: deeplyNested };
    await expectStatus('/api/v1/payment/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(deeplyNested)
    }, 400);

    await expectStatus('/api/v1/payment/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload: 'x'.repeat((1024 * 1024) + 1) })
    }, 413);

    const catalogResponse = await expectStatus('/api/v1/payment/plans', {}, 200);
    const catalog = await catalogResponse.json();
    const pro = catalog.plans.find((plan) => plan.id === 'PRO');
    const enterprise = catalog.plans.find((plan) => plan.id === 'ENTERPRISE');
    if (pro?.amount !== 290000 || enterprise?.amount !== 1500000) {
      throw new Error('Server plan catalog amounts are inconsistent.');
    }

    await expectStatus('/api/v1/payment/mock-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode: 'REGRESSION' })
    }, 404);
    await expectStatus('/api/v1/github/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'ping',
        'x-github-delivery': 'regression-delivery'
      },
      body: JSON.stringify({ zen: 'invalid-signature-must-fail' })
    }, 401);
    await expectStatus('/api/v1/reports/export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scanId: '00000000-0000-0000-0000-000000000000' })
    }, 401);
    await expectStatus('/api/v1/reports/export/csv/00000000-0000-4000-8000-000000000000', {}, 401);

    const oauthStart = await fetch(`${baseUrl}/api/v1/auth/github/start`, {
      redirect: 'manual'
    });
    const oauthLocation = new URL(oauthStart.headers.get('location'));
    if (
      oauthStart.status !== 302
      || oauthLocation.origin !== 'https://github.com'
      || oauthLocation.pathname !== '/login/oauth/authorize'
      || oauthLocation.searchParams.has('redirect_uri')
      || !oauthLocation.searchParams.get('state')
    ) {
      throw new Error('GitHub registered-callback OAuth mode emitted an unsafe or mismatched authorization URL.');
    }
    const oauthConfig = await expectStatus('/api/v1/auth/github/config', {}, 200);
    const oauthConfigPayload = await oauthConfig.json();
    if (oauthConfigPayload.authFlow !== 'web') {
      throw new Error('GitHub OAuth config did not expose the selected authentication flow.');
    }
    await expectStatus('/api/v1/auth/github/device/start', { method: 'POST' }, 409);
    await expectStatus('/api/v1/auth/github/device/start', {
      method: 'POST',
      headers: {
        cookie: 'access_token=csrf-regression-cookie',
        origin: 'http://localhost:3000'
      }
    }, 409);
    await expectStatus('/api/v1/auth/github/device/start', {
      method: 'POST',
      headers: {
        cookie: 'access_token=csrf-regression-cookie',
        origin: 'http://untrusted.example'
      }
    }, 403);

    await sleep(50);
    const structuredLogs = logs
      .split(/\r?\n/)
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line));
    const correlatedLog = structuredLogs.find((entry) => (
      entry.correlationId === acceptedCorrelationId
      && entry.message === 'HTTP request completed'
      && entry.path === '/api/v1/health'
    ));
    if (
      !correlatedLog
      || correlatedLog.path.includes('?')
      || !correlatedLog.timestamp
      || !correlatedLog.ip
      || correlatedLog.method !== 'GET'
      || correlatedLog.status !== 200
    ) {
      throw new Error('Structured request logs did not meet the correlation contract.');
    }

    console.log(JSON.stringify({
      productionMockPaymentRoute: 'PASS',
      serverAuthoritativePlanCatalog: 'PASS',
      githubOAuthRegisteredCallbackMode: 'PASS',
      githubOAuthFlowBoundary: 'PASS',
      csrfOriginAllowlist: 'PASS',
      githubUnverifiedEmailAutoLinkGuard: 'PASS',
      githubEmailVerificationBinding: 'PASS',
      boundedInputTraversal: 'PASS',
      requestPayloadLimit: 'PASS',
      hardenedSecurityHeaders: 'PASS',
      structuredCorrelationLogging: 'PASS',
      csvFormulaInjectionProtection: 'PASS',
      modalFocusTrapContract: 'PASS',
      githubWebhookSignatureGuard: 'PASS',
      reportAuthenticationGuard: 'PASS'
    }, null, 2));
  } finally {
    child.kill();
  }
}

run().catch((error) => {
  console.error(error.stack);
  console.error(logs);
  child.kill();
  process.exitCode = 1;
});
