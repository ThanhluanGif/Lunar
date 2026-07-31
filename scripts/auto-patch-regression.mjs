import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applyValidatedPatchToProject,
  canAutoPatchInBulk,
  isValidUnifiedDiff,
  normalizeAutoPatch,
  normalizeRepositoryPath,
  unavailableAutoPatch
} from '../src/services/autoPatchPolicy.js';
import { scanCodeForSecurityVulnerabilities } from '../src/services/securityScannerEngine.js';

const unavailable = unavailableAutoPatch('Validator unavailable.');
assert.deepEqual(unavailable, {
  available: false,
  patchValidated: false,
  before: null,
  after: null,
  unifiedDiff: null,
  reasonUnavailable: 'Validator unavailable.',
  lifecycleStatus: 'triaged'
});

assert.equal(normalizeRepositoryPath('src/app.js'), 'src/app.js');
for (const unsafePath of ['../app.js', '/tmp/app.js', 'C:/tmp/app.js', 'src\\app.js', 'src/../app.js']) {
  assert.equal(normalizeRepositoryPath(unsafePath), '', `Unsafe patch path accepted: ${unsafePath}`);
}

const before = 'const apiKey = "12345678";';
const after = 'const apiKey = process.env.API_KEY;';
const unifiedDiff = [
  '--- a/src/config.js',
  '+++ b/src/config.js',
  '@@ -1 +1 @@',
  `-${before}`,
  `+${after}`
].join('\n');
assert.equal(isValidUnifiedDiff(unifiedDiff, 'src/config.js'), true);
assert.equal(isValidUnifiedDiff(unifiedDiff.replace('src/config.js', '../config.js'), 'src/config.js'), false);

const legacyOnly = normalizeAutoPatch({
  filePath: 'src/config.js',
  patchedCode: after,
  remediation: { patchCode: after, patchValidated: true }
});
assert.equal(legacyOnly.available, false, 'Legacy patchCode must never enable Apply.');
assert.equal(legacyOnly.after, null);

const finding = {
  id: 'LUNAR-001-1',
  ruleId: 'LUNAR-001',
  cwe: 'CWE-798',
  title: 'Hardcoded credential',
  filePath: 'src/config.js',
  available: true,
  patchValidated: true,
  before,
  after,
  unifiedDiff,
  lifecycleStatus: 'proposed'
};
const project = {
  id: 'project-1',
  files: [{ path: 'src/config.js', language: 'javascript', content: before }]
};
const applied = applyValidatedPatchToProject(project, finding, scanCodeForSecurityVulnerabilities);
assert.equal(applied.ok, true);
assert.equal(applied.status, 'verified');
assert.equal(applied.project.files[0].content, after);
assert.equal(applied.project.autoPatchBackups[0].content, before);
assert.equal(project.files[0].content, before, 'Original project must remain a rollback source.');

const conflict = applyValidatedPatchToProject({
  ...project,
  files: [{ ...project.files[0], content: `${before}\n// changed` }]
}, finding, scanCodeForSecurityVulnerabilities);
assert.equal(conflict.ok, false);
assert.match(conflict.reason, /đã thay đổi/);

const symlink = applyValidatedPatchToProject({
  ...project,
  files: [{ ...project.files[0], isSymlink: true }]
}, finding, scanCodeForSecurityVulnerabilities);
assert.equal(symlink.ok, false);
assert.match(symlink.reason, /symbolic link/);

const ineffectiveAfter = `${before}\nconsole.log('unchanged finding');`;
const ineffective = applyValidatedPatchToProject(project, {
  ...finding,
  after: ineffectiveAfter,
  unifiedDiff: [
    '--- a/src/config.js',
    '+++ b/src/config.js',
    '@@ -1 +1,2 @@',
    ` ${before}`,
    "+console.log('unchanged finding');"
  ].join('\n')
}, scanCodeForSecurityVulnerabilities);
assert.equal(ineffective.ok, false);
assert.equal(ineffective.status, 'applied');
assert.equal(ineffective.project.files[0].content, before, 'Failed rescan must rollback.');

const authorizationFinding = { ...finding, cwe: 'CWE-639' };
assert.equal(canAutoPatchInBulk(authorizationFinding), false);
assert.equal(canAutoPatchInBulk({
  ...authorizationFinding,
  policyEvidence: 'Owner-scoped query and ADMIN override are documented.'
}), true);

for (const component of ['src/components/VulnerabilityPatcher.jsx', 'src/components/CodeRepairWorkbench.jsx']) {
  const source = fs.readFileSync(component, 'utf8');
  assert.equal(source.includes('// Chưa có patch code'), false);
}

console.log('Auto-patch regression: PASS');
