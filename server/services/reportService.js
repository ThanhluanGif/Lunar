const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REPORT_FINDINGS = 1000;
const REPORT_TEXT_LIMIT = 16000;

const LEGACY_RULE_CWES = {
  'LUNAR-JS-EVAL': 'CWE-95',
  'LUNAR-DOM-XSS': 'CWE-79',
  'LUNAR-SQL-TEMPLATE': 'CWE-89',
  'LUNAR-HARDCODED-SECRET': 'CWE-798',
  'LUNAR-INSECURE-RANDOM': 'CWE-330'
};

const CWE_GUIDANCE = {
  'CWE-22': {
    rootCause: 'An untrusted path reaches filesystem resolution without canonical containment in an allowlisted root.',
    impact: 'An attacker may read, overwrite or disclose files outside the intended repository boundary.',
    strategy: 'Resolve the candidate path against a fixed root, reject traversal and symlink escape, and use the canonical path only.',
    steps: ['Define the only allowed repository root.', 'Resolve and canonicalize the requested path.', 'Reject paths outside the root and deny symlink escape.', 'Add traversal and option-injection regression cases.'],
    validation: ['Test ../, encoded traversal and symlink escape.', 'Confirm valid in-root files still work.', 'Rescan without suppressing the path-traversal rule.']
  },
  'CWE-78': {
    rootCause: 'Untrusted data can influence command execution or shell parsing.',
    impact: 'Successful exploitation may execute arbitrary operating-system commands with application privileges.',
    strategy: 'Remove the shell boundary; use a fixed executable and an allowlisted argument array with shell disabled.',
    steps: ['Replace command-string construction with a library or execFile/spawn.', 'Fix the executable server-side.', 'Validate each argument against an allowlist.', 'Apply timeout, output and working-directory limits.'],
    validation: ['Test semicolon, command substitution, backticks, newline and option injection.', 'Verify no filesystem/process side effect occurs.', 'Rescan and retain the negative tests.']
  },
  'CWE-79': {
    rootCause: 'Untrusted content reaches an HTML or DOM execution sink without context-appropriate encoding.',
    impact: 'An attacker may execute script in another user session and steal data or perform actions as that user.',
    strategy: 'Render untrusted values as text and sanitize only explicitly trusted HTML with a maintained policy.',
    steps: ['Replace innerHTML-like sinks with text rendering.', 'If HTML is required, define an explicit sanitizer policy.', 'Keep URLs and attributes under separate allowlists.', 'Add browser regression tests with inert XSS payloads.'],
    validation: ['Test element, attribute and URL contexts.', 'Confirm payloads render as text.', 'Run CSP and browser security tests.']
  },
  'CWE-89': {
    rootCause: 'SQL text is assembled with untrusted values instead of binding parameters.',
    impact: 'An attacker may read or modify data outside their authorization scope.',
    strategy: 'Use parameterized queries and enforce ownership or tenant constraints in the same query.',
    steps: ['Replace interpolation with placeholders.', 'Bind values through the database driver.', 'Add actor/tenant predicates where the resource is scoped.', 'Review dynamic identifiers through a strict allowlist.'],
    validation: ['Test quotes, comments and boolean SQL payloads.', 'Test owner and non-owner access.', 'Verify query plans still use expected indexes.']
  },
  'CWE-95': {
    rootCause: 'A string value is interpreted as executable code.',
    impact: 'A malicious input may execute arbitrary application code and compromise the process.',
    strategy: 'Replace dynamic execution with a strict parser or a fixed operation dispatcher.',
    steps: ['Enumerate supported operations.', 'Map operation names to fixed functions.', 'Reject unknown operations and data shapes.', 'Add regression tests proving input remains data.'],
    validation: ['Test code-like strings and nested payloads.', 'Confirm no dynamic execution API remains reachable.', 'Rescan the changed file.']
  },
  'CWE-285': {
    rootCause: 'Authorization policy is missing, incomplete or enforced only in the client.',
    impact: 'A lower-privilege actor may perform actions reserved for another role or owner.',
    strategy: 'Enforce authentication, capability and resource ownership on the server before the operation.',
    steps: ['Document the actor and required capability.', 'Place authentication and role policy before the controller.', 'Bind resource lookup to actor or tenant.', 'Return a non-enumerating error for unauthorized resources.'],
    validation: ['Test anonymous, low-privilege, non-owner and valid actors.', 'Test cross-tenant identifiers.', 'Confirm audit logs record the authorized actor.']
  },
  'CWE-639': {
    rootCause: 'A client-controlled resource identifier is used without binding it to the authenticated actor or tenant.',
    impact: 'Changing an identifier may expose or modify another account resource.',
    strategy: 'Bind every resource query to the actor/tenant or verify an explicit administrative capability.',
    steps: ['Identify the resource owner column.', 'Add actor/tenant predicates to reads and writes.', 'Allowlist mutable fields.', 'Use 404 where needed to avoid resource enumeration.'],
    validation: ['Repeat the request with another user resource ID.', 'Test cross-tenant access and a valid administrator.', 'Confirm no response metadata leaks resource existence.']
  },
  'CWE-798': {
    rootCause: 'A credential is embedded in source or deployment configuration instead of a managed secret channel.',
    impact: 'Anyone with artifact or repository access may reuse the credential until it is rotated.',
    strategy: 'Remove the value, load it from a secret manager or required runtime variable, and rotate the exposed credential.',
    steps: ['Remove the committed/default value.', 'Add required runtime secret configuration or *_FILE support.', 'Fail closed when the secret is absent.', 'Rotate the credential and review history/CI artifacts.'],
    validation: ['Scan source, history and build output for the old value.', 'Start the service with and without the required secret.', 'Confirm logs and reports redact secret-like evidence.']
  },
  'CWE-862': {
    rootCause: 'A sensitive endpoint or operation lacks a server-side authorization check.',
    impact: 'An authenticated or anonymous actor may access protected functionality.',
    strategy: 'Apply the narrow authorization middleware and verify resource ownership in the business query.',
    steps: ['Trace inherited router middleware before adding new guards.', 'Require the minimum role or capability.', 'Bind the resource to actor/tenant.', 'Add negative integration tests.'],
    validation: ['Test anonymous, authenticated non-owner and valid owner/admin.', 'Confirm middleware order before the controller.', 'Rescan route and controller together.']
  }
};

