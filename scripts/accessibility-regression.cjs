const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const port = 6600 + Math.floor(Math.random() * 250);
const baseUrl = `http://127.0.0.1:${port}`;
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
  throw new Error('Chrome/Chromium was not found. Set CHROME_BIN for the accessibility gate.');
}

const child = spawn(process.execPath, ['server/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'production',
    LOG_LEVEL: 'WARN',
    JWT_SECRET: 'accessibility-secret-at-least-32-characters',
    DATABASE_URL: 'postgresql://127.0.0.1:1/accessibility_unavailable',
    GEMINI_API_KEY: '',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    AI_GATEWAY_API_KEY: '',
    VERCEL_OIDC_TOKEN: '',
    AUTH_EMAIL_DRY_RUN: 'true',
    AUTH_EMAIL_ALLOW_INSECURE_BASE_URL: 'true',
    AUTH_EMAIL_BASE_URL: baseUrl,
    PAYMENT_WEBHOOK_SECRET: '',
    GITHUB_CLIENT_ID: '',
    GITHUB_CLIENT_SECRET: '',
    GITHUB_TOKEN_ENCRYPTION_KEY: ''
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverLogs = '';
child.stdout.on('data', (data) => { serverLogs += data; });
child.stderr.on('data', (data) => { serverLogs += data; });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/health`);
      if (response.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Accessibility server did not start.\n${serverLogs}`);
}

async function injectAxe(page) {
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  await page.evaluate(axeSource);
}

async function runAxe(page, context = 'document') {
  const result = await page.evaluate(async (target) => {
    const root = target === 'document' ? document : document.querySelector(target);
    return window.axe.run(root, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
      }
    });
  }, context);
  return result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      failureSummary: node.failureSummary
    }))
  }));
}

async function markLoginTrigger(page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll('button, a')];
    const trigger = candidates.find((element) => {
      const style = window.getComputedStyle(element);
      const visible = style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.getBoundingClientRect().width > 0
        && element.getBoundingClientRect().height > 0;
      return visible && /(đăng nhập|login)/i.test(element.textContent || '');
    });
    if (!trigger) return null;
    trigger.setAttribute('data-a11y-login-trigger', 'true');
    return trigger.textContent.trim();
  });
}

async function verifyDialogKeyboardContract(page) {
  const triggerText = await markLoginTrigger(page);
  if (!triggerText) throw new Error('Could not find a visible login trigger for dialog accessibility testing.');
  await page.click('[data-a11y-login-trigger="true"]');
  await page.waitForSelector('[role="dialog"][aria-modal="true"]', { visible: true, timeout: 5000 });
  await sleep(100);

  const dialogState = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    const labelledBy = dialog?.getAttribute('aria-labelledby');
    const accessibleName = dialog?.getAttribute('aria-label')
      || (labelledBy ? document.getElementById(labelledBy)?.textContent?.trim() : '');
    return {
      accessibleName,
      focusInside: Boolean(dialog?.contains(document.activeElement))
    };
  });
  if (!dialogState.accessibleName || !dialogState.focusInside) {
    throw new Error(`Dialog name/focus contract failed: ${JSON.stringify(dialogState)}`);
  }

  const dialogViolations = await runAxe(page, '[role="dialog"][aria-modal="true"]');
  if (dialogViolations.length) {
    throw new Error(`axe dialog violations:\n${JSON.stringify(dialogViolations, null, 2)}`);
  }

  const focusableCount = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    const focusable = [...dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.getBoundingClientRect().width > 0
        && element.getBoundingClientRect().height > 0;
    });
    focusable.forEach((element, index) => element.setAttribute('data-a11y-focus-index', String(index)));
    return focusable.length;
  });
  if (focusableCount < 2) throw new Error('Dialog does not expose enough focusable controls.');

  await page.focus(`[data-a11y-focus-index="${focusableCount - 1}"]`);
  await page.keyboard.press('Tab');
  const wrappedForward = await page.evaluate(() => document.activeElement?.getAttribute('data-a11y-focus-index') === '0');
  if (!wrappedForward) throw new Error('Tab escaped the dialog instead of wrapping to the first control.');

  await page.focus('[data-a11y-focus-index="0"]');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  const wrappedBackward = await page.evaluate((lastIndex) => (
    document.activeElement?.getAttribute('data-a11y-focus-index') === String(lastIndex)
  ), focusableCount - 1);
  if (!wrappedBackward) throw new Error('Shift+Tab escaped the dialog instead of wrapping to the last control.');

  await page.keyboard.press('Escape');
  await page.waitForSelector('[role="dialog"][aria-modal="true"]', { hidden: true, timeout: 5000 });
  await page.waitForFunction(
    () => document.activeElement?.matches('[data-a11y-login-trigger="true"]'),
    { timeout: 2000 }
  );
  const restored = await page.evaluate(() => document.activeElement?.matches('[data-a11y-login-trigger="true"]'));
  if (!restored) throw new Error('Focus was not restored to the dialog trigger after Escape.');

  return { triggerText, focusableCount, accessibleName: dialogState.accessibleName };
}

