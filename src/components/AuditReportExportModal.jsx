import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Copy, Check, Download, Mail } from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

export default function AuditReportExportModal({ isOpen, onClose, project, scanResult, currentUser }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendingGmail, setSendingGmail] = useState(false);
  const [gmailSentSuccess, setGmailSentSuccess] = useState(false);
  const [gmailConfigured, setGmailConfigured] = useState(false);
  const [gmailMessage, setGmailMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!isOpen) return () => { cancelled = true; };
    setGmailConfigured(false);
    setGmailMessage('');
    if (!currentUser) return () => { cancelled = true; };
    lunarApi.getGmailNotificationStatus()
      .then((status) => {
        if (cancelled) return;
        setGmailConfigured(status.canSend);
        if (!status.canSend) {
          setGmailMessage(status.oauthConfigured
            ? 'Hãy mở Gmail Alert và kết nối Gmail cá nhân trước khi gửi báo cáo.'
            : 'Quản trị viên chưa cấu hình Google OAuth Client cho Gmail.');
        }
      })
      .catch((error) => {
        if (!cancelled) setGmailMessage(error.message || 'Không thể kiểm tra cấu hình Gmail.');
      });
    return () => { cancelled = true; };
  }, [currentUser, isOpen]);

  if (!isOpen || !project) return null;

  const cvss = scanResult?.stats?.maxCvss || 0;
  const isSecure = cvss < 4.0;
  const badgeColor = isSecure ? '10b981' : cvss < 4.0 ? 'f59e0b' : 'f43f5e';
  const badgeLabel = isSecure ? 'SECURITY_PASSED' : `CVSS_${cvss.toFixed(1)}_VULNERABLE`;

  const badgeMarkdown = `[![Lunar.dev Audit](https://img.shields.io/badge/Lunar.dev-${badgeLabel}-${badgeColor}?style=for-the-badge&logo=shield)](${project.githubUrl || 'https://lunar.dev'})`;

  const handleCopy = () => {
    navigator.clipboard.writeText(badgeMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendGmail = async () => {
    setSendingGmail(true);
    setGmailMessage('');
    try {
      const result = await lunarApi.sendAuditReportEmail({
        scanId: project.deepScan?.scanId || project.scanId
      });
      setGmailSentSuccess(true);
      setGmailMessage(result.mode === 'dry-run'
        ? `Dry-run Gmail thành công cho ${result.recipient}.`
        : `Đã gửi báo cáo tới ${result.recipient}.`);
      setTimeout(() => setGmailSentSuccess(false), 4000);
    } catch (error) {
      setGmailSentSuccess(false);
      setGmailMessage(error.message || 'Không thể gửi báo cáo qua Gmail.');
    } finally {
      setSendingGmail(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setGmailMessage('');
    try {
      const scanId = project.deepScan?.scanId || project.scanId;
      if (!scanId) {
        throw new Error('Hãy chạy và lưu một verified scan trước khi xuất PDF.');
      }
      const { blob, contentDisposition } = await lunarApi.downloadAuditReportPdf(scanId);
      const filename = contentDisposition.match(/filename="([^"]+)"/i)?.[1]
        || 'lunar-security-audit-report.pdf';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setGmailMessage(error.message || 'Không thể tạo file báo cáo.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 110,
      background: 'rgba(5, 8, 14, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div
        className="glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-report-dialog-title"
        style={{
        maxWidth: '540px',
        width: '100%',
        padding: '28px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          aria-label="Đóng báo cáo audit"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <ShieldCheck size={28} color="var(--accent-cyan)" />
          <div>
            <h3 id="audit-report-dialog-title" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: '800' }}>
              Báo Cáo Kiểm Định An Ninh (Security Audit Report)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Xuất chứng chỉ an ninh và gửi bản tổng hợp tới Gmail
            </p>
          </div>
        </div>

        {/* Live Badge Preview */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '20px',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          marginBottom: '20px',
          border: '1px dashed var(--border-color)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Security Compliance Badge (GitHub README):
          </div>
          <img
            src={`https://img.shields.io/badge/Lunar.dev-${badgeLabel}-${badgeColor}?style=for-the-badge&logo=shield`}
            alt="Security Badge"
            style={{ height: '36px' }}
          />
        </div>

        {/* Markdown Badge Input */}
        <div className="input-group" style={{ marginBottom: '20px' }}>
          <label className="input-label">Mã Markdown Dán Vào README.md</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              value={badgeMarkdown}
              className="input-control"
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
            />
            <button onClick={handleCopy} className="btn btn-secondary btn-sm">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Đã Copy!' : 'Copy'}
            </button>
          </div>
        </div>

        {gmailSentSuccess && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#34d399',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '14px',
            textAlign: 'center'
          }}>
            📧 {gmailMessage}
          </div>
        )}

        {!gmailSentSuccess && gmailMessage && (
          <div role="alert" style={{ color: '#fda4af', fontSize: '0.84rem', marginBottom: '14px' }}>
            {gmailMessage}
          </div>
        )}

        {!gmailConfigured && currentUser && !gmailMessage && (
          <div style={{ color: '#fcd34d', fontSize: '0.82rem', marginBottom: '14px' }}>
            Hãy kết nối Gmail cá nhân trước khi gửi báo cáo.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={handleDownloadPdf} disabled={downloading} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
            <Download size={18} />
            {downloading ? 'Đang Khởi Tạo Báo Cáo...' : 'Tải Báo Cáo Executive Security Audit (PDF)'}
          </button>

          <button
            onClick={handleSendGmail}
            disabled={sendingGmail || !gmailConfigured || !currentUser}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '11px', borderColor: '#ea4335', color: '#fca5a5', gap: '8px' }}
          >
            <Mail size={18} color="#ea4335" />
            {sendingGmail ? 'Đang Gửi Về Gmail...' : 'Gửi Báo Cáo Audit Trực Tiếp Về Gmail'}
          </button>
        </div>

      </div>
    </div>
  );
}
