import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const baseUrl = process.env.LUNAR_UI_URL || 'http://127.0.0.1:5050';
const gmailOnly = process.argv.includes('--gmail-only');
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

  if (gmailOnly) {
    const gmailUnique = Date.now();
    const gmailTestEmail = `gmail-browser-${gmailUnique}@example.com`;
    const registration = await evaluate(`fetch('/api/v1/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Gmail Browser QA',
        nickname: 'gmailqa${gmailUnique}',
        email: ${JSON.stringify(gmailTestEmail)},
        password: 'StrongPass123!'
      })
    }).then(async (response) => ({ status: response.status, body: await response.json() }))`);
    if (registration.status !== 201) {
      throw new Error(`Gmail browser QA registration failed: ${JSON.stringify(registration)}`);
    }
    await client.send('Page.reload', { ignoreCache: true });
    await waitFor(
      `fetch('/api/v1/auth/me', { credentials: 'include' })
        .then((response) => response.status === 200)`,
      'authenticated Gmail browser session'
    );
    await clickButton('Gmail Alert');
    await waitFor(
      `document.body.innerText.includes('Gmail Cá Nhân & Cảnh Báo An Ninh')
        && document.body.innerText.includes('Quản trị viên chưa cấu hình Google OAuth Client cho Lunar')`,
      'per-user Gmail OAuth modal'
    );
    const gmailStatus = await evaluate(`fetch('/api/v1/notifications/gmail/status', {
      credentials: 'include'
    }).then((response) => response.json())`);
    const gmailUi = await evaluate(`(() => {
      const sendButton = [...document.querySelectorAll('button')]
        .find((button) => button.textContent.includes('Gửi thử Audit PDF'));
      const recipient = document.querySelector('input[aria-label="Email tài khoản Lunar nhận cảnh báo"]');
      return {
        heading: document.body.innerText.includes('Gmail Cá Nhân & Cảnh Báo An Ninh'),
        leastPrivilegeCopy: document.body.innerText.includes('không lưu mật khẩu Gmail'),
        recipientEmail: recipient?.value || null,
        sendDisabled: Boolean(sendButton?.disabled)
      };
    })()`);
    if (
      gmailStatus.configured
      || gmailStatus.connected
      || !gmailUi.heading
      || !gmailUi.leastPrivilegeCopy
      || gmailUi.recipientEmail !== gmailTestEmail
      || !gmailUi.sendDisabled
      || runtimeErrors.length
      || consoleErrors.length
    ) {
      throw new Error(`Per-user Gmail browser contract failed: ${JSON.stringify({
        gmailStatus,
        gmailUi,
        runtimeErrors,
        consoleErrors
      })}`);
    }
    console.log(JSON.stringify({
      status: 'PASS',
      baseUrl,
      gmailPerUserOAuthUi: gmailUi
    }, null, 2));
  } else {
  results.page = {
    title: await evaluate('document.title'),
    rootRendered: await evaluate(`Boolean(document.querySelector('#root')?.children.length)`),
    workspaceRendered: await evaluate(`document.body.innerText.includes('Đồng Bộ GitHub Repositories Cá Nhân')`)
  };

  await clickButton('Lunar AI');
  await waitFor(
    `Boolean(document.querySelector('[data-testid="lunar-ai-panel"]'))
      && document.body.innerText.includes('Trợ lý bảo mật phòng thủ')
      && document.body.innerText.includes('không gửi dữ liệu sang AI ngoài')`,
    'guest Lunar AI assistant'
  );
  await clickButton('Tóm tắt rủi ro dự án đang mở');
  await waitFor(
    `document.querySelectorAll('.lunar-assistant-message-row').length >= 3
      && !document.querySelector('.lunar-assistant-typing')`,
    'Lunar AI native assistant reply'
  );
  results.virtualAssistant = await evaluate(`(() => ({
    panelRendered: Boolean(document.querySelector('[data-testid="lunar-ai-panel"]')),
    nativeMode: Boolean(document.querySelector('[data-testid="lunar-ai-panel"] .lunar-assistant-status.native')),
    secretWarning: document.querySelector('[data-testid="lunar-ai-panel"]')?.innerText.includes('Không gửi mật khẩu'),
    assistantMessages: document.querySelectorAll('.lunar-assistant-message-row.assistant').length
  }))()`);
  await clickButton('Lunar AI');
  await waitFor(
    `!document.querySelector('[data-testid="lunar-ai-panel"]')`,
    'Lunar AI assistant close'
  );

  await clickButton('Quét Code');
  await waitFor(
    `document.body.innerText.includes('Upload Repo & Chấm Điểm AI')`,
    'guest project submission modal'
  );
  await clickButton('Paste Snippet');
  await fill('textarea[placeholder*="Dán mã nguồn"]', [
    'eval(req.query.command);',
    'const password = "guest-browser-secret";'
  ].join('\n'));
  await clickButton('Bắt Đầu Phân Tích & Chấm Điểm AI');
  await waitFor(
    `Boolean(document.querySelector('[data-testid="guest-preview-summary"]'))
      && document.body.innerText.includes('Bản xem trước cho Khách')
      && document.body.innerText.includes('Mở Khóa Soi Code Chi Tiết')`,
    'guest preview masking',
    15000
  );
  results.guestPreview = {
    summaryRendered: await evaluate(`Boolean(document.querySelector('[data-testid="guest-preview-summary"]'))`),
    detailsLocked: await evaluate(`document.body.innerText.includes('Mở Khóa Soi Code Chi Tiết')`),
    autoFixLocked: await evaluate(`document.body.innerText.includes('Unlock Lunar AI Code Repair Workbench')`)
  };
  await clickButton('← Back to Overview');
  await waitFor(`document.body.innerText.includes('Code review that')`, 'landing page after guest preview');

  await clickButton('Sign In');
  await waitFor(`Boolean(document.querySelector('#auth-modal'))`, 'authentication modal');
  results.authTabs = await evaluate(`([...document.querySelectorAll('#auth-modal button')]
    .map((button) => button.textContent.replace(/\\s+/g, ' ').trim())
    .filter(Boolean))`);

  await clickButton('GitHub');
  const githubConfiguration = await evaluate(`fetch('/api/v1/auth/github/config')
    .then((response) => response.json())`);
  results.githubOAuthConfigured = Boolean(githubConfiguration.configured);
  if (!githubConfiguration.configured) {
    await clickButton('Kết Nối & Nạp GitHub Repositories');
    await waitFor(
      `document.body.innerText.includes('GitHub OAuth chưa được cấu hình')`,
      'GitHub configuration warning'
    );
    results.githubMissingConfigHandled = true;
  }

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
  const registrationSubmitted = await evaluate(`(() => {
    const form = document.querySelector('#auth-modal form');
    if (!form) return false;
    form.requestSubmit();
    return true;
  })()`);
  if (!registrationSubmitted) throw new Error('Registration form was not available for submission.');
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
  await waitFor(
    `Boolean(document.querySelector('section[aria-label="GitHub repository quick scan"]'))`,
    'GitHub quick scan combobox'
  );
  results.githubComboboxRendered = true;

  await fill(`input[placeholder="Nhập GitHub Username của bạn..."]`, 'ThanhluanGif');
  await clickButton('Tải Repos');
  await waitFor(
    `document.body.innerText.includes('dự án GitHub thật') && document.body.innerText.includes('Lunar')`,
    'public GitHub repository sync',
    15000
  );
  results.publicGitHubSync = true;

  if (githubConfiguration.configured) {
    results.workspaceGitHubConfigured = true;
  } else {
    await clickButton('Kết Nối GitHub');
    await waitFor(
      `document.body.innerText.includes('LUNAR_GITHUB_CLIENT_ID')`,
      'workspace GitHub configuration warning'
    );
    results.workspaceGitHubWarning = true;
  }

  const accountMenuOpened = await evaluate(`(() => {
    const button = document.querySelector('button[aria-haspopup="menu"]');
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!accountMenuOpened) throw new Error('Authenticated account menu was not available.');
  await clickButton('Account Settings');
  await waitFor(`Boolean(document.querySelector('#account-settings-modal'))`, 'account settings modal');
  results.accountSettings = await evaluate(`(() => ({
    rendered: Boolean(document.querySelector('#account-settings-modal')),
    profileTab: document.body.innerText.includes('Hồ sơ'),
    securityTab: document.body.innerText.includes('Bảo mật'),
    historyTab: document.body.innerText.includes('Lịch sử scan'),
    connectionsTab: document.body.innerText.includes('Kết nối')
  }))()`);
  await evaluate(`document.querySelector('#account-settings-modal button[aria-label="Đóng cài đặt tài khoản"]')?.click()`);

  await clickButton('Quét Code');
  await waitFor(
    `document.body.innerText.includes('Upload Repo & Chấm Điểm AI')`,
    'project submission modal'
  );
  await clickButton('Paste Snippet');
  await fill('textarea[placeholder*="Dán mã nguồn"]', [
    'const password = "hardcoded-browser-secret";',
    "const sql = 'SELECT * FROM users WHERE id = ' + req.query.id;",
    'db.query(sql);'
  ].join('\n'));
  await clickButton('Bắt Đầu Phân Tích & Chấm Điểm AI');
  await waitFor(
    `Boolean(document.querySelector('[data-testid="code-repair-workbench"]'))
      && Boolean(document.querySelector('[data-testid="payload-sandbox"]'))
      && document.body.innerText.includes('Defense Guide')`,
    'AI project attack simulation workbench',
    20000
  );
  results.projectSimulation = await evaluate(`(() => ({
    workbenchRendered: Boolean(document.querySelector('[data-testid="code-repair-workbench"]')),
    payloadSandboxRendered: Boolean(document.querySelector('[data-testid="payload-sandbox"]')?.innerText.trim()),
    threatBadgeRendered: document.body.innerText.includes('THREAT CRITICAL'),
    defenseGuideRendered: document.body.innerText.includes('Defense Guide'),
    applyPatchEnabled: !document.querySelector('[data-testid="apply-project-patch"]')?.disabled
  }))()`);
  const patchClicked = await evaluate(`(() => {
    const button = document.querySelector('[data-testid="apply-project-patch"]');
    if (!button || button.disabled) return false;
    button.click();
    return true;
  })()`);
  if (!patchClicked) throw new Error('The project patch button was not actionable.');
  await waitFor(
    `document.body.innerText.includes('Không phát hiện lỗ hổng có bằng chứng')`,
    'patched project rescan'
  );
  results.projectSimulation.patchAppliedAndRescanned = true;

  await clickButton('Audit Report & Badge');
  await waitFor(
    `document.body.innerText.includes('Quản trị viên chưa cấu hình Google OAuth Client cho Gmail')`,
    'audit report Gmail configuration state'
  );
  results.auditGmailFailClosed = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')]
      .find((item) => item.textContent.includes('Gửi Báo Cáo Audit Trực Tiếp Về Gmail'));
    return Boolean(button?.disabled);
  })()`);
  await evaluate(`document.querySelector('button[aria-label="Đóng báo cáo audit"]')?.click()`);

  await clickButton('Gmail Alert');
  await waitFor(
    `document.body.innerText.includes('Quản trị viên chưa cấu hình Google OAuth Client cho Lunar')`,
    'Gmail settings configuration state'
  );
  results.gmailSettingsFailClosed = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')]
      .find((item) => item.textContent.includes('Gửi thử Audit PDF'));
    return Boolean(button?.disabled);
  })()`);
  await evaluate(`document.querySelector('button[aria-label="Đóng cấu hình Gmail"]')?.click()`);

  await clickButton('Cộng Đồng Security');
  await waitFor(
    `document.body.innerText.includes('Cộng Đồng An Ninh Mạng')
      && document.body.innerText.includes('Top 3 White-Hat Hackers')`,
    'PostgreSQL community screen'
  );
  results.communityRendered = true;

  await client.send('Page.navigate', { url: `${baseUrl}/definitely-not-a-lunar-page` });
  await waitFor(
    `document.body.innerText.includes('404 · LOST IN ORBIT')
      && document.body.innerText.includes('Không tìm thấy trang này')`,
    '404 page'
  );
  results.notFoundRendered = true;

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
  if (
    !results.guestPreview?.summaryRendered
    || !results.guestPreview?.detailsLocked
    || !results.guestPreview?.autoFixLocked
    || !results.githubComboboxRendered
    || !results.virtualAssistant?.panelRendered
    || !results.virtualAssistant?.nativeMode
    || !results.virtualAssistant?.secretWarning
    || results.virtualAssistant?.assistantMessages < 2
    || !results.auditGmailFailClosed
    || !results.gmailSettingsFailClosed
    || !results.accountSettings?.rendered
    || !results.communityRendered
    || !results.notFoundRendered
  ) {
    throw new Error(`Guest/GitHub/Gmail/account/community/404 browser contract failed: ${JSON.stringify(results)}`);
  }
  if (
    !results.projectSimulation?.workbenchRendered
    || !results.projectSimulation?.payloadSandboxRendered
    || !results.projectSimulation?.threatBadgeRendered
    || !results.projectSimulation?.defenseGuideRendered
    || !results.projectSimulation?.applyPatchEnabled
    || !results.projectSimulation?.patchAppliedAndRescanned
  ) {
    throw new Error(`Project simulation UI contract failed: ${JSON.stringify(results.projectSimulation)}`);
  }
  if (runtimeErrors.length || consoleErrors.length || results.diagnostics.unexpectedHttpErrors.length) {
    throw new Error(`Browser diagnostics contain unexpected errors: ${JSON.stringify(results.diagnostics)}`);
  }

  console.log(JSON.stringify({ status: 'PASS', baseUrl, ...results }, null, 2));
  }
} finally {
  client?.close();
  if (chrome.exitCode === null) {
    const chromeExited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill('SIGTERM');
    await Promise.race([chromeExited, sleep(2000)]);
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(profileDir, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
      await sleep(200);
    }
  }
}
