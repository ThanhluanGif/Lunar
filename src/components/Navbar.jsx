import React from 'react';
import { Moon, ShieldCheck, Users, Search, LogIn, LogOut, Sparkles, Wrench, Zap, Bot, Heart, Package, Terminal } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenSubmit, searchQuery, setSearchQuery, currentUser, currentTier, onOpenAuth, onLogout, onOpenPricing, onOpenGitBot }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      
      {/* Top Graphic Gradient Rainbow Bar */}
      <div style={{ height: '4px', background: 'var(--gradient-rainbow)', width: '100%' }} />

      {/* Top Status Bar */}
      <div style={{
        background: 'rgba(6, 8, 15, 0.95)',
        borderBottom: '1px solid var(--border-color)',
        padding: '5px 24px',
        fontSize: '0.76rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={13} color="#a5b4fc" />
          <span>Lunar Security v2.0 • AI Code Audit & Automated Git Bot</span>
        </div>

        <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
          <a href="#docs" onClick={(e) => { e.preventDefault(); setActiveTab('explore'); }} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>SAST Rules</a>
          <a href="#community" onClick={(e) => { e.preventDefault(); setActiveTab('community'); }} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>White-Hat Forum</a>
          <a href="#pro" onClick={(e) => { e.preventDefault(); onOpenPricing(); }} style={{ color: '#a855f7', textDecoration: 'none', fontWeight: '700' }}>Lunar Pro & Bot</a>
        </div>
      </div>

      {/* Main Navbar */}
      <div style={{
        background: 'rgba(11, 14, 23, 0.92)',
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
          
          {/* Lunar Brand Logo */}
          <div 
            onClick={() => setActiveTab('explore')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--gradient-lunar)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)'
            }}>
              <Moon size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #ffffff 40%, #c084fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em'
                }}>
                  Lunar<span style={{ color: 'var(--accent-cyan)', WebkitTextFillColor: 'initial' }}>.dev</span>
                </span>
                <span className={`badge ${currentTier === 'FREE' ? 'badge-purple' : 'badge-lunar'}`} style={{ fontSize: '0.65rem' }}>
                  {currentTier} PLAN
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                AI Code Audit & Security Engine
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{
            display: 'flex',
            flex: '1',
            maxWidth: '480px',
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
                  borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                  fontSize: '0.9rem',
                  borderColor: 'var(--border-color)',
                  background: 'rgba(6, 8, 15, 0.9)'
                }}
              />
              <button
                className="btn btn-primary"
                style={{
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
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
              Repos & Audit
            </button>

            <button
              onClick={() => setActiveTab('community')}
              className={`btn ${activeTab === 'community' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', fontSize: '0.88rem' }}
            >
              <Users size={16} color="#a855f7" />
              Community
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
              style={{ padding: '8px 14px', fontSize: '0.88rem', background: 'var(--gradient-lunar)', border: 'none' }}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.06)', padding: '4px 10px 4px 6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
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
