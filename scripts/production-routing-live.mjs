import {
  isJsonMediaType,
  sanitizeRequestId
} from '../src/services/apiResponseError.js';
import { pathToFileURL } from 'node:url';

export const CANONICAL_ORIGIN = 'https://lunar-zeta-ruddy.vercel.app';
const PROBE_TIMEOUT_MS = 10_000;
const STRICT_ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isStrictIsoTimestamp(value) {
  if (typeof value !== 'string' || !STRICT_ISO_8601_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  const canonicalInput = value.includes('.') ? value : value.replace(/Z$/, '.000Z');
  return parsed.toISOString() === canonicalInput;
}

export function parseOrigin(argv) {
  if (argv.length !== 2 || argv[0] !== '--origin' || argv[1] !== CANONICAL_ORIGIN) {
    return null;
  }
  return argv[1];
}

function safeContentType(value) {
  if (typeof value !== 'string' || value.length > 128) return '';
  return /^[A-Za-z0-9!#$%&'*+.^_`|~()/:;=, -]*$/.test(value) ? value : '';
}

function requestIdFrom(headers) {
  return sanitizeRequestId(headers.get('x-vercel-id'))
    || sanitizeRequestId(headers.get('x-correlation-id'));
}

function resultFor({ name, method, path, expectedStatus }) {
  return {
    name,
    method,
    path,
    expectedStatus,
    actualStatus: null,
    contentType: '',
    requestId: null,
    corsOrigin: null,
    passed: false
  };
}

async function withinProbeTimeout(run) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function probeJson(origin, definition, validatePayload, fetchImpl) {
  const result = resultFor(definition);
  try {
    await withinProbeTimeout(async (signal) => {
      const response = await fetchImpl(`${origin}${definition.path}`, {
        method: 'GET',
        redirect: 'manual',
        signal,
        headers: { Accept: 'application/json' }
      });
      const rawContentType = response.headers.get('content-type') || '';
      result.actualStatus = response.status;
      result.contentType = safeContentType(rawContentType);
      result.requestId = requestIdFrom(response.headers);
      const correlationId = sanitizeRequestId(response.headers.get('x-correlation-id'));

      if (
        response.status !== definition.expectedStatus
        || !isJsonMediaType(rawContentType)
        || correlationId === null
      ) {
        return;
      }

      const payload = await response.json();
      result.passed = validatePayload(payload);
    });
  } catch {
    result.passed = false;
  }
  return result;
}

function hasExactKeys(value, expectedKeys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expectedKeys].sort());
}

async function probeHealth(origin, fetchImpl) {
  return probeJson(origin, {
    name: 'health',
    method: 'GET',
    path: '/api/v1/health',
    expectedStatus: 200
  }, (payload) => (
    hasExactKeys(payload, ['status', 'service', 'timestamp'])
    && payload.status === 'HEALTHY'
    && typeof payload.service === 'string'
    && typeof payload.timestamp === 'string'
    && isStrictIsoTimestamp(payload.timestamp)
  ), fetchImpl);
}

async function probeApiNotFound(origin, fetchImpl) {
  return probeJson(origin, {
    name: 'api-not-found',
    method: 'GET',
    path: '/api/v1/__routing_contract_probe__',
    expectedStatus: 404
  }, (payload) => (
    hasExactKeys(payload, ['success', 'error'])
    && payload.success === false
    && payload.error === 'API endpoint not found.'
  ), fetchImpl);
}

async function probeLoginPreflight(origin, fetchImpl) {
  const definition = {
    name: 'login-preflight',
    method: 'OPTIONS',
    path: '/api/v1/auth/login',
    expectedStatus: 204
  };
  const result = resultFor(definition);
  try {
    await withinProbeTimeout(async (signal) => {
      const response = await fetchImpl(`${origin}${definition.path}`, {
        method: 'OPTIONS',
        redirect: 'manual',
        signal,
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST'
        }
      });
      const rawContentType = response.headers.get('content-type') || '';
      const corsOrigin = response.headers.get('access-control-allow-origin');
      const allowCredentials = response.headers.get('access-control-allow-credentials');
      const allowMethods = response.headers.get('access-control-allow-methods') || '';
      const bodyByteLength = (await response.arrayBuffer()).byteLength;

      result.actualStatus = response.status;
      result.contentType = safeContentType(rawContentType);
      result.requestId = requestIdFrom(response.headers);
      result.corsOrigin = corsOrigin === origin ? origin : null;
      result.passed = (
        response.status === definition.expectedStatus
        && rawContentType === ''
        && bodyByteLength === 0
        && corsOrigin === origin
        && allowCredentials === 'true'
        && allowMethods.split(',').some((method) => method.trim().toUpperCase() === 'POST')
      );
    });
  } catch {
    result.passed = false;
  }
  return result;
}

export async function runLiveRouting(origin, { fetchImpl = globalThis.fetch } = {}) {
  const probes = [];
  probes.push(await probeHealth(origin, fetchImpl));
  probes.push(await probeApiNotFound(origin, fetchImpl));
  probes.push(await probeLoginPreflight(origin, fetchImpl));

  const passed = probes.filter((probe) => probe.passed).length;
  return {
    status: passed === 3 ? 'PASS' : 'FAIL',
    origin,
    probes,
    summary: { passed, total: 3 }
  };
}

export async function runLiveRoutingCli(argv, {
  fetchImpl = globalThis.fetch,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  const origin = parseOrigin(argv);
  if (!origin) {
    stderr.write(`Usage: npm run qa:production-routing:live -- --origin ${CANONICAL_ORIGIN}\n`);
    return 2;
  }

  const report = await runLiveRouting(origin, { fetchImpl });
  stdout.write(`${JSON.stringify(report)}\n`);
  return report.status === 'PASS' ? 0 : 1;
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  process.exitCode = await runLiveRoutingCli(process.argv.slice(2));
}
