import React from 'react';
import { Moon, ShieldCheck, Github, Sparkles, LogOut, Terminal, Cpu, Plus, Layers } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenSubmit, currentUser, onOpenAuth, onLogout, onOpenPricing, onOpenGitBot }) {
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
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
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
                Lunar<span style={{ color: '#60a5fa' }}>.dev</span>
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                HỆ THỐNG GIÁM SÁT MÃ NGUỒN QUỐC GIA
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

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <img
                  src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={currentUser.name}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#fff' }}>{currentUser.name}</span>
                <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>PRO</span>
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
              style={{ gap: '6px' }}
            >
              <Github size={14} /> Đăng Nhập GitHub / Supabase
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
