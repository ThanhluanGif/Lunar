import React, { useState } from 'react';
import { X, Bot, Copy, Check, Download, Sparkles } from 'lucide-react';
import { generateLunarGitHubActionYaml } from '../services/githubBotService';

export default function GitBotConfigModal({ isOpen, onClose, repoUrl }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const yamlContent = generateLunarGitHubActionYaml();

  const handleCopy = () => {
    navigator.clipboard.writeText(yamlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadYaml = () => {
    const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lunar-security.yml';
    link.click();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 130,
      background: 'rgba(5, 8, 14, 0.9)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div
        className="glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-bot-dialog-title"
        style={{
        maxWidth: '640px',
        width: '100%',
        padding: '32px',
        position: 'relative',
        boxShadow: '0 0 50px rgba(6, 182, 212, 0.3)',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Đóng cấu hình GitHub Bot"
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

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
          }}>
            <Bot size={26} color="#ffffff" />
          </div>

          <div>
            <h3 id="github-bot-dialog-title" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: '800' }}>
              Cấu Hình GitHub Security Bot & CI/CD Action
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Tự động hóa việc quét mã nguồn và tự động tạo Pull Request khi có commit mới
            </p>
          </div>
        </div>

        {/* Action Description */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', background: 'rgba(6, 182, 212, 0.08)' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} /> Quy Trình Tự Động Vá Lỗi (Automated Git Workflow):
          </div>
          <ol style={{ paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
            <li>Tạo file cấu hình <code style={{ color: 'var(--accent-cyan)' }}>.github/workflows/lunar-security.yml</code> trong kho GitHub.</li>
            <li>Repository cần có script <code style={{ color: 'var(--accent-cyan)' }}>qa:security</code>; workflow không tải CLI chưa được khóa phiên bản bằng <code>npx</code>.</li>
            <li>Mỗi khi lập trình viên Push Code hoặc mở Pull Request, <strong>Lunar Bot</strong> sẽ tự động quét lỗ hổng OWASP.</li>
            <li>Nếu phát hiện lỗ hổng Critical, Bot sẽ tự động rẽ nhánh và tạo <strong>Pull Request chứa bản vá safe code</strong>.</li>
          </ol>
        </div>

        {/* Generated Yaml Preview */}
        <div className="input-group" style={{ marginBottom: '16px' }}>
          <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>File Cấu Hình GitHub Action (.github/workflows/lunar-security.yml)</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>YAML Format</span>
          </label>

          <div style={{
            background: '#0d1117',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            maxHeight: '220px',
            overflowY: 'auto'
          }}>
            <pre style={{ margin: 0, color: '#e6edf3', whiteSpace: 'pre-wrap' }}>{yamlContent}</pre>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <button onClick={handleCopy} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
            {copied ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
            {copied ? 'Đã Copy Yaml!' : 'Copy YAML Code'}
          </button>

          <button onClick={handleDownloadYaml} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
            <Download size={16} /> Tải File lunar-security.yml
          </button>
        </div>

        <p role="note" style={{ marginTop: '14px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          Lunar chưa tự ghi workflow vào repository. Hãy tải file, review nội dung và commit vào
          <code> .github/workflows/lunar-security.yml</code>.
        </p>

      </div>
    </div>
  );
}
