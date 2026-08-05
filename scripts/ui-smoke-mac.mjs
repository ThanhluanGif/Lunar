import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const baseUrl = process.env.LUNAR_UI_URL || 'http://127.0.0.1:5050';
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
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

let serverProcess = null;
let serverLogs = '';
try {
  await fetch(`${baseUrl}/api/v1/health`);
} catch {
  const targetPort = new URL(baseUrl).port || '5050';
  serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: targetPort,
      NODE_ENV: 'test',
      LUNAR_DISABLE_RATE_LIMIT: 'true',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://lunar_admin:lunar_local_password@127.0.0.1:5433/lunar_db'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  serverProcess.stdout.on('data', (chunk) => { serverLogs += chunk.toString(); });
  serverProcess.stderr.on('data', (chunk) => { serverLogs += chunk.toString(); });
  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/v1/ready`);
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {
      // server starting up
    }
    await sleep(250);
  }
  if (!serverReady) {
    serverProcess.kill('SIGTERM');
    throw new Error(`Lunar server did not become ready: ${serverLogs.slice(-4000)}`);
  }
}

const profileDir = await mkdtemp(path.join(tmpdir(), 'lunar-ui-smoke-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-component-update',
  ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
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
  const snapshot = await evaluate(`(() => ({
    url: location.href,
    title: document.title,
    body: document.body?.innerText.slice(-3000) || '',
    workbench: Boolean(document.querySelector('[data-testid="code-repair-workbench"]')),
    payloadSandbox: Boolean(document.querySelector('[data-testid="payload-sandbox"]')),
    authModal: Boolean(document.querySelector('#auth-modal'))
  }))()`).catch(() => null);
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(snapshot)}`);
}

