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

const REPORT_TEXT_LIMIT = 16000;

function safeReportText(value, maximum = REPORT_TEXT_LIMIT) {
  return String(value ?? '')
    .replace(/\0/g, '')
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maximum);
}

function redactReportText(value) {
  return safeReportText(value)
    .replace(
      /(\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\b\s*[:=]\s*["'])[^"']+(["'])/gi,
      '$1[REDACTED]$2'
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, 'Bearer [REDACTED]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, REPORT_TEXT_LIMIT);
}

function portableFilename(projectTitle, extension) {
  const base = String(projectTitle || 'lunar-security-remediation')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'lunar-security-remediation'}-audit-report.${extension}`;
}

function reportSummary(report) {
  const stats = report?.summary || {};
  const bounded = (value, maximum = 100000) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(maximum, number)) : 0;
  };
  return {
    score: bounded(report?.metadata?.score, 100),
    maxCvss: bounded(stats.maxCvss, 10),
    criticalCount: bounded(stats.criticalCount),
    highCount: bounded(stats.highCount),
    mediumCount: bounded(stats.mediumCount),
    lowCount: bounded(stats.lowCount),
    total: bounded(stats.total || report?.findings?.length)
  };
}

function markdownText(value) {
  return safeReportText(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function markdownCode(value, language = 'text') {
  const content = redactReportText(value).replace(/~~~/g, '~ ~ ~');
  return `~~~${language}\n${content || '[not stored]'}\n~~~`;
}

function findingReference(finding) {
  const cwe = String(finding?.cwe || '').toUpperCase();
  return /^CWE-\d+$/.test(cwe)
    ? `https://cwe.mitre.org/data/definitions/${cwe.slice(4)}.html`
    : 'https://owasp.org/www-project-top-ten/';
}

