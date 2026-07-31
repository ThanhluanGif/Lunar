const { spawn } = require('child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  REDACTED,
  REDACTED_PII,
  cleanLogMessage,
  correlationIdFromRequest,
  serializeLogEntry
} = require('../server/middleware/logger');
const { createAuditReportCsv, sanitizeCsvField } = require('../server/services/reportService');
const { providerFetch, providerPolicy } = require('../server/services/providerHttp');
const { readRuntimeSecret } = require('../server/services/runtimeSecrets');
const {
  authIdentifierKey,
  validateRateLimitDeployment
} = require('../server/middleware/rateLimiter');
const { webhookTimestampIsFresh } = require('../server/services/paymentWebhookPolicy');
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

const secretDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'lunar-secret-regression-'));
const secretPath = path.join(secretDirectory, 'jwt_secret');
fs.writeFileSync(secretPath, 'file-backed-regression-secret\n', { mode: 0o600 });
try {
  assert.equal(
    readRuntimeSecret('JWT_SECRET', { env: { JWT_SECRET_FILE: secretPath } }),
    'file-backed-regression-secret'
  );
  assert.throws(
    () => readRuntimeSecret('JWT_SECRET', {
      env: { JWT_SECRET: 'direct-value', JWT_SECRET_FILE: secretPath }
    }),
    /cannot both be configured/
  );
} finally {
  fs.rmSync(secretDirectory, { recursive: true, force: true });
}

assert.doesNotThrow(() => validateRateLimitDeployment({ NODE_ENV: 'production', WEB_CONCURRENCY: '1' }));
assert.throws(
  () => validateRateLimitDeployment({ NODE_ENV: 'production', WEB_CONCURRENCY: '2' }),
  /shared rate-limit store/
);
const identifierKey = authIdentifierKey({
  body: { email: 'Security.User@Example.com' },
  ip: '203.0.113.10'
});
assert.match(identifierKey, /^identifier:[a-f0-9]{64}$/);
assert.equal(identifierKey.includes('security.user@example.com'), false);

const webhookNow = Date.now();
assert.equal(webhookTimestampIsFresh(new Date(webhookNow).toISOString(), { now: webhookNow }), true);
assert.equal(webhookTimestampIsFresh(webhookNow - (10 * 60 * 1000), { now: webhookNow }), false);
assert.equal(webhookTimestampIsFresh(webhookNow + (2 * 60 * 1000), { now: webhookNow }), false);

const acceptedCorrelationId = '0123456789abcdef0123456789abcdef';
assert.equal(correlationIdFromRequest(acceptedCorrelationId, true), acceptedCorrelationId);
assert.notEqual(correlationIdFromRequest(acceptedCorrelationId), acceptedCorrelationId);
assert.match(correlationIdFromRequest('invalid correlation id'), /^[0-9a-f-]{36}$/i);

const redactedLog = serializeLogEntry({
  authorization: 'Bearer top-secret-auth-token',
  cookie: 'access_token=top-secret-cookie',
  body: { password: 'top-secret-password' },
  details: {
    email: 'security@example.com',
    phone: '+84 912 345 678',
    apiKey: 'top-secret-api-key',
    paymentCard: '4111111111111111'
  }
});
for (const forbiddenValue of [
  'top-secret-auth-token',
  'top-secret-cookie',
  'top-secret-password',
  'security@example.com',
  '+84 912 345 678',
  'top-secret-api-key',
  '4111111111111111'
]) {
  assert.equal(redactedLog.includes(forbiddenValue), false, `Sensitive log value leaked: ${forbiddenValue}`);
}
assert.equal(redactedLog.includes(REDACTED), true);
assert.equal(redactedLog.includes(REDACTED_PII), true);
assert.equal(
  cleanLogMessage('Authorization: Bearer top-secret-auth-token email=security@example.com')
    .includes('top-secret-auth-token'),
  false
);

