import React from 'react';
import { Moon, ShieldCheck, Users, PlusCircle, Search, LogIn, LogOut, User, Sparkles, Wrench } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenSubmit, searchQuery, setSearchQuery, currentUser, onOpenAuth, onLogout }) {
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
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>AI Security</span>
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
          maxWidth: '300px',
          minWidth: '180px'
        }}>
          <Search size={16} color="var(--text-secondary)" style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)'
          }} />
          <input
            type="text"
            placeholder="Tìm kiếm repo, CVSS, lỗ hổng..."
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
        <nav style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('explore')}
            className={`btn ${activeTab === 'explore' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.88rem' }}
          >
            <ShieldCheck size={16} />
            Dự Án Security
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className={`btn ${activeTab === 'community' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.88rem' }}
          >
            <Users size={16} color="#a855f7" />
            Cộng Đồng
          </button>

          <button
            onClick={onOpenSubmit}
            className="btn btn-emerald"
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            <Wrench size={16} />
            Quét & Vá Code
          </button>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.06)', padding: '4px 10px 4px 6px', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#ffffff', display: 'block' }}>
                  {currentUser.name}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)' }}>
                  Lunar PRO • {currentUser.karma} pts
                </span>
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
            <button
              onClick={onOpenAuth}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.88rem' }}
            >
              <LogIn size={16} />
              Đăng Nhập / Đăng Ký
            </button>
          )}
        </nav>

      </div>
    </header>
  );
}
