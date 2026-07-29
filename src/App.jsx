import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import FigmaLunarLanding from './components/FigmaLunarLanding';
import SecurityDashboard from './components/SecurityDashboard';
import VulnerabilityPatcher from './components/VulnerabilityPatcher';
import SecurityCommunity from './components/SecurityCommunity';
import CodeViewer from './components/CodeViewer';
import CodeRepairWorkbench from './components/CodeRepairWorkbench';
import PaywallGate from './components/PaywallGate';
import SubmitModal from './components/SubmitModal';
import AuthModal from './components/AuthModal';
import PricingModal from './components/PricingModal';
import GitBotConfigModal from './components/GitBotConfigModal';
import AuditReportExportModal from './components/AuditReportExportModal';
import QuotaDepletedModal from './components/QuotaDepletedModal';
import GmailSettingsModal from './components/GmailSettingsModal';
import AdminDashboard from './components/AdminDashboard';
import LunarDashboard from './components/LunarDashboard';
import { SECURITY_PROJECTS_MOCK } from './data/cveDatabase';
import { scanCodeForSecurityVulnerabilities } from './services/securityScannerEngine';
import { supabaseDb, supabase } from './services/supabaseClient';
import { lunarApi } from './services/lunarApi';
import { Moon, ShieldCheck, Wrench, Users, Zap, Bot, Package, ArrowRight, Star, GitFork, UserCheck, Terminal, Award, Sparkles, Activity, Lock, CheckCircle2, Github, RefreshCw } from 'lucide-react';

import UserGitHubWorkspace from './components/UserGitHubWorkspace';
import RealTimeStatsBanner from './components/RealTimeStatsBanner';