for (const dangerousValue of ['=1+1', '+cmd', '-2+3', '@SUM(A1:A2)', '\t=1+1', '\r=1+1', '\n=1+1', '  =1+1', '\0=1+1', '\u000b=1+1']) {
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

async function verifyProviderContracts() {
  let attempts = 0;
  let propagatedCorrelationId;
  const retriedResponse = await providerFetch('https://provider.example/resource', {}, {
    correlationId: acceptedCorrelationId,
    maxRetries: 1,
    fetchImpl: async (url, options) => {
      attempts += 1;
      propagatedCorrelationId = options.headers.get('x-correlation-id');
      return new Response(null, { status: attempts === 1 ? 503 : 200 });
    }
  });
  assert.equal(retriedResponse.status, 200);
  assert.equal(attempts, 2);
  assert.equal(propagatedCorrelationId, acceptedCorrelationId);

  attempts = 0;
  const postResponse = await providerFetch('https://provider.example/mutation', {
    method: 'POST',
    body: '{}'
  }, {
    maxRetries: 2,
    fetchImpl: async () => {
      attempts += 1;
      return new Response(null, { status: 503 });
    }
  });
  assert.equal(postResponse.status, 503);
  assert.equal(attempts, 1, 'Unsafe provider POST requests must not be retried automatically.');

  await assert.rejects(
    providerFetch('https://provider.example/timeout', {}, {
      timeoutMs: 1000,
      maxRetries: 0,
      fetchImpl: async (url, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      })
    }),
    (error) => error.code === 'PROVIDER_TIMEOUT' && error.status === 503
  );
  assert.deepEqual(providerPolicy({ timeoutMs: 999999, maxRetries: 99 }), {
    timeoutMs: 60000,
    maxRetries: 2
  });

  const managedEmailKeys = [
    'NODE_ENV',
    'AUTH_EMAIL_DRY_RUN',
    'AUTH_EMAIL_ALLOW_INSECURE_BASE_URL',
    'AUTH_EMAIL_SMTP_URL',
    'AUTH_EMAIL_FROM',
    'AUTH_EMAIL_BASE_URL'
  ];
  const previousEmail = Object.fromEntries(managedEmailKeys.map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, {
      NODE_ENV: 'production',
      AUTH_EMAIL_DRY_RUN: 'false',
      AUTH_EMAIL_ALLOW_INSECURE_BASE_URL: 'false',
      AUTH_EMAIL_SMTP_URL: 'https://invalid.example',
      AUTH_EMAIL_FROM: 'Lunar <no-reply@example.com>',
      AUTH_EMAIL_BASE_URL: 'https://app.example.com'
    });
    const emailService = require('../server/services/accountEmailService');
    assert.equal(emailService.getAccountEmailConfiguration().configured, false);
    await assert.rejects(
      emailService.sendEmailVerification({
        email: 'recipient@example.com',
        name: 'QA',
        token: 'test-only-verification-token-at-least-32-characters'
      }),
      (error) => error.code === 'AUTH_EMAIL_NOT_CONFIGURED'
    );

    process.env.AUTH_EMAIL_DRY_RUN = 'true';
    process.env.AUTH_EMAIL_BASE_URL = 'http://app.example.com';
    assert.equal(emailService.getAccountEmailConfiguration().configured, false);
    process.env.AUTH_EMAIL_ALLOW_INSECURE_BASE_URL = 'true';
    assert.equal(emailService.getAccountEmailConfiguration().configured, true);
    process.env.AUTH_EMAIL_ALLOW_INSECURE_BASE_URL = 'false';
    process.env.AUTH_EMAIL_BASE_URL = 'https://app.example.com';
    const dryRun = await emailService.sendEmailVerification({
      email: 'recipient@example.com',
      name: 'QA',
      token: 'test-only-verification-token-at-least-32-characters',
      correlationId: acceptedCorrelationId
    });
    assert.equal(dryRun.mode, 'dry-run');
  } finally {
    managedEmailKeys.forEach((key) => {
      if (previousEmail[key] === undefined) delete process.env[key];
      else process.env[key] = previousEmail[key];
    });
  }

  const previousGatewayKey = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = 'contract-only-invalid-gateway-key';
  try {
    const assistant = require('../server/services/aiAssistantService');
    await assert.rejects(
      assistant.generateAssistantReply({
        message: 'Fail closed when the configured provider rejects credentials.',
        user: { id: 'contract-user' },
        correlationId: acceptedCorrelationId,
        generateTextImpl: async () => {
          const error = new Error('Provider rejected credentials.');
          error.status = 503;
          throw error;
        }
      }),
      (error) => error.status === 503
    );
  } finally {
    if (previousGatewayKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = previousGatewayKey;
  }
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
    GEMINI_API_KEY: '',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    AI_GATEWAY_API_KEY: '',
    VERCEL_OIDC_TOKEN: '',
    AUTH_EMAIL_DRY_RUN: 'true',
    AUTH_EMAIL_ALLOW_INSECURE_BASE_URL: 'true',
    AUTH_EMAIL_BASE_URL: baseUrl,
    PUBLIC_APP_URL: 'https://app.example.com',
    COOKIE_SAME_SITE: 'strict',
    TRUST_PROXY: 'loopback',
    CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000,https://app.example.com'
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
    await verifyProviderContracts();
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
        'x-correlation-id': acceptedCorrelationId,
        'x-forwarded-for': '203.0.113.20'
      }
    });
    if (
      correlatedHealth.headers.get('x-correlation-id') !== acceptedCorrelationId
      || !correlatedHealth.headers.get('access-control-expose-headers')?.includes('X-Correlation-ID')
    ) {
      throw new Error('Valid correlation IDs were not propagated and exposed through CORS.');
    }

    const spoofedCorrelation = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { 'x-correlation-id': acceptedCorrelationId }
    });
    if (spoofedCorrelation.headers.get('x-correlation-id') === acceptedCorrelationId) {
      throw new Error('Direct clients were able to spoof a trusted proxy correlation ID.');
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
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': acceptedCorrelationId,
        'x-forwarded-for': '203.0.113.20'
      },
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

    let identifierThrottleResponse;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      identifierThrottleResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': `198.51.100.${attempt + 10}`
        },
        body: JSON.stringify({ email: 'distributed-probe@example.com', password: 'StrongPass123!' })
      });
      assert.equal(identifierThrottleResponse.status, attempt < 5 ? 503 : 429);
    }
    assert.ok(identifierThrottleResponse.headers.get('retry-after'));

    let ipThrottleResponse;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      ipThrottleResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.250'
        },
        body: JSON.stringify({
          email: `ip-probe-${attempt}@example.com`,
          password: 'StrongPass123!'
        })
      });
      assert.equal(ipThrottleResponse.status, attempt < 5 ? 503 : 429);
    }
    assert.ok(ipThrottleResponse.headers.get('retry-after'));

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
    const stalePaymentPayload = JSON.stringify({
      eventId: 'stale-regression-event',
      transactionId: 'stale-regression-transaction',
      orderCode: 'REGRESSION',
      amount: 290000,
      status: 'PAID',
      timestamp: new Date(Date.now() - (10 * 60 * 1000)).toISOString()
    });
    const stalePaymentSignature = crypto
      .createHmac('sha256', 'regression-payment-secret-at-least-32-characters')
      .update(stalePaymentPayload)
      .digest('hex');
    await expectStatus('/api/v1/payment/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lunar-signature': `sha256=${stalePaymentSignature}`
      },
      body: stalePaymentPayload
    }, 400);
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
    const oauthStateCookie = oauthStart.headers.get('set-cookie') || '';
    if (
      oauthStart.status !== 302
      || oauthLocation.origin !== 'https://github.com'
      || oauthLocation.pathname !== '/login/oauth/authorize'
      || oauthLocation.searchParams.has('redirect_uri')
      || !oauthLocation.searchParams.get('state')
      || !/HttpOnly/i.test(oauthStateCookie)
      || !/Secure/i.test(oauthStateCookie)
      || !/SameSite=Lax/i.test(oauthStateCookie)
    ) {
      throw new Error('GitHub registered-callback OAuth mode emitted an unsafe or mismatched authorization URL.');
    }
    const invalidCallback = await fetch(`${baseUrl}/api/v1/auth/github/callback?state=invalid`, {
      redirect: 'manual'
    });
    if (invalidCallback.headers.get('location') !== 'https://app.example.com/?github_auth=unavailable') {
      throw new Error('GitHub OAuth callback did not redirect to the configured public app origin.');
    }
    const oauthConfig = await expectStatus('/api/v1/auth/github/config', {
      headers: { origin: 'https://app.example.com' }
    }, 200);
    if (
      oauthConfig.headers.get('access-control-allow-origin') !== 'https://app.example.com'
      || oauthConfig.headers.get('access-control-allow-credentials') !== 'true'
    ) {
      throw new Error('Split-origin GitHub configuration request did not receive credentialed CORS headers.');
    }
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
      || correlatedLog.ip !== '203.0.113.0'
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
      structuredLogRedaction: 'PASS',
      trustedProxyCorrelationBoundary: 'PASS',
      csvFormulaInjectionProtection: 'PASS',
      modalFocusTrapContract: 'PASS',
      githubWebhookSignatureGuard: 'PASS',
      paymentWebhookFreshnessGuard: 'PASS',
      authIpAndIdentifierThrottling: 'PASS',
      runtimeSecretFileSupport: 'PASS',
      multiInstanceRateLimitFailClosed: 'PASS',
      reportAuthenticationGuard: 'PASS',
      providerTimeoutAndRetryPolicy: 'PASS',
      providerCredentialFailClosed: 'PASS'
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