export function createPortableRemediationMarkdown(report) {
  const findings = Array.from(report?.findings || []).slice(0, MAX_REPORT_FINDINGS);
  const summary = reportSummary(report);
  const metadata = report?.metadata || {};
  const lines = [
    '---',
    'report_type: lunar-security-remediation',
    'report_version: 1',
    `scan_id: ${JSON.stringify(safeReportText(metadata.scanId, 100))}`,
    `generated_at: ${JSON.stringify(new Date().toISOString())}`,
    `finding_count: ${findings.length}`,
    '---',
    '',
    '# Lunar Security Remediation Report',
    '',
    `**Project:** ${markdownText(report?.projectTitle || 'Lunar Security Audit')}`,
    '',
    `**Scan:** ${markdownText(metadata.scanId || 'not available')}  `,
    `**Scanned:** ${markdownText(metadata.scannedAt || 'not available')}  `,
    `**Engine:** ${markdownText(metadata.engine || 'Lunar SAST + AI remediation')}  `,
    `**Security score:** ${summary.score}/100  `,
    `**Maximum CVSS:** ${summary.maxCvss.toFixed(1)}/10.0`,
    '',
    '## Executive Summary',
    '',
    `- Critical: ${summary.criticalCount}`,
    `- High: ${summary.highCount}`,
    `- Medium: ${summary.mediumCount}`,
    `- Low: ${summary.lowCount}`,
    `- Total findings in this file: ${findings.length}`,
    '',
    '## Handoff Instructions For Developers And AI Agents',
    '',
    '1. Work in severity order and keep each finding in a separate change when practical.',
    '2. Do not assume NEEDS_REVIEW is exploitable. Verify source, sink, middleware, ownership and runtime reachability.',
    '3. Do not mark a finding fixed until the patch is applied, tests pass and a rescan no longer reports the verified path.',
    '4. Never paste redacted placeholders back as real credentials. Rotate any secret that may have been exposed.',
    '5. Preserve existing behavior and unrelated user changes.',
    '',
    '## Prioritized Remediation Index',
    '',
    '| # | Severity | CVSS | Finding | Location | Triage | Patch |',
    '|---:|---|---:|---|---|---|---|',
    ...findings.map((finding, index) => (
      `| ${index + 1} | ${markdownText(finding.severity)} | ${Number(finding.cvss || 0).toFixed(1)} | `
      + `${markdownText(finding.title)} | ${markdownText(`${finding.filePath}:${finding.line}`)} | `
      + `${markdownText(finding.triageStatus)} | ${markdownText(finding.patchStatus)} |`
    )),
    '',
    '## Detailed Findings',
    ''
  ];

  if (!findings.length) lines.push('No findings were recorded for this report.', '');

  findings.forEach((finding, index) => {
    lines.push(
      `### F-${String(index + 1).padStart(3, '0')} - ${markdownText(finding.title)}`,
      '',
      `- **Rule / CWE:** ${markdownText(finding.ruleId)} / ${markdownText(finding.cwe)}`,
      `- **Severity / CVSS:** ${markdownText(finding.severity)} / ${Number(finding.cvss || 0).toFixed(1)}`,
      `- **Location:** \`${markdownText(finding.filePath)}:${Number(finding.line || 0)}\``,
      `- **Triage:** ${markdownText(finding.triageStatus)}`,
      `- **Confidence:** ${markdownText(finding.confidence)}`,
      `- **Patch lifecycle:** ${markdownText(finding.patchStatus)}`,
      '',
      '#### Why This Finding Was Raised',
      '',
      safeReportText(finding.whyThisIsValid),
      '',
      '#### Root Cause',
      '',
      safeReportText(finding.rootCause),
      '',
      '#### Evidence',
      '',
      markdownCode(finding.evidence),
      '',
      '#### Security Impact',
      '',
      safeReportText(finding.impact),
      ''
    );
    if (finding.attackChain?.length) {
      lines.push('#### Defensive Attack Path', '');
      finding.attackChain.forEach((step, stepIndex) => lines.push(`${stepIndex + 1}. ${safeReportText(step, 2000)}`));
      lines.push('');
    }
    lines.push('#### Recommended Fix Strategy', '', safeReportText(finding.remediationStrategy), '', '#### Implementation Steps', '');
    finding.remediationSteps?.forEach((step, stepIndex) => lines.push(`${stepIndex + 1}. ${safeReportText(step, 2000)}`));
    lines.push('', '#### Before', '', markdownCode(finding.before), '');
    if (finding.patchAvailable) {
      lines.push(
        `#### ${finding.patchStatus === 'verified' ? 'Verified' : 'Proposed'} After`,
        '',
        markdownCode(finding.after),
        ''
      );
      if (finding.unifiedDiff) lines.push('#### Unified Diff', '', markdownCode(finding.unifiedDiff, 'diff'), '');
    } else {
      lines.push('#### Patch Availability', '', `No validated patch is attached: ${safeReportText(finding.reasonUnavailable)}`, '');
    }
    lines.push('#### Validation Checklist', '');
    finding.validationSteps?.forEach((step) => lines.push(`- [ ] ${safeReportText(step, 2000)}`));
    lines.push('', '#### Reference', '', findingReference(finding), '', '---', '');
  });

  return `${lines.join('\n')}\n`;
}

const PDF_STYLES = {
  title: { font: 'F2', size: 18, leading: 28, width: 62 },
  heading: { font: 'F2', size: 12, leading: 20, width: 84 },
  finding: { font: 'F2', size: 10, leading: 16, width: 88 },
  body: { font: 'F1', size: 9, leading: 14, width: 96 },
  muted: { font: 'F1', size: 8, leading: 12, width: 108 },
  spacer: { font: 'F1', size: 8, leading: 8, width: 108 }
};

function asciiPdfText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/→/g, '->')
    .replace(/[^\x20-\x7E]/g, '?');
}

