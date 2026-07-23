/**
 * Frontend REST API Client Service
 * Connects React App to Node.js/Express Backend Server
 */

const API_BASE_URL = 'http://localhost:5000/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('lunar_jwt_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function registerUserApi({ name, nickname, email, password, tier = 'FREE' }) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, nickname, email, password, tier })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  if (data.token) {
    localStorage.setItem('lunar_jwt_token', data.token);
  }
  return data.user;
}

export async function loginUserApi({ email, password }) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }

  if (data.token) {
    localStorage.setItem('lunar_jwt_token', data.token);
  }
  return data.user;
}

export async function runScanApi({ code, filename }) {
  const res = await fetch(`${API_BASE_URL}/scans/run`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ code, filename })
  });

  const data = await res.json();
  if (res.status === 429) {
    return { success: false, quotaExceeded: true, error: data.error };
  }

  if (!res.ok) {
    throw new Error(data.error || 'Scan failed');
  }

  return data;
}

export async function renewQuotaApi() {
  const res = await fetch(`${API_BASE_URL}/scans/renew-quota`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Quota renewal failed');
  }
  return data;
}
