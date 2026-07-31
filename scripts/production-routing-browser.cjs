const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const backendPort = 7000 + Math.floor(Math.random() * 200);
const frontendPort = 7300 + Math.floor(Math.random() * 200);
const backendUrl = `http://127.0.0.1:${backendPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
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
  throw new Error('Chrome/Chromium was not found. Set CHROME_BIN for the production routing browser gate.');
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const build = spawnSync(npmCommand, ['run', 'build'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    VITE_API_BASE_URL: backendUrl
  },
  stdio: 'inherit'
});
if (build.status !== 0) process.exit(build.status ?? 1);

const backend = spawn(process.execPath, ['server/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(backendPort),
    NODE_ENV: 'production',
    LOG_LEVEL: 'WARN',
    JWT_SECRET: 'routing-browser-jwt-secret-at-least-32-characters',
    DATABASE_URL: 'postgresql://127.0.0.1:1/routing_browser_unavailable',
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
    AUTH_EMAIL_DRY_RUN: 'true',
    AUTH_EMAIL_ALLOW_INSECURE_BASE_URL: 'true',
    AUTH_EMAIL_BASE_URL: frontendUrl
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
const frontend = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js',
  'preview',
  '--host',
  '127.0.0.1',
  '--port',
  String(frontendPort),
  '--strictPort'
], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe']
});

let backendLogs = '';
let frontendLogs = '';
backend.stdout.on('data', (data) => { backendLogs += data; });
backend.stderr.on('data', (data) => { backendLogs += data; });
frontend.stdout.on('data', (data) => { frontendLogs += data; });
frontend.stderr.on('data', (data) => { frontendLogs += data; });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForUrl(url, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`${label} did not start.\nBackend:\n${backendLogs}\nFrontend:\n${frontendLogs}`);
}

async function run() {
  let browser;
  try {
    await Promise.all([
      waitForUrl(`${backendUrl}/api/v1/health`, 'Backend'),
      waitForUrl(frontendUrl, 'Frontend preview')
    ]);

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    let githubConfigRequestUrl = '';
    let githubConfigCorsOrigin = '';
    page.on('request', (request) => {
      if (request.url().endsWith('/api/v1/auth/github/config')) {
        githubConfigRequestUrl = request.url();
      }
    });
    page.on('response', async (response) => {
      if (response.url().endsWith('/api/v1/auth/github/config')) {
        githubConfigCorsOrigin = response.headers()['access-control-allow-origin'] || '';
      }
    });

    await page.goto(frontendUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    const markedLogin = await page.evaluate(() => {
      const loginButton = [...document.querySelectorAll('button')]
        .find((button) => button.textContent.trim() === 'Đăng nhập');
      loginButton?.setAttribute('data-production-routing-login', 'true');
      return Boolean(loginButton);
    });
    if (!markedLogin) throw new Error('Login trigger was not found.');
    await page.click('[data-production-routing-login="true"]');
    await page.waitForSelector('[role="dialog"][aria-modal="true"]', { visible: true });

    const markedGitHub = await page.evaluate(() => {
      const githubButton = [...document.querySelectorAll('[role="dialog"] button')]
        .find((button) => button.textContent.includes('Tiếp Tục Với GitHub'));
      githubButton?.setAttribute('data-production-routing-github', 'true');
      return Boolean(githubButton);
    });
    if (!markedGitHub) throw new Error('GitHub login action was not found.');
    await page.click('[data-production-routing-github="true"]');
    await page.waitForFunction(
      () => document.body.innerText.includes('GitHub OAuth chưa được cấu hình'),
      { timeout: 5000 }
    );

    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes('Không thể kết nối Lunar API')) {
      throw new Error('Frontend still reported a production API connectivity failure.');
    }
    if (githubConfigRequestUrl !== `${backendUrl}/api/v1/auth/github/config`) {
      throw new Error(`GitHub config used the wrong API origin: ${githubConfigRequestUrl}`);
    }
    if (githubConfigCorsOrigin !== frontendUrl) {
      throw new Error(`Backend returned the wrong CORS origin: ${githubConfigCorsOrigin}`);
    }

    console.log(JSON.stringify({
      status: 'PASS',
      frontendUrl,
      backendUrl,
      githubConfigRequestUrl,
      credentialedCorsOrigin: githubConfigCorsOrigin,
      providerCalls: 0
    }, null, 2));
  } finally {
    await browser?.close().catch(() => {});
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
