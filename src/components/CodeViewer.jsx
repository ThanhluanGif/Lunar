import React, { useState } from 'react';
import { FileCode, Folder, Shield, Zap, Sparkles, CheckCircle, Lightbulb, FileText } from 'lucide-react';
import PaywallGate from './PaywallGate';

export default function CodeViewer({ files = [], isLoggedIn = false, onOpenAuth }) {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  if (!files || files.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Không có file mã nguồn nào để xem.</p>
      </div>
    );
  }

  const activeFile = files[selectedFileIdx] || files[0];
  const lines = (activeFile.content || '').split('\n');
  const annotations = activeFile.annotations || [];

  const getAnnotationForLine = (lineNum) => {
    return annotations.find(ann => ann.line === lineNum);
  };

  const getAnnotationIcon = (type) => {
    switch (type) {
      case 'security': return <Shield size={14} color="#f43f5e" />;
      case 'performance': return <Zap size={14} color="#f59e0b" />;
      case 'architecture': return <Sparkles size={14} color="#a855f7" />;
      default: return <Lightbulb size={14} color="#fbbf24" />;
    }
  };

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '24px' }}>
      
      {/* Header Bar */}
      <div style={{
        padding: '12px 20px',
        background: 'rgba(10, 13, 20, 0.8)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Folder size={18} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
            Code Inspector & Line-by-Line AI Review
          </span>
        </div>

        {!isLoggedIn && (
          <span className="badge badge-rose" style={{ fontSize: '0.7rem' }}>
            🔒 Bản xem trước cho Khách (Guest Preview)
          </span>
        )}
      </div>

      {/* Main Split Layout */}
      <PaywallGate
        isLoggedIn={isLoggedIn}
        onOpenAuth={onOpenAuth}
        title="Mở Khóa Soi Code Chi Tiết & AI Line Annotations"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '400px' }}>
          
          {/* File Tree */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRight: '1px solid var(--border-color)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '6px' }}>
              Tập tin Dự án
            </div>

            {files.map((file, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedFileIdx(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: selectedFileIdx === idx ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: selectedFileIdx === idx ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  wordBreak: 'break-all'
                }}
              >
                <FileCode size={16} color={selectedFileIdx === idx ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                <span style={{ fontWeight: selectedFileIdx === idx ? '600' : 'normal' }}>
                  {file.path.split('/').pop()}
                </span>
              </button>
            ))}
          </div>

          {/* Code Content */}
          <div style={{
            background: '#0d1117',
            padding: '16px',
            overflowX: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.86rem',
            lineHeight: '1.6'
          }}>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', marginBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '6px' }}>
              <FileText size={14} style={{ display: 'inline', marginRight: '6px' }} />
              {activeFile.path}
            </div>

            {lines.map((lineText, index) => {
              const lineNum = index + 1;
              const ann = getAnnotationForLine(lineNum);

              return (
                <React.Fragment key={index}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    background: ann ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                    borderLeft: ann ? '3px solid #f59e0b' : '3px solid transparent',
                    padding: '2px 8px'
                  }}>
                    <span style={{ width: '40px', color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'right', paddingRight: '12px', flexShrink: 0 }}>
                      {lineNum}
                    </span>
                    <span style={{ color: '#e6edf3', flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {lineText}
                    </span>
                    {ann && (
                      <span className="badge badge-gold" style={{ fontSize: '0.65rem', marginLeft: '10px' }}>
                        {getAnnotationIcon(ann.type)} {ann.type}
                      </span>
                    )}
                  </div>

                  {ann && (
                    <div style={{
                      margin: '8px 0 12px 40px',
                      padding: '12px',
                      background: 'rgba(26, 34, 52, 0.95)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.84rem'
                    }}>
                      <div style={{ fontWeight: '700', color: '#fbbf24', marginBottom: '4px' }}>
                        {ann.title}
                      </div>
                      <p style={{ color: 'var(--text-primary)', margin: 0 }}>{ann.message}</p>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

        </div>
      </PaywallGate>

    </div>
  );
}
