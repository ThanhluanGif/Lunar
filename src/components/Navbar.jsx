import React from 'react';
import { Moon, ShieldCheck, Github, Sparkles, LogOut, Terminal, Cpu, Plus, Layers, Mail, Zap } from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenSubmit, 
  currentUser, 
  currentTier = 'FREE', 
  onOpenAuth, 
  onLogout, 
  onOpenPricing, 
  onOpenGmailSettings 
}) {
  const getTierBadge = () => {
    if (currentTier === 'ENTERPRISE') return <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>BOT ENTERPRISE</span>;
    if (currentTier === 'PRO') return <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>PRO</span>;
    return <span className="badge badge-yellow" style={{ fontSize: '0.65rem' }}>FREE</span>;
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: '#0f172a',
      borderBottom: '1px solid var(--border-color)',
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        
        {/* Left: Lunar Brand Logo */}
        <div 
          onClick={() => setActiveTab('explore')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #2563eb 0%, #ea4335 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(234, 67, 53, 0.4)'
          }}>
            <Moon size={20} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.35rem',
                fontWeight: '800',
                color: '#ffffff',
                letterSpacing: '-0.02em'
              }}>
                Lunar<span style={{ color: '#ea4335' }}>.dev</span>
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                GMAIL & PRO SUBSCRIPTION ACTIVE
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>
              AI Code Review, SAST Security Audit & 1-Click Auto-Fix Workbench
            </p>
          </div>
        </div>

        {/* Center: Clean Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px', background: '#1e293b', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          <button
            onClick={() => setActiveTab('explore')}
            className={`btn btn-sm ${activeTab === 'explore' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem' }}
          >
            <Layers size={14} /> Tổng Quan Dự Án
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className={`btn btn-sm ${activeTab === 'community' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem' }}
          >
            <ShieldCheck size={14} /> Cộng Đồng Security
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`btn btn-sm ${activeTab === 'admin' ? 'btn-purple' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', color: activeTab === 'admin' ? '#ffffff' : '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}
          >
            <Zap size={14} color="#f59e0b" /> Dashboard Admin 👑
          </button>
        </nav>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onOpenSubmit}
            className="btn btn-emerald btn-sm"
            style={{ gap: '6px' }}
          >
            <Plus size={14} /> Tải Repo / Quét Code Local
          </button>

          {/* Button mở Cấu hình Thông báo Gmail */}
          <button
            onClick={onOpenGmailSettings}
            className="btn btn-secondary btn-sm"
            title="Cấu hình thông báo & Báo cáo qua Gmail"
            style={{ gap: '6px', border: '1px solid rgba(234, 67, 53, 0.4)', color: '#fca5a5' }}
          >
            <Mail size={14} color="#ea4335" /> Gmail Alert
          </button>

          {/* Button Up Pro nếu đang dùng gói Free */}
          {currentTier === 'FREE' && (
            <button
              onClick={onOpenPricing}
              className="btn btn-primary btn-sm"
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                border: 'none',
                gap: '6px',
                fontWeight: '700'
              }}
            >
              <Zap size={14} color="#fff" /> Up Pro ⚡
            </button>
          )}

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <img
                  src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={currentUser.name}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#fff' }}>{currentUser.name}</span>
                {getTierBadge()}
              </div>

              <button
                onClick={onLogout}
                className="btn btn-secondary btn-sm"
                title="Đăng xuất"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px', background: 'linear-gradient(135deg, #ea4335 0%, #2563eb 100%)' }}
            >
              <Mail size={14} /> Đăng Nhập Gmail / Google
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
