import React, { useState, useEffect } from 'react';
import { Shield, FileCode, AlertTriangle, CheckCircle, Clock, X, Loader, GitBranch, Search } from 'lucide-react';

/**
 * DeepScanProgress — Realtime progress visualization for repo scanning
 * Props:
 *  - scanState: { phase, current, total, currentFile, results, startTime }
 *  - onCancel: callback
 *  - scanResult: final result when complete
 */
export default function DeepScanProgress({ scanState, onCancel, scanResult }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!scanState || scanState.phase === 'complete') return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (scanState.startTime || Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [scanState]);

  if (!scanState) return null;

  const { phase, current, total, currentFile, results } = scanState;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComplete = phase === 'complete';

  const phases = [
    { id: 'fetching_tree', label: 'Tải cấu trúc repo', icon: GitBranch },
    { id: 'scanning_files', label: 'Quét file', icon: Search },
    { id: 'ai_review', label: 'AI Review', icon: Shield },
    { id: 'complete', label: 'Hoàn tất', icon: CheckCircle }
  ];

  const currentPhaseIdx = phases.findIndex(p => p.id === phase);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}p ${sec}s` : `${sec}s`;
  };

  const estimatedRemaining = current > 0 && total > 0 && elapsed > 0
    ? Math.round((elapsed / current) * (total - current))
    : null;

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E4E4E7',
      borderRadius: 12,
      padding: 28,
      marginBottom: 20
    }}>
      {/* Phase indicators */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, position: 'relative' }}>
        {phases.map((p, i) => {
          const Icon = p.icon;
          const isActive = i === currentPhaseIdx;
          const isDone = i < currentPhaseIdx;
          return (
            <div key={p.id} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? '#059669' : isActive ? '#4F46E5' : '#F4F4F5',
                color: isDone || isActive ? '#fff' : '#71717A',
                transition: 'all 0.3s ease'
              }}>
                {isDone ? <CheckCircle size={18} /> : isActive && !isComplete ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={18} />}
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                color: isDone ? '#059669' : isActive ? '#09090B' : '#71717A',
                fontFamily: 'Inter, sans-serif',
                textAlign: 'center'
              }}>{p.label}</span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      {!isComplete && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: 6, fontSize: 13, fontFamily: 'Inter, sans-serif'
          }}>
            <span style={{ color: '#52525B' }}>
              {phase === 'fetching_tree' ? 'Đang tải cấu trúc thư mục...' :
               phase === 'ai_review' ? `AI đang review file ${current}/${total}` :
               `${current}/${total} files đã quét`}
            </span>
            <span style={{ color: '#09090B', fontWeight: 600 }}>{percent}%</span>
          </div>
          <div style={{
            height: 8, borderRadius: 4, background: '#F4F4F5', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
              width: `${percent}%`,
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      )}

      {/* Current file */}
      {currentFile && !isComplete && (
        <div style={{
          fontSize: 12, color: '#71717A',
          fontFamily: 'JetBrains Mono, monospace',
          marginBottom: 12,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {currentFile}
        </div>
      )}

      {/* Live stats */}
      {results && (
        <div style={{
          display: 'flex', gap: 16, marginBottom: 16
        }}>
          {[
            { label: 'Files', value: results.scanned || scanResult?.scannedFiles || 0, color: '#4F46E5' },
            { label: 'Lỗ hổng', value: results.vulnsFound || scanResult?.stats?.total || 0, color: '#DC2626' },
            { label: 'Thời gian', value: formatTime(elapsed), color: '#52525B' }
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, padding: '10px 12px',
              background: '#FAFAFA', borderRadius: 8,
              border: '1px solid #E4E4E7'
            }}>
              <div style={{ fontSize: 11, color: '#71717A', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ETA */}
      {estimatedRemaining !== null && !isComplete && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#71717A', marginBottom: 12 }}>
          <Clock size={13} />
          <span>Ước tính còn lại: ~{formatTime(estimatedRemaining)}</span>
        </div>
      )}

      {/* Complete summary */}
      {isComplete && scanResult && (
        <div style={{
          background: scanResult.overallScore >= 80 ? '#ECFDF3' : scanResult.overallScore >= 50 ? '#FFF4EC' : '#FFF1F4',
          border: `1px solid ${scanResult.overallScore >= 80 ? '#D1F4DD' : scanResult.overallScore >= 50 ? '#FEE7D6' : '#FDDDE3'}`,
          borderRadius: 8, padding: 16, textAlign: 'center'
        }}>
          <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#09090B', marginBottom: 4 }}>
            {scanResult.overallScore}/100
          </div>
          <div style={{ fontSize: 13, color: '#52525B', fontFamily: 'Inter, sans-serif' }}>
            {scanResult.scannedFiles} files quét | {scanResult.stats?.total || 0} lỗ hổng phát hiện | {formatTime(Math.round(scanResult.summary?.scanDuration / 1000))}
          </div>
          {scanResult.stats && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 10 }}>
              {scanResult.stats.critical > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', background: '#FFF1F4', padding: '2px 8px', borderRadius: 4 }}>{scanResult.stats.critical} Critical</span>}
              {scanResult.stats.high > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: '#EA580C', background: '#FFF4EC', padding: '2px 8px', borderRadius: 4 }}>{scanResult.stats.high} High</span>}
              {scanResult.stats.medium > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: '#CA8A04', background: '#FFFBEB', padding: '2px 8px', borderRadius: 4 }}>{scanResult.stats.medium} Medium</span>}
            </div>
          )}
        </div>
      )}

      {/* Cancel button */}
      {!isComplete && onCancel && (
        <button onClick={onCancel} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 6,
          border: '1px solid #E4E4E7', background: '#FAFAFA',
          color: '#71717A', cursor: 'pointer', fontSize: 13,
          fontFamily: 'Inter, sans-serif', marginTop: 8
        }}>
          <X size={14} /> Hủy quét
        </button>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
