import React, { useEffect, useState } from 'react';
import { 
  Moon, Search, Sparkles, Shield, AlertTriangle, Activity, Wrench, 
  CheckCircle2, XCircle, Clock, ChevronDown, Bell, Settings, Filter, 
  ArrowUpRight, BarChart3, PieChart, Layers, GitPullRequest, GitFork, 
  FolderGit2, ShieldAlert, Cpu, Lock, Sliders, ExternalLink, HelpCircle, 
  ArrowLeft, RefreshCw, Zap, User, Database, CreditCard
} from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

export default function LunarDashboard({ 
  onBackToSite, 
  onSelectProject, 
  currentUser, 
  onOpenPricing 
}) {
  const [activeSidebarTab, setActiveSidebarTab] = useState('Overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('Last 28 days');
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [selectedRepoFilter, setSelectedRepoFilter] = useState('ALL');
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!currentUser) {
      setDashboard(null);
      return () => { mounted = false; };
    }
    setLoadError('');
    lunarApi.getDashboardOverview(28)
      .then((data) => { if (mounted) setDashboard(data); })
      .catch((error) => { if (mounted) setLoadError(error.message); });
    return () => { mounted = false; };
  }, [currentUser]);

  const liveRepos = dashboard?.repositories?.map((repo) => {
    const score = Number(repo.securityScore || 0);
    const passing = score >= 80;
    return {
      id: repo.id,
      name: repo.name,
      lang: repo.language || 'Unknown',
      prs: repo.scanCount || 0,
      score,
      scoreColor: score >= 90 ? '#10b981' : score >= 80 ? '#3b82f6' : '#f97316',
      issues: repo.issuesCount || 0,
      lastUpdated: repo.lastScannedAt ? new Date(repo.lastScannedAt).toLocaleString() : 'Not scanned',
      status: passing ? 'passing' : 'failed',
      statusColor: passing ? '#10b981' : '#ef4444',
      repoUrl: repo.repoUrl
    };
  }) || [];
  const repos = dashboard ? liveRepos : [];
  const activity = dashboard?.activity || [];
  const maxReviews = Math.max(...activity.map((item) => Number(item.reviews)), 1);
  const liveBarData = activity.map((item) => Math.max((Number(item.reviews) / maxReviews) * 100, 2));
  const displayedBarData = dashboard ? liveBarData : [];
  const liveIssueTypes = (dashboard?.findingsBySeverity || []).map((item) => ({
    label: item.severity,
    count: item.count,
    color: item.severity === 'critical' ? '#ef4444' : item.severity === 'high' ? '#f97316' : item.severity === 'medium' ? '#3b82f6' : '#a855f7'
  }));
  const displayedIssueTypes = dashboard ? liveIssueTypes : [];
  const liveRecentReviews = (dashboard?.recentScans || []).map((scan) => ({
    id: scan.id,
    prNumber: `#${String(scan.id).slice(0, 6)}`,
    title: `Security scan · score ${scan.score}`,
    repo: scan.repository || 'Repository',
    time: new Date(scan.createdAt).toLocaleString(),
    author: currentUser?.name || 'Lunar user',
    avatar: (currentUser?.name || 'LU').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    avatarBg: '#7c3aed',
    autoFixed: false,
    status: Number(scan.score) >= 80 ? 'passing' : 'failed'
  }));
  const displayedRecentReviews = dashboard ? liveRecentReviews : [];

  const filteredRepos = repos.filter(r => {
    const matchesQuery = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.lang.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedRepoFilter === 'PASSING') return matchesQuery && r.status === 'passing';
    if (selectedRepoFilter === 'FAILED') return matchesQuery && r.status === 'failed';
    return matchesQuery;
  });

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#090a12',
      color: '#e2e8f0',
      fontFamily: 'Inter, -apple-system, sans-serif',
      fontSize: '14px',
      margin: '-0px -0px'
    }}>
      {/* ---------------------------------------------------- */}
      {/* LEFT SIDEBAR NAVIGATION */}
      {/* ---------------------------------------------------- */}
      <aside style={{
        width: '240px',
        backgroundColor: '#0c0d18',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 16px',
        flexShrink: 0
      }}>
        <div>
          {/* Top Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '4px 8px 24px 8px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(124, 58, 237, 0.5)'
            }}>
              <Moon size={16} color="#fff" />
            </div>
            <span style={{
              fontWeight: '800',
              fontSize: '1.25rem',
              letterSpacing: '-0.02em',
              color: '#ffffff'
            }}>
              lunar
            </span>
          </div>

          {/* Org Workspace Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '0.8rem',
                color: '#fff'
              }}>
                A
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#f1f5f9', lineHeight: '1.2' }}>
                  acme-corp
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Pro plan
                </div>
              </div>
            </div>
            <ChevronDown size={14} color="#64748b" />
          </div>

          {/* Nav Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { name: 'Overview', icon: Layers, badge: null },
              { name: 'Reviews', icon: GitPullRequest, badge: '3', badgeBg: 'rgba(239, 68, 68, 0.2)', badgeColor: '#f87171' },
              { name: 'Repositories', icon: FolderGit2, badge: null },
              { name: 'Security', icon: Shield, badge: '4', badgeBg: 'rgba(239, 68, 68, 0.2)', badgeColor: '#f87171' },
              { name: 'Auto-Fix', icon: Sparkles, badge: null },
              { name: 'Analytics', icon: BarChart3, badge: null },
              { name: 'Settings', icon: Settings, badge: null },
              { name: 'Billing', icon: CreditCard, badge: null }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeSidebarTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveSidebarTab(item.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? 'rgba(255, 255, 255, 0.07)' : 'transparent',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    fontWeight: isActive ? '600' : '500',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#e2e8f0';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={16} color={isActive ? '#a78bfa' : '#64748b'} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '1px 7px',
                      borderRadius: '999px',
                      background: item.badgeBg,
                      color: item.badgeColor
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Storage Bar */}
        <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Storage</span>
            <span style={{ color: '#94a3b8', fontWeight: '600' }}>6.2 GB / 10 GB</span>
          </div>
          <div style={{
            width: '100%',
            height: '5px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '62%',
              height: '100%',
              background: 'linear-gradient(90deg, #7c3aed 0%, #ec4899 100%)',
              borderRadius: '999px'
            }} />
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ---------------------------------------------------- */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        backgroundColor: '#090a12'
      }}>
        {/* Top Header */}
        <header style={{
          height: '64px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          backgroundColor: '#0c0d18'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={onBackToSite}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} /> Back to site
            </button>
            <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              {activeSidebarTab}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Search Box */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '200px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingLeft: '34px',
                  paddingRight: '36px',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <span style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.7rem',
                color: '#64748b',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '2px 5px',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                ⌘K
              </span>
            </div>

            {/* Notification Bell */}
            <div style={{
              position: 'relative',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              <Bell size={16} color="#94a3b8" />
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ef4444'
              }} />
            </div>

            {/* User Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.82rem',
              color: '#fff',
              cursor: 'pointer'
            }}>
              {currentUser?.nickname?.[1]?.toUpperCase() || 'L'}
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            {!currentUser && (
              <div style={{ padding: '14px 18px', marginBottom: '18px', borderRadius: '10px', background: 'rgba(124,58,237,.12)', border: '1px solid rgba(124,58,237,.3)' }}>
                Sign in to load your verified repositories, scans and findings from PostgreSQL.
              </div>
            )}
            {loadError && (
              <div style={{ padding: '14px 18px', marginBottom: '18px', borderRadius: '10px', color: '#fca5a5', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)' }}>
                Unable to load verified dashboard data: {loadError}
              </div>
            )}
            
            {/* ---------------------------------------------------- */}
            {/* SECTION 1: TOP 4 STAT CARDS */}
            {/* ---------------------------------------------------- */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '28px'
            }}>
              {/* Card 1: Active Repos */}
              <div style={{
                backgroundColor: '#0c0d18',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '12px',
                padding: '20px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>Active Repos</span>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Sparkles size={14} color="#3b82f6" />
                  </div>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', lineHeight: '1', marginBottom: '8px' }}>
                  {dashboard?.summary?.repositories ?? 0}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {dashboard?.summary?.scansInRange ?? 0} scans in range
                </div>
              </div>

              {/* Card 2: Open Issues */}
              <div style={{
                backgroundColor: '#0c0d18',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '12px',
                padding: '20px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>Open Issues</span>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ShieldAlert size={14} color="#ef4444" />
                  </div>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', lineHeight: '1', marginBottom: '8px' }}>
                  {dashboard?.summary?.openFindings ?? 0}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  <span style={{ color: '#ef4444', fontWeight: '600' }}>{displayedIssueTypes.find((item) => item.label === 'critical')?.count || 0} critical</span>
                </div>
              </div>

              {/* Card 3: Avg Quality Score */}
              <div style={{
                backgroundColor: '#0c0d18',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '12px',
                padding: '20px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>Avg Quality Score</span>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Activity size={14} color="#10b981" />
                  </div>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', lineHeight: '1', marginBottom: '8px' }}>
                  {dashboard?.summary?.averageScore ?? 0}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  <span style={{ color: '#10b981', fontWeight: '600' }}>{dashboard?.summary?.findings ?? 0} findings in range</span>
                </div>
              </div>

              {/* Card 4: Auto-fixes Applied */}
              <div style={{
                backgroundColor: '#0c0d18',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '12px',
                padding: '20px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>Auto-fixes Applied</span>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Wrench size={14} color="#a855f7" />
                  </div>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', lineHeight: '1', marginBottom: '8px' }}>
                  {dashboard?.summary?.patchedFindings ?? 0}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  This month
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* SECTION 2: CHARTS (REVIEW ACTIVITY & ISSUES BY TYPE) */}
            {/* ---------------------------------------------------- */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '20px',
              marginBottom: '28px'
            }}>
              {/* Review Activity Bar Chart Card */}
              <div style={{
                backgroundColor: '#0c0d18',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                    Review Activity
                  </h3>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: '#94a3b8',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}>
                    <span>{timeRange}</span>
                    <ChevronDown size={12} />
                  </div>
                </div>

                {/* Bar Chart Graphics */}
                <div style={{
                  height: '140px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '6px',
                  paddingTop: '20px',
                  position: 'relative'
                }}>
                  {displayedBarData.map((val, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      style={{
                        flex: 1,
                        height: `${val}%`,
                        backgroundColor: hoveredBarIndex === idx ? '#818cf8' : '#5865f2',
                        borderRadius: '4px 4px 2px 2px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative'
                      }}
                    >
                      {hoveredBarIndex === idx && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%) translateY(-6px)',
                          backgroundColor: '#1e293b',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                          pointerEvents: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                        }}>
                          {activity[idx]?.date}: {activity[idx]?.reviews || 0} reviews
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* X Axis Labels */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                  fontSize: '0.74rem',
                  color: '#64748b'
                }}>
                  <span>{activity[0]?.date || '—'}</span>
                  <span>{activity[activity.length - 1]?.date || '—'}</span>
                </div>
              </div>

              {/* Issues by Type Donut Chart Card */}
              <div style={{
                backgroundColor: '#0c0d18',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', marginBottom: '20px' }}>
                  Issues by Type
                </h3>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  flex: 1
                }}>
                  {/* SVG Donut Chart */}
                  <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      {/* Donut segments with exact proportions */}
                      <circle cx="18" cy="18" r="14" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                      {/* Security 16% */}
                      <circle cx="18" cy="18" r="14" fill="transparent" stroke="#ef4444" strokeWidth="4.5" strokeDasharray="14 88" strokeDashoffset="0" />
                      {/* Bug 36% */}
                      <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f97316" strokeWidth="4.5" strokeDasharray="32 88" strokeDashoffset="-15" />
                      {/* Style 24% */}
                      <circle cx="18" cy="18" r="14" fill="transparent" stroke="#3b82f6" strokeWidth="4.5" strokeDasharray="21 88" strokeDashoffset="-48" />
                      {/* Perf 24% */}
                      <circle cx="18" cy="18" r="14" fill="transparent" stroke="#a855f7" strokeWidth="4.5" strokeDasharray="21 88" strokeDashoffset="-70" />
                    </svg>
                  </div>

                  {/* Legend List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    {displayedIssueTypes.map((item) => (
                      <div key={item.label} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: item.color
                          }} />
                          <span style={{ color: '#cbd5e1' }}>{item.label}</span>
                        </div>
                        <span style={{ color: '#ffffff', fontWeight: '700' }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* SECTION 3: REPOSITORIES LIST */}
            {/* ---------------------------------------------------- */}
            <div style={{
              backgroundColor: '#0c0d18',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '28px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                  Repositories
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>
                  {filteredRepos.length} connected
                </span>
              </div>

              {/* Repos Table / List Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => onSelectProject && onSelectProject({
                      id: repo.id,
                      title: repo.name,
                      description: `${repo.lang} Repository with ${repo.prs} pull requests monitored by Lunar.`,
                      githubUrl: repo.repoUrl || `https://github.com/${repo.name}`,
                      files: []
                    })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                    }}
                  >
                    {/* Left: Score & Repo Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Circular Quality Score Badge */}
                      <div style={{
                        position: 'relative',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: `2px solid ${repo.scoreColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        color: repo.scoreColor,
                        backgroundColor: 'rgba(255, 255, 255, 0.02)'
                      }}>
                        {repo.score}
                      </div>

                      <div>
                        <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.92rem' }}>
                          {repo.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {repo.lang} · {repo.prs} PRs
                        </div>
                      </div>
                    </div>

                    {/* Right: Issues count, last updated & status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#94a3b8' }}>
                        <span style={{
                          color: repo.issues > 5 ? '#f97316' : '#cbd5e1',
                          fontWeight: repo.issues > 5 ? '700' : '500'
                        }}>
                          {repo.issues} issues
                        </span>
                        <span style={{ margin: '0 6px', color: '#475569' }}>·</span>
                        <span>{repo.lastUpdated}</span>
                      </div>

                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: repo.status === 'passing' ? 'rgba(16, 185, 129, 0.12)' :
                                       repo.status === 'reviewing' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: repo.statusColor,
                        border: `1px solid ${repo.statusColor}33`
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: repo.statusColor
                        }} />
                        <span>{repo.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* SECTION 4: RECENT REVIEWS FEED */}
            {/* ---------------------------------------------------- */}
            <div style={{
              backgroundColor: '#0c0d18',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', marginBottom: '16px' }}>
                Recent Reviews
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {displayedRecentReviews.map((rev) => (
                  <div
                    key={rev.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {/* Avatar */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: rev.avatarBg,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.78rem'
                      }}>
                        {rev.avatar}
                      </div>

                      <div>
                        <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.88rem' }}>
                          <span style={{ color: '#64748b', marginRight: '6px' }}>{rev.prNumber}</span>
                          {rev.title}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          {rev.repo} · {rev.time}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {rev.autoFixed && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(168, 85, 247, 0.15)',
                          color: '#c084fc',
                          border: '1px solid rgba(168, 85, 247, 0.3)'
                        }}>
                          auto-fixed
                        </span>
                      )}

                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: rev.status === 'passing' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: rev.status === 'passing' ? '#10b981' : '#ef4444',
                        border: `1px solid ${rev.status === 'passing' ? '#10b981' : '#ef4444'}33`
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: rev.status === 'passing' ? '#10b981' : '#ef4444'
                        }} />
                        <span>{rev.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
