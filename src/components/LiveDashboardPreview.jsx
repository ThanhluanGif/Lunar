import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Database, LogIn, RefreshCw, ShieldCheck } from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

const metricCardStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '10px',
  padding: '14px'
};

function formatDate(value) {
  if (!value) return 'Chưa có dữ liệu';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function getRepoStatus(repo) {
  if (!repo.lastScannedAt) return { label: 'chưa quét', color: '#7880a0' };
  if (Number(repo.securityScore) >= 80) return { label: 'an toàn', color: '#22c55e' };
  return { label: 'cần xử lý', color: '#ef4444' };
}

export default function LiveDashboardPreview({
  currentUser,
  onOpenAuth,
  onOpenDashboard
}) {
  const [dashboard, setDashboard] = useState(null);
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setDashboard(null);
    setLoadError('');

    if (!currentUser) {
      setIsLoading(false);
      return () => { mounted = false; };
    }

    setIsLoading(true);
    lunarApi.getDashboardOverview(28)
      .then((response) => {
        if (!mounted) return;
        setDashboard(response);
      })
      .catch((error) => {
        if (!mounted) return;
        setLoadError(error.message || 'Không thể tải dashboard đã xác minh.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, [currentUser, reloadKey]);

  const repositories = dashboard?.repositories || [];
  const selectedRepo = useMemo(
    () => repositories.find((repo) => repo.id === selectedRepoId) || repositories[0] || null,
    [repositories, selectedRepoId]
  );
  const recentScans = useMemo(() => {
    const scans = dashboard?.recentScans || [];
    if (!selectedRepo) return scans.slice(0, 3);
    const repoScans = scans.filter((scan) => scan.repository === selectedRepo.name);
    return (repoScans.length ? repoScans : scans).slice(0, 3);
  }, [dashboard, selectedRepo]);

  const displayName = currentUser?.name || currentUser?.nickname || currentUser?.email || 'Lunar user';
  const summary = dashboard?.summary || {};
  const selectedStatus = selectedRepo ? getRepoStatus(selectedRepo) : null;

  return (
    <div
      data-testid="live-dashboard-preview"
      style={{
        background: '#090b18',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}
    >
      <div style={{
        background: '#0d0f1e',
        padding: '14px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f97316' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#8c96bd', marginLeft: '8px' }}>
            lunar.app / dashboard
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={14} color="#22d3ee" />
          <span style={{ fontSize: '0.75rem', color: '#7880a0' }}>
            {currentUser ? 'PostgreSQL · dữ liệu tài khoản thật' : 'Chưa đăng nhập'}
          </span>
        </div>
      </div>

      {!currentUser && (
        <div
          data-testid="dashboard-preview-guest"
          style={{
            minHeight: '320px',
            padding: '44px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}
        >
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(108, 142, 239, 0.12)',
            border: '1px solid rgba(108, 142, 239, 0.25)',
            marginBottom: '18px'
          }}>
            <ShieldCheck size={27} color="#6c8eef" />
          </div>
          <h3 style={{ color: '#e2e5f0', fontSize: '1.15rem', marginBottom: '8px' }}>
            Đăng nhập để xem dashboard đồng bộ
          </h3>
          <p style={{ color: '#7880a0', maxWidth: '540px', lineHeight: 1.6, marginBottom: '22px' }}>
            Repository, lịch sử quét và findings được tải theo đúng tài khoản của bạn. Khu vực này không hiển thị số liệu mẫu.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '9px',
              border: 'none',
              background: 'linear-gradient(135deg, #6c8eef, #9d6ef5)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <LogIn size={16} /> Đăng nhập để đồng bộ
          </button>
        </div>
      )}

      {currentUser && (
        <div className="live-dashboard-grid">
          <aside className="live-dashboard-repositories">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px', padding: '0 8px' }}>
              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8c96bd' }}>
                Repositories
              </span>
              <span style={{ fontSize: '0.68rem', color: '#7880a0' }}>{repositories.length}</span>
            </div>

            {isLoading && (
              <div data-testid="dashboard-preview-loading" style={{ padding: '12px 8px', color: '#7880a0', fontSize: '0.78rem' }}>
                Đang tải dữ liệu…
              </div>
            )}

            {!isLoading && repositories.map((repo) => {
              const status = getRepoStatus(repo);
              const isActive = selectedRepo?.id === repo.id;
              return (
                <button
                  type="button"
                  key={repo.id}
                  onClick={() => setSelectedRepoId(repo.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    textAlign: 'left',
                    background: isActive ? 'rgba(108, 142, 239, 0.12)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: '4px'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.color, flexShrink: 0 }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.76rem',
                    color: isActive ? '#a0b8ef' : '#7880a0',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  }}>
                    {repo.name}
                  </span>
                </button>
              );
            })}

            {!isLoading && !repositories.length && !loadError && (
              <div data-testid="dashboard-preview-empty" style={{ padding: '12px 8px', color: '#7880a0', fontSize: '0.78rem', lineHeight: 1.5 }}>
                Chưa có repository đã quét.
              </div>
            )}
          </aside>

          <div style={{ padding: '24px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '22px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', color: '#7880a0', marginBottom: '5px' }}>
                  Dashboard của {displayName}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#e2e5f0', overflowWrap: 'anywhere' }}>
                  {selectedRepo?.name || 'Tổng quan tài khoản'}
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#8c96bd' }}>
                  {selectedRepo
                    ? `${selectedRepo.language || 'Không rõ ngôn ngữ'} · cập nhật ${formatDate(selectedRepo.lastScannedAt)}`
                    : 'Dữ liệu được xác minh từ PostgreSQL'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedRepo && (
                  <span style={{ fontSize: '0.74rem', color: selectedStatus.color }}>
                    ● {selectedStatus.label}
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Làm mới dashboard"
                  onClick={() => setReloadKey((value) => value + 1)}
                  disabled={isLoading}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,.09)',
                    background: 'rgba(255,255,255,.03)',
                    color: '#7880a0',
                    cursor: isLoading ? 'wait' : 'pointer'
                  }}
                >
                  <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
                </button>
              </div>
            </div>

            {loadError && (
              <div
                data-testid="dashboard-preview-error"
                style={{ padding: '12px 14px', marginBottom: '18px', borderRadius: '8px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.22)', color: '#fca5a5', fontSize: '0.8rem' }}
              >
                Không thể tải dashboard thật: {loadError}
              </div>
            )}

            <div data-testid="dashboard-preview-live" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={metricCardStyle}>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#6c8eef' }}>
                  {selectedRepo?.issuesCount ?? summary.openFindings ?? 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#8c96bd' }}>
                  {selectedRepo ? 'Issues lần quét mới nhất' : 'Findings đang mở'}
                </div>
              </div>
              <div style={metricCardStyle}>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#6c8eef' }}>
                  {selectedRepo?.scanCount ?? summary.scansInRange ?? 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#8c96bd' }}>
                  {selectedRepo ? 'Lượt quét repository' : 'Lượt quét trong 28 ngày'}
                </div>
              </div>
              <div style={metricCardStyle}>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#22d3ee' }}>
                  {selectedRepo?.securityScore ?? summary.averageScore ?? 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#8c96bd' }}>
                  {selectedRepo ? 'Security score' : 'Điểm trung bình 28 ngày'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8c96bd' }}>
                Lượt quét gần đây
              </span>
              <button
                type="button"
                onClick={onOpenDashboard}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', border: 0, background: 'transparent', color: '#8fa8f3', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700 }}
              >
                Mở dashboard đầy đủ <ArrowRight size={13} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentScans.map((scan) => {
                const passing = Number(scan.score) >= 80;
                return (
                  <div key={scan.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#8c96bd' }}>
                      #{String(scan.id).slice(0, 6)}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#8890b0', flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {scan.repository || 'Repository'} · {scan.issuesCount} issues
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#8c96bd', whiteSpace: 'nowrap' }}>
                      {formatDate(scan.createdAt)}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: passing ? '#22c55e' : '#ef4444', whiteSpace: 'nowrap' }}>
                      ● {scan.score}
                    </span>
                  </div>
                );
              })}

              {!isLoading && !recentScans.length && !loadError && (
                <div style={{ padding: '16px 14px', borderRadius: '8px', background: 'rgba(255,255,255,.02)', color: '#7880a0', fontSize: '0.78rem' }}>
                  Chưa có lượt quét. Hãy đồng bộ GitHub và quét repository đầu tiên.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
