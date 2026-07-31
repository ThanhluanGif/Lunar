import assert from 'node:assert/strict';
import {
  ADMIN_DASHBOARD_REFRESH_INTERVAL_MS,
  USER_DASHBOARD_REFRESH_INTERVAL_MS,
  createLatestRequestGate,
  isDashboardResponseForUser,
  isSystemDashboardResponse
} from '../src/services/dashboardSync.js';

assert.ok(
  USER_DASHBOARD_REFRESH_INTERVAL_MS >= 5_000
    && USER_DASHBOARD_REFRESH_INTERVAL_MS <= 60_000,
  'User dashboard refresh interval must be bounded.'
);
assert.ok(
  ADMIN_DASHBOARD_REFRESH_INTERVAL_MS >= 5_000
    && ADMIN_DASHBOARD_REFRESH_INTERVAL_MS <= 30_000,
  'Admin dashboard refresh interval must provide near-realtime updates without tight polling.'
);

const gate = createLatestRequestGate();
const accountARequest = gate.start();
const accountBRequest = gate.start();
assert.equal(gate.isCurrent(accountARequest), false, 'A stale account request must be rejected.');
assert.equal(gate.isCurrent(accountBRequest), true, 'The latest account request must remain valid.');
gate.invalidate();
assert.equal(gate.isCurrent(accountBRequest), false, 'Logout/account switch must invalidate in-flight data.');

const accountAResponse = {
  scope: 'OWN_ACCOUNT',
  identity: { userId: 'user-a' }
};
assert.equal(isDashboardResponseForUser(accountAResponse, 'user-a'), true);
assert.equal(
  isDashboardResponseForUser(accountAResponse, 'user-b'),
  false,
  'Dashboard data from user A must never render for user B.'
);
assert.equal(isDashboardResponseForUser({ scope: 'SYSTEM' }, 'user-a'), false);
assert.equal(isSystemDashboardResponse({ scope: 'SYSTEM' }), true);
assert.equal(isSystemDashboardResponse(accountAResponse), false);

console.log(JSON.stringify({
  dashboardRequestIsolation: 'PASS',
  dashboardScopeIsolation: 'PASS',
  boundedRealtimeRefresh: 'PASS'
}, null, 2));
