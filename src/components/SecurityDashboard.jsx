import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Cpu, CheckCircle2, Lock, Terminal, Zap, Activity } from 'lucide-react';

export default function SecurityDashboard({ scanResult, projectTitle }) {
  const stats = scanResult?.stats || { total: 0, maxCvss: 0, criticalCount: 0, highCount: 0, mediumCount: 0 };
  const cvss = stats.maxCvss || 0;

  const getCvssTheme = (score) => {
    if (score >= 9.0) return { label: 'CRITICAL RISK', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: '#f43f5e' };
    if (score >= 7.0) return { label: 'HIGH RISK', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' };
    if (score >= 4.0) return { label: 'MEDIUM RISK', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' };
    return { label: 'SECURE / LOW RISK', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: '#10b981' };
  };

  const theme = getCvssTheme(cvss);

  const owaspChecklist = [
    { code: 'A01:2021', name: 'Broken Access Control', status: stats.criticalCount > 0 ? 'FAIL' : 'PASS' },
    { code: 'A02:2021', name: 'Cryptographic Failures', status: stats.criticalCount > 0 ? 'WARNING' : 'PASS' },
    { code: 'A03:2021', name: 'Injection (SQLi, XSS, RCE)', status: stats.criticalCount > 0 ? 'FAIL' : 'PASS' },
    { code: 'A04:2021', name: 'Insecure Design', status: 'PASS' },
    { code: 'A07:2021', name: 'Auth Failures', status: stats.highCount > 0 ? 'FAIL' : 'PASS' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px', overflow: 'hidden' }}>
      
      {/* Top Graphic Dashboard Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '28px',
        alignItems: 'center'
      }}>
        
        {/* Graphic Risk Gauge */}
        <div style={{
          padding: '24px',
          background: theme.bg,
          border: `1.5px solid ${theme.border}`,
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: `0 0 35px ${theme.border}44`,
          position: 'relative'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '800',
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            marginBottom: '10px'
          }}>
            CVSS v3.1 BASE THREAT SCORE
          </div>

          {/* SVG Circular Meter */}
          <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="10" />
              <circle
                cx="65"
                cy="65"
                r="54"
                fill="none"
                stroke={theme.color}
                strokeWidth="10"
                strokeDasharray={339}
                strokeDashoffset={339 - (339 * (cvss / 10))}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 8px ${theme.color})` }}
              />
            </svg>

            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.6rem', fontWeight: '900', color: '#ffffff', lineHeight: 1 }}>
                {cvss.toFixed(1)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 10.0</div>
            </div>
          </div>

          <div className="badge" style={{ background: theme.color, color: '#000', fontWeight: '900', padding: '6px 16px', fontSize: '0.82rem' }}>
            <ShieldAlert size={14} /> {theme.label}
          </div>
        </div>

        {/* Severity Metrics Counters */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--accent-rose)" />
              <span>SOC Threat Intelligence & OWASP Status</span>
            </h3>
            <span className="badge badge-rose">Real-time SAST</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '18px' }}>
            <div style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>
                {stats.criticalCount}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#fb7185' }}>
                CRITICAL (CVSS 9+)
              </div>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                {stats.highCount}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#fbbf24' }}>
                HIGH RISK (CVSS 7-8)
              </div>
            </div>

            <div style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {stats.mediumCount}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#7dd3fc' }}>
                MEDIUM RISK (CVSS 4-6)
              </div>
            </div>
          </div>

          {/* OWASP Top 10 Grid Badges */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px 18px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '10px', textTransform: 'uppercase' }}>
              OWASP TOP 10 SECURITY AUDIT CHECKLIST
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {owaspChecklist.map(item => (
                <span
                  key={item.code}
                  className={`badge ${item.status === 'PASS' ? 'badge-emerald' : 'badge-rose'}`}
                  style={{ fontSize: '0.74rem', padding: '6px 12px' }}
                >
                  {item.status === 'PASS' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  {item.code}: {item.name}
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
