const API_ROOT = '/api/v1';

async function readJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const error = new Error(
      'Không kết nối được Lunar API. Hãy chạy backend Docker ở cổng 5050 '
      + 'hoặc cấu hình VITE_API_PROXY_TARGET.'
    );
    error.status = 502;
    error.payload = { error: error.message };
    throw error;
  }

  return response.json().catch(() => ({}));
}

async function request(path, options = {}) {
  const { acceptedStatuses = [], ...fetchOptions } = options;
  const response = await fetch(`${API_ROOT}${path}`, {
    credentials: 'include',
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

async function download(path) {
  const response = await fetch(`${API_ROOT}${path}`, { credentials: 'include' });
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
  getDashboardOverview: (days = 28) => request(`/dashboard/overview?days=${days}`),
  getAdminOverview: () => request('/admin/overview'),
  getAdminUsers: () => request('/admin/users?limit=100'),
  getAdminPayments: () => request('/admin/payments?limit=100'),
  getAdminAuditLog: () => request('/admin/audit-log?limit=100'),
  getPaymentPlans: () => request('/payment/plans'),
  createPaymentOrder: (tier, paymentMethod = 'VIETQR') => request('/payment/create-order', {
    method: 'POST',
    body: JSON.stringify({ tier, paymentMethod })
  }),
  getPaymentStatus: (orderCode) => request(`/payment/status/${encodeURIComponent(orderCode)}`),
  getSubscription: () => request('/payment/subscription'),
  downloadAuditReportPdf: (scanId) => download(`/reports/export/pdf/${encodeURIComponent(scanId)}`),
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
  updateAdminPayment: (orderCode, status, reason) => request(`/admin/payments/${orderCode}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason })
  }),
  runGuestPreviewScan: (payload) => request('/scans/guest-preview', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
};
