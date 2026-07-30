const { spawn } = require('child_process');

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
    GITHUB_OAUTH_REDIRECT_MODE: 'registered',
    GITHUB_TOKEN_ENCRYPTION_KEY: 'regression-github-encryption-key-at-least-32-characters'
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

    console.log(JSON.stringify({
      productionMockPaymentRoute: 'PASS',
      serverAuthoritativePlanCatalog: 'PASS',
      githubOAuthRegisteredCallbackMode: 'PASS',
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
