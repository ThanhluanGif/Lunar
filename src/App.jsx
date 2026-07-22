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
import AuditReportExportModal from './components/AuditReportExportModal';
import { SECURITY_PROJECTS_MOCK } from './data/cveDatabase';
import { scanCodeForSecurityVulnerabilities } from './services/securityScannerEngine';
import { Moon, ShieldAlert, ShieldCheck, Wrench, Users, ArrowRight, Zap, AlertTriangle, ChevronRight, UserCheck, Sparkles } from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState(SECURITY_PROJECTS_MOCK);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'community' | 'detail'
  const [selectedProject, setSelectedProject] = useState(SECURITY_PROJECTS_MOCK[0]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auth state (defaults to null for Guest mode testing)
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modals
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSubmit={() => setIsSubmitOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => setCurrentUser(null)}
      />

      {/* Guest Mode Testing Helper Banner */}
      {!currentUser && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.2), rgba(6, 182, 212, 0.2))',
          borderBottom: '1px solid var(--border-color)',
          padding: '8px 24px',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <span>🌙 Bạn đang ở chế độ <strong>Khách vãng lai (Lunar Guest)</strong>. Một số tính năng xem chi tiết code & vá lỗi sẽ bị khóa.</span>
          <button
            onClick={() => {
              setCurrentUser({
                id: 'user-demo',
                name: 'Nguyễn Văn Đạt (Dev)',
                email: 'dat.nguyen@lunar.dev',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
                role: 'MEMBER_PRO',
                karma: 1250
              });
            }}
            className="btn btn-emerald btn-sm"
            style={{ padding: '2px 10px', fontSize: '0.75rem' }}
          >
            <UserCheck size={14} /> Chuyển Sang Thành Viên Đã Đăng Nhập
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '0 24px 60px 24px' }}>
        
        {/* TAB 1: EXPLORE SECURITY PROJECTS */}
        {activeTab === 'explore' && (
          <div style={{ maxWidth: '1280px', margin: '0 auto', paddingTop: '28px' }}>
            
            {/* Hero Section */}
            <div className="glass-panel" style={{
              padding: '40px',
              marginBottom: '32px',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.12))',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}>
              <div style={{ maxWidth: '840px' }}>
                <span className="badge badge-purple" style={{ marginBottom: '14px' }}>
                  <Moon size={14} /> Lunar AI - Code Security & Auto-Patch Workbench
                </span>

                <h1 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2.5rem',
                  fontWeight: '800',
                  lineHeight: '1.25',
                  marginBottom: '16px',
                  background: 'linear-gradient(135deg, #ffffff 40%, #c084fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Lunar - Nền Tảng AI Review Code Chuyên Sâu, Vá Lỗi OWASP & Security Audit
                </h1>

                <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
                  Kiểm tra mã nguồn tự động với <strong>Lunar AI Engine</strong>, phát hiện các mối đe dọa OWASP Top 10, cung cấp bộ công cụ <strong>1-Click Auto-Fix Patch</strong> xem Diff trực quan và hỗ trợ tạo Pull Request về GitHub.
                </p>

                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <button onClick={() => setIsSubmitOpen(true)} className="btn btn-primary">
                    <Wrench size={18} /> Quét & Vá Code Với Lunar AI
                  </button>
                  <button onClick={() => setActiveTab('community')} className="btn btn-secondary">
                    <Users size={18} color="#a855f7" /> Tham Gia Cộng Đồng Cybersecurity
                  </button>
                </div>
              </div>
            </div>

            {/* Project Grid */}
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>
              Danh Sách Dự Án Đang Được Audit Bảo Mật Trên Lunar
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '24px'
            }}>
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="glass-card"
                  style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderColor: proj.cvssScore >= 8.0 ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-color)'
                  }}
                  onClick={() => handleSelectProject(proj)}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span className="badge badge-cyan">{proj.language}</span>
                      <span className={`badge ${proj.cvssScore >= 8.0 ? 'badge-rose' : 'badge-emerald'}`}>
                        CVSS {proj.cvssScore || 0.0} Base Score
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px', color: '#ffffff' }}>
                      {proj.title}
                    </h3>

                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
                      {proj.description}
                    </p>
                  </div>

                  <div style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={proj.author?.avatar}
                        alt={proj.author?.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {proj.author?.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-purple)', fontSize: '0.85rem', fontWeight: '600' }}>
                      <span>Soi & Vá Code</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              ))}
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
                ← Quay lại Danh Sách Repo
              </button>

              <button onClick={() => setIsReportOpen(true)} className="btn btn-primary btn-sm">
                <ShieldCheck size={16} /> Xuất Báo Cáo Audit & Badge GitHub
              </button>
            </div>

            {/* Project Header */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: '800', marginBottom: '6px' }}>
                {selectedProject.title}
              </h1>
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
              isLoggedIn={!!currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
            />

            {/* Paywall Gate for Auto-Fix Hub */}
            <PaywallGate
              isLoggedIn={!!currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
              title="Mở Khóa Bộ Công Cụ Sửa Code Tự Động Lunar AI (Code Repair Workbench)"
            >
              <VulnerabilityPatcher
                vulnerabilities={scanResult.vulnerabilities}
              />

              <CodeRepairWorkbench
                activeFile={activeFile}
                activeVuln={scanResult.vulnerabilities[0]}
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
        onLoginSuccess={(user) => setCurrentUser(user)}
      />

      <AuditReportExportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        project={selectedProject}
        scanResult={scanResult}
      />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        Lunar.dev • Nền Tảng AI Review Code Chuyên Sâu, Vá Lỗi OWASP & Cyber Security Audit
      </footer>

    </div>
  );
}
