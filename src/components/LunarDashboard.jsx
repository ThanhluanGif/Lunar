import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Bell,
  CheckCircle2,
  FileClock,
  FileText,
  FolderGit2,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sun,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import { lunarApi } from '../services/lunarApi';
import {
  USER_DASHBOARD_REFRESH_INTERVAL_MS,
  createLatestRequestGate,
  isDashboardResponseForUser
} from '../services/dashboardSync';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  MetricCard,
  SeverityBadge,
  Skeleton,
  StatusBadge
} from './ui';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Workspace' },
  { id: 'repositories', label: 'Repositories', icon: FolderGit2, countKey: 'repositories' },
  { id: 'scans', label: 'Scan History', icon: FileClock, countKey: 'scansInRange' },
  { id: 'vulnerabilities', label: 'Vulnerabilities', icon: ShieldAlert, countKey: 'openFindings', group: 'Security' },
  { id: 'fixes', label: 'Fix Center', icon: Wrench, countKey: 'patchedFindings' },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Manage' }
];

const PAGE_COPY = {
  overview: ['Security overview', 'Verified posture and scan activity from your account.'],
  repositories: ['Repositories', 'Monitor connected repositories and their latest security score.'],
  scans: ['Scan history', 'Review recent scans, findings, and completion status.'],
  vulnerabilities: ['Vulnerabilities', 'Prioritize findings by severity before opening a repository.'],
  fixes: ['Fix Center', 'Track validated remediations without applying an AI patch blindly.'],
  reports: ['Reports', 'Open a scanned repository to export its verified audit report.'],
  settings: ['Workspace settings', 'Account and integration settings remain connected to the existing controls.']
};

function scoreTone(score) {
  if (score >= 90) return '#2fb77a';
  if (score >= 75) return '#4d8df7';
  if (score >= 50) return '#e9a23b';
  return '#f05252';
}

function formatDate(value) {
  if (!value) return 'Not scanned';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
}

