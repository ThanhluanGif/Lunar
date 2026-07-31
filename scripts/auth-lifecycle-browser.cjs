const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const puppeteer = require('puppeteer-core');

const seed = Date.now();
const backendPort = 7100 + Math.floor(Math.random() * 150);
const frontendPort = 7450 + Math.floor(Math.random() * 150);
const databasePort = 20000 + Math.floor(Math.random() * 1000);
const backendUrl = `http://127.0.0.1:${backendPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const databaseName = `lunar_auth_lifecycle_${process.pid}_${seed}`;
const databasePassword = crypto.randomBytes(24).toString('base64url');
const jwtSecret = crypto.randomBytes(48).toString('base64url');
const databaseUrl = `postgresql://lunar_auth:${encodeURIComponent(databasePassword)}@127.0.0.1:${databasePort}/lunar_auth`;
const email = `routing-${seed}@example.com`;
const nickname = `@${email.split('@')[0]}`;
const accountCredential = crypto.randomBytes(24).toString('base64url');
const displayName = 'Routing Lifecycle User';
const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
const executablePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));

if (!executablePath) {
  throw new Error('Chrome/Chromium was not found. Set CHROME_BIN for the auth lifecycle gate.');
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    ...options
  });
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed.`,
      result.stdout || '',
      result.stderr || ''
    ].filter(Boolean).join('\n'));
  }
  return result;
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDatabase() {
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 1000 });
  try {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      try {
        const result = await pool.query("SELECT to_regclass('public.users') AS users_table");
        if (result.rows[0]?.users_table === 'users') return;
      } catch {}
      await sleep(200);
    }
  } finally {
    await pool.end();
  }
  throw new Error('Disposable PostgreSQL did not initialize the Lunar schema.');
}

async function waitForUrl(url, label, logs) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`${label} did not start.\n${logs()}`);
}

async function markAndClick(page, text, { exact = true, scope = 'button' } = {}) {
  const selector = `data-auth-lifecycle-${Math.random().toString(16).slice(2)}`;
  const marked = await page.evaluate(({ expected, exactMatch, query, attribute }) => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const element = [...document.querySelectorAll(query)].find((candidate) => (
      exactMatch
        ? normalize(candidate.textContent) === expected
        : normalize(candidate.textContent).includes(expected)
    ));
    element?.setAttribute(attribute, 'true');
    return Boolean(element);
  }, { expected: text, exactMatch: exact, query: scope, attribute: selector });
  if (!marked) throw new Error(`Could not find UI action: ${text}`);
  await page.click(`[${selector}="true"]`);
}

async function openEmailLogin(page) {
  await markAndClick(page, 'Đăng nhập');
  await page.waitForSelector('[role="dialog"][aria-modal="true"]', { visible: true });
  await markAndClick(page, 'Đăng nhập bằng email', { exact: false, scope: '[role="dialog"] button' });
}

async function waitForSignedInUser(page) {
  await page.waitForFunction((name) => (
    [...document.querySelectorAll('button[aria-haspopup="menu"]')]
      .some((button) => button.textContent.includes(name))
  ), { timeout: 7000 }, displayName);
}

async function logoutFromNavbar(page) {
  await page.click('button[aria-haspopup="menu"]');
  await markAndClick(page, 'Đăng xuất', { scope: '[role="menu"] button' });
  await page.waitForFunction(() => (
    [...document.querySelectorAll('button')]
      .some((button) => button.textContent.trim() === 'Đăng nhập')
  ), { timeout: 7000 });
}

async function browserSessionStatus(page) {
  return page.evaluate(async (apiOrigin) => {
    const response = await fetch(`${apiOrigin}/api/v1/auth/me`, {
      credentials: 'include',
      cache: 'no-store'
    });
    return {
      status: response.status,
      cacheControl: response.headers.get('cache-control') || ''
    };
  }, backendUrl);
}

async function run() {
  let databaseStarted = false;
  let backend;
  let frontend;
  let browser;
  let backendLogs = '';
  let frontendLogs = '';

  try {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    runCommand(npmCommand, ['run', 'build'], {
      env: { ...process.env, VITE_API_BASE_URL: backendUrl },
      stdio: 'inherit'
    });

    runCommand('docker', [
      'run', '--rm', '-d',
      '--name', databaseName,
      '-e', 'POSTGRES_USER=lunar_auth',
      '-e', `POSTGRES_PASSWORD=${databasePassword}`,
      '-e', 'POSTGRES_DB=lunar_auth',
      '-p', `127.0.0.1:${databasePort}:5432`,
      '-v', `${path.resolve('server/schema.sql')}:/docker-entrypoint-initdb.d/001-schema.sql:ro`,
      'postgres:16-alpine'
    ]);
    databaseStarted = true;
    await waitForDatabase();

    backend = spawn(process.execPath, ['server/index.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(backendPort),
        NODE_ENV: 'production',
        LOG_LEVEL: 'WARN',
        JWT_SECRET: jwtSecret,
        DATABASE_URL: databaseUrl,
        CORS_ORIGINS: frontendUrl,
        PUBLIC_APP_URL: frontendUrl,
        COOKIE_SECURE: 'false',
        COOKIE_SAME_SITE: 'strict',
        GEMINI_API_KEY: '',
        OPENAI_API_KEY: '',
        ANTHROPIC_API_KEY: '',
        AI_GATEWAY_API_KEY: '',
        VERCEL_OIDC_TOKEN: '',
        GITHUB_CLIENT_ID: '',
        GITHUB_CLIENT_SECRET: '',
        GITHUB_TOKEN_ENCRYPTION_KEY: '',
        AUTH_EMAIL_SMTP_URL: '',
        AUTH_EMAIL_DRY_RUN: 'false',
        AUTH_EMAIL_BASE_URL: frontendUrl
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    backend.stdout.on('data', (data) => { backendLogs += data; });
    backend.stderr.on('data', (data) => { backendLogs += data; });

    frontend = spawn(process.execPath, [
      'node_modules/vite/bin/vite.js',
      'preview',
      '--host', '127.0.0.1',
      '--port', String(frontendPort),
      '--strictPort'
    ], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    frontend.stdout.on('data', (data) => { frontendLogs += data; });
    frontend.stderr.on('data', (data) => { frontendLogs += data; });

    await Promise.all([
      waitForUrl(`${backendUrl}/api/v1/ready`, 'Backend', () => backendLogs),
      waitForUrl(frontendUrl, 'Frontend preview', () => frontendLogs)
    ]);

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const apiResponses = [];
    const failedApiRequests = [];
    page.on('requestfailed', (request) => {
      if (request.url().startsWith(`${backendUrl}/api/`)) {
        failedApiRequests.push({
          method: request.method(),
          url: request.url(),
          error: request.failure()?.errorText || 'unknown'
        });
      }
    });
    page.on('response', (response) => {
      if (!response.url().startsWith(`${backendUrl}/api/v1/auth`)) return;
      apiResponses.push({
        method: response.request().method(),
        path: new URL(response.url()).pathname,
        status: response.status(),
        corsOrigin: response.headers()['access-control-allow-origin'] || '',
        cacheControl: response.headers()['cache-control'] || ''
      });
    });

    await page.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#root', { visible: true });

    await openEmailLogin(page);
    await markAndClick(page, 'Đăng ký ngay', { scope: '[role="dialog"] button' });
    await page.type('input[placeholder="Nguyen Van A"]', displayName);
    await page.type('input[placeholder="developer@lunar.dev"]', email);
    await page.type('input[type="password"]', accountCredential);
    await markAndClick(page, 'Khởi Tạo Tài Khoản', { scope: '[role="dialog"] button' });
    await waitForSignedInUser(page);

    const registeredSession = await browserSessionStatus(page);
    if (registeredSession.status !== 200) {
      throw new Error(`Registration did not create a browser session (${registeredSession.status}).`);
    }

    await logoutFromNavbar(page);
    const loggedOutSession = await browserSessionStatus(page);
    if (loggedOutSession.status !== 401) {
      throw new Error(`Logout did not clear the browser session (${loggedOutSession.status}).`);
    }

    await openEmailLogin(page);
    await page.type('input[autocomplete="username"]', nickname);
    await page.type('input[type="password"]', accountCredential);
    await markAndClick(page, 'Đăng Nhập Ngay', { scope: '[role="dialog"] button' });
    await waitForSignedInUser(page);

    const reloggedSession = await browserSessionStatus(page);
    if (reloggedSession.status !== 200) {
      throw new Error(`Re-login did not restore the browser session (${reloggedSession.status}).`);
    }
    if (!registeredSession.cacheControl.includes('no-store')
      || !loggedOutSession.cacheControl.includes('no-store')
      || !reloggedSession.cacheControl.includes('no-store')) {
      throw new Error('Auth session responses were cacheable across login/logout transitions.');
    }
    if (failedApiRequests.length) {
      throw new Error(`Auth lifecycle had failed fetches: ${JSON.stringify(failedApiRequests)}`);
    }

    const expectedResponses = [
      ['POST', '/api/v1/auth/register', 201],
      ['POST', '/api/v1/auth/logout', 200],
      ['POST', '/api/v1/auth/login', 200]
    ];
    for (const [method, requestPath, status] of expectedResponses) {
      const response = apiResponses.find((item) => (
        item.method === method && item.path === requestPath && item.status === status
      ));
      if (!response || response.corsOrigin !== frontendUrl || !response.cacheControl.includes('no-store')) {
        throw new Error(`Missing safe ${method} ${requestPath} response: ${JSON.stringify(response)}`);
      }
    }
    const preflightPaths = new Set(
      apiResponses
        .filter((item) => item.method === 'OPTIONS' && item.status === 204)
        .map((item) => item.path)
    );
    if (!preflightPaths.has('/api/v1/auth/register') || !preflightPaths.has('/api/v1/auth/login')) {
      throw new Error(`Login/register CORS preflight was not observed: ${JSON.stringify([...preflightPaths])}`);
    }

    console.log(JSON.stringify({
      status: 'PASS',
      register: 201,
      logout: 200,
      sessionAfterLogout: 401,
      relogin: 200,
      reloginByNickname: 'PASS',
      authCacheControl: 'no-store',
      corsPreflight: 'PASS',
      failedFetches: 0,
      providerCalls: 0
    }, null, 2));
  } finally {
    await browser?.close().catch(() => {});
    backend?.kill('SIGTERM');
    frontend?.kill('SIGTERM');
    if (databaseStarted) {
      spawnSync('docker', ['stop', '--time', '2', databaseName], { stdio: 'ignore' });
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
