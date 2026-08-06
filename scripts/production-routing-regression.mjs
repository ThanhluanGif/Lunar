import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createApiUrl, normalizeApiBaseUrl } from '../src/services/apiUrl.js';
import {
  ApiResponseError,
  assertDownloadResponseMediaType,
  classifyNonJsonApiResponse,
  isHtmlMediaType,
  isJsonMediaType,
  readJsonApiResponse,
  responseMeta,
  sanitizeRequestId
} from '../src/services/apiResponseError.js';
import {
  CANONICAL_ORIGIN,
  runLiveRouting,
  runLiveRoutingCli
} from './production-routing-live.mjs';

const require = createRequire(import.meta.url);
const { resolveCookiePolicy } = require('../server/services/cookiePolicy');
const { createAppRedirectUrl, normalizePublicAppUrl } = require('../server/services/publicAppUrl');

const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
assert.deepEqual(vercelConfig.rewrites, [
  { source: '/api/v1/:path*', destination: '/api' },
  { source: '/(.*)', destination: '/index.html' }
]);

function matchProductionRewrite(pathname) {
  if (/^\/api\/v1(?:\/.*)?$/.test(pathname)) return '/api';
  return '/index.html';
}

assert.equal(matchProductionRewrite('/api/v1/health'), '/api');
assert.equal(matchProductionRewrite('/api/v1/__routing_contract_probe__'), '/api');
assert.equal(matchProductionRewrite('/dashboard'), '/index.html');

