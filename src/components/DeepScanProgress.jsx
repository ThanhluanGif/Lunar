import React from 'react';
import { Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function DeepScanProgress({ active, progress = 0, stage = '', error = '' }) {
  if (!active && !error && progress === 0) return null;
  const complete = !active && progress >= 100 && !error;
  return (
    <div style={{
      padding: '16px',
      margin: '16px 0',
      borderRadius: '10px',
      background: 'rgba(15,23,42,.85)',
      border: `1px solid ${error ? 'rgba(239,68,68,.4)' : 'rgba(59,130,246,.35)'}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        {error ? <ShieldAlert size={17} color="#f87171" /> : complete
          ? <CheckCircle2 size={17} color="#34d399" />
          : <Loader2 size={17} color="#60a5fa" style={{ animation: 'spin 1s linear infinite' }} />}
        <strong>{error || stage || 'Preparing deep scan…'}</strong>
        {!error && <span style={{ marginLeft: 'auto', color: '#93c5fd' }}>{progress}%</span>}
      </div>
      {!error && (
        <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(Math.max(progress, 0), 100)}%`,
            background: 'linear-gradient(90deg,#2563eb,#8b5cf6)',
            transition: 'width .25s ease'
          }} />
        </div>
      )}
    </div>
  );
}
