const { spawn } = require('child_process');
const crypto = require('crypto');
const { Pool } = require('pg');

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
    ADMIN_BOOTSTRAP_TOKEN: process.env.ADMIN_BOOTSTRAP_TOKEN || 'qa-one-time-admin-bootstrap-token',
    GEMINI_API_KEY: '',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    GMAIL_DRY_RUN: 'true',
    GMAIL_CLIENT_ID: 'qa-google-oauth-client',
    GMAIL_CLIENT_SECRET: 'qa-google-oauth-secret',
    GMAIL_OAUTH_CALLBACK_URL: `${baseUrl}/api/v1/notifications/gmail/oauth/callback`,
    GMAIL_TOKEN_ENCRYPTION_KEY: 'qa-gmail-token-encryption-key-at-least-32-characters',
    AUTH_EMAIL_DRY_RUN: 'true',
    AUTH_EMAIL_BASE_URL: baseUrl
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

async function verifyGmailOAuthServiceContract() {
  const managedKeys = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_OAUTH_CALLBACK_URL',
    'GMAIL_TOKEN_ENCRYPTION_KEY'
  ];
  const previous = Object.fromEntries(managedKeys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    GMAIL_CLIENT_ID: 'service-contract-client',
    GMAIL_CLIENT_SECRET: 'service-contract-secret',
    GMAIL_OAUTH_CALLBACK_URL: 'http://localhost:5050/api/v1/notifications/gmail/oauth/callback',
    GMAIL_TOKEN_ENCRYPTION_KEY: 'service-contract-encryption-key-at-least-32-characters'
  });
  try {
    const oauth = require('../server/services/gmailOAuthService');
    const refreshToken = 'qa-refresh-token-must-never-be-stored-in-plaintext';
    const encrypted = oauth.encryptRefreshToken(refreshToken);
    if (encrypted.includes(refreshToken) || oauth.decryptRefreshToken(encrypted) !== refreshToken) {
      throw new Error('Gmail refresh token encryption-at-rest contract failed.');
    }

    const exchanged = await oauth.exchangeAuthorizationCode('qa-authorization-code', async (url, options) => {
      if (
        !url.endsWith('/token')
        || !String(options.body).includes('grant_type=authorization_code')
      ) {
        throw new Error('OAuth authorization-code exchange request is malformed.');
      }
      return new Response(JSON.stringify({
        access_token: 'qa-access-token',
        refresh_token: refreshToken,
        scope: 'openid email https://www.googleapis.com/auth/gmail.send'
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const identity = await oauth.fetchGoogleIdentity(exchanged.access_token, async () => (
      new Response(JSON.stringify({
        sub: 'google-user-123',
        email: 'qa-user@example.com',
        email_verified: true
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    ));
    const refreshed = await oauth.refreshUserAccessToken(encrypted, async (url, options) => {
      if (!String(options.body).includes('grant_type=refresh_token')) {
        throw new Error('OAuth refresh request is malformed.');
      }
      return new Response(JSON.stringify({
        access_token: 'qa-refreshed-access-token',
        expires_in: 3600
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const revoked = await oauth.revokeUserGrant(encrypted, async (url, options) => {
      if (!String(options.body).includes('token=qa-refresh-token')) {
        throw new Error('OAuth revocation request is malformed.');
      }
      return new Response('', { status: 200 });
    });
    const gmail = require('../server/services/gmailService');
    let rawMime = '';
    const delivery = await gmail.sendGmailApiMessage({
      mode: 'user-oauth',
      senderEmail: 'connected-sender@example.com',
      accessToken: 'short-lived-access-token'
    }, {
      to: 'lunar-account@example.com',
      subject: 'Lunar Gmail API contract',
      text: 'Least-privilege Gmail API delivery.'
    }, async (url, options) => {
      const requestBody = JSON.parse(options.body);
      rawMime = Buffer.from(requestBody.raw, 'base64url').toString('utf8');
      if (
        !url.includes('/gmail/v1/users/me/messages/send')
        || options.headers.Authorization !== 'Bearer short-lived-access-token'
      ) {
        throw new Error('Gmail API send request is malformed.');
      }
      return new Response(JSON.stringify({ id: 'gmail-message-123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });
    if (
      identity.email !== 'qa-user@example.com'
      || refreshed.accessToken !== 'qa-refreshed-access-token'
      || !revoked
      || delivery.messageId !== 'gmail-message-123'
      || !rawMime.includes('connected-sender@example.com')
      || !rawMime.includes('lunar-account@example.com')
    ) {
      throw new Error('Gmail OAuth exchange/identity/refresh/revoke/send contract failed.');
    }
  } finally {
    managedKeys.forEach((key) => {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    });
  }
}

async function run() {
  let qaPool;
  try {
    await verifyGmailOAuthServiceContract();
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

    const guestPreview = await request('/api/v1/scans/guest-preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'eval(req.query.command);\\nconst password = \"guest-secret-value\";',
        filename: 'guest-fixture.js'
      })
    });
    const serializedGuestPreview = JSON.stringify(guestPreview.body);
    if (
      !guestPreview.body.isGuestPreview
      || guestPreview.body.stats.criticalCount < 1
      || serializedGuestPreview.includes('lineNumber')
      || serializedGuestPreview.includes('codeSnippet')
      || serializedGuestPreview.includes('suggestedPatch')
      || serializedGuestPreview.includes('req.query.command')
    ) {
      throw new Error('Guest preview leaked protected finding evidence.');
    }
    await request('/api/v1/scans/guest-preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'x'.repeat(100 * 1024 + 1), filename: 'oversized.js' })
    }, 413);

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
    if (regular.user.emailVerified !== false) {
      throw new Error('Password registration unexpectedly bypassed email verification.');
    }

    const forgotPassword = await request('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: regular.user.email })
    });
    if (!forgotPassword.body.success || JSON.stringify(forgotPassword.body).includes(regular.user.id)) {
      throw new Error('Forgot-password response leaked account state.');
    }

    qaPool = new Pool({ connectionString: process.env.DATABASE_URL });
    const { PURPOSES, issueAccountToken } = require('../server/services/accountTokenService');
    const resetToken = await issueAccountToken(qaPool, {
      userId: regular.user.id,
      purpose: PURPOSES.PASSWORD_RESET,
      ttlMinutes: 30
    });
    await request('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: 'ResetPass123!' })
    });
    const resetLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: regular.user.email, password: 'ResetPass123!' })
    });
    regular.cookie = cookieFrom(resetLogin.response);

    const verificationToken = await issueAccountToken(qaPool, {
      userId: regular.user.id,
      purpose: PURPOSES.EMAIL_VERIFICATION,
      ttlMinutes: 60
    });
    await request('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: verificationToken })
    });
    await request('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: verificationToken })
    }, 400);
    const verifiedMe = await request('/api/v1/auth/me', {
      headers: { cookie: regular.cookie }
    });
    if (!verifiedMe.body.user.emailVerified) {
      throw new Error('Email verification did not persist.');
    }

    const accountUpdate = await request('/api/v1/auth/account', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: regular.cookie },
      body: JSON.stringify({ name: 'QA User Updated' })
    });
    if (accountUpdate.body.user.name !== 'QA User Updated') {
      throw new Error('Account profile update did not persist.');
    }
    const previousSessionCookie = regular.cookie;
    const changedPassword = await request('/api/v1/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: regular.cookie },
      body: JSON.stringify({
        currentPassword: 'ResetPass123!',
        newPassword: 'ChangedPass123!'
      })
    });
    await request('/api/v1/auth/me', {
      headers: { cookie: previousSessionCookie }
    }, 401);
    regular.cookie = cookieFrom(changedPassword.response);

    const userAccess = await request('/api/v1/dashboard/access', { headers: { cookie: regular.cookie } });
    if (userAccess.body.identity !== 'FREE') {
      throw new Error('FREE user access profile is incorrect.');
    }
    await request('/api/v1/admin/overview', { headers: { cookie: regular.cookie } }, 403);

    const githubRepositories = await request('/api/v1/auth/github/repositories', {
      headers: { cookie: regular.cookie }
    });
    if (!Array.isArray(githubRepositories.body.repositories)) {
      throw new Error('GitHub repository combobox endpoint did not return a repository array.');
    }
    await request('/api/v1/auth/github/repositories', {}, 401);

    const gmailStatus = await request('/api/v1/notifications/gmail/status', {
      headers: { cookie: regular.cookie }
    });
    if (
      !gmailStatus.body.configured
      || !gmailStatus.body.oauthConfigured
      || !gmailStatus.body.connected
      || !gmailStatus.body.canSend
      || gmailStatus.body.mode !== 'dry-run'
      || gmailStatus.body.connection?.email !== regular.user.email
      || JSON.stringify(gmailStatus.body).includes('refreshToken')
      || JSON.stringify(gmailStatus.body).includes('accessToken')
      || JSON.stringify(gmailStatus.body).includes('clientSecret')
    ) {
      throw new Error('Per-user Gmail OAuth status contract is invalid in QA dry-run mode.');
    }
    await request('/api/v1/notifications/gmail/oauth/start', {}, 401);
    await request('/api/v1/notifications/gmail/disconnect', { method: 'POST' }, 401);
    const gmailOAuthStart = await request('/api/v1/notifications/gmail/oauth/start', {
      headers: { cookie: regular.cookie },
      redirect: 'manual'
    }, 302);
    const gmailAuthorizationUrl = new URL(gmailOAuthStart.response.headers.get('location'));
    if (
      gmailAuthorizationUrl.origin !== 'https://accounts.google.com'
      || gmailAuthorizationUrl.searchParams.get('access_type') !== 'offline'
      || !gmailAuthorizationUrl.searchParams.get('scope')?.includes('gmail.send')
      || gmailAuthorizationUrl.searchParams.get('redirect_uri')
        !== `${baseUrl}/api/v1/notifications/gmail/oauth/callback`
    ) {
      throw new Error('Gmail OAuth authorization redirect is missing least-privilege parameters.');
    }
    const oauthStateCookie = gmailOAuthStart.response.headers.get('set-cookie')?.split(';')[0];
    const oauthSetCookie = gmailOAuthStart.response.headers.get('set-cookie') || '';
    if (
      !oauthStateCookie?.startsWith('gmail_oauth_state=')
      || !/HttpOnly/i.test(oauthSetCookie)
      || !/SameSite=Lax/i.test(oauthSetCookie)
    ) {
      throw new Error('Gmail OAuth start did not issue an HttpOnly state cookie.');
    }
    const invalidState = await request(
      '/api/v1/notifications/gmail/oauth/callback?state=invalid&code=not-exchanged',
      {
        headers: { cookie: `${regular.cookie}; ${oauthStateCookie}` },
        redirect: 'manual'
      },
      302
    );
    if (!invalidState.response.headers.get('location')?.includes('gmail_auth=invalid_state')) {
      throw new Error('Gmail OAuth callback did not reject an invalid CSRF state.');
    }
    await request('/api/v1/notifications/gmail/audit-report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectTitle: 'Unauthorized report' })
    }, 401);
    const preferences = await request('/api/v1/notifications/gmail/preferences', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie: regular.cookie },
      body: JSON.stringify({ instantCritical: true, weeklyDigest: false, proReceipt: true })
    });
    if (preferences.body.preferences.weeklyDigest !== false) {
      throw new Error('Gmail notification preferences did not persist.');
    }
    const gmailDelivery = await request('/api/v1/notifications/gmail/audit-report', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: regular.cookie },
      body: JSON.stringify({
        recipientEmail: 'attacker-controlled@example.com',
        projectTitle: 'QA Security Report',
        scanSummary: { stats: { maxCvss: 9.2, criticalCount: 1, highCount: 2, total: 3 } }
      })
    });
    if (
      gmailDelivery.body.mode !== 'dry-run'
      || gmailDelivery.body.recipient !== regular.user.email
      || gmailDelivery.body.senderEmail !== regular.user.email
      || !gmailDelivery.body.attachmentName?.endsWith('.pdf')
    ) {
      throw new Error('Gmail delivery did not enforce the account email and PDF attachment contract.');
    }
    const gmailHistory = await request('/api/v1/notifications/gmail/history', {
      headers: { cookie: regular.cookie }
    });
    if (
      !gmailHistory.body.emails?.length
      || gmailHistory.body.emails[0].recipientEmail !== regular.user.email
      || gmailHistory.body.emails[0].senderEmail !== regular.user.email
    ) {
      throw new Error('Gmail delivery history was not persisted.');
    }

    const aiProviders = await request('/api/v1/ai/providers', {
      headers: { cookie: regular.cookie }
    });
    const externalAiProviders = aiProviders.body.providers.filter((provider) => provider.id !== 'lunar-sast-native');
    if (externalAiProviders.some((provider) => provider.configured)) {
      throw new Error('QA expected external AI providers to be disabled.');
    }
    if (!aiProviders.body.providers.some((provider) => provider.id === 'lunar-sast-native' && provider.configured)) {
      throw new Error('Native project simulation provider is unavailable.');
    }
    await request('/api/v1/ai/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: regular.cookie },
      body: JSON.stringify({ code: 'const value = input;', filename: 'fixture.js', provider: 'gemini' })
    }, 503);

    const projectSimulation = await request('/api/v1/ai/project-attack-simulation', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: regular.cookie },
      body: JSON.stringify({
        provider: 'lunar-sast-native',
        repositoryName: 'qa-cross-file-project',
        projectFiles: [
          {
            path: 'server/routes/adminRoutes.js',
            language: 'javascript',
            content: "router.get('/admin/users', adminController.listUsers);"
          },
          {
            path: 'server/controllers/adminController.js',
            language: 'javascript',
            content: "const sql = 'SELECT * FROM users WHERE id = ' + req.query.id;\nreturn db.query(sql);"
          },
          {
            path: 'server/db/connection.js',
            language: 'javascript',
            content: 'module.exports = { query: (sql) => pool.query(sql) };'
          }
        ]
      })
    });
    const simulatedFinding = projectSimulation.body.simulation?.findings?.[0];
    if (
      projectSimulation.body.provider !== 'lunar-sast-native'
      || !simulatedFinding?.hackerAttackVector?.exploitPayload
      || !Array.isArray(simulatedFinding?.hackerAttackVector?.attackChain)
      || !simulatedFinding?.remediation?.patchCode
      || !Array.isArray(simulatedFinding?.remediation?.stepByStepGuide)
    ) {
      throw new Error('Project attack simulation did not satisfy the multi-file response contract.');
    }

    const deepCapabilities = await request('/api/v1/deep-scans/capabilities', {
      headers: { cookie: regular.cookie }
    });
    if (deepCapabilities.body.supportedLanguages.length < 20) {
      throw new Error('Deep scanner does not advertise 20+ supported languages.');
    }
    await request('/api/v1/deep-scans/repository', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: regular.cookie },
      body: JSON.stringify({ repository: 'ThanhluanGif/Lunar' })
    }, 409);

    const scannerModule = await import('../src/services/securityScannerEngine.js');
    const deterministicScan = scannerModule.scanCodeForSecurityVulnerabilities(
      `const password = "hardcoded-secret";
eval(userInput);`,
      'fixture.js'
    );
    if (
      scannerModule.SECURITY_RULE_SIGNATURE_COUNT < 100
      || deterministicScan.stats.criticalCount < 2
    ) {
      throw new Error('Expanded deterministic SAST rules did not detect the security fixture.');
    }

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
    let criticalAlert;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const history = await request('/api/v1/notifications/gmail/history', {
        headers: { cookie: regular.cookie }
      });
      criticalAlert = history.body.emails?.find((email) => email.emailType === 'CRITICAL_ALERT');
      if (criticalAlert) break;
      await sleep(50);
    }
    if (
      !criticalAlert
      || criticalAlert.senderEmail !== regular.user.email
      || criticalAlert.recipientEmail !== regular.user.email
    ) {
      throw new Error('Critical scan did not dispatch a per-user Gmail alert.');
    }

    const scanHistory = await request('/api/v1/auth/scan-history', {
      headers: { cookie: regular.cookie }
    });
    if (!scanHistory.body.scans?.some((item) => item.id === scan.body.scan.id)) {
      throw new Error('Account scan history did not include the persisted scan.');
    }

    const communityPost = await request('/api/v1/community/audits', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: regular.cookie },
      body: JSON.stringify({
        title: 'QA detects unsafe dynamic execution',
        targetRepo: 'qa/security-fixture',
        vulnerabilityType: 'Dynamic execution',
        severity: 'critical',
        content: 'This QA community report contains enough detail to validate PostgreSQL persistence.'
      })
    }, 201);
    const communityFeed = await request('/api/v1/community/audits');
    if (!communityFeed.body.audits?.some((item) => item.id === communityPost.body.audit.id)) {
      throw new Error('Community audit was not served from PostgreSQL.');
    }
    const firstUpvote = await request(`/api/v1/community/audits/${communityPost.body.audit.id}/upvote`, {
      method: 'POST',
      headers: { cookie: regular.cookie }
    });
    const duplicateUpvote = await request(`/api/v1/community/audits/${communityPost.body.audit.id}/upvote`, {
      method: 'POST',
      headers: { cookie: regular.cookie }
    });
    if (duplicateUpvote.body.upvotes !== firstUpvote.body.upvotes || !duplicateUpvote.body.alreadyUpvoted) {
      throw new Error('Community upvote idempotency failed.');
    }
    const communityLeaderboard = await request('/api/v1/community/leaderboard');
    if (!communityLeaderboard.body.leaders?.length || !Array.isArray(communityLeaderboard.body.projects)) {
      throw new Error('Community leaderboard did not return persisted users and projects.');
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
    const paymentEventPayload = JSON.stringify({
      eventId: `qa-event-${uniqueId}`,
      transactionId: `qa-transaction-${uniqueId}`,
      orderCode,
      amount: createOrder.body.order.amount,
      status: 'PAID'
    });
    await request('/api/v1/payment/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: paymentEventPayload
    }, 401);
    const paymentSignature = crypto
      .createHmac('sha256', 'qa-payment-webhook-secret')
      .update(paymentEventPayload)
      .digest('hex');
    const webhookConfirmation = await request('/api/v1/payment/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lunar-signature': `sha256=${paymentSignature}`
      },
      body: paymentEventPayload
    });
    const webhookRetry = await request('/api/v1/payment/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lunar-signature': `sha256=${paymentSignature}`
      },
      body: paymentEventPayload
    });
    if (webhookConfirmation.body.status !== 'SUCCESS' || !webhookRetry.body.idempotent) {
      throw new Error('Signed payment webhook or event idempotency failed.');
    }
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
      guestPreviewMasking: 'PASS',
      githubComboboxContract: 'PASS',
      accountRecoveryAndVerification: 'PASS',
      accountSettingsAndScanHistory: 'PASS',
      communityPersistence: 'PASS',
      gmailPerUserOAuthContract: 'PASS',
      userRbac: 'PASS',
      persistedDashboard: 'PASS',
      aiFailClosed: 'PASS',
      deepScanGuard: 'PASS',
      sastRuleSignatures: scannerModule.SECURITY_RULE_SIGNATURE_COUNT,
      adminRbac: 'PASS',
      auditedAdminActions: auditLog.body.logs.length,
      signedPaymentWebhook: paymentStatus.body.status
    }, null, 2));
  } finally {
    await qaPool?.end();
    child.kill();
  }
}

run().catch((error) => {
  console.error(error.stack);
  console.error(serverLogs);
  child.kill();
  process.exitCode = 1;
});
