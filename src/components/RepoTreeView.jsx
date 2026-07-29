import React, { useMemo } from 'react';
import { FileCode2, CheckCircle2, AlertTriangle, ShieldAlert, XCircle } from 'lucide-react';

const statusMeta = {
  safe: { color: '#34d399', icon: CheckCircle2, label: 'Safe' },
  warning: { color: '#fbbf24', icon: AlertTriangle, label: 'Warning' },
  critical: { color: '#f87171', icon: ShieldAlert, label: 'Critical' },
  error: { color: '#94a3b8', icon: XCircle, label: 'Error' }
};

export default function RepoTreeView({ files = [] }) {
  const sorted = useMemo(() => [...files].sort((a, b) => a.path.localeCompare(b.path)), [files]);
  if (!sorted.length) return null;
  return (
    <div style={{ marginTop: '18px' }}>
      <h3 style={{ fontSize: '.95rem', marginBottom: '10px' }}>Repository scan results</h3>
      <div style={{ maxHeight: '360px', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        {sorted.map((file) => {
          const meta = statusMeta[file.status] || statusMeta.error;
          const StatusIcon = meta.icon;
          return (
            <div key={file.path} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderBottom: '1px solid rgba(255,255,255,.05)',
              background: 'rgba(15,23,42,.5)'
            }}>
              <FileCode2 size={15} color="#94a3b8" />
              <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '.78rem' }}>{file.path}</span>
              <span style={{ color: meta.color, fontSize: '.75rem' }}>{file.findings?.length || 0} findings</span>
              <StatusIcon size={15} color={meta.color} aria-label={meta.label} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
