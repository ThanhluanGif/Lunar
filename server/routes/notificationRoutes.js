const crypto = require('crypto');
const express = require('express');
const { optionalToken, verifyToken } = require('../middleware/auth');
const { getPool } = require('../db/connection');
const {
  GMAIL_OAUTH_SCOPES,
  createGmailAuthorizationUrl,
  encryptRefreshToken,
  exchangeAuthorizationCode,
  fetchGoogleIdentity,
  getGmailOAuthStatus,
  getRealGmailOAuthConfiguration,
  refreshUserAccessToken,
  revokeUserGrant
} = require('../services/gmailOAuthService');
const {
  sendAuditReportEmail,
  sendCriticalSecurityAlert
} = require('../services/gmailService');
const { UUID_PATTERN, loadOwnedScanSummary } = require('../services/reportService');

const router = express.Router();
const cookieSecure = process.env.COOKIE_SECURE !== undefined
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';
const oauthCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: 'lax',
  maxAge: 10 * 60 * 1000
};

function defaultPreferences(user) {
  return {
    recipientEmail: user.email,
    instantCritical: true,
    weeklyDigest: true,
    proReceipt: true
  };
}

function mapPreferences(row, user) {
  if (!row) return defaultPreferences(user);
  return {
    recipientEmail: user.email,
    instantCritical: row.instant_critical,
    weeklyDigest: row.weekly_digest,
    proReceipt: row.pro_receipt
  };
}

function safeStateMatches(suppliedState, expectedState) {
  const supplied = Buffer.from(String(suppliedState || ''));
  const expected = Buffer.from(String(expectedState || ''));
  return supplied.length > 0
    && supplied.length === expected.length
    && crypto.timingSafeEqual(supplied, expected);
}

function publicConnection(row) {
  if (!row) return null;
  return {
    email: row.gmail_email,
    scopes: row.scopes || [],
    tokenStatus: row.token_status,
    requiresReconnect: row.token_status !== 'ACTIVE',
    connectedAt: row.connected_at,
    lastUsedAt: row.last_used_at
  };
}

async function findGmailConnection(pool, userId) {
  const result = await pool.query(
    `SELECT gmail_email, refresh_token_encrypted, scopes, token_status,
            connected_at, last_used_at
     FROM gmail_connections
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function resolveDeliveryIdentity(pool, userId) {
  const userResult = await pool.query(
    `SELECT u.email AS recipient_email,
            gc.gmail_email,
            gc.refresh_token_encrypted,
            gc.token_status
     FROM users u
     LEFT JOIN gmail_connections gc ON gc.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  const row = userResult.rows[0];
  if (!row) {
    const error = new Error('Lunar account no longer exists.');
    error.status = 401;
    throw error;
  }

  const status = getGmailOAuthStatus();
  if (status.mode === 'dry-run') {
    return {
      mode: 'dry-run',
      senderEmail: row.gmail_email || row.recipient_email,
      recipientEmail: row.recipient_email
    };
  }
  if (!status.oauthConfigured) {
    const error = new Error('Gmail OAuth is not configured by the Lunar administrator.');
    error.status = 503;
    throw error;
  }
  if (!row.refresh_token_encrypted) {
    const error = new Error('Connect your Gmail account before sending notifications.');
    error.status = 409;
    throw error;
  }
  if (row.token_status !== 'ACTIVE') {
    const error = new Error('Reconnect Gmail to renew the authorization grant.');
    error.status = 409;
    throw error;
  }

  try {
    const refreshed = await refreshUserAccessToken(row.refresh_token_encrypted);
    await pool.query(
      `UPDATE gmail_connections
       SET last_used_at = CURRENT_TIMESTAMP,
           last_error = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    );
    return {
      mode: 'user-oauth',
      senderEmail: row.gmail_email,
      recipientEmail: row.recipient_email,
      accessToken: refreshed.accessToken
    };
  } catch (error) {
    if (error.providerCode === 'invalid_grant' || error.status === 409) {
      await pool.query(
        `UPDATE gmail_connections
         SET token_status = 'REAUTH_REQUIRED',
             last_error = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId, String(error.message).slice(0, 1000)]
      ).catch(() => {});
    }
    throw error;
  }
}