const apiEntrySource = fs.readFileSync('api/index.js', 'utf8');
assert.match(apiEntrySource, /import app from ['"]\.\.\/server\/index\.js['"];?/);
assert.match(apiEntrySource, /export default app;/);
assert.doesNotMatch(apiEntrySource, /module\.exports|\brequire\s*\(/);
process.env.JWT_SECRET = 'production-routing-regression-test-only-secret-32-chars';
process.env.LOG_LEVEL = 'ERROR';
const apiEntry = await import('../api/index.js');
assert.deepEqual(Object.keys(apiEntry), ['default']);
assert.equal(apiEntry.default, require('../server/index.js'));

const localServer = createServer(apiEntry.default);
await new Promise((resolve, reject) => {
  localServer.once('error', reject);
  localServer.listen(0, '127.0.0.1', resolve);
});
try {
  const address = localServer.address();
  assert.ok(address && typeof address === 'object');
  const localOrigin = `http://127.0.0.1:${address.port}`;
  const healthResponse = await fetch(`${localOrigin}/api/v1/health`, {
    headers: { Accept: 'application/json' }
  });
  assert.equal(healthResponse.status, 200);
  assert.equal(isJsonMediaType(healthResponse.headers.get('content-type')), true);
  assert.deepEqual(Object.keys(await healthResponse.json()).sort(), ['service', 'status', 'timestamp']);

  const notFoundResponse = await fetch(
    `${localOrigin}/api/v1/__routing_contract_probe__`,
    { headers: { Accept: 'application/json' } }
  );
  assert.equal(notFoundResponse.status, 404);
  assert.equal(isJsonMediaType(notFoundResponse.headers.get('content-type')), true);
  assert.deepEqual(await notFoundResponse.json(), {
    success: false,
    error: 'API endpoint not found.'
  });
} finally {
  await new Promise((resolve, reject) => {
    localServer.close((error) => (error ? reject(error) : resolve()));
  });
}

function assertClassifierCase(meta, expectedCode, expectedRequestId) {
  const error = classifyNonJsonApiResponse(meta);
  assert.ok(error instanceof ApiResponseError);
  assert.equal(error.status, meta.status);
  assert.equal(error.code, expectedCode);
  assert.deepEqual(error.payload, {
    error: error.message,
    code: expectedCode,
    requestId: expectedRequestId
  });
  return error;
}

const protectedError = assertClassifierCase({
  status: 403,
  contentType: 'text/html',
  headers: {
    xVercelError: 'url-protection',
    xVercelMitigated: 'challenge-secret',
    xVercelId: 'sin1::protected-123'
  }
}, 'DEPLOYMENT_PROTECTED', 'sin1::protected-123');
assert.match(protectedError.message, /canonical|chính thức/);
assert.match(protectedError.message, /operator.*(?:quyền|bypass)|(?:quyền|bypass).*operator/i);
assert.doesNotMatch(protectedError.message, /tắt|disable/i);

const mitigatedError = assertClassifierCase({
  status: 403,
  contentType: 'text/html; charset=utf-8',
  headers: {
    xVercelMitigated: 'challenge-secret',
    xCorrelationId: 'correlation.safe-456'
  }
}, 'VERCEL_EDGE_FORBIDDEN', 'correlation.safe-456');

assertClassifierCase({
  status: 403,
  contentType: 'text/html',
  headers: { xVercelId: 'hkg1::edge-789' }
}, 'VERCEL_EDGE_FORBIDDEN', 'hkg1::edge-789');
assertClassifierCase({
  status: 403,
  contentType: 'text/html',
  headers: { server: 'Vercel' }
}, 'VERCEL_EDGE_FORBIDDEN', null);
assertClassifierCase({
  status: 403,
  contentType: 'text/html',
  headers: { xVercelError: '' }
}, 'DEPLOYMENT_PROTECTED', null);
assertClassifierCase({
  status: 403,
  contentType: 'text/html',
  headers: { xVercelMitigated: '' }
}, 'VERCEL_EDGE_FORBIDDEN', null);

const hostingError = assertClassifierCase({
  status: 403,
  contentType: 'text/html',
  headers: {
    xVercelId: 'unsafe id\nsecret',
    xCorrelationId: '<also-unsafe>'
  }
}, 'VERCEL_EDGE_FORBIDDEN', null);
assert.equal(sanitizeRequestId('safe_ID:123.abc-def'), 'safe_ID:123.abc-def');
assert.equal(sanitizeRequestId('x'.repeat(257)), null);
assert.equal(sanitizeRequestId('unsafe id'), null);

const plainHostingError = assertClassifierCase({
  status: 403,
  contentType: 'text/html',
  headers: {}
}, 'HOSTING_FORBIDDEN', null);
assertClassifierCase({
  status: 502,
  contentType: 'text/html',
  headers: { xVercelError: 'must-not-win-for-non-403' }
}, 'INVALID_API_RESPONSE', null);

const redactedDiagnostics = [
  protectedError,
  mitigatedError,
  hostingError,
  plainHostingError
].map((error) => `${error.message}\n${JSON.stringify(error.payload)}`).join('\n');
for (const forbiddenValue of [
  'url-protection',
  'challenge-secret',
  'unsafe id',
  '<also-unsafe>'
]) {
  assert.doesNotMatch(redactedDiagnostics, new RegExp(forbiddenValue));
}

for (const contentType of [
  'application/json',
  'Application/JSON; Charset=UTF-8',
  'application/problem+json',
  'application/vnd.api+json; profile="safe"'
]) {
  assert.equal(isJsonMediaType(contentType), true, contentType);
}
for (const contentType of [
  '',
  'text/html; note=application/json',
  'text/problem+json',
  'application/+json',
  'application/jsonp',
  'application/json extra'
]) {
  assert.equal(isJsonMediaType(contentType), false, contentType);
}
assert.equal(isHtmlMediaType('text/html; charset=utf-8'), true);
assert.equal(isHtmlMediaType('application/xhtml+xml'), false);

assert.deepEqual(await readJsonApiResponse(new Response('{"ok":true}', {
  status: 200,
  headers: { 'content-type': 'application/problem+json; charset=utf-8' }
})), { ok: true });

assert.deepEqual(responseMeta(new Response(null, { status: 200 })).headers, {
  xVercelError: null,
  xVercelMitigated: null,
  xVercelId: null,
  xCorrelationId: null,
  server: null
});
assert.deepEqual(responseMeta(new Response(null, {
  status: 403,
  headers: { 'x-vercel-error': '', 'x-vercel-mitigated': '' }
})).headers, {
  xVercelError: '',
  xVercelMitigated: '',
  xVercelId: null,
  xCorrelationId: null,
  server: null
});

let emptyProtectionHeaderError;
try {
  await readJsonApiResponse(new Response('<html></html>', {
    status: 403,
    headers: { 'content-type': 'text/html', 'x-vercel-error': '' }
  }));
} catch (cause) {
  emptyProtectionHeaderError = cause;
}
assert.equal(emptyProtectionHeaderError?.code, 'DEPLOYMENT_PROTECTED');

let absentProtectionHeaderError;
try {
  await readJsonApiResponse(new Response('<html></html>', {
    status: 403,
    headers: { 'content-type': 'text/html' }
  }));
} catch (cause) {
  absentProtectionHeaderError = cause;
}
assert.equal(absentProtectionHeaderError?.code, 'HOSTING_FORBIDDEN');

let emptyMitigationHeaderError;
try {
  await readJsonApiResponse(new Response('<html></html>', {
    status: 403,
    headers: { 'content-type': 'text/html', 'x-vercel-mitigated': '' }
  }));
} catch (cause) {
  emptyMitigationHeaderError = cause;
}
assert.equal(emptyMitigationHeaderError?.code, 'VERCEL_EDGE_FORBIDDEN');

const malformedJsonErrors = [];
for (const status of [200, 403, 502]) {
  const requestId = `safe-request-${status}`;
  const bodySecret = `malformed-body-secret-${status}`;
  let error;
  try {
    await readJsonApiResponse(new Response(`{"secret":"${bodySecret}"`, {
      status,
      headers: {
        'content-type': 'application/json',
        'x-vercel-error': 'header-secret-must-not-change-malformed-json-code',
        'x-vercel-id': requestId
      }
    }));
  } catch (cause) {
    error = cause;
  }
  assert.ok(error instanceof ApiResponseError);
  assert.equal(error.status, status);
  assert.equal(error.code, 'INVALID_API_RESPONSE');
  assert.equal(error.payload.requestId, requestId);
  assert.doesNotMatch(`${error.message}\n${JSON.stringify(error.payload)}`, /secret/);
  malformedJsonErrors.push(error);
}

let htmlDownloadError;
try {
  const response = new Response('<html>download-body-secret</html>', {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-correlation-id': 'download-safe-200'
    }
  });
  assertDownloadResponseMediaType(response);
} catch (cause) {
  htmlDownloadError = cause;
}
assert.ok(htmlDownloadError instanceof ApiResponseError);
assert.equal(htmlDownloadError.status, 200);
assert.equal(htmlDownloadError.code, 'INVALID_API_RESPONSE');
assert.equal(htmlDownloadError.payload.requestId, 'download-safe-200');
assert.doesNotMatch(
  `${htmlDownloadError.message}\n${JSON.stringify(htmlDownloadError.payload)}`,
  /download-body-secret/
);
for (const contentType of [
  'application/pdf',
  'text/csv; charset=utf-8',
  'text/markdown; charset=utf-8'
]) {
  assert.doesNotThrow(() => assertDownloadResponseMediaType(new Response('safe', {
    status: 200,
    headers: { 'content-type': contentType }
  })));
}

function happyLiveResponse(input) {
  const url = new URL(input);
  if (url.pathname === '/api/v1/health') {
    return new Response(JSON.stringify({
      status: 'HEALTHY',
      service: 'Lunar Security REST API Engine',
      timestamp: '2026-08-02T05:06:07.123Z'
    }), {
      status: 200,
      headers: {
        'content-type': 'application/health+json; charset=utf-8',
        'x-correlation-id': 'correlation-health-200',
        'x-vercel-id': 'edge-health-200'
      }
    });
  }
  if (url.pathname === '/api/v1/__routing_contract_probe__') {
    return new Response(JSON.stringify({
      success: false,
      error: 'API endpoint not found.'
    }), {
      status: 404,
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': 'correlation-not-found-404'
      }
    });
  }
  if (url.pathname === '/api/v1/auth/login') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': CANONICAL_ORIGIN,
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'GET, POST, OPTIONS'
      }
    });
  }
  throw new Error('Unexpected live-routing probe path.');
}