function safeNumber(value, maximum = 100000) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(maximum, number));
}

function safeText(value, maximum = REPORT_TEXT_LIMIT) {
  return String(value ?? '')
    .replace(/\0/g, '')
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maximum);
}

function csvSourceText(value, maximum = REPORT_TEXT_LIMIT) {
  return String(value ?? '').replace(/\0/g, '').slice(0, maximum);
}

function normalizeSummary(scanSummary) {
  const stats = scanSummary?.stats || scanSummary || {};
  return {
    maxCvss: Math.min(10, safeNumber(stats.maxCvss, 10)),
    criticalCount: safeNumber(stats.criticalCount),
    highCount: safeNumber(stats.highCount),
    mediumCount: safeNumber(stats.mediumCount),
    lowCount: safeNumber(stats.lowCount),
    total: safeNumber(stats.total)
  };
}

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
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/([\\()])/g, '\\$1');
}

function safeFilename(value, extension = 'pdf') {
  const base = String(value || 'lunar-security-audit')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const safeExtension = ['csv', 'md', 'pdf'].includes(extension) ? extension : 'pdf';
  return `${base || 'lunar-security-audit'}-audit-report.${safeExtension}`;
}

function sanitizeCsvField(value) {
  if (typeof value !== 'string') return value;
  const cleaned = value.replace(/\0/g, '');
  const formulaLike = /^(?:[=+\-@\t\r\n]|[\u0001-\u0020\u00a0\ufeff]+[=+\-@])/u.test(cleaned);
  return formulaLike ? `'${cleaned}` : cleaned;
}

function quoteCsvField(value) {
  const sanitized = sanitizeCsvField(value ?? '');
  const text = typeof sanitized === 'string'
    ? sanitized
    : typeof sanitized === 'number' || typeof sanitized === 'boolean'
      ? String(sanitized)
      : JSON.stringify(sanitized);
  return `"${String(text || '').replace(/\0/g, '').replace(/"/g, '""')}"`;
}

