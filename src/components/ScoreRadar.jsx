import React from 'react';
import { Award, ShieldAlert, Cpu, Zap, Eye, CheckCircle2, Info } from 'lucide-react';

export default function ScoreRadar({ overallScore, scores, onShowBadgeModal }) {
  const getScoreColor = (val) => {
    if (val >= 90) return { color: '#34d399', text: 'Xuất sắc (A+)', bg: 'rgba(16, 185, 129, 0.15)' };
    if (val >= 80) return { color: '#6366f1', text: 'Rất tốt (A)', bg: 'rgba(99, 102, 241, 0.15)' };
    if (val >= 70) return { color: '#fbbf24', text: 'Khá (B)', bg: 'rgba(245, 158, 11, 0.15)' };
    return { color: '#fb7185', text: 'Cần cải thiện (C)', bg: 'rgba(244, 63, 94, 0.15)' };
  };

  const overallTheme = getScoreColor(overallScore);

  const metrics = [
    { key: 'naming', label: 'Naming Conventions', score: scores?.naming || 85, icon: CheckCircle2, color: '#38bdf8', desc: 'Quy chuẩn đặt tên biến, hàm, class chuẩn ngữ nghĩa (semantic).' },
    { key: 'architecture', label: 'Architecture & Design', score: scores?.architecture || 88, icon: Cpu, color: '#a855f7', desc: 'Cấu trúc thư mục, mô hình hoá module và tính mở rộng.' },
    { key: 'performance', label: 'Performance', score: scores?.performance || 82, icon: Zap, color: '#f59e0b', desc: 'Tối ưu vòng lặp, xử lý async/await, memory allocation.' },
    { key: 'security', label: 'Security & Safety', score: scores?.security || 90, icon: ShieldAlert, color: '#f43f5e', desc: 'Kiểm tra lỗ hổng XSS, SQLi, hardcoded secret & input validation.' },
    { key: 'readability', label: 'Readability', score: scores?.readability || 86, icon: Eye, color: '#34d399', desc: 'Mức độ dễ đọc, chú thích hàm và sự nhất quán trong format.' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '32px',
        alignItems: 'center'
      }}>
        
        {/* Left Column: Overall Score Badge */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          borderRight: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{
            position: 'relative',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${overallTheme.bg} 0%, transparent 70%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 40px ${overallTheme.color}33`,
            border: `4px solid ${overallTheme.color}`,
            marginBottom: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '3.2rem',
                fontWeight: '800',
                color: '#ffffff',
                lineHeight: 1
              }}>
                {overallScore}
              </span>
              <span style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                fontWeight: '600',
                display: 'block'
              }}>
                / 100
              </span>
            </div>
          </div>

          <div className="badge" style={{
            background: overallTheme.bg,
            color: overallTheme.color,
            border: `1px solid ${overallTheme.color}44`,
            fontSize: '0.85rem',
            padding: '6px 14px',
            marginBottom: '12px'
          }}>
            <Award size={16} />
            {overallTheme.text}
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
            Điểm số tổng hợp được tính toán tự động dựa trên 5 tiêu chí kỹ thuật chuẩn quốc tế.
          </p>

          {onShowBadgeModal && (
            <button 
              onClick={onShowBadgeModal}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '14px', width: '100%' }}
            >
              🏅 Xuất Badge Portfolio README
            </button>
          )}
        </div>

        {/* Right Column: 5 Sub-metric Bars */}
        <div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.1rem',
            fontWeight: '700',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>Chi Tiết 5 Chỉ Số Đánh Giá</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>(AI Evaluated)</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {metrics.map((item) => {
              const IconComp = item.icon;
              const status = getScoreColor(item.score);

              return (
                <div key={item.key}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '0.9rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconComp size={16} color={item.color} />
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: '700',
                        color: status.color
                      }}>
                        {item.score}/100
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Container */}
                  <div style={{
                    height: '8px',
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${item.score}%`,
                      background: `linear-gradient(90deg, ${item.color}aa, ${item.color})`,
                      borderRadius: '4px',
                      transition: 'width 1s ease-out',
                      boxShadow: `0 0 10px ${item.color}66`
                    }} />
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
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
