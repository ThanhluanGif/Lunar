import React, { useState } from 'react';
import { X, Github, Mail, Lock, User, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = {
      id: 'user-' + Date.now(),
      name: authMode === 'register' ? (fullName || 'Developer') : (email.split('@')[0] || 'Hoàng Nam'),
      email: email || 'dev@seccode.vn',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      role: 'MEMBER_PRO',
      karma: 350
    };

    onLoginSuccess(user);
    onClose();
  };

  const handleDemoLogin = () => {
    const demoUser = {
      id: 'user-demo',
      name: 'Nguyễn Văn Đạt (Dev)',
      email: 'dat.nguyen@seccode.vn',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      role: 'MEMBER_PRO',
      karma: 1250
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
            background: 'linear-gradient(135deg, #6366f1 0%, #f43f5e 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)'
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: '800' }}>
            {authMode === 'login' ? 'Đăng Nhập SecCode.vn' : 'Tạo Tài Khoản Thành Viên'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Mở khóa toàn bộ tính năng AI Code Review chi tiết & Vá Lỗi Tự Động
          </p>
        </div>

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
            <div className="input-group">
              <label className="input-label">Họ và Tên</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn A"
                  className="input-control"
                  style={{ paddingLeft: '40px' }}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}>
            <Sparkles size={16} />
            {authMode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản Trải Nghiệm'}
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
          <span>💡 Thử nhanh tài khoản Demo Member?</span>
          <button onClick={handleDemoLogin} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontWeight: '700', cursor: 'pointer' }}>
            Đăng nhập Demo
          </button>
        </div>

        {/* Toggle Auth Mode */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {authMode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontWeight: '700', cursor: 'pointer' }}
          >
            {authMode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </div>

      </div>
    </div>
  );
}
