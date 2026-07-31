import { normalizeAutoPatch } from './autoPatchPolicy.js';

const MAX_REPORT_FINDINGS = 1000;

const ROOT_CAUSES = {
  'CWE-22': 'Đường dẫn chịu ảnh hưởng của input nhưng chưa được canonicalize và giới hạn trong thư mục cho phép.',
  'CWE-78': 'Dữ liệu không tin cậy có thể đi tới cơ chế thực thi lệnh hoặc shell mà không có allowlist đối số.',
  'CWE-79': 'Dữ liệu chưa encode hoặc sanitize được đưa vào HTML/DOM sink có khả năng thực thi nội dung.',
  'CWE-89': 'Câu lệnh SQL được tạo bằng nối chuỗi hoặc interpolation thay vì bind parameter.',
  'CWE-95': 'Ứng dụng thực thi chuỗi dữ liệu như mã nguồn thay vì dùng parser hoặc dispatcher cố định.',
  'CWE-285': 'Quyết định phân quyền chưa được thực thi nhất quán tại route và tầng nghiệp vụ.',
  'CWE-639': 'Backend sử dụng identifier từ client mà chưa ràng buộc tài nguyên với actor hoặc tenant hiện tại.',
  'CWE-798': 'Credential được nhúng trực tiếp trong source/deployment thay vì secret store và quy trình rotation.',
  'CWE-862': 'Luồng nhạy cảm thiếu middleware hoặc policy authorization trước khi truy cập tài nguyên.'
};

