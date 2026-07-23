import React, { useState } from 'react';
import { Github, Sparkles, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Bot, Code, Cpu, Eye, Activity, RefreshCw, Check, Moon } from 'lucide-react';

export default function FigmaLunarLanding({ onOpenAuth, onOpenSubmit, onOpenGitBot, onSelectDemoProject }) {
  // State for Interactive "Watch Lunar Work" Live Demo Editor
  const [demoState, setDemoState] = useState('before'); // 'before' | 'after'
  const [isAutoFixing, setIsAutoFixing] = useState(false);

  const beforeCode = `async function fetchUserData(userId) {
  const res = await fetch('/api/users/' + userId)
  const data = res.json()
  
  if (data.admin == true) {
    executeAdminCommand(data.cmd)
  }
  
  return data
}`;

  const afterCode = `async function fetchUserData(userId: string): Promise<UserData> {
  const res = await fetch(\`/api/users/\${encodeURIComponent(userId)}\`)
  if (!res.ok) throw new Error('Failed to fetch user')
  
  const data: UserData = await res.json()
  
  if (data.admin === true && isValidCmd(data.cmd)) {
    await executeAdminCommandSanitized(data.cmd)
  }
  
  return data
}`;

  const handleRunAutoFix = () => {
    setIsAutoFixing(true);
    setTimeout(() => {
      setDemoState('after');
      setIsAutoFixing(false);
    }, 800);
  };

  const aiIssues = [
    { type: 'critical', title: 'Command Injection', line: 6, desc: 'Unsanitized cmd passed to executeAdminCommand', color: '#f87171' },
    { type: 'critical', title: 'Missing await', line: 3, desc: 'res.json() returns a Promise — missing await', color: '#f87171' },
    { type: 'warning', title: 'Express Csurf Middleware Usage', line: 8, desc: 'CWE-352: Thiếu middleware chống CSRF csurf', color: '#fbbf24' },
    { type: 'warning', title: 'Node Postgres Sqli Triage', line: 38, desc: 'CWE-89: AI Verdict False Positive (10/10)', color: '#38bdf8' },
    { type: 'info', title: 'Type Safety', line: 1, desc: 'Add TypeScript types for safety', color: '#34d399' }
  ];

  const connectedRepos = [
    { name: 'frontend-app', lang: 'TypeScript', issues: '3 issues', score: 94, status: 'passing', color: '#34d399' },
    { name: 'api-server-express', lang: 'Go / Node', issues: '7 issues', score: 81, status: 'reviewing', color: '#38bdf8' },
    { name: 'auth-service', lang: 'Swift / TS', issues: '1 issues', score: 97, status: 'passing', color: '#34d399' },
    { name: 'data-pipeline', lang: 'Python', issues: '12 issues', score: 68, status: 'failed', color: '#f87171' }
  ];

  const capabilities = [
    {
      icon: Sparkles,
      color: '#c084fc',
      title: 'AI Code Review & 5-Metric Score',
      desc: 'Phân tích sâu ngữ nghĩa mã nguồn qua 5 khía cạnh độc lập: Naming, Architecture, Performance, Security & Readability.'
    },
    {
      icon: RefreshCw,
      color: '#38bdf8',
      title: 'Auto-Fix Engine & PR Bot',
      desc: 'Một chạm tự động tạo mã sửa lỗi safe code và tạo Pull Request chứa bản vá 1-Click trên GitHub.'
    },
    {
      icon: Github,
      color: '#6366f1',
      title: 'GitHub CI/CD Integration',
      desc: 'Tự động chạy quy trình kiểm tra bảo mật SAST mỗi khi có Push / Pull Request mới.'
    },
    {
      icon: ShieldCheck,
      color: '#f87171',
      title: 'OWASP Top 10 Security Scanning',
      desc: 'Quét toàn bộ lỗ hổng SQLi, XSS, CSRF, Hardcoded Secrets, JWT Signature Failure & RCE.'
    },
    {
      icon: Code,
      color: '#34d399',
      title: 'Code Patch Diff View',
      desc: 'Giao diện xem đối sánh mã nguồn gốc RED BEFORE vs mã đã vá GREEN AFTER trực quan.'
    },
    {
      icon: Activity,
      color: '#fbbf24',
      title: 'White-Hat Cyber Community',
      desc: 'Cộng đồng các chuyên gia an toàn thông tin thảo luận Zero-day, Pentest và chia sẻ kinh nghiệm phòng thủ.'
    }
  ];

  const testimonials = [
    {
      quote: 'Lunar caught a critical injection vulnerability in our payment service that had been sitting undetected for 8 months. The auto-fix PR was merged within 10 minutes.',
      name: 'Sarah Chen',
      role: 'Senior Engineer @ Stripe',
      initials: 'SC'
    },
    {
      quote: 'We went from 6-hour manual reviews to 12-minute automated ones. Our team\'s velocity doubled in the first sprint alone.',
      name: 'Marcus Reid',
      role: 'CTO @ Vercel',
      initials: 'MR'
    },
    {
      quote: 'The GitHub integration is seamless. Every PR gets a thorough review before any human even looks at it. Our codebase quality score went from 61 to 94 in 3 months.',
      name: 'Priya Nair',
      role: 'Lead Developer @ Linear',
      initials: 'PN'
    }
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingTop: '40px' }}>
      
      {/* SECTION 1: HERO */}
      <div style={{ textAlign: 'center', marginBottom: '80px', position: 'relative' }}>
        
        {/* Hero Announcement Pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <div className="badge badge-purple" style={{ padding: '6px 16px', fontSize: '0.82rem', borderRadius: '999px' }}>
            <Sparkles size={14} color="#c084fc" />
            <span>✦ Lunar.dev AI Engine v2.0 • Code review that fixes itself</span>
          </div>
        </div>

        {/* Hero Main Headline */}
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '4.2rem',
          fontWeight: '800',
          letterSpacing: '-0.035em',
          lineHeight: '1.1',
          marginBottom: '20px',
          color: '#ffffff'
        }}>
          Code review that <span className="gradient-text">fixes itself</span>
        </h1>

        {/* Hero Subtitle */}
        <p style={{
          fontSize: '1.15rem',
          color: 'var(--text-secondary)',
          maxWidth: '720px',
          margin: '0 auto 36px auto',
          lineHeight: '1.65'
        }}>
          Lunar connects to your GitHub repos, reviews every PR with AI, and opens auto-fix pull requests — so your team ships faster with fewer bugs.
        </p>

        {/* Hero CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '56px' }}>
          <button
            onClick={onOpenAuth}
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '999px' }}
          >
            <Github size={18} />
            Connect GitHub — it's free
          </button>

          <button
            onClick={onOpenSubmit}
            className="btn btn-secondary"
            style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '999px' }}
          >
            View live demo →
          </button>
        </div>

        {/* Hero 3 Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.4rem', fontWeight: '800', color: '#ffffff', lineHeight: 1.1 }}>
              14.2M
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Lines reviewed
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.4rem', fontWeight: '800', color: 'var(--accent-purple)', lineHeight: 1.1 }}>
              98,000+
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Bugs fixed
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.4rem', fontWeight: '800', color: 'var(--accent-cyan)', lineHeight: 1.1 }}>
              4.3 min
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Avg review time
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 2: LIVE DEMO "Watch Lunar work" */}
      <div style={{ marginBottom: '100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="badge badge-purple" style={{ marginBottom: '12px' }}>
            Live Demo
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.6rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '10px' }}>
            Watch Lunar work
          </h2>

          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
            Real issues found in a real function. Click "Auto-fix" to see Lunar repair it.
          </p>
        </div>

        {/* Interactive Editor + AI Analysis Container */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
          alignItems: 'start'
        }}>
          
          {/* Left Window: Code Editor */}
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            
            {/* Editor Header Bar */}
            <div style={{
              background: '#0d111a',
              padding: '12px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f87171' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', marginLeft: '12px' }}>
                  userService.ts
                </span>
              </div>

              {/* Before / After Fix Toggle Pills */}
              <div style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '3px', borderRadius: '6px', display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setDemoState('before')}
                  style={{
                    background: demoState === 'before' ? 'rgba(124, 58, 237, 0.4)' : 'transparent',
                    border: 'none',
                    color: demoState === 'before' ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Before
                </button>
                <button
                  onClick={() => setDemoState('after')}
                  style={{
                    background: demoState === 'after' ? 'rgba(52, 211, 153, 0.3)' : 'transparent',
                    border: 'none',
                    color: demoState === 'after' ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  After fix
                </button>
              </div>
            </div>

            {/* Code Editor Body */}
            <div style={{
              background: '#080b12',
              padding: '20px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              color: demoState === 'before' ? '#e2e8f0' : '#6ee7b7',
              minHeight: '260px',
              overflowX: 'auto'
            }}>
              {(demoState === 'before' ? beforeCode : afterCode).split('\n').map((line, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ color: 'var(--text-muted)', width: '24px', textAlign: 'right', userSelect: 'none' }}>
                    {idx + 1}
                  </span>
                  <span style={{ whiteSpace: 'pre' }}>{line}</span>
                </div>
              ))}
            </div>

            {/* Bottom Auto-Fix Action Bar */}
            <div style={{ padding: '16px', background: '#0a0d16', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                onClick={handleRunAutoFix}
                className="btn btn-primary"
                disabled={isAutoFixing}
                style={{ width: '100%', padding: '12px' }}
              >
                <Zap size={16} />
                {isAutoFixing ? 'Fixing with Lunar AI...' : '⚡ Auto-fix all issues'}
              </button>
            </div>

          </div>

          {/* Right Column: AI Analysis Issues Panel */}
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff' }}>
                Lunar AI Analysis
              </h3>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                {demoState === 'before' ? '5 issues' : '0 issues (Verified)'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {aiIssues.map((issue, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${issue.color}44`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px',
                    opacity: demoState === 'after' ? 0.4 : 1,
                    textDecoration: demoState === 'after' ? 'line-through' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: issue.color }} />
                      <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#ffffff' }}>
                        {issue.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      line {issue.line}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                    {issue.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* AI Suggestion Banner */}
            <div style={{
              background: 'rgba(124, 58, 237, 0.1)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '0.82rem',
              color: '#c084fc',
              lineHeight: '1.5'
            }}>
              <strong>Lunar suggests:</strong> This is a critical issue. Lunar can generate a secure replacement with proper sanitization and error boundaries.
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 3: CAPABILITIES */}
      <div style={{ marginBottom: '100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="badge badge-purple" style={{ marginBottom: '14px' }}>
            Lunar Capabilities
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.8rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Everything your code needs
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
            Built for teams that ship fast and can't afford to compromise on quality.
          </p>
        </div>

        {/* 6 Capabilities Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {capabilities.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div key={idx} className="glass-card" style={{ padding: '28px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: `${item.color}22`,
                  border: `1px solid ${item.color}44`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <IconComponent size={20} color={item.color} />
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#ffffff', marginBottom: '10px' }}>
                  {item.title}
                </h3>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: TESTIMONIALS */}
      <div style={{ marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="badge badge-purple" style={{ marginBottom: '14px' }}>
            Testimonials
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.8rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em' }}>
            Trusted by engineering teams
          </h2>
        </div>

        {/* 3 Testimonials Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {testimonials.map((test, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '1.8rem', color: 'var(--accent-purple)', lineHeight: 1, display: 'block', marginBottom: '16px' }}>
                  “
                </span>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.65', marginBottom: '24px' }}>
                  {test.quote}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(124, 58, 237, 0.2)',
                  border: '1px solid rgba(167, 139, 250, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#c084fc'
                }}>
                  {test.initials}
                </div>

                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#ffffff' }}>
                    {test.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {test.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
