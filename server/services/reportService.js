const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeNumber(value, maximum = 100000) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(maximum, number));
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
  const safeExtension = extension === 'csv' ? 'csv' : 'pdf';
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
  return String(value || '')
    .replace(
      /(\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\b\s*[:=]\s*["'])[^"']+(["'])/gi,
      '$1[REDACTED]$2'
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, 'Bearer [REDACTED]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
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
    let y = 730;
    const commands = [
      'BT',
      '/F2 8 Tf',
      '1 0 0 1 46 765 Tm',
      '(LUNAR.DEV - VERIFIED SECURITY AUDIT) Tj',
      'ET'
    ];
    pageLines.forEach((line) => {
      const style = PDF_LINE_STYLES[line.style];
      commands.push(
        'BT',
        `/${style.font} ${style.size} Tf`,
        `1 0 0 1 46 ${y} Tm`,
        `(${asciiPdfText(line.text)}) Tj`,
        'ET'
      );
      y -= style.leading;
    });
    commands.push(
      'BT',
      '/F1 8 Tf',
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
  const findings = Array.isArray(scanSummary?.findings)
    ? scanSummary.findings.slice(0, 500)
    : [];
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
      ...reportLine('Interpretation and limitations', 'heading'),
      ...reportLine(
        'Each item below is a deterministic source match with file and line evidence. '
        + 'A finding is not proof of exploitability; validate reachability, trust boundaries '
        + 'and runtime controls before remediation.',
        'body'
      ),
      ...reportLine(
        'Secret-like evidence is redacted in this portable report. Full source remains in the authenticated workspace.',
        'muted'
      ),
      ...reportLine('', 'spacer'),
      ...reportLine('Detailed findings', 'heading')
    ]
  ];

  if (!findings.length) {
    blocks.push(reportLine('No persisted findings were recorded for this scan.', 'body'));
  } else {
    findings.forEach((finding, index) => {
      const severity = String(finding.severity || 'info').toUpperCase();
      const rule = finding.ruleId || 'LEGACY-RULE';
      const cwe = finding.cwe || 'CWE-UNKNOWN';
      const location = `${finding.filePath || 'unknown file'}:${finding.line || 0}`;
      blocks.push([
        ...reportLine(
          `${String(index + 1).padStart(3, '0')}. [${severity}] ${rule} / ${cwe} - ${finding.title || 'Security finding'}`,
          'finding'
        ),
        ...reportLine(
          `Location: ${location} | CVSS: ${safeNumber(finding.cvss, 10).toFixed(1)} | Status: ${finding.status || 'open'}`,
          'muted'
        ),
        ...reportLine(`Evidence: ${redactEvidence(finding.evidence) || '[not stored]'}`, 'body'),
        ...reportLine(`Recommendation: ${finding.recommendation || 'Review and apply the least-privilege safe pattern.'}`, 'body'),
        ...reportLine('', 'spacer')
      ]);
    });
    if (summary.total > findings.length) {
      blocks.push(reportLine(
        `${summary.total - findings.length} additional findings were omitted from this portable report limit.`,
        'muted'
      ));
    }
  }

  return createPdfFromPages(paginateBlocks(blocks));
}

function createAuditReportCsv(projectTitle, scanSummary) {
  const summary = normalizeSummary(scanSummary);
  const metadata = scanSummary?.metadata || {};
  const findings = Array.isArray(scanSummary?.findings)
    ? scanSummary.findings.slice(0, 500)
    : [];
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
    'status'
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
        finding.ruleId || 'LEGACY-RULE',
        finding.cwe || 'CWE-UNKNOWN',
        finding.title || 'Security finding',
        finding.severity || 'info',
        safeNumber(finding.cvss, 10),
        finding.filePath || '',
        safeNumber(finding.line),
        redactEvidence(finding.evidence),
        finding.recommendation || 'Review and apply the least-privilege safe pattern.',
        finding.status || 'open'
      ])
    : [[...reportFields, '', '', '', '', '', '', '', '', '', '']];
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
     LIMIT 500`,
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
  createAuditReportPdf,
  loadOwnedScanSummary,
  normalizeSummary,
  safeFilename,
  sanitizeCsvField
};
