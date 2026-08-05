import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createApiUrl, normalizeApiBaseUrl } from '../src/services/apiUrl.js';

const require = createRequire(import.meta.url);
const { resolveCookiePolicy } = require('../server/services/cookiePolicy');
const { resolveAllowedOrigins } = require('../server/services/corsPolicy');
const { createAppRedirectUrl, normalizePublicAppUrl } = require('../server/services/publicAppUrl');

assert.equal(normalizeApiBaseUrl(''), '');
assert.equal(
  normalizeApiBaseUrl('https://api.example.com/internal/path', { requireHttps: true }),
  'https://api.example.com'
);
assert.equal(
  normalizeApiBaseUrl('http://127.0.0.1:5050', { requireHttps: true }),
  'http://127.0.0.1:5050'
);
assert.throws(
  () => normalizeApiBaseUrl('http://api.example.com', { requireHttps: true }),
  /HTTPS/
);
assert.throws(() => normalizeApiBaseUrl('ftp://api.example.com'), /HTTP\(S\)/);
assert.equal(
  createApiUrl('/auth/github/start', 'https://api.example.com'),
  'https://api.example.com/api/v1/auth/github/start'
);

assert.deepEqual(resolveAllowedOrigins({
  CORS_ORIGINS: 'https://old.example.com,https://old.example.com/path',
  PUBLIC_APP_URL: 'https://app.example.com/dashboard'
}), ['https://old.example.com', 'https://app.example.com']);

assert.deepEqual(resolveCookiePolicy({ env: { NODE_ENV: 'production' } }), {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/'
});
assert.equal(resolveCookiePolicy({
  env: { COOKIE_SECURE: 'true', COOKIE_SAME_SITE: 'none' }
}).sameSite, 'none');
assert.throws(
  () => resolveCookiePolicy({ env: { COOKIE_SECURE: 'false', COOKIE_SAME_SITE: 'none' } }),
  /requires COOKIE_SECURE=true/
);

assert.equal(
  normalizePublicAppUrl('https://app.example.com/dashboard', { production: true }),
  'https://app.example.com'
);
assert.throws(
  () => normalizePublicAppUrl('http://app.example.com', { production: true }),
  /HTTPS/
);
assert.equal(createAppRedirectUrl('success'), '/?github_auth=success');
assert.equal(
  createAppRedirectUrl('invalid state', 'https://app.example.com'),
  'https://app.example.com/?github_auth=invalid%20state'
);

for (const componentPath of [
  'src/components/AuthModal.jsx',
  'src/components/UserGitHubWorkspace.jsx'
]) {
  const source = fs.readFileSync(componentPath, 'utf8');
  assert.match(source, /lunarApi\.getGitHubOAuthStartUrl\(\)/);
  assert.doesNotMatch(source, /window\.location\.assign\(['"]\/api\/v1/);
}

const githubRouteSource = fs.readFileSync('server/routes/githubAuthRoutes.js', 'utf8');
assert.match(githubRouteSource, /redirectToApp\(res, 'success'\)/);
assert.match(githubRouteSource, /oauthStateCookieOptions = \{[\s\S]*sameSite: 'lax'/);
assert.doesNotMatch(githubRouteSource, /res\.redirect\(['"]\/\?github_auth=/);
assert.match(githubRouteSource, /configured: Boolean\(config\)/);
assert.doesNotMatch(githubRouteSource, /developer@lunar\.dev/);

const viteConfigSource = fs.readFileSync('vite.config.js', 'utf8');
const envExampleSource = fs.readFileSync('.env.example', 'utf8');
assert.match(viteConfigSource, /VITE_API_PROXY_TARGET \|\| 'http:\/\/127\.0\.0\.1:5000'/);
assert.match(envExampleSource, /^PORT=5000$/m);
assert.match(envExampleSource, /^VITE_API_PROXY_TARGET=http:\/\/127\.0\.0\.1:5000$/m);

const lunarApiSource = fs.readFileSync('src/services/lunarApi.js', 'utf8');
assert.match(lunarApiSource, /code = 'API_UNREACHABLE'/);
assert.match(lunarApiSource, /DEPLOYMENT_PROTECTED/);
assert.match(lunarApiSource, /CORS không tạo ra phản hồi HTTP 403 đọc được/);

const serverSource = fs.readFileSync('server/index.js', 'utf8');
assert.match(serverSource, /resolveAllowedOrigins\(\)/);

console.log(JSON.stringify({
  productionApiOrigin: 'PASS',
  githubOAuthStartOrigin: 'PASS',
  githubCallbackPublicAppRedirect: 'PASS',
  crossSiteCookiePolicy: 'PASS',
  localApiProxyAlignment: 'PASS',
  userFacingNetworkError: 'PASS',
  publicAppCorsFallback: 'PASS'
}, null, 2));
