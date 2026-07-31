const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, optionalToken, verifyToken } = require('../middleware/auth');
const {
  githubAuthPollRateLimiter,
  githubAuthStartRateLimiter
} = require('../middleware/rateLimiter');
const { getPool } = require('../db/connection');
const {
  UNVERIFIED_EMAIL_LINK_CODE,
  githubEmailMatchesLunarAccount,
  resolveVerifiedEmailAutoLink
} = require('../services/githubAccountLinking');
const { serializeUser, tokenPayload } = require('../services/userSerializer');
const { recordSuccessfulLogin } = require('../services/loginActivityService');
const { writeSystemLog } = require('../middleware/logger');
const { createCookieOptions } = require('../services/cookiePolicy');
const { providerFetch } = require('../services/providerHttp');
const { createAppRedirectUrl, normalizePublicAppUrl } = require('../services/publicAppUrl');

const router = express.Router();
const GITHUB_API = 'https://api.github.com';
const GITHUB_DEVICE_COOKIE = 'github_device_session';

const githubCookieOptions = createCookieOptions({ defaultSameSite: 'lax' });
const oauthStateCookieOptions = {
  ...githubCookieOptions,
  sameSite: 'lax'
};
const authCookieOptions = {
  ...githubCookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000
};
const publicAppUrl = normalizePublicAppUrl(process.env.PUBLIC_APP_URL, {
  production: process.env.NODE_ENV === 'production'
});

function redirectToApp(res, status) {
  return res.redirect(createAppRedirectUrl(status, publicAppUrl));
}

function getOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackUrl = process.env.GITHUB_OAUTH_CALLBACK_URL;
  const encryptionSecret = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  const authFlow = String(process.env.GITHUB_AUTH_FLOW || 'web').toLowerCase();
  const redirectMode = String(process.env.GITHUB_OAUTH_REDIRECT_MODE || 'registered').toLowerCase();
  if (!clientId || !clientSecret || !callbackUrl || !encryptionSecret || encryptionSecret.length < 32) {
    return null;
  }
  if (!['device', 'web'].includes(authFlow)) {
    writeSystemLog('ERROR', 'GITHUB_AUTH_FLOW must be "device" or "web".');
    return null;
  }
  if (!['registered', 'explicit'].includes(redirectMode)) {
    writeSystemLog('ERROR', 'GITHUB_OAUTH_REDIRECT_MODE must be "registered" or "explicit".');
    return null;
  }
  return {
    clientId,
    clientSecret,
    callbackUrl,
    authFlow,
    redirectMode,
    encryptionKey: crypto.createHash('sha256').update(encryptionSecret).digest(),
    scopes: (process.env.GITHUB_OAUTH_SCOPES || 'read:user user:email')
      .split(/[\s,]+/)
      .filter(Boolean)
  };
}

function encryptToken(token, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

function decryptToken(value, key) {
  const [ivValue, tagValue, ciphertextValue] = String(value).split('.');
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Invalid encrypted GitHub token.');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

async function githubRequest(path, token, correlationId) {
  const response = await providerFetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Lunar-Security-Dashboard'
    }
  }, {
    correlationId,
    timeoutMs: 15000,
    maxRetries: 1
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `GitHub API request failed (${response.status}).`);
  }
  return payload;
}

async function fetchVerifiedEmail(token, profile, correlationId) {
  const emails = await githubRequest('/user/emails?per_page=100', token, correlationId);
  const preferred = emails.find((email) => email.primary && email.verified)
    || emails.find((email) => email.verified);
  if (preferred?.email) return preferred.email.toLowerCase();
  if (profile.email) return String(profile.email).toLowerCase();
  throw new Error('A verified GitHub email is required.');
}

async function fetchRepositories(token, correlationId) {
  return githubRequest(
    '/user/repos?per_page=100&sort=updated&affiliation=owner%2Ccollaborator%2Corganization_member',
    token,
    correlationId
  );
}