async function recordDelivery(pool, {
  userId,
  recipient,
  subject,
  emailType,
  status,
  messageId,
  error,
  metadata
}) {
  await pool.query(
    `INSERT INTO notification_email_logs (
       user_id, recipient_email, subject, email_type, delivery_status,
       provider_message_id, error_message, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      userId,
      recipient,
      subject,
      emailType,
      status,
      messageId || null,
      error || null,
      JSON.stringify(metadata || {})
    ]
  );
}

router.get('/gmail/oauth/start', verifyToken, (req, res) => {
  if (!getRealGmailOAuthConfiguration()) {
    return res.status(503).json({
      success: false,
      error: 'Gmail OAuth is not configured by the Lunar administrator.'
    });
  }
  const state = crypto.randomBytes(32).toString('base64url');
  res.cookie('gmail_oauth_state', `${req.user.id}.${state}`, oauthCookieOptions);
  return res.redirect(createGmailAuthorizationUrl({
    state,
    loginHint: req.user.email
  }));
});

router.get('/gmail/oauth/callback', optionalToken, async (req, res) => {
  const pool = getPool();
  const expectedState = req.cookies?.gmail_oauth_state;
  res.clearCookie('gmail_oauth_state', {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax'
  });

  if (!getRealGmailOAuthConfiguration() || !pool) {
    return res.redirect('/?gmail_auth=unavailable');
  }
  if (!req.user) return res.redirect('/?gmail_auth=login_required');
  const [stateUserId, boundState] = String(expectedState || '').split('.', 2);
  if (
    String(stateUserId) !== String(req.user.id)
    || !safeStateMatches(req.query.state, boundState)
  ) {
    return res.redirect('/?gmail_auth=invalid_state');
  }
  if (req.query.error || !req.query.code) {
    return res.redirect('/?gmail_auth=denied');
  }

  try {
    const tokenPayload = await exchangeAuthorizationCode(req.query.code);
    if (!tokenPayload.access_token) throw new Error('Google did not return an access token.');
    const identity = await fetchGoogleIdentity(tokenPayload.access_token);
    const existing = await pool.query(
      `SELECT user_id, gmail_email, refresh_token_encrypted
       FROM gmail_connections
       WHERE user_id = $1 OR gmail_email = $2`,
      [req.user.id, identity.email]
    );
    const ownedByAnotherUser = existing.rows.find(
      (row) => row.gmail_email === identity.email && String(row.user_id) !== String(req.user.id)
    );
    if (ownedByAnotherUser) {
      return res.redirect('/?gmail_auth=already_linked');
    }

    const currentConnection = existing.rows.find(
      (row) => String(row.user_id) === String(req.user.id)
    );
    const encryptedRefreshToken = tokenPayload.refresh_token
      ? encryptRefreshToken(tokenPayload.refresh_token)
      : currentConnection?.gmail_email === identity.email
        ? currentConnection.refresh_token_encrypted
        : null;
    if (!encryptedRefreshToken) {
      return res.redirect('/?gmail_auth=missing_refresh_token');
    }
    const scopes = String(tokenPayload.scope || '')
      .split(/\s+/)
      .filter(Boolean);
    if (!scopes.includes('https://www.googleapis.com/auth/gmail.send')) {
      return res.redirect('/?gmail_auth=missing_scope');
    }

    await pool.query(
      `INSERT INTO gmail_connections (
         user_id, google_id, gmail_email, refresh_token_encrypted,
         scopes, token_status, last_error, connected_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET google_id = EXCLUDED.google_id,
                     gmail_email = EXCLUDED.gmail_email,
                     refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                     scopes = EXCLUDED.scopes,
                     token_status = 'ACTIVE',
                     last_error = NULL,
                     connected_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP`,
      [
        req.user.id,
        identity.googleId || identity.email,
        identity.email,
        encryptedRefreshToken,
        scopes
      ]
    );
    return res.redirect('/?gmail_auth=success');
  } catch (error) {
    console.error('Gmail OAuth callback failed:', error.message);
    if (error.code === 'EMAIL_UNVERIFIED') {
      return res.redirect('/?gmail_auth=email_unverified');
    }
    return res.redirect('/?gmail_auth=failed');
  }
});

router.post('/gmail/disconnect', verifyToken, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const connection = await findGmailConnection(pool, req.user.id);
  if (!connection) {
    return res.status(404).json({ success: false, error: 'No Gmail account is connected.' });
  }

  let revoked = false;
  try {
    revoked = await revokeUserGrant(connection.refresh_token_encrypted);
  } catch (error) {
    return res.status(error.status || 502).json({
      success: false,
      error: 'Unable to revoke the Google authorization. Try again.'
    });
  }
  await pool.query('DELETE FROM gmail_connections WHERE user_id = $1', [req.user.id]);
  return res.json({ success: true, disconnected: true, revoked });
});

router.get('/gmail/status', verifyToken, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const [preferenceResult, connection] = await Promise.all([
    pool.query('SELECT * FROM notification_preferences WHERE user_id = $1', [req.user.id]),
    findGmailConnection(pool, req.user.id)
  ]);
  const status = getGmailOAuthStatus();
  const dryRunConnection = status.mode === 'dry-run'
    ? {
        gmail_email: req.user.email,
        scopes: GMAIL_OAUTH_SCOPES,
        token_status: 'ACTIVE',
        connected_at: null,
        last_used_at: null
      }
    : null;
  const effectiveConnection = connection || dryRunConnection;
  return res.json({
    success: true,
    ...status,
    connected: Boolean(effectiveConnection),
    canSend: Boolean(effectiveConnection) && effectiveConnection.token_status === 'ACTIVE',
    connection: publicConnection(effectiveConnection),
    preferences: mapPreferences(preferenceResult.rows[0], req.user)
  });
});

router.put('/gmail/preferences', verifyToken, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const preferences = {
    instantCritical: req.body?.instantCritical !== false,
    weeklyDigest: req.body?.weeklyDigest !== false,
    proReceipt: req.body?.proReceipt !== false
  };
  const result = await pool.query(
    `INSERT INTO notification_preferences (
       user_id, recipient_email, instant_critical, weekly_digest, pro_receipt
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id)
     DO UPDATE SET recipient_email = EXCLUDED.recipient_email,
                   instant_critical = EXCLUDED.instant_critical,
                   weekly_digest = EXCLUDED.weekly_digest,
                   pro_receipt = EXCLUDED.pro_receipt,
                   updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      req.user.id,
      req.user.email,
      preferences.instantCritical,
      preferences.weeklyDigest,
      preferences.proReceipt
    ]
  );
  return res.json({
    success: true,
    preferences: mapPreferences(result.rows[0], req.user)
  });
});

