import React, { useEffect, useState } from 'react';
import { X, Github, Mail, ShieldCheck, Sparkles, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, initialResetToken = '' }) {
  const [activeTab, setActiveTab] = useState('email');
  const [authMode, setAuthMode] = useState(initialResetToken ? 'reset' : 'login');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');

  useEffect(() => {
    if (!initialResetToken) return;
    setResetToken(initialResetToken);
    setAuthMode('reset');
    setActiveTab('email');
    setErrorMsg('');
  }, [initialResetToken]);

  if (!isOpen) return null;

  // Option 1: GitHub OAuth
  const handleConnectGitHub = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const config = await lunarApi.getGitHubConfig();
      if (!config.configured) {
        throw new Error('GitHub OAuth chưa được cấu hình. Hãy đặt các biến LUNAR_GITHUB_* trong file .env.');
      }
      window.location.assign('/api/v1/auth/github/start');
    } catch (error) {
      setLoading(false);
      setErrorMsg(error.message || 'Không thể khởi tạo kết nối GitHub.');
    }
  };

  // Option 2: Email & Password Auth
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setNoticeMsg('');
    setLoading(true);

    try {
      if (authMode === 'forgot') {
        const response = await lunarApi.forgotPassword(email);
        setNoticeMsg(response.message);
        setLoading(false);
        return;
      }
      if (authMode === 'reset') {
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp.');
        }
        const response = await lunarApi.resetPassword(resetToken, password);
        setNoticeMsg(response.message);
        setPassword('');
        setConfirmPassword('');
        setResetToken('');
        setAuthMode('login');
        setLoading(false);
        return;
      }

      const response = authMode === 'register'
        ? await lunarApi.register({
            email,
            password,
            name: fullName,
            nickname: email.split('@')[0]
          })
        : await lunarApi.login(email, password);
      const accountNotice = authMode === 'register'
        ? response.verificationEmailSent
          ? 'Đăng ký thành công. Hãy kiểm tra email để xác minh tài khoản.'
          : 'Đăng ký thành công. Bạn có thể gửi email xác minh lại trong Account Settings.'
        : '';
      onLoginSuccess(response.user, accountNotice);
      setLoading(false);
      onClose();
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Lỗi đăng nhập. Vui lòng thử lại.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(5, 8, 14, 0.88)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div
        id="auth-modal"
        className="glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        style={{
        maxWidth: '480px',
        width: '100%',
        padding: '30px',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        border: '1px solid var(--border-color)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Đóng hộp đăng nhập"
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

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: '#ea4335',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px auto',
            boxShadow: '0 0 20px rgba(234, 67, 53, 0.4)'
          }}>
            <ShieldCheck size={24} color="#fff" />
          </div>
          <h2 id="auth-modal-title" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: '800', color: '#fff' }}>
            {authMode === 'forgot'
              ? 'Khôi phục tài khoản'
              : authMode === 'reset'
                ? 'Đặt lại mật khẩu'
                : 'Đăng Nhập Lunar.dev'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Dùng email và mật khẩu hoặc kết nối an toàn qua GitHub OAuth
          </p>
        </div>

        {/* Auth Method Tabs */}
        {authMode !== 'forgot' && authMode !== 'reset' && <div style={{
          display: 'flex',
          gap: '4px',
          margin: '16px 0 20px 0',
          background: '#0f172a',
          padding: '4px',
          borderRadius: 'var(--radius-md)'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('email'); setErrorMsg(''); }}
            className={`btn btn-sm ${activeTab === 'email' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, fontSize: '0.78rem' }}
          >
            <Mail size={14} /> Email
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('github'); setErrorMsg(''); }}
            className={`btn btn-sm ${activeTab === 'github' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, fontSize: '0.78rem' }}
          >
            <Github size={14} /> GitHub
          </button>
        </div>}

        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {noticeMsg && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(16, 185, 129, 0.14)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 'var(--radius-md)',
            color: '#6ee7b7',
            fontSize: '0.82rem',
            marginBottom: '16px'
          }}>
            {noticeMsg}
          </div>
        )}

        {/* TAB 1: Direct GitHub Sync */}
        {activeTab === 'github' && (
          <form onSubmit={handleConnectGitHub}>
            <div className="input-group">
              <label className="input-label">Đăng nhập GitHub an toàn</label>
              <div style={{ position: 'relative' }}>
                <Github size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="GitHub sẽ xác minh tài khoản của bạn"
                  className="input-control"
                  style={{ paddingLeft: '38px' }}
                  value="GitHub OAuth"
                  disabled={loading}
                  readOnly
                />
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Lunar lấy email đã xác minh và tự đồng bộ repository mà bạn cấp quyền.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', gap: '8px', marginTop: '8px' }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Github size={16} />}
              Kết Nối & Nạp GitHub Repositories
            </button>
          </form>
        )}

        {/* TAB 2: Email & Password */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailAuth}>
            {authMode === 'register' && (
              <div className="input-group">
                <label className="input-label">Họ và Tên</label>
                <input
                  type="text"
                  placeholder="Nguyen Van A"
                  className="input-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            {authMode !== 'reset' && <div className="input-group">
              <label className="input-label">Email</label>
              <input
                type="email"
                placeholder="developer@lunar.dev"
                className="input-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>}

            {authMode !== 'forgot' && <div className="input-group">
              <label className="input-label">Mật khẩu</label>
              <input
                type="password"
                placeholder="••••••••••••"
                className="input-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={72}
              />
            </div>}

            {authMode === 'reset' && (
              <div className="input-group">
                <label className="input-label">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="input-control"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  maxLength={72}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', marginTop: '8px' }}
            >
              {loading
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : authMode === 'forgot' || authMode === 'reset'
                  ? <KeyRound size={16} />
                  : <Sparkles size={16} />}
              {authMode === 'login'
                ? 'Đăng Nhập Ngay'
                : authMode === 'register'
                  ? 'Khởi Tạo Tài Khoản'
                  : authMode === 'forgot'
                    ? 'Gửi liên kết đặt lại'
                    : 'Lưu mật khẩu mới'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {authMode === 'login' && (
                <>
                  <span>Chưa có tài khoản? <button type="button" onClick={() => { setAuthMode('register'); setNoticeMsg(''); }} style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: '600', cursor: 'pointer' }}>Đăng ký ngay</button></span>
                  <span style={{ display: 'block', marginTop: '8px' }}>
                    <button type="button" onClick={() => { setAuthMode('forgot'); setNoticeMsg(''); setErrorMsg(''); }} style={{ background: 'none', border: 'none', color: '#c084fc', fontWeight: '600', cursor: 'pointer' }}>Quên mật khẩu?</button>
                  </span>
                </>
              )}
              {authMode === 'register' && (
                <span>Đã có tài khoản? <button type="button" onClick={() => { setAuthMode('login'); setNoticeMsg(''); }} style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: '600', cursor: 'pointer' }}>Đăng nhập</button></span>
              )}
              {(authMode === 'forgot' || authMode === 'reset') && (
                <button type="button" onClick={() => { setAuthMode('login'); setNoticeMsg(''); setErrorMsg(''); }} style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: '600', cursor: 'pointer' }}>← Quay lại đăng nhập</button>
              )}
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
