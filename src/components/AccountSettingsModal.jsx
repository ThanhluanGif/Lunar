import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Github,
  History,
  KeyRound,
  Loader2,
  Settings,
  ShieldAlert,
  UserRound,
  X
} from 'lucide-react';
import { lunarApi } from '../services/lunarApi';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

const TABS = [
  { id: 'profile', label: 'Hồ sơ', icon: UserRound },
  { id: 'security', label: 'Bảo mật', icon: KeyRound },
  { id: 'history', label: 'Lịch sử scan', icon: History },
  { id: 'connections', label: 'Kết nối', icon: Github }
];

export default function AccountSettingsModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(currentUser?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [scanHistory, setScanHistory] = useState([]);
  const [githubStatus, setGithubStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useModalFocusTrap({ isOpen: isOpen && Boolean(currentUser), onClose });

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    setName(currentUser.name || '');
    setMessage('');
    setError('');
    setLoading(true);
    Promise.all([
      lunarApi.getScanHistory().catch(() => ({ scans: [] })),
      lunarApi.getGitHubStatus().catch(() => ({ connected: false, connection: null }))
    ]).then(([history, github]) => {
      setScanHistory(history.scans || []);
      setGithubStatus(github);
    }).finally(() => setLoading(false));
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const runAction = async (action) => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await action();
    } catch (actionError) {
      setError(actionError.message || 'Không thể cập nhật tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = (event) => {
    event.preventDefault();
    runAction(async () => {
      const response = await lunarApi.updateAccount(name);
      onUserUpdated(response.user);
      setMessage('Thông tin tài khoản đã được cập nhật.');
    });
  };

  const handlePasswordChange = (event) => {
    event.preventDefault();
    runAction(async () => {
      if (newPassword !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp.');
      const response = await lunarApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(response.message);
    });
  };

  const handleDisconnectGitHub = () => {
    runAction(async () => {
      const response = await lunarApi.disconnectGitHub();
      setGithubStatus({ connected: false, connection: null });
      setMessage(response.message);
    });
  };

  const handleResendVerification = () => {
    runAction(async () => {
      const response = await lunarApi.resendEmailVerification();
      setMessage(response.message);
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 110,
      background: 'rgba(5, 8, 14, 0.88)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <section
        ref={dialogRef}
        id="account-settings-modal"
        className="glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-settings-title"
        tabIndex={-1}
        style={{
          width: 'min(860px, 100%)',
          maxHeight: '86vh',
          overflow: 'auto',
          padding: '26px',
          position: 'relative'
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cài đặt tài khoản"
          style={{
            position: 'absolute',
            right: '20px',
            top: '20px',
            border: 0,
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
          <Settings size={24} color="#a78bfa" />
          <div>
            <h2 id="account-settings-title" style={{ fontSize: '1.35rem' }}>Account Settings</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{currentUser.email}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={`btn btn-sm ${activeTab === id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setActiveTab(id);
                setError('');
                setMessage('');
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: '10px 12px', color: '#fca5a5', background: 'rgba(239,68,68,.12)', borderRadius: '8px', marginBottom: '14px' }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ padding: '10px 12px', color: '#6ee7b7', background: 'rgba(16,185,129,.12)', borderRadius: '8px', marginBottom: '14px' }}>
            {message}
          </div>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSave}>
            <div className="input-group">
              <label className="input-label" htmlFor="account-name">Tên hiển thị</label>
              <input
                id="account-name"
                className="input-control"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={120}
                required
              />
            </div>
            <div className="glass-card" style={{ padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentUser.emailVerified
                  ? <CheckCircle2 size={18} color="#34d399" />
                  : <ShieldAlert size={18} color="#fbbf24" />}
                <strong>{currentUser.emailVerified ? 'Email đã xác minh' : 'Email chưa xác minh'}</strong>
              </div>
              {!currentUser.emailVerified && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleResendVerification} disabled={loading} style={{ marginTop: '12px' }}>
                  Gửi lại email xác minh
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : <UserRound size={16} />}
              Lưu hồ sơ
            </button>
          </form>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handlePasswordChange}>
            {[
              ['current-password', 'Mật khẩu hiện tại', currentPassword, setCurrentPassword],
              ['new-password', 'Mật khẩu mới', newPassword, setNewPassword],
              ['confirm-password', 'Xác nhận mật khẩu mới', confirmPassword, setConfirmPassword]
            ].map(([id, label, value, setter]) => (
              <div className="input-group" key={id}>
                <label className="input-label" htmlFor={id}>{label}</label>
                <input
                  id={id}
                  type="password"
                  className="input-control"
                  value={value}
                  onChange={(event) => setter(event.target.value)}
                  minLength={8}
                  maxLength={72}
                  autoComplete={id === 'current-password' ? 'current-password' : 'new-password'}
                  required
                />
              </div>
            ))}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <KeyRound size={16} /> Đổi mật khẩu
            </button>
          </form>
        )}

        {activeTab === 'history' && (
          <div>
            {loading && scanHistory.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Đang tải lịch sử scan…</p>
            ) : scanHistory.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Chưa có lần scan nào được lưu.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {scanHistory.map((scan) => (
                  <article className="glass-card" key={scan.id} style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <strong>{scan.projectName}</strong>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '4px' }}>
                        {new Date(scan.createdAt).toLocaleString('vi-VN')} · {scan.engine}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: Number(scan.score) >= 80 ? '#34d399' : '#f87171' }}>{scan.score}/100</strong>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        {scan.issuesCount} lỗi · {scan.criticalCount} critical
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="glass-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Github size={22} />
              <div style={{ flex: 1 }}>
                <strong>GitHub</strong>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {githubStatus?.connected
                    ? `Đã kết nối @${githubStatus.connection?.login}`
                    : 'Chưa kết nối tài khoản GitHub'}
                </div>
              </div>
              {githubStatus?.connected && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleDisconnectGitHub} disabled={loading}>
                  Ngắt kết nối
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