const liveRequests = [];
const happyLiveFetch = async (input, options) => {
  liveRequests.push({ input: String(input), options });
  return happyLiveResponse(input);
};

let invalidCliStdout = '';
let invalidCliStderr = '';
assert.equal(await runLiveRoutingCli([
  '--origin',
  `${CANONICAL_ORIGIN}/unexpected-path`
], {
  fetchImpl: happyLiveFetch,
  stdout: { write: (chunk) => { invalidCliStdout += chunk; } },
  stderr: { write: (chunk) => { invalidCliStderr += chunk; } }
}), 2);
assert.equal(invalidCliStdout, '');
assert.match(invalidCliStderr, /^Usage:/);
assert.equal(liveRequests.length, 0);

let happyCliStdout = '';
let happyCliStderr = '';
assert.equal(await runLiveRoutingCli(['--origin', CANONICAL_ORIGIN], {
  fetchImpl: happyLiveFetch,
  stdout: { write: (chunk) => { happyCliStdout += chunk; } },
  stderr: { write: (chunk) => { happyCliStderr += chunk; } }
}), 0);
assert.equal(happyCliStderr, '');
assert.equal(happyCliStdout.trim().split('\n').length, 1);
const happyLiveReport = JSON.parse(happyCliStdout);
assert.deepEqual(Object.keys(happyLiveReport).sort(), ['origin', 'probes', 'status', 'summary']);
assert.equal(happyLiveReport.status, 'PASS');
assert.deepEqual(happyLiveReport.summary, { passed: 3, total: 3 });
assert.equal(happyLiveReport.probes.length, 3);
for (const probe of happyLiveReport.probes) {
  assert.deepEqual(Object.keys(probe).sort(), [
    'actualStatus',
    'contentType',
    'corsOrigin',
    'expectedStatus',
    'method',
    'name',
    'passed',
    'path',
    'requestId'
  ]);
}
assert.equal(happyLiveReport.probes[0].requestId, 'edge-health-200');
assert.equal(liveRequests.length, 3);
for (const { options } of liveRequests) {
  assert.equal(options.redirect, 'manual');
  assert.equal('body' in options, false);
  assert.equal('credentials' in options, false);
  const requestHeaders = new Headers(options.headers);
  assert.equal(requestHeaders.has('cookie'), false);
  assert.equal(requestHeaders.has('authorization'), false);
}
assert.equal(liveRequests[0].options.method, 'GET');
assert.deepEqual(liveRequests[0].options.headers, { Accept: 'application/json' });
assert.equal(liveRequests[1].options.method, 'GET');
assert.deepEqual(liveRequests[1].options.headers, { Accept: 'application/json' });
assert.equal(liveRequests[2].options.method, 'OPTIONS');
assert.deepEqual(liveRequests[2].options.headers, {
  Origin: CANONICAL_ORIGIN,
  'Access-Control-Request-Method': 'POST'
});

