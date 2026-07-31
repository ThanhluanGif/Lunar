const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const SAFE_RETRY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CORRELATION_ID_PATTERN = /^(?:[0-9a-f]{16,64}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function providerPolicy(overrides = {}) {
  return {
    timeoutMs: boundedInteger(
      overrides.timeoutMs ?? process.env.PROVIDER_TIMEOUT_MS,
      15000,
      1000,
      60000
    ),
    maxRetries: boundedInteger(
      overrides.maxRetries ?? process.env.PROVIDER_MAX_RETRIES,
      1,
      0,
      2
    )
  };
}

function retryDelayMs(attempt, retryAfter) {
  const seconds = Number.parseInt(retryAfter, 10);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(2000, seconds * 1000);
  }
  return Math.min(1000, 100 * (2 ** attempt));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function timedSignal(parentSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const onParentAbort = () => controller.abort(parentSignal.reason);
  if (parentSignal?.aborted) controller.abort(parentSignal.reason);
  else parentSignal?.addEventListener('abort', onParentAbort, { once: true });

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error('PROVIDER_TIMEOUT'));
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', onParentAbort);
    }
  };
}

async function providerFetch(url, options = {}, overrides = {}) {
  const fetchImpl = overrides.fetchImpl || fetch;
  const method = String(options.method || 'GET').toUpperCase();
  const policy = providerPolicy(overrides);
  const allowedRetries = SAFE_RETRY_METHODS.has(method) ? policy.maxRetries : 0;
  const headers = new Headers(options.headers || {});
  const correlationId = String(overrides.correlationId || '').trim();
  if (CORRELATION_ID_PATTERN.test(correlationId)) {
    headers.set('X-Correlation-ID', correlationId);
  }

  let lastError;
  for (let attempt = 0; attempt <= allowedRetries; attempt += 1) {
    const timeout = timedSignal(options.signal, policy.timeoutMs);
    try {
      const response = await fetchImpl(url, {
        ...options,
        method,
        headers,
        signal: timeout.signal
      });
      if (!RETRYABLE_STATUS.has(response.status) || attempt === allowedRetries) {
        return response;
      }
      await response.body?.cancel().catch(() => {});
      await wait(retryDelayMs(attempt, response.headers?.get?.('retry-after')));
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (timeout.didTimeOut()) {
        const timeoutError = new Error('External provider request timed out.');
        timeoutError.code = 'PROVIDER_TIMEOUT';
        timeoutError.status = 503;
        lastError = timeoutError;
      } else {
        lastError = error;
      }
      if (attempt === allowedRetries) throw lastError;
      await wait(retryDelayMs(attempt));
    } finally {
      timeout.cleanup();
    }
  }

  throw lastError || new Error('External provider request failed.');
}

module.exports = {
  providerFetch,
  providerPolicy,
  retryDelayMs
};
