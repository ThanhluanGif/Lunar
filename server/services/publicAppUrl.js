const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function normalizePublicAppUrl(value, { production = false } = {}) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '';

  let url;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error('PUBLIC_APP_URL must be a valid HTTP(S) origin.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('PUBLIC_APP_URL must be an HTTP(S) origin without credentials.');
  }
  if (production && url.protocol !== 'https:' && !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error('PUBLIC_APP_URL must use HTTPS in production.');
  }

  return url.origin;
}

function createAppRedirectUrl(status, publicAppUrl = '') {
  const path = `/?github_auth=${encodeURIComponent(status)}`;
  return publicAppUrl ? `${publicAppUrl}${path}` : path;
}

module.exports = {
  createAppRedirectUrl,
  normalizePublicAppUrl
};
