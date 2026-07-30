const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { getGmailOAuthStatus } = require('./gmailOAuthService');

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const mimeTransporter = nodemailer.createTransport({
  streamTransport: true,
  buffer: true,
  newline: 'unix'
});

function getGmailStatus() {
  return getGmailOAuthStatus();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

function safeAttachmentName(projectTitle) {
  const base = String(projectTitle || 'lunar-security-audit')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'lunar-security-audit'}-audit-report.pdf`;
}

function createAuditReportPdf(projectTitle, summary) {
  const risk = summary.criticalCount > 0
    ? 'CRITICAL'
    : summary.highCount > 0
      ? 'HIGH'
      : summary.mediumCount > 0
        ? 'MEDIUM'
        : 'LOW';
  const lines = [
    'LUNAR.DEV SECURITY AUDIT REPORT',
    '',
    `Project: ${asciiPdfText(projectTitle)}`,
    `Generated: ${new Date().toISOString()}`,
    `Risk: ${risk}`,
    `Maximum CVSS: ${summary.maxCvss.toFixed(1)} / 10.0`,
    '',
    `Critical findings: ${summary.criticalCount}`,
    `High findings: ${summary.highCount}`,
    `Medium findings: ${summary.mediumCount}`,
    `Total findings: ${summary.total}`,
    '',
    'Open the authenticated Lunar workspace to review line-level',
    'evidence and AI-assisted patch recommendations.'
  ];
  const textCommands = lines.map((line, index) => (
    index === 0
      ? `(${line}) Tj`
      : `0 -28 Td (${line}) Tj`
  ));
  const stream = [
    'BT',
    '/F1 16 Tf',
    '56 740 Td',
    ...textCommands,
    'ET'
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`
  ];
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

function safeEmail(value, label = 'email') {
  const email = String(value || '').trim().toLowerCase();
  if (
    email.length > 255
    || /[\r\n]/.test(email)
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    const error = new Error(`A valid ${label} is required.`);
    error.status = 400;
    throw error;
  }
  return email;
}

async function createRawMimeMessage(mailOptions) {
  const info = await mimeTransporter.sendMail(mailOptions);
  if (!Buffer.isBuffer(info.message)) {
    throw new Error('Unable to create the Gmail MIME message.');
  }
  return {
    raw: info.message.toString('base64url'),
    localMessageId: info.messageId || null
  };
}

async function sendGmailApiMessage(deliveryIdentity, mailOptions, fetchImplementation = fetch) {
  const senderEmail = safeEmail(deliveryIdentity?.senderEmail, 'connected Gmail sender');
  const message = await createRawMimeMessage({
    ...mailOptions,
    from: `"Lunar Security" <${senderEmail}>`
  });

  if (deliveryIdentity.mode === 'dry-run') {
    return {
      messageId: message.localMessageId || `dry-run-${crypto.randomUUID()}`,
      mode: 'dry-run'
    };
  }
  if (deliveryIdentity.mode !== 'user-oauth' || !deliveryIdentity.accessToken) {
    const error = new Error('Connect your Gmail account before sending notifications.');
    error.status = 409;
    throw error;
  }

  const response = await fetchImplementation(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${deliveryIdentity.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: message.raw })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.id) {
    const error = new Error(payload.error?.message || `Gmail API send failed (${response.status}).`);
    error.status = response.status === 401 ? 409 : 502;
    throw error;
  }
  return { messageId: payload.id, mode: 'user-oauth' };
}

async function sendAuditReportEmail(deliveryIdentity, toEmail, projectTitle, scanSummary) {
  const summary = normalizeSummary(scanSummary);
  const safeTitle = String(projectTitle || 'Lunar Security Audit').slice(0, 255);
  const subject = `Lunar Security Audit: ${safeTitle}`;
  const attachmentName = safeAttachmentName(safeTitle);
  const delivery = await sendGmailApiMessage(deliveryIdentity, {
    to: safeEmail(toEmail, 'authenticated Lunar account email'),
    subject,
    text: [
      `Project: ${safeTitle}`,
      `CVSS: ${summary.maxCvss.toFixed(1)}`,
      `Critical: ${summary.criticalCount}`,
      `High: ${summary.highCount}`,
      `Medium: ${summary.mediumCount}`,
      `Total: ${summary.total}`
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;background:#0b0f19;color:#e2e8f0;padding:28px;border-radius:12px">
        <h2 style="color:#a78bfa">Lunar.dev Security Audit</h2>
        <p><strong>Project:</strong> ${escapeHtml(safeTitle)}</p>
        <p><strong>CVSS:</strong> ${summary.maxCvss.toFixed(1)} / 10.0</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td>Critical</td><td>${summary.criticalCount}</td></tr>
          <tr><td>High</td><td>${summary.highCount}</td></tr>
          <tr><td>Medium</td><td>${summary.mediumCount}</td></tr>
          <tr><td>Total</td><td>${summary.total}</td></tr>
        </table>
        <p style="color:#94a3b8">Chi tiết dòng code và bản vá chỉ hiển thị trong tài khoản Lunar đã xác thực.</p>
      </div>
    `,
    attachments: [{
      filename: attachmentName,
      content: createAuditReportPdf(safeTitle, summary),
      contentType: 'application/pdf'
    }]
  });
  return {
    ...delivery,
    subject,
    summary,
    attachmentName,
    senderEmail: deliveryIdentity.senderEmail
  };
}

async function sendCriticalSecurityAlert(deliveryIdentity, toEmail, projectTitle, scanSummary) {
  const summary = normalizeSummary(scanSummary);
  const safeTitle = String(projectTitle || 'Lunar Security Scan').slice(0, 255);
  const subject = `[CRITICAL] Lunar Security Alert: ${safeTitle}`;
  const delivery = await sendGmailApiMessage(deliveryIdentity, {
    to: safeEmail(toEmail, 'authenticated Lunar account email'),
    subject,
    text: `Critical findings: ${summary.criticalCount}. CVSS: ${summary.maxCvss.toFixed(1)}. Open Lunar to review the evidence.`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#240b12;color:#ffe4e6;padding:28px;border-radius:12px">
        <h2 style="color:#fb7185">Critical Security Alert</h2>
        <p><strong>${escapeHtml(safeTitle)}</strong> có ${summary.criticalCount} phát hiện Critical.</p>
        <p>CVSS cao nhất: ${summary.maxCvss.toFixed(1)} / 10.0.</p>
        <p>Mở Lunar để xem bằng chứng và bản vá trong phiên đã xác thực.</p>
      </div>
    `
  });
  return {
    ...delivery,
    subject,
    summary,
    senderEmail: deliveryIdentity.senderEmail
  };
}

module.exports = {
  createAuditReportPdf,
  getGmailStatus,
  sendAuditReportEmail,
  sendCriticalSecurityAlert,
  sendGmailApiMessage
};
