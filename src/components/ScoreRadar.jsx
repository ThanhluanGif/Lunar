import React from 'react';
import { Award, ShieldAlert, Cpu, Zap, Eye, CheckCircle2, Sparkles, Activity } from 'lucide-react';

export default function ScoreRadar({ overallScore, scores, onShowBadgeModal }) {
  const getScoreColor = (val) => {
    if (val >= 90) return { color: '#34d399', text: 'Xuất sắc (A+)', bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981' };
    if (val >= 80) return { color: '#818cf8', text: 'Rất tốt (A)', bg: 'rgba(99, 102, 241, 0.15)', border: '#6366f1' };
    if (val >= 70) return { color: '#fbbf24', text: 'Khá (B)', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' };
    return { color: '#fb7185', text: 'Cần cải thiện (C)', bg: 'rgba(244, 63, 94, 0.15)', border: '#f43f5e' };
  };

  const overallTheme = getScoreColor(overallScore);

  const metrics = [
    { key: 'naming', label: 'Naming', score: scores?.naming || 85, icon: CheckCircle2, color: '#38bdf8', desc: 'Quy chuẩn đặt tên ngữ nghĩa (PEP8 / Clean Code)' },
    { key: 'architecture', label: 'Architecture', score: scores?.architecture || 88, icon: Cpu, color: '#a855f7', desc: 'Kiến trúc Module, SOLID & Separation of Concerns' },
    { key: 'performance', label: 'Performance', score: scores?.performance || 82, icon: Zap, color: '#f59e0b', desc: 'Tối ưu Async/Await, Memory allocation & I/O' },
    { key: 'security', label: 'Security', score: scores?.security || 90, icon: ShieldAlert, color: '#f43f5e', desc: 'OWASP Top 10, CWE Database, Anti-SQLi/XSS' },
    { key: 'readability', label: 'Readability', score: scores?.readability || 86, icon: Eye, color: '#34d399', desc: 'Mức độ dễ đọc, Format nhất quán & Documentation' }
  ];

  // Compute SVG Radar Chart Points (5 Pentagon points)
  const size = 200;
  const center = size / 2;
  const radius = 80;

  const points = metrics.map((m, i) => {
    const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
    const r = (m.score / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const gridPoints = (factor) => metrics.map((_, i) => {
    const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
    const r = factor * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '36px',
        alignItems: 'center'
      }}>
        
        {/* Left Column: Overall Score & SVG Radar Chart */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRight: '1px solid var(--border-color)',
          paddingRight: '20px',
          textAlign: 'center'
        }}>
          {/* Interactive SVG Radar Spider Chart */}
          <div style={{ position: 'relative', width: '200px', height: '200px', marginBottom: '16px' }}>
            <svg width={size} height={size} style={{ overflow: 'visible' }}>
              {/* Background Web Polygons */}
              {[0.25, 0.5, 0.75, 1.0].map((factor, idx) => (
                <polygon
                  key={idx}
                  points={gridPoints(factor)}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                />
              ))}

              {/* Radial Web Axes */}
              {metrics.map((_, i) => {
                const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                const x2 = center + radius * Math.cos(angle);
                const y2 = center + radius * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Active Score Polygon Filled */}
              <polygon
                points={points}
                fill="rgba(168, 85, 247, 0.25)"
                stroke="#a855f7"
                strokeWidth="2.5"
                style={{ filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.6))' }}
              />

              {/* Point Markers */}
              {metrics.map((m, i) => {
                const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                const r = (m.score / 100) * radius;
                const cx = center + r * Math.cos(angle);
                const cy = center + r * Math.sin(angle);
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="4"
                    fill={m.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>

          {/* Overall Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2.8rem',
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: 1
            }}>
              {overallScore}
            </span>
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>/ 100</span>
          </div>

          <div className="badge" style={{
            background: overallTheme.bg,
            color: overallTheme.color,
            border: `1px solid ${overallTheme.border}`,
            fontSize: '0.85rem',
            padding: '6px 16px',
            marginBottom: '14px'
          }}>
            <Award size={16} />
            {overallTheme.text}
          </div>

          {onShowBadgeModal && (
            <button 
              onClick={onShowBadgeModal}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
            >
              🏅 Xuất Badge README GitHub
            </button>
          )}
        </div>

        {/* Right Column: 5 Graphic Metric Progress Meters */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--accent-purple)" />
              <span>Biểu Đồ Phân Tích 5 Chỉ Số Chất Lượng</span>
            </h3>
            <span className="badge badge-purple">AI Radar</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {metrics.map((item) => {
              const IconComp = item.icon;

              return (
                <div key={item.key}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '0.9rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: `${item.color}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IconComp size={16} color={item.color} />
                      </div>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.label}</span>
                    </div>

                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', color: item.color }}>
                      {item.score} / 100
                    </span>
                  </div>

                  {/* Graphic Gradient Bar */}
                  <div style={{
                    height: '10px',
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${item.score}%`,
                      background: `linear-gradient(90deg, ${item.color}88, ${item.color})`,
                      borderRadius: '6px',
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: `0 0 12px ${item.color}88`
                    }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
