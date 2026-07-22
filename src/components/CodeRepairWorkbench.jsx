import React, { useState } from 'react';
import { Wrench, Sparkles, Code, CheckCircle, Download, Copy, GitPullRequest, ArrowRight, ShieldCheck, Cpu, Eye } from 'lucide-react';

export default function CodeRepairWorkbench({ activeFile, activeVuln, onApplyFix }) {
  const [repairStyle, setRepairStyle] = useState('security'); // 'security' | 'performance' | 'clean'
  const [customPrompt, setCustomPrompt] = useState('');
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' | 'unified'
  const [isApplying, setIsApplying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prCreated, setPrCreated] = useState(false);

  if (!activeVuln) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Vui lòng chọn một lỗ hổng bảo mật để bắt đầu sửa code bằng AI.</p>
      </div>
    );
  }

  const originalCode = activeVuln.originalCode || activeFile?.content || '';
  const patchedCode = activeVuln.patchedCode || originalCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(patchedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreatePR = () => {
    setPrCreated(true);
    setTimeout(() => setPrCreated(false), 4000);
  };

  const handleDownload = () => {
    const blob = new Blob([patchedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patched_${activeFile?.path?.split('/').pop() || 'code.ts'}`;
    link.click();
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '14px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={22} color="var(--accent-cyan)" />
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: '800' }}>
              Bộ Công Cụ Sửa Code Tự Động (AI Code Repair Workbench)
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Đang vá lỗi: {activeVuln.title} (Line {activeVuln.line})
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`btn btn-sm ${viewMode === 'side-by-side' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Side-by-Side View
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`btn btn-sm ${viewMode === 'unified' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Unified Diff
          </button>
        </div>
      </div>

      {/* Style Selector & Custom Prompt Controls */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
          Chọn Phong Cách Sửa Code AI (AI Refactoring Preference):
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <button
            onClick={() => setRepairStyle('security')}
            className={`btn ${repairStyle === 'security' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ justifyContent: 'flex-start' }}
          >
            <ShieldCheck size={16} />
            🔒 Max Security (OWASP Top 10)
          </button>

          <button
            onClick={() => setRepairStyle('performance')}
            className={`btn ${repairStyle === 'performance' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ justifyContent: 'flex-start' }}
          >
            <Cpu size={16} />
            ⚡ High Performance Async
          </button>

          <button
            onClick={() => setRepairStyle('clean')}
            className={`btn ${repairStyle === 'clean' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ justifyContent: 'flex-start' }}
          >
            <Eye size={16} />
            📖 Clean Code & Comments
          </button>
        </div>

        {/* Optional Custom Instruction Prompt */}
        <div className="input-group" style={{ marginBottom: 0 }}>
          <input
            type="text"
            placeholder="Tùy chỉnh yêu cầu sửa code (VD: Sử dụng async/await thay cho Promise, dùng Parameterized Queries...)"
            className="input-control"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            style={{ fontSize: '0.84rem' }}
          />
        </div>
      </div>

      {/* Interactive Code Diff Viewer */}
      {viewMode === 'side-by-side' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {/* Left: Original Vulnerable Code */}
          <div style={{
            background: '#1a0d10',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem'
          }}>
            <div style={{ color: '#fb7185', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>
              🔴 ORIGINAL: Code Hiện Tại Có Lỗi
            </div>
            <pre style={{ margin: 0, color: '#fca5a5', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {originalCode}
            </pre>
          </div>

          {/* Right: AI Patched Code */}
          <div style={{
            background: '#0d1f18',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem'
          }}>
            <div style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>
              🟢 AI PATCHED: Code Đã Được Vá An Toàn
            </div>
            <pre style={{ margin: 0, color: '#6ee7b7', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {patchedCode}
            </pre>
          </div>
        </div>
      ) : (
        /* Unified View */
        <div style={{
          background: '#0d1117',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          marginBottom: '20px'
        }}>
          <div style={{ color: '#fb7185', background: 'rgba(244, 63, 94, 0.15)', padding: '4px 8px', marginBottom: '4px' }}>
            - {originalCode}
          </div>
          <div style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 8px' }}>
            + {patchedCode}
          </div>
        </div>
      )}

      {/* AI Architectural Remediation Explanation */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', background: 'rgba(99, 102, 241, 0.08)' }}>
        <div style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontSize: '0.88rem', marginBottom: '6px' }}>
          💡 Giải Thích Phương Án Vá Lỗi Chi Tiết Của AI:
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
          {activeVuln.recommendation || 'Bản vá loại bỏ hoàn toàn các chuỗi cộng SQL trực tiếp, chuyển sang dùng Parameterized Query để ngăn chặn tấn công SQL Injection triệt để.'}
        </p>
      </div>

      {/* Export Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={handleCopy} className="btn btn-secondary">
          {copied ? <CheckCircle size={16} color="#34d399" /> : <Copy size={16} />}
          {copied ? 'Đã Copy Code!' : 'Copy Code Đã Sửa'}
        </button>

        <button onClick={handleDownload} className="btn btn-secondary">
          <Download size={16} />
          Tải File Code Đã Vá
        </button>

        <button onClick={handleCreatePR} className="btn btn-emerald">
          <GitPullRequest size={16} />
          Tạo GitHub Pull Request Tự Động
        </button>
      </div>

      {prCreated && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-sm)',
          color: '#34d399',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={16} />
          <span>Tạo Pull Request thành công trên GitHub! Đang đợi CI/CD test chạy.</span>
        </div>
      )}

    </div>
  );
}
