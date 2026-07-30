import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Link2,
  Link2Off,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  X
} from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

const EMPTY_STATUS = {
  configured: false,
  oauthConfigured: false,
  connected: false,
  canSend: false,
  connection: null,
  mode: null
};

const OAUTH_MESSAGES = {
  success: { type: 'success', text: 'Đã kết nối Gmail cá nhân thành công.' },
  denied: { type: 'error', text: 'Bạn đã từ chối quyền gửi Gmail.' },
  invalid_state: { type: 'error', text: 'Phiên kết nối Gmail không hợp lệ. Hãy thử lại.' },
  login_required: { type: 'error', text: 'Hãy đăng nhập Lunar trước khi kết nối Gmail.' },
  already_linked: { type: 'error', text: 'Gmail này đã được liên kết với một tài khoản Lunar khác.' },
  email_unverified: { type: 'error', text: 'Google yêu cầu một địa chỉ email đã xác minh.' },
  missing_scope: { type: 'error', text: 'Bạn chưa cấp quyền gửi Gmail. Hãy kết nối lại và chấp nhận quyền gmail.send.' },
  missing_refresh_token: { type: 'error', text: 'Google không cấp refresh token. Hãy ngắt quyền Lunar trong Google rồi thử lại.' },
  unavailable: { type: 'error', text: 'Gmail OAuth chưa được cấu hình trên server.' },
  failed: { type: 'error', text: 'Kết nối Gmail thất bại. Hãy thử lại.' }
};

