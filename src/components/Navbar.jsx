import React from 'react';
import { Moon, ShieldCheck, Users, Search, LogIn, LogOut, Sparkles, Wrench, Zap, Bot } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenSubmit, searchQuery, setSearchQuery, currentUser, currentTier, onOpenAuth, onLogout, onOpenPricing, onOpenGitBot }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(5, 7, 13, 0.88)',
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
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 22px rgba(168, 85, 247, 0.5)'
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
              <span className={`badge ${currentTier === 'FREE' ? 'badge-purple' : 'badge-gold'}`} style={{ fontSize: '0.65rem' }}>
                {currentTier} PLAN
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              AI Code Audit, Auto-Patch Workbench & Cyber Community
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{
          position: 'relative',
          flex: '1',
          maxWidth: '280px',
          minWidth: '160px'
        }}>
          <Search size={16} color="var(--text-secondary)" style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)'
          }} />
          <input
            type="text"
            placeholder="Tìm repo, CVSS, lỗ hổng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-control"
            style={{
              paddingLeft: '40px',
              paddingTop: '8px',
              paddingBottom: '8px',
              width: '100%',
              fontSize: '0.88rem'
            }}
          />
        </div>

        {/* Navigation & Auth Controls */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('explore')}
            className={`btn ${activeTab === 'explore' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.88rem' }}
          >
            <ShieldCheck size={16} />
            Dự Án
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className={`btn ${activeTab === 'community' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.88rem' }}
          >
            <Users size={16} color="#a855f7" />
            Cộng Đồng
          </button>

          {/* Pricing Upgrade Button */}
          <button
            onClick={onOpenPricing}
            className="btn btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.88rem', background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
          >
            <Zap size={16} />
            {currentTier === 'FREE' ? 'Nâng Cấp Pro' : `Gói ${currentTier}`}
          </button>

          {/* Git Bot Action Modal Trigger */}
          <button
            onClick={onOpenGitBot}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.88rem' }}
            title="Cấu Hình GitHub Action Bot"
          >
            <Bot size={16} color="var(--accent-cyan)" />
          </button>

          {/* User Profile / Login */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.06)', padding: '4px 10px 4px 6px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#ffffff' }}>
                {currentUser.name.split(' ')[0]}
              </span>

              <button
                onClick={onLogout}
                title="Đăng xuất"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.88rem' }}
            >
              <LogIn size={16} />
              Đăng Nhập
            </button>
          )}
        </nav>

      </div>
    </header>
  );
}
