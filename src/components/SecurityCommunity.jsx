import React, { useEffect, useState } from 'react';
import { ThumbsUp, Send, AlertTriangle, Users, Terminal, Trophy, Loader2 } from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

export default function SecurityCommunity({ onAddAudit, currentUser, onOpenAuth }) {
  const [audits, setAudits] = useState([]);
  const [topHackers, setTopHackers] = useState([]);
  const [title, setTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [targetRepo, setTargetRepo] = useState('');
  const [vulnerabilityType, setVulnerabilityType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      lunarApi.getCommunityAudits(),
      lunarApi.getCommunityLeaderboard()
    ]).then(([feed, leaderboard]) => {
      if (!active) return;
      setAudits(feed.audits || []);
      setTopHackers((leaderboard.leaders || []).slice(0, 3));
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Không thể tải dữ liệu cộng đồng.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await lunarApi.createCommunityAudit({
        title,
        targetRepo,
        vulnerabilityType,
        severity: 'critical',
        content: newTopic
      });
      const audit = {
        ...response.audit,
        authorName: currentUser.name,
        avatar: currentUser.avatarUrl || currentUser.avatar_url
      };
      setAudits((current) => [audit, ...current]);
      onAddAudit?.(audit);
      setTitle('');
      setTargetRepo('');
      setVulnerabilityType('');
      setNewTopic('');
    } catch (submitError) {
      setError(submitError.message || 'Không thể đăng bài.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (auditId) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    try {
      const response = await lunarApi.upvoteCommunityAudit(auditId);
      setAudits((current) => current.map((audit) => (
        audit.id === auditId ? { ...audit, likes: response.upvotes } : audit
      )));
    } catch (upvoteError) {
      setError(upvoteError.message || 'Không thể upvote bài viết.');
    }
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
          {error && (
            <div style={{ color: '#fca5a5', padding: '10px 14px', background: 'rgba(239,68,68,.12)', borderRadius: '8px', marginBottom: '14px' }}>
              {error}
            </div>
          )}
          
          {/* Post Form */}
          <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} color="var(--accent-cyan)" />
              Đăng Bài Thảo Luận Bảo Mật / Cảnh Báo Lỗ Hổng
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Tiêu đề cảnh báo</label>
                <input
                  type="text"
                  placeholder="VD: Phát hiện SQL Injection"
                  className="input-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  minLength={5}
                  maxLength={255}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Repository</label>
                <input
                  type="text"
                  placeholder="owner/repository"
                  className="input-control"
                  value={targetRepo}
                  onChange={(e) => setTargetRepo(e.target.value)}
                  maxLength={255}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Loại lỗ hổng</label>
              <input
                type="text"
                placeholder="VD: SQL Injection · CWE-89"
                className="input-control"
                value={vulnerabilityType}
                onChange={(e) => setVulnerabilityType(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="input-group" style={{ marginBottom: '14px' }}>
              <label className="input-label">Nội dung Phân Tích Lỗ Hổng / Đề Xuất Vá Lỗi</label>
              <textarea
                rows="3"
                placeholder="Mô tả lỗ hổng bảo mật, vector tấn công hoặc kỹ thuật bypass/defense..."
                className="input-control"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                minLength={20}
                maxLength={10000}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? <Loader2 size={16} /> : <Send size={16} />}
              {currentUser ? 'Đăng Bài Lên Cộng Đồng Cybersecurity' : 'Đăng nhập để đăng bài'}
            </button>
          </form>

          {/* Audit Posts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!loading && audits.length === 0 && (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Chưa có bài phân tích nào. Hãy trở thành người đầu tiên chia sẻ.
              </div>
            )}
            {audits.map((aud) => (
              <div key={aud.id} className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {aud.avatar ? <img
                      src={aud.avatar}
                      alt=""
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                    /> : <span style={{ width: '42px', height: '42px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#4f46e5', fontWeight: 800 }}>
                      {(aud.authorName || aud.author || 'U').charAt(0).toUpperCase()}
                    </span>}
                    <div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {aud.authorName || aud.author}
                      </h4>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        {aud.author} • {new Date(aud.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <span className="badge badge-rose">
                    <AlertTriangle size={12} /> {aud.severityFlag || 'SECURITY NOTICE'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1rem', marginBottom: '6px' }}>{aud.title}</h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '14px', whiteSpace: 'pre-wrap' }}>
                  {aud.comment}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem' }}>
                  <button type="button" onClick={() => handleUpvote(aud.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ThumbsUp size={14} />
                    <span>Hữu ích ({aud.likes || 0})</span>
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

                  {hacker.avatar ? <img
                    src={hacker.avatar}
                    alt=""
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  /> : <span style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#334155', fontWeight: 800 }}>
                    {(hacker.name || 'U').charAt(0).toUpperCase()}
                  </span>}

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {hacker.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {hacker.handle} • {hacker.karma} Karma
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