function redactEvidence(value) {
  const source = typeof value === 'object' && value !== null
    ? value.matchedSource || value.codeSnippet || value.summary || JSON.stringify(value)
    : value;
  return safeText(source, REPORT_TEXT_LIMIT)
    .replace(
      /(\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\b\s*[:=]\s*["'])[^"']+(["'])/gi,
      '$1[REDACTED]$2'
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, 'Bearer [REDACTED]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, REPORT_TEXT_LIMIT);
}

function safeList(values, fallback = []) {
  const normalized = Array.from(values || [])
    .map((value) => safeText(value, 2000))
    .filter(Boolean)
    .slice(0, 20);
  return normalized.length ? normalized : fallback;
}

function normalizedCwe(finding) {
  const direct = safeText(finding?.cwe, 40).toUpperCase();
  if (/^CWE-\d+$/.test(direct)) return direct;
  const ruleId = safeText(finding?.ruleId || finding?.cwe, 100).toUpperCase();
  return LEGACY_RULE_CWES[ruleId] || direct || 'CWE-UNKNOWN';
}

function genericGuidance(cwe) {
  return CWE_GUIDANCE[cwe] || {
    rootCause: 'A security-sensitive sink is reachable without sufficient validation, authorization or containment for its trust boundary.',
    impact: `If reachability is confirmed, ${cwe} may affect confidentiality, integrity or availability.`,
    strategy: 'Trace source to sink, preserve the intended behavior, and add the narrowest server-side control that closes the verified path.',
    steps: ['Confirm source, sink, inherited middleware and runtime controls.', 'Create a regression test that reproduces the path.', 'Apply the smallest safe change.', 'Run tests, build and security rescan before marking verified.'],
    validation: ['Run the exploit-path regression test.', 'Run relevant authorization and negative cases.', 'Rescan without disabling the detecting rule.']
  };
}

function normalizeReportFinding(finding = {}, index = 0) {
  const cwe = normalizedCwe(finding);
  const guidance = genericGuidance(cwe);
  const remediation = finding.remediation || {};
  const hackerAttackVector = finding.hackerAttackVector || {};
  const evidence = redactEvidence(finding.evidence || finding.codeSnippet || finding.originalCode);
  const patchAvailable = finding.patchAvailable === true || finding.available === true;
  return {
    id: safeText(finding.id || `F-${index + 1}`, 160),
    ruleId: safeText(finding.ruleId || finding.cveId || 'LEGACY-RULE', 100),
    cwe,
    title: safeText(finding.title || 'Security finding', 300),
    severity: safeText(finding.severity || 'medium', 20).toUpperCase(),
    cvss: Math.min(10, safeNumber(finding.cvss, 10)),
    filePath: safeText(finding.filePath || finding.affectedFiles?.[0] || 'unknown-file', 700),
    line: safeNumber(finding.line, 10000000),
    status: safeText(finding.status || finding.patchStatus || 'open', 40),
    triageStatus: safeText(finding.triageStatus || finding.aiVerdict || 'NEEDS_REVIEW', 60).toUpperCase(),
    confidence: safeText(finding.confidence || finding.aiConfidence || 'UNSPECIFIED', 40).toUpperCase(),
    attackTechnique: safeText(finding.attackTechnique, 200),
    whyThisIsValid: safeText(
      finding.whyThisIsValid
      || finding.aiReason
      || finding.explanation
      || (evidence
        ? `The scanner matched ${finding.ruleId || cwe} at the recorded source location. Confirm source-to-sink reachability and inherited controls before declaring exploitability.`
        : 'The finding requires source, sink, middleware and runtime-control verification before final triage.'),
      5000
    ),
    rootCause: safeText(finding.rootCause || guidance.rootCause, 5000),
    evidence: evidence || '[not stored]',
    impact: safeText(hackerAttackVector.breachImpact || finding.impact || guidance.impact, 5000),
    attackChain: safeList(hackerAttackVector.attackChain || finding.attackChain),
    remediationStrategy: safeText(remediation.defenseStrategy || finding.remediationStrategy || finding.recommendation || guidance.strategy, 5000),
    remediationSteps: safeList(remediation.stepByStepGuide || finding.remediationSteps, guidance.steps),
    validationSteps: safeList(remediation.validationSteps || finding.validationSteps, guidance.validation),
    before: redactEvidence(finding.before || finding.originalCode || evidence),
    after: patchAvailable ? redactEvidence(finding.after || remediation.after) : '',
    unifiedDiff: patchAvailable ? redactEvidence(finding.unifiedDiff || remediation.unifiedDiff) : '',
    patchAvailable,
    patchStatus: safeText(finding.patchStatus || finding.lifecycleStatus || remediation.lifecycleStatus || 'detected', 40),
    reasonUnavailable: patchAvailable ? '' : safeText(finding.reasonUnavailable || remediation.reasonUnavailable || 'No validated patch is attached; follow the remediation and validation steps.', 2000),
    reference: /^CWE-\d+$/.test(cwe)
      ? `https://cwe.mitre.org/data/definitions/${cwe.slice(4)}.html`
      : 'https://owasp.org/www-project-top-ten/',
    csv: {
      ruleId: csvSourceText(finding.ruleId || finding.cveId || 'LEGACY-RULE', 100),
      cwe: csvSourceText(finding.cwe || cwe, 40),
      title: csvSourceText(finding.title || 'Security finding', 300),
      severity: csvSourceText(finding.severity || 'medium', 20),
      filePath: csvSourceText(finding.filePath || finding.affectedFiles?.[0] || '', 700),
      evidence: redactEvidence(finding.evidence || finding.codeSnippet || finding.originalCode),
      recommendation: csvSourceText(remediation.defenseStrategy || finding.remediationStrategy || finding.recommendation || guidance.strategy, 5000),
      status: csvSourceText(finding.status || finding.patchStatus || 'open', 40)
    }
  };
}

function normalizeReportFindings(findings) {
  const normalized = Array.from(findings || [])
    .slice(0, MAX_REPORT_FINDINGS)
    .map(normalizeReportFinding);
  return Array.from(new Map(normalized.map((finding) => [
    `${finding.ruleId}:${finding.cwe}:${finding.filePath}:${finding.line}`,
    finding
  ])).values());
}

function normalizePortableReport(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const error = new Error('A report payload object is required.');
    error.status = 400;
    throw error;
  }
  if (!Array.isArray(payload.findings)) {
    const error = new Error('Report findings must be an array.');
    error.status = 400;
    throw error;
  }
  if (payload.findings.length > MAX_REPORT_FINDINGS) {
    const error = new Error(`Report exceeds ${MAX_REPORT_FINDINGS} findings.`);
    error.status = 413;
    throw error;
  }
  return {
    projectTitle: safeText(payload.projectTitle || 'Lunar Security Audit', 300),
    repositoryUrl: safeText(payload.repositoryUrl, 1200),
    summary: normalizeSummary(payload.summary),
    metadata: {
      scanId: safeText(payload.metadata?.scanId, 100),
      score: safeNumber(payload.metadata?.score, 100),
      engine: safeText(payload.metadata?.engine || 'Lunar SAST + AI remediation', 200),
      scannedAt: safeText(payload.metadata?.scannedAt, 100)
    },
    findings: normalizeReportFindings(payload.findings)
  };
}

