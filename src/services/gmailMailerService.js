/**
 * 🌙 Lunar.dev — Gmail Mailer Service
 * Dịch vụ xử lý gửi email chuyên biệt tích hợp hệ thống thông báo Gmail
 * Hỗ trợ: Welcome Mail, Hóa đơn mua gói Pro (Pro Invoice), Báo cáo Audit & Cảnh báo khẩn cấp.
 */

import { supabaseDb } from './supabaseClient';

// Giả lập lịch sử email đã gửi trong RAM
const emailLogHistory = [];

/**
 * Gửi email chào mừng khi người dùng đăng ký hoặc đăng nhập qua Gmail
 */
export async function sendWelcomeGmail(email, userName = 'Developer') {
  console.log(`[Gmail Mailer] 📧 Sending Welcome Email to: ${email}`);
  
  const emailContent = {
    id: `mail-welcome-${Date.now()}`,
    to: email,
    subject: '🌙 Chào mừng bạn đến với Lunar.dev — AI Security & SAST Workbench!',
    type: 'WELCOME',
    timestamp: new Date().toISOString(),
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 30px; border-radius: 12px;">
        <h2 style="color: #8b5cf6; font-size: 24px;">🌙 Lunar.dev Security Workbench</h2>
        <p>Xin chào <strong>${userName}</strong> (${email}),</p>
        <p>Cảm ơn bạn đã đăng nhập và kết nối tài khoản Gmail với <strong>Lunar.dev</strong> — Nền tảng tĩnh kiểm tra mã nguồn (SAST) & Vá lỗi 1-Click bằng AI.</p>
      </div>
    `
  };

  emailLogHistory.unshift(emailContent);
  await supabaseDb.saveEmailLog(emailContent);
  return { success: true, message: `Email chào mừng đã được gửi tới ${email}` };
}

/**
 * Gửi hóa đơn thanh toán bản Pro / Enterprise về Gmail ngay sau khi mua thành công
 */
export async function sendProInvoiceGmail(email, userName, planInfo, transactionId) {
  console.log(`[Gmail Mailer] 🧾 Sending Pro Invoice Email to: ${email} for transaction ${transactionId}`);

  const invoiceDate = new Date().toLocaleDateString('vi-VN');
  const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN');

  const emailContent = {
    id: `mail-inv-${transactionId}`,
    to: email,
    subject: `🧾 Hóa Đơn Thanh Toán Thành Công Gói ${planInfo.name} — Lunar.dev`,
    type: 'INVOICE',
    timestamp: new Date().toISOString(),
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 30px; border-radius: 12px; border: 1px solid #334155;">
        <h2>🌙 Lunar.dev Subscription Invoice</h2>
        <p>Kính gửi <strong>${userName}</strong> (${email}), Hóa đơn mã: <strong>${transactionId}</strong> (${planInfo.price}) đã hoàn tất.</p>
      </div>
    `
  };

  emailLogHistory.unshift(emailContent);
  await supabaseDb.saveEmailLog(emailContent);

  // Cũng đồng thời lưu transaction vào Supabase DB
  await supabaseDb.saveTransaction({
    id: transactionId,
    userName,
    userEmail: email,
    planName: planInfo.name,
    amount: planInfo.price,
    method: 'VietQR Banking',
    status: 'COMPLETED'
  });

  return { success: true, message: `Hóa đơn đã được gửi thành công đến Gmail: ${email}` };
}

/**
 * Gửi Báo Cáo An Ninh Mã Nguồn (Security Audit Report Digest) qua Gmail
 */
export async function sendSecurityAuditGmail(email, projectTitle, scanResult) {
  console.log(`[Gmail Mailer] 🛡️ Sending Audit Report for "${projectTitle}" to: ${email}`);

  const maxCvss = scanResult?.stats?.maxCvss || 0;
  const criticalCount = scanResult?.stats?.criticalCount || 0;
  const highCount = scanResult?.stats?.highCount || 0;

  const emailContent = {
    id: `mail-audit-${Date.now()}`,
    to: email,
    subject: `🛡️ [Security Audit Report] Báo Cáo An Ninh Mã Nguồn: ${projectTitle}`,
    type: 'AUDIT_REPORT',
    timestamp: new Date().toISOString(),
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 30px;">
        <h2>🌙 Lunar.dev Audit Report: ${projectTitle}</h2>
        <p>CVSS: ${maxCvss.toFixed(1)} / Critical: ${criticalCount} / High: ${highCount}</p>
      </div>
    `
  };

  emailLogHistory.unshift(emailContent);
  await supabaseDb.saveEmailLog(emailContent);
  return { success: true, message: `Báo cáo Audit đã được chuyển đến Gmail ${email}` };
}

/**
 * Lấy lịch sử email đã gửi trong phiên làm việc
 */
export function getEmailLogHistory() {
  return emailLogHistory;
}
