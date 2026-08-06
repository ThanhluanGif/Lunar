import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createApiUrl, normalizeApiBaseUrl } from '../src/services/apiUrl.js';
import {
  MAX_SAFE_API_ATTEMPTS,
  apiRetryDelayMs,
  fetchWithSafeRetries,
  isSafeApiRequest,
  shouldRetryApiResponse
} from '../src/services/apiResilience.js';

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

const responseStub = (status, contentType) => ({
  status,
  headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : '' }
});
assert.equal(MAX_SAFE_API_ATTEMPTS, 3);
assert.equal(isSafeApiRequest({}), true);
assert.equal(isSafeApiRequest({ method: 'POST' }), false);
assert.equal(shouldRetryApiResponse(responseStub(403, 'text/html'), {}, 0), true);
assert.equal(shouldRetryApiResponse(responseStub(403, 'application/json'), {}, 0), false);
assert.equal(shouldRetryApiResponse(responseStub(503, 'application/json'), {}, 1), true);
assert.equal(shouldRetryApiResponse(responseStub(503, 'application/json'), { method: 'POST' }, 0), false);
assert.equal(shouldRetryApiResponse(responseStub(503, 'application/json'), {}, 2), false);
assert.equal(apiRetryDelayMs(0), 250);
assert.equal(apiRetryDelayMs(1), 750);

let safeGetCalls = 0;
const recoveredResponse = await fetchWithSafeRetries(async () => {
  safeGetCalls += 1;
  return safeGetCalls < 3
    ? responseStub(403, 'text/html')
    : responseStub(200, 'application/json');
}, '/api/v1/auth/github/config', {}, async () => {});
assert.equal(safeGetCalls, 3);
assert.equal(recoveredResponse.status, 200);

let unsafePostCalls = 0;
const postResponse = await fetchWithSafeRetries(async () => {
  unsafePostCalls += 1;
  return responseStub(503, 'application/json');
}, '/api/v1/auth/login', { method: 'POST' }, async () => {});
assert.equal(unsafePostCalls, 1);
assert.equal(postResponse.status, 503);

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
  assert.match(source, /lunarApi\.shouldUseDirectGitHubOAuth\(\)/);
  assert.doesNotMatch(source, /window\.location\.assign\(['"]\/api\/v1/);
}
const githubWorkspaceSource = fs.readFileSync('src/components/UserGitHubWorkspace.jsx', 'utf8');
assert.match(githubWorkspaceSource, /error\.status !== 401 && !error\.retryable/);

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
assert.match(envExampleSource, /^VITE_GITHUB_AUTH_FLOW=web$/m);
assert.match(envExampleSource, /^CORS_ORIGINS=$/m);

const backendDockerfileSource = fs.readFileSync('Dockerfile.backend', 'utf8');
assert.match(backendDockerfileSource, /^FROM node:22-alpine AS dependencies$/m);
assert.match(backendDockerfileSource, /^COPY --chown=node:node server \.\/server$/m);
assert.match(backendDockerfileSource, /^USER node$/m);
assert.match(backendDockerfileSource, /^CMD \["node", "server\/index\.js"\]$/m);
assert.doesNotMatch(backendDockerfileSource, /npm run build/);

const renderBlueprintSource = fs.readFileSync('render.yaml', 'utf8');
assert.match(renderBlueprintSource, /^\s+runtime: docker$/m);
assert.match(renderBlueprintSource, /^\s+plan: free$/m);
assert.match(renderBlueprintSource, /^\s+region: singapore$/m);
assert.match(renderBlueprintSource, /^\s+dockerfilePath: \.\/Dockerfile\.backend$/m);
assert.match(renderBlueprintSource, /^\s+healthCheckPath: \/api\/v1\/ready$/m);
assert.match(renderBlueprintSource, /^\s+autoDeployTrigger: off$/m);
assert.match(renderBlueprintSource, /key: CORS_ORIGINS\n\s+value: https:\/\/lunar-zeta-ruddy\.vercel\.app/);
assert.match(renderBlueprintSource, /key: COOKIE_SECURE\n\s+value: "true"/);
assert.match(renderBlueprintSource, /key: COOKIE_SAME_SITE\n\s+value: none/);
assert.match(renderBlueprintSource, /key: GITHUB_OAUTH_CALLBACK_URL\n\s+value: https:\/\/lunar-api-thanhluan\.onrender\.com\/api\/v1\/auth\/github\/callback/);
for (const secretName of [
  'DATABASE_URL',
  'JWT_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_TOKEN_ENCRYPTION_KEY'
]) {
  assert.match(renderBlueprintSource, new RegExp(`key: ${secretName}\\n\\s+sync: false`));
}

const lunarApiSource = fs.readFileSync('src/services/lunarApi.js', 'utf8');
assert.match(lunarApiSource, /code = 'API_UNREACHABLE'/);
assert.match(lunarApiSource, /DEPLOYMENT_PROTECTED/);
assert.match(lunarApiSource, /x-lunar-api/);
assert.match(lunarApiSource, /Private Relay/);
assert.match(lunarApiSource, /shouldUseDirectGitHubOAuth/);
assert.doesNotMatch(lunarApiSource, /import\.meta\.env\.PROD && GITHUB_AUTH_FLOW_HINT/);

const serverSource = fs.readFileSync('server/index.js', 'utf8');
assert.match(serverSource, /resolveAllowedOrigins\(\)/);
assert.match(serverSource, /res\.set\('X-Lunar-API', '1'\)/);
assert.match(serverSource, /DATABASE_INDEPENDENT_API_PATHS/);
assert.match(serverSource, /'\/auth\/github\/config'/);
assert.match(serverSource, /'\/auth\/github\/start'/);

console.log(JSON.stringify({
  productionApiOrigin: 'PASS',
  githubOAuthStartOrigin: 'PASS',
  githubCallbackPublicAppRedirect: 'PASS',
  crossSiteCookiePolicy: 'PASS',
  localApiProxyAlignment: 'PASS',
  userFacingNetworkError: 'PASS',
  publicAppCorsFallback: 'PASS',
  safeEdgeRetry: 'PASS',
  apiOriginMarker: 'PASS',
  oauthBootstrapWithoutDatabase: 'PASS',
  directProductionWebOAuth: 'PASS',
  nonBlockingBackgroundEdgeFailure: 'PASS',
  backendOnlyContainer: 'PASS',
  renderBlueprint: 'PASS'
}, null, 2));
