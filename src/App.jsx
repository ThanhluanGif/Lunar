import React, { useState } from 'react';
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
import { SECURITY_PROJECTS_MOCK } from './data/cveDatabase';
import { scanCodeForSecurityVulnerabilities } from './services/securityScannerEngine';
import { ShieldCheck, Wrench, Users, Zap, Bot, Package, ArrowRight, Star, GitFork, UserCheck, Terminal, Award, Sparkles, Activity, Lock, CheckCircle2, Github } from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState(SECURITY_PROJECTS_MOCK);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'community' | 'detail'
  const [selectedProject, setSelectedProject] = useState(SECURITY_PROJECTS_MOCK[0]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auth state & Subscription tier
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTier, setCurrentTier] = useState('FREE'); // 'FREE' | 'PRO' | 'ENTERPRISE'
  
  // Modals
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isGitBotOpen, setIsGitBotOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

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

  const handleUpgradeSuccess = (newTier) => {
    setCurrentTier(newTier);
    if (!currentUser) {
      setCurrentUser({
        id: 'user-pro',
        name: 'Sarah Chen (Stripe Eng)',
        email: 'sarah.chen@stripe.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        role: `MEMBER_${newTier}`,
        karma: 2400
      });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Exact Figma Top Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSubmit={() => setIsSubmitOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUser={currentUser}
        currentTier={currentTier}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => {
          setCurrentUser(null);
          setCurrentTier('FREE');
        }}
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenGitBot={() => setIsGitBotOpen(true)}
      />

      {/* Guest Mode Helper Pill */}
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
              onClick={() => handleUpgradeSuccess('PRO')}
              className="btn btn-emerald btn-sm"
              style={{ padding: '2px 10px', fontSize: '0.75rem' }}
            >
              <UserCheck size={14} /> Sign In Demo Pro
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '0 24px 60px 24px' }}>
        
        {/* TAB 1: EXACT FIGMA LUNAR LANDING */}
        {activeTab === 'explore' && (
          <div>
            {/* Render Exact Figma Landing Page */}
            <FigmaLunarLanding
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenSubmit={() => setIsSubmitOpen(true)}
              onOpenGitBot={() => setIsGitBotOpen(true)}
              onSelectDemoProject={handleSelectProject}
            />

            {/* Public Audited Repositories Section */}
            <div style={{ maxWidth: '1240px', margin: '0 auto 60px auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: '800', color: '#ffffff' }}>
                    Public Audited Repositories
                  </h2>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Top scanned packages and public code audits on Lunar Registry
                  </p>
                </div>
                <span className="badge badge-purple" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  PUBLIC REGISTRY
                </span>
              </div>

              {/* Package Card Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="glass-card"
                    style={{
                      padding: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '24px',
                      flexWrap: 'wrap',
                      cursor: 'pointer',
                      borderLeft: proj.cvssScore >= 8.0 ? '4px solid #f87171' : '4px solid #34d399'
                    }}
                    onClick={() => handleSelectProject(proj)}
                  >
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <Package size={22} color="var(--accent-purple-light)" />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                          {proj.title.toLowerCase().replace(/\s+/g, '-')}
                        </h3>
                        <span className="badge badge-purple">v1.2.0</span>
                        <span className={`badge ${proj.cvssScore >= 8.0 ? 'badge-rose' : 'badge-emerald'}`}>
                          CVSS {proj.cvssScore || 0.0}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.55' }}>
                        {proj.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={proj.author?.avatar}
                            alt={proj.author?.name}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span>published by <strong>{proj.author?.username}</strong></span>
                        </div>
                        <span>•</span>
                        <span>⭐ {proj.stars} stars</span>
                        <span>•</span>
                        <span>🍴 {proj.forks} forks</span>
                        <span>•</span>
                        <span className="badge badge-cyan">{proj.language}</span>
                      </div>
                    </div>

                    <div>
                      <button className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
                        <span>Inspect & Auto-Fix</span>
                        <ArrowRight size={14} color="var(--accent-purple-light)" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentTier('PRO');
        }}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        currentTier={currentTier}
        onUpgradeSuccess={handleUpgradeSuccess}
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

      {/* Exact Figma Style Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        background: '#05070c',
        padding: '40px 32px',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(124, 58, 237, 0.3)',
              border: '1px solid rgba(167, 139, 250, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Moon size={14} color="#c084fc" />
            </div>
            <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
              lunar — AI code review that fixes itself.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <a href="https://github.com/ThanhluanGif/Lunar.git" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>GitHub</a>
            <a href="#terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</a>
            <a href="#privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
