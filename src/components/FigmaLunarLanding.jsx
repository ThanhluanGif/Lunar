import React, { useState } from 'react';
import { Github, Sparkles, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Bot, Code, Cpu, Eye, Activity, RefreshCw, Check, Moon, Layers, Terminal, ChevronRight, Play, Lock, UserCheck, HelpCircle } from 'lucide-react';
import LiveDashboardPreview from './LiveDashboardPreview';

export default function FigmaLunarLanding({
  currentUser,
  onOpenAuth,
  onOpenSubmit,
  onOpenGitBot,
  onSelectDemoProject,
  onOpenPricing,
  onOpenDashboard,
  quickScanSection
}) {
  // State for Interactive "Watch Lunar Work" Live Demo Editor
  const [demoState, setDemoState] = useState('before'); // 'before' | 'after'
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [selectedIssueIdx, setSelectedIssueIdx] = useState(0);

  // Pricing State
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'

  // Code Samples for Live Demo
  const beforeCodeLines = [
    { num: 1, text: 'async function fetchUserData(userId) {', type: 'neutral' },
    { num: 2, text: '  const res = await fetch(\'/api/users/\' + userId)', type: 'remove' },
    { num: 3, text: '  const data = res.json()', type: 'remove' },
    { num: 4, text: '  ', type: 'neutral' },
    { num: 5, text: '  if (data.admin == true) {', type: 'remove' },
    { num: 6, text: '    executeAdminCommand(data.cmd)', type: 'remove' },
    { num: 7, text: '  }', type: 'neutral' },
    { num: 8, text: '  ', type: 'neutral' },
    { num: 9, text: '  return data', type: 'neutral' },
    { num: 10, text: '}', type: 'neutral' }
  ];

  const afterCodeLines = [
    { num: 1, text: 'async function fetchUserData(userId: string): Promise<UserData> {', type: 'add' },
    { num: 2, text: '  const res = await fetch(`/api/users/${encodeURIComponent(userId)}`)', type: 'add' },
    { num: 3, text: '  if (!res.ok) throw new Error(\'Failed to fetch user\')', type: 'add' },
    { num: 4, text: '  ', type: 'neutral' },
    { num: 5, text: '  const data: UserData = await res.json()', type: 'add' },
    { num: 6, text: '  ', type: 'neutral' },
    { num: 7, text: '  if (data.admin === true && isValidCmd(data.cmd)) {', type: 'add' },
    { num: 8, text: '    await executeAdminCommandSanitized(data.cmd)', type: 'add' },
    { num: 9, text: '  }', type: 'neutral' },
    { num: 10, text: '  return data', type: 'neutral' },
    { num: 11, text: '}', type: 'neutral' }
  ];

  const handleRunAutoFix = () => {
    setIsAutoFixing(true);
    setTimeout(() => {
      setDemoState('after');
      setIsAutoFixing(false);
    }, 1200);
  };

  const aiIssues = [
    { type: 'error', label: 'Command Injection', line: 6, desc: 'Unsanitized cmd passed to executeAdminCommand', color: '#ef4444' },
    { type: 'error', label: 'Missing await', line: 3, desc: 'res.json() returns a Promise — missing await', color: '#ef4444' },
    { type: 'warning', label: 'Loose Equality', line: 5, desc: 'Use === instead of ==', color: '#f97316' },
    { type: 'warning', label: 'No Error Handling', line: 2, desc: 'HTTP errors not checked before parsing', color: '#f97316' },
    { type: 'info', label: 'Type Safety', line: 1, desc: 'Add TypeScript types for safety', color: '#6c8eef' }
  ];

  const capabilities = [
    {
      icon: '◎',
      title: 'AI Code Review',
      desc: 'Deep semantic analysis powered by LLMs. Lunar reads context across your entire codebase, not just the diff.',
      color: '#6c8eef'
    },
    {
      icon: '⟳',
      title: 'Auto-Fix Engine',
      desc: 'One-click fixes for detected issues. Lunar generates corrected code with explanations and opens a PR automatically.',
      color: '#9d6ef5'
    },
    {
      icon: '◈',
      title: 'GitHub Integration',
      desc: 'Connects to any repo in seconds. Reviews run on every push, PR, and merge request — no config required.',
      color: '#4fc3f7'
    },
    {
      icon: '◇',
      title: 'Security Scanning',
      desc: 'OWASP Top 10, dependency vulnerabilities, secret leaks, and injection vectors detected before merge.',
      color: '#f97316'
    },
    {
      icon: '▦',
      title: 'Style Enforcement',
      desc: "Learns your team's conventions from existing code. No .eslintrc required — Lunar adapts to you.",
      color: '#22d3ee'
    },
    {
      icon: '◉',
      title: 'Team Analytics',
      desc: 'Track code quality over time. See which authors, files, and issue types need the most attention.',
      color: '#a3e635'
    }
  ];

  const pricingPlans = [
    {
      id: 'FREE',
      name: 'Gói Miễn Phí (Free)',
      displayPrice: '0đ',
      period: 'mãi mãi',
      desc: 'Cơ Bản · Dành cho lập trình viên cá nhân',
      features: [
        '3 Lượt Quét Mã Nguồn / Ngày',
        'Xem Điểm CVSS v3.1 Tổng Quan',
        'Xem Đếm Số Lượng Lỗi (Critical/High)',
        'Quét Repository GitHub Public'
      ],
      cta: 'Đang Sử Dụng Gói Này',
      highlight: false
    },
    {
      id: 'PRO',
      name: 'Gói Chuyên Nghiệp (Pro)',
      displayPrice: '290.000đ',
      period: '/ tháng',
      desc: 'Khuyên Dùng · Mở khóa trọn bộ AI Fix Workbench',
      features: [
        'Không Giới Hạn Lượt Quét Mã Nguồn',
        'Mở Khóa Chi Tiết Dòng Code & Line AI Warning',
        'Bộ Công Cụ Vá Code Tự Động (AI Code Repair Workbench)',
        'Side-by-Side Diff & Tinh Chỉnh Prompt AI Fix',
        'Xuất Báo Cáo Audit PDF & Badge Cho GitHub README'
      ],
      cta: 'Nâng Cấp Gói Pro ⚡',
      highlight: true,
      popularLabel: '🔥 Phổ Biến Nhất'
    },
    {
      id: 'ENTERPRISE',
      name: 'Gói Enterprise Git Bot',
      displayPrice: '690.000đ',
      period: '/ tháng',
      desc: 'Doanh Nghiệp / Bot · Tự động vá code trên GitHub',
      features: [
        'Tất cả tính năng của gói Pro',
        'GitHub Security Bot Tự Động Tạo Pull Request',
        'Tích Hợp Webhook & CI/CD Action Workflow',
        'Tự Động Vá Lỗi Mã Nguồn Mỗi Khi Push Code',
        'Hỗ Trợ Ưu Tiên & GitHub Security Workflow'
      ],
      cta: 'Mua Gói Enterprise Bot 🤖',
      highlight: false
    }
  ];

  const testimonials = [
    {
      quote: 'Lunar caught a critical injection vulnerability in our payment service that had been sitting undetected for 8 months. The auto-fix PR was merged within 10 minutes.',
      name: 'Sarah Chen',
      role: 'Senior Engineer @ Stripe',
      avatar: 'SC',
      color: '#6c8eef'
    },
    {
      quote: "We went from 6-hour manual reviews to 12-minute automated ones. Our team's velocity doubled in the first sprint alone.",
      name: 'Marcus Reid',
      role: 'CTO @ Vercel',
      avatar: 'MR',
      color: '#9d6ef5'
    },
    {
      quote: 'The GitHub integration is seamless. Every PR gets a thorough review before any human even looks at it. Our codebase quality score went from 61 to 94 in 3 months.',
      name: 'Priya Nair',
      role: 'Lead Developer @ Linear',
      avatar: 'PN',
      color: '#4fc3f7'
    }
  ];

  const connectedRepos = [
    { name: 'acme-corp/frontend', lang: 'TypeScript', issues: 3, score: 94, status: 'passing' },
    { name: 'acme-corp/api-server', lang: 'Go', issues: 7, score: 81, status: 'reviewing' },
    { name: 'acme-corp/mobile-app', lang: 'Swift', issues: 1, score: 97, status: 'passing' },
    { name: 'acme-corp/data-pipeline', lang: 'Python', issues: 12, score: 68, status: 'failed' }
  ];

  return (
    <div style={{ background: '#07080f', color: '#e2e5f0', minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
      
      {/* Ambient Glowing Background Orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '20%', width: '600px', height: '600px', borderRadius: '50%', background: '#6c8eef', filter: 'blur(160px)', opacity: 0.12, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '40%', right: '10%', width: '500px', height: '500px', borderRadius: '50%', background: '#9d6ef5', filter: 'blur(150px)', opacity: 0.12, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '70%', left: '40%', width: '450px', height: '450px', borderRadius: '50%', background: '#4fc3f7', filter: 'blur(140px)', opacity: 0.1, pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

        {/* ---------------------------------------------------- */}
        {/* SECTION 1: HERO */}
        {/* ---------------------------------------------------- */}
        <section id="landing-hero" style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingTop: '100px', paddingBottom: '80px', position: 'relative' }}>
          
          {/* Announcement Pill */}
          <div style={{ marginBottom: '24px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: '600',
              letterSpacing: '0.03em',
              background: 'rgba(157, 110, 245, 0.12)',
              color: '#c084fc',
              border: '1px solid rgba(157, 110, 245, 0.3)'
            }}>
              <span>✦</span> Now with GPT-4o · Auto-fix v3.0
            </span>
          </div>

          {/* Main Hero Headline */}
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'calc(2.6rem + 2.5vw)',
            fontWeight: '900',
            lineHeight: '1.08',
            letterSpacing: '-0.035em',
            maxWidth: '920px',
            marginBottom: '24px',
            color: '#e2e5f0'
          }}>
            Code review that{' '}
            <span style={{
              background: 'linear-gradient(135deg, #6c8eef 0%, #9d6ef5 50%, #4fc3f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              fixes itself
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p style={{
            fontSize: '1.15rem',
            lineHeight: '1.65',
            color: '#7880a0',
            maxWidth: '680px',
            marginBottom: '40px'
          }}>
            Lunar connects to your GitHub repos, reviews every PR with AI, and opens auto-fix pull requests — so your team ships faster with fewer bugs.
          </p>

          {/* Hero CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', alignItems: 'center', marginBottom: '64px' }}>
            <button
              onClick={() => document.getElementById('github-quick-scan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 28px',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #6c8eef 0%, #9d6ef5 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 32px rgba(108, 142, 239, 0.4)',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
            >
              <Github size={18} />
              GitHub Quick Scan
            </button>

            <button
              onClick={onOpenSubmit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#a0a8c0',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
            >
              View live demo →
            </button>
          </div>

          {/* 3 Metric Stat Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            maxWidth: '560px',
            width: '100%'
          }}>
            {[
              { val: '14.2M', label: 'Lines reviewed' },
              { val: '98,000+', label: 'Bugs fixed' },
              { val: '4.3 min', label: 'Avg review time' }
            ].map((stat, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#e2e5f0', marginBottom: '4px' }}>
                  {stat.val}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#8993b8' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {quickScanSection && (
          <div id="github-quick-scan" style={{ padding: '20px 0 80px', scrollMarginTop: '90px' }}>
            {quickScanSection}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* SECTION 2: CAPABILITIES GRID */}
        {/* ---------------------------------------------------- */}
        <section style={{ padding: '100px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              background: 'rgba(108, 142, 239, 0.12)',
              color: '#6c8eef',
              border: '1px solid rgba(108, 142, 239, 0.25)',
              marginBottom: '16px'
            }}>
              Capabilities
            </span>

            <h2 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#e2e5f0', letterSpacing: '-0.02em', marginBottom: '12px' }}>
              Everything your code needs
            </h2>
            
            <p style={{ fontSize: '1rem', color: '#7880a0', maxWidth: '520px', margin: '0 auto' }}>
              Built for teams that ship fast and can't afford to compromise on quality.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {capabilities.map((cap, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '28px',
                transition: 'all 0.3s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
              }}
              >
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: `${cap.color}18`,
                  border: `1px solid ${cap.color}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  color: cap.color,
                  marginBottom: '20px'
                }}>
                  {cap.icon}
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#e2e5f0', marginBottom: '8px' }}>
                  {cap.title}
                </h3>

                <p style={{ fontSize: '0.88rem', color: '#929abd', lineHeight: '1.6' }}>
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </section>


        {/* ---------------------------------------------------- */}
        {/* SECTION 3: LIVE INTERACTIVE DEMO "Watch Lunar work" */}
        {/* ---------------------------------------------------- */}
        <section style={{ padding: '100px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              background: 'rgba(157, 110, 245, 0.12)',
              color: '#9d6ef5',
              border: '1px solid rgba(157, 110, 245, 0.25)',
              marginBottom: '16px'
            }}>
              Live Demo
            </span>

            <h2 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#e2e5f0', letterSpacing: '-0.02em', marginBottom: '12px' }}>
              Watch Lunar work
            </h2>

            <p style={{ fontSize: '1rem', color: '#7880a0' }}>
              Real issues found in a real function. Click "Auto-fix" to see Lunar repair it.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 340px',
            gap: '20px',
            alignItems: 'start'
          }}>
            
            {/* Left Box: Code Window */}
            <div style={{
              background: '#090b18',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              {/* Window Bar */}
              <div style={{
                background: '#0d0f1e',
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f97316' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#8b94b8', marginLeft: '8px' }}>
                    userService.ts
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setDemoState('before')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      background: demoState === 'before' ? 'rgba(108, 142, 239, 0.18)' : 'transparent',
                      color: demoState === 'before' ? '#6c8eef' : '#8b94b8',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Before
                  </button>

                  <button
                    onClick={() => setDemoState('after')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      background: demoState === 'after' ? 'rgba(34, 197, 94, 0.18)' : 'transparent',
                      color: demoState === 'after' ? '#86efac' : '#8b94b8',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    After fix
                  </button>
                </div>
              </div>

              {/* Code Diff Display */}
              <div style={{ padding: '16px 0', fontFamily: 'var(--font-mono)', fontSize: '0.84rem', lineHeight: '1.65' }}>
                {(demoState === 'before' ? beforeCodeLines : afterCodeLines).map((line, i) => {
                  const bg = line.type === 'add' ? 'rgba(34, 197, 94, 0.08)' : line.type === 'remove' ? 'rgba(239, 68, 68, 0.08)' : 'transparent';
                  const symbol = line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' ';
                  const textColor = line.type === 'add' ? '#86efac' : line.type === 'remove' ? '#fca5a5' : '#a0a8c0';
                  
                  return (
                    <div key={i} style={{ display: 'flex', gap: '16px', padding: '2px 20px', background: bg }}>
                      <span style={{ width: '24px', textAlign: 'right', color: '#8b94b8', userSelect: 'none', shrink: 0 }}>
                        {line.num}
                      </span>
                      <span style={{ width: '12px', color: textColor, userSelect: 'none', shrink: 0 }}>
                        {symbol}
                      </span>
                      <span style={{ color: textColor, whiteSpace: 'pre' }}>
                        {line.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Action Bar */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', background: '#070812' }}>
                <button
                  onClick={handleRunAutoFix}
                  disabled={isAutoFixing || demoState === 'after'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #6c8eef, #9d6ef5)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: demoState === 'after' ? 'default' : 'pointer',
                    opacity: demoState === 'after' ? 0.6 : 1
                  }}
                >
                  {isAutoFixing ? 'Applying fix…' : demoState === 'after' ? '✓ Fix applied' : '⚡ Auto-fix all issues'}
                </button>
              </div>
            </div>

            {/* Right Box: AI Analysis Issues Panel */}
            <div style={{
              background: '#090b18',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#e2e5f0' }}>
                  AI Analysis
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: demoState === 'after' ? '#22c55e' : '#ef4444' }}>
                  {demoState === 'after' ? '0 issues' : `${aiIssues.length} issues`}
                </span>
              </div>

              {/* Issue list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {aiIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedIssueIdx(idx)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${issue.color}25`,
                      background: `${issue.color}08`,
                      cursor: 'pointer',
                      opacity: demoState === 'after' ? 0.35 : 1,
                      textDecoration: demoState === 'after' ? 'line-through' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: issue.color }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: '700', color: issue.color }}>
                        {issue.label}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#8b94b8', marginLeft: 'auto' }}>
                        line {issue.line}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#7880a0', lineHeight: '1.4' }}>
                      {issue.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Lunar Recommendation Box */}
              <div style={{
                background: 'rgba(108, 142, 239, 0.06)',
                border: '1px solid rgba(108, 142, 239, 0.18)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '0.78rem',
                lineHeight: '1.5'
              }}>
                <div style={{ fontWeight: '700', color: '#6c8eef', marginBottom: '2px' }}>
                  Lunar suggests:
                </div>
                <div style={{ color: '#7880a0' }}>
                  {aiIssues[selectedIssueIdx].type === 'error'
                    ? 'This is a critical vulnerability. Lunar can generate a safe replacement with input sanitization and try-catch boundaries.'
                    : 'A quick refactor following best practices. Lunar can apply this change across your entire codebase.'}
                </div>
              </div>
            </div>

          </div>
        </section>


        {/* ---------------------------------------------------- */}
        {/* SECTION 4: GITHUB INTEGRATION */}
        {/* ---------------------------------------------------- */}
        <section style={{ padding: '100px 0' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '60px',
            alignItems: 'center'
          }}>
            <div>
              <span style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '700',
                background: 'rgba(79, 195, 247, 0.12)',
                color: '#4fc3f7',
                border: '1px solid rgba(79, 195, 247, 0.25)',
                marginBottom: '16px'
              }}>
                GitHub Integration
              </span>

              <h2 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#e2e5f0', letterSpacing: '-0.02em', marginBottom: '16px' }}>
                Connect in 30 seconds
              </h2>

              <p style={{ fontSize: '1rem', color: '#7880a0', lineHeight: '1.65', marginBottom: '32px' }}>
                OAuth with GitHub. Select your repos. Lunar handles the rest — webhooks, CI checks, PR comments, and auto-fix branches are all configured automatically.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px' }}>
                {[
                  { icon: '◎', text: 'OAuth 2.0 — no passwords stored' },
                  { icon: '◈', text: 'Fine-grained repo permissions' },
                  { icon: '⟳', text: 'Automatic webhook setup' },
                  { icon: '◇', text: 'Works with GitHub.com and Enterprise' }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#a0a8c0' }}>
                    <span style={{ color: '#4fc3f7', fontWeight: 'bold' }}>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onOpenAuth}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  background: '#161b22',
                  color: '#e2e5f0',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: 'pointer'
                }}
              >
                <Github size={18} />
                Connect with GitHub
              </button>
            </div>

            {/* Repos status mock container */}
            <div style={{
              background: '#090b18',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#0d0f1e',
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Github size={16} color="#8993b8" />
                  <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#e2e5f0' }}>acme-corp</span>
                </div>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(34, 197, 94, 0.12)', color: '#86efac' }}>
                  connected
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {connectedRepos.map((repo, idx) => (
                  <div key={idx} style={{
                    padding: '16px 20px',
                    borderBottom: idx < connectedRepos.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: '700', color: '#e2e5f0', marginBottom: '2px' }}>
                        {repo.name.split('/')[1]}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#8b94b8' }}>
                        {repo.lang} · <span style={{ color: repo.issues > 5 ? '#f97316' : '#7880a0' }}>{repo.issues} issues</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '50px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${repo.score}%`, height: '100%', background: repo.score >= 90 ? '#22d3ee' : repo.score >= 80 ? '#6c8eef' : '#ef4444' }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: repo.score >= 90 ? '#22d3ee' : '#6c8eef' }}>
                          {repo.score}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.72rem', color: repo.status === 'passing' ? '#22c55e' : repo.status === 'reviewing' ? '#6c8eef' : '#ef4444' }}>
                        ● {repo.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* ---------------------------------------------------- */}
        {/* SECTION 5: DASHBOARD COMMAND CENTER PREVIEW */}
        {/* ---------------------------------------------------- */}
        <section style={{ padding: '100px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              background: 'rgba(108, 142, 239, 0.12)',
              color: '#6c8eef',
              border: '1px solid rgba(108, 142, 239, 0.25)',
              marginBottom: '16px'
            }}>
              Dashboard
            </span>

            <h2 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#e2e5f0', letterSpacing: '-0.02em' }}>
              Your command center
            </h2>
          </div>

          <LiveDashboardPreview
            currentUser={currentUser}
            onOpenAuth={onOpenAuth}
            onOpenDashboard={onOpenDashboard}
          />
        </section>


        {/* ---------------------------------------------------- */}
        {/* SECTION 6: PRICING (TIẾNG VIỆT CHUẨN) */}
        {/* ---------------------------------------------------- */}
        <section style={{ padding: '100px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              background: 'rgba(157, 110, 245, 0.12)',
              color: '#9d6ef5',
              border: '1px solid rgba(157, 110, 245, 0.25)',
              marginBottom: '16px'
            }}>
              Bảng Giá Lunar.dev
            </span>

            <h2 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#e2e5f0', letterSpacing: '-0.02em', marginBottom: '12px' }}>
              Nâng Cấp Quyền Hạn Lunar AI
            </h2>

            <p style={{ fontSize: '1.05rem', fontWeight: '600', color: '#6c8eef', marginBottom: '6px' }}>
              Chọn Gói Cước Phù Hợp Với Bạn
            </p>
            <p style={{ fontSize: '0.92rem', color: '#7880a0', marginBottom: '24px' }}>
              Mở khóa tính năng Tự Động Vá Lỗi Mã Nguồn & GitHub Security Bot
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            alignItems: 'stretch'
          }}>
            {pricingPlans.map((plan, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  background: plan.highlight ? 'linear-gradient(145deg, rgba(108, 142, 239, 0.12), rgba(157, 110, 245, 0.08))' : 'rgba(255, 255, 255, 0.025)',
                  border: plan.highlight ? '1px solid rgba(108, 142, 239, 0.35)' : '1px solid rgba(255, 255, 255, 0.07)',
                  boxShadow: plan.highlight ? '0 0 60px rgba(108, 142, 239, 0.1)' : 'none',
                  borderRadius: '20px',
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)' }}>
                    <span style={{
                      padding: '4px 16px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #6c8eef, #9d6ef5)',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(108,142,239,0.3)'
                    }}>
                      {plan.popularLabel || '🔥 Phổ Biến Nhất'}
                    </span>
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#e2e5f0', marginBottom: '6px' }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#7880a0', marginBottom: '20px' }}>
                    {plan.desc}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: '900', color: '#e2e5f0', letterSpacing: '-0.03em' }}>
                      {plan.displayPrice}
                    </span>
                    <span style={{ fontSize: '0.88rem', color: '#8993b8' }}>{plan.period}</span>
                  </div>

                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    {plan.features.map((feat, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#a0a8c0' }}>
                        <span style={{ color: '#6c8eef', fontWeight: 'bold' }}>✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onOpenPricing && onOpenPricing(plan.id)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    background: plan.highlight ? 'linear-gradient(135deg, #6c8eef, #9d6ef5)' : 'rgba(255, 255, 255, 0.05)',
                    color: plan.highlight ? '#ffffff' : '#a0a8c0',
                    border: plan.highlight ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    boxShadow: plan.highlight ? '0 0 24px rgba(108, 142, 239, 0.3)' : 'none'
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <span style={{ fontSize: '0.78rem', color: '#8b94b8' }}>Secured by</span>
            {['Stripe', 'Visa', 'Mastercard', 'PayPal'].map((brand, idx) => (
              <span key={idx} style={{ fontSize: '0.78rem', fontWeight: '700', color: '#8b94b8' }}>
                {brand}
              </span>
            ))}
          </div>
        </section>


        {/* ---------------------------------------------------- */}
        {/* SECTION 7: TESTIMONIALS */}
        {/* ---------------------------------------------------- */}
        <section style={{ padding: '100px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              background: 'rgba(108, 142, 239, 0.12)',
              color: '#6c8eef',
              border: '1px solid rgba(108, 142, 239, 0.25)',
              marginBottom: '16px'
            }}>
              Testimonials
            </span>

            <h2 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#e2e5f0', letterSpacing: '-0.02em' }}>
              Trusted by engineering teams
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {testimonials.map((test, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '2rem', color: test.color, marginBottom: '16px', lineHeight: 1 }}>
                    ❝
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#8890b0', lineHeight: '1.65', marginBottom: '24px' }}>
                    {test.quote}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: `${test.color}20`,
                    color: test.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: '800'
                  }}>
                    {test.avatar}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#e2e5f0' }}>{test.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#8b94b8' }}>{test.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>


        {/* ---------------------------------------------------- */}
        {/* SECTION 8: FOOTER */}
        {/* ---------------------------------------------------- */}
        <section style={{ padding: '60px 0', textAlign: 'center', position: 'relative' }}>
          {/* Footer */}
          <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '60px', textAlign: 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '40px', marginBottom: '60px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #6c8eef, #9d6ef5)' }} />
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#e2e5f0' }}>lunar</span>
                </div>
                <p style={{ fontSize: '0.84rem', color: '#8b94b8', maxWidth: '280px', lineHeight: '1.6' }}>
                  AI-powered code review and auto-fix platform. Ship faster, break less.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', tracking: '0.1em', color: '#7f89ad', marginBottom: '16px' }}>Product</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem', color: '#8b94b8' }}>
                  <span>Features</span>
                  <span>Pricing</span>
                  <span>Changelog</span>
                  <span>Roadmap</span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', tracking: '0.1em', color: '#7f89ad', marginBottom: '16px' }}>Docs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem', color: '#8b94b8' }}>
                  <span>Getting started</span>
                  <span>API reference</span>
                  <span>GitHub App</span>
                  <span>CLI</span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', tracking: '0.1em', color: '#7f89ad', marginBottom: '16px' }}>Company</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem', color: '#8b94b8' }}>
                  <span>About</span>
                  <span>Blog</span>
                  <span>Careers</span>
                  <span>Privacy</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#7f89ad' }}>
              <div>© 2025 Lunar Technologies, Inc. All rights reserved.</div>
              <div>Built for developers who care about quality.</div>
            </div>
          </footer>
        </section>

      </div>
    </div>
  );
}
