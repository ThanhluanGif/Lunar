const nodemailer = require('nodemailer');

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getAccountEmailConfiguration() {
  const dryRun = process.env.AUTH_EMAIL_DRY_RUN === 'true';
  const smtpUrl = String(process.env.AUTH_EMAIL_SMTP_URL || '').trim();
  const from = String(process.env.AUTH_EMAIL_FROM || '').trim();
  const baseUrl = String(process.env.AUTH_EMAIL_BASE_URL || 'http://localhost:5050').trim();

  return {
    configured: dryRun || Boolean(smtpUrl && from),
    dryRun,
    smtpUrl,
    from: from || 'Lunar Security <no-reply@lunar.local>',
    baseUrl
  };
}

function createAccountActionUrl(path, token) {
  const config = getAccountEmailConfiguration();
  const url = new URL('/', config.baseUrl);
  url.searchParams.set(path === 'verify-email' ? 'verify_email' : 'reset_token', token);
  return url.toString();
}

async function deliverAccountEmail({ to, subject, text, html }) {
  const config = getAccountEmailConfiguration();
  if (!config.configured) {
    const error = new Error('Transactional account email is not configured.');
    error.code = 'AUTH_EMAIL_NOT_CONFIGURED';
    throw error;
  }

  if (config.dryRun) {
    return {
      mode: 'dry-run',
      messageId: `dry-run-${Date.now()}`,
      recipient: to
    };
  }

  const transporter = nodemailer.createTransport(config.smtpUrl);
  const result = await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html
  });
  return {
    mode: 'smtp',
    messageId: result.messageId,
    recipient: to
  };
}

async function sendPasswordResetEmail({ email, name, token }) {
  const resetUrl = createAccountActionUrl('reset-password', token);
  const safeName = escapeHtml(name || 'bạn');
  const safeResetUrl = escapeHtml(resetUrl);
  return deliverAccountEmail({
    to: email,
    subject: 'Đặt lại mật khẩu Lunar.dev',
    text: [
      `Xin chào ${name || 'bạn'},`,
      '',
      'Có yêu cầu đặt lại mật khẩu cho tài khoản Lunar.dev của bạn.',
      `Mở liên kết này trong 30 phút: ${resetUrl}`,
      '',
      'Nếu bạn không yêu cầu, hãy bỏ qua email này.'
    ].join('\n'),
    html: `
      <h2>Đặt lại mật khẩu Lunar.dev</h2>
      <p>Xin chào ${safeName},</p>
      <p>Liên kết bên dưới có hiệu lực trong 30 phút và chỉ dùng được một lần.</p>
      <p><a href="${safeResetUrl}">Đặt lại mật khẩu</a></p>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `
  });
}

async function sendEmailVerification({ email, name, token }) {
  const verificationUrl = createAccountActionUrl('verify-email', token);
  const safeName = escapeHtml(name || 'bạn');
  const safeVerificationUrl = escapeHtml(verificationUrl);
  return deliverAccountEmail({
    to: email,
    subject: 'Xác minh email Lunar.dev',
    text: [
      `Xin chào ${name || 'bạn'},`,
      '',
      `Xác minh email Lunar.dev trong 24 giờ: ${verificationUrl}`
    ].join('\n'),
    html: `
      <h2>Xác minh email Lunar.dev</h2>
      <p>Xin chào ${safeName},</p>
      <p><a href="${safeVerificationUrl}">Xác minh địa chỉ email</a></p>
      <p>Liên kết có hiệu lực trong 24 giờ và chỉ dùng được một lần.</p>
    `
  });
}

module.exports = {
  createAccountActionUrl,
  getAccountEmailConfiguration,
  sendEmailVerification,
  sendPasswordResetEmail
};