async function clickButton(...labels) {
  const targets = labels.flatMap((label) => (Array.isArray(label) ? label : [label]));
  const clicked = await evaluate(`(() => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const targetList = ${JSON.stringify(targets)};
    const isVisible = (elem) => Boolean(elem && (elem.offsetWidth > 0 || elem.offsetHeight > 0 || elem.getClientRects().length > 0));
    const buttons = [...document.querySelectorAll('button')].filter(isVisible);
    let button = buttons.find((item) => targetList.some((target) => normalize(item.textContent) === target));
    if (!button) {
      button = buttons.find((item) => targetList.some((target) => target.length > 3 && normalize(item.textContent).includes(target)));
    }
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Button not found: ${targets.join(' / ')}`);
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
    client.send('Log.enable'),
    client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    })
  ]);
  await client.send('Page.navigate', { url: baseUrl });
  await waitFor(
    `document.readyState === 'complete' && document.body?.innerText.includes('Lunar')`,
    'Lunar landing page'
  );

  results.page = {
    title: await evaluate('document.title'),
    rootRendered: await evaluate(`Boolean(document.querySelector('#root')?.children.length)`),
    workspaceRendered: await evaluate(`document.body.innerText.includes('Quét repository trong một luồng')`),
    quickScanNearHero: await evaluate(`(() => {
      const hero = document.querySelector('#landing-hero');
      const quickScan = document.querySelector('#github-quick-scan');
      return Boolean(hero && quickScan && hero.nextElementSibling === quickScan);
    })()`),
    quickScanModes: await evaluate(`document.querySelectorAll('.quick-scan-mode').length === 3`),
    duplicateQuickScanRemoved: await evaluate(`document.querySelectorAll('[data-testid="github-quick-scan"]').length === 1
      && !document.body.innerText.includes('Đồng Bộ GitHub Repositories Cá Nhân')`),
    guestBannerRemoved: await evaluate(`!document.body.innerText.includes('Guest Preview Mode')`),
    bottomCtaRemoved: await evaluate(`!document.body.innerText.includes('Ship better code, automatically')
      && !document.body.innerText.includes('Join 12,000+ developers')
      && !document.body.innerText.includes('Start free with GitHub')`),
    liveDashboardGuestState: await evaluate(`Boolean(document.querySelector('[data-testid="dashboard-preview-guest"]'))`),
    dashboardMockRemoved: await evaluate(`(() => {
      const previewText = document.querySelector('[data-testid="live-dashboard-preview"]')?.innerText || '';
      return previewText.includes('Khu vực này không hiển thị số liệu mẫu')
        && !previewText.includes('acme-corp/frontend')
        && !previewText.includes('PRs reviewed')
        && !previewText.includes('Auto-fixes merged');
    })()`)
  };

  await clickButton('GitHub Quick Scan');
  await sleep(600);
  results.page.heroQuickScanCta = await evaluate(`Math.abs(
    document.querySelector('#github-quick-scan').getBoundingClientRect().top
    - Number.parseFloat(getComputedStyle(document.querySelector('#github-quick-scan')).scrollMarginTop || 0)
  ) < 40`);

  const openedLocalMode = await evaluate(`(() => {
    const button = [...document.querySelectorAll('.quick-scan-mode')]
      .find((item) => item.textContent.includes('Thư mục local'));
    button?.click();
    return Boolean(button);
  })()`);
  if (!openedLocalMode) throw new Error('Local quick scan mode was not available.');
  await waitFor(
    `document.body.innerText.includes('Drop a local project folder here or choose a folder.')`,
    'local folder quick scan mode'
  );
  results.page.localQuickScanMode = true;
  await evaluate(`([...document.querySelectorAll('.quick-scan-mode')]
    .find((item) => item.textContent.includes('Repo công khai')))?.click()`);
  await waitFor(
    `Boolean(document.querySelector('input[placeholder="Username hoặc URL GitHub..."]'))`,
    'public repository quick scan mode'
  );

  await clickButton('Lunar AI');
  await waitFor(
    `Boolean(document.querySelector('[data-testid="lunar-ai-panel"]'))
      && document.body.innerText.includes('Trợ lý bảo mật')
      && document.body.innerText.includes('không gửi dữ liệu sang AI ngoài')
      && [...document.querySelectorAll('[data-testid="lunar-ai-panel"] button')]
        .some((button) => button.textContent.trim() === 'Tóm tắt rủi ro dự án đang mở')`,
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
  await evaluate(`(() => {
    const closeBtn = document.querySelector('[data-testid="lunar-ai-panel"] button[aria-label="Thu nhỏ trợ lý"]')
      || document.querySelector('[data-testid="lunar-ai-panel"] button[title="Thu nhỏ"]')
      || document.querySelector('.lunar-assistant-trigger');
    closeBtn?.click();
  })()`);
  await waitFor(
    `!document.querySelector('[data-testid="lunar-ai-panel"]')`,
    'Lunar AI assistant close'
  );

  await evaluate(`(() => {
    const btn = document.querySelector('.public-navbar__scan')
      || document.querySelector('.app-navbar-scan-action')
      || [...document.querySelectorAll('button')].find((b) => b.textContent.includes('New scan') || b.textContent.includes('Quét Code'));
    btn?.click();
  })()`);
  await waitFor(
    `document.body.innerText.includes('Tạo phiên quét bảo mật')`,
    'guest project submission modal'
  );
  await clickButton('Paste Snippet');
  await fill('textarea[placeholder*="Dán mã nguồn"]', [
    'eval(req.query.command);',
    'const password = "guest-browser-secret";'
  ].join('\n'));
  await clickButton('Bắt đầu quét bảo mật');
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

  await clickButton('Đăng nhập');
  await waitFor(`Boolean(document.querySelector('#auth-modal'))`, 'authentication modal');
  results.githubAuthDefault = await evaluate(`document.querySelector('#auth-modal-title')?.textContent.toLowerCase().includes('github')
    && Boolean(document.querySelector('[data-testid="github-oauth-continue"]'))`);
  results.authTabs = await evaluate(`([...document.querySelectorAll('#auth-modal button')]
    .map((button) => button.textContent.replace(/\\s+/g, ' ').trim())
    .filter(Boolean))`);

  results.githubAuthSimplified = await evaluate(`(() => ({
    singleAction: Boolean(document.querySelector('[data-testid="github-oauth-continue"]'))
      && document.querySelector('[data-testid="github-oauth-continue"]')?.textContent.includes('Tiếp Tục Với GitHub'),
    redundantInputRemoved: ![...document.querySelectorAll('#auth-modal input')]
      .some((input) => input.value === 'GitHub OAuth'),
    explainsSingleStep: document.querySelector('#auth-modal')?.innerText.includes('chỉ trong một bước'),
    methodTabsRemoved: ![...document.querySelectorAll('#auth-modal button')]
      .some((button) => ['Email', 'GitHub'].includes(button.textContent.trim()))
  }))()`);
  const githubConfiguration = await evaluate(`fetch('/api/v1/auth/github/config')
    .then((response) => response.json())`);
  results.githubOAuthConfigured = Boolean(githubConfiguration.configured);
  results.githubOAuthFlow = githubConfiguration.authFlow;
  results.githubOAuthRedirectMode = githubConfiguration.redirectMode;
  if (!githubConfiguration.configured) {
    await clickButton('Tiếp Tục Với GitHub');
    await waitFor(
      `document.body.innerText.includes('GitHub OAuth chưa được cấu hình')`,
      'GitHub configuration warning'
    );
    results.githubMissingConfigHandled = true;
  } else if (githubConfiguration.authFlow === 'device') {
    await clickButton('Tiếp Tục Với GitHub');
    await waitFor(
      `Boolean(document.querySelector('[data-testid="github-device-authorization"]'))
        && Boolean(document.querySelector('[data-testid="github-device-code"]')?.textContent.trim())`,
      'GitHub Device Flow authorization code',
      15000
    );
    results.githubDeviceFlow = await evaluate(`(() => ({
      authorizationRendered: Boolean(document.querySelector('[data-testid="github-device-authorization"]')),
      codeRendered: Boolean(document.querySelector('[data-testid="github-device-code"]')?.textContent.trim()),
      waitingState: document.querySelector('#auth-modal')?.innerText.includes('Đang chờ xác nhận trên GitHub')
    }))()`);
  }

  await evaluate(`document.querySelector('#auth-modal button[aria-label="Đóng hộp đăng nhập"]')?.click()`);
  await waitFor(`!document.querySelector('#auth-modal')`, 'modal close');

  await clickButton('Đăng nhập');
  await waitFor(`Boolean(document.querySelector('#auth-modal'))`, 'authentication modal');
  await clickButton('Đăng nhập bằng email');
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
    `Boolean(document.querySelector('[data-testid="dashboard-preview-live"]'))
      && document.querySelector('[data-testid="live-dashboard-preview"]')?.innerText.includes('PostgreSQL · dữ liệu tài khoản thật')`,
    'authenticated live dashboard preview'
  );
  results.liveDashboardAuthenticated = await evaluate(`(() => ({
    rendered: Boolean(document.querySelector('[data-testid="dashboard-preview-live"]')),
    verifiedSource: document.querySelector('[data-testid="live-dashboard-preview"]')?.innerText.includes('PostgreSQL · dữ liệu tài khoản thật'),
    mockAccountAbsent: !document.querySelector('[data-testid="live-dashboard-preview"]')?.innerText.includes('acme-corp')
  }))()`);
  await waitFor(
    `Boolean(document.querySelector('section[aria-label="GitHub repository quick scan"]'))`,
    'GitHub quick scan workspace'
  );
  results.githubComboboxRendered = true;

  await fill(`input[placeholder="Username hoặc URL GitHub..."]`, 'https://github.com/ThanhluanGif/');
  await clickButton('Tải Repos');
  await waitFor(
    `Boolean(document.querySelector('.quick-scan-repository-list'))
      && document.querySelector('[data-testid="github-quick-scan"]')?.innerText.includes('ThanhluanGif/Lunar')`,
    'public GitHub repository sync',
    15000
  );
  results.publicGitHubSync = true;
  results.publicGitHubProfileUrlAccepted = true;

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
  await clickButton('Account settings', 'Account Settings');
  await waitFor(`Boolean(document.querySelector('#account-settings-modal'))`, 'account settings modal');
  results.accountSettings = await evaluate(`(() => ({
    rendered: Boolean(document.querySelector('#account-settings-modal')),
    profileTab: document.body.innerText.includes('Hồ sơ'),
    securityTab: document.body.innerText.includes('Bảo mật'),
    historyTab: document.body.innerText.includes('Lịch sử scan'),
    connectionsTab: document.body.innerText.includes('Kết nối')
  }))()`);
  await evaluate(`document.querySelector('#account-settings-modal button[aria-label="Đóng cài đặt tài khoản"]')?.click()`);

  await evaluate(`(() => {
    const btn = document.querySelector('.public-navbar__scan')
      || document.querySelector('.app-navbar-scan-action')
      || [...document.querySelectorAll('button')].find((b) => b.textContent.includes('New scan') || b.textContent.includes('Quét Code'));
    btn?.click();
  })()`);
  await waitFor(
    `document.body.innerText.includes('Tạo phiên quét bảo mật')`,
    'project submission modal'
  );
  await clickButton('Paste Snippet');
  await fill('textarea[placeholder*="Dán mã nguồn"]', [
    'const password = "hardcoded-browser-secret";',
    "const sql = 'SELECT * FROM users WHERE id = ' + req.query.id;",
    'db.query(sql);'
  ].join('\n'));
  await clickButton('Bắt đầu quét bảo mật');
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
    threatBadgeRendered: document.body.innerText.includes('THREAT CRITICAL') || document.body.innerText.includes('CRITICAL'),
    defenseGuideRendered: document.body.innerText.includes('Defense Guide'),
    patchActionRendered: Boolean(document.querySelector('[data-testid="apply-project-patch"]')),
    patchUnavailableGuard: Boolean(document.querySelector('[data-testid="code-repair-workbench"] [role="status"]'))
  }))()`);

  await clickButton('Audit Report & Badge', 'Báo Cáo Kiểm Định An Ninh');
  await waitFor(
    `document.body.innerText.includes('Tải Full Remediation Report (PDF)') || document.body.innerText.includes('Báo Cáo Kiểm Định An Ninh')`,
    'audit report PDF action'
  );
  results.auditReportAvailable = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')]
      .find((item) => item.textContent.includes('Tải Full Remediation Report') || item.textContent.includes('Tải Báo Cáo'));
    return Boolean(button && !button.disabled);
  })()`);
  await evaluate(`document.querySelector('button[aria-label="Đóng báo cáo audit"]')?.click()`);

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

  if (
    !results.page.rootRendered
    || !results.page.workspaceRendered
    || !results.page.quickScanNearHero
    || !results.page.quickScanModes
    || !results.page.duplicateQuickScanRemoved
    || !results.page.heroQuickScanCta
    || !results.page.localQuickScanMode
    || !results.page.guestBannerRemoved
    || !results.page.bottomCtaRemoved
    || !results.page.liveDashboardGuestState
    || !results.page.dashboardMockRemoved
  ) {
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
    || !results.publicGitHubProfileUrlAccepted
    || (results.githubOAuthConfigured && results.githubOAuthRedirectMode !== 'registered')
    || !results.githubAuthDefault
    || !results.githubAuthSimplified?.singleAction
    || !results.githubAuthSimplified?.redundantInputRemoved
    || !results.githubAuthSimplified?.explainsSingleStep
    || !results.githubAuthSimplified?.methodTabsRemoved
    || !results.virtualAssistant?.panelRendered
    || !results.virtualAssistant?.nativeMode
    || !results.virtualAssistant?.secretWarning
    || results.virtualAssistant?.assistantMessages < 2
    || !results.auditReportAvailable
    || !results.accountSettings?.rendered
    || !results.liveDashboardAuthenticated?.rendered
    || !results.liveDashboardAuthenticated?.verifiedSource
    || !results.liveDashboardAuthenticated?.mockAccountAbsent
    || !results.notFoundRendered
  ) {
    throw new Error(`Guest/GitHub/account/report/404 browser contract failed: ${JSON.stringify(results)}`);
  }
  if (
    !results.projectSimulation?.workbenchRendered
    || !results.projectSimulation?.payloadSandboxRendered
    || !results.projectSimulation?.threatBadgeRendered
    || !results.projectSimulation?.defenseGuideRendered
    || results.projectSimulation?.patchActionRendered
    || !results.projectSimulation?.patchUnavailableGuard
  ) {
    throw new Error(`Project simulation UI contract failed: ${JSON.stringify(results.projectSimulation)}`);
  }
  if (runtimeErrors.length || consoleErrors.length || results.diagnostics.unexpectedHttpErrors.length) {
    throw new Error(`Browser diagnostics contain unexpected errors: ${JSON.stringify(results.diagnostics)}`);
  }

  console.log(JSON.stringify({ status: 'PASS', baseUrl, ...results }, null, 2));
} finally {
  client?.close();
  serverProcess?.kill('SIGTERM');
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
