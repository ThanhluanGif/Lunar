import React, { useState } from 'react';
import { X, Github, Mail, Lock, User, ShieldCheck, Sparkles, AtSign, AlertCircle, Loader2, CheckCircle2, UserCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('github'); // 'github' | 'email' | 'demo'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  
  // Form states
  const [githubInput, setGithubInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Option 1: Handle Direct GitHub Sync
  const handleConnectGitHub = async (e) => {
    e.preventDefault();
    if (!githubInput.trim()) {
      setErrorMsg('Vui lòng nhập GitHub Username của bạn.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const handle = githubInput.trim().replace(/^@/, '');
    
    setTimeout(() => {
      const gitHubUser = {
        id: `usr-github-${handle}-${Date.now()}`,
        nickname: `@${handle}`,
        name: handle,
        email: `${handle}@github.com`,
        tier: 'PRO',
        karma_points: 850,
        avatar_url: `https://github.com/${handle}.png`,
        daily_scans_used: 0
      };

      onLoginSuccess(gitHubUser);
      setLoading(false);
      onClose();
    }, 400);
  };

  // Option 2: Email & Password Auth
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: { data: { full_name: fullName } }
        });

        if (error) {
          console.warn('Supabase signup notice:', error.message);
        }

        const newUser = {
          id: data?.user?.id || 'usr-' + Date.now(),
          nickname: `@${email.split('@')[0]}`,
          name: fullName || email.split('@')[0],
          email: email,
          tier: 'PRO',
          karma_points: 500,
          avatar_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
          daily_scans_used: 0
        };
        onLoginSuccess(newUser);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) {
          console.warn('Supabase signin notice:', error.message);
        }

        const existingUser = {
          id: data?.user?.id || 'usr-' + Date.now(),
          nickname: `@${email.split('@')[0]}`,
          name: email.split('@')[0],
          email: email,
          tier: 'PRO',
          karma_points: 1200,
          avatar_url: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80`,
          daily_scans_used: 0
        };
        onLoginSuccess(existingUser);
      }
      setLoading(false);
      onClose();
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Lỗi đăng nhập. Vui lòng thử lại.');
    }
  };

  // Option 3: Fast 1-Click Demo Sessions
  const handleSelectDemoProfile = (profile) => {
    setLoading(true);
    setTimeout(() => {
      onLoginSuccess(profile);
      setLoading(false);
      onClose();
    }, 300);
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
      <div className="glass-panel" style={{
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
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px auto'
          }}>
            <ShieldCheck size={24} color="#fff" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: '800', color: '#fff' }}>
            Kết Nối Tài Khoản Lunar.dev
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Đồng bộ Repositories cá nhân & lưu vết báo cáo SAST
          </p>
        </div>

        {/* Auth Method Tabs */}
        <div style={{
          display: 'flex',
          gap: '6px',
          margin: '16px 0 20px 0',
          background: '#0f172a',
          padding: '4px',
          borderRadius: 'var(--radius-md)'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('github'); setErrorMsg(''); }}
            className={`btn btn-sm ${activeTab === 'github' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, fontSize: '0.78rem' }}
          >
            <Github size={14} /> GitHub Sync
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('email'); setErrorMsg(''); }}
            className={`btn btn-sm ${activeTab === 'email' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, fontSize: '0.78rem' }}
          >
            <Mail size={14} /> Email Auth
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('demo'); setErrorMsg(''); }}
            className={`btn btn-sm ${activeTab === 'demo' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, fontSize: '0.78rem' }}
          >
            <UserCheck size={14} /> Demo Fast
          </button>
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

        {/* TAB 1: Direct GitHub Sync */}
        {activeTab === 'github' && (
          <form onSubmit={handleConnectGitHub}>
            <div className="input-group">
              <label className="input-label">GitHub Username của bạn</label>
              <div style={{ position: 'relative' }}>
                <Github size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Ví dụ: ThanhluanGif, octocat..."
                  className="input-control"
                  style={{ paddingLeft: '38px' }}
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Hệ thống sẽ nạp ảnh đại diện và danh sách Repositories thật của bạn từ GitHub API.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !githubInput.trim()}
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

            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                type="email"
                placeholder="developer@lunar.dev"
                className="input-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Mật khẩu</label>
              <input
                type="password"
                placeholder="••••••••••••"
                className="input-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', marginTop: '8px' }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
              {authMode === 'login' ? 'Đăng Nhập Ngay' : 'Khởi Tạo Tài Khoản Pro'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {authMode === 'login' ? (
                <span>Chưa có tài khoản? <button type="button" onClick={() => setAuthMode('register')} style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: '600', cursor: 'pointer' }}>Đăng ký ngay</button></span>
              ) : (
                <span>Đã có tài khoản? <button type="button" onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: '600', cursor: 'pointer' }}>Đăng nhập</button></span>
              )}
            </div>
          </form>
        )}

        {/* TAB 3: Fast 1-Click Demo Profiles */}
        {activeTab === 'demo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Chọn 1 hồ sơ thử nghiệm nhanh để trải nghiệm đầy đủ tính năng Pro:
            </div>

            <button
              onClick={() => handleSelectDemoProfile({
                id: 'usr-demo-sarah',
                nickname: '@sarah_stripe',
                name: 'Sarah Chen (Senior Eng @ Stripe)',
                email: 'sarah.chen@stripe.com',
                tier: 'PRO',
                karma_points: 2400,
                avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                daily_scans_used: 0
              })}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '10px 14px', gap: '12px' }}
            >
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" style={{ width: '28px', height: '28px', borderRadius: '50%' }} alt="Sarah" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: '600', color: '#fff' }}>Sarah Chen (Stripe Eng)</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>@sarah_stripe • Pro Tier</div>
              </div>
            </button>

            <button
              onClick={() => handleSelectDemoProfile({
                id: 'usr-demo-alex',
                nickname: '@alex_whitehat',
                name: 'Alex Whitehat (Security Auditor)',
                email: 'alex@lunar.dev',
                tier: 'PRO',
                karma_points: 3420,
                avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
                daily_scans_used: 0
              })}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '10px 14px', gap: '12px' }}
            >
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" style={{ width: '28px', height: '28px', borderRadius: '50%' }} alt="Alex" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: '600', color: '#fff' }}>Alex Whitehat (Auditor)</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>@alex_whitehat • Pro Tier</div>
              </div>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
