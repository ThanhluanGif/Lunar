const { spawn } = require('child_process');

const port = 5200 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'production',
    JWT_SECRET: 'qa-secret-at-least-32-characters-long',
    PAYMENT_WEBHOOK_SECRET: 'qa-payment-webhook-secret'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverLogs = '';
child.stdout.on('data', (data) => { serverLogs += data; });
child.stderr.on('data', (data) => { serverLogs += data; });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function request(path, options = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned ${response.status}; expected ${expectedStatus}: ${text}`);
  }

  return { response, body };
}

async function waitUntilHealthy() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await request('/api/v1/health');
      return;
    } catch {
      await sleep(250);
    }
  }

  throw new Error(`Backend did not become healthy.\n${serverLogs}`);
}

async function run() {
  try {
    await waitUntilHealthy();

    const health = await request('/api/v1/health');
    const security = await request('/api/v1/security/health-check');
    const frontend = await request('/');

    if (!String(frontend.body).includes('<div id="root">')) {
      throw new Error('The Mac frontend bundle was not served by the backend.');
    }

    const uniqueId = Date.now();
    const register = await request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'QA User',
        nickname: `qa${uniqueId}`,
        email: `qa-${uniqueId}@example.com`,
        password: 'StrongPass123!'
      })
    }, 201);

    const cookie = register.response.headers.get('set-cookie')?.split(';')[0];
    if (!cookie) {
      throw new Error('Registration did not issue the JWT auth cookie.');
    }

    await request('/api/v1/payment/subscription', { headers: { cookie } });

    const createOrder = await request('/api/v1/payment/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ tier: 'PRO', paymentMethod: 'VIETQR' })
    });
    const orderCode = createOrder.body.order.orderCode;

    await request('/api/v1/payment/mock-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderCode, simulateSuccess: true })
    }, 401);

    await request('/api/v1/payment/mock-webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': 'qa-payment-webhook-secret'
      },
      body: JSON.stringify({ orderCode, simulateSuccess: true })
    });

    const paymentStatus = await request(
      `/api/v1/payment/status/${orderCode}`,
      { headers: { cookie } }
    );
    if (paymentStatus.body.status !== 'SUCCESS') {
      throw new Error('The payment smoke flow did not reach SUCCESS.');
    }

    console.log(JSON.stringify({
      frontend: 'PASS',
      backendHealth: health.body.status,
      securityHealth: security.body.status,
      cookieAuth: 'PASS',
      paymentFlow: paymentStatus.body.status
    }, null, 2));
  } finally {
    child.kill();
  }
}

run().catch((error) => {
  console.error(error.stack);
  child.kill();
  process.exitCode = 1;
});
