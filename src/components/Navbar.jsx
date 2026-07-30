import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, LogOut, Plus, Layers, Zap, Crown, User, Settings, ChevronDown } from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenSubmit, 
  currentUser, 
  currentTier = 'FREE', 
  onOpenAuth, 
  onLogout, 
  onOpenPricing, 
  onOpenAccountSettings
}) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [accountMenuOpen]);

  const getTierBadge = () => {
    if (currentTier === 'ENTERPRISE') return <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', background: 'rgba(34, 211, 238, 0.15)', color: '#22d3ee', border: '1px solid rgba(34, 211, 238, 0.3)' }}>ENTERPRISE</span>;
    if (currentTier === 'PRO') return <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', background: 'rgba(157, 110, 245, 0.15)', color: '#c084fc', border: '1px solid rgba(157, 110, 245, 0.3)' }}>PRO</span>;
    return <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}>FREE</span>;
  };

  return (
    <header className="app-navbar" style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(7, 8, 15, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      padding: '12px 24px'
    }}>
      <div className="app-navbar-inner" style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        
        {/* Left: Crescent Moon Brand Logo matching Figma site */}
        <button
          type="button"
          className="app-navbar-brand"
          aria-label="Về trang landing"
          onClick={() => setActiveTab('explore')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', border: 0, padding: 0, background: 'transparent' }}
        >
          <div style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6c8eef, #9d6ef5)'
            }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              transform: 'translateX(6px)',
              background: '#07080f'
            }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: '800',
              color: '#e2e5f0',
              letterSpacing: '-0.02em'
            }}>
              lunar<span style={{ color: '#6c8eef' }}>.dev</span>
            </span>
            <span className="app-navbar-product-badge" style={{
              fontSize: '0.68rem',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(34, 197, 94, 0.12)',
              color: '#86efac',
              border: '1px solid rgba(34, 197, 94, 0.25)'
            }}>
              PRO ACTIVE
            </span>
          </div>
        </button>

        {/* Center navigation links */}
        <nav className="app-navbar-navigation" aria-label="Điều hướng chính" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '4px',
          borderRadius: '12px'
        }}>
          <button
            onClick={() => setActiveTab('explore')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: '600',
              background: activeTab === 'explore' ? 'rgba(108, 142, 239, 0.2)' : 'transparent',
              color: activeTab === 'explore' ? '#6c8eef' : '#7880a0',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={14} /> Landing
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: '600',
              background: activeTab === 'dashboard' ? 'rgba(124, 58, 237, 0.25)' : 'transparent',
              color: activeTab === 'dashboard' ? '#c084fc' : '#7880a0',
              border: activeTab === 'dashboard' ? '1px solid rgba(124, 58, 237, 0.4)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={14} color="#a78bfa" /> Dashboard
          </button>

          {currentUser?.role === 'ADMIN' && <button
            onClick={() => setActiveTab('admin')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: '600',
              background: activeTab === 'admin' ? 'rgba(157, 110, 245, 0.2)' : 'transparent',
              color: activeTab === 'admin' ? '#c084fc' : '#7880a0',
              border: activeTab === 'admin' ? '1px solid rgba(157, 110, 245, 0.3)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Crown size={14} color="#f59e0b" /> Admin 👑
          </button>}
        </nav>

        {/* Right Action Toolbar */}
        <div className="app-navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Button Quét Code */}
          <button
            className="app-navbar-scan-action"
            onClick={onOpenSubmit}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: '600',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#86efac',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} /> Quét Code
          </button>

          {/* Button Up Pro nếu đang ở gói FREE */}
          {currentTier === 'FREE' && (
            <button
              className="app-navbar-upgrade-action"
              onClick={onOpenPricing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #6c8eef 0%, #9d6ef5 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(108, 142, 239, 0.35)'
              }}
            >
              <Zap size={14} /> Up Pro ⚡
            </button>
          )}

          {/* User Account Info Bar */}
          {currentUser ? (
            <div ref={accountMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '4px 10px',
                borderRadius: '8px',
                color: 'inherit',
                cursor: 'pointer'
              }}>
                {currentUser.avatarUrl || currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatarUrl || currentUser.avatar_url}
                    alt=""
                    style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(135deg, #6c8eef, #9d6ef5)',
                    fontSize: '0.72rem',
                    fontWeight: 800
                  }}>
                    {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#e2e5f0' }}>{currentUser.name}</span>
                {getTierBadge()}
                <ChevronDown size={13} color="#7880a0" />
              </button>

              {accountMenuOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: '230px',
                    padding: '8px',
                    borderRadius: '12px',
                    background: '#11131d',
                    border: '1px solid rgba(255,255,255,.1)',
                    boxShadow: '0 18px 45px rgba(0,0,0,.45)'
                  }}
                >
                  <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid rgba(255,255,255,.07)', marginBottom: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '0.82rem' }}>{currentUser.name}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{currentUser.email}</span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onOpenAccountSettings();
                    }}
                    style={menuButtonStyle}
                  >
                    <Settings size={15} /> Account Settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onLogout();
                    }}
                    style={{ ...menuButtonStyle, color: '#fca5a5' }}
                  >
                    <LogOut size={15} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="app-navbar-auth-action"
              onClick={onOpenAuth}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #24292f 0%, #6c8eef 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <User size={14} /> Đăng nhập
            </button>
          )}

        </div>

      </div>
    </header>
  );
}

const menuButtonStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  padding: '9px 10px',
  border: 0,
  borderRadius: '8px',
  background: 'transparent',
  color: '#cbd5e1',
  cursor: 'pointer',
  fontSize: '0.8rem',
  textAlign: 'left'
};
