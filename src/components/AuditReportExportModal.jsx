import React, { useState } from 'react';
import { X, ShieldCheck, Copy, Check, Award, Download } from 'lucide-react';

export default function AuditReportExportModal({ isOpen, onClose, project, scanResult }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !project) return null;

  const cvss = scanResult?.stats?.maxCvss || 0;
  const isSecure = cvss < 4.0;
  const badgeColor = isSecure ? '10b981' : cvss < 7.0 ? 'f59e0b' : 'f43f5e';
  const badgeLabel = isSecure ? 'SECURITY_PASSED' : `CVSS_${cvss.toFixed(1)}_VULNERABLE`;

  const badgeMarkdown = `[![SecCode.vn Audit](https://img.shields.io/badge/SecCode.vn-${badgeLabel}-${badgeColor}?style=for-the-badge&logo=shield)](${project.githubUrl || 'https://seccode.vn'})`;

  const handleCopy = () => {
    navigator.clipboard.writeText(badgeMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <div className="glass-panel" style={{
        maxWidth: '540px',
        width: '100%',
        padding: '28px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
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
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: '800' }}>
              Báo Cáo Kiểm Định An Ninh (Security Audit Report)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Chứng nhận tuân thủ an toàn mã nguồn cho dự án {project.title}
            </p>
          </div>
        </div>

        {/* Live Badge Preview */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
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
            src={`https://img.shields.io/badge/SecCode.vn-${badgeLabel}-${badgeColor}?style=for-the-badge&logo=shield`}
            alt="Security Badge"
            style={{ height: '36px' }}
          />
        </div>

        {/* Markdown Badge Input */}
        <div className="input-group">
          <label className="input-label">Mã Markdown Dán Vào README.md</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              value={badgeMarkdown}
              className="input-control"
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
            />
            <button onClick={handleCopy} className="btn btn-primary btn-sm">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Đã Copy!' : 'Copy'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
