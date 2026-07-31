const AUTHORIZATION_CWES = new Set(['CWE-285', 'CWE-639', 'CWE-862']);

export const AUTO_PATCH_STATES = Object.freeze([
  'detected',
  'triaged',
  'proposed',
  'applied',
  'verified'
]);

export function unavailableAutoPatch(reasonUnavailable = 'Không có bản vá đã được xác thực.') {
  return {
    available: false,
    patchValidated: false,
    before: null,
    after: null,
    unifiedDiff: null,
    reasonUnavailable,
    lifecycleStatus: 'triaged'
  };
}

export function normalizeRepositoryPath(filePath) {
  const value = typeof filePath === 'string' ? filePath.trim() : '';
  if (
    !value
    || value.includes('\0')
    || value.includes('\\')
    || value.startsWith('/')
    || /^[A-Za-z]:/.test(value)
  ) {
    return '';
  }

  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return '';
  return segments.join('/');
}

export function isValidUnifiedDiff(unifiedDiff, filePath) {
  if (typeof unifiedDiff !== 'string' || unifiedDiff.length === 0 || unifiedDiff.length > 1000000) {
    return false;
  }
  const safePath = normalizeRepositoryPath(filePath);
  if (!safePath) return false;

  const lines = unifiedDiff.replace(/\r\n/g, '\n').split('\n');
  return lines[0] === `--- a/${safePath}`
    && lines[1] === `+++ b/${safePath}`
    && lines.some((line) => /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/.test(line));
}

export function normalizeAutoPatch(finding) {
  const remediation = finding?.remediation || {};
  const candidate = {
    available: remediation.available ?? finding?.available ?? false,
    patchValidated: remediation.patchValidated ?? finding?.patchValidated ?? false,
    before: remediation.before ?? finding?.before ?? null,
    after: remediation.after ?? finding?.after ?? null,
    unifiedDiff: remediation.unifiedDiff ?? finding?.unifiedDiff ?? null,
    reasonUnavailable: remediation.reasonUnavailable
      || finding?.reasonUnavailable
      || 'Không có bản vá đã được xác thực.',
    lifecycleStatus: remediation.lifecycleStatus
      || finding?.lifecycleStatus
      || 'triaged',
    policyEvidence: remediation.policyEvidence ?? finding?.policyEvidence ?? null
  };

  const safePath = normalizeRepositoryPath(finding?.filePath);
  const valid = candidate.available === true
    && candidate.patchValidated === true
    && typeof candidate.before === 'string'
    && typeof candidate.after === 'string'
    && candidate.after !== candidate.before
    && candidate.lifecycleStatus === 'proposed'
    && safePath
    && isValidUnifiedDiff(candidate.unifiedDiff, safePath);

  if (valid) return candidate;
  return {
    ...unavailableAutoPatch(candidate.reasonUnavailable),
    lifecycleStatus: AUTO_PATCH_STATES.includes(candidate.lifecycleStatus)
      ? candidate.lifecycleStatus
      : 'triaged'
  };
}

export function canAutoPatchInBulk(finding) {
  const patch = normalizeAutoPatch(finding);
  if (!patch.available) return false;
  if (!AUTHORIZATION_CWES.has(finding?.cwe)) return true;
  return typeof patch.policyEvidence === 'string' && patch.policyEvidence.trim().length >= 10;
}

function targetFindingCount(scan, finding) {
  const findings = scan?.vulnerabilities || [];
  if (finding?.ruleId) return findings.filter((item) => item.ruleId === finding.ruleId).length;
  return findings.filter((item) => item.cwe === finding?.cwe && item.title === finding?.title).length;
}

export function applyValidatedPatchToProject(project, finding, scanFile) {
  const patch = normalizeAutoPatch(finding);
  if (!patch.available) {
    return { ok: false, status: 'triaged', reason: patch.reasonUnavailable, project };
  }

  const filePath = normalizeRepositoryPath(finding?.filePath);
  const files = Array.isArray(project?.files) ? project.files : [];
  const matches = files.filter((file) => file.path === filePath);
  if (matches.length !== 1) {
    return { ok: false, status: 'proposed', reason: 'Không xác định duy nhất file đích trong repository.', project };
  }

  const targetFile = matches[0];
  if (targetFile.isSymlink || targetFile.symlinkTarget) {
    return { ok: false, status: 'proposed', reason: 'Từ chối áp dụng patch qua symbolic link.', project };
  }
  if (targetFile.content !== patch.before) {
    return { ok: false, status: 'proposed', reason: 'File đã thay đổi sau khi patch được tạo.', project };
  }
  if (typeof scanFile !== 'function') {
    return { ok: false, status: 'proposed', reason: 'Không có bộ rescan để xác minh patch.', project };
  }

  const backup = { filePath, content: targetFile.content };
  try {
    const beforeScan = scanFile(targetFile.content, filePath, targetFile.language);
    const afterScan = scanFile(patch.after, filePath, targetFile.language);
    if (targetFindingCount(beforeScan, finding) <= targetFindingCount(afterScan, finding)) {
      return {
        ok: false,
        status: 'applied',
        reason: 'Rescan không xác nhận finding mục tiêu đã được loại bỏ; patch đã rollback.',
        project,
        backup
      };
    }

    const updatedProject = {
      ...project,
      files: files.map((file) => (
        file === targetFile
          ? { ...file, content: patch.after, securityFindings: afterScan.vulnerabilities || [] }
          : file
      )),
      autoPatchBackups: [...(project.autoPatchBackups || []), backup]
    };
    return {
      ok: true,
      status: 'verified',
      project: updatedProject,
      backup,
      rescan: afterScan
    };
  } catch {
    return {
      ok: false,
      status: 'applied',
      reason: 'Validation/rescan thất bại; patch đã rollback về bản backup.',
      project,
      backup
    };
  }
}