function wrapPdfText(value, maximumCharacters) {
  const words = asciiPdfText(value).split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = '';
  for (const word of words) {
    if (word.length > maximumCharacters) {
      if (current) lines.push(current);
      for (let index = 0; index < word.length; index += maximumCharacters) {
        lines.push(word.slice(index, index + maximumCharacters));
      }
      current = '';
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maximumCharacters) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function pdfReportLine(value, style = 'body') {
  return wrapPdfText(value, PDF_STYLES[style].width).map((text) => ({ text, style }));
}

function paginatePdfBlocks(blocks) {
  const pages = [];
  let page = [];
  let height = 0;
  for (const block of blocks) {
    for (const line of block) {
      const leading = PDF_STYLES[line.style].leading;
      if (page.length && height + leading > 650) {
        pages.push(page);
        page = [];
        height = 0;
      }
      page.push(line);
      height += leading;
    }
  }
  if (page.length || !pages.length) pages.push(page);
  return pages;
}

function concatBytes(chunks) {
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

function createPdfBytes(pages) {
  const encoder = new TextEncoder();
  const objects = [
    '',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ];
  const pageIds = [];

  pages.forEach((pageLines, pageIndex) => {
    const pageId = objects.length + 1;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    let y = 710;
    const commands = [
      '0.04 0.07 0.14 rg',
      '0 748 612 44 re',
      'f',
      '0.13 0.82 0.86 RG',
      '1.5 w',
      '46 743 m',
      '566 743 l',
      'S',
      'BT',
      '/F2 8 Tf',
      '1 1 1 rg',
      '1 0 0 1 46 765 Tm',
      '(LUNAR.DEV - LOCAL REPORT FALLBACK) Tj',
      'ET'
    ];
    pageLines.forEach((line) => {
      const style = PDF_STYLES[line.style];
      const escaped = asciiPdfText(line.text).replace(/([\\()])/g, '\\$1');
      commands.push(
        'BT',
        `/${style.font} ${style.size} Tf`,
        '0.06 0.08 0.12 rg',
        `1 0 0 1 46 ${y} Tm`,
        `(${escaped}) Tj`,
        'ET'
      );
      y -= style.leading;
    });
    commands.push(
      '0.75 0.78 0.82 RG',
      '0.5 w',
      '46 48 m',
      '566 48 l',
      'S',
      'BT',
      '/F1 8 Tf',
      '0.35 0.39 0.45 rg',
      '1 0 0 1 46 32 Tm',
      `(Page ${pageIndex + 1} of ${pages.length} - Secret-like evidence is redacted) Tj`,
      'ET'
    );
    const stream = commands.join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] `
      + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`
    );
  });

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const chunks = [encoder.encode('%PDF-1.4\n%LUNAR\n')];
  const offsets = [0];
  let byteOffset = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(byteOffset);
    const chunk = encoder.encode(`${index + 1} 0 obj\n${object}\nendobj\n`);
    chunks.push(chunk);
    byteOffset += chunk.length;
  });
  const xrefOffset = byteOffset;
  chunks.push(encoder.encode(`${[
    `xref\n0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    '%%EOF'
  ].join('\n')}\n`));
  return concatBytes(chunks);
}

export function createPortableRemediationPdf(report) {
  const findings = Array.from(report?.findings || []).slice(0, MAX_REPORT_FINDINGS);
  const summary = reportSummary(report);
  const metadata = report?.metadata || {};
  const blocks = [
    [
      ...pdfReportLine('SECURITY REMEDIATION REPORT', 'title'),
      ...pdfReportLine(`Project: ${report?.projectTitle || 'Lunar Security Audit'}`, 'heading'),
      ...pdfReportLine(`Scan ID: ${metadata.scanId || 'not available'}`, 'muted'),
      ...pdfReportLine(`Generated: ${new Date().toISOString()}`, 'muted'),
      ...pdfReportLine('', 'spacer')
    ],
    [
      ...pdfReportLine('Executive summary', 'heading'),
      ...pdfReportLine(`Security score: ${summary.score} / 100 | Maximum CVSS: ${summary.maxCvss.toFixed(1)} / 10.0`, 'body'),
      ...pdfReportLine(`Critical: ${summary.criticalCount} | High: ${summary.highCount} | Medium: ${summary.mediumCount} | Low: ${summary.lowCount} | Total: ${findings.length}`, 'body'),
      ...pdfReportLine('NEEDS_REVIEW is not proof of exploitability. Apply, test and rescan before marking any finding verified.', 'muted'),
      ...pdfReportLine('', 'spacer'),
      ...pdfReportLine('Detailed findings and fix playbooks', 'heading')
    ]
  ];

  if (!findings.length) blocks.push(pdfReportLine('No findings were recorded for this report.', 'body'));
  findings.forEach((finding, index) => {
    blocks.push([
      ...pdfReportLine(`${String(index + 1).padStart(3, '0')}. [${finding.severity}] ${finding.ruleId} / ${finding.cwe} - ${finding.title}`, 'finding'),
      ...pdfReportLine(`Location: ${finding.filePath}:${finding.line} | CVSS: ${Number(finding.cvss || 0).toFixed(1)} | Triage: ${finding.triageStatus} | Confidence: ${finding.confidence} | Patch: ${finding.patchStatus}`, 'muted'),
      ...pdfReportLine(`Why this finding exists: ${safeReportText(finding.whyThisIsValid)}`, 'body'),
      ...pdfReportLine(`Root cause: ${safeReportText(finding.rootCause)}`, 'body'),
      ...pdfReportLine(`Evidence: ${redactReportText(finding.evidence) || '[not stored]'}`, 'body'),
      ...pdfReportLine(`Impact: ${safeReportText(finding.impact)}`, 'body'),
      ...(finding.attackChain?.length ? [
        ...pdfReportLine('Defensive attack path:', 'body'),
        ...finding.attackChain.flatMap((step, stepIndex) => pdfReportLine(`${stepIndex + 1}. ${safeReportText(step, 2000)}`, 'muted'))
      ] : []),
      ...pdfReportLine(`Fix strategy: ${safeReportText(finding.remediationStrategy)}`, 'body'),
      ...pdfReportLine('Implementation steps:', 'body'),
      ...(finding.remediationSteps || []).flatMap((step, stepIndex) => pdfReportLine(`${stepIndex + 1}. ${safeReportText(step, 2000)}`, 'muted')),
      ...pdfReportLine(`Before: ${redactReportText(finding.before) || '[not stored]'}`, 'body'),
      ...(finding.patchAvailable
        ? pdfReportLine(`${finding.patchStatus === 'verified' ? 'Verified' : 'Proposed'} after: ${redactReportText(finding.after) || '[see unified diff]'}`, 'body')
        : pdfReportLine(`Patch unavailable: ${safeReportText(finding.reasonUnavailable)}`, 'muted')),
      ...(finding.unifiedDiff ? pdfReportLine(`Unified diff: ${redactReportText(finding.unifiedDiff)}`, 'muted') : []),
      ...pdfReportLine('Validation checklist:', 'body'),
      ...(finding.validationSteps || []).flatMap((step, stepIndex) => pdfReportLine(`${stepIndex + 1}. ${safeReportText(step, 2000)}`, 'muted')),
      ...pdfReportLine(`Reference: ${findingReference(finding)}`, 'muted'),
      ...pdfReportLine('', 'spacer')
    ]);
  });

  return new Blob([createPdfBytes(paginatePdfBlocks(blocks))], { type: 'application/pdf' });
}

export function createLocalPortableRemediationDownload(format, report) {
  const isMarkdown = format === 'markdown';
  const extension = isMarkdown ? 'md' : 'pdf';
  const blob = isMarkdown
    ? new Blob([createPortableRemediationMarkdown(report)], { type: 'text/markdown;charset=utf-8' })
    : createPortableRemediationPdf(report);
  return {
    blob,
    contentDisposition: `attachment; filename="${portableFilename(report?.projectTitle, extension)}"`,
    localFallback: true
  };
}