function assertOnlyProbeFailed(report, failedProbeName, context = failedProbeName) {
  assert.equal(report.status, 'FAIL', `${context}: report status`);
  assert.deepEqual(report.summary, { passed: 2, total: 3 });
  assert.deepEqual(
    report.probes.filter((probe) => !probe.passed).map((probe) => probe.name),
    [failedProbeName]
  );
}

function healthResponse({
  timestamp = '2026-08-02T05:06:07.123Z',
  correlationId = 'correlation-health-200'
} = {}) {
  const headers = new Headers({
    'content-type': 'application/health+json; charset=utf-8',
    'x-vercel-id': 'edge-health-200'
  });
  if (correlationId !== null) headers.set('x-correlation-id', correlationId);
  return new Response(JSON.stringify({
    status: 'HEALTHY',
    service: 'Lunar Security REST API Engine',
    timestamp
  }), { status: 200, headers });
}

function notFoundResponse({ correlationId = 'correlation-not-found-404' } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (correlationId !== null) headers.set('x-correlation-id', correlationId);
  return new Response(JSON.stringify({
    success: false,
    error: 'API endpoint not found.'
  }), { status: 404, headers });
}

async function runWithResponseFor(pathname, responseFactory) {
  return runLiveRouting(CANONICAL_ORIGIN, {
    fetchImpl: async (input) => (
      new URL(input).pathname === pathname
        ? responseFactory()
        : happyLiveResponse(input)
    )
  });
}