function wrapText(value, maximumCharacters = 92) {
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

const PDF_LINE_STYLES = {
  title: { font: 'F2', size: 18, leading: 28, width: 62 },
  heading: { font: 'F2', size: 12, leading: 20, width: 84 },
  finding: { font: 'F2', size: 10, leading: 16, width: 88 },
  body: { font: 'F1', size: 9, leading: 14, width: 96 },
  muted: { font: 'F1', size: 8, leading: 12, width: 108 },
  spacer: { font: 'F1', size: 8, leading: 8, width: 108 }
};

function reportLine(text, style = 'body') {
  return wrapText(text, PDF_LINE_STYLES[style].width).map((wrapped) => ({
    text: wrapped,
    style
  }));
}

function blockHeight(block) {
  return block.reduce(
    (height, line) => height + PDF_LINE_STYLES[line.style].leading,
    0
  );
}

function paginateBlocks(blocks) {
  const maximumHeight = 650;
  const pages = [];
  let currentPage = [];
  let currentHeight = 0;

  for (const block of blocks) {
    const height = blockHeight(block);
    if (currentPage.length && currentHeight + height > maximumHeight) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
    for (const line of block) {
      const leading = PDF_LINE_STYLES[line.style].leading;
      if (currentPage.length && currentHeight + leading > maximumHeight) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
      currentPage.push(line);
      currentHeight += leading;
    }
  }
  if (currentPage.length || !pages.length) pages.push(currentPage);
  return pages;
}

function createPdfFromPages(pages) {
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
      '(LUNAR.DEV - VERIFIED SECURITY AUDIT) Tj',
      'ET'
    ];
    pageLines.forEach((line) => {
      const style = PDF_LINE_STYLES[line.style];
      commands.push(
        'BT',
        `/${style.font} ${style.size} Tf`,
        '0.06 0.08 0.12 rg',
        `1 0 0 1 46 ${y} Tm`,
        `(${asciiPdfText(line.text)}) Tj`,
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
      `(Page ${pageIndex + 1} of ${pages.length} - Evidence may contain redacted values) Tj`,
      'ET'
    );
    const stream = commands.join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] `
      + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`
    );
  });

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary')];
  const offsets = [0];
  let byteOffset = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(byteOffset);
    const chunk = Buffer.from(`${index + 1} 0 obj\n${object}\nendobj\n`, 'ascii');
    chunks.push(chunk);
    byteOffset += chunk.length;
  });

  const xrefOffset = byteOffset;
  const xref = [
    `xref\n0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    '%%EOF'
  ].join('\n');
  chunks.push(Buffer.from(`${xref}\n`, 'ascii'));
  return Buffer.concat(chunks);
}

function createAuditReportPdf(projectTitle, scanSummary) {
  const summary = normalizeSummary(scanSummary);
  const findings = normalizeReportFindings(scanSummary?.findings);
  const metadata = scanSummary?.metadata || {};
  const risk = summary.criticalCount > 0
    ? 'CRITICAL'
    : summary.highCount > 0
      ? 'HIGH'
      : summary.mediumCount > 0
        ? 'MEDIUM'
        : 'LOW';
  const blocks = [
    [
      ...reportLine('SECURITY AUDIT REPORT', 'title'),
      ...reportLine(`Project: ${projectTitle}`, 'heading'),
      ...reportLine(`Scan ID: ${metadata.scanId || 'not available'}`, 'muted'),
      ...reportLine(`Scanned: ${metadata.scannedAt || 'not available'}`, 'muted'),
      ...reportLine(`Generated: ${new Date().toISOString()}`, 'muted'),
      ...reportLine('', 'spacer')
    ],
    [
      ...reportLine('Executive summary', 'heading'),
      ...reportLine(`Risk: ${risk} | Security score: ${safeNumber(metadata.score, 100)} / 100`, 'body'),
      ...reportLine(`Maximum CVSS: ${summary.maxCvss.toFixed(1)} / 10.0`, 'body'),
      ...reportLine(
        `Critical: ${summary.criticalCount} | High: ${summary.highCount} | `
        + `Medium: ${summary.mediumCount} | Low: ${summary.lowCount} | Total: ${summary.total}`,
        'body'
      ),
      ...reportLine(`Engine: ${metadata.engine || 'Lunar deterministic SAST'}`, 'muted'),
      ...reportLine('', 'spacer')
    ],
    [
      ...reportLine('How to use this remediation report', 'heading'),
      ...reportLine(
        'Process findings in severity order. For every item, confirm source, sink, inherited middleware '
        + 'and runtime reachability before changing code. Apply the smallest safe fix, run the listed '
        + 'validation steps, then rescan before marking the item verified.',
        'body'
      ),
      ...reportLine(
        'Triage status is preserved. NEEDS_REVIEW is not proof of exploitability. Secret-like values are redacted in this portable file.',
        'muted'
      ),
      ...reportLine('', 'spacer'),
      ...reportLine('Prioritized remediation index', 'heading'),
      ...findings.slice(0, 40).flatMap((finding, index) => reportLine(
        `${index + 1}. [${finding.severity}] ${finding.filePath}:${finding.line} - ${finding.title}`,
        'muted'
      )),
      ...(findings.length > 40 ? reportLine(`${findings.length - 40} more findings continue in the detailed section.`, 'muted') : []),
      ...reportLine('', 'spacer'),
      ...reportLine('Detailed findings and fix playbooks', 'heading')
    ]
  ];

  if (!findings.length) {
    blocks.push(reportLine('No persisted findings were recorded for this scan.', 'body'));
  } else {
    findings.forEach((finding, index) => {
      const location = `${finding.filePath}:${finding.line}`;
      blocks.push([
        ...reportLine(
          `${String(index + 1).padStart(3, '0')}. [${finding.severity}] ${finding.ruleId} / ${finding.cwe} - ${finding.title}`,
          'finding'
        ),
        ...reportLine(
          `Location: ${location} | CVSS: ${finding.cvss.toFixed(1)} | Triage: ${finding.triageStatus} | Confidence: ${finding.confidence}`,
          'muted'
        ),
        ...reportLine(`Why this finding exists: ${finding.whyThisIsValid}`, 'body'),
        ...reportLine(`Root cause: ${finding.rootCause}`, 'body'),
        ...reportLine(`Evidence: ${finding.evidence}`, 'body'),
        ...reportLine(`Impact: ${finding.impact}`, 'body'),
        ...(finding.attackChain.length ? [
          ...reportLine('Defensive attack path:', 'body'),
          ...finding.attackChain.flatMap((step, stepIndex) => reportLine(`${stepIndex + 1}. ${step}`, 'muted'))
        ] : []),
        ...reportLine(`Fix strategy: ${finding.remediationStrategy}`, 'body'),
        ...reportLine('Implementation steps:', 'body'),
        ...finding.remediationSteps.flatMap((step, stepIndex) => reportLine(`${stepIndex + 1}. ${step}`, 'muted')),
        ...reportLine(`Before: ${finding.before || '[not stored]'}`, 'body'),
        ...(finding.patchAvailable
          ? reportLine(
              `${finding.patchStatus === 'verified' ? 'Verified' : 'Proposed'} after: ${finding.after || '[see unified diff]'}`,
              'body'
            )
          : reportLine(`Patch status: unavailable - ${finding.reasonUnavailable}`, 'muted')),
        ...(finding.unifiedDiff ? reportLine(`Unified diff: ${finding.unifiedDiff}`, 'muted') : []),
        ...reportLine('Validation checklist:', 'body'),
        ...finding.validationSteps.flatMap((step, stepIndex) => reportLine(`${stepIndex + 1}. ${step}`, 'muted')),
        ...reportLine(`Reference: ${finding.reference}`, 'muted'),
        ...reportLine('', 'spacer')
      ]);
    });
    if (summary.total > findings.length && findings.length >= MAX_REPORT_FINDINGS) {
      blocks.push(reportLine(
        `${summary.total - findings.length} additional findings were omitted from this portable report limit.`,
        'muted'
      ));
    }
  }

  return createPdfFromPages(paginateBlocks(blocks));
}

function markdownText(value) {
  return safeText(value).replace(/\|/g, '\\|');
}

function markdownCode(value, language = 'text') {
  const content = redactEvidence(value).replace(/~~~/g, '~ ~ ~');
  return `~~~${language}\n${content || '[not stored]'}\n~~~`;
}

function createAuditReportMarkdown(projectTitle, scanSummary) {
  const summary = normalizeSummary(scanSummary);
  const findings = normalizeReportFindings(scanSummary?.findings);
  const metadata = scanSummary?.metadata || {};
  const generatedAt = new Date().toISOString();
  const lines = [
    '---',
    'report_type: lunar-security-remediation',
    'report_version: 1',
    `scan_id: "${markdownText(metadata.scanId || '')}"`,
    `generated_at: "${generatedAt}"`,
    `finding_count: ${findings.length}`,
    '---',
    '',
    '# Lunar Security Remediation Report',
    '',
    `**Project:** ${markdownText(projectTitle || 'Lunar Security Audit')}`,
    '',
    `**Scan:** ${markdownText(metadata.scanId || 'not available')}  `,
    `**Scanned:** ${markdownText(metadata.scannedAt || 'not available')}  `,
    `**Engine:** ${markdownText(metadata.engine || 'Lunar SAST + AI remediation')}  `,
    `**Security score:** ${safeNumber(metadata.score, 100)}/100  `,
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
      `| ${index + 1} | ${finding.severity} | ${finding.cvss.toFixed(1)} | ${markdownText(finding.title)} | `
      + `${markdownText(`${finding.filePath}:${finding.line}`)} | ${markdownText(finding.triageStatus)} | ${markdownText(finding.patchStatus)} |`
    )),
    '',
    '## Detailed Findings',
    ''
  ];

  if (!findings.length) lines.push('No persisted findings were recorded for this scan.', '');

  findings.forEach((finding, index) => {
    lines.push(
      `### F-${String(index + 1).padStart(3, '0')} - ${markdownText(finding.title)}`,
      '',
      `- **Rule / CWE:** ${markdownText(finding.ruleId)} / ${markdownText(finding.cwe)}`,
      `- **Severity / CVSS:** ${finding.severity} / ${finding.cvss.toFixed(1)}`,
      `- **Location:** \`${markdownText(finding.filePath)}:${finding.line}\``,
      `- **Triage:** ${markdownText(finding.triageStatus)}`,
      `- **Confidence:** ${markdownText(finding.confidence)}`,
      `- **Patch lifecycle:** ${markdownText(finding.patchStatus)}`,
      '',
      '#### Why This Finding Was Raised',
      '',
      finding.whyThisIsValid,
      '',
      '#### Root Cause',
      '',
      finding.rootCause,
      '',
      '#### Evidence',
      '',
      markdownCode(finding.evidence),
      '',
      '#### Security Impact',
      '',
      finding.impact,
      ''
    );
    if (finding.attackChain.length) {
      lines.push('#### Defensive Attack Path', '');
      finding.attackChain.forEach((step, stepIndex) => lines.push(`${stepIndex + 1}. ${step}`));
      lines.push('');
    }
    lines.push('#### Recommended Fix Strategy', '', finding.remediationStrategy, '', '#### Implementation Steps', '');
    finding.remediationSteps.forEach((step, stepIndex) => lines.push(`${stepIndex + 1}. ${step}`));
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
      lines.push('#### Patch Availability', '', `No validated patch is attached: ${finding.reasonUnavailable}`, '');
    }
    lines.push('#### Validation Checklist', '');
    finding.validationSteps.forEach((step) => lines.push(`- [ ] ${step}`));
    lines.push('', '#### Reference', '', finding.reference, '', '---', '');
  });

  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}

