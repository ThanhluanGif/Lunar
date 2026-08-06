const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9:._-]{1,256}$/;
const JSON_MEDIA_TYPE_PATTERN = /^application\/(?:json|[!#$%&'*+\-.^_`|~A-Za-z0-9]+\+json)$/i;

export class ApiResponseError extends Error {
  constructor(status, code, message, requestId) {
    super(message);
    this.name = 'ApiResponseError';
    this.status = status;
    this.code = code;
    this.payload = {
      error: message,
      code,
      requestId
    };
  }
}

export function sanitizeRequestId(value) {
  if (typeof value !== 'string' || !SAFE_REQUEST_ID_PATTERN.test(value)) return null;
  return value;
}

function resolveRequestId(headers) {
  return sanitizeRequestId(headers.xVercelId)
    || sanitizeRequestId(headers.xCorrelationId);
}

function mediaTypeToken(value) {
  if (typeof value !== 'string') return '';
  return value.split(';', 1)[0].trim().toLowerCase();
}

export function isJsonMediaType(value) {
  return JSON_MEDIA_TYPE_PATTERN.test(mediaTypeToken(value));
}

export function isHtmlMediaType(value) {
  return mediaTypeToken(value) === 'text/html';
}

export function responseMeta(response) {
  const headerValue = (name) => (
    response?.headers?.has(name) ? response.headers.get(name) : null
  );
  return {
    status: Number.isInteger(response?.status) ? response.status : 0,
    contentType: headerValue('content-type') || '',
    headers: {
      xVercelError: headerValue('x-vercel-error'),
      xVercelMitigated: headerValue('x-vercel-mitigated'),
      xVercelId: headerValue('x-vercel-id'),
      xCorrelationId: headerValue('x-correlation-id'),
      server: headerValue('server')
    }
  };
}

function invalidApiResponse(meta) {
  const status = Number.isInteger(meta?.status) ? meta.status : 0;
  const headers = meta?.headers && typeof meta.headers === 'object' ? meta.headers : {};
  return new ApiResponseError(
    status,
    'INVALID_API_RESPONSE',
    `Máy chủ Lunar trả về phản hồi không phải JSON (HTTP ${status}). Vui lòng thử lại sau.`,
    resolveRequestId(headers)
  );
}

export function classifyNonJsonApiResponse(meta) {
  const status = Number.isInteger(meta?.status) ? meta.status : 0;
  const headers = meta?.headers && typeof meta.headers === 'object' ? meta.headers : {};
  const requestId = resolveRequestId(headers);

  if (status === 403 && headers.xVercelError !== null && headers.xVercelError !== undefined) {
    return new ApiResponseError(
      status,
      'DEPLOYMENT_PROTECTED',
      'Yêu cầu bị chặn bởi Deployment Protection. Hãy dùng tên miền production chính thức (canonical) hoặc quyền truy cập/bypass đã được operator cấp.',
      requestId
    );
  }

  const isVercelEdgeResponse = (
    (headers.xVercelMitigated !== null && headers.xVercelMitigated !== undefined)
    || (headers.xVercelId !== null && headers.xVercelId !== undefined)
    || (typeof headers.server === 'string' && headers.server.trim().toLowerCase() === 'vercel')
  );
  if (status === 403 && isVercelEdgeResponse) {
    return new ApiResponseError(
      status,
      'VERCEL_EDGE_FORBIDDEN',
      'Yêu cầu bị chặn tại Vercel Edge/Firewall/Mitigation. Hãy gửi request ID cho quản trị viên để kiểm tra.',
      requestId
    );
  }

  if (status === 403) {
    return new ApiResponseError(
      status,
      'HOSTING_FORBIDDEN',
      'Hosting gateway/WAF trả về HTTP 403. Phản hồi 403 đọc được không phải do CORS tạo ra; hãy liên hệ quản trị viên.',
      requestId
    );
  }

  return invalidApiResponse(meta);
}

export async function readJsonApiResponse(response) {
  const meta = responseMeta(response);
  if (!isJsonMediaType(meta.contentType)) {
    throw classifyNonJsonApiResponse(meta);
  }

  try {
    return await response.json();
  } catch {
    throw invalidApiResponse(meta);
  }
}

export function assertDownloadResponseMediaType(response) {
  const meta = responseMeta(response);
  if (isHtmlMediaType(meta.contentType)) {
    throw invalidApiResponse(meta);
  }
}
