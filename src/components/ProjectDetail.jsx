import React from 'react';
import { ArrowLeft, Github, Star, GitFork, Sparkles, Award, ExternalLink } from 'lucide-react';
import ScoreRadar from './ScoreRadar';
import CodeViewer from './CodeViewer';
import CommunityReviews from './CommunityReviews';

export default function ProjectDetail({ project, onBack, onAddReview, onShowBadgeModal }) {
  if (!project) return null;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 0' }}>
      
      {/* Back button & Action Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> Quay lại danh sách Repo
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onShowBadgeModal} className="btn btn-secondary btn-sm">
            <Award size={16} color="#fbbf24" /> Xuất README Badge
          </button>
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary btn-sm"
          >
            <Github size={16} /> Xem trên GitHub <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Project Banner Header */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: '800' }}>
                {project.title}
              </h1>
              <span className="badge badge-cyan">{project.language}</span>
              <span className="badge badge-purple">{project.category}</span>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '16px', maxWidth: '720px' }}>
              {project.description}
            </p>

            {/* Author info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={project.author?.avatar}
                alt={project.author?.name}
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {project.author?.name} (@{project.author?.username})
                </span>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {project.author?.badge} • Karma: {project.author?.karma} pts
                </div>
              </div>
            </div>
          </div>

          {/* Stats Badges */}
          <div style={{ display: 'flex', gap: '14px', background: 'rgba(0, 0, 0, 0.3)', padding: '12px 18px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>STARS</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fbbf24' }}>⭐ {project.stars}</div>
            </div>
            <div style={{ width: '1px', background: 'var(--border-color)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>FORKS</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>🍴 {project.forks}</div>
            </div>
          </div>

        </div>
      </div>

      {/* 5-Metric Score Radar */}
      <ScoreRadar
        overallScore={project.overallScore}
        scores={project.scores}
        onShowBadgeModal={onShowBadgeModal}
      />

      {/* AI Executive Summary Banner */}
      {project.aiSummary && (
        <div className="glass-card" style={{
          padding: '18px 24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(99, 102, 241, 0.1))',
          borderLeft: '4px solid var(--accent-cyan)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
            <Sparkles size={18} />
            <span>AI Code Review Synthesis</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
            {project.aiSummary}
          </p>
        </div>
      )}

      {/* Interactive Code Viewer with Inline AI Annotations */}
      <CodeViewer files={project.files} />

      {/* Community Peer Reviews Section */}
      <CommunityReviews
        reviews={project.communityReviews || []}
        onAddReview={(newRev) => onAddReview(project.id, newRev)}
      />

    </div>
  );
}
