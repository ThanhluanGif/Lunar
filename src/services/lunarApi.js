import { createApiUrl, normalizeApiBaseUrl } from './apiUrl';

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL, {
  requireHttps: import.meta.env.PROD
});

function apiUrl(path) {
  return createApiUrl(path, API_BASE_URL);
}

async function fetchApi(path, options) {
  try {
    return await fetch(apiUrl(path), options);
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    const target = API_BASE_URL || 'backend cùng domain';
    const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const crossOrigin = Boolean(API_BASE_URL && frontendOrigin && API_BASE_URL !== frontendOrigin);
    const error = new Error(
      `Không thể kết nối máy chủ Lunar (${target}). `
      + (crossOrigin
        ? `Frontend ${frontendOrigin} đang gọi API khác origin; hãy kiểm tra CORS allowlist, HTTPS và cookie cross-site. `
        : '')
      + 'Vui lòng thử lại sau hoặc liên hệ quản trị viên nếu lỗi vẫn tiếp diễn.'
    );
    error.status = 502;
    error.code = 'API_UNREACHABLE';
    error.payload = {
      error: error.message,
      code: error.code,
      target: API_BASE_URL || 'same-origin'
    };
    error.cause = cause;
    throw error;
  }
}

async function readJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const status = response.status || 502;
    const responseText = await response.text().catch(() => '');
    const vercelRequestId = response.headers.get('x-vercel-id') || '';
    const vercelError = response.headers.get('x-vercel-error') || '';
    const looksLikeVercelProtection = Boolean(
      vercelError
      || /vercel authentication|deployment protection|security checkpoint/i.test(responseText)
    );
    const looksLikeVercelEdge = Boolean(
      vercelRequestId || /^vercel$/i.test(response.headers.get('server') || '')
    );
    const errorMsg = status === 403 && looksLikeVercelProtection
      ? 'Vercel đã chặn request trước khi tới Lunar API (HTTP 403). Hãy tắt Deployment Protection cho production hoặc dùng đúng production domain.'
      : status === 403 && looksLikeVercelEdge
      ? 'Vercel Edge/Firewall đã trả HTTP 403 trước khi Lunar API trả JSON. Hãy kiểm tra custom firewall, IP block, attack mode và production domain.'
      : status === 403
      ? 'Gateway/WAF của hosting đã từ chối request trước khi trả JSON (HTTP 403). CORS không tạo ra phản hồi HTTP 403 đọc được; hãy kiểm tra firewall rule và request ID.'
      : (status === 502 || status === 503 || status === 504)
      ? `Máy chủ Lunar hiện đang bận hoặc tạm thời chưa kết nối được (HTTP ${status}). Bạn có thể Đăng Nhập bằng Email / Nickname.`
      : `Máy chủ Lunar phản hồi không theo định dạng JSON (HTTP ${status}). Vui lòng thử lại hoặc đăng nhập bằng Email / Nickname.`;
    const requestId = vercelRequestId || response.headers.get('x-correlation-id') || '';
    const error = new Error(`${errorMsg}${requestId ? ` Mã request: ${requestId}.` : ''}`);
    error.status = status;
    error.code = status === 403
      ? (looksLikeVercelProtection
        ? 'DEPLOYMENT_PROTECTED'
        : (looksLikeVercelEdge ? 'VERCEL_EDGE_FORBIDDEN' : 'HOSTING_FORBIDDEN'))
      : 'INVALID_API_RESPONSE';
    error.payload = {
      error: error.message,
      code: error.code,
      requestId: requestId || null
    };
    throw error;
  }

  return response.json().catch(() => ({}));
}

