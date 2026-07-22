import React, { useState } from 'react';
import { X, Award, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';

export default function PortfolioBadgeModal({ isOpen, onClose, project }) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  if (!isOpen || !project) return null;

  const score = project.overallScore || 85;
  const color = score >= 90 ? '10b981' : score >= 80 ? '6366f1' : 'f59e0b';
  
  const markdownSnippet = `[![CodeReviewVN Score](https://img.shields.io/badge/CodeReviewVN-${score}%2F100-${color}?style=for-the-badge&logo=shields.io)](${project.githubUrl || 'https://codereview.vn'})`;
  const htmlSnippet = `<a href="${project.githubUrl || 'https://codereview.vn'}"><img src="https://img.shields.io/badge/CodeReviewVN-${score}%2F100-${color}?style=for-the-badge&logo=shields.io" alt="CodeReviewVN Score" /></a>`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'md') {
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } else {
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
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
          <Award size={28} color="#fbbf24" />
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: '800' }}>
              Xuất Portfolio Badge Cho GitHub README
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Chèn Badge này vào file README.md để chứng minh chất lượng code xuất sắc!
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
            Xem Trước Hiển Thị (Live Preview):
          </div>
          <img
            src={`https://img.shields.io/badge/CodeReviewVN-${score}%2F100-${color}?style=for-the-badge&logo=shields.io`}
            alt="Badge Preview"
            style={{ height: '36px' }}
          />
        </div>

        {/* Markdown Copy */}
        <div className="input-group" style={{ marginBottom: '16px' }}>
          <label className="input-label">Mã Markdown (Khuyên dùng cho README.md)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              value={markdownSnippet}
              className="input-control"
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
            />
            <button
              onClick={() => copyToClipboard(markdownSnippet, 'md')}
              className="btn btn-primary btn-sm"
            >
              {copiedMd ? <Check size={16} /> : <Copy size={16} />}
              {copiedMd ? 'Đã Copy!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* HTML Copy */}
        <div className="input-group">
          <label className="input-label">Mã HTML Snippet</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              value={htmlSnippet}
              className="input-control"
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
            />
            <button
              onClick={() => copyToClipboard(htmlSnippet, 'html')}
              className="btn btn-secondary btn-sm"
            >
              {copiedHtml ? <Check size={16} /> : <Copy size={16} />}
              {copiedHtml ? 'Đã Copy!' : 'Copy'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
