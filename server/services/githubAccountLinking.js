const UNVERIFIED_EMAIL_LINK_CODE = 'GITHUB_EXISTING_ACCOUNT_REQUIRES_VERIFICATION';

function resolveVerifiedEmailAutoLink(emailUser) {
  if (!emailUser) return null;
  if (!emailUser.email_verified_at) {
    const error = new Error(
      'An existing Lunar account uses this email. Sign in and verify that account before linking GitHub.'
    );
    error.code = UNVERIFIED_EMAIL_LINK_CODE;
    error.status = 409;
    throw error;
  }
  return emailUser.id;
}

function githubEmailMatchesLunarAccount(lunarEmail, githubEmail) {
  return String(lunarEmail || '').trim().toLowerCase()
    === String(githubEmail || '').trim().toLowerCase();
}

module.exports = {
  UNVERIFIED_EMAIL_LINK_CODE,
  githubEmailMatchesLunarAccount,
  resolveVerifiedEmailAutoLink
};
