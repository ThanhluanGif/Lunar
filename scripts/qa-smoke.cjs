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
    PAYMENT_WEBHOOK_SECRET: 'qa-payment-webhook-secret',
    ADMIN_BOOTSTRAP_TOKEN: process.env.ADMIN_BOOTSTRAP_TOKEN || 'qa-one-time-admin-bootstrap-token'
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

  const acceptedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  if (!acceptedStatuses.includes(response.status)) {
    throw new Error(`${path} returned ${response.status}; expected ${acceptedStatuses.join('/')}: ${text}`);
  }
  return { response, body };
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await request('/api/v1/ready');
      return;
    } catch {
      await sleep(250);
    }
  }
  throw new Error(`Backend did not become database-ready.\n${serverLogs}`);
}

function cookieFrom(response) {
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw new Error('Authentication cookie was not issued.');
  return cookie;
}

async function registerOrLogin({ name, nickname, email, password, extra = {} }) {
  const registration = await request('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, nickname, email, password, ...extra })
  }, [201, 400]);

  if (registration.response.status === 201) {
    return { ...registration.body, cookie: cookieFrom(registration.response) };
  }

  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return { ...login.body, cookie: cookieFrom(login.response) };
}

async function run() {
  try {
    await waitUntilReady();

    const health = await request('/api/v1/health');
    const readiness = await request('/api/v1/ready');
    const security = await request('/api/v1/security/health-check');
    const frontend = await request('/');
    if (!String(frontend.body).includes('<div id="root">')) {
      throw new Error('The Mac frontend bundle was not served by the backend.');
    }

    const guestAccess = await request('/api/v1/dashboard/access');
    if (guestAccess.body.identity !== 'GUEST') {
      throw new Error('Anonymous access was not classified as GUEST.');
    }
    await request('/api/v1/scans/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'eval(input)', filename: 'guest.js' })
    }, 401);

    const uniqueId = Date.now();
    const regular = await registerOrLogin({
      name: 'QA User',
      nickname: `qa${uniqueId}`,
      email: `qa-${uniqueId}@example.com`,
      password: 'StrongPass123!',
      extra: { tier: 'ENTERPRISE', role: 'ADMIN' }
    });
    if (regular.user.tier !== 'FREE' || regular.user.role !== 'USER') {
      throw new Error('Registration accepted client-controlled tier or role.');
    }

    const userAccess = await request('/api/v1/dashboard/access', { headers: { cookie: regular.cookie } });
    if (userAccess.body.identity !== 'FREE') {
      throw new Error('FREE user access profile is incorrect.');
    }
    await request('/api/v1/admin/overview', { headers: { cookie: regular.cookie } }, 403);

    const scan = await request('/api/v1/scans/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: regular.cookie },
      body: JSON.stringify({
        projectName: 'QA security fixture',
        filename: 'auth.js',
        code: `const password = "hardcoded-secret";\nfunction run(input) { return eval(input); }`
      })
    }, 201);
    if (scan.body.source !== 'postgresql' || scan.body.scan.issuesCount < 1) {
      throw new Error('Verified scan was not analyzed and persisted.');
    }

    const dashboard = await request('/api/v1/dashboard/overview?days=28', {
      headers: { cookie: regular.cookie }
    });
    if (dashboard.body.source !== 'postgresql' || dashboard.body.summary.scansInRange < 1) {
      throw new Error('Dashboard did not return persisted scan metrics.');
    }

    let admin = await registerOrLogin({
      name: 'QA Administrator',
      nickname: 'qa_admin',
      email: 'admin@lunar.local',
      password: 'AdminPass123!'
    });
    if (admin.user.role !== 'ADMIN') {
      const bootstrap = await request('/api/v1/auth/bootstrap-admin', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: admin.cookie,
          'x-admin-bootstrap-token': process.env.ADMIN_BOOTSTRAP_TOKEN || 'qa-one-time-admin-bootstrap-token'
        }
      });
      admin = { ...bootstrap.body, cookie: cookieFrom(bootstrap.response) };
    }
    if (admin.user.role !== 'ADMIN') {
      throw new Error('One-time admin bootstrap did not assign the ADMIN role.');
    }
    await request('/api/v1/auth/bootstrap-admin', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: admin.cookie,
        'x-admin-bootstrap-token': process.env.ADMIN_BOOTSTRAP_TOKEN || 'qa-one-time-admin-bootstrap-token'
      }
    }, 409);

    const adminOverview = await request('/api/v1/admin/overview', {
      headers: { cookie: admin.cookie }
    });
    if (adminOverview.body.source !== 'postgresql') {
      throw new Error('Admin overview did not use PostgreSQL.');
    }

    const userUpdate = await request(`/api/v1/admin/users/${regular.user.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: admin.cookie },
      body: JSON.stringify({ tier: 'PRO', reason: 'QA validates audited tier management' })
    });
    if (userUpdate.body.user.tier !== 'PRO') {
      throw new Error('Admin tier adjustment did not persist.');
    }

    await request(`/api/v1/admin/users/${regular.user.id}/reset-quota`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: admin.cookie },
      body: JSON.stringify({ reason: 'QA validates audited quota reset' })
    });

    const refreshedUser = await request('/api/v1/auth/me', {
      headers: { cookie: regular.cookie }
    });
    if (refreshedUser.body.user.tier !== 'PRO') {
      throw new Error('Authoritative DB tier was not reflected for an existing JWT.');
    }

    const auditLog = await request('/api/v1/admin/audit-log', {
      headers: { cookie: admin.cookie }
    });
    if (auditLog.body.logs.length < 2) {
      throw new Error('Admin changes were not recorded in the audit log.');
    }

    const createOrder = await request('/api/v1/payment/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: regular.cookie },
      body: JSON.stringify({ tier: 'ENTERPRISE', paymentMethod: 'VIETQR' })
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
    const paymentStatus = await request(`/api/v1/payment/status/${orderCode}`, {
      headers: { cookie: regular.cookie }
    });
    if (paymentStatus.body.status !== 'SUCCESS') {
      throw new Error('The payment smoke flow did not reach SUCCESS.');
    }

    console.log(JSON.stringify({
      frontend: 'PASS',
      backendHealth: health.body.status,
      database: readiness.body.database,
      securityHealth: security.body.status,
      guestAccess: 'PASS',
      userRbac: 'PASS',
      persistedDashboard: 'PASS',
      adminRbac: 'PASS',
      auditedAdminActions: auditLog.body.logs.length,
      paymentFlow: paymentStatus.body.status
    }, null, 2));
  } finally {
    child.kill();
  }
}

run().catch((error) => {
  console.error(error.stack);
  console.error(serverLogs);
  child.kill();
  process.exitCode = 1;
});
