import React from 'react';
import { Moon, Github, Sparkles, LogOut, Star, Zap, RefreshCw, Shield, Award } from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenSubmit, 
  currentUser, 
  onOpenAuth, 
  onLogout, 
  onOpenPricing, 
  onOpenGitBot,
  onRenewFreeQuota
}) {
  const userNickname = currentUser?.nickname || (currentUser?.name ? `@${currentUser.name.toLowerCase().replace(/\s+/g, '_')}` : '@dev');
  const userTier = currentUser?.tier || 'FREE';
  const dailyScansUsed = currentUser?.daily_scans_used ?? 0;
  const remainingFreeScans = Math.max(0, 5 - dailyScansUsed);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(7, 9, 14, 0.88)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '12px 32px'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        
        {/* Left: Moon Icon + lunar Logo */}
        <div 
          onClick={() => setActiveTab('explore')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.4) 0%, rgba(99, 102, 241, 0.2) 100%)',
            border: '1px solid rgba(167, 139, 250, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(124, 58, 237, 0.4)'
          }}>
            <Moon size={18} color="#c084fc" />
          </div>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.4rem',
            fontWeight: '700',
            color: '#ffffff',
            letterSpacing: '-0.02em'
          }}>
            lunar
          </span>
        </div>

        {/* Center: Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={() => setActiveTab('explore')}
            style={{
              background: activeTab === 'explore' ? 'rgba(255, 255, 255, 0.1)' : 'none',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              color: activeTab === 'explore' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'explore' ? '700' : '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🚀 Trang Chủ
          </button>

          <button
            onClick={() => setActiveTab('detail')}
            style={{
              background: activeTab === 'detail' ? 'rgba(34, 211, 238, 0.15)' : 'none',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              color: activeTab === 'detail' ? '#22d3ee' : 'var(--text-secondary)',
              fontWeight: activeTab === 'detail' ? '700' : '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🛡️ Security Dashboard & Workbench
          </button>

          <button
            onClick={() => setActiveTab('community')}
            style={{
              background: activeTab === 'community' ? 'rgba(167, 139, 250, 0.15)' : 'none',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              color: activeTab === 'community' ? '#c084fc' : 'var(--text-secondary)',
              fontWeight: activeTab === 'community' ? '700' : '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🏆 Cộng Đồng
          </button>

          <button
            onClick={onOpenPricing}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
          >
            Pricing & Quota
          </button>

          <button
            onClick={onOpenGitBot}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
          >
            CI/CD Bot
          </button>
        </nav>

        {/* Right: User Status & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              
              {/* Quota Badge for FREE Users */}
              {userTier === 'FREE' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    background: remainingFreeScans > 0 ? 'rgba(34, 211, 238, 0.12)' : 'rgba(248, 113, 113, 0.15)',
                    border: `1px solid ${remainingFreeScans > 0 ? 'rgba(34, 211, 238, 0.35)' : 'rgba(248, 113, 113, 0.35)'}`,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    color: remainingFreeScans > 0 ? '#22d3ee' : '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Zap size={13} />
                    <span>{remainingFreeScans}/5 Scan Free</span>
                  </div>

                  <button
                    onClick={onRenewFreeQuota}
                    className="btn btn-emerald btn-sm"
                    title="Gia hạn +3 lượt Free bằng cách đóng góp bài review cộng đồng"
                    style={{ padding: '3px 9px', fontSize: '0.74rem' }}
                  >
                    <RefreshCw size={12} />
                    Gia Hạn Free
                  </button>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(167, 139, 250, 0.15)',
                  border: '1px solid rgba(167, 139, 250, 0.35)',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: '#c084fc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Shield size={13} />
                  <span>PRO MEMBER (Unlimited)</span>
                </div>
              )}

              {/* Developer Nickname & Karma Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '4px 12px 4px 6px',
                borderRadius: '999px',
                border: '1px solid var(--border-color)'
              }}>
                <img
                  src={currentUser.avatar || currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={currentUser.name}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItem: 'flex-start', lineHeight: 1.2 }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                    {userNickname}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Star size={10} fill="currentColor" /> {currentUser.karma_points || currentUser.karma || 100} Karma
                  </span>
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Đăng xuất"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={onOpenAuth}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: '999px' }}
              >
                Đăng Nhập
              </button>
              <button
                onClick={onOpenAuth}
                className="btn btn-primary"
                style={{
                  borderRadius: '999px',
                  padding: '8px 16px',
                  fontSize: '0.86rem'
                }}
              >
                <Github size={15} />
                Đăng Ký Free
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
