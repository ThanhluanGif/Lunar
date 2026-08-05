const LOCAL_DEVELOPMENT_ORIGINS = [
  'http://localhost:5050',
  'http://127.0.0.1:5050',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

function normalizeOrigin(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    return url.origin;
  } catch {
    return '';
  }
}

function resolveAllowedOrigins(env = process.env) {
  const configuredOrigins = String(env.CORS_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
  const publicAppOrigin = normalizeOrigin(env.PUBLIC_APP_URL);
  const candidates = [
    ...configuredOrigins,
    ...(publicAppOrigin ? [publicAppOrigin] : []),
    ...(!configuredOrigins.length && !publicAppOrigin ? LOCAL_DEVELOPMENT_ORIGINS : [])
  ];
  return [...new Set(candidates)];
}

module.exports = {
  LOCAL_DEVELOPMENT_ORIGINS,
  normalizeOrigin,
  resolveAllowedOrigins
};
