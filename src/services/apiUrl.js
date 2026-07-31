const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function normalizeApiBaseUrl(value, { requireHttps = false } = {}) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '';

  let url;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error('VITE_API_BASE_URL phải là origin HTTP(S) hợp lệ.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('VITE_API_BASE_URL phải là origin HTTP(S) không chứa credential.');
  }
  if (requireHttps && url.protocol !== 'https:' && !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error('VITE_API_BASE_URL phải dùng HTTPS trong production.');
  }

  return url.origin;
}

export function createApiUrl(path, apiBaseUrl = '') {
  const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;
  return `${apiBaseUrl}/api/v1${normalizedPath}`;
}
