import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, Award, Send, Star, User, Sparkles } from 'lucide-react';

export default function CommunityReviews({ reviews = [], onAddReview }) {
  const [newComment, setNewComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerRole, setReviewerRole] = useState('Senior Fullstack Dev');
  const [selectedScore, setSelectedScore] = useState(90);
  const [selectedBadge, setSelectedBadge] = useState('Clean Architect');

  const badges = [
    'Clean Architect',
    'Bug Hunter',
    'Performance Ninja',
    'Security Guru',
    'Readable Code'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !reviewerName.trim()) return;

    onAddReview({
      id: 'rev-' + Date.now(),
      author: reviewerName,
      role: reviewerRole,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80`,
      score: Number(selectedScore),
      badge: selectedBadge,
      comment: newComment,
      createdAt: 'Vừa xong',
      likes: 0
    });

    setNewComment('');
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={20} color="var(--accent-purple)" />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: '700' }}>
            Đánh Giá Từ Cộng Đồng ({reviews.length})
          </h3>
        </div>
        <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
          Peer Review
        </span>
      </div>

      {/* Write a Review Form */}
      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '18px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} color="var(--accent-cyan)" />
          Viết Review & Chấm Điểm Dự Án Này
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Họ và tên / Nickname</label>
            <input
              type="text"
              placeholder="VD: Nguyễn Văn A"
              className="input-control"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Chức danh / Role</label>
            <input
              type="text"
              placeholder="VD: Tech Lead @ Company"
              className="input-control"
              value={reviewerRole}
              onChange={(e) => setReviewerRole(e.target.value)}
            />
          </div>
        </div>

        {/* Score & Badge Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label className="input-label">Chấm điểm của bạn (0 - 100): <strong style={{ color: 'var(--accent-cyan)' }}>{selectedScore} điểm</strong></label>
            <input
              type="range"
              min="50"
              max="100"
              value={selectedScore}
              onChange={(e) => setSelectedScore(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', marginTop: '6px' }}
            />
          </div>

          <div>
            <label className="input-label">Tặng Badge Khen Thưởng</label>
            <select
              value={selectedBadge}
              onChange={(e) => setSelectedBadge(e.target.value)}
              className="input-control"
              style={{ width: '100%', paddingTop: '8px', paddingBottom: '8px' }}
            >
              {badges.map(b => (
                <option key={b} value={b} style={{ background: '#121824', color: '#fff' }}>
                  🏆 {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: '14px' }}>
          <label className="input-label">Nội dung Đánh giá & Gợi ý cải thiện</label>
          <textarea
            rows="3"
            placeholder="Chia sẻ góc nhìn chuyên môn của bạn về Naming, Kiến trúc, Bảo mật hoặc Performance của dự án..."
            className="input-control"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            required
            style={{ resize: 'vertical' }}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          <Send size={16} />
          Gửi Đánh Giá Peer Review
        </button>
      </form>

      {/* Review List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {reviews.map((rev) => (
          <div key={rev.id} className="glass-card" style={{ padding: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={rev.avatar}
                  alt={rev.author}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h5 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {rev.author}
                  </h5>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {rev.role} • {rev.createdAt}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-gold">
                  <Award size={12} /> {rev.badge}
                </span>
                <span className="badge badge-cyan" style={{ fontFamily: 'var(--font-mono)' }}>
                  ★ {rev.score}/100
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '12px' }}>
              {rev.comment}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ThumbsUp size={14} />
                <span>Hữu ích ({rev.likes})</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
