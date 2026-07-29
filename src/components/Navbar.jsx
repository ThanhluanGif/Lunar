import React from 'react';
import { Moon, ShieldCheck, Github, Sparkles, LogOut, Terminal, Cpu, Plus, Layers, Mail, Zap, Crown, User } from 'lucide-react';

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
    if (currentTier === 'ENTERPRISE') return <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', background: 'rgba(34, 211, 238, 0.15)', color: '#22d3ee', border: '1px solid rgba(34, 211, 238, 0.3)' }}>ENTERPRISE</span>;
    if (currentTier === 'PRO') return <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', background: 'rgba(157, 110, 245, 0.15)', color: '#c084fc', border: '1px solid rgba(157, 110, 245, 0.3)' }}>PRO</span>;
    return <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}>FREE</span>;
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(7, 8, 15, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
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
        
        {/* Left: Crescent Moon Brand Logo matching Figma site */}
        <div 
          onClick={() => setActiveTab('explore')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
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
            <span style={{
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
        </div>

        {/* Center: Figma Style Navigation Links */}
        <nav style={{
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
            <Sparkles size={14} color="#a78bfa" /> Figma Dashboard ✦
          </button>

          <button
            onClick={() => setActiveTab('community')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: '600',
              background: activeTab === 'community' ? 'rgba(108, 142, 239, 0.2)' : 'transparent',
              color: activeTab === 'community' ? '#6c8eef' : '#7880a0',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={14} /> Cộng Đồng Security
          </button>

          <button
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
          </button>
        </nav>

        {/* Right Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Button Quét Code */}
          <button
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

          {/* Button Gmail Alert */}
          <button
            onClick={onOpenGmailSettings}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: '600',
              background: 'rgba(234, 67, 53, 0.15)',
              color: '#fca5a5',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              cursor: 'pointer'
            }}
            title="Cấu hình thông báo Gmail"
          >
            <Mail size={14} color="#ea4335" /> Gmail Alert
          </button>

          {/* Button Up Pro nếu đang ở gói FREE */}
          {currentTier === 'FREE' && (
            <button
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '4px 10px',
                borderRadius: '8px'
              }}>
                <img
                  src={currentUser.avatar_url || 'https://lh3.googleusercontent.com/a/default-user=s96-c'}
                  alt={currentUser.name}
                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#e2e5f0' }}>{currentUser.name}</span>
                {getTierBadge()}
              </div>

              <button
                onClick={onLogout}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#7880a0',
                  padding: '6px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Đăng xuất"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #ea4335 0%, #4285f4 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Mail size={14} /> Đăng Nhập Google
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
