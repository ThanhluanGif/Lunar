import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from './components/Navbar';
import FigmaLunarLanding from './components/FigmaLunarLanding';
import SecurityDashboard from './components/SecurityDashboard';
import VulnerabilityPatcher from './components/VulnerabilityPatcher';
import CodeViewer from './components/CodeViewer';
import CodeRepairWorkbench from './components/CodeRepairWorkbench';
import PaywallGate from './components/PaywallGate';
import SubmitModal from './components/SubmitModal';
import AuthModal from './components/AuthModal';
import PricingModal from './components/PricingModal';
import GitBotConfigModal from './components/GitBotConfigModal';
import AuditReportExportModal from './components/AuditReportExportModal';
import QuotaDepletedModal from './components/QuotaDepletedModal';
import AccountSettingsModal from './components/AccountSettingsModal';
import LunarAiAssistant from './components/LunarAiAssistant';
import NotFoundPage from './components/NotFoundPage';
import AdminDashboard from './components/AdminDashboard';
import LunarDashboard from './components/LunarDashboard';
import { SECURITY_PROJECTS_MOCK } from './data/cveDatabase';
import { scanCodeForSecurityVulnerabilities } from './services/securityScannerEngine';
import { applyValidatedPatchToProject, unavailableAutoPatch } from './services/autoPatchPolicy';
import { lunarApi } from './services/lunarApi';
import { Moon, ShieldCheck, Wrench, Users, Bot, Package, ArrowRight, Star, GitFork, Terminal, Award, Sparkles, Activity, Lock, CheckCircle2, Github, RefreshCw } from 'lucide-react';

import UserGitHubWorkspace from './components/UserGitHubWorkspace';
import RealTimeStatsBanner from './components/RealTimeStatsBanner';

