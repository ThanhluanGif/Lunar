import React, { useState } from 'react';
import { X, Github, Mail, Lock, User, ShieldCheck, Sparkles, AtSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { registerUser, getUserByEmail } from '../services/sqlDataService';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedTier, setSelectedTier] = useState('FREE');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (authMode === 'register') {
        const newUser = registerUser({
          name: fullName || 'Developer',
          nickname: nickname || `@dev_${Date.now().toString().slice(-4)}`,
          email: email || `dev_${Date.now()}@lunar.io`,
          tier: selectedTier
        });
        onLoginSuccess(newUser);
      } else {
        let existingUser = getUserByEmail(email);
        if (!existingUser) {
          existingUser = {
            id: 'usr-' + Date.now(),
            nickname: `@${email.split('@')[0] || 'developer'}`,
            name: email.split('@')[0] || 'Developer',
            email: email || 'dev@lunar.io',
            tier: 'FREE',
            karma_points: 350,
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            daily_scans_used: 1,
            last_scan_reset_at: new Date().toISOString()
          };
        }
        onLoginSuccess(existingUser);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra');
    }
  };

  const handleDemoLogin = () => {
    const demoUser = {
      id: 'usr-demo-1',
      nickname: '@sarah_stripe',
      name: 'Sarah Chen (Stripe Eng)',
      email: 'sarah.chen@stripe.com',
      tier: 'PRO',
      karma_points: 2400,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      daily_scans_used: 0,
      last_scan_reset_at: new Date().toISOString()
    };
    onLoginSuccess(demoUser);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 120,
      background: 'rgba(5, 8, 14, 0.88)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '32px',
        position: 'relative',
        boxShadow: '0 0 50px rgba(99, 102, 241, 0.3)',
        border: '1px solid rgba(99, 102, 241, 0.4)'
      }}>
        {/* Close Button */}
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

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)'
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: '800' }}>
            {authMode === 'login' ? 'Đăng Nhập Lunar Code Review' : 'Đăng Ký Tài Khoản & Nhận Quota Free'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tạo Developer Profile @nickname & mở khóa lượt AI Security Scan hàng ngày
          </p>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(248, 113, 113, 0.15)',
            border: '1px solid rgba(248, 113, 113, 0.4)',
            color: '#f87171',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
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

        {/* GitHub 1-Click Login Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          className="btn btn-secondary"
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            fontSize: '0.92rem'
          }}
        >
          <Github size={18} />
          Đăng nhập 1-Click bằng GitHub
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '16px 0',
          color: 'var(--text-muted)',
          fontSize: '0.78rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span>HOẶC ĐĂNG NHẬP BẰNG EMAIL</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {authMode === 'register' && (
            <>
              <div className="input-group">
                <label className="input-label">Họ và Tên</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="VD: Hoàng Nam"
                    className="input-control"
                    style={{ paddingLeft: '40px' }}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Developer Nickname (Hiển thị Bảng xếp hạng & Karma)</label>
                <div style={{ position: 'relative' }}>
                  <AtSign size={16} color="var(--accent-cyan)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="alex_sec (Hệ thống tự động thêm @)"
                    className="input-control"
                    style={{ paddingLeft: '40px', color: 'var(--accent-cyan)', fontWeight: '600' }}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label className="input-label">Địa Chỉ Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="dev@company.com"
                className="input-control"
                style={{ paddingLeft: '40px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label className="input-label">Mật Khẩu</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                placeholder="••••••••"
                className="input-control"
                style={{ paddingLeft: '40px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {authMode === 'register' && (
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              background: 'rgba(124, 58, 237, 0.12)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              fontSize: '0.82rem'
            }}>
              <div style={{ fontWeight: '700', color: 'var(--accent-purple-light)', marginBottom: '4px' }}>
                🎁 Trải nghiệm Gói FREE (Được tặng 5 lượt Scan/ngày):
              </div>
              <ul style={{ paddingLeft: '18px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <li>Quét lỗ hổng bảo mật AST chuyên sâu</li>
                <li>Lưu trữ 3 dự án vào CSDL SQL</li>
                <li>Tự động gia hạn lượt Free khi gửi bài review cộng đồng</li>
              </ul>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}>
            <Sparkles size={16} />
            {authMode === 'login' ? 'Đăng Nhập Ngay' : 'Đăng Ký & Tạo Developer Profile'}
          </button>
        </form>

        {/* Demo Quick Login Helper */}
        <div style={{
          marginTop: '16px',
          padding: '10px 14px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>💡 Đăng nhập nhanh tài khoản Pro Demo?</span>
          <button onClick={handleDemoLogin} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontWeight: '700', cursor: 'pointer' }}>
            Đăng nhập Pro Demo
          </button>
        </div>

        {/* Toggle Auth Mode */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {authMode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login');
              setErrorMsg('');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontWeight: '700', cursor: 'pointer' }}
          >
            {authMode === 'login' ? 'Đăng ký nhận Quota Free' : 'Đăng nhập'}
          </button>
        </div>

      </div>
    </div>
  );
}
