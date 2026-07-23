import React from 'react';
import { ShieldCheck, Search, LogIn, LogOut, Sparkles, Wrench, Zap, Bot, Heart, Package } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenSubmit, searchQuery, setSearchQuery, currentUser, currentTier, onOpenAuth, onLogout, onOpenPricing, onOpenGitBot }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      
      {/* Top Rainbow Accent Line (npm style) */}
      <div style={{ height: '5px', background: 'var(--gradient-rainbow)', width: '100%' }} />

      {/* Top Sub-Bar (npm style) */}
      <div style={{
        background: '#090c12',
        borderBottom: '1px solid var(--border-color)',
        padding: '4px 24px',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Heart size={12} color="#fb7185" fill="#fb7185" />
          <span>Lunar AI • Build amazing things securely</span>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="#docs" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Documentation</a>
          <a href="#community" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Security Advisories</a>
          <a href="#pro" style={{ color: '#fb7185', textDecoration: 'none', fontWeight: '700' }}>Lunar Pro</a>
        </div>
      </div>

      {/* Main Header Container */}
      <div style={{
        background: 'rgba(15, 19, 26, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '12px 24px'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          
          {/* npm Style Square Red Logo */}
          <div 
            onClick={() => setActiveTab('explore')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '4px',
              background: 'var(--npm-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontFamily: 'var(--font-heading)',
              fontWeight: '900',
              fontSize: '1.4rem',
              boxShadow: '0 0 15px var(--npm-red-glow)',
              letterSpacing: '-0.05em'
            }}>
              lnr
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
                  lunar<span style={{ color: 'var(--npm-red)' }}>.dev</span>
                </span>
                <span className="badge badge-npm">{currentTier}</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                AI Code Security Registry & Auto-Fix
              </p>
            </div>
          </div>

          {/* npm Style Giant Search Bar */}
          <div style={{
            display: 'flex',
            flex: '1',
            maxWidth: '520px',
            minWidth: '220px',
            position: 'relative'
          }}>
            <div style={{
              position: 'relative',
              width: '100%',
              display: 'flex'
            }}>
              <Search size={18} color="var(--text-secondary)" style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2
              }} />
              <input
                type="text"
                placeholder="Search packages, GitHub repos, CVSS vulnerabilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-control"
                style={{
                  paddingLeft: '44px',
                  paddingRight: '100px',
                  width: '100%',
                  borderRadius: '4px 0 0 4px',
                  fontSize: '0.92rem',
                  borderColor: 'var(--border-color)',
                  background: 'rgba(9, 12, 18, 0.95)'
                }}
              />
              <button
                className="btn btn-primary"
                style={{
                  borderRadius: '0 4px 4px 0',
                  padding: '0 20px',
                  fontSize: '0.88rem'
                }}
              >
                Search
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setActiveTab('explore')}
              className={`btn ${activeTab === 'explore' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', fontSize: '0.88rem' }}
            >
              <Package size={16} />
              Packages & Repos
            </button>

            <button
              onClick={onOpenSubmit}
              className="btn btn-emerald"
              style={{ padding: '8px 14px', fontSize: '0.88rem' }}
            >
              <Wrench size={16} />
              Scan & Fix
            </button>

            <button
              onClick={onOpenPricing}
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.88rem', background: 'var(--gradient-rainbow)', border: 'none' }}
            >
              <Zap size={16} />
              {currentTier === 'FREE' ? 'Nâng Cấp Pro' : `Gói ${currentTier}`}
            </button>

            <button
              onClick={onOpenGitBot}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.88rem' }}
              title="GitHub Action Bot"
            >
              <Bot size={16} color="var(--accent-cyan)" />
            </button>

            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.06)', padding: '4px 10px 4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#ffffff' }}>
                  {currentUser.name.split(' ')[0]}
                </span>
                <button
                  onClick={onLogout}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              >
                <LogIn size={16} />
                Sign In
              </button>
            )}
          </nav>

        </div>
      </div>
    </header>
  );
}