function clip(value, maximum = 4000) {
  return String(value ?? '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, maximum);
}

function evidenceText(evidence) {
  if (typeof evidence === 'string') return clip(evidence);
  if (!evidence || typeof evidence !== 'object') return '';
  return clip(
    evidence.matchedSource
    || evidence.codeSnippet
    || evidence.summary
    || JSON.stringify(evidence)
  );
}

function safeList(values, fallback = []) {
  const normalized = Array.from(values || [])
    .map((value) => clip(value, 1200))
    .filter(Boolean)
    .slice(0, 16);
  return normalized.length ? normalized : fallback;
}

function rootCauseFor(finding) {
  return clip(
    finding.rootCause
    || ROOT_CAUSES[String(finding.cwe || '').toUpperCase()]
    || 'Một security-sensitive sink đang được sử dụng mà chưa có đủ validation, authorization hoặc containment theo trust boundary của luồng dữ liệu.'
  );
}

function validationStepsFor(finding) {
  const cwe = String(finding.cwe || '').toUpperCase();
  const specific = ['CWE-285', 'CWE-639', 'CWE-862'].includes(cwe)
    ? [
        'Viết integration test cho anonymous, user quyền thấp, non-owner và actor hợp lệ.',
        'Xác nhận query luôn bind actor/tenant hoặc kiểm tra capability trước khi đọc và ghi.',
        'Chạy lại test RBAC/IDOR và kiểm tra audit log không rò rỉ dữ liệu cross-account.'
      ]
    : [
        'Tạo regression test tái hiện đúng input và sink đã được ghi trong evidence.',
        'Áp dụng thay đổi trong phạm vi nhỏ nhất rồi chạy unit/integration test liên quan.',
        'Chạy lại SAST và xác nhận finding biến mất mà không tắt rule hoặc xóa assertion.'
      ];
  return safeList(finding.remediation?.validationSteps || finding.validationSteps, specific);
}

export function buildFindingRemediationDetails(finding = {}) {
  const patch = normalizeAutoPatch(finding);
  const evidence = evidenceText(finding.evidence) || clip(finding.originalCode);
  const triageStatus = clip(finding.triageStatus || finding.aiVerdict || 'NEEDS_REVIEW', 40).toUpperCase();
  const whyThisIsValid = clip(
    finding.whyThisIsValid
    || finding.aiReason
    || finding.explanation
    || (evidence
      ? `Rule ${finding.ruleId || finding.cwe || 'security'} khớp trực tiếp với source tại ${finding.filePath || 'file hiện tại'}:${finding.line || 0}. Cần xác minh thêm reachability và middleware trước khi kết luận exploitability.`
      : 'Finding cần được đối chiếu source, sink, middleware và runtime controls trước khi kết luận True Positive.')
  );
  const impact = clip(
    finding.hackerAttackVector?.breachImpact
    || finding.impact
    || finding.description
    || `Nếu exploit path được xác nhận, ${finding.cwe || 'điểm yếu này'} có thể ảnh hưởng tính bí mật, toàn vẹn hoặc sẵn sàng của hệ thống.`
  );
  const remediationStrategy = clip(
    finding.remediation?.defenseStrategy
    || finding.recommendation
    || 'Loại bỏ source-to-sink path không an toàn, áp dụng validation/authorization ở server và giữ thay đổi ở phạm vi tối thiểu.'
  );
  const remediationSteps = safeList(finding.remediation?.stepByStepGuide, [
    'Xác minh source, sink, middleware kế thừa và điều kiện để exploit path có thể chạy.',
    remediationStrategy,
    'Bổ sung regression test trước khi đánh dấu patch là verified.'
  ]);

  return {
    id: clip(finding.id || finding.ruleId || `${finding.filePath || 'finding'}-${finding.line || 0}`, 160),
    ruleId: clip(finding.ruleId || 'LUNAR-AI', 100),
    cwe: clip(finding.cwe || 'CWE-UNKNOWN', 40),
    title: clip(finding.title || 'Security finding', 300),
    severity: clip(finding.severity || 'MEDIUM', 20).toUpperCase(),
    cvss: Number.isFinite(Number(finding.cvss)) ? Number(finding.cvss) : 0,
    filePath: clip(finding.filePath || finding.affectedFiles?.[0] || 'unknown-file', 600),
    line: Number.isFinite(Number(finding.line)) ? Number(finding.line) : 0,
    triageStatus,
    confidence: clip(finding.confidence || finding.aiConfidence || 'UNSPECIFIED', 40).toUpperCase(),
    attackTechnique: clip(finding.attackTechnique || '', 200),
    whyThisIsValid,
    rootCause: rootCauseFor(finding),
    evidence,
    impact,
    attackChain: safeList(finding.hackerAttackVector?.attackChain),
    remediationStrategy,
    remediationSteps,
    validationSteps: validationStepsFor(finding),
    before: clip(patch.before || finding.originalCode || evidence, 12000),
    after: patch.available ? clip(patch.after, 12000) : '',
    unifiedDiff: patch.available ? clip(patch.unifiedDiff, 16000) : '',
    patchAvailable: patch.available,
    patchStatus: clip(patch.lifecycleStatus || 'detected', 40),
    reasonUnavailable: patch.available ? '' : clip(patch.reasonUnavailable, 1000)
  };
}

function mergeSimulationFinding(finding, simulationFindings) {
  const simulation = simulationFindings.find((candidate) => (
    finding.filePath
    && candidate.affectedFiles?.some((path) => path === finding.filePath || path.endsWith(finding.filePath))
    || candidate.relatedCwes?.includes(finding.cwe)
  ));
  if (!simulation) return finding;
  return {
    ...finding,
    rootCause: simulation.rootCause || finding.rootCause,
    whyThisIsValid: simulation.whyThisIsValid || finding.whyThisIsValid,
    attackTechnique: simulation.attackTechnique || finding.attackTechnique,
    hackerAttackVector: simulation.hackerAttackVector || finding.hackerAttackVector,
    remediation: {
      ...(finding.remediation || {}),
      defenseStrategy: simulation.remediation?.defenseStrategy || finding.remediation?.defenseStrategy,
      stepByStepGuide: simulation.remediation?.stepByStepGuide || finding.remediation?.stepByStepGuide,
      validationSteps: simulation.remediation?.validationSteps || finding.remediation?.validationSteps
    }
  };
}

export function buildPortableRemediationReport({ project, scanResult }) {
  const simulationFindings = project?.projectAttackSimulation?.findings || [];
  const findings = Array.from(scanResult?.vulnerabilities || [])
    .slice(0, MAX_REPORT_FINDINGS)
    .map((finding) => buildFindingRemediationDetails(
      mergeSimulationFinding(finding, simulationFindings)
    ));
  return {
    projectTitle: clip(project?.title || 'Lunar Security Audit', 300),
    repositoryUrl: clip(project?.githubUrl || '', 1200),
    metadata: {
      scanId: clip(project?.deepScan?.scanId || project?.scanId || '', 100),
      scannedAt: clip(project?.deepScan?.createdAt || project?.submittedAt || '', 100),
      engine: clip(project?.deepScan ? 'lunar-deep-sast-v1 + AI remediation' : 'lunar-client-sast + AI remediation', 160),
      score: Number(project?.overallScore ?? Math.max(0, 100 - Number(scanResult?.stats?.maxCvss || 0) * 10))
    },
    summary: {
      ...(scanResult?.stats || {}),
      total: findings.length
    },
    findings
  };
}
