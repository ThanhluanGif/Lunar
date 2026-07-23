import React from 'react';
import { Moon, ShieldCheck, Github, Sparkles, LogOut, Terminal, Cpu } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenSubmit, currentUser, onOpenAuth, onLogout, onOpenPricing, onOpenGitBot }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(9, 13, 22, 0.92)',
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
        
        {/* Left: Lunar Brand Logo */}
        <div 
          onClick={() => setActiveTab('explore')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.4) 0%, rgba(56, 189, 248, 0.3) 100%)',
            border: '1px solid rgba(167, 139, 250, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)'
          }}>
            <Moon size={20} color="#c084fc" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.4rem',
                fontWeight: '800',
                color: '#ffffff',
                letterSpacing: '-0.02em'
              }}>
                Lunar<span style={{ color: 'var(--accent-cyan)' }}>.dev</span>
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                AI SAST Platform
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
              AI Code Review & Security Engine
            </p>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <button
            onClick={() => setActiveTab('explore')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'explore' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'explore' ? '700' : '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Terminal size={15} color={activeTab === 'explore' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
            Overview & Scans
          </button>

          <button
            onClick={() => setActiveTab('detail')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'detail' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'detail' ? '700' : '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={15} color={activeTab === 'detail' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
            Findings & AI Triage
          </button>

          <button
            onClick={() => setActiveTab('community')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'community' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'community' ? '700' : '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Cpu size={15} color={activeTab === 'community' ? 'var(--accent-purple)' : 'var(--text-muted)'} />
            Cyber Community
          </button>

          <button
            onClick={onOpenPricing}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Pricing & Pro
          </button>
        </nav>

        {/* Right: Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onOpenSubmit}
            className="btn btn-emerald btn-sm"
          >
            <Sparkles size={15} />
            Scan & Review Code
          </button>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.06)', padding: '4px 12px 4px 6px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                <img
                  src={currentUser.avatar_url || currentUser.avatar}
                  alt={currentUser.name}
                  style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#ffffff' }}>
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
              className="btn btn-primary btn-sm"
            >
              <Github size={15} />
              Connect GitHub
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