function createAuditReportCsv(projectTitle, scanSummary) {
  const summary = normalizeSummary(scanSummary);
  const metadata = scanSummary?.metadata || {};
  const findings = normalizeReportFindings(scanSummary?.findings);
  const generatedAt = new Date().toISOString();
  const headers = [
    'scan_id',
    'project_name',
    'scanned_at',
    'generated_at',
    'security_score',
    'engine',
    'critical_count',
    'high_count',
    'medium_count',
    'low_count',
    'total_findings',
    'maximum_cvss',
    'rule_id',
    'cwe',
    'title',
    'severity',
    'cvss',
    'file_path',
    'line',
    'evidence',
    'recommendation',
    'status',
    'triage_status',
    'confidence',
    'root_cause',
    'why_this_is_valid',
    'impact',
    'implementation_steps',
    'validation_steps',
    'patch_status'
  ];
  const reportFields = [
    metadata.scanId || '',
    projectTitle || 'Lunar Security Audit',
    metadata.scannedAt || '',
    generatedAt,
    safeNumber(metadata.score, 100),
    metadata.engine || 'Lunar deterministic SAST',
    summary.criticalCount,
    summary.highCount,
    summary.mediumCount,
    summary.lowCount,
    summary.total,
    summary.maxCvss
  ];
  const rows = findings.length
    ? findings.map((finding) => [
        ...reportFields,
        finding.csv.ruleId,
        finding.csv.cwe,
        finding.csv.title,
        finding.csv.severity,
        finding.cvss,
        finding.csv.filePath,
        finding.line,
        finding.csv.evidence,
        finding.csv.recommendation,
        finding.csv.status,
        finding.triageStatus,
        finding.confidence,
        finding.rootCause,
        finding.whyThisIsValid,
        finding.impact,
        finding.remediationSteps.join('\n'),
        finding.validationSteps.join('\n'),
        finding.patchStatus
      ])
    : [[...reportFields, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']];
  const csv = [headers, ...rows]
    .map((row) => row.map(quoteCsvField).join(','))
    .join('\r\n');
  return Buffer.from(`\ufeff${csv}\r\n`, 'utf8');
}

async function loadOwnedScanSummary(pool, scanId, userId) {
  const result = await pool.query(
    `SELECT
       s.id,
       COALESCE(p.name, 'Lunar Security Audit') AS project_name,
       s.score,
       s.ai_model_used,
       s.created_at,
       COUNT(v.id)::int AS total,
       COUNT(v.id) FILTER (
         WHERE COALESCE(v.source_severity, CASE v.severity
           WHEN 'critical' THEN 'critical' WHEN 'warning' THEN 'high' ELSE 'medium' END) = 'critical'
       )::int AS critical_count,
       COUNT(v.id) FILTER (
         WHERE COALESCE(v.source_severity, CASE v.severity
           WHEN 'critical' THEN 'critical' WHEN 'warning' THEN 'high' ELSE 'medium' END) = 'high'
       )::int AS high_count,
       COUNT(v.id) FILTER (
         WHERE COALESCE(v.source_severity, CASE v.severity
           WHEN 'critical' THEN 'critical' WHEN 'warning' THEN 'high' ELSE 'medium' END) = 'medium'
       )::int AS medium_count,
       COUNT(v.id) FILTER (WHERE v.source_severity = 'low')::int AS low_count,
       MAX(v.cvss)::float AS maximum_cvss
     FROM scans s
     LEFT JOIN projects p ON p.id = s.project_id
     LEFT JOIN vulnerabilities v ON v.scan_id = s.id
     WHERE s.id = $1 AND s.user_id = $2
     GROUP BY s.id, p.name`,
    [scanId, userId]
  );
  const scan = result.rows[0];
  if (!scan) return null;
  const findingsResult = await pool.query(
    `SELECT
       COALESCE(rule_id, 'LEGACY-RULE') AS "ruleId",
       COALESCE(cve_id, 'CWE-UNKNOWN') AS cwe,
       title,
       COALESCE(source_severity, CASE severity
         WHEN 'critical' THEN 'critical' WHEN 'warning' THEN 'high' ELSE 'medium' END) AS severity,
       COALESCE(cvss, CASE severity
         WHEN 'critical' THEN 9.1 WHEN 'warning' THEN 7.5 ELSE 5.3 END)::float AS cvss,
       line_number AS line,
       file_path AS "filePath",
       code_snippet AS evidence,
       suggested_patch AS recommendation,
       status
     FROM vulnerabilities
     WHERE scan_id = $1
     ORDER BY
       CASE COALESCE(source_severity, CASE severity
         WHEN 'critical' THEN 'critical' WHEN 'warning' THEN 'high' ELSE 'medium' END)
         WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       file_path NULLS LAST,
       line_number NULLS LAST
     LIMIT 1000`,
    [scanId]
  );
  const heuristicMaxCvss = scan.critical_count > 0
    ? 9.2
    : scan.high_count > 0
      ? 7.5
      : scan.medium_count > 0
        ? 5.3
        : 0;
  return {
    scanId: scan.id,
    projectTitle: scan.project_name,
    summary: {
      criticalCount: scan.critical_count,
      highCount: scan.high_count,
      mediumCount: scan.medium_count,
      lowCount: scan.low_count,
      total: scan.total,
      maxCvss: scan.maximum_cvss || heuristicMaxCvss
    },
    metadata: {
      scanId: scan.id,
      score: scan.score,
      engine: scan.ai_model_used,
      scannedAt: scan.created_at
    },
    findings: findingsResult.rows
  };
}

module.exports = {
  UUID_PATTERN,
  createAuditReportCsv,
  createAuditReportMarkdown,
  createAuditReportPdf,
  loadOwnedScanSummary,
  normalizeSummary,
  normalizePortableReport,
  safeFilename,
  sanitizeCsvField
};