async function verifyEffectiveZoomLayout(page) {
  await page.setViewport({ width: 640, height: 720, deviceScaleFactor: 2 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#root', { visible: true });
  await sleep(500);
  await injectAxe(page);
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflowing: [...document.querySelectorAll('body *')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.right > document.documentElement.clientWidth + 1
          || element.scrollWidth > document.documentElement.clientWidth + 1;
      })
      .slice(0, 12)
      .map((element) => ({
        tag: element.tagName,
        className: typeof element.className === 'string' ? element.className : '',
        text: String(element.textContent || '').trim().slice(0, 80),
        right: Number(element.getBoundingClientRect().right.toFixed(1)),
        width: Number(element.getBoundingClientRect().width.toFixed(1)),
        scrollWidth: element.scrollWidth
      }))
  }));
  if (layout.scrollWidth > layout.clientWidth + 1 || layout.bodyScrollWidth > layout.clientWidth + 1) {
    throw new Error(`Effective 200% zoom layout has horizontal overflow: ${JSON.stringify(layout)}`);
  }
  const violations = await runAxe(page);
  if (violations.length) {
    throw new Error(`axe violations at effective 200% zoom:\n${JSON.stringify(violations, null, 2)}`);
  }
  return {
    clientWidth: layout.clientWidth,
    scrollWidth: layout.scrollWidth,
    bodyScrollWidth: layout.bodyScrollWidth
  };
}

async function run() {
  let browser;
  try {
    await waitForServer();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setBypassCSP(true);
    const browserErrors = [];
    page.on('console', (message) => {
      const text = message.text();
      if (message.type() === 'error' && !/^Failed to load resource: .*401 \(Unauthorized\)$/.test(text)) {
        browserErrors.push(`console: ${text}`);
      }
    });
    page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
    page.on('response', (response) => {
      const expectedAnonymousSessionProbe = response.status() === 401
        && new URL(response.url()).pathname === '/api/v1/auth/me';
      if (response.status() >= 400 && !expectedAnonymousSessionProbe) {
        browserErrors.push(`response: ${response.status()} ${response.url()}`);
      }
    });
    page.on('requestfailed', (request) => {
      browserErrors.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`);
    });

    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#root', { visible: true });
    await sleep(700);
    await injectAxe(page);

    const pageViolations = await runAxe(page);
    if (pageViolations.length) {
      throw new Error(`axe page violations:\n${JSON.stringify(pageViolations, null, 2)}`);
    }
    const dialog = await verifyDialogKeyboardContract(page);
    const zoom = await verifyEffectiveZoomLayout(page);

    if (browserErrors.length) {
      throw new Error(`Browser errors detected:\n${browserErrors.join('\n')}`);
    }

    console.log(JSON.stringify({
      axeWcagAa: 'PASS',
      accessibleNamesAndAria: 'PASS',
      dialogKeyboardAndFocusTrap: 'PASS',
      focusRestore: 'PASS',
      effectiveZoom200: 'PASS',
      chromeExecutable: path.basename(executablePath),
      dialog,
      zoom
    }, null, 2));
  } finally {
    await browser?.close().catch(() => {});
    child.kill();
  }
}

run().catch((error) => {
  console.error(error.stack);
  if (serverLogs) console.error(serverLogs);
  child.kill();
  process.exitCode = 1;
});
