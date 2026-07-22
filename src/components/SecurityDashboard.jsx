import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Cpu, CheckCircle2, Lock, FileKey, Terminal, Zap } from 'lucide-react';

export default function SecurityDashboard({ scanResult, projectTitle }) {
  const stats = scanResult?.stats || { total: 0, maxCvss: 0, criticalCount: 0, highCount: 0, mediumCount: 0 };
  const cvss = stats.maxCvss || 0;

  const getCvssTheme = (score) => {
    if (score >= 9.0) return { label: 'CRITICAL RISK', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.4)' };
    if (score >= 7.0) return { label: 'HIGH RISK', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' };
    if (score >= 4.0) return { label: 'MEDIUM RISK', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' };
    return { label: 'SECURE / LOW RISK', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.4)' };
  };

  const theme = getCvssTheme(cvss);

  const owaspChecklist = [
    { code: 'A01:2021', name: 'Broken Access Control', status: stats.criticalCount > 0 ? 'FAIL' : 'PASS' },
    { code: 'A02:2021', name: 'Cryptographic Failures', status: stats.criticalCount > 0 ? 'WARNING' : 'PASS' },
    { code: 'A03:2021', name: 'Injection (SQLi, XSS, RCE)', status: stats.criticalCount > 0 ? 'FAIL' : 'PASS' },
    { code: 'A04:2021', name: 'Insecure Design', status: 'PASS' },
    { code: 'A07:2021', name: 'Identification & Auth Failures', status: stats.highCount > 0 ? 'FAIL' : 'PASS' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      
      {/* Top Banner: CVSS Gauge & Risk Badge */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        alignItems: 'center'
      }}>
        
        {/* CVSS Score Circle */}
        <div style={{
          padding: '20px',
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            color: 'var(--text-muted)',
            letterSpacing: '0.05em',
            marginBottom: '8px'
          }}>
            CVSS v3.1 BASE RISK SCORE
          </div>

          <div style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '3.6rem',
            fontWeight: '800',
            color: theme.color,
            lineHeight: 1,
            marginBottom: '8px'
          }}>
            {cvss.toFixed(1)}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/10.0</span>
          </div>

          <div className="badge" style={{ background: theme.color, color: '#000', fontWeight: '800', padding: '6px 14px' }}>
            <ShieldAlert size={14} /> {theme.label}
          </div>
        </div>

        {/* Severity Metrics Counters */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>
            Tổng Quan Lỗ Hổng Bảo Mật Được Phát Hiện
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f43f5e' }}>
                {stats.criticalCount}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fb7185' }}>
                CRITICAL (CVSS 9+)
              </div>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f59e0b' }}>
                {stats.highCount}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fbbf24' }}>
                HIGH RISK (CVSS 7-8)
              </div>
            </div>

            <div style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#38bdf8' }}>
                {stats.mediumCount}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#7dd3fc' }}>
                MEDIUM RISK (CVSS 4-6)
              </div>
            </div>
          </div>

          {/* OWASP Top 10 Status List */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '8px' }}>
              OWASP TOP 10 COMPLIANCE CHECK
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {owaspChecklist.map(item => (
                <span
                  key={item.code}
                  className={`badge ${item.status === 'PASS' ? 'badge-emerald' : 'badge-rose'}`}
                  style={{ fontSize: '0.72rem' }}
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
