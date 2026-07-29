import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const baseUrl = process.env.LUNAR_UI_URL || 'http://127.0.0.1:5050';
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
].filter(Boolean);

const chromePath = chromeCandidates.find((candidate) => {
  try {
    return Boolean(candidate && existsSync(candidate));
  } catch {
    return false;
  }
});

if (!chromePath) {
  throw new Error('Chrome/Chromium was not found. Set CHROME_PATH and retry.');
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const profileDir = await mkdtemp(path.join(tmpdir(), 'lunar-ui-smoke-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-component-update',
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

function waitForBrowserEndpoint() {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timeout = setTimeout(() => reject(new Error('Chrome DevTools endpoint timed out.')), 15000);
    chrome.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    chrome.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chrome exited before startup (code ${code}).`));
    });
  });
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', () => reject(new Error('CDP socket failed.')), { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) {
        listener(message.params || {});
      }
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const response = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return response;
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  close() {
    this.socket.close();
  }
}

let client;
const consoleErrors = [];
const runtimeErrors = [];
const failedRequests = [];
const httpErrors = [];
const results = {};

async function evaluate(expression) {
  const response = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text || 'Browser evaluation failed.');
  }
  return response.result?.value;
}

async function waitFor(expression, label, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function clickButton(label) {
  const clicked = await evaluate(`(() => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const button = [...document.querySelectorAll('button')]
      .find((item) => normalize(item.textContent) === ${JSON.stringify(label)});
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Button not found: ${label}`);
}

async function fill(selector, value) {
  const focused = await evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) return false;
    input.focus();
    input.select();
    return true;
  })()`);
  if (!focused) throw new Error(`Input not found: ${selector}`);
  await client.send('Input.insertText', { text: value });
}

try {
  const browserEndpoint = await waitForBrowserEndpoint();
  const endpoint = new URL(browserEndpoint);
  const targetResponse = await fetch(`http://${endpoint.host}/json/new?about:blank`, { method: 'PUT' });
  const target = await targetResponse.json();
  client = new CdpClient(target.webSocketDebuggerUrl);

  client.on('Runtime.consoleAPICalled', ({ type, args }) => {
    if (type === 'error') {
      consoleErrors.push(args.map((item) => item.value || item.description || '').join(' '));
    }
  });
  client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    runtimeErrors.push(exceptionDetails.exception?.description || exceptionDetails.text || 'Unknown exception');
  });
  client.on('Network.loadingFailed', ({ requestId, errorText, blockedReason }) => {
    failedRequests.push({ requestId, errorText, blockedReason: blockedReason || null });
  });
  client.on('Network.responseReceived', ({ response }) => {
    if (response.status >= 400) {
      httpErrors.push({ status: response.status, url: response.url });
    }
  });

  await Promise.all([
    client.send('Page.enable'),
    client.send('Runtime.enable'),
    client.send('Network.enable'),
    client.send('Log.enable')
  ]);
  await client.send('Page.navigate', { url: baseUrl });
  await waitFor(
    `document.readyState === 'complete' && document.body?.innerText.includes('Lunar')`,
    'Lunar landing page'
  );

  results.page = {
    title: await evaluate('document.title'),
    rootRendered: await evaluate(`Boolean(document.querySelector('#root')?.children.length)`),
    workspaceRendered: await evaluate(`document.body.innerText.includes('Đồng Bộ GitHub Repositories Cá Nhân')`)
  };

  await clickButton('Sign In');
  await waitFor(`Boolean(document.querySelector('#auth-modal'))`, 'authentication modal');
  results.authTabs = await evaluate(`([...document.querySelectorAll('#auth-modal button')]
    .map((button) => button.textContent.replace(/\\s+/g, ' ').trim())
    .filter(Boolean))`);

  await clickButton('GitHub');
  await clickButton('Kết Nối & Nạp GitHub Repositories');
  await waitFor(
    `document.body.innerText.includes('GitHub OAuth chưa được cấu hình')`,
    'GitHub configuration warning'
  );
  results.githubMissingConfigHandled = true;

  await evaluate(`document.querySelector('#auth-modal button[aria-label="Đóng hộp đăng nhập"]')?.click()`);
  await waitFor(`!document.querySelector('#auth-modal')`, 'modal close');

  await clickButton('Sign In');
  await waitFor(`Boolean(document.querySelector('#auth-modal'))`, 'authentication modal');
  await clickButton('Email');
  await clickButton('Đăng ký ngay');

  const unique = Date.now();
  const email = `browser-${unique}@example.com`;
  await fill(`#auth-modal input[type="text"]`, 'Browser Smoke User');
  await fill(`#auth-modal input[type="email"]`, email);
  await fill(`#auth-modal input[type="password"]`, 'StrongPass123!');
  await clickButton('Khởi Tạo Tài Khoản Pro');
  await sleep(1200);
  const registrationState = await evaluate(`(() => ({
    modalOpen: Boolean(document.querySelector('#auth-modal')),
    inputs: [...document.querySelectorAll('#auth-modal input')].map((input) => ({
      type: input.type,
      value: input.value,
      validationMessage: input.validationMessage
    })),
    modalText: document.querySelector('#auth-modal')?.innerText || ''
  }))()`);
  if (registrationState.modalOpen) {
    throw new Error(`Registration modal remained open: ${JSON.stringify({
      registrationState,
      httpErrors,
      consoleErrors,
      runtimeErrors
    })}`);
  }

  results.cookieSession = await evaluate(`fetch('/api/v1/auth/me', { credentials: 'include' })
    .then(async (response) => ({ status: response.status, body: await response.json() }))`);

  await fill(`input[placeholder="Nhập GitHub Username của bạn..."]`, 'ThanhluanGif');
  await clickButton('Tải Repos');
  await waitFor(
    `document.body.innerText.includes('dự án GitHub thật') && document.body.innerText.includes('Lunar')`,
    'public GitHub repository sync',
    15000
  );
  results.publicGitHubSync = true;

  await clickButton('Kết Nối GitHub');
  await waitFor(
    `document.body.innerText.includes('LUNAR_GITHUB_CLIENT_ID')`,
    'workspace GitHub configuration warning'
  );
  results.workspaceGitHubWarning = true;

  const expectedGuestAuthProbe = (item) => item.status === 401 && item.url.endsWith('/api/v1/auth/me');
  results.diagnostics = {
    consoleErrors,
    runtimeErrors,
    failedRequests,
    unexpectedHttpErrors: httpErrors.filter((item) => !expectedGuestAuthProbe(item))
  };

  if (!results.page.rootRendered || !results.page.workspaceRendered) {
    throw new Error('The React application did not render the expected workspace.');
  }
  if (results.cookieSession?.status !== 200 || !results.cookieSession?.body?.user?.email) {
    throw new Error('Browser registration did not establish a working cookie session.');
  }
  if (runtimeErrors.length || consoleErrors.length || results.diagnostics.unexpectedHttpErrors.length) {
    throw new Error(`Browser diagnostics contain unexpected errors: ${JSON.stringify(results.diagnostics)}`);
  }

  console.log(JSON.stringify({ status: 'PASS', baseUrl, ...results }, null, 2));
} finally {
  client?.close();
  chrome.kill('SIGTERM');
  await rm(profileDir, { recursive: true, force: true });
}