router.get('/gmail/history', verifyToken, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const result = await pool.query(
    `SELECT id,
            recipient_email AS "recipientEmail",
            subject,
            email_type AS "emailType",
            delivery_status AS "deliveryStatus",
            provider_message_id AS "messageId",
            error_message AS error,
            metadata->>'senderEmail' AS "senderEmail",
            created_at AS "createdAt"
     FROM notification_email_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.id]
  );
  return res.json({ success: true, emails: result.rows });
});

router.post('/gmail/audit-report', verifyToken, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ success: false, error: 'DATABASE_UNAVAILABLE' });
  const scanId = String(req.body?.scanId || '').trim();
  let projectTitle;
  let scanSummary;
  if (UUID_PATTERN.test(scanId)) {
    const report = await loadOwnedScanSummary(pool, scanId, req.user.id);
    if (!report) return res.status(404).json({ success: false, error: 'Scan not found.' });
    projectTitle = report.projectTitle;
    scanSummary = report.summary;
  } else if (process.env.GMAIL_DRY_RUN === 'true') {
    projectTitle = String(req.body?.projectTitle || 'Lunar Security Audit').slice(0, 255);
    scanSummary = req.body?.scanSummary;
  } else {
    return res.status(400).json({ success: false, error: 'A verified scanId is required.' });
  }
  try {
    const identity = await resolveDeliveryIdentity(pool, req.user.id);
    const delivery = await sendAuditReportEmail(
      identity,
      identity.recipientEmail,
      projectTitle,
      scanSummary
    );
    await recordDelivery(pool, {
      userId: req.user.id,
      recipient: identity.recipientEmail,
      subject: delivery.subject,
      emailType: 'AUDIT_REPORT',
      status: delivery.mode === 'dry-run' ? 'DRY_RUN' : 'DELIVERED',
      messageId: delivery.messageId,
      metadata: { ...delivery.summary, senderEmail: delivery.senderEmail }
    });
    return res.json({
      success: true,
      recipient: identity.recipientEmail,
      senderEmail: delivery.senderEmail,
      messageId: delivery.messageId,
      mode: delivery.mode,
      attachmentName: delivery.attachmentName
    });
  } catch (error) {
    await recordDelivery(pool, {
      userId: req.user.id,
      recipient: req.user.email,
      subject: `Lunar Security Audit: ${projectTitle}`,
      emailType: 'AUDIT_REPORT',
      status: 'FAILED',
      error: String(error.message).slice(0, 1000)
    }).catch(() => {});
    return res.status(error.status || 502).json({ success: false, error: error.message });
  }
});

async function dispatchCriticalAlert({ userId, projectTitle, summary }) {
  const pool = getPool();
  const status = getGmailOAuthStatus();
  if (!pool || !status.configured) return { sent: false, reason: 'NOT_CONFIGURED' };
  const preferenceResult = await pool.query(
    'SELECT instant_critical FROM notification_preferences WHERE user_id = $1',
    [userId]
  );
  if (preferenceResult.rows[0]?.instant_critical === false) {
    return { sent: false, reason: 'DISABLED' };
  }

  let identity;
  try {
    identity = await resolveDeliveryIdentity(pool, userId);
  } catch (error) {
    if (error.status === 409 || error.status === 503) {
      return { sent: false, reason: 'NOT_CONNECTED' };
    }
    throw error;
  }

  try {
    const delivery = await sendCriticalSecurityAlert(
      identity,
      identity.recipientEmail,
      projectTitle,
      summary
    );
    await recordDelivery(pool, {
      userId,
      recipient: identity.recipientEmail,
      subject: delivery.subject,
      emailType: 'CRITICAL_ALERT',
      status: delivery.mode === 'dry-run' ? 'DRY_RUN' : 'DELIVERED',
      messageId: delivery.messageId,
      metadata: { ...delivery.summary, senderEmail: delivery.senderEmail }
    });
    return { sent: true };
  } catch (error) {
    await recordDelivery(pool, {
      userId,
      recipient: identity.recipientEmail,
      subject: `[CRITICAL] Lunar Security Alert: ${projectTitle}`,
      emailType: 'CRITICAL_ALERT',
      status: 'FAILED',
      error: String(error.message).slice(0, 1000),
      metadata: { senderEmail: identity.senderEmail }
    }).catch(() => {});
    throw error;
  }
}

module.exports = { router, dispatchCriticalAlert };