for (const correlationId of [null, '<unsafe-health-correlation>']) {
  const report = await runWithResponseFor(
    '/api/v1/health',
    () => healthResponse({ correlationId })
  );
  assertOnlyProbeFailed(report, 'health');
}

for (const correlationId of [null, '<unsafe-not-found-correlation>']) {
  const report = await runWithResponseFor(
    '/api/v1/__routing_contract_probe__',
    () => notFoundResponse({ correlationId })
  );
  assertOnlyProbeFailed(report, 'api-not-found');
}

for (const timestamp of [
  '2026-02-30T05:06:07.123Z',
  '2026-08-02 05:06:07'
]) {
  const report = await runWithResponseFor(
    '/api/v1/health',
    () => healthResponse({ timestamp })
  );
  assertOnlyProbeFailed(report, 'health', `invalid health timestamp ${timestamp}`);
}

const preflightContentTypeFailureReport = await runWithResponseFor(
  '/api/v1/auth/login',
  () => new Response(null, {
    status: 204,
    headers: {
      'content-type': 'text/plain',
      'access-control-allow-origin': CANONICAL_ORIGIN,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'POST'
    }
  })
);
assertOnlyProbeFailed(preflightContentTypeFailureReport, 'login-preflight');

const failedCliStdoutWrites = [];
const failedCliStderrWrites = [];
const failedCliExit = await runLiveRoutingCli(['--origin', CANONICAL_ORIGIN], {
  fetchImpl: async (input) => (
    new URL(input).pathname === '/api/v1/health'
      ? new Response(null, { status: 307, headers: { location: '/login' } })
      : happyLiveResponse(input)
  ),
  stdout: { write: (chunk) => { failedCliStdoutWrites.push(chunk); } },
  stderr: { write: (chunk) => { failedCliStderrWrites.push(chunk); } }
});
assert.equal(failedCliExit, 1);
assert.equal(failedCliStdoutWrites.length, 1);
assert.equal(failedCliStderrWrites.length, 0);
const [failedCliStdout] = failedCliStdoutWrites;
assert.match(failedCliStdout, /^\{[^\n]*\}\n$/);
const failedCliReport = JSON.parse(failedCliStdout);
assert.deepEqual(Object.keys(failedCliReport).sort(), ['origin', 'probes', 'status', 'summary']);
assert.equal(failedCliReport.origin, CANONICAL_ORIGIN);
assert.equal(failedCliReport.probes.length, 3);
for (const probe of failedCliReport.probes) {
  assert.deepEqual(Object.keys(probe).sort(), [
    'actualStatus',
    'contentType',
    'corsOrigin',
    'expectedStatus',
    'method',
    'name',
    'passed',
    'path',
    'requestId'
  ]);
}
assertOnlyProbeFailed(failedCliReport, 'health');

