import React, { useState } from 'react';
import { X, ShieldCheck, Copy, Check, Download, FileSpreadsheet, FileText, ListChecks } from 'lucide-react';
import { lunarApi } from '../services/lunarApi';
import { buildPortableRemediationReport } from '../services/remediationReport';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

export default function AuditReportExportModal({ isOpen, onClose, project, scanResult }) {
  const [copied, setCopied] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('');
  const [downloadMessage, setDownloadMessage] = useState('');
  const dialogRef = useModalFocusTrap({ isOpen: isOpen && Boolean(project), onClose });

  if (!isOpen || !project) return null;

  const cvss = scanResult?.stats?.maxCvss || 0;
  const isSecure = cvss < 4.0;
  const badgeColor = isSecure ? '10b981' : cvss < 7.0 ? 'f59e0b' : 'f43f5e';
  const badgeLabel = isSecure ? 'SECURITY_PASSED' : `CVSS_${cvss.toFixed(1)}_VULNERABLE`;

  const badgeMarkdown = `[![Lunar.dev Audit](https://img.shields.io/badge/Lunar.dev-${badgeLabel}-${badgeColor}?style=for-the-badge&logo=shield)](${project.githubUrl || 'https://lunar.dev'})`;

  const handleCopy = () => {
    navigator.clipboard.writeText(badgeMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (format) => {
    setDownloadFormat(format);
    setDownloadMessage('');
    try {
      const scanId = project.deepScan?.scanId || project.scanId;
      let download;
      if (format === 'csv') {
        if (!scanId) throw new Error('CSV yêu cầu một verified scan đã được lưu trên backend.');
        download = await lunarApi.downloadAuditReportCsv(scanId);
      } else {
        download = await lunarApi.downloadPortableRemediationReport(
          format,
          buildPortableRemediationReport({ project, scanResult })
        );
      }
      const { blob, contentDisposition } = download;
      const filename = contentDisposition.match(/filename="([^"]+)"/i)?.[1]
        || `lunar-security-remediation-report.${format === 'markdown' ? 'md' : format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadMessage(error.message || 'Không thể tạo file báo cáo.');
    } finally {
      setDownloadFormat('');
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
        ref={dialogRef}
        className="glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-report-dialog-title"
        tabIndex={-1}
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
              Bàn giao toàn bộ finding, nguyên nhân, evidence, hướng sửa và checklist rescan
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

        {downloadMessage && (
          <div role="alert" style={{ color: '#fda4af', fontSize: '0.84rem', marginBottom: '14px' }}>
            {downloadMessage}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '10px',
          marginBottom: '18px'
        }}>
          <div style={{ padding: '13px', borderRadius: '10px', background: 'rgba(34,211,238,.08)', border: '1px solid rgba(34,211,238,.22)' }}>
            <ListChecks size={17} color="#67e8f9" />
            <strong style={{ display: 'block', marginTop: '5px', fontSize: '0.82rem' }}>Developer-ready</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>Root cause, attack path, fix steps, before/after và validation.</span>
          </div>
          <div style={{ padding: '13px', borderRadius: '10px', background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.22)' }}>
            <FileText size={17} color="#c4b5fd" />
            <strong style={{ display: 'block', marginTop: '5px', fontSize: '0.82rem' }}>AI handoff</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>Markdown có cấu trúc để AI khác đọc và sửa theo từng finding.</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => handleDownload('pdf')} disabled={Boolean(downloadFormat)} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
            <Download size={18} />
            {downloadFormat === 'pdf' ? 'Đang Khởi Tạo PDF...' : 'Tải Full Remediation Report (PDF)'}
          </button>
          <button onClick={() => handleDownload('markdown')} disabled={Boolean(downloadFormat)} className="btn btn-secondary" style={{ width: '100%', padding: '12px' }}>
            <FileText size={18} />
            {downloadFormat === 'markdown' ? 'Đang Tạo Markdown...' : 'Tải AI Fix Handoff (README.md)'}
          </button>
          <button onClick={() => handleDownload('csv')} disabled={Boolean(downloadFormat)} className="btn btn-secondary" style={{ width: '100%', padding: '12px' }}>
            <FileSpreadsheet size={18} />
            {downloadFormat === 'csv' ? 'Đang Khởi Tạo CSV...' : 'Tải Dữ Liệu Phát Hiện An Toàn (CSV)'}
          </button>
        </div>

      </div>
    </div>
  );
}
