import React, { useState } from 'react';
import { X, Github, Sparkles, Loader2, Code, ShieldCheck, AlertCircle } from 'lucide-react';
import { fetchGitHubRepoDetails } from '../services/githubService';
import { analyzeProjectWithAI } from '../services/aiReviewEngine';

export default function SubmitModal({ isOpen, onClose, onAddProject }) {
  const [githubUrl, setGithubUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [activeMode, setActiveMode] = useState('github'); // 'github' | 'snippet'
  const [loading, setLoading] = useState(false);
  const [stepText, setStepText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      let rawProjectData = null;

      if (activeMode === 'github') {
        if (!githubUrl.trim()) {
          throw new Error('Vui lòng nhập đường dẫn GitHub URL.');
        }

        setStepText('Đang kết nối GitHub REST API & tải cây thư mục mã nguồn...');
        await new Promise(r => setTimeout(r, 600));

        rawProjectData = await fetchGitHubRepoDetails(githubUrl);
      } else {
        if (!customCode.trim()) {
          throw new Error('Vui lòng dán đoạn mã nguồn của bạn.');
        }

        setStepText('Đang khởi tạo dự án mã nguồn...');
        rawProjectData = {
          title: 'Custom Snippet Project',
          githubUrl: '#',
          description: 'Mã nguồn được dán trực tiếp từ người dùng',
          stars: 1,
          forks: 0,
          language: 'TypeScript',
          author: {
            name: 'Bạn (Developer)',
            username: 'dev-user',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            badge: 'Community Dev',
            karma: 100
          },
          files: [
            {
              path: 'src/main.ts',
              language: 'typescript',
              content: customCode,
              annotations: []
            }
          ]
        };
      }

      setStepText('Đang chạy AI Engine: Phân tích 5 chỉ số (Naming, Architecture, Performance, Security, Readability)...');
      await new Promise(r => setTimeout(r, 1000));

      const analyzedProject = analyzeProjectWithAI(rawProjectData);
      analyzedProject.id = 'proj-' + Date.now();
      analyzedProject.submittedAt = 'Vừa xong';
      analyzedProject.communityReviews = [];

      onAddProject(analyzedProject);
      setLoading(false);
      onClose();
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Đã có lỗi xảy ra trong quá trình AI Code Review.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(5, 8, 14, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '28px',
        position: 'relative',
        boxShadow: '0 0 50px rgba(99, 102, 241, 0.3)',
        border: '1px solid rgba(99, 102, 241, 0.4)'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
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

        {/* Modal Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--gradient-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: '800' }}>
              Upload Repo & Chấm Điểm AI
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Nhập link GitHub hoặc dán code để AI tự động review và tạo scorecard Portfolio
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          margin: '20px 0',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '4px',
          borderRadius: 'var(--radius-md)'
        }}>
          <button
            onClick={() => setActiveMode('github')}
            className={`btn btn-sm ${activeMode === 'github' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            disabled={loading}
          >
            <Github size={16} /> Link GitHub Repo
          </button>
          <button
            onClick={() => setActiveMode('snippet')}
            className={`btn btn-sm ${activeMode === 'snippet' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            disabled={loading}
          >
            <Code size={16} /> Dán Mã Code Directly
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            borderRadius: 'var(--radius-md)',
            color: '#fb7185',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {activeMode === 'github' ? (
            <div className="input-group">
              <label className="input-label">GitHub Repository URL (Public)</label>
              <input
                type="text"
                placeholder="https://github.com/username/repository-name"
                className="input-control"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                disabled={loading}
                required
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Ví dụ: https://github.com/facebook/react hoặc username/repo
              </span>
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Mã nguồn của bạn (JavaScript, Python, Go, TypeScript...)</label>
              <textarea
                rows="8"
                placeholder="Dán mã nguồn bạn muốn AI review và tính điểm tại đây..."
                className="input-control"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                disabled={loading}
                required
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}
              />
            </div>
          )}

          {loading ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              <Loader2 size={32} color="var(--accent-cyan)" style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--accent-cyan)' }}>
                AI Code Review Engine Active
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {stepText}
              </p>
            </div>
          ) : (
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              <ShieldCheck size={18} />
              Bắt Đầu Phân Tích & Chấm Điểm AI
            </button>
          )}
        </form>

      </div>
    </div>
  );
}
