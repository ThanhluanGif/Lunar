import React, { useState } from 'react';
import { Trophy, Medal, Star, GitFork, Award, ExternalLink, Filter, Sparkles, Code2 } from 'lucide-react';

export default function Leaderboard({ projects = [], onSelectProject, onShowBadgeModal }) {
  const [selectedLang, setSelectedLang] = useState('All');
  const [selectedPeriod, setSelectedPeriod] = useState('all-time');

  const filteredProjects = projects
    .filter(p => selectedLang === 'All' || p.language === selectedLang)
    .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

  const getRankBadge = (rank) => {
    if (rank === 1) return { icon: Trophy, color: '#fbbf24', text: 'Top 1 - Gold Champion', bg: 'rgba(251, 191, 36, 0.15)' };
    if (rank === 2) return { icon: Medal, color: '#94a3b8', text: 'Top 2 - Silver Elite', bg: 'rgba(148, 163, 184, 0.15)' };
    if (rank === 3) return { icon: Medal, color: '#b45309', text: 'Top 3 - Bronze Master', bg: 'rgba(180, 83, 9, 0.15)' };
    return { icon: Award, color: 'var(--text-secondary)', text: `#${rank} Ranked`, bg: 'transparent' };
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 0' }}>
      
      {/* Banner */}
      <div className="glass-panel" style={{
        padding: '32px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.15))',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Trophy size={28} color="#fbbf24" />
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: '800' }}>
              Bảng Xếp Hạng Code Review Việt Nam
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '640px' }}>
            Vinh danh những dự án mã nguồn mở có chất lượng code xuất sắc nhất (Clean Architecture, High Security, Optimized Performance). Sản phẩm tuyệt vời để đưa vào Portfolio cá nhân.
          </p>
        </div>

        {onShowBadgeModal && (
          <button onClick={onShowBadgeModal} className="btn btn-primary">
            <Sparkles size={18} />
            Nhận Badge Portfolio Cho GitHub
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="glass-card" style={{
        padding: '14px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Filter size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Ngôn ngữ:</span>
          
          {['All', 'Python', 'TypeScript', 'Go', 'JavaScript'].map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              className={`btn btn-sm ${selectedLang === lang ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem' }}
            >
              {lang}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`btn btn-sm ${selectedPeriod === 'week' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Tuần này
          </button>
          <button
            onClick={() => setSelectedPeriod('all-time')}
            className={`btn btn-sm ${selectedPeriod === 'all-time' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All-Time Leaderboard
          </button>
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredProjects.map((proj, idx) => {
          const rank = idx + 1;
          const rankInfo = getRankBadge(rank);
          const RankIcon = rankInfo.icon;

          return (
            <div
              key={proj.id}
              className="glass-card"
              style={{
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                flexWrap: 'wrap',
                background: rank <= 3 ? rankInfo.bg : 'var(--bg-card)',
                borderColor: rank <= 3 ? `${rankInfo.color}55` : 'var(--border-color)'
              }}
            >
              {/* Rank & Basic Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: '1', minWidth: '280px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: rank <= 3 ? rankInfo.color : 'rgba(255, 255, 255, 0.05)',
                  color: rank <= 3 ? '#000000' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: '800',
                  fontSize: '1.2rem',
                  boxShadow: rank <= 3 ? `0 0 20px ${rankInfo.color}66` : 'none',
                  flexShrink: 0
                }}>
                  {rank}
                </div>

                <img
                  src={proj.author?.avatar}
                  alt={proj.author?.name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
                      {proj.title}
                    </h3>
                    <span className="badge badge-cyan">{proj.language}</span>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Tác giả: <strong>{proj.author?.name}</strong> (@{proj.author?.username}) • {proj.author?.badge}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>⭐ {proj.stars} stars</span>
                    <span>🍴 {proj.forks} forks</span>
                    <span>💬 {proj.communityReviews?.length || 0} reviews</span>
                  </div>
                </div>
              </div>

              {/* Breakdown metrics summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    AI Code Score
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '2rem',
                    fontWeight: '800',
                    color: proj.overallScore >= 90 ? '#34d399' : '#6366f1',
                    lineHeight: 1
                  }}>
                    {proj.overallScore}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/100</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectProject(proj)}
                  className="btn btn-primary"
                  style={{ padding: '10px 18px' }}
                >
                  <Code2 size={16} />
                  Xem Review Chi Tiết
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
