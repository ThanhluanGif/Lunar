import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Crown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Shield,
  User,
  X,
  Zap
} from 'lucide-react';
import { Button, IconButton, StatusBadge } from './ui';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    if (!accountMenuOpen && !mobileMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (accountMenuOpen && !accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountMenuOpen, mobileMenuOpen]);

  const navigate = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };
  const dashboardTab = currentUser?.role === 'ADMIN' ? 'admin' : 'dashboard';
  const dashboardLabel = currentUser?.role === 'ADMIN' ? 'Admin console' : 'Dashboard';
  const dashboardIcon = currentUser?.role === 'ADMIN' ? Crown : LayoutDashboard;
  const DashboardIcon = dashboardIcon;
  const initials = (currentUser?.name || currentUser?.email || 'U').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="public-navbar">
      <div className="public-navbar__inner">
        <button type="button" className="public-brand" onClick={() => navigate('explore')} aria-label="Lunar.dev home">
          <span className="public-brand__mark"><Moon size={17} aria-hidden="true" /></span>
          <span>lunar<span>.dev</span></span>
          <span className="public-brand__tag">Code security</span>
        </button>

        <nav className={`public-nav${mobileMenuOpen ? ' is-open' : ''}`} aria-label="Primary navigation">
          <button type="button" aria-current={activeTab === 'explore' ? 'page' : undefined} onClick={() => navigate('explore')}><Shield size={16} />Overview</button>
          {currentUser && <button type="button" aria-current={activeTab === dashboardTab ? 'page' : undefined} onClick={() => navigate(dashboardTab)}><DashboardIcon size={16} />{dashboardLabel}</button>}
          <div className="public-nav__mobile-actions">
            <Button variant="primary" icon={Plus} onClick={() => { setMobileMenuOpen(false); onOpenSubmit(); }}>New scan</Button>
            {!currentUser && <Button variant="outline" icon={User} onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }}>Sign in</Button>}
          </div>
        </nav>

        <div className="public-navbar__actions">
          <Button className="public-navbar__scan" variant="primary" size="sm" icon={Plus} onClick={onOpenSubmit}>New scan</Button>
          {currentTier === 'FREE' && currentUser && <Button className="public-navbar__upgrade" variant="outline" size="sm" icon={Zap} onClick={onOpenPricing}>Upgrade</Button>}
          {currentUser ? (
            <div className="account-menu" ref={accountMenuRef}>
              <button type="button" className="account-menu__trigger" onClick={() => setAccountMenuOpen((value) => !value)} aria-expanded={accountMenuOpen} aria-haspopup="menu">
                <span className="account-menu__avatar">{initials}</span>
                <span className="account-menu__name">{currentUser.name || currentUser.email}</span>
                <StatusBadge status={currentTier === 'FREE' ? 'medium' : 'low'} label={currentTier} showIcon={false} />
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {accountMenuOpen && (
                <div className="account-menu__popover" role="menu">
                  <div className="account-menu__identity"><strong>{currentUser.name || 'Lunar user'}</strong><span>{currentUser.email}</span></div>
                  <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); onOpenAccountSettings(); }}><Settings size={16} />Account settings</button>
                  <button type="button" role="menuitem" className="is-danger" onClick={() => { setAccountMenuOpen(false); onLogout(); }}><LogOut size={16} />Sign out</button>
                </div>
              )}
            </div>
          ) : <Button className="public-navbar__auth" variant="outline" size="sm" icon={User} onClick={onOpenAuth}>Sign in</Button>}
          <IconButton className="public-navbar__menu" label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'} icon={mobileMenuOpen ? X : Menu} onClick={() => setMobileMenuOpen((value) => !value)} />
        </div>
      </div>
    </header>
  );
}
