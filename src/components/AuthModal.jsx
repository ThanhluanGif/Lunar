import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Github,
  Mail,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2,
  KeyRound,
  Copy,
  ExternalLink
} from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, initialResetToken = '' }) {
  const [activeTab, setActiveTab] = useState('github');
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
  const [deviceAuth, setDeviceAuth] = useState(null);
  const devicePollTimerRef = useRef(null);
  const deviceFlowActiveRef = useRef(false);

  useEffect(() => {
    if (!initialResetToken) return;
    setResetToken(initialResetToken);
    setAuthMode('reset');
    setActiveTab('email');
    setErrorMsg('');
  }, [initialResetToken]);

  useEffect(() => {
    if (!isOpen) {
      deviceFlowActiveRef.current = false;
      window.clearTimeout(devicePollTimerRef.current);
      setDeviceAuth(null);
      setLoading(false);
    }
    return () => {
      deviceFlowActiveRef.current = false;
      window.clearTimeout(devicePollTimerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const stopDevicePolling = () => {
    deviceFlowActiveRef.current = false;
    window.clearTimeout(devicePollTimerRef.current);
  };

  const scheduleDevicePoll = (seconds) => {
    window.clearTimeout(devicePollTimerRef.current);
    devicePollTimerRef.current = window.setTimeout(async () => {
      if (!deviceFlowActiveRef.current) return;
      try {
        const response = await lunarApi.pollGitHubDeviceAuth();
        if (!deviceFlowActiveRef.current) return;
        if (response.success && response.user) {
          stopDevicePolling();
          setLoading(false);
          onLoginSuccess(
            response.user,
            `Đã kết nối @${response.github?.login || 'GitHub'} và đồng bộ ${response.repositoriesSynced || 0} repository.`
          );
          onClose();
          return;
        }
        scheduleDevicePoll(response.retryAfter || seconds || 5);
      } catch (error) {
        if (!deviceFlowActiveRef.current) return;
        stopDevicePolling();
        setLoading(false);
        setErrorMsg(error.message || 'Không thể hoàn tất đăng nhập GitHub.');
      }
    }, Math.max(5, Number(seconds) || 5) * 1000);
  };

  // Option 1: GitHub OAuth
  const handleConnectGitHub = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const config = await lunarApi.getGitHubConfig();
      if (!config.configured) {
        throw new Error('GitHub OAuth chưa được cấu hình. Hãy đặt các biến LUNAR_GITHUB_* trong file .env.');
      }
      if (config.authFlow === 'device') {
        const authorization = await lunarApi.startGitHubDeviceAuth();
        deviceFlowActiveRef.current = true;
        setDeviceAuth(authorization);
        setLoading(false);
        scheduleDevicePoll(authorization.interval);
        window.open(authorization.verificationUri, '_blank', 'noopener,noreferrer');
        return;
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
                : activeTab === 'github'
                  ? 'Đăng nhập bằng GitHub'
                  : 'Đăng Nhập Lunar.dev'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {activeTab === 'github' && authMode !== 'forgot' && authMode !== 'reset'
              ? 'Đăng nhập Lunar và đồng bộ repository chỉ trong một bước.'
              : 'Dùng email và mật khẩu để truy cập tài khoản Lunar.'}
          </p>
        </div>

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
            {deviceAuth ? (
              <div
                data-testid="github-device-authorization"
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  border: '1px solid rgba(96, 165, 250, 0.35)',
                  background: 'rgba(37, 99, 235, 0.1)',
                  textAlign: 'center',
                  marginBottom: '14px'
                }}
              >
                <strong style={{ display: 'block', color: '#f8fafc', fontSize: '0.9rem' }}>
                  Nhập mã này trên GitHub
                </strong>
                <button
                  type="button"
                  data-testid="github-device-code"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(deviceAuth.userCode);
                    setNoticeMsg('Đã sao chép mã GitHub.');
                  }}
                  title="Sao chép mã"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '13px 0',
                    padding: '10px 15px',
                    border: '1px dashed rgba(147, 197, 253, 0.65)',
                    borderRadius: '9px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#bfdbfe',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    cursor: 'pointer'
                  }}
                >
                  {deviceAuth.userCode} <Copy size={15} />
                </button>
                <a
                  href={deviceAuth.verificationUri}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '9px', gap: '7px' }}
                >
                  Mở GitHub để xác nhận <ExternalLink size={14} />
                </a>
                <p style={{ margin: '12px 0 0', color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.5 }}>
                  Lunar đang chờ GitHub xác nhận. Sau đó tài khoản và repository sẽ tự xuất hiện.
                </p>
              </div>
            ) : (
              <div style={{
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid rgba(96, 165, 250, 0.22)',
                background: 'rgba(37, 99, 235, 0.08)',
                textAlign: 'center',
                marginBottom: '14px'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 10px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.08)'
                }}>
                  <Github size={22} color="#e2e8f0" />
                </div>
                <strong style={{ display: 'block', color: '#f8fafc', fontSize: '0.9rem', marginBottom: '5px' }}>
                  Một lần xác thực GitHub
                </strong>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.76rem', lineHeight: 1.55 }}>
                  GitHub xác minh tài khoản; Lunar tạo phiên đăng nhập và đồng bộ repository bạn cấp quyền.
                </p>
              </div>
            )}

            <button
              type="submit"
              data-testid="github-oauth-continue"
              disabled={loading || Boolean(deviceAuth)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', gap: '8px', marginTop: '8px' }}
            >
              {loading || deviceAuth
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <Github size={16} />}
              {deviceAuth ? 'Đang chờ xác nhận trên GitHub…' : 'Tiếp Tục Với GitHub'}
            </button>
            <div style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center' }}>
              {deviceAuth
                ? 'Không đóng cửa sổ này trong lúc xác nhận.'
                : 'GitHub sẽ mở để bạn xác nhận quyền truy cập.'}
            </div>
            <button
              type="button"
              onClick={() => {
                stopDevicePolling();
                setDeviceAuth(null);
                setActiveTab('email');
                setErrorMsg('');
                setNoticeMsg('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                marginTop: '14px',
                padding: '7px',
                border: 0,
                background: 'transparent',
                color: '#94a3b8',
                fontSize: '0.74rem',
                cursor: 'pointer'
              }}
            >
              <Mail size={13} /> Đăng nhập bằng email
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
              {(authMode === 'login' || authMode === 'register') && (
                <span style={{ display: 'block', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('github'); setAuthMode('login'); setNoticeMsg(''); setErrorMsg(''); }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: '600', cursor: 'pointer' }}
                  >
                    ← Quay lại GitHub
                  </button>
                </span>
              )}
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
