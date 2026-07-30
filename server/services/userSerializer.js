function tokenPayload(user) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    tier: user.tier,
    role: user.role || 'USER',
    status: user.status || 'ACTIVE',
    authVersion: user.auth_version ?? user.authVersion ?? 0
  };
}

function serializeUser(user) {
  const avatarUrl = user.avatar_url ?? user.avatarUrl ?? null;
  return {
    id: user.id,
    nickname: user.nickname,
    name: user.name,
    email: user.email,
    emailVerified: Boolean(user.email_verified_at ?? user.emailVerified),
    tier: user.tier,
    role: user.role || 'USER',
    status: user.status || 'ACTIVE',
    avatarUrl,
    avatar_url: avatarUrl,
    dailyScansUsed: user.daily_scans_used ?? user.dailyScansUsed ?? 0,
    daily_scans_used: user.daily_scans_used ?? user.dailyScansUsed ?? 0
  };
}

module.exports = {
  serializeUser,
  tokenPayload
};