export default function App() {
  const [projects, setProjects] = useState(SECURITY_PROJECTS_MOCK);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'community' | 'detail'
  const [selectedProject, setSelectedProject] = useState(SECURITY_PROJECTS_MOCK[0]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTier, setCurrentTier] = useState('FREE');
  
  // Modals
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [selectedPricingPlan, setSelectedPricingPlan] = useState('PRO');
  const [isGitBotOpen, setIsGitBotOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [isGmailSettingsOpen, setIsGmailSettingsOpen] = useState(false);

  const handleOpenPricing = (planId = 'PRO') => {
    if (planId && typeof planId === 'string' && planId !== 'FREE') {
      setSelectedPricingPlan(planId);
    } else {
      setSelectedPricingPlan('PRO');
    }
    setIsPricingOpen(true);
  };

  // Initialize Supabase Audits & Restore Auth Session
  useEffect(() => {
    // Legacy Supabase identity is intentionally disabled; Lunar API roles are authoritative.
    return undefined;

    async function loadInitialData() {
      try {
        const audits = await supabaseDb.getCodeAudits();
        if (audits && audits.length > 0) {
          console.log('Loaded Supabase Audits:', audits.length);
        }

        // Restore Supabase Auth session if active
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userHandle = session.user.email?.split('@')[0] || 'developer';
          const sbUser = {
            id: session.user.id,
            nickname: `@${userHandle}`,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || userHandle,
            email: session.user.email,
            tier: 'FREE',
            karma_points: 1000,
            avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || `https://lh3.googleusercontent.com/a/default-user=s96-c`
          };
          setCurrentUser(sbUser);
          setCurrentTier(sbUser.tier || 'FREE');
          localStorage.setItem('lunar_auth_session', JSON.stringify(sbUser));
        }
      } catch (e) {
        console.warn('Initial session restore notice:', e);
      }
    }
    loadInitialData();

    // Listen to Google OAuth redirect auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('⚡ [Supabase Auth] Auth state change event:', event);
      if (session?.user) {
        const userHandle = session.user.email?.split('@')[0] || 'developer';
        const googleUser = {
          id: session.user.id,
          nickname: `@${userHandle}`,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || userHandle,
          email: session.user.email,
          tier: 'FREE',
          karma_points: 1000,
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || `https://lh3.googleusercontent.com/a/default-user=s96-c`
        };
        setCurrentUser(googleUser);
        setCurrentTier('FREE');
        localStorage.setItem('lunar_auth_session', JSON.stringify(googleUser));
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // The Lunar backend is authoritative for identity, tier and role.
  useEffect(() => {
    let mounted = true;
    lunarApi.getMe()
      .then(({ user }) => {
        if (!mounted) return;
        setCurrentUser(user);
        setCurrentTier(user.tier || 'FREE');
        localStorage.setItem('lunar_auth_session', JSON.stringify(user));
      })
      .catch(() => {
        if (!mounted) return;
        setCurrentUser(null);
        setCurrentTier('FREE');
        localStorage.removeItem('lunar_auth_session');
      });
    return () => { mounted = false; };
  }, []);

  // Active File & Scan Analysis
  const activeFile = selectedProject?.files?.[0] || { content: '', path: 'app.ts' };
  const scanResult = scanCodeForSecurityVulnerabilities(activeFile.content, activeFile.path);

  const handleAddProject = (newProj) => {
    setProjects([newProj, ...projects]);
    setSelectedProject(newProj);
    setActiveTab('detail');
  };

  const handleAddAudit = (newAudit) => {
    setProjects(projects.map(p => {
      if (p.id === selectedProject?.id) {
        return {
          ...p,
          communityAudits: [newAudit, ...(p.communityAudits || [])]
        };
      }
      return p;
    }));
  };

  const handleSelectProject = (proj) => {
    setSelectedProject(proj);
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentTier(user.tier || 'FREE');
    localStorage.setItem('lunar_auth_session', JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      await lunarApi.logout();
    } catch (error) {
      console.warn('Logout request failed:', error);
    }
    setCurrentUser(null);
    setCurrentTier('FREE');
    localStorage.removeItem('lunar_auth_session');
    try {
      supabase.auth.signOut();
    } catch (e) {}
    if (activeTab === 'admin') setActiveTab('explore');
  };

  const handleUpgradeSuccess = (newTier) => {
    setCurrentTier(newTier);
    const updated = currentUser ? { ...currentUser, tier: newTier } : {
      id: 'usr-pro-1',
      nickname: '@sarah_stripe',
      name: 'Sarah Chen (Stripe Eng)',
      email: 'sarah.chen@stripe.com',
      tier: newTier,
      karma_points: 2400,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      daily_scans_used: 0
    };
    setCurrentUser(updated);
    localStorage.setItem('lunar_auth_session', JSON.stringify(updated));
  };

  const handleRenewFreeQuota = () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const updated = {
      ...currentUser,
      daily_scans_used: Math.max(0, (currentUser.daily_scans_used || 0) - 3),
      karma_points: (currentUser.karma_points || 100) + 50
    };
    setCurrentUser(updated);
    localStorage.setItem('lunar_auth_session', JSON.stringify(updated));
    alert(`🎉 Bạn đã gia hạn thành công! Nhận thêm +3 lượt AI Scan trong ngày và +50 Karma.`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Hide site Navbar when in full Figma Dashboard view */}
      {activeTab !== 'dashboard' && (
        <>
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenSubmit={() => setIsSubmitOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentUser={currentUser}
            currentTier={currentTier}
            onOpenAuth={() => setIsAuthOpen(true)}
            onLogout={handleLogout}
            onOpenPricing={() => setIsPricingOpen(true)}
            onOpenGitBot={() => setIsGitBotOpen(true)}
            onRenewFreeQuota={handleRenewFreeQuota}
            onOpenGmailSettings={() => setIsGmailSettingsOpen(true)}
          />

          {!currentUser && (
            <div style={{
              background: 'rgba(124, 58, 237, 0.12)',
              borderBottom: '1px solid rgba(124, 58, 237, 0.3)',
              padding: '8px 24px',
              textAlign: 'center',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <span>🌙 Guest Preview Mode. Sign in or connect GitHub to unlock full 1-click Auto-fix PRs & AI Code Repair.</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsPricingOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '2px 10px', fontSize: '0.75rem' }}
                >
                  <Zap size={14} /> Upgrade Pro
                </button>
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="btn btn-emerald btn-sm"
                  style={{ padding: '2px 10px', fontSize: '0.75rem' }}
                >
                  <UserCheck size={14} /> Sign In
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: activeTab === 'dashboard' ? '0' : '0 24px 60px 24px' }}>
        
        {/* TAB 1: EXACT FIGMA LUNAR LANDING */}
        {activeTab === 'explore' && (
          <FigmaLunarLanding
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenSubmit={() => setIsSubmitOpen(true)}
            onOpenGitBot={() => setIsGitBotOpen(true)}
            onSelectDemoProject={handleSelectProject}
            onOpenPricing={handleOpenPricing}
          />
        )}

        {/* TAB 1.5: EXACT FIGMA DASHBOARD MOCKUP */}
        {activeTab === 'dashboard' && (
          <div style={{ margin: '-0px -24px -60px -24px' }}>
            <LunarDashboard
              onBackToSite={() => setActiveTab('explore')}
              onSelectProject={handleSelectProject}
              currentUser={currentUser}
              onOpenPricing={handleOpenPricing}
            />
          </div>
        )}

        {/* TAB 2: SECURITY COMMUNITY */}
        {activeTab === 'community' && (
          <div style={{ paddingTop: '28px' }}>
            <SecurityCommunity
              audits={selectedProject?.communityAudits || []}
              onAddAudit={handleAddAudit}
            />
          </div>
        )}

        {/* TAB 4: ADMIN MANAGEMENT DASHBOARD */}
        {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
          <AdminDashboard
            currentUser={currentUser}
            onUpgradeUserTier={handleUpgradeSuccess}
          />
        )}
        {activeTab === 'admin' && currentUser?.role !== 'ADMIN' && (
          <div className="glass-panel" style={{ maxWidth: '680px', margin: '48px auto', padding: '32px', textAlign: 'center' }}>
            <Lock size={36} color="#f87171" />
            <h2 style={{ marginTop: '14px' }}>Admin access required</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Backend chỉ cung cấp dữ liệu quản trị khi tài khoản có vai trò ADMIN.</p>
          </div>
        )}

        {/* TAB 3: PROJECT DETAIL & REPAIR WORKBENCH */}
        {activeTab === 'detail' && selectedProject && (
          <div style={{ maxWidth: '1240px', margin: '0 auto', paddingTop: '28px' }}>
            
            {/* Header Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <button onClick={() => setActiveTab('explore')} className="btn btn-secondary btn-sm">
                ← Back to Overview
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsGitBotOpen(true)} className="btn btn-secondary btn-sm">
                  <Bot size={16} color="var(--accent-cyan)" /> GitHub Action Bot
                </button>

                <button onClick={() => setIsReportOpen(true)} className="btn btn-primary btn-sm">
                  <ShieldCheck size={16} /> Audit Report & Badge
                </button>
              </div>
            </div>

            {/* Package Title Header */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Package size={28} color="var(--accent-purple-light)" />
                <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: '800' }}>
                  {selectedProject.title.toLowerCase().replace(/\s+/g, '-')}
                </h1>
                <span className="badge badge-purple">v1.2.0</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                {selectedProject.description}
              </p>
            </div>

            {/* Public Security Dashboard */}
            <SecurityDashboard
              scanResult={scanResult}
              projectTitle={selectedProject.title}
            />

            {/* Code Viewer with Line Annotations */}
            <CodeViewer
              files={selectedProject.files}
              isLoggedIn={currentTier !== 'FREE' || !!currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
            />

            {/* Paywall Gate for Auto-Fix Hub */}
            <PaywallGate
              isLoggedIn={currentTier !== 'FREE' || !!currentUser}
              onOpenAuth={() => setIsPricingOpen(true)}
              title="Unlock Lunar AI Code Repair Workbench & GitHub PR Bot"
            >
              <VulnerabilityPatcher
                vulnerabilities={scanResult.vulnerabilities}
              />

              <CodeRepairWorkbench
                activeFile={activeFile}
                activeVuln={scanResult.vulnerabilities[0]}
                repoUrl={selectedProject.githubUrl}
                onOpenPricing={() => setIsPricingOpen(true)}
              />
            </PaywallGate>

          </div>
        )}

      </main>

      {/* Modals */}
      <SubmitModal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        onAddProject={handleAddProject}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        currentTier={currentTier}
        currentUser={currentUser}
        onUpgradeSuccess={handleUpgradeSuccess}
        initialPlan={selectedPricingPlan}
      />

      <GitBotConfigModal
        isOpen={isGitBotOpen}
        onClose={() => setIsGitBotOpen(false)}
        repoUrl={selectedProject?.githubUrl}
      />

      <AuditReportExportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        project={selectedProject}
        scanResult={scanResult}
        currentUser={currentUser}
      />

      <GmailSettingsModal
        isOpen={isGmailSettingsOpen}
        onClose={() => setIsGmailSettingsOpen(false)}
        currentUser={currentUser}
        activeProject={selectedProject}
        scanResult={scanResult}
      />

      {isQuotaModalOpen && (
        <QuotaDepletedModal
          isOpen={isQuotaModalOpen}
          onClose={() => setIsQuotaModalOpen(false)}
          onRenewFreeQuota={handleRenewFreeQuota}
          onOpenPricing={() => setIsPricingOpen(true)}
          currentUser={currentUser}
        />
      )}

    </div>
  );
}