async function request(path, options = {}) {
  const { acceptedStatuses = [], ...fetchOptions } = options;
  const response = await fetchApi(path, {
    credentials: 'include',
    cache: 'no-store',
    ...fetchOptions,
    headers: {
      ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...(fetchOptions.headers || {})
    }
  });

  const payload = await readJsonResponse(response);
  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    const error = new Error(payload.error || payload.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function download(path, options = {}) {
  const response = await fetchApi(path, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return {
    blob: await response.blob(),
    contentDisposition: response.headers.get('content-disposition') || ''
  };
}

export const lunarApi = {
  getGitHubOAuthStartUrl: () => apiUrl('/auth/github/start'),
  getMe: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  register: ({ name, nickname, email, password }) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, nickname, email, password })
  }),
  forgotPassword: (email) => request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),
  resetPassword: (token, password) => request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password })
  }),
  verifyEmail: (token) => request('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token })
  }),
  resendEmailVerification: () => request('/auth/resend-verification', {
    method: 'POST'
  }),
  updateAccount: (name) => request('/auth/account', {
    method: 'PATCH',
    body: JSON.stringify({ name })
  }),
  changePassword: (currentPassword, newPassword) => request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  }),
  getScanHistory: (limit = 30) => request(`/auth/scan-history?limit=${limit}`),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getGitHubConfig: () => request('/auth/github/config'),
  startGitHubDeviceAuth: () => request('/auth/github/device/start', { method: 'POST' }),
  pollGitHubDeviceAuth: () => request('/auth/github/device/poll', {
    method: 'POST',
    acceptedStatuses: [202]
  }),
  getGitHubStatus: () => request('/auth/github/status'),
  getGitHubRepositories: () => request('/auth/github/repositories'),
  syncGitHubRepositories: () => request('/auth/github/sync', { method: 'POST' }),
  disconnectGitHub: () => request('/auth/github/disconnect', { method: 'POST' }),
  createGitHubSecurityPR: (payload) => request('/github/pull-requests', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getDashboardAccess: () => request('/dashboard/access'),
  getDashboardOverview: (days = 28, options = {}) => request(`/dashboard/overview?days=${days}`, options),
  getAdminOverview: (options = {}) => request('/admin/overview', options),
  getAdminUsers: (options = {}) => request('/admin/users?limit=100', options),
  getAdminPayments: (options = {}) => request('/admin/payments?limit=100', options),
  getAdminAuditLog: (options = {}) => request('/admin/audit-log?limit=100', options),
  getAdminAnalytics: (days = 14, options = {}) => request(`/admin/analytics?days=${days}`, options),

  getPaymentPlans: () => request('/payment/plans'),
  createPaymentOrder: (tier, paymentMethod = 'VIETQR') => request('/payment/create-order', {
    method: 'POST',
    body: JSON.stringify({ tier, paymentMethod })
  }),
  getPaymentStatus: (orderCode) => request(`/payment/status/${encodeURIComponent(orderCode)}`),
  getSubscription: () => request('/payment/subscription'),
  downloadAuditReportPdf: (scanId) => download(`/reports/export/pdf/${encodeURIComponent(scanId)}`),
  downloadAuditReportCsv: (scanId) => download(`/reports/export/csv/${encodeURIComponent(scanId)}`),
  downloadAuditReportMarkdown: (scanId) => download(`/reports/export/markdown/${encodeURIComponent(scanId)}`),
  downloadPortableRemediationReport: (format, payload) => download(
    `/reports/export/portable/${encodeURIComponent(format)}`,
    { method: 'POST', body: JSON.stringify(payload) }
  ),
  getAiProviders: () => request('/ai/providers'),
  reviewCodeWithAi: (payload) => request('/ai/review', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  simulateProjectHackerAttack: (payload) => request('/ai/project-attack-simulation', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getAssistantStatus: () => request('/assistant/status'),
  sendAssistantMessage: (payload) => request('/assistant/chat', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getAssistantHistory: (conversationId) => request(
    `/assistant/history${conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : ''}`
  ),
  clearAssistantHistory: (conversationId) => request(
    `/assistant/history/${encodeURIComponent(conversationId)}`,
    { method: 'DELETE' }
  ),
  deepScanRepository: (payload) => request('/deep-scans/repository', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  updateAdminUser: (userId, changes, reason) => request(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...changes, reason })
  }),
  resetAdminQuota: (userId, reason) => request(`/admin/users/${userId}/reset-quota`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),
  cleanupQaUsers: (reason) => request('/admin/users/cleanup-qa', {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'Dọn dẹp tài khoản test tự động QA.' })
  }),
  updateAdminPayment: (orderCode, status, reason) => request(`/admin/payments/${orderCode}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason })
  }),
  runGuestPreviewScan: (payload) => request('/scans/guest-preview', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  sendSupportContact: (payload) => request('/public/contact', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  clearScanHistory: () => request('/auth/scan-history', { method: 'DELETE' }),
  purgeOldAdminData: (reason) => request('/admin/purge-old-data', {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'Xóa dữ liệu cũ và lượt quét cũ trong dashboard.' })
  })
};
