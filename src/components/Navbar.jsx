import React from 'react';
import { Moon, Github, Sparkles, LogOut } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenSubmit, currentUser, onOpenAuth, onLogout, onOpenPricing, onOpenGitBot }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(7, 9, 14, 0.88)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '14px 32px'
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
            width: '32px',
            height: '32px',
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

        {/* Center: Navigation Links (Features, Pricing, Docs, Changelog) */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <button
            onClick={() => setActiveTab('explore')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'explore' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'explore' ? '600' : '400',
              fontSize: '0.92rem',
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
          >
            Features
          </button>

          <button
            onClick={onOpenPricing}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.92rem',
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
          >
            Pricing
          </button>

          <button
            onClick={() => setActiveTab('community')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'community' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'community' ? '600' : '400',
              fontSize: '0.92rem',
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
          >
            Community
          </button>

          <button
            onClick={onOpenGitBot}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.92rem',
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
          >
            CI/CD Bot
          </button>
        </nav>

        {/* Right: Dashboard Link & Connect GitHub Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onOpenSubmit}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.92rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Dashboard
          </button>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.06)', padding: '4px 12px 4px 6px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '0.84rem', fontWeight: '600', color: '#ffffff' }}>
                  {currentUser.name.split(' ')[0]}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Log out"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn btn-primary"
              style={{
                borderRadius: '999px',
                padding: '9px 18px',
                fontSize: '0.88rem'
              }}
            >
              <Github size={16} />
              Connect GitHub
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
