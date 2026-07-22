import React, { useState } from 'react';
import { ShieldCheck, MessageSquare, Award, ThumbsUp, Send, AlertTriangle, Users, Terminal, Sparkles, Trophy } from 'lucide-react';

export default function SecurityCommunity({ audits = [], onAddAudit }) {
  const [newTopic, setNewTopic] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('Ethical Hacker / Pentester');
  const [selectedBadge, setSelectedBadge] = useState('CVE Hunter');

  const topHackers = [
    { name: 'Nguyễn Văn Đạt', handle: '@dat-whitehat', karma: 4210, badge: 'Top 1 Pentester', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
    { name: 'Trần Thị Mai', handle: '@mai-appsec', karma: 3890, badge: 'Patch Master', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
    { name: 'Phạm Hoàng Nam', handle: '@nam-redteam', karma: 3120, badge: 'CVE Hunter', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTopic.trim() || !authorName.trim()) return;

    onAddAudit({
      id: 'aud-' + Date.now(),
      author: authorName,
      role: authorRole,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      severityFlag: 'CRITICAL',
      comment: newTopic,
      createdAt: 'Vừa xong',
      likes: 0
    });

    setNewTopic('');
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '32px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.18), rgba(168, 85, 247, 0.15))',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Users size={28} color="#f43f5e" />
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: '800' }}>
              Cộng Đồng An Ninh Mạng & White-Hat Việt Nam
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '680px' }}>
            Nơi các nhà nghiên cứu bảo mật (Security Researchers), Pentesters và Lập trình viên thảo luận phòng thủ mã nguồn, phân tích lỗ hổng Zero-Day và hỗ trợ vá lỗi cộng đồng.
          </p>
        </div>

        <div className="badge badge-rose" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          🛡️ Responsible Vulnerability Disclosure
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Main Feed: Discussions & Audit Reviews */}
        <div>
          
          {/* Post Form */}
          <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} color="var(--accent-cyan)" />
              Đăng Bài Thảo Luận Bảo Mật / Cảnh Báo Lỗ Hổng
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Họ tên / Nickname Pentester</label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn A"
                  className="input-control"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Chức danh Chuyên môn</label>
                <input
                  type="text"
                  placeholder="VD: Senior Pentester @ Company"
                  className="input-control"
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '14px' }}>
              <label className="input-label">Nội dung Phân Tích Lỗ Hổng / Đề Xuất Vá Lỗi</label>
              <textarea
                rows="3"
                placeholder="Mô tả lỗ hổng bảo mật, vector tấn công hoặc kỹ thuật bypass/defense..."
                className="input-control"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Send size={16} />
              Đăng Bài Lên Cộng Đồng Cybersecurity
            </button>
          </form>

          {/* Audit Posts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {audits.map((aud) => (
              <div key={aud.id} className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={aud.avatar}
                      alt={aud.author}
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {aud.author}
                      </h4>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        {aud.role} • {aud.createdAt}
                      </span>
                    </div>
                  </div>

                  <span className="badge badge-rose">
                    <AlertTriangle size={12} /> {aud.severityFlag || 'SECURITY NOTICE'}
                  </span>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '14px' }}>
                  {aud.comment}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem' }}>
                  <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ThumbsUp size={14} />
                    <span>Hữu ích ({aud.likes || 12})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right Sidebar: White-Hat Leaderboard */}
        <div>
          <div className="glass-panel" style={{ padding: '20px', sticky: 'top', top: '90px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Trophy size={18} color="#fbbf24" />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: '700' }}>
                Top 3 White-Hat Hackers
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {topHackers.map((hacker, idx) => (
                <div key={hacker.handle} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : '#b45309',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>

                  <img
                    src={hacker.avatar}
                    alt={hacker.name}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {hacker.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {hacker.badge} • {hacker.karma} Karma
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