export default function GmailSettingsModal({
  isOpen,
  onClose,
  currentUser,
  activeProject,
  scanResult
}) {
  const [notifyInstantAlerts, setNotifyInstantAlerts] = useState(true);
  const [notifyWeeklyDigest, setNotifyWeeklyDigest] = useState(true);
  const [notifyProReceipt, setNotifyProReceipt] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [oauthFeedback, setOauthFeedback] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [gmailStatus, setGmailStatus] = useState(EMPTY_STATUS);
  const currentUserId = currentUser?.id;
  const currentUserEmail = currentUser?.email;

  useEffect(() => {
    let cancelled = false;
    if (!isOpen) return () => { cancelled = true; };

    setErrorMessage('');
    setEmailLogs([]);
    setGmailStatus(EMPTY_STATUS);

    const oauthResult = new URLSearchParams(window.location.search).get('gmail_auth');
    if (oauthResult) {
      const message = OAUTH_MESSAGES[oauthResult];
      if (message) setOauthFeedback(message);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('gmail_auth');
      window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    }

    if (!currentUserId) return () => { cancelled = true; };
    Promise.all([
      lunarApi.getGmailNotificationStatus(),
      lunarApi.getGmailNotificationHistory()
    ])
      .then(([status, history]) => {
        if (cancelled) return;
        setNotifyInstantAlerts(status.preferences?.instantCritical !== false);
        setNotifyWeeklyDigest(status.preferences?.weeklyDigest !== false);
        setNotifyProReceipt(status.preferences?.proReceipt !== false);
        setGmailStatus(status);
        setEmailLogs(history.emails || []);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error.message || 'Không thể tải cấu hình Gmail.');
      });
    return () => { cancelled = true; };
  }, [currentUserEmail, currentUserId, isOpen]);

  if (!isOpen) return null;

  const handleConnect = () => {
    window.location.assign('/api/v1/notifications/gmail/oauth/start');
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Ngắt kết nối Gmail và thu hồi quyền gửi email của Lunar?')) return;
    setDisconnecting(true);
    setErrorMessage('');
    try {
      await lunarApi.disconnectGmail();
      setGmailStatus((status) => ({
        ...status,
        connected: false,
        canSend: false,
        connection: null
      }));
      setToastMessage('Đã ngắt kết nối và thu hồi quyền Gmail.');
    } catch (error) {
      setErrorMessage(error.message || 'Không thể ngắt kết nối Gmail.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    try {
      await lunarApi.updateGmailNotificationPreferences({
        instantCritical: notifyInstantAlerts,
        weeklyDigest: notifyWeeklyDigest,
        proReceipt: notifyProReceipt
      });
      setToastMessage('Đã lưu cấu hình thông báo Gmail.');
    } catch (error) {
      setErrorMessage(error.message || 'Không thể lưu cấu hình Gmail.');
    }
  };

  const handleSendTestAuditReport = async () => {
    setSendingTest(true);
    setErrorMessage('');
    try {
      const result = await lunarApi.sendAuditReportEmail({
        projectTitle: activeProject?.title || 'Lunar AI SAST Scanner',
        scanSummary: scanResult || {
          stats: { maxCvss: 8.5, criticalCount: 2, highCount: 1, total: 3 }
        }
      });
      setToastMessage(result.mode === 'dry-run'
        ? `Đã kiểm thử luồng Gmail cho ${result.recipient}.`
        : `Đã gửi từ ${result.senderEmail} tới ${result.recipient}.`);
      const history = await lunarApi.getGmailNotificationHistory();
      setEmailLogs(history.emails || []);
    } catch (error) {
      setErrorMessage(error.message || 'Không thể gửi email báo cáo.');
    } finally {
      setSendingTest(false);
    }
  };

  const connection = gmailStatus.connection;
  const connectionNeedsRenewal = connection?.requiresReconnect;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 140,
      background: 'rgba(5, 8, 14, 0.88)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        position: 'relative',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
      }}>
        <button
          type="button"
          onClick={() => {
            setOauthFeedback(null);
            onClose();
          }}
          aria-label="Đóng cấu hình Gmail"
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ea4335 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(234, 67, 53, 0.4)'
          }}>
            <Mail size={24} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: '800' }}>
              Gmail Cá Nhân & Cảnh Báo An Ninh
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Mỗi người dùng tự cấp quyền gửi mail; Lunar không lưu mật khẩu Gmail.
            </p>
          </div>
        </div>

        <div role="tablist" style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '20px',
          gap: '8px'
        }}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'settings' ? '2px solid #ea4335' : '2px solid transparent',
              color: activeTab === 'settings' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Bell size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Kết nối & Thông báo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid #ea4335' : '2px solid transparent',
              color: activeTab === 'history' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Clock size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Lịch sử ({emailLogs.length})
          </button>
        </div>

        {toastMessage && (
          <div role="status" style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#34d399',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            {toastMessage}
          </div>
        )}

        {oauthFeedback && (
          <div
            role={oauthFeedback.type === 'error' ? 'alert' : 'status'}
            style={{
              background: oauthFeedback.type === 'error'
                ? 'rgba(244,63,94,.12)'
                : 'rgba(16,185,129,.15)',
              border: `1px solid ${oauthFeedback.type === 'error' ? 'rgba(244,63,94,.4)' : '#10b981'}`,
              color: oauthFeedback.type === 'error' ? '#fda4af' : '#34d399',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.86rem',
              marginBottom: '16px'
            }}
          >
            {oauthFeedback.text}
          </div>
        )}

        {errorMessage && (
          <div role="alert" style={{
            background: 'rgba(244,63,94,.12)',
            border: '1px solid rgba(244,63,94,.4)',
            color: '#fda4af',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.86rem',
            marginBottom: '16px'
          }}>
            {errorMessage}
          </div>
        )}

        {activeTab === 'settings' ? (
          <form onSubmit={handleSaveSettings}>
            <div style={{
              padding: '14px',
              borderRadius: '10px',
              marginBottom: '18px',
              background: gmailStatus.canSend ? 'rgba(16,185,129,.1)' : 'rgba(245,158,11,.1)',
              border: `1px solid ${gmailStatus.canSend ? 'rgba(16,185,129,.4)' : 'rgba(245,158,11,.35)'}`
            }}>
              {!gmailStatus.configured && (
                <p style={{ color: '#fcd34d', fontSize: '0.84rem' }}>
                  Quản trị viên chưa cấu hình Google OAuth Client cho Lunar.
                </p>
              )}

              {gmailStatus.configured && !gmailStatus.connected && (
                <>
                  <strong style={{ color: '#fcd34d' }}>Chưa kết nối Gmail cá nhân</strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '5px 0 12px' }}>
                    Lunar chỉ xin quyền gửi email (`gmail.send`), không xin quyền đọc hoặc xóa thư.
                  </p>
                  {gmailStatus.oauthConfigured && (
                    <button type="button" className="btn btn-primary" onClick={handleConnect}>
                      <Link2 size={16} /> Kết nối Gmail bằng Google OAuth
                    </button>
                  )}
                </>
              )}

              {gmailStatus.connected && (
                <>
                  <strong style={{ color: connectionNeedsRenewal ? '#fcd34d' : '#34d399' }}>
                    {connectionNeedsRenewal ? 'Cần kết nối lại Gmail' : 'Gmail đã kết nối'}
                  </strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '5px 0 12px' }}>
                    Gửi từ <strong style={{ color: '#f8fafc' }}>{connection?.email}</strong>
                    {' '}tới email tài khoản Lunar <strong style={{ color: '#f8fafc' }}>{currentUser?.email}</strong>.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {gmailStatus.oauthConfigured && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleConnect}>
                        <RefreshCw size={14} /> {connectionNeedsRenewal ? 'Kết nối lại' : 'Đổi Gmail'}
                      </button>
                    )}
                    {gmailStatus.mode !== 'dry-run' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        style={{ color: '#fda4af', borderColor: 'rgba(244,63,94,.45)' }}
                      >
                        {disconnecting
                          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Link2Off size={14} />}
                        {disconnecting ? 'Đang thu hồi…' : 'Ngắt kết nối'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.88rem',
                fontWeight: '600',
                marginBottom: '6px'
              }}>
                Email tài khoản Lunar nhận cảnh báo
              </label>
              <input
                type="email"
                value={currentUser?.email || ''}
                readOnly
                className="input-control"
                aria-label="Email tài khoản Lunar nhận cảnh báo"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
              <NotificationOption
                checked={notifyInstantAlerts}
                onChange={setNotifyInstantAlerts}
                icon={<ShieldAlert size={16} color="#f43f5e" />}
                title="Cảnh báo đỏ khẩn cấp"
                description="Gửi mail ngay khi scan đã xác thực phát hiện lỗ hổng Critical."
              />
              <NotificationOption
                checked={notifyWeeklyDigest}
                onChange={setNotifyWeeklyDigest}
                icon={<FileText size={16} color="#38bdf8" />}
                title="Báo cáo tổng hợp định kỳ"
                description="Lưu lựa chọn nhận báo cáo xu hướng CVSS và kết quả kiểm định."
              />
              <NotificationOption
                checked={notifyProReceipt}
                onChange={setNotifyProReceipt}
                icon={<Sparkles size={16} color="#a855f7" />}
                title="Hóa đơn dịch vụ Pro"
                description="Lưu lựa chọn nhận hóa đơn và xác nhận giao dịch."
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSendTestAuditReport}
                disabled={sendingTest || !gmailStatus.canSend}
                className="btn btn-secondary"
              >
                {sendingTest
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={16} />}
                {sendingTest ? 'Đang gửi…' : 'Gửi thử Audit PDF'}
              </button>
              <button type="submit" className="btn btn-primary">
                Lưu cấu hình
              </button>
            </div>
          </form>
        ) : (
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {emailLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <Mail size={40} style={{ opacity: 0.4, marginBottom: '10px' }} />
                <p>Chưa có email nào được gửi.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {emailLogs.map((log) => (
                  <div key={log.id} style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    borderLeft: '3px solid #ea4335'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#f8fafc' }}>{log.subject}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                      {log.senderEmail && <>Từ {log.senderEmail} · </>}
                      Tới {log.recipientEmail} ·{' '}
                      <strong style={{ color: log.deliveryStatus === 'FAILED' ? '#f87171' : '#10b981' }}>
                        {log.deliveryStatus}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationOption({ checked, onChange, icon, title, description }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      cursor: 'pointer',
      background: 'rgba(30, 41, 59, 0.4)',
      padding: '12px',
      borderRadius: '8px'
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{ marginTop: '3px', accentColor: '#ea4335' }}
      />
      <div>
        <div style={{
          fontWeight: '700',
          fontSize: '0.9rem',
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {icon} {title}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {description}
        </div>
      </div>
    </label>
  );
}