export default function LunarDashboard({
  onBackToSite,
  onSelectProject,
  onOpenScan,
  currentUser
}) {
  const [activeView, setActiveView] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [repoStatus, setRepoStatus] = useState('ALL');
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('lunar-theme') || 'dark');
  const requestGateRef = useRef(createLatestRequestGate());
  const userId = currentUser?.id || null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('lunar-theme', theme);
  }, [theme]);

  const loadDashboard = useCallback(async ({ background = false } = {}) => {
    if (!userId) return;
    const requestId = requestGateRef.current.start();
    if (!background) setDashboard(null);
    setLoadError('');
    try {
      const data = await lunarApi.getDashboardOverview(28);
      if (!requestGateRef.current.isCurrent(requestId)) return;
      if (!isDashboardResponseForUser(data, userId)) {
        throw new Error('Dashboard response does not belong to the active account.');
      }
      setDashboard(data);
    } catch (error) {
      if (requestGateRef.current.isCurrent(requestId)) {
        setLoadError(error.message || 'Không thể tải dữ liệu dashboard.');
      }
    }
  }, [userId]);

  useEffect(() => {
    requestGateRef.current.invalidate();
    setDashboard(null);
    setLoadError('');
    if (!userId) return undefined;
    loadDashboard();
    const refresh = () => document.visibilityState === 'visible' && loadDashboard({ background: true });
    const intervalId = window.setInterval(refresh, USER_DASHBOARD_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      requestGateRef.current.invalidate();
    };
  }, [loadDashboard, userId]);

  const handleClearScanHistory = async () => {
    setIsClearingHistory(true);
    try {
      const response = await lunarApi.clearScanHistory();
      await loadDashboard();
      setActionNotice(response.message || 'Scan history was cleared.');
      setClearDialogOpen(false);
    } catch (error) {
      setActionNotice(`Không thể xóa lịch sử: ${error.message}`);
    } finally {
      setIsClearingHistory(false);
      window.setTimeout(() => setActionNotice(''), 4500);
    }
  };

  const repositories = useMemo(() => (dashboard?.repositories || []).map((repo) => {
    const score = Number(repo.securityScore || 0);
    return {
      ...repo,
      score,
      status: score >= 80 ? 'passing' : 'attention'
    };
  }), [dashboard]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRepositories = repositories.filter((repo) => {
    const matchesText = !normalizedQuery || `${repo.name} ${repo.language || ''}`.toLowerCase().includes(normalizedQuery);
    const matchesStatus = repoStatus === 'ALL' || repo.status === repoStatus;
    return matchesText && matchesStatus;
  });
  const recentScans = (dashboard?.recentScans || []).filter((scan) => (
    !normalizedQuery || `${scan.repository || ''} ${scan.id || ''}`.toLowerCase().includes(normalizedQuery)
  ));
  const severities = ['critical', 'high', 'medium', 'low'].map((severity) => ({
    severity,
    count: Number(dashboard?.findingsBySeverity?.find((item) => String(item.severity).toLowerCase() === severity)?.count || 0)
  }));
  const totalFindings = severities.reduce((sum, item) => sum + item.count, 0);
  const maxActivity = Math.max(...(dashboard?.activity || []).map((item) => Number(item.reviews || 0)), 1);
  const displayName = currentUser?.name || currentUser?.email || 'Lunar user';
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const [pageTitle, pageDescription] = PAGE_COPY[activeView];

  const openRepository = (repo) => onSelectProject?.({
    id: repo.id,
    title: repo.name,
    description: `${repo.language || 'Unknown language'} repository monitored by Lunar.`,
    githubUrl: repo.repoUrl,
    files: []
  });

  const changeView = (view) => {
    setActiveView(view);
    setSidebarOpen(false);
    setSearchQuery('');
  };

  const renderRepositoryTable = () => {
    if (!filteredRepositories.length) {
      return <EmptyState icon={FolderGit2} title={repositories.length ? 'No repositories match this filter' : 'No connected repositories'} description={repositories.length ? 'Clear the search or choose another status.' : 'Start a scan to add a repository to this verified workspace.'} action={!repositories.length && <Button variant="primary" size="sm" icon={Plus} onClick={onOpenScan}>New scan</Button>} />;
    }
    return (
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Repository</th><th>Security score</th><th>Issues</th><th>Scans</th><th>Last scan</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {filteredRepositories.map((repo) => (
              <tr key={repo.id}>
                <td><span className="data-table__primary" title={repo.name}>{repo.name}</span><span className="data-table__secondary">{repo.language || 'Unknown language'}</span></td>
                <td><span className="score-ring" style={{ '--score-color': scoreTone(repo.score) }}>{repo.score}</span></td>
                <td>{Number(repo.issuesCount || 0).toLocaleString()}</td>
                <td>{Number(repo.scanCount || 0).toLocaleString()}</td>
                <td>{formatDate(repo.lastScannedAt)}</td>
                <td><StatusBadge status={repo.status === 'passing' ? 'passing' : 'high'} label={repo.status === 'passing' ? 'Passing' : 'Needs attention'} /></td>
                <td><Button variant="ghost" size="sm" onClick={() => openRepository(repo)}>View details</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderScanTable = () => {
    if (!recentScans.length) return <EmptyState icon={FileClock} title={dashboard?.recentScans?.length ? 'No scans match your search' : 'No scan history yet'} description="Completed scans will appear here with repository, score, issue count and model evidence." action={!dashboard?.recentScans?.length && <Button variant="primary" size="sm" icon={Plus} onClick={onOpenScan}>Start first scan</Button>} />;
    return (
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Scan</th><th>Repository</th><th>Score</th><th>Issues</th><th>AI model</th><th>Started</th><th>Status</th></tr></thead>
          <tbody>
            {recentScans.map((scan) => (
              <tr key={scan.id}>
                <td><span className="data-table__primary">#{String(scan.id).slice(0, 8)}</span></td>
                <td>{scan.repository || 'Repository'}</td>
                <td><span style={{ color: scoreTone(Number(scan.score || 0)), fontWeight: 800 }}>{Number(scan.score || 0)}</span></td>
                <td>{Number(scan.issuesCount || 0)}</td>
                <td>{scan.modelUsed || 'Rule-based SAST'}</td>
                <td>{formatDate(scan.createdAt)}</td>
                <td><StatusBadge status="completed" label="Completed" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderOverview = () => (
    <>
      <div className="product-metrics">
        <MetricCard label="Repositories" value={dashboard?.summary?.repositories ?? 0} hint="Connected workspace" icon={FolderGit2} tone="primary" />
        <MetricCard label="Open findings" value={dashboard?.summary?.openFindings ?? 0} hint="Require review" icon={ShieldAlert} tone="critical" />
        <MetricCard label="Security score" value={dashboard?.summary?.averageScore ?? 0} hint="Last 28 days" icon={Shield} tone="success" />
        <MetricCard label="Resolved issues" value={dashboard?.summary?.patchedFindings ?? 0} hint="Validated patches" icon={CheckCircle2} tone="success" />
      </div>
      <div className="product-grid">
        <Card className="product-panel">
          <div className="product-panel__header"><div><h3>Scan activity</h3><p>Daily verified scans for the last 28 days</p></div><StatusBadge status="success" label={`${dashboard?.summary?.scansInRange ?? 0} scans`} /></div>
          {(dashboard?.activity || []).length ? (
            <>
              <div className="product-chart" aria-label="Scan activity chart">
                {dashboard.activity.map((item) => <span key={item.date} className="product-chart__bar" style={{ height: `${Math.max(4, Number(item.reviews || 0) / maxActivity * 100)}%` }} title={`${item.date}: ${item.reviews} scans`} />)}
              </div>
              <div className="product-chart__axis"><span>{dashboard.activity[0]?.date}</span><span>{dashboard.activity.at(-1)?.date}</span></div>
            </>
          ) : <EmptyState icon={Activity} title="No activity in this range" description="Run a scan to establish a security baseline." />}
        </Card>
        <Card className="product-panel">
          <div className="product-panel__header"><div><h3>Findings by severity</h3><p>Risk distribution from verified scans</p></div><strong>{totalFindings}</strong></div>
          {totalFindings ? <div className="severity-overview">{severities.map((item) => (
            <div className="severity-overview__row" key={item.severity}>
              <SeverityBadge severity={item.severity} />
              <div className="severity-overview__track"><span style={{ width: `${item.count / totalFindings * 100}%`, background: `var(--severity-${item.severity})` }} /></div>
              <span className="severity-overview__count">{item.count}</span>
            </div>
          ))}</div> : <EmptyState icon={Shield} title="No findings" description="No vulnerability distribution is available for this period." />}
        </Card>
      </div>
      <Card className="product-panel">
        <div className="product-panel__header"><div><h3>Highest-risk repositories</h3><p>Sorted by the latest security score</p></div><Button variant="link" onClick={() => changeView('repositories')}>View all repositories</Button></div>
        {renderRepositoryTable()}
      </Card>
    </>
  );

  const renderView = () => {
    if (activeView === 'overview') return renderOverview();
    if (activeView === 'repositories') return <Card className="product-panel">{renderRepositoryTable()}</Card>;
    if (activeView === 'scans') return <Card className="product-panel">{renderScanTable()}</Card>;
    if (activeView === 'vulnerabilities') return (
      <Card className="product-panel">
        <div className="product-panel__header"><div><h3>Severity inventory</h3><p>Aggregated from existing findings; open a repository for line-level evidence.</p></div><strong>{dashboard?.summary?.openFindings ?? 0} open</strong></div>
        {totalFindings ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Severity</th><th>Findings</th><th>Share</th><th>Recommended priority</th></tr></thead><tbody>{severities.map((item) => <tr key={item.severity}><td><SeverityBadge severity={item.severity} /></td><td>{item.count}</td><td>{Math.round(item.count / totalFindings * 100)}%</td><td>{item.severity === 'critical' ? 'Immediate triage' : item.severity === 'high' ? 'Review within 24 hours' : 'Schedule remediation'}</td></tr>)}</tbody></table></div> : <EmptyState icon={Shield} title="No findings in this range" description="The API has not returned any severity evidence for your account." />}
      </Card>
    );
    if (activeView === 'fixes') return <Card className="product-panel"><EmptyState icon={Wrench} title={`${dashboard?.summary?.patchedFindings ?? 0} validated patches recorded`} description="Open a repository finding to review the original code, suggested diff and validation result before applying a patch." action={<Button variant="outline" size="sm" onClick={() => changeView('repositories')}>Browse repositories</Button>} /></Card>;
    if (activeView === 'reports') return <Card className="product-panel"><EmptyState icon={FileText} title="Reports are repository-scoped" description="Choose a scanned repository, inspect its findings, then export PDF, CSV or Markdown using the existing report controls." action={<Button variant="outline" size="sm" onClick={() => changeView('repositories')}>Choose repository</Button>} /></Card>;
    return <Card className="product-panel"><EmptyState icon={Settings} title="Workspace settings" description="Use Account Settings on the main site for profile and password controls. GitHub connection settings remain in the repository scanner to preserve the current API flow." action={<Button variant="outline" size="sm" onClick={onBackToSite}>Back to account controls</Button>} /></Card>;
  };

  return (
    <div className={`product-shell${sidebarOpen ? ' is-sidebar-open' : ''}`}>
      {sidebarOpen && <button type="button" className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className="product-sidebar" aria-label="Product navigation">
        <div className="product-brand"><span className="product-brand__mark"><Moon size={16} /></span><span>lunar.dev</span><IconButton className="product-mobile-trigger" label="Close navigation" icon={X} onClick={() => setSidebarOpen(false)} /></div>
        <div className="product-workspace"><span className="product-workspace__avatar">{initials}</span><div className="product-workspace__copy"><strong>{displayName}</strong><span>{dashboard?.identity?.tier || currentUser?.tier || 'FREE'} workspace</span></div></div>
        <nav className="product-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return <React.Fragment key={item.id}>{item.group && <div className="product-nav__label">{item.group}</div>}<button type="button" onClick={() => changeView(item.id)} aria-current={activeView === item.id ? 'page' : undefined}><Icon size={16} aria-hidden="true" /><span>{item.label}</span>{item.countKey && dashboard && <span className="product-nav__count">{dashboard.summary?.[item.countKey] ?? 0}</span>}</button></React.Fragment>;
          })}
        </nav>
        <div className="product-sidebar__footer"><div className="product-sidebar__status"><span />PostgreSQL verified</div><div className="product-sidebar__sync">{dashboard?.generatedAt ? `Synced ${formatDate(dashboard.generatedAt)}` : 'Waiting for account data'}</div></div>
      </aside>

      <main className="product-main">
        <header className="product-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}><IconButton className="product-mobile-trigger" label="Open navigation" icon={Menu} onClick={() => setSidebarOpen(true)} /><div className="product-topbar__title"><p>Workspace / {pageTitle}</p><h1>{pageTitle}</h1></div></div>
          <div className="product-topbar__actions">
            <label className="product-search"><span className="sr-only">Search current view</span><Search size={15} /><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search repositories or scans…" /></label>
            <IconButton label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'} icon={theme === 'dark' ? Sun : Moon} onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} />
            <IconButton label="Notifications" icon={Bell} />
            <Button variant="outline" size="sm" icon={ArrowLeft} onClick={onBackToSite}>Site</Button>
          </div>
        </header>
        {actionNotice && <div className={`product-notice${actionNotice.startsWith('Không thể') ? ' is-error' : ''}`} role="status"><CheckCircle2 size={15} />{actionNotice}</div>}
        <div className="product-content">
          <div className="product-page-header">
            <div><h2>{pageTitle}</h2><p>{pageDescription}</p></div>
            <div className="product-page-header__actions">
              {activeView === 'repositories' && <select className="product-filter" aria-label="Filter repository status" value={repoStatus} onChange={(event) => setRepoStatus(event.target.value)}><option value="ALL">All statuses</option><option value="passing">Passing</option><option value="attention">Needs attention</option></select>}
              {(activeView === 'overview' || activeView === 'scans') && <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => loadDashboard()} disabled={!userId}>Refresh</Button>}
              {activeView === 'scans' && <Button variant="danger" size="sm" icon={Trash2} onClick={() => setClearDialogOpen(true)} disabled={!dashboard?.recentScans?.length}>Clear history</Button>}
              <Button variant="primary" size="sm" icon={Plus} onClick={onOpenScan}>New scan</Button>
            </div>
          </div>
          {!currentUser ? <ErrorState title="Sign in required" description="Sign in to load verified repositories and findings." /> : loadError ? <ErrorState description={loadError} onRetry={() => loadDashboard()} /> : !dashboard ? <Card className="product-panel"><Skeleton lines={8} /></Card> : renderView()}
        </div>
      </main>
      <ConfirmDialog open={clearDialogOpen} title="Clear scan history?" description="This removes your historical scan records from the dashboard. This action cannot be undone." confirmLabel="Clear scan history" loading={isClearingHistory} onConfirm={handleClearScanHistory} onClose={() => setClearDialogOpen(false)} />
    </div>
  );
}