async function syncRepositories(client, userId, repositories) {
  for (const repository of repositories) {
    await client.query(
      `INSERT INTO projects (
         user_id, name, repo_url, language, security_score,
         github_repo_id, is_private, synced_at
       ) VALUES ($1, $2, $3, $4, 100, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, github_repo_id) WHERE github_repo_id IS NOT NULL
       DO UPDATE SET
         name = EXCLUDED.name,
         repo_url = EXCLUDED.repo_url,
         language = EXCLUDED.language,
         is_private = EXCLUDED.is_private,
         synced_at = CURRENT_TIMESTAMP`,
      [
        userId,
        repository.full_name || repository.name,
        repository.html_url,
        repository.language || 'Unknown',
        repository.id,
        Boolean(repository.private)
      ]
    );
  }
}

function parseScopes(value) {
  return String(value || '').split(/[\s,]+/).filter(Boolean);
}

function publicRepository(repository) {
  return {
    id: repository.id,
    fullName: repository.full_name || repository.name,
    name: repository.name || String(repository.full_name || '').split('/').pop(),
    repoUrl: repository.html_url,
    language: repository.language || 'Unknown',
    isPrivate: Boolean(repository.private),
    updatedAt: repository.updated_at || null
  };
}

async function persistGitHubIdentity({
  pool,
  config,
  accessToken,
  grantedScopes,
  requestedUser,
  correlationId,
  ipAddress,
  userAgent
}) {
  const [profile, repositories] = await Promise.all([
    githubRequest('/user', accessToken, correlationId),
    fetchRepositories(accessToken, correlationId)
  ]);
  const githubEmail = await fetchVerifiedEmail(accessToken, profile, correlationId);
  const client = await pool.connect();
  let committed = false;

  try {
    await client.query('BEGIN');

    const existingConnection = await client.query(
      'SELECT user_id FROM github_connections WHERE github_id = $1 FOR UPDATE',
      [profile.id]
    );
    if (
      requestedUser
      && existingConnection.rows[0]
      && String(existingConnection.rows[0].user_id) !== String(requestedUser.id)
    ) {
      throw new Error('This GitHub account is already linked to another Lunar account.');
    }

    let userId = requestedUser?.id || existingConnection.rows[0]?.user_id;
    if (!userId) {
      const emailUser = await client.query(
        'SELECT id, email_verified_at FROM users WHERE email = $1',
        [githubEmail]
      );
      userId = resolveVerifiedEmailAutoLink(emailUser.rows[0]);
    }

    if (!userId) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('base64url'), 12);
      const baseNickname = `@${String(profile.login).slice(0, 35)}`;
      const nicknameExists = await client.query('SELECT 1 FROM users WHERE nickname = $1', [baseNickname]);
      const nickname = nicknameExists.rows.length
        ? `${baseNickname.slice(0, 35)}-${profile.id}`
        : baseNickname;
      const inserted = await client.query(
        `INSERT INTO users (
           nickname, name, email, password_hash, tier, role, status, email_verified_at
         )
         VALUES ($1, $2, $3, $4, 'FREE', 'USER', 'ACTIVE', CURRENT_TIMESTAMP)
         RETURNING id`,
        [nickname, profile.name || profile.login, githubEmail, passwordHash]
      );
      userId = inserted.rows[0].id;
    } else {
      const accountEmail = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
      const verifiesLocalEmail = githubEmailMatchesLunarAccount(
        accountEmail.rows[0]?.email,
        githubEmail
      );
      await client.query(
        `UPDATE users
         SET email_verified_at = CASE
               WHEN $2 THEN COALESCE(email_verified_at, CURRENT_TIMESTAMP)
               ELSE email_verified_at
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId, verifiesLocalEmail]
      );
    }

    const encryptedToken = encryptToken(accessToken, config.encryptionKey);
    await client.query(
      `INSERT INTO github_connections (
         user_id, github_id, github_login, github_email, avatar_url,
         access_token_encrypted, scopes, last_synced_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         github_id = EXCLUDED.github_id,
         github_login = EXCLUDED.github_login,
         github_email = EXCLUDED.github_email,
         avatar_url = EXCLUDED.avatar_url,
         access_token_encrypted = EXCLUDED.access_token_encrypted,
         scopes = EXCLUDED.scopes,
         last_synced_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        profile.id,
        profile.login,
        githubEmail,
        profile.avatar_url,
        encryptedToken,
        parseScopes(grantedScopes)
      ]
    );
    await syncRepositories(client, userId, repositories);

    const userResult = await client.query(
      `SELECT u.id, u.email, u.nickname, u.name, u.email_verified_at, u.auth_version,
              u.tier, u.role, u.status, u.daily_scans_used,
              gc.avatar_url
       FROM users u
       LEFT JOIN github_connections gc ON gc.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) throw new Error('Unable to load the Lunar account after GitHub login.');
    if (user.status === 'SUSPENDED') throw new Error('This Lunar account is suspended.');

    if (!requestedUser) {
      await recordSuccessfulLogin(client, {
        userId,
        authMethod: 'GITHUB',
        ipAddress,
        userAgent,
        correlationId
      });
    }

    await client.query('COMMIT');
    committed = true;
    return {
      user,
      profile,
      repositories
    };
  } catch (error) {
    if (!committed) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

router.get('/config', (req, res) => {
  const config = getOAuthConfig();
  return res.json({
    success: true,
    configured: Boolean(config),
    callbackUrl: config ? config.callbackUrl : null,
    authFlow: config ? config.authFlow : null,
    redirectMode: config ? config.redirectMode : null
  });
});

router.get('/start', githubAuthStartRateLimiter, (req, res) => {
  const config = getOAuthConfig();
  if (!config) {
    return res.status(503).json({
      success: false,
      error: 'GitHub login is not configured. Set the GitHub OAuth environment variables.'
    });
  }

  const state = crypto.randomBytes(32).toString('base64url');
  res.cookie('github_oauth_state', state, {
    ...oauthStateCookieOptions,
    maxAge: 10 * 60 * 1000
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: config.scopes.join(' '),
    state,
    allow_signup: 'true'
  });
  if (config.redirectMode === 'explicit') {
    params.set('redirect_uri', config.callbackUrl);
  }
  return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.post('/device/start', githubAuthStartRateLimiter, async (req, res) => {
  const config = getOAuthConfig();
  if (!config) {
    return res.status(503).json({
      success: false,
      error: 'GitHub login is not configured. Set the GitHub OAuth environment variables.'
    });
  }
  if (config.authFlow !== 'device') {
    return res.status(409).json({
      success: false,
      error: 'GitHub Device Flow is not enabled for this environment.'
    });
  }

  try {
    const response = await providerFetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Lunar-Security-Dashboard'
      },
      body: JSON.stringify({
        client_id: config.clientId,
        scope: config.scopes.join(' ')
      })
    }, {
      correlationId: req.correlationId,
      timeoutMs: 15000,
      maxRetries: 0
    });
    const payload = await response.json().catch(() => ({}));
    if (
      !response.ok
      || !payload.device_code
      || !payload.user_code
      || !payload.verification_uri
    ) {
      throw new Error(payload.error_description || 'GitHub Device Flow could not be started.');
    }

    const expiresIn = Math.max(60, Number(payload.expires_in) || 900);
    const interval = Math.max(5, Number(payload.interval) || 5);
    const encryptedSession = encryptToken(JSON.stringify({
      deviceCode: payload.device_code,
      expiresAt: Date.now() + (expiresIn * 1000),
      interval
    }), config.encryptionKey);
    res.cookie(GITHUB_DEVICE_COOKIE, encryptedSession, {
      ...githubCookieOptions,
      maxAge: expiresIn * 1000
    });

    return res.json({
      success: true,
      userCode: payload.user_code,
      verificationUri: payload.verification_uri,
      expiresIn,
      interval
    });
  } catch (error) {
    req.log?.error('GitHub Device Flow start failed.', error, 500);
    return res.status(502).json({
      success: false,
      error: 'Không thể tạo mã xác thực GitHub. Hãy thử lại sau.'
    });
  }
});

router.post('/device/poll', githubAuthPollRateLimiter, optionalToken, async (req, res) => {
  const config = getOAuthConfig();
  const pool = getPool();
  const encryptedSession = req.cookies?.[GITHUB_DEVICE_COOKIE];
  if (!config || !pool) {
    return res.status(503).json({ success: false, error: 'GitHub login is not available.' });
  }
  if (config.authFlow !== 'device') {
    return res.status(409).json({ success: false, error: 'GitHub Device Flow is not enabled.' });
  }
  if (!encryptedSession) {
    return res.status(400).json({
      success: false,
      error: 'Phiên xác thực GitHub đã hết hạn. Hãy tạo mã mới.'
    });
  }

  let deviceSession;
  try {
    deviceSession = JSON.parse(decryptToken(encryptedSession, config.encryptionKey));
    if (
      !deviceSession.deviceCode
      || !deviceSession.expiresAt
      || Date.now() >= Number(deviceSession.expiresAt)
    ) {
      throw new Error('Expired GitHub device session.');
    }
  } catch {
    res.clearCookie(GITHUB_DEVICE_COOKIE, githubCookieOptions);
    return res.status(400).json({
      success: false,
      error: 'Phiên xác thực GitHub không hợp lệ hoặc đã hết hạn.'
    });
  }

  try {
    const response = await providerFetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Lunar-Security-Dashboard'
      },
      body: JSON.stringify({
        client_id: config.clientId,
        device_code: deviceSession.deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    }, {
      correlationId: req.correlationId,
      timeoutMs: 15000,
      maxRetries: 0
    });
    const githubToken = await response.json().catch(() => ({}));
    if (
      githubToken.error === 'authorization_pending'
      || githubToken.error === 'slow_down'
    ) {
      const retryAfter = githubToken.error === 'slow_down'
        ? Math.max(10, Number(deviceSession.interval) + 5)
        : Math.max(5, Number(deviceSession.interval) || 5);
      return res.status(202).json({
        success: false,
        pending: true,
        retryAfter
      });
    }
    if (!response.ok || githubToken.error || !githubToken.access_token) {
      res.clearCookie(GITHUB_DEVICE_COOKIE, githubCookieOptions);
      return res.status(400).json({
        success: false,
        error: githubToken.error === 'access_denied'
          ? 'Bạn đã từ chối quyền truy cập GitHub.'
          : 'Mã xác thực GitHub đã hết hạn hoặc không còn hợp lệ.'
      });
    }

    const result = await persistGitHubIdentity({
      pool,
      config,
      accessToken: githubToken.access_token,
      grantedScopes: githubToken.scope,
      requestedUser: req.user,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    const token = jwt.sign(tokenPayload(result.user), JWT_SECRET, { expiresIn: '7d' });
    res.cookie('access_token', token, authCookieOptions);
    res.clearCookie(GITHUB_DEVICE_COOKIE, githubCookieOptions);
    return res.json({
      success: true,
      connected: true,
      user: serializeUser(result.user),
      github: {
        login: result.profile.login,
        email: result.user.email,
        avatarUrl: result.profile.avatar_url
      },
      repositoriesSynced: result.repositories.length,
      repositories: result.repositories.map(publicRepository)
    });
  } catch (error) {
    req.log?.error('GitHub Device Flow completion failed.', error, 500);
    if (error.code === UNVERIFIED_EMAIL_LINK_CODE) {
      return res.status(409).json({
        success: false,
        error: 'Email này đã có tài khoản Lunar chưa xác minh. Hãy đăng nhập và xác minh tài khoản đó trước khi kết nối GitHub.'
      });
    }
    return res.status(502).json({
      success: false,
      error: 'GitHub đã xác thực nhưng Lunar chưa thể lưu tài khoản hoặc repository.'
    });
  }
});

router.get('/callback', optionalToken, async (req, res) => {
  const config = getOAuthConfig();
  const pool = getPool();
  const suppliedState = String(req.query.state || '');
  const expectedState = String(req.cookies?.github_oauth_state || '');
  res.clearCookie('github_oauth_state', oauthStateCookieOptions);

  if (!config || !pool) return redirectToApp(res, 'unavailable');
  if (
    !suppliedState
    || suppliedState.length !== expectedState.length
    || !crypto.timingSafeEqual(Buffer.from(suppliedState), Buffer.from(expectedState))
  ) {
    return redirectToApp(res, 'invalid_state');
  }
  if (!req.query.code) return redirectToApp(res, 'denied');

  try {
    const tokenResponse = await providerFetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Lunar-Security-Dashboard'
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: req.query.code,
        ...(config.redirectMode === 'explicit' ? { redirect_uri: config.callbackUrl } : {})
      })
    }, {
      correlationId: req.correlationId,
      timeoutMs: 15000,
      maxRetries: 0
    });
    const githubToken = await tokenResponse.json();
    if (!tokenResponse.ok || !githubToken.access_token) {
      throw new Error(githubToken.error_description || 'GitHub token exchange failed.');
    }

    const result = await persistGitHubIdentity({
      pool,
      config,
      accessToken: githubToken.access_token,
      grantedScopes: githubToken.scope,
      requestedUser: req.user,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    const token = jwt.sign(tokenPayload(result.user), JWT_SECRET, { expiresIn: '7d' });
    res.cookie('access_token', token, authCookieOptions);
    return redirectToApp(res, 'success');
  } catch (error) {
    req.log?.error('GitHub OAuth callback failed.', error, 500);
    if (error.code === UNVERIFIED_EMAIL_LINK_CODE) {
      return redirectToApp(res, 'link_required');
    }
    return redirectToApp(res, 'failed');
  }
});

router.get('/status', verifyToken, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const result = await pool.query(
    `SELECT github_login AS login, github_email AS email, avatar_url AS "avatarUrl",
            scopes, last_synced_at AS "lastSyncedAt"
     FROM github_connections WHERE user_id = $1`,
    [req.user.id]
  );
  return res.json({ success: true, connected: result.rows.length > 0, connection: result.rows[0] || null });
});

router.get('/repositories', verifyToken, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const result = await pool.query(
    `SELECT github_repo_id AS id,
            name AS "fullName",
            split_part(name, '/', 2) AS name,
            repo_url AS "repoUrl",
            language,
            is_private AS "isPrivate",
            synced_at AS "updatedAt"
     FROM projects
     WHERE user_id = $1 AND github_repo_id IS NOT NULL
     ORDER BY synced_at DESC NULLS LAST, name ASC
     LIMIT 100`,
    [req.user.id]
  );
  return res.json({ success: true, repositories: result.rows });
});

router.post('/sync', verifyToken, async (req, res) => {
  const config = getOAuthConfig();
  const pool = getPool();
  if (!config || !pool) {
    return res.status(503).json({ success: false, error: 'GitHub sync is not configured.' });
  }

  const connection = await pool.query(
    'SELECT access_token_encrypted FROM github_connections WHERE user_id = $1',
    [req.user.id]
  );
  if (!connection.rows[0]) {
    return res.status(404).json({ success: false, error: 'No GitHub account is connected.' });
  }

  try {
    const token = decryptToken(connection.rows[0].access_token_encrypted, config.encryptionKey);
    const repositories = await fetchRepositories(token, req.correlationId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await syncRepositories(client, req.user.id, repositories);
      await client.query(
        'UPDATE github_connections SET last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [req.user.id]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return res.json({
      success: true,
      repositoriesSynced: repositories.length,
      repositories: repositories.map(publicRepository)
    });
  } catch (error) {
    req.log?.error('GitHub repository sync failed.', error, 500);
    return res.status(502).json({ success: false, error: 'Unable to synchronize GitHub repositories.' });
  }
});

router.post('/disconnect', verifyToken, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const result = await pool.query(
    'DELETE FROM github_connections WHERE user_id = $1 RETURNING github_login',
    [req.user.id]
  );
  if (!result.rows[0]) {
    return res.status(404).json({ success: false, error: 'No GitHub account is connected.' });
  }
  return res.json({
    success: true,
    disconnected: true,
    message: 'GitHub đã được ngắt khỏi Lunar. Bạn có thể thu hồi OAuth grant trong GitHub Settings.'
  });
});

module.exports = router;
