import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FolderGit2,
  Github,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  UserCheck
} from 'lucide-react';
import { fetchUserGitHubRepos, normalizeGitHubUsername } from '../services/githubService';
import { lunarApi } from '../services/lunarApi';
import { scanLocalFiles } from '../services/repoScanner';
import { getUpgradeQuotaContext } from '../services/quotaUpgrade';
import { notifyScanCompleted } from '../services/dashboardSync';
import DeepScanProgress from './DeepScanProgress';
import RepoTreeView from './RepoTreeView';
import FolderDropZone from './FolderDropZone';

const SCAN_MODES = [
  {
    id: 'connected',
    label: 'GitHub của tôi',
    description: 'Repo đã cấp quyền',
    icon: KeyRound
  },
  {
    id: 'public',
    label: 'Repo công khai',
    description: 'Tìm theo username',
    icon: Github
  },
  {
    id: 'local',
    label: 'Thư mục local',
    description: 'Không cần upload',
    icon: UploadCloud
  }
];

function normalizeConnectedRepository(repository) {
  return {
    id: repository.id,
    name: repository.name || repository.fullName?.split('/').pop() || 'repository',
    fullName: repository.fullName,
    htmlUrl: repository.repoUrl,
    description: repository.isPrivate
      ? 'Private repository được cấp quyền qua GitHub OAuth.'
      : 'Repository được đồng bộ qua GitHub OAuth.',
    stars: null,
    forks: null,
    language: repository.language || 'Unknown',
    updatedAt: repository.updatedAt
      ? new Date(repository.updatedAt).toLocaleDateString('vi-VN')
      : 'chưa xác định',
    isPrivate: Boolean(repository.isPrivate)
  };
}

function projectFromDeepScan(result, repository) {
  return {
    id: result.projectId,
    title: result.repository,
    description: `Deep scan of ${result.filesScanned} files on ${result.branch}.`,
    githubUrl: repository.htmlUrl,
    language: repository.language,
    overallScore: result.score,
    cvssScore: result.severity?.critical ? 9.1 : result.severity?.high ? 7.5 : 0,
    deepScan: result,
    projectAttackSimulation: result.projectAttackSimulation || null,
    files: (result.files || []).map((file) => ({
      path: file.path,
      githubBlobSha: file.sha,
      language: file.language || 'plaintext',
      content: file.content || '',
      securityFindings: file.findings || [],
      annotations: (file.findings || []).map((finding) => ({
        line: finding.line,
        type: finding.severity,
        title: finding.title,
        message: finding.recommendation,
        cwe: finding.cwe
      }))
    }))
  };
}

