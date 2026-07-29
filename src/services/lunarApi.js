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
  logout: () => request('/auth/logout', { method: 'POST' }),
  getGitHubStatus: () => request('/auth/github/status'),
  syncGitHubRepositories: () => request('/auth/github/sync', { method: 'POST' }),
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
  })
};
