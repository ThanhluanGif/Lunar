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
import { Moon, ShieldAlert, ShieldCheck, Wrench, Users, Zap, Bot, Package, ArrowRight, Star, GitFork, UserCheck, Terminal, Award, Sparkles, Activity, Lock, CheckCircle2, Github, ExternalLink } from 'lucide-react';

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
      
      {/* Top Figma-Grade Navbar */}
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
          background: 'rgba(99, 102, 241, 0.12)',
          borderBottom: '1px solid var(--border-highlight)',
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
          <span>🌙 Bạn đang ở chế độ <strong>Khách vãng lai (Guest Mode)</strong>. Mở khóa 100% bản vá AI & GitHub Bot bằng cách Sign In hoặc Nâng cấp Pro.</span>
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
        
        {/* TAB 1: EXPLORE PACKAGES & HOMEPAGE (Figma Design Concept) */}
        {activeTab === 'explore' && (
          <div style={{ maxWidth: '1280px', margin: '0 auto', paddingTop: '32px' }}>
            
            {/* Ultra-Sleek Figma Hero Section */}
            <div className="glass-panel" style={{
              padding: '48px 40px',
              marginBottom: '40px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(139, 92, 246, 0.14) 50%, rgba(6, 182, 212, 0.12) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-glow-purple)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '40px',
                alignItems: 'center'
              }}>
                
                {/* Left Column: Headline, Slogan & Action Form */}
                <div>
                  <div className="badge badge-lunar" style={{ marginBottom: '16px', fontSize: '0.8rem', padding: '6px 14px' }}>
                    <Moon size={14} /> Lunar AI Code Review Engine v2.0
                  </div>

                  <h1 style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '3.4rem',
                    fontWeight: '900',
                    letterSpacing: '-0.03em',
                    marginBottom: '18px',
                    color: '#ffffff',
                    lineHeight: 1.12
                  }}>
                    AI Code Review & <span style={{
                      background: 'var(--gradient-lunar)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>Security Audit</span> for Developers
                  </h1>

                  <p style={{
                    fontSize: '1.1rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '32px',
                    lineHeight: '1.65'
                  }}>
                    Kiểm tra mã nguồn tự động theo chuẩn **OWASP Top 10**, chấm điểm 5 tiêu chí độc lập (**Naming, Architecture, Performance, Security, Readability**), và dùng bộ công cụ **1-Click Auto-Fix Patch** để vá lỗi mã nguồn trực tiếp trên GitHub.
                  </p>

                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <button onClick={() => setIsSubmitOpen(true)} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
                      <Wrench size={18} /> Quét & Vá Code Ngay
                    </button>

                    <button onClick={() => setIsPricingOpen(true)} className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
                      <Zap size={18} color="var(--accent-indigo)" /> Khám Phá Gói Pro
                    </button>
                  </div>
                </div>

                {/* Right Column: Interactive 3D Lunar Sentinel Shield Graphic */}
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                  <div className="glass-panel animate-float" style={{
                    padding: '30px',
                    borderRadius: 'var(--radius-xl)',
                    border: '1.5px solid rgba(99, 102, 241, 0.45)',
                    background: 'rgba(12, 16, 28, 0.9)',
                    boxShadow: '0 0 50px rgba(99, 102, 241, 0.4)',
                    maxWidth: '380px',
                    width: '100%',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 75%)',
                      border: '2px solid var(--accent-indigo)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 35px rgba(99, 102, 241, 0.6)',
                      marginBottom: '16px'
                    }}>
                      <ShieldCheck size={48} color="#ffffff" />
                    </div>

                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: '800', marginBottom: '4px', color: '#ffffff' }}>
                      Lunar Security Bot
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
                      Real-time SAST & Auto-Fix Sentinel Active
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                      <div className="badge badge-emerald" style={{ justifyContent: 'center', padding: '7px' }}>
                        <CheckCircle2 size={14} /> OWASP Top 10 Compliance Active
                      </div>
                      <div className="badge badge-cyan" style={{ justifyContent: 'center', padding: '7px' }}>
                        <Bot size={14} /> 1-Click Pull Request Auto-Patch
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Graphic Stats Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginTop: '48px',
                paddingTop: '28px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div>
                  <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#ffffff', fontFamily: 'var(--font-heading)' }}>2,450,000+</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Scanned Code Lines</div>
                </div>
                <div>
                  <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--accent-cyan)', fontFamily: 'var(--font-heading)' }}>100% OWASP</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Coverage Standard</div>
                </div>
                <div>
                  <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#34d399', fontFamily: 'var(--font-heading)' }}>1-Click PR</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Auto-Fix GitHub Bot</div>
                </div>
              </div>
            </div>

            {/* Feature Cards Grid (Figma Component Showcase) */}
            <div style={{ marginBottom: '48px' }}>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: '800', color: '#ffffff' }}>
                  Tính Năng Cốt Lõi Trên Lunar Security Platform
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Hệ thống bảo mật mã nguồn toàn diện từ kiểm tra tĩnh tới tự động tạo Pull Request vá lỗi
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <ShieldAlert size={24} color="var(--accent-indigo)" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>
                    1. SAST Security Engine
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
                    Phân tích cú pháp tĩnh chuẩn OWASP Top 10, phát hiện SQL Injection, XSS, Hardcoded Credentials & Insecure JWT Verification.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Activity size={24} color="var(--accent-purple)" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>
                    2. 5-Metric Radar Score
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
                    Biểu đồ Radar Spider Chart đánh giá 5 khía cạnh độc lập: Naming, Architecture, Performance, Security & Readability.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Wrench size={24} color="#34d399" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>
                    3. Auto-Fix Patch Workbench
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
                    Giao diện Side-by-Side Diff xem đối sánh mã lỗi vs mã đã vá safe code và 1-Click tự động tạo GitHub Pull Request.
                  </p>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Users size={24} color="var(--accent-cyan)" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>
                    4. White-Hat Cyber Forum
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
                    Cộng đồng chuyên gia bảo mật và Pentesters trao đổi kinh nghiệm phòng thủ mã độc, thảo luận Zero-day và bảng xếp hạng Karma.
                  </p>
                </div>
              </div>
            </div>

            {/* Figma-Style Package Cards List */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>
                    Public Audited Repositories & Packages
                  </h2>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Danh sách các dự án tiêu biểu đang được kiểm định bảo mật trên Lunar Registry
                  </p>
                </div>
                <span className="badge badge-lunar" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  PUBLIC REGISTRY
                </span>
              </div>

              {/* Package Card Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
                      borderLeft: proj.cvssScore >= 8.0 ? '5px solid var(--accent-rose)' : '5px solid #10b981'
                    }}
                    onClick={() => handleSelectProject(proj)}
                  >
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <Package size={22} color="var(--accent-indigo)" />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                          {proj.title.toLowerCase().replace(/\s+/g, '-')}
                        </h3>
                        <span className="badge badge-lunar">v1.2.0</span>
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
                        <span className="badge badge-purple">{proj.language}</span>
                      </div>
                    </div>

                    <div>
                      <button className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
                        <span>Inspect & Auto-Fix</span>
                        <ArrowRight size={14} color="var(--accent-indigo)" />
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
                <Package size={28} color="var(--accent-indigo)" />
                <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: '800' }}>
                  {selectedProject.title.toLowerCase().replace(/\s+/g, '-')}
                </h1>
                <span className="badge badge-lunar">v1.2.0</span>
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

      {/* Figma-Style Graphic Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        background: '#05070d',
        padding: '36px 24px',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--gradient-lunar)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '900',
              fontSize: '1rem',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)'
            }}>
              <Moon size={18} color="#fff" />
            </div>
            <span>Lunar.dev • AI Code Audit & Automated Security Bot Platform.</span>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="https://github.com/ThanhluanGif/Lunar.git" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>GitHub</a>
            <a href="#terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</a>
            <a href="#privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
