const API_ROOT = '/api/v1';

async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
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
  getGitHubStatus: () => request('/auth/github/status'),
  getGitHubRepositories: () => request('/auth/github/repositories'),
  syncGitHubRepositories: () => request('/auth/github/sync', { method: 'POST' }),
  disconnectGitHub: () => request('/auth/github/disconnect', { method: 'POST' }),
  getCommunityAudits: () => request('/community/audits'),
  createCommunityAudit: (payload) => request('/community/audits', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  upvoteCommunityAudit: (auditId) => request(`/community/audits/${encodeURIComponent(auditId)}/upvote`, {
    method: 'POST'
  }),
  getCommunityLeaderboard: () => request('/community/leaderboard'),
  getDashboardAccess: () => request('/dashboard/access'),
  getDashboardOverview: (days = 28) => request(`/dashboard/overview?days=${days}`),
  getAdminOverview: () => request('/admin/overview'),
  getAdminUsers: () => request('/admin/users?limit=100'),
  getAdminPayments: () => request('/admin/payments?limit=100'),
  getAdminAuditLog: () => request('/admin/audit-log?limit=100'),
  createPaymentOrder: (tier, paymentMethod = 'VIETQR') => request('/payment/create-order', {
    method: 'POST',
    body: JSON.stringify({ tier, paymentMethod })
  }),
  getPaymentStatus: (orderCode) => request(`/payment/status/${encodeURIComponent(orderCode)}`),
  getSubscription: () => request('/payment/subscription'),
  getAiProviders: () => request('/ai/providers'),
  reviewCodeWithAi: (payload) => request('/ai/review', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  simulateProjectHackerAttack: (payload) => request('/ai/project-attack-simulation', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
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
  }),
  getGmailNotificationStatus: () => request('/notifications/gmail/status'),
  updateGmailNotificationPreferences: (payload) => request('/notifications/gmail/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  disconnectGmail: () => request('/notifications/gmail/disconnect', {
    method: 'POST'
  }),
  getGmailNotificationHistory: () => request('/notifications/gmail/history'),
  sendAuditReportEmail: (payload) => request('/notifications/gmail/audit-report', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
};
