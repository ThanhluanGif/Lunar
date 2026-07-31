import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  getUpgradeQuotaContext,
  getPurchasableUpgradePlans,
  isUpgradeQuotaError
} from '../src/services/quotaUpgrade.js';

assert.equal(isUpgradeQuotaError({
  status: 429,
  payload: { quotaExceeded: true, tier: 'FREE', quotaType: 'AI_REVIEW' }
}), true);
assert.equal(isUpgradeQuotaError({
  status: 429,
  payload: { quotaExceeded: false, tier: 'FREE' }
}), false, 'Provider throttling must not be presented as an account upgrade quota.');
assert.equal(isUpgradeQuotaError({
  status: 429,
  payload: { quotaExceeded: true, tier: 'PRO' }
}), false, 'A paid-tier operational error must not open the FREE upgrade flow.');
assert.equal(isUpgradeQuotaError({
  status: 429,
  payload: { error: 'FREE daily scan quota reached.' }
}, 'FREE'), true, 'The deployed legacy deep-scan quota response must open the upgrade flow.');
assert.equal(isUpgradeQuotaError({
  status: 429,
  payload: { error: 'FREE daily scan quota reached.' }
}, 'PRO'), false, 'A paid account must not be paywalled by a stale FREE quota response.');
assert.equal(isUpgradeQuotaError({
  status: 429,
  payload: { error: 'TOO_MANY_REQUESTS: Quá nhiều deep scan. Vui lòng thử lại sau.' }
}, 'FREE'), false, 'Burst throttling must remain an operational error, not an upgrade prompt.');

assert.deepEqual(getUpgradeQuotaContext({
  status: 429,
  payload: { error: 'FREE daily scan quota reached.' }
}, 'FREE', 'VERIFIED_SCAN'), {
  quotaType: 'VERIFIED_SCAN',
  limit: null,
  remaining: 0,
  tier: 'FREE',
  resetAt: null
});

const plans = getPurchasableUpgradePlans([
  { id: 'FREE' },
  { id: 'PRO' },
  { id: 'ENTERPRISE' }
], 'FREE');
assert.deepEqual(plans.map((plan) => plan.id), ['PRO', 'ENTERPRISE']);

const modalSource = fs.readFileSync('src/components/QuotaDepletedModal.jsx', 'utf8');
const submitSource = fs.readFileSync('src/components/SubmitModal.jsx', 'utf8');
const workspaceSource = fs.readFileSync('src/components/UserGitHubWorkspace.jsx', 'utf8');
const repairSource = fs.readFileSync('src/components/CodeRepairWorkbench.jsx', 'utf8');
const scannerSource = fs.readFileSync('src/services/repoScanner.js', 'utf8');
const deepScanRouteSource = fs.readFileSync('server/routes/deepScanRoutes.js', 'utf8');
const appSource = fs.readFileSync('src/App.jsx', 'utf8');
assert.match(modalSource, /lunarApi\.getPaymentPlans\(\)/);
assert.match(modalSource, /quota-plan-/);
assert.doesNotMatch(modalSource, /\$29|290000|1500000/);
assert.match(submitSource, /getUpgradeQuotaContext\(err, currentUser\?\.tier, 'AI_REVIEW'\)/);
assert.match(workspaceSource, /getUpgradeQuotaContext\(error, currentTier, 'VERIFIED_SCAN'\)/);
assert.match(workspaceSource, /result\.projectAttackSimulationError/);
assert.match(repairSource, /getUpgradeQuotaContext\(error, currentTier, 'AI_REVIEW'\)/);
assert.match(scannerSource, /payload: error\.payload \|\| null/);
assert.match(deepScanRouteSource, /quotaType: 'VERIFIED_SCAN'/);
assert.match(deepScanRouteSource, /quotaExceeded: true/);
assert.doesNotMatch(deepScanRouteSource, /error: 'FREE daily scan quota reached\.'/);
assert.match(appSource, /quotaExceededContext/);
assert.match(appSource, /onQuotaExceeded=\{handleQuotaExceeded\}/);
assert.match(appSource, /onOpenPricing=\{handleOpenPricing\}/);

console.log(JSON.stringify({
  structuredQuotaDetection: 'PASS',
  legacyQuotaCompatibility: 'PASS',
  providerRateLimitSeparation: 'PASS',
  serverPlanCatalogRendering: 'PASS',
  allScanSurfacesToUpgradeModalWiring: 'PASS'
}, null, 2));
