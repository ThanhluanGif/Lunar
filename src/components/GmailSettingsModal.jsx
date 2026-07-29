import React, { useState } from 'react';
import { X, Mail, Bell, CheckCircle2, ShieldAlert, Sparkles, Send, Clock, FileText } from 'lucide-react';
import { getEmailLogHistory, sendSecurityAuditGmail } from '../services/gmailMailerService';

export default function GmailSettingsModal({ isOpen, onClose, currentUser, activeProject, scanResult }) {
  const [gmailAddress, setGmailAddress] = useState(currentUser?.email || 'developer@gmail.com');
  const [notifyInstantAlerts, setNotifyInstantAlerts] = useState(true);
  const [notifyWeeklyDigest, setNotifyWeeklyDigest] = useState(true);
  const [notifyProReceipt, setNotifyProReceipt] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'history'
  const [toastMessage, setToastMessage] = useState('');

  if (!isOpen) return null;

  const emailLogs = getEmailLogHistory();

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setToastMessage('✅ Đã lưu cấu hình thông báo Gmail thành công!');
    setTimeout(() => {
      setToastMessage('');
      onClose();
    }, 1200);
  };

  const handleSendTestAuditReport = async () => {
    setSendingTest(true);
    await new Promise(r => setTimeout(r, 800));
    
    await sendSecurityAuditGmail(
      gmailAddress,
      activeProject?.title || 'Lunar AI SAST Scanner',
      scanResult || { stats: { maxCvss: 8.5, criticalCount: 2, highCount: 1 } }
    );
    
    setSendingTest(false);
    setToastMessage(`📧 Đã gửi mẫu Báo cáo An ninh tới ${gmailAddress}!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

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
        maxWidth: '560px',
        width: '100%',
        padding: '28px',
        position: 'relative',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Close button */}
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

        {/* Header */}
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
              Cấu Hình Gmail & Thông Báo An Ninh
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Quản lý kênh thông báo Gmail, nhận hóa đơn gói Pro và báo cáo an ninh định kỳ
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'settings' ? '2px solid #ea4335' : '2px solid transparent',
              color: activeTab === 'settings' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Bell size={16} /> Cấu Hình Thông Báo
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid #ea4335' : '2px solid transparent',
              color: activeTab === 'history' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Clock size={16} /> Lịch Sử Email Đã Gửi ({emailLogs.length})
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#34d399',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} /> {toastMessage}
          </div>
        )}

        {activeTab === 'settings' ? (
          <form onSubmit={handleSaveSettings}>
            {/* Input Gmail */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Địa chỉ Gmail nhận thông báo chính:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={gmailAddress}
                  onChange={(e) => setGmailAddress(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.92rem'
                  }}
                />
                <Mail size={18} color="#ea4335" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Checkbox Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', background: 'rgba(30, 41, 59, 0.4)', padding: '12px', borderRadius: '8px' }}>
                <input
                  type="checkbox"
                  checked={notifyInstantAlerts}
                  onChange={(e) => setNotifyInstantAlerts(e.target.checked)}
                  style={{ marginTop: '3px', accentColor: '#ea4335' }}
                />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={16} color="#f43f5e" /> Cảnh báo đỏ khẩn cấp (Critical Security Alerts)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Gửi mail tức thì tới Gmail khi quét thấy lỗ hổng CWE-89 (SQLi) hoặc CWE-798 (Lộ API Key).
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', background: 'rgba(30, 41, 59, 0.4)', padding: '12px', borderRadius: '8px' }}>
                <input
                  type="checkbox"
                  checked={notifyWeeklyDigest}
                  onChange={(e) => setNotifyWeeklyDigest(e.target.checked)}
                  style={{ marginTop: '3px', accentColor: '#ea4335' }}
                />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} color="#38bdf8" /> Báo cáo tổng hợp an ninh định kỳ (Audit Digest)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Nhận tổng hợp kết quả kiểm định mã nguồn & xu hướng CVSS score.
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', background: 'rgba(30, 41, 59, 0.4)', padding: '12px', borderRadius: '8px' }}>
                <input
                  type="checkbox"
                  checked={notifyProReceipt}
                  onChange={(e) => setNotifyProReceipt(e.target.checked)}
                  style={{ marginTop: '3px', accentColor: '#ea4335' }}
                />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="#a855f7" /> Hóa đơn dịch vụ & Xác nhận giao dịch Pro
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Tự động gửi hóa đơn chứng từ điện tử về Gmail khi nâng cấp gói dịch vụ.
                  </div>
                </div>
              </label>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleSendTestAuditReport}
                disabled={sendingTest}
                className="btn btn-secondary"
                style={{ fontSize: '0.88rem', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Send size={16} /> {sendingTest ? 'Đang gửi...' : 'Gửi Thử Email Báo Cáo'}
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #ea4335 0%, #c084fc 100%)', fontSize: '0.88rem', padding: '10px 20px' }}
              >
                Lưu Cấu Hình Gmail
              </button>
            </div>
          </form>
        ) : (
          /* History tab */
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {emailLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <Mail size={40} style={{ opacity: 0.4, marginBottom: '10px' }} />
                <p>Chưa có email nào được gửi trong phiên làm việc hiện tại.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {emailLogs.map((log) => (
                  <div key={log.id} style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '12px 14px', borderRadius: '8px', borderLeft: '3px solid #ea4335' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#f8fafc' }}>{log.subject}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gửi tới: <strong style={{ color: '#38bdf8' }}>{log.to}</strong></span>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>DELIVERED ✅</span>
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