const redirectFailureReport = await runLiveRouting(CANONICAL_ORIGIN, {
  fetchImpl: async (input) => (
    new URL(input).pathname === '/api/v1/health'
      ? new Response(null, { status: 307, headers: { location: '/login' } })
      : happyLiveResponse(input)
  )
});
assert.equal(redirectFailureReport.status, 'FAIL');
assert.deepEqual(redirectFailureReport.summary, { passed: 2, total: 3 });

const contractFailureReport = await runLiveRouting(CANONICAL_ORIGIN, {
  fetchImpl: async (input) => {
    if (new URL(input).pathname !== '/api/v1/health') return happyLiveResponse(input);
    return healthResponse({ timestamp: '2026-08-02 05:06:07' });
  }
});
assertOnlyProbeFailed(contractFailureReport, 'health');

const networkFailureReport = await runLiveRouting(CANONICAL_ORIGIN, {
  fetchImpl: async (input) => {
    if (new URL(input).pathname === '/api/v1/health') throw new Error('offline');
    return happyLiveResponse(input);
  }
});
assert.equal(networkFailureReport.status, 'FAIL');
assert.deepEqual(networkFailureReport.summary, { passed: 2, total: 3 });

const preflightBodyFailureReport = await runLiveRouting(CANONICAL_ORIGIN, {
  fetchImpl: async (input) => {
    if (new URL(input).pathname !== '/api/v1/auth/login') return happyLiveResponse(input);
    return {
      status: 204,
      headers: new Headers({
        'access-control-allow-origin': CANONICAL_ORIGIN,
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'POST'
      }),
      arrayBuffer: async () => new Uint8Array([1]).buffer
    };
  }
});
assert.equal(preflightBodyFailureReport.status, 'FAIL');
assert.deepEqual(preflightBodyFailureReport.summary, { passed: 2, total: 3 });

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

const viteConfigSource = fs.readFileSync('vite.config.js', 'utf8');
const envExampleSource = fs.readFileSync('.env.example', 'utf8');
assert.match(viteConfigSource, /VITE_API_PROXY_TARGET \|\| 'http:\/\/127\.0\.0\.1:5000'/);
assert.match(envExampleSource, /^PORT=5000$/m);
assert.match(envExampleSource, /^VITE_API_PROXY_TARGET=http:\/\/127\.0\.0\.1:5000$/m);

const lunarApiSource = fs.readFileSync('src/services/lunarApi.js', 'utf8');
const apiResponseErrorSource = fs.readFileSync('src/services/apiResponseError.js', 'utf8');
assert.match(lunarApiSource, /code = 'API_UNREACHABLE'/);
assert.doesNotMatch(lunarApiSource, /Kiểm tra VITE_API_BASE_URL, HTTPS và CORS/);
assert.doesNotMatch(lunarApiSource, /response\.text\s*\(/);
assert.match(lunarApiSource, /readJsonApiResponse\(response\)/);
assert.match(lunarApiSource, /assertDownloadResponseMediaType\(response\)/);
assert.doesNotMatch(apiResponseErrorSource, /response\.text\s*\(/);
assert.doesNotMatch(apiResponseErrorSource, /x-vercel-challenge-token/i);

console.log(JSON.stringify({
  apiRewriteOrder: 'PASS',
  serverlessEntry: 'PASS',
  offlineExpressRouting: 'PASS',
  nonJsonClassifier: '4/4 PASS',
  headerPresencePrecedence: 'PASS',
  strictJsonMediaType: 'PASS',
  malformedJsonRedaction: `${malformedJsonErrors.length}/3 PASS`,
  downloadMediaTypeGuard: 'PASS',
  offlineLiveRouting: 'PASS',
  diagnosticRedaction: 'PASS',
  productionApiOrigin: 'PASS',
  githubOAuthStartOrigin: 'PASS',
  githubCallbackPublicAppRedirect: 'PASS',
  crossSiteCookiePolicy: 'PASS',
  localApiProxyAlignment: 'PASS',
  userFacingNetworkError: 'PASS'
}, null, 2));
