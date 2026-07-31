const UPGRADEABLE_TIERS = new Set(['FREE']);
const LEGACY_FREE_SCAN_QUOTA_MESSAGE = /^FREE daily scan quota reached\.?$/i;

function normalizedTier(value, fallback = 'FREE') {
  return String(value || fallback || 'FREE').trim().toUpperCase();
}

function errorMessage(error) {
  return String(error?.payload?.error || error?.payload?.message || error?.message || '').trim();
}

export function isUpgradeQuotaError(error, currentTier = 'FREE') {
  if (error?.status !== 429) return false;

  const tier = normalizedTier(error?.payload?.tier, currentTier);
  if (!UPGRADEABLE_TIERS.has(tier)) return false;

  return error?.payload?.quotaExceeded === true
    || LEGACY_FREE_SCAN_QUOTA_MESSAGE.test(errorMessage(error));
}

export function getUpgradeQuotaContext(error, currentTier = 'FREE', fallbackQuotaType = 'AI_REVIEW') {
  if (!isUpgradeQuotaError(error, currentTier)) return null;

  const payload = error?.payload || {};
  return {
    quotaType: payload.quotaType || fallbackQuotaType,
    limit: payload.limit ?? null,
    remaining: payload.remaining ?? 0,
    tier: normalizedTier(payload.tier, currentTier),
    resetAt: payload.resetAt || null
  };
}

export function getPurchasableUpgradePlans(plans, currentTier = 'FREE') {
  const tier = String(currentTier || 'FREE').toUpperCase();
  return Array.from(plans || []).filter((plan) => (
    plan?.id
    && plan.id !== 'FREE'
    && plan.id !== tier
  ));
}
