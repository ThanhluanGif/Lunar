export const USER_DASHBOARD_REFRESH_INTERVAL_MS = 15_000;
export const ADMIN_DASHBOARD_REFRESH_INTERVAL_MS = 10_000;

export function createLatestRequestGate() {
  let latestRequest = 0;
  return {
    start() {
      latestRequest += 1;
      return latestRequest;
    },
    invalidate() {
      latestRequest += 1;
    },
    isCurrent(requestId) {
      return requestId === latestRequest;
    }
  };
}

export function isDashboardResponseForUser(response, userId) {
  return Boolean(
    userId
    && response?.scope === 'OWN_ACCOUNT'
    && String(response?.identity?.userId) === String(userId)
  );
}

export function isSystemDashboardResponse(response) {
  return response?.scope === 'SYSTEM' || response?.success === true;
}
