export const MAX_SAFE_API_ATTEMPTS = 3;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RETRYABLE_GATEWAY_STATUSES = new Set([502, 503, 504]);
const RETRY_DELAYS_MS = [250, 750];

function requestMethod(options = {}) {
  return String(options.method || 'GET').trim().toUpperCase();
}

export function isSafeApiRequest(options = {}) {
  return SAFE_METHODS.has(requestMethod(options));
}

export function isJsonApiResponse(response) {
  const contentType = response?.headers?.get?.('content-type') || '';
  return contentType.toLowerCase().includes('application/json');
}

export function shouldRetryApiResponse(response, options = {}, failedAttempt = 0) {
  if (!isSafeApiRequest(options) || failedAttempt >= MAX_SAFE_API_ATTEMPTS - 1) return false;
  if (RETRYABLE_GATEWAY_STATUSES.has(Number(response?.status))) return true;

  // Lunar application-level 403 responses are JSON. A non-JSON 403 is created
  // by a hosting edge/protection layer before Express handles the request.
  return Number(response?.status) === 403 && !isJsonApiResponse(response);
}

export function shouldRetryApiNetworkError(error, options = {}, failedAttempt = 0) {
  return error?.name !== 'AbortError'
    && isSafeApiRequest(options)
    && failedAttempt < MAX_SAFE_API_ATTEMPTS - 1;
}

export function apiRetryDelayMs(failedAttempt = 0) {
  return RETRY_DELAYS_MS[Math.min(failedAttempt, RETRY_DELAYS_MS.length - 1)];
}

export async function fetchWithSafeRetries(fetcher, input, options = {}, wait = () => Promise.resolve()) {
  for (let attempt = 0; attempt < MAX_SAFE_API_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetcher(input, options);
      if (!shouldRetryApiResponse(response, options, attempt)) return response;
      await response.body?.cancel?.().catch(() => {});
      await wait(apiRetryDelayMs(attempt), options.signal);
    } catch (error) {
      if (!shouldRetryApiNetworkError(error, options, attempt)) throw error;
      await wait(apiRetryDelayMs(attempt), options.signal);
    }
  }

  throw new Error('Safe API retry attempts were exhausted.');
}
