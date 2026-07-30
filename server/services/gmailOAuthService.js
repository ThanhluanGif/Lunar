const crypto = require('crypto');

const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GMAIL_OAUTH_SCOPES = Object.freeze([
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.send'
]);

function getRealGmailOAuthConfiguration() {
  const clientId = String(process.env.GMAIL_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GMAIL_CLIENT_SECRET || '').trim();
  const callbackUrl = String(process.env.GMAIL_OAUTH_CALLBACK_URL || '').trim();
  const encryptionSecret = String(process.env.GMAIL_TOKEN_ENCRYPTION_KEY || '');
  if (
    !clientId
    || !clientSecret
    || !callbackUrl
    || encryptionSecret.length < 32
  ) {
    return null;
  }
  return {
    mode: 'user-oauth',
    clientId,
    clientSecret,
    callbackUrl,
    encryptionKey: crypto.createHash('sha256').update(encryptionSecret).digest(),
    scopes: [...GMAIL_OAUTH_SCOPES]
  };
}

function getGmailOAuthStatus() {
  const realConfig = getRealGmailOAuthConfiguration();
  const dryRun = process.env.GMAIL_DRY_RUN === 'true';
  return {
    configured: Boolean(realConfig) || dryRun,
    oauthConfigured: Boolean(realConfig),
    mode: dryRun ? 'dry-run' : realConfig ? 'user-oauth' : null
  };
}

function requireRealConfiguration() {
  const config = getRealGmailOAuthConfiguration();
  if (!config) {
    const error = new Error(
      'Gmail OAuth is not configured. Set client ID, client secret, callback URL and token encryption key.'
    );
    error.status = 503;
    throw error;
  }
  return config;
}

function encryptRefreshToken(token) {
  const config = requireRealConfiguration();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', config.encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

function decryptRefreshToken(value) {
  const config = requireRealConfiguration();
  const [ivValue, tagValue, ciphertextValue] = String(value || '').split('.');
  if (!ivValue || !tagValue || !ciphertextValue) {
    const error = new Error('Stored Gmail authorization is invalid. Reconnect Gmail.');
    error.status = 409;
    throw error;
  }
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      config.encryptionKey,
      Buffer.from(ivValue, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final()
    ]).toString('utf8');
  } catch {
    const error = new Error('Stored Gmail authorization cannot be decrypted. Reconnect Gmail.');
    error.status = 409;
    throw error;
  }
}

function createGmailAuthorizationUrl({ state, loginHint }) {
  const config = requireRealConfiguration();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state
  });
  if (loginHint) params.set('login_hint', String(loginHint).slice(0, 255));
  return `${GOOGLE_AUTHORIZATION_URL}?${params}`;
}

async function postTokenForm(params, fetchImplementation = fetch) {
  const response = await fetchImplementation(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error_description || payload.error || 'Google OAuth token request failed.');
    error.status = 502;
    error.providerCode = payload.error || null;
    throw error;
  }
  return payload;
}

async function exchangeAuthorizationCode(code, fetchImplementation = fetch) {
  const config = requireRealConfiguration();
  return postTokenForm({
    code: String(code),
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.callbackUrl,
    grant_type: 'authorization_code'
  }, fetchImplementation);
}

async function fetchGoogleIdentity(accessToken, fetchImplementation = fetch) {
  const response = await fetchImplementation(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const profile = await response.json().catch(() => ({}));
  if (!response.ok || !profile.email) {
    const error = new Error(profile.error_description || 'Unable to read the connected Google identity.');
    error.status = 502;
    throw error;
  }
  if (profile.email_verified !== true) {
    const error = new Error('A verified Google email is required.');
    error.status = 400;
    error.code = 'EMAIL_UNVERIFIED';
    throw error;
  }
  return {
    googleId: String(profile.sub || ''),
    email: String(profile.email).trim().toLowerCase()
  };
}

async function refreshUserAccessToken(encryptedRefreshToken, fetchImplementation = fetch) {
  const config = requireRealConfiguration();
  const refreshToken = decryptRefreshToken(encryptedRefreshToken);
  const payload = await postTokenForm({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  }, fetchImplementation);
  if (!payload.access_token) {
    const error = new Error('Google did not return an access token. Reconnect Gmail.');
    error.status = 409;
    throw error;
  }
  return {
    accessToken: payload.access_token,
    expiresIn: Number(payload.expires_in || 0),
    scope: String(payload.scope || '')
  };
}

async function revokeUserGrant(encryptedRefreshToken, fetchImplementation = fetch) {
  const refreshToken = decryptRefreshToken(encryptedRefreshToken);
  const response = await fetchImplementation(GOOGLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken })
  });
  return response.ok;
}

module.exports = {
  GMAIL_OAUTH_SCOPES,
  createGmailAuthorizationUrl,
  decryptRefreshToken,
  encryptRefreshToken,
  exchangeAuthorizationCode,
  fetchGoogleIdentity,
  getGmailOAuthStatus,
  getRealGmailOAuthConfiguration,
  refreshUserAccessToken,
  revokeUserGrant
};
