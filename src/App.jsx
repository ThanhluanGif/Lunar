import React, { useState } from 'react';
import Navbar from './components/Navbar';
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
import { ShieldCheck, Wrench, Users, Zap, Bot, Package, ArrowRight, Star, GitFork, UserCheck, Terminal, Award } from 'lucide-react';

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
        name: 'Nguyễn Văn Đạt (Pro Dev)',
        email: 'dat.nguyen@lunar.dev',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        role: `MEMBER_${newTier}`,
        karma: 1500
      });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top npm Style Navbar */}
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

      {/* Guest Mode Banner */}
      {!currentUser && (
        <div style={{
          background: 'rgba(203, 56, 55, 0.15)',
          borderBottom: '1px solid var(--npm-red)',
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
          <span>⚡ Bạn đang ở chế độ <strong>Khách vãng lai (Guest Mode)</strong>. Mở khóa 100% bản vá AI & GitHub Bot bằng cách Sign In hoặc Nâng cấp Pro.</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsPricingOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ padding: '2px 10px', fontSize: '0.75rem' }}
            >
              <Zap size={14} /> Nâng Cấp Pro
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
        
        {/* TAB 1: EXPLORE PACKAGES (npm Homepage Style) */}
        {activeTab === 'explore' && (
          <div style={{ maxWidth: '1280px', margin: '0 auto', paddingTop: '32px' }}>
            
            {/* Hero Section (npm Slogan Style) */}
            <div style={{
              textAlign: 'center',
              padding: '60px 20px 48px 20px',
              background: 'linear-gradient(180deg, rgba(203, 56, 55, 0.12) 0%, transparent 100%)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              marginBottom: '40px',
              position: 'relative'
            }}>
              <h1 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '3.2rem',
                fontWeight: '900',
                letterSpacing: '-0.03em',
                marginBottom: '16px',
                color: '#ffffff',
                lineHeight: 1.15
              }}>
                Take code security to the <span style={{ color: 'var(--npm-red)' }}>next level.</span>
              </h1>

              <p style={{
                fontSize: '1.15rem',
                color: 'var(--text-secondary)',
                maxWidth: '720px',
                margin: '0 auto 32px auto',
                lineHeight: '1.6'
              }}>
                Lunar is the open source code review & security registry. Audit OWASP vulnerabilities, auto-fix patches in 1-click, and deploy GitHub Security Bots to your repositories.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <button onClick={() => setIsSubmitOpen(true)} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
                  <Wrench size={18} /> Scan & Auto-Fix Package
                </button>
                <button onClick={() => setIsPricingOpen(true)} className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
                  <Zap size={18} color="var(--npm-red)" /> Explore Pro & Enterprise
                </button>
              </div>

              {/* npm Stats Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginTop: '48px',
                paddingTop: '24px',
                borderTop: '1px solid var(--border-color)'
              }}>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff' }}>2,450,000+</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Scanned Code Lines</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>100% OWASP</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Coverage Standard</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#34d399' }}>1-Click PR</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Auto-Fix GitHub Bot</div>
                </div>
              </div>
            </div>

            {/* Relied On By Developers Grid (npm Section Style) */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: '800', color: '#ffffff' }}>
                    Featured Repositories & Security Audits
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Top scanned packages and public code audits on Lunar Registry
                  </p>
                </div>
                <span className="badge badge-npm" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                  PUBLIC REGISTRY
                </span>
              </div>

              {/* npm Style Package Search Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="glass-card"
                    style={{
                      padding: '20px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '20px',
                      flexWrap: 'wrap',
                      cursor: 'pointer',
                      borderLeft: proj.cvssScore >= 8.0 ? '4px solid var(--npm-red)' : '4px solid #10b981'
                    }}
                    onClick={() => handleSelectProject(proj)}
                  >
                    {/* Left Info: Package Title, Version, Author, Keywords */}
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <Package size={20} color="var(--npm-red)" />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                          {proj.title.toLowerCase().replace(/\s+/g, '-')}
                        </h3>
                        <span className="badge badge-npm">v1.2.0</span>
                        <span className={`badge ${proj.cvssScore >= 8.0 ? 'badge-rose' : 'badge-emerald'}`}>
                          CVSS {proj.cvssScore || 0.0}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
                        {proj.description}
                      </p>

                      {/* Package Meta Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img
                            src={proj.author?.avatar}
                            alt={proj.author?.name}
                            style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span>published by <strong>{proj.author?.username}</strong></span>
                        </div>
                        <span>•</span>
                        <span>⭐ {proj.stars} stars</span>
                        <span>•</span>
                        <span>🍴 {proj.forks} forks</span>
                        <span>•</span>
                        <span className="badge badge-purple">{proj.language}</span>
                      </div>
                    </div>

                    {/* Right CTA Button */}
                    <div>
                      <button className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
                        <span>Inspect & Auto-Fix</span>
                        <ArrowRight size={14} color="var(--npm-red)" />
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
          <div style={{ maxWidth: '1280px', margin: '0 auto', paddingTop: '28px' }}>
            
            {/* Header Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <button onClick={() => setActiveTab('explore')} className="btn btn-secondary btn-sm">
                ← Back to Package Search
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
                <Package size={28} color="var(--npm-red)" />
                <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: '800' }}>
                  {selectedProject.title.toLowerCase().replace(/\s+/g, '-')}
                </h1>
                <span className="badge badge-npm">v1.2.0</span>
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

      {/* npm Style Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        background: '#090c12',
        padding: '32px 24px',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              background: 'var(--npm-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '900',
              fontSize: '0.9rem'
            }}>
              lnr
            </div>
            <span>lunar.dev • An open source security registry for JavaScript, Python & Go.</span>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#github" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>GitHub</a>
            <a href="#terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</a>
            <a href="#privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
