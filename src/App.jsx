import React, { useState, useEffect, useMemo } from 'react';
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
import AccountSettingsModal from './components/AccountSettingsModal';
import LunarAiAssistant from './components/LunarAiAssistant';
import NotFoundPage from './components/NotFoundPage';
import AdminDashboard from './components/AdminDashboard';
import LunarDashboard from './components/LunarDashboard';
import { SECURITY_PROJECTS_MOCK } from './data/cveDatabase';
import { scanCodeForSecurityVulnerabilities } from './services/securityScannerEngine';
import { lunarApi } from './services/lunarApi';
import { Moon, ShieldCheck, Wrench, Users, Zap, Bot, Package, ArrowRight, Star, GitFork, UserCheck, Terminal, Award, Sparkles, Activity, Lock, CheckCircle2, Github, RefreshCw } from 'lucide-react';

import UserGitHubWorkspace from './components/UserGitHubWorkspace';
import GitHubRepoSelector from './components/GitHubRepoSelector';
import RealTimeStatsBanner from './components/RealTimeStatsBanner';

export default function App() {
  const [projects, setProjects] = useState(SECURITY_PROJECTS_MOCK);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'community' | 'detail'
  const [selectedProject, setSelectedProject] = useState(SECURITY_PROJECTS_MOCK[0]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTier, setCurrentTier] = useState('FREE');
  const [githubAuthToast, setGithubAuthToast] = useState(''); // '' | 'success' | 'failed'
  const [accountToast, setAccountToast] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  // Modals
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [selectedPricingPlan, setSelectedPricingPlan] = useState('PRO');
  const [isGitBotOpen, setIsGitBotOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [isGmailSettingsOpen, setIsGmailSettingsOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('gmail_auth')) {
      setIsGmailSettingsOpen(true);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const passwordResetToken = params.get('reset_token');
    const verificationToken = params.get('verify_email');
    if (passwordResetToken) {
      setResetToken(passwordResetToken);
      setIsAuthOpen(true);
      params.delete('reset_token');
    }
    if (verificationToken) {
      params.delete('verify_email');
      lunarApi.verifyEmail(verificationToken)
        .then((response) => {
          setAccountToast(response.message);
          return lunarApi.getMe().catch(() => null);
        })
        .then((session) => {
          if (session?.user) handleLoginSuccess(session.user);
        })
        .catch((error) => setAccountToast(error.message || 'Không thể xác minh email.'));
    }
    if (passwordResetToken || verificationToken) {
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    }
    if (verificationToken) {
      const timer = window.setTimeout(() => setAccountToast(''), 6000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleOpenPricing = (planId = 'PRO') => {
    if (planId && typeof planId === 'string' && planId !== 'FREE') {
      setSelectedPricingPlan(planId);
    } else {
      setSelectedPricingPlan('PRO');
    }
    setIsPricingOpen(true);
  };

  // TASK-01: Handle GitHub OAuth redirect result (?github_auth=success|failed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubAuth = params.get('github_auth');
    if (!githubAuth) return;

    // Clean URL without page reload
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    if (githubAuth === 'success') {
      setGithubAuthToast('success');
      // Re-fetch session — JWT cookie was set by the backend callback
      lunarApi.getMe()
        .then(({ user }) => {
          setCurrentUser(user);
          setCurrentTier(user.tier || 'FREE');
          localStorage.setItem('lunar_auth_session', JSON.stringify(user));
        })
        .catch(() => {
          setGithubAuthToast('failed');
        });
    } else {
      setGithubAuthToast('failed');
    }

    const timer = setTimeout(() => setGithubAuthToast(''), 4000);
    return () => clearTimeout(timer);
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

  // Scan every project file so cross-file and local-folder findings reach the repair UI.
  const scanResult = useMemo(() => {
    if (selectedProject?.guestPreview) {
      return {
        vulnerabilities: [],
        stats: selectedProject.guestPreview.stats
      };
    }
    const fileScans = (selectedProject?.files || []).map((file) => {
      const deterministic = scanCodeForSecurityVulnerabilities(file.content, file.path, file.language);
      const backendFindings = (file.securityFindings || []).map((finding, index) => ({
        id: finding.id || `${finding.ruleId || 'DEEP'}-${finding.line || index + 1}`,
        ruleId: finding.ruleId,
        line: finding.line || 0,
        filePath: file.path,
        language: file.language,
        cwe: finding.cwe || 'CWE-UNKNOWN',
        category: finding.cwe || 'Deep Scan',
        title: finding.title,
        severity: String(finding.severity || 'MEDIUM').toUpperCase(),
        cvss: finding.severity === 'critical' ? 9.1 : finding.severity === 'high' ? 7.5 : 5.0,
        aiVerdict: 'Requires review',
        aiReason: finding.evidence || 'Backend SAST finding with direct repository evidence.',
        description: finding.title,
        impact: `Potential ${finding.cwe || 'security'} weakness.`,
        originalCode: finding.codeSnippet || '',
        patchedCode: '',
        recommendation: finding.recommendation || ''
      }));
      return {
        ...deterministic,
        vulnerabilities: [...deterministic.vulnerabilities, ...backendFindings]
      };
    });
    const vulnerabilities = fileScans.flatMap((scan) => scan.vulnerabilities);
    return {
      vulnerabilities,
      stats: {
        total: vulnerabilities.length,
        maxCvss: vulnerabilities.reduce((max, finding) => Math.max(max, Number(finding.cvss) || 0), 0),
        criticalCount: vulnerabilities.filter((finding) => finding.severity === 'CRITICAL').length,
        highCount: vulnerabilities.filter((finding) => finding.severity === 'HIGH').length,
        mediumCount: vulnerabilities.filter((finding) => finding.severity === 'MEDIUM').length,
        lowCount: vulnerabilities.filter((finding) => finding.severity === 'LOW').length
      }
    };
  }, [selectedProject]);
  const activeVuln = scanResult.vulnerabilities[0] || null;
  const assistantProjectContext = {
    title: selectedProject?.title || '',
    activeView: activeTab,
    securityScore: selectedProject?.overallScore
      ?? Math.max(0, Math.round(100 - (Number(scanResult.stats.maxCvss) || 0) * 10)),
    stats: scanResult.stats
  };
  const activeFile = selectedProject?.files?.find((file) => file.path === activeVuln?.filePath)
    || selectedProject?.files?.[0]
    || { content: '', path: 'app.ts' };

  if (!['/', '/index.html'].includes(window.location.pathname)) {
    return <NotFoundPage />;
  }

  const handleAddProject = (newProj) => {
    setProjects((current) => [newProj, ...current]);
    setSelectedProject(newProj);
    setActiveTab('detail');
  };

  const handleAddAudit = (newAudit) => {
    setProjects((current) => current.map(p => {
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

  const handleApplyPatch = ({ filePath, patchedCode }) => {
    if (!filePath || !patchedCode) return;
    const applyToProject = (project) => ({
      ...project,
      files: (project.files || []).map((file) => (
        file.path === filePath ? { ...file, content: patchedCode, securityFindings: [] } : file
      )),
      projectAttackSimulation: project.projectAttackSimulation ? {
        ...project.projectAttackSimulation,
        findings: (project.projectAttackSimulation.findings || []).filter((finding) => (
          !finding.affectedFiles?.includes(filePath)
        ))
      } : null
    });
    setSelectedProject((current) => {
      if (!current) return current;
      return applyToProject(current);
    });
    setProjects((current) => current.map((project) => (
      project.id === selectedProject?.id ? applyToProject(project) : project
    )));
  };

  const handleLoginSuccess = (user, notice = '') => {
    setCurrentUser(user);
    setCurrentTier(user.tier || 'FREE');
    localStorage.setItem('lunar_auth_session', JSON.stringify(user));
    if (notice) {
      setAccountToast(notice);
      window.setTimeout(() => setAccountToast(''), 6000);
    }
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

  const handleRenewFreeQuota = async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const result = await lunarApi.renewFreeQuota();
      const updated = {
        ...currentUser,
        daily_scans_used: result.dailyScansUsed,
        dailyScansUsed: result.dailyScansUsed,
        karma_points: result.karmaPoints,
        karmaPoints: result.karmaPoints
      };
      setCurrentUser(updated);
      localStorage.setItem('lunar_auth_session', JSON.stringify(updated));
      setAccountToast(result.message);
      window.setTimeout(() => setAccountToast(''), 6000);
    } catch (error) {
      setAccountToast(error.message || 'Không thể gia hạn quota.');
      window.setTimeout(() => setAccountToast(''), 6000);
    }
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
            onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
          />

          {/* TASK-01 / TASK-14: GitHub OAuth result toast */}
          {githubAuthToast === 'success' && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              borderBottom: '1px solid #10b981',
              padding: '10px 24px',
              textAlign: 'center',
              fontSize: '0.88rem',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              animation: 'fadeIn 0.3s ease'
            }}>
              ✅ Đăng nhập GitHub thành công! Repositories của bạn đã được đồng bộ.
            </div>
          )}
          {githubAuthToast === 'failed' && (
            <div style={{
              background: 'rgba(220, 38, 38, 0.15)',
              borderBottom: '1px solid #dc2626',
              padding: '10px 24px',
              textAlign: 'center',
              fontSize: '0.88rem',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}>
              ❌ Kết nối GitHub thất bại. Vui lòng thử lại hoặc kiểm tra cấu hình OAuth.
            </div>
          )}
          {accountToast && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              borderBottom: '1px solid rgba(16,185,129,.5)',
              padding: '10px 24px',
              textAlign: 'center',
              fontSize: '0.86rem',
              color: '#6ee7b7'
            }}>
              {accountToast}
            </div>
          )}

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
          <>
            <FigmaLunarLanding
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenSubmit={() => setIsSubmitOpen(true)}
              onOpenGitBot={() => setIsGitBotOpen(true)}
              onSelectDemoProject={handleSelectProject}
              onOpenPricing={handleOpenPricing}
            />
            <div style={{ maxWidth: '1240px', margin: '0 auto', paddingTop: '24px' }}>
              <GitHubRepoSelector
                currentUser={currentUser}
                onSelectRepo={handleSelectProject}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
              <UserGitHubWorkspace
                currentUser={currentUser}
                onSelectProject={handleSelectProject}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            </div>
          </>
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
              onAddAudit={handleAddAudit}
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
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

            {selectedProject.guestPreview && (
              <div className="glass-panel" style={{
                padding: '16px 20px',
                marginBottom: '24px',
                border: '1px solid rgba(244,63,94,.35)',
                background: 'rgba(244,63,94,.08)'
              }} data-testid="guest-preview-summary">
                <strong style={{ color: '#fda4af' }}>Guest Security Preview</strong>
                <p style={{ color: 'var(--text-secondary)', marginTop: '5px', fontSize: '0.84rem' }}>
                  Đã phát hiện {scanResult.stats.total} vấn đề, gồm {scanResult.stats.criticalCount} Critical và {scanResult.stats.highCount} High.
                  Chi tiết dòng code và AI Auto-Fix được khóa cho tới khi đăng nhập.
                </p>
              </div>
            )}

            {/* Code Viewer with Line Annotations */}
            <CodeViewer
              files={selectedProject.files}
              isLoggedIn={currentTier !== 'FREE' || !!currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
            />

            {/* Paywall Gate for Auto-Fix Hub */}
            <PaywallGate
              isLoggedIn={currentTier !== 'FREE' || !!currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
              title="Unlock Lunar AI Code Repair Workbench & GitHub PR Bot"
            >
              <VulnerabilityPatcher
                vulnerabilities={scanResult.vulnerabilities}
                projectAttackSimulation={selectedProject.projectAttackSimulation}
                onApplyPatch={handleApplyPatch}
              />

              <CodeRepairWorkbench
                activeFile={activeFile}
                activeVuln={activeVuln}
                projectAttackSimulation={selectedProject.projectAttackSimulation}
                repoUrl={selectedProject.githubUrl}
                onApplyPatch={handleApplyPatch}
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
        currentUser={currentUser}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setResetToken('');
        }}
        onLoginSuccess={handleLoginSuccess}
        initialResetToken={resetToken}
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

      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
        currentUser={currentUser}
        onUserUpdated={handleLoginSuccess}
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

      <LunarAiAssistant
        currentUser={currentUser}
        projectContext={assistantProjectContext}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

    </div>
  );
}
