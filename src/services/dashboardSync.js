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

const SYNC_CHANNEL_NAME = 'lunar_realtime_sync_v1';
let syncChannel = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  // BroadcastChannel unavailable fallback
}

export function notifyUserUpdated(userData) {
  if (typeof window === 'undefined') return;
  const detail = { type: 'USER_UPDATED', userData, timestamp: Date.now() };
  window.dispatchEvent(new CustomEvent('lunar:user-updated', { detail }));
  try {
    syncChannel?.postMessage(detail);
  } catch (e) {}
}

export function notifyScanCompleted(scanData) {
  if (typeof window === 'undefined') return;
  const detail = { type: 'SCAN_COMPLETED', scanData, timestamp: Date.now() };
  window.dispatchEvent(new CustomEvent('lunar:scan-completed', { detail }));
  try {
    syncChannel?.postMessage(detail);
  } catch (e) {}
}

export function subscribeToRealtimeSync({ onUserUpdated, onScanCompleted }) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEventUser = (e) => onUserUpdated?.(e.detail?.userData);
  const handleCustomEventScan = (e) => onScanCompleted?.(e.detail?.scanData);

  window.addEventListener('lunar:user-updated', handleCustomEventUser);
  window.addEventListener('lunar:scan-completed', handleCustomEventScan);

  const handleBroadcastMessage = (e) => {
    if (e.data?.type === 'USER_UPDATED') onUserUpdated?.(e.data?.userData);
    if (e.data?.type === 'SCAN_COMPLETED') onScanCompleted?.(e.data?.scanData);
  };

  if (syncChannel) {
    syncChannel.addEventListener('message', handleBroadcastMessage);
  }

  return () => {
    window.removeEventListener('lunar:user-updated', handleCustomEventUser);
    window.removeEventListener('lunar:scan-completed', handleCustomEventScan);
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleBroadcastMessage);
    }
  };
}