export default function UserGitHubWorkspace({
  currentUser,
  currentTier,
  onSelectProject,
  onOpenGitHubAuth,
  onQuotaExceeded
}) {
  const [scanMode, setScanMode] = useState('public');
  const [inputUsername, setInputUsername] = useState('');
  const [activeUsername, setActiveUsername] = useState('');
  const [connectedRepositories, setConnectedRepositories] = useState([]);
  const [publicRepositories, setPublicRepositories] = useState([]);
  const [connectedRepositoriesLoaded, setConnectedRepositoriesLoaded] = useState(false);
  const [publicRepositoriesLoaded, setPublicRepositoriesLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [scanningRepoId, setScanningRepoId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [githubConnection, setGitHubConnection] = useState({
    loading: false,
    connected: false,
    login: '',
    email: '',
    avatarUrl: '',
    scopes: [],
    lastSyncedAt: null
  });
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanFiles, setScanFiles] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setScanError('');

    if (!currentUser?.id) {
      setGitHubConnection({
        loading: false,
        connected: false,
        login: '',
        email: '',
        avatarUrl: '',
        scopes: [],
        lastSyncedAt: null
      });
      setScanMode('public');
      return () => { cancelled = true; };
    }

    setGitHubConnection((current) => ({ ...current, loading: true }));
    lunarApi.getGitHubStatus()
      .then(async (status) => {
        if (cancelled) return;
        const connected = Boolean(status.connected);
        const login = status.connection?.login || '';
        setGitHubConnection({
          loading: false,
          connected,
          login,
          email: status.connection?.email || '',
          avatarUrl: status.connection?.avatarUrl || '',
          scopes: status.connection?.scopes || [],
          lastSyncedAt: status.connection?.lastSyncedAt || null
        });

        if (!connected) {
          setScanMode('public');
          return;
        }

        setScanMode('connected');
        setActiveUsername(login);
        setInputUsername(login);
        setLoading(true);
        const response = await lunarApi.getGitHubRepositories();
        if (cancelled) return;
        setConnectedRepositories((response.repositories || []).map(normalizeConnectedRepository));
        setConnectedRepositoriesLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setGitHubConnection((current) => ({ ...current, loading: false }));
        if (error.status !== 401 && !error.retryable) {
          setScanError(error.message || 'Không thể kiểm tra kết nối GitHub.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const repositories = scanMode === 'connected' ? connectedRepositories : publicRepositories;
  const hasLoadedRepositories = scanMode === 'connected'
    ? connectedRepositoriesLoaded
    : publicRepositoriesLoaded;

  const filteredRepositories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return repositories;
    return repositories.filter((repository) => (
      repository.fullName?.toLowerCase().includes(query)
      || repository.name?.toLowerCase().includes(query)
      || repository.description?.toLowerCase().includes(query)
      || repository.language?.toLowerCase().includes(query)
    ));
  }, [repositories, searchQuery]);

  const selectMode = (mode) => {
    setScanMode(mode);
    setSearchQuery('');
    setScanError('');
    setScanFiles([]);
    setScanProgress(0);
    setScanStage('');

    if (mode === 'connected' && githubConnection.connected) {
      setActiveUsername(githubConnection.login);
    }
  };

  const handleLoadPublicRepositories = async (targetUser = null) => {
    const usernameInput = String(targetUser || inputUsername || '').trim();
    if (!usernameInput) {
      setScanError('Hãy nhập GitHub username trước khi tải repository.');
      return;
    }

    setLoading(true);
    setScanError('');
    setSearchQuery('');
    try {
      const username = normalizeGitHubUsername(usernameInput);
      const result = await fetchUserGitHubRepos(username);
      setPublicRepositories(result);
      setActiveUsername(username);
      setPublicRepositoriesLoaded(true);
    } catch (error) {
      setPublicRepositories([]);
      setPublicRepositoriesLoaded(true);
      setScanError(error.message || 'Không thể tải repository công khai.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncConnectedRepositories = async () => {
    if (!currentUser) {
      await handleConnectGitHub();
      return;
    }
    if (!githubConnection.connected) {
      setScanError('Hãy kết nối GitHub OAuth trước khi đồng bộ repository cá nhân.');
      return;
    }

    setSyncing(true);
    setScanError('');
    setSearchQuery('');
    try {
      const result = await lunarApi.syncGitHubRepositories();
      setConnectedRepositories((result.repositories || []).map(normalizeConnectedRepository));
      setConnectedRepositoriesLoaded(true);
      setGitHubConnection((current) => ({ ...current, lastSyncedAt: new Date().toISOString() }));
    } catch (error) {
      setScanError(error.message || 'Không thể đồng bộ GitHub repositories.');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectGitHub = async () => {
    setScanError('');
    try {
      const config = await lunarApi.getGitHubConfig();
      if (!config.configured) {
        throw new Error('Kết nối GitHub hiện chưa được bật trên máy chủ Lunar. Vui lòng liên hệ quản trị viên.');
      }
      if (config.authFlow === 'device' && onOpenGitHubAuth) {
        onOpenGitHubAuth();
        return;
      }
      window.location.assign(lunarApi.getGitHubOAuthStartUrl());
    } catch (error) {
      setScanError(error.message || 'Không thể khởi tạo kết nối GitHub.');
    }
  };

  const handleAuditRepository = async (repository) => {
    setScanError('');
    if (!currentUser) {
      await handleConnectGitHub();
      return;
    }
    if (!githubConnection.connected) {
      setScanMode('connected');
      await handleConnectGitHub();
      return;
    }

    setScanningRepoId(repository.id);
    setScanProgress(10);
    setScanStage('Đang xác thực quyền truy cập repository…');
    try {
      setScanProgress(35);
      setScanStage('Đang tải cây thư mục GitHub trong giới hạn an toàn…');
      const result = await lunarApi.deepScanRepository({ repository: repository.fullName });
      notifyScanCompleted(result);
      setScanProgress(90);
      setScanStage('Đang lưu findings và lịch sử quét…');
      setScanFiles(result.files || []);
      setScanProgress(100);
      setScanStage(`Hoàn tất: ${result.findings} findings trong ${result.filesScanned} files.`);
      onSelectProject?.(projectFromDeepScan(result, repository));
    } catch (error) {
      const quota = getUpgradeQuotaContext(error, currentTier, 'VERIFIED_SCAN');
      if (quota && onQuotaExceeded) {
        setScanProgress(0);
        setScanStage('');
        onQuotaExceeded(quota);
        return;
      }
      setScanError(error.message || `Không thể quét ${repository.fullName}.`);
    } finally {
      setScanningRepoId(null);
    }
  };

  const handleLocalFolder = async (files) => {
    setScanError('');
    setScanFiles([]);
    setScanProgress(1);
    setScanStage('Đang quét thư mục ngay trong trình duyệt…');
    try {
      const result = await scanLocalFiles(files, {
        repositoryName: files[0]?.webkitRelativePath?.split('/')[0] || 'local-project',
        onProgress: ({ percent, completed, total }) => {
          setScanProgress(percent);
          setScanStage(`Đã quét ${completed}/${total} files local…`);
        }
      });
      setScanFiles(result.files);
      setScanProgress(100);
      setScanStage(result.projectAttackSimulation
        ? `Hoàn tất: ${result.findings.length} SAST findings, ${result.projectAttackSimulation.findings.length} attack chains.`
        : `Hoàn tất: ${result.findings.length} findings.`);
      const quota = getUpgradeQuotaContext(
        result.projectAttackSimulationError,
        currentTier,
        'AI_REVIEW'
      );
      if (quota && onQuotaExceeded) onQuotaExceeded(quota);
      onSelectProject?.({
        id: `local-${Date.now()}`,
        title: files[0]?.webkitRelativePath?.split('/')[0] || 'Local Project',
        description: `Local deep scan of ${result.filesScanned} files. Source code stayed in this browser except the bounded security context sent to Lunar.`,
        githubUrl: '',
        language: result.files[0]?.language || 'plaintext',
        projectAttackSimulation: result.projectAttackSimulation,
        projectAttackSimulationError: result.projectAttackSimulationError,
        files: result.files
      });
    } catch (error) {
      setScanError(error.message || 'Không thể quét thư mục local.');
    }
  };

  const sourceLabel = scanMode === 'connected'
    ? githubConnection.login
    : scanMode === 'public' ? activeUsername : '';

  return (
    <section
      aria-label="GitHub repository quick scan"
      data-testid="github-quick-scan"
      className="quick-scan-workspace"
    >
      <div className="quick-scan-heading">
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '13px',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 8px 30px rgba(37, 99, 235, 0.28)',
          flexShrink: 0
        }}>
          <ShieldCheck size={25} color="#fff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="quick-scan-kicker">QUICK SCAN WORKSPACE</div>
          <h2>Quét repository trong một luồng</h2>
          <p>Chọn nguồn mã, chọn repository và chạy SAST + AI review ngay tại đây.</p>
        </div>
        <div className={`quick-scan-connection ${githubConnection.connected ? 'connected' : ''}`}>
          {githubConnection.loading ? (
            <><Loader2 size={14} className="spin" /> Đang kiểm tra GitHub</>
          ) : githubConnection.connected ? (
            <>
              {githubConnection.avatarUrl ? (
                <img
                  src={githubConnection.avatarUrl}
                  alt=""
                  className="quick-scan-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : <CheckCircle2 size={14} />}
              Đã kết nối @{githubConnection.login}
            </>
          ) : (
            <><Github size={14} /> Chưa kết nối GitHub</>
          )}
        </div>
      </div>

      <div className="quick-scan-modes" role="tablist" aria-label="Chọn nguồn mã để quét">
        {SCAN_MODES.map((mode) => {
          const Icon = mode.icon;
          const active = scanMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectMode(mode.id)}
              className={`quick-scan-mode ${active ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>
                <strong>{mode.label}</strong>
                <small>{mode.description}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="quick-scan-controls">
        {scanMode === 'connected' && (
          githubConnection.connected ? (
            <>
              <div className="quick-scan-source">
                {githubConnection.avatarUrl ? (
                  <img
                    src={githubConnection.avatarUrl}
                    alt={`Ảnh đại diện @${githubConnection.login}`}
                    className="quick-scan-avatar source"
                    referrerPolicy="no-referrer"
                  />
                ) : <Github size={17} color="#86efac" />}
                <span>
                  <strong>@{githubConnection.login}</strong>
                  <small>
                    {githubConnection.email
                      ? githubConnection.email
                      : githubConnection.lastSyncedAt
                      ? `Đồng bộ ${new Date(githubConnection.lastSyncedAt).toLocaleString('vi-VN')}`
                      : 'Sẵn sàng đồng bộ repository'}
                  </small>
                </span>
              </div>
              <button
                type="button"
                onClick={handleSyncConnectedRepositories}
                disabled={syncing || Boolean(scanningRepoId)}
                className="btn btn-primary btn-sm"
              >
                <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                {syncing ? 'Đang đồng bộ…' : 'Đồng bộ repositories'}
              </button>
            </>
          ) : (
            <>
              <div className="quick-scan-source">
                <KeyRound size={17} color="#c4b5fd" />
                <span>
                  <strong>Kết nối GitHub OAuth</strong>
                  <small>Cho phép quét repository public/private bằng token mã hóa.</small>
                </span>
              </div>
              <button type="button" onClick={handleConnectGitHub} className="btn btn-emerald btn-sm">
                <UserCheck size={14} /> {currentUser ? 'Kết Nối GitHub' : 'Đăng Nhập GitHub'}
              </button>
            </>
          )
        )}

        {scanMode === 'public' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleLoadPublicRepositories();
            }}
            className="quick-scan-public-form"
          >
            <div className="quick-scan-username">
              <Github size={16} />
              <input
                type="text"
                aria-label="GitHub username"
                placeholder="Username hoặc URL GitHub..."
                value={inputUsername}
                onChange={(event) => setInputUsername(event.target.value)}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputUsername.trim()}
              className="btn btn-primary btn-sm"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              {loading ? 'Đang tải…' : 'Tải Repos'}
            </button>
            {!githubConnection.connected && (
              <button type="button" onClick={handleConnectGitHub} className="btn btn-secondary btn-sm">
                <KeyRound size={14} /> Kết Nối GitHub
              </button>
            )}
          </form>
        )}

        {scanMode === 'local' && (
          <div className="quick-scan-local-note">
            <UploadCloud size={18} color="#60a5fa" />
            <span>
              <strong>Mã nguồn được đọc từ trình duyệt</strong>
              <small>Chọn thư mục dự án; các thư mục build và dependency sẽ được bỏ qua.</small>
            </span>
          </div>
        )}
      </div>

      {scanMode === 'local' ? (
        <FolderDropZone onFiles={handleLocalFolder} disabled={Boolean(scanningRepoId)} />
      ) : (
        <div className="quick-scan-results">
          <div className="quick-scan-results-toolbar">
            <div>
              {loading
                ? 'Đang tải repository…'
                : hasLoadedRepositories
                  ? `${filteredRepositories.length} repository${sourceLabel ? ` · @${sourceLabel}` : ''}`
                  : scanMode === 'connected'
                    ? 'Đồng bộ GitHub để chọn repository'
                    : 'Nhập username để xem repository công khai'}
            </div>
            {hasLoadedRepositories && repositories.length > 0 && (
              <label className="quick-scan-filter">
                <Search size={14} />
                <input
                  type="search"
                  placeholder="Lọc repository…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
            )}
          </div>

          {loading ? (
            <div className="quick-scan-empty">
              <Loader2 size={28} className="spin" />
              <strong>Đang tải danh sách repository…</strong>
            </div>
          ) : !hasLoadedRepositories ? (
            <div className="quick-scan-empty">
              <FolderGit2 size={30} />
              <strong>
                {scanMode === 'connected' ? 'Chưa có repository đã đồng bộ' : 'Sẵn sàng tải repository công khai'}
              </strong>
              <span>
                {scanMode === 'connected'
                  ? 'Kết nối GitHub rồi đồng bộ để bắt đầu quick scan.'
                  : 'Bạn có thể xem repository public trước; deep scan cần đăng nhập và GitHub OAuth.'}
              </span>
            </div>
          ) : repositories.length === 0 ? (
            <div className="quick-scan-empty">
              <FolderGit2 size={28} />
              <strong>Không có repository công khai</strong>
              <span>@{sourceLabel || 'user'} chưa có repository public hoặc GitHub API chưa trả dữ liệu.</span>
            </div>
          ) : filteredRepositories.length === 0 ? (
            <div className="quick-scan-empty">
              <Search size={28} />
              <strong>Không tìm thấy repository phù hợp</strong>
              <span>Thử đổi từ khóa lọc hoặc đồng bộ lại GitHub.</span>
            </div>
          ) : (
            <div className="quick-scan-repository-list">
              {filteredRepositories.map((repository) => (
                <article key={repository.id || repository.fullName} className="quick-scan-repository">
                  <div className="quick-scan-repository-main">
                    <Github size={18} color="#60a5fa" />
                    <div>
                      <strong>{repository.fullName}</strong>
                      <span>{repository.description}</span>
                      <small>
                        {repository.language || 'Unknown'}
                        {' · '}
                        {repository.isPrivate ? 'Private' : 'Public'}
                        {repository.stars !== null ? ` · ⭐ ${repository.stars} · 🍴 ${repository.forks}` : ''}
                        {repository.updatedAt ? ` · cập nhật ${repository.updatedAt}` : ''}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAuditRepository(repository)}
                    disabled={Boolean(scanningRepoId)}
                    className="btn btn-primary btn-sm"
                  >
                    {scanningRepoId === repository.id ? (
                      <><Loader2 size={14} className="spin" /> Đang quét…</>
                    ) : (
                      <><ShieldCheck size={14} /> Quick Scan <ArrowRight size={14} /></>
                    )}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      <DeepScanProgress
        active={Boolean(scanningRepoId) || (scanProgress > 0 && scanProgress < 100)}
        progress={scanProgress}
        stage={scanStage}
        error={scanError}
      />
      <RepoTreeView files={scanFiles} />
    </section>
  );
}
