const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, optionalToken, verifyToken } = require('../middleware/auth');
const { getPool } = require('../db/connection');
const { tokenPayload } = require('../services/userSerializer');

const router = express.Router();
const GITHUB_API = 'https://api.github.com';

const cookieSecure = process.env.COOKIE_SECURE !== undefined
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

const authCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

function getOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackUrl = process.env.GITHUB_OAUTH_CALLBACK_URL;
  const encryptionSecret = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!clientId || !clientSecret || !callbackUrl || !encryptionSecret || encryptionSecret.length < 32) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    callbackUrl,
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

async function githubRequest(path, token) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Lunar-Security-Dashboard'
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `GitHub API request failed (${response.status}).`);
  }
  return payload;
}

async function fetchVerifiedEmail(token, profile) {
  const emails = await githubRequest('/user/emails?per_page=100', token);
  const preferred = emails.find((email) => email.primary && email.verified)
    || emails.find((email) => email.verified);
  if (preferred?.email) return preferred.email.toLowerCase();
  if (profile.email) return String(profile.email).toLowerCase();
  throw new Error('A verified GitHub email is required.');
}

async function fetchRepositories(token) {
  return githubRequest(
    '/user/repos?per_page=100&sort=updated&affiliation=owner%2Ccollaborator%2Corganization_member',
    token
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

router.get('/config', (req, res) => {
  const config = getOAuthConfig();
  return res.json({
    success: true,
    configured: Boolean(config),
    callbackUrl: config ? config.callbackUrl : null
  });
});

router.get('/start', (req, res) => {
  const config = getOAuthConfig();
  if (!config) {
    return res.status(503).json({
      success: false,
      error: 'GitHub login is not configured. Set the GitHub OAuth environment variables.'
    });
  }

  const state = crypto.randomBytes(32).toString('base64url');
  res.cookie('github_oauth_state', state, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: config.scopes.join(' '),
    state,
    allow_signup: 'true'
  });
  return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get('/callback', optionalToken, async (req, res) => {
  const config = getOAuthConfig();
  const pool = getPool();
  const suppliedState = String(req.query.state || '');
  const expectedState = String(req.cookies?.github_oauth_state || '');
  res.clearCookie('github_oauth_state', {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax'
  });

  if (!config || !pool) return res.redirect('/?github_auth=unavailable');
  if (
    !suppliedState
    || suppliedState.length !== expectedState.length
    || !crypto.timingSafeEqual(Buffer.from(suppliedState), Buffer.from(expectedState))
  ) {
    return res.redirect('/?github_auth=invalid_state');
  }
  if (!req.query.code) return res.redirect('/?github_auth=denied');

  let client;
  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
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
        redirect_uri: config.callbackUrl
      })
    });
    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new Error(tokenPayload.error_description || 'GitHub token exchange failed.');
    }

    const [profile, repositories] = await Promise.all([
      githubRequest('/user', tokenPayload.access_token),
      fetchRepositories(tokenPayload.access_token)
    ]);
    const githubEmail = await fetchVerifiedEmail(tokenPayload.access_token, profile);

    client = await pool.connect();
    await client.query('BEGIN');

    const existingConnection = await client.query(
      'SELECT user_id FROM github_connections WHERE github_id = $1 FOR UPDATE',
      [profile.id]
    );
    if (
      req.user
      && existingConnection.rows[0]
      && String(existingConnection.rows[0].user_id) !== String(req.user.id)
    ) {
      throw new Error('This GitHub account is already linked to another Lunar account.');
    }

    let userId = req.user?.id || existingConnection.rows[0]?.user_id;
    if (!userId) {
      const emailUser = await client.query('SELECT id FROM users WHERE email = $1', [githubEmail]);
      userId = emailUser.rows[0]?.id;
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
      await client.query(
        `UPDATE users
         SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
      );
    }

    const encryptedToken = encryptToken(tokenPayload.access_token, config.encryptionKey);
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
        String(tokenPayload.scope || '').split(',').filter(Boolean)
      ]
    );
    await syncRepositories(client, userId, repositories);

    const userResult = await client.query(
      `SELECT u.id, u.email, u.nickname, u.name, u.email_verified_at, u.auth_version,
              u.tier, u.role, u.status, u.karma_points, u.daily_scans_used,
              gc.avatar_url
       FROM users u
       LEFT JOIN github_connections gc ON gc.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    const user = userResult.rows[0];
    if (user.status === 'SUSPENDED') throw new Error('This Lunar account is suspended.');
    await client.query('COMMIT');

    const token = jwt.sign(tokenPayload(user), JWT_SECRET, { expiresIn: '7d' });
    res.cookie('access_token', token, authCookieOptions);
    return res.redirect('/?github_auth=success');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('GitHub OAuth callback failed:', error.message);
    return res.redirect('/?github_auth=failed');
  } finally {
    client?.release();
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
    const repositories = await fetchRepositories(token);
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
    console.error('GitHub repository sync failed:', error.message);
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