export default function App() {
  const [projects, setProjects] = useState(SECURITY_PROJECTS_MOCK);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'dashboard' | 'detail' | 'admin'
  const [selectedProject, setSelectedProject] = useState(SECURITY_PROJECTS_MOCK[0]);
  const selectedProjectRef = useRef(selectedProject);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTier, setCurrentTier] = useState('FREE');
  const [githubAuthToast, setGithubAuthToast] = useState(''); // '' | 'success' | 'failed'
  const [accountToast, setAccountToast] = useState('');
  const [accountError, setAccountError] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  // Modals
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [selectedPricingPlan, setSelectedPricingPlan] = useState('PRO');
  const [isGitBotOpen, setIsGitBotOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [quotaExceededContext, setQuotaExceededContext] = useState(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

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

  const handleQuotaExceeded = (quota) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setQuotaExceededContext({
      ...quota,
      tier: quota?.tier || currentTier
    });
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

  // Strict Security Protection: Non-admin users can never access or view activeTab === 'admin'
  useEffect(() => {
    if (activeTab === 'admin' && currentUser?.role !== 'ADMIN') {
      setActiveTab('explore');
    }
  }, [activeTab, currentUser]);

  // The Lunar backend is authoritative for identity, tier and role.
  useEffect(() => {
    let mounted = true;
    lunarApi.getMe()
      .then(({ user }) => {
        if (!mounted) return;
        setCurrentUser(user);
        setCurrentTier(user.tier || 'FREE');
      })
      .catch(() => {
        if (!mounted) return;
        setCurrentUser(null);
        setCurrentTier('FREE');
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
      const backendFindings = (file.securityFindings || []).map((finding, index) => {
        const unavailable = unavailableAutoPatch(
          'Backend SAST finding chưa có patch qua validation và rescan.'
        );
        return {
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
          patchedCode: null,
          recommendation: finding.recommendation || '',
          ...unavailable,
          remediation: { ...unavailable, patchCode: null }
        };
      });
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

  const handleSelectProject = (proj) => {
    setSelectedProject(proj);
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyPatch = ({ finding }) => {
    const currentProject = selectedProjectRef.current;
    if (!currentProject || !finding) {
      return { ok: false, status: 'triaged', reason: 'Không có project hoặc finding để áp dụng.' };
    }
    const result = applyValidatedPatchToProject(
      currentProject,
      finding,
      scanCodeForSecurityVulnerabilities
    );
    if (!result.ok) return result;

    selectedProjectRef.current = result.project;
    setSelectedProject(result.project);
    setProjects((current) => current.map((project) => (
      project.id === currentProject.id ? result.project : project
    )));
    return result;
  };

  const handleLoginSuccess = (user, notice = '') => {
    setAccountError('');
    setCurrentUser(user);
    setCurrentTier(user.tier || 'FREE');
    if (notice) {
      setAccountToast(notice);
      window.setTimeout(() => setAccountToast(''), 6000);
    }
  };

  const handleLogout = async () => {
    let logoutWarning = '';
    try {
      await lunarApi.logout();
    } catch (error) {
      logoutWarning = 'Đã đăng xuất trên thiết bị này, nhưng Lunar API chưa xác nhận xóa phiên máy chủ.';
    }
    setAccountError(logoutWarning);
    setCurrentUser(null);
    setCurrentTier('FREE');
    if (activeTab === 'admin') setActiveTab('explore');
    if (logoutWarning) window.setTimeout(() => setAccountError(''), 6000);
  };

  const handleUpgradeSuccess = (newTier) => {
    if (!currentUser) return;
    setCurrentTier(newTier);
    setCurrentUser((user) => (user ? { ...user, tier: newTier } : user));
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Hide site Navbar when the full account dashboard is open */}
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
          {accountError && (
            <div role="alert" style={{
              background: 'rgba(220, 38, 38, 0.15)',
              borderBottom: '1px solid rgba(220,38,38,.55)',
              padding: '10px 24px',
              textAlign: 'center',
              fontSize: '0.86rem',
              color: '#fca5a5'
            }}>
              {accountError}
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
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenSubmit={() => setIsSubmitOpen(true)}
              onOpenGitBot={() => setIsGitBotOpen(true)}
              onSelectDemoProject={handleSelectProject}
              onOpenPricing={handleOpenPricing}
              onOpenDashboard={() => setActiveTab('dashboard')}
              quickScanSection={(
                <UserGitHubWorkspace
                  currentUser={currentUser}
                  currentTier={currentTier}
                  onSelectProject={handleSelectProject}
                  onOpenGitHubAuth={() => setIsAuthOpen(true)}
                  onQuotaExceeded={handleQuotaExceeded}
                />
              )}
            />
          </>
        )}

        {/* Authenticated account dashboard */}
        {activeTab === 'dashboard' && (
          <div style={{ margin: '-0px -24px -60px -24px' }}>
            <LunarDashboard
              key={`account-dashboard:${currentUser?.id || 'guest'}`}
              onBackToSite={() => setActiveTab('explore')}
              onSelectProject={handleSelectProject}
              currentUser={currentUser}
              onOpenPricing={handleOpenPricing}
            />
          </div>
        )}

        {/* TAB 4: ADMIN MANAGEMENT DASHBOARD (Strict Admin Role Required) */}
        {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
          <AdminDashboard
            key={`admin-dashboard:${currentUser.id}`}
            currentUser={currentUser}
            onUpgradeUserTier={handleUpgradeSuccess}
          />
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
                currentTier={currentTier}
                onQuotaExceeded={handleQuotaExceeded}
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
        onQuotaExceeded={handleQuotaExceeded}
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
      />

      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
        currentUser={currentUser}
        onUserUpdated={handleLoginSuccess}
      />

      {quotaExceededContext && (
          <QuotaDepletedModal
            isOpen={Boolean(quotaExceededContext)}
            onClose={() => setQuotaExceededContext(null)}
            onOpenPricing={handleOpenPricing}
            currentUser={currentUser}
            quota={quotaExceededContext}
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
