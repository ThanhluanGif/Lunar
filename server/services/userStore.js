// Shared Real In-Memory Store for Resilient Runtime (when PostgreSQL is not connected)
// Contains strictly real runtime data. ZERO fake example or dummy entries.

const realUsersStore = [];
const realPaymentsStore = [];
const realAuditLogsStore = [];
const realLoginEventsStore = [];

function findUserById(id) {
  return realUsersStore.find((u) => String(u.id) === String(id)) || null;
}

function findUserByEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const target = email.trim().toLowerCase();
  return realUsersStore.find((u) => u.email?.toLowerCase() === target) || null;
}

function findUserByNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') return null;
  const target = nickname.trim().toLowerCase();
  return realUsersStore.find((u) => u.nickname?.toLowerCase() === target) || null;
}

function addOrUpdateRealUser(user) {
  if (!user || !user.id) return user;
  const index = realUsersStore.findIndex((u) => String(u.id) === String(user.id) || u.email === user.email);
  if (index !== -1) {
    realUsersStore[index] = {
      ...realUsersStore[index],
      ...user,
      updated_at: new Date().toISOString()
    };
    return realUsersStore[index];
  }
  const newUser = {
    id: user.id,
    nickname: user.nickname || `@user_${Date.now()}`,
    name: user.name || 'User',
    email: user.email,
    password_hash: user.password_hash || '',
    tier: user.tier || 'FREE',
    role: user.role || 'USER',
    status: user.status || 'ACTIVE',
    daily_scans_used: user.daily_scans_used ?? 0,
    last_scan_reset_at: user.last_scan_reset_at || new Date().toISOString(),
    last_login_at: user.last_login_at || new Date().toISOString(),
    created_at: user.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  realUsersStore.unshift(newUser);
  return newUser;
}

function recordRealLoginEvent({ userId, authMethod, ipAddress, userAgent, correlationId }) {
  if (!userId) return;
  const event = {
    id: `login-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    user_id: userId,
    auth_method: authMethod || 'PASSWORD',
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    correlation_id: correlationId || null,
    created_at: new Date().toISOString()
  };
  realLoginEventsStore.unshift(event);

  const user = findUserById(userId);
  if (user) {
    user.last_login_at = event.created_at;
    user.updated_at = event.created_at;
  }
}

module.exports = {
  realUsersStore,
  realPaymentsStore,
  realAuditLogsStore,
  realLoginEventsStore,
  findUserById,
  findUserByEmail,
  findUserByNickname,
  addOrUpdateRealUser,
  recordRealLoginEvent
};
