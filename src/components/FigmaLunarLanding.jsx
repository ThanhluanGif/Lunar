import React, { useState } from 'react';
import { Github, Sparkles, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Bot, Code, Cpu, Eye, Activity, RefreshCw, Check } from 'lucide-react';

export default function FigmaLunarLanding({ onOpenAuth, onOpenSubmit, onOpenGitBot, onSelectDemoProject }) {
  // State for Interactive "Watch SecuSense Work" Live Demo Editor
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
      color: '#38bdf8',
      title: 'AI Triage True/False Positive',
      desc: 'Giảm thiểu tới 90% cảnh báo giả (False Positive) từ Semgrep và phân tích lý do bằng tiếng Việt.'
    },
    {
      icon: RefreshCw,
      color: '#a855f7',
      title: 'Auto-Patch Engine',
      desc: 'Tự động tạo đoạn mã sửa lỗi safe code và tạo Pull Request chứa bản vá 1-Click trên GitHub.'
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
      title: 'OWASP Top 10 & CWE Coverage',
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
      quote: 'SecuSense đã giúp đội ngũ phát triển của chúng tôi giảm 85% thời gian xem cảnh báo giả từ Semgrep và tự động vá lỗi CSRF chỉ trong 2 phút.',
      name: 'Nguyễn Hoàng Nam',
      role: 'Head of Security @ TechCorp',
      initials: 'HN'
    },
    {
      quote: 'Giao diện AI Triage bằng tiếng Việt cực kỳ rõ ràng. Cả Dev và Security Team đều hiểu chính xác nguyên nhân vì sao nguy hiểm.',
      name: 'Trần Minh Đức',
      role: 'Tech Lead @ Vercel Team',
      initials: 'MĐ'
    },
    {
      quote: 'Tích hợp GitHub PR Bot rất mượt mà. Mọi Pull Request đều được kiểm tra SAST tự động trước khi merge.',
      name: 'Lê Thu Trang',
      role: 'Senior DevSecOps @ Stripe',
      initials: 'TT'
    }
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingTop: '40px' }}>
      
      {/* SECTION 1: HERO */}
      <div style={{ textAlign: 'center', marginBottom: '80px', position: 'relative' }}>
        
        {/* Hero Announcement Pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <div className="badge badge-cyan" style={{ padding: '6px 16px', fontSize: '0.82rem', borderRadius: '999px' }}>
            <Sparkles size={14} color="var(--accent-cyan)" />
            <span>🛡️ SecuSense SAST Assistant v2.0 • AI Triage Engine</span>
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
          Tự Động AI Triage & <span className="gradient-text">Vá Lỗ Hổng Bảo Mật</span>
        </h1>

        {/* Hero Subtitle */}
        <p style={{
          fontSize: '1.15rem',
          color: 'var(--text-secondary)',
          maxWidth: '720px',
          margin: '0 auto 36px auto',
          lineHeight: '1.65'
        }}>
          SecuSense phân tích cảnh báo Semgrep, tự động đánh giá True Positive / False Positive và đề xuất phương án sửa lỗi mã nguồn trực tiếp bằng tiếng Việt.
        </p>

        {/* Hero CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '56px' }}>
          <button
            onClick={onOpenSubmit}
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '999px' }}
          >
            <ShieldCheck size={18} />
            Khởi Chạy Quét SAST Ngay
          </button>

          <button
            onClick={onOpenAuth}
            className="btn btn-secondary"
            style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '999px' }}
          >
            <Github size={18} />
            Kết Nối GitHub OAuth →
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
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.4rem', fontWeight: '800', color: 'var(--accent-cyan)', lineHeight: 1.1 }}>
              14.2M+
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Dòng Code Đã Kiểm Định
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.4rem', fontWeight: '800', color: '#34d399', lineHeight: 1.1 }}>
              90%
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Giảm Cảnh Báo Giả (False Positives)
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.4rem', fontWeight: '800', color: '#c084fc', lineHeight: 1.1 }}>
              1-Click
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Auto-Fix GitHub Pull Request
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 2: LIVE DEMO "Watch SecuSense work" */}
      <div style={{ marginBottom: '100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="badge badge-cyan" style={{ marginBottom: '12px' }}>
            SecuSense Live Demo
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.6rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '10px' }}>
            Trải Nghiệm SecuSense AI Triage
          </h2>

          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
            Xem SecuSense tự động phân tích lỗ hổng Semgrep và đề xuất bản vá trực tiếp.
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
                  server/index.js
                </span>
              </div>

              {/* Before / After Fix Toggle Pills */}
              <div style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '3px', borderRadius: '6px', display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setDemoState('before')}
                  style={{
                    background: demoState === 'before' ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
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
                {isAutoFixing ? 'SecuSense AI is Auto-patching...' : '⚡ Auto-fix & Apply Patch'}
              </button>
            </div>

          </div>

          {/* Right Column: SecuSense AI Analysis Issues Panel */}
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff' }}>
                SecuSense AI Triage
              </h3>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {demoState === 'before' ? '5 findings' : '0 findings (Verified)'}
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
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '0.82rem',
              color: '#38bdf8',
              lineHeight: '1.5'
            }}>
              <strong>SecuSense AI Verdict:</strong> Lỗ hổng có mức độ rủi ro cao. SecuSense đề xuất giải pháp vá lỗi tự động bằng csurf middleware và Parameterized Queries.
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 3: CAPABILITIES */}
      <div style={{ marginBottom: '100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="badge badge-cyan" style={{ marginBottom: '14px' }}>
            SecuSense Capabilities
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.8rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Tính Năng Cốt Lõi Của SecuSense SAST
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
            Giải pháp bảo mật mã nguồn tối ưu cho các đội ngũ lập trình hiện đại.
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
          <div className="badge badge-cyan" style={{ marginBottom: '14px' }}>
            Testimonials
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.8rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em' }}>
            Được Đội Ngũ Kỹ Sư Tin Dùng
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
                <span style={{ fontSize: '1.8rem', color: 'var(--accent-cyan)', lineHeight: 1, display: 'block', marginBottom: '16px' }}>
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
                  background: 'rgba(56, 189, 248, 0.2)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#38bdf8'
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
