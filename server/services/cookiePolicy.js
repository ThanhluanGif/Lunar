const ALLOWED_SAME_SITE = new Set(['strict', 'lax', 'none']);

function resolveCookiePolicy({
  defaultSameSite = 'strict',
  env = process.env
} = {}) {
  const secure = env.COOKIE_SECURE !== undefined
    ? env.COOKIE_SECURE === 'true'
    : env.NODE_ENV === 'production';
  const sameSite = String(env.COOKIE_SAME_SITE || defaultSameSite).trim().toLowerCase();

  if (!ALLOWED_SAME_SITE.has(sameSite)) {
    throw new Error('COOKIE_SAME_SITE must be strict, lax, or none.');
  }
  if (sameSite === 'none' && !secure) {
    throw new Error('COOKIE_SAME_SITE=none requires COOKIE_SECURE=true.');
  }

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/'
  };
}

function createCookieOptions({ defaultSameSite = 'strict', maxAge, env } = {}) {
  return {
    ...resolveCookiePolicy({ defaultSameSite, env }),
    ...(maxAge === undefined ? {} : { maxAge })
  };
}

module.exports = {
  createCookieOptions,
  resolveCookiePolicy
};
