import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  FolderGit2,
  Github,
  Loader2,
  RefreshCw,
  Search
} from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

function projectFromDeepScan(result, repository) {
  return {
    id: result.projectId,
    title: result.repository,
    description: `Deep scan of ${result.filesScanned} files on ${result.branch}.`,
    githubUrl: repository.repoUrl,
    language: repository.language,
    overallScore: result.score,
    cvssScore: result.severity?.critical ? 9.1 : result.severity?.high ? 7.5 : 0,
    deepScan: result,
    files: (result.files || []).map((file) => ({
      path: file.path,
      language: file.language || repository.language?.toLowerCase() || 'plaintext',
      content: '// Source analyzed securely on the Lunar backend.',
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

export default function GitHubRepoSelector({ currentUser, onSelectRepo, onOpenAuth }) {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [scanningRepoId, setScanningRepoId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.id) {
      setRepositories([]);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setErrorMsg('');
    Promise.all([
      lunarApi.getGitHubStatus(),
      lunarApi.getGitHubRepositories()
    ])
      .then(([status, repositoryResult]) => {
        if (cancelled) return;
        if (!status.connected) {
          setErrorMsg('Tài khoản Lunar chưa kết nối GitHub OAuth.');
          setRepositories([]);
          return;
        }
        setRepositories(repositoryResult.repositories || []);
      })
      .catch((error) => {
        if (!cancelled) setErrorMsg(error.message || 'Không thể tải repositories đã kết nối.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const filteredRepos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return repositories;
    return repositories.filter((repository) => (
      repository.fullName?.toLowerCase().includes(query)
      || repository.language?.toLowerCase().includes(query)
    ));
  }, [repositories, searchQuery]);

  const handleSyncNow = async () => {
    if (!currentUser) {
      onOpenAuth?.();
      return;
    }
    setSyncing(true);
    setErrorMsg('');
    try {
      const result = await lunarApi.syncGitHubRepositories();
      setRepositories(result.repositories || []);
    } catch (error) {
      setErrorMsg(error.message || 'Không thể đồng bộ GitHub repositories.');
    } finally {
      setSyncing(false);
    }
  };

  const handleChooseRepo = async (repository) => {
    setSelectedRepo(repository);
    setScanningRepoId(repository.id);
    setIsOpen(false);
    setErrorMsg('');
    try {
      const result = await lunarApi.deepScanRepository({ repository: repository.fullName });
      onSelectRepo?.(projectFromDeepScan(result, repository));
    } catch (error) {
      setErrorMsg(error.message || `Không thể quét ${repository.fullName}.`);
    } finally {
      setScanningRepoId(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(15,23,42,.75)',
        border: '1px solid rgba(124,58,237,.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Github size={20} color="var(--accent-purple-light)" />
          <div>
            <div style={{ fontWeight: 700 }}>GitHub Quick Scan</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              Đăng nhập và kết nối GitHub để chọn repository và quét bằng một click.
            </div>
          </div>
        </div>
        <button onClick={onOpenAuth} className="btn btn-primary btn-sm">
          <Github size={14} /> Đăng nhập để kết nối GitHub
        </button>
      </div>
    );
  }

  return (
    <section style={{ position: 'relative', marginBottom: '20px' }} aria-label="GitHub repository quick scan">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(15,23,42,.85)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 16px'
      }}>
        <FolderGit2 size={20} color="var(--accent-cyan)" />
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls="github-repository-options"
            onClick={() => setIsOpen((open) => !open)}
            className="input-control"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <span>
              {scanningRepoId
                ? `Đang quét ${selectedRepo?.fullName}…`
                : selectedRepo?.fullName || 'Chọn repository để quét ngay'}
            </span>
            {scanningRepoId
              ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <ChevronDown size={16} />}
          </button>
        </div>
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing || Boolean(scanningRepoId)}
          className="btn btn-secondary btn-sm"
        >
          <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Đang đồng bộ…' : 'Làm mới Repo'}
        </button>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '6px',
          background: '#0b0f19',
          border: '1px solid var(--accent-purple)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 12px 32px rgba(0,0,0,.8)',
          zIndex: 50,
          padding: '12px'
        }}>
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="search"
              placeholder="Tìm theo tên hoặc ngôn ngữ…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="input-control"
              style={{ paddingLeft: '32px' }}
              autoFocus
            />
          </div>
          <div id="github-repository-options" role="listbox" style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {filteredRepos.map((repository) => (
              <button
                type="button"
                role="option"
                aria-selected={selectedRepo?.id === repository.id}
                key={repository.id || repository.fullName}
                onClick={() => handleChooseRepo(repository)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: 0,
                  borderRadius: '6px',
                  background: selectedRepo?.id === repository.id ? 'rgba(124,58,237,.2)' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left'
                }}
              >
                <span>
                  <strong>{repository.fullName}</strong>
                  <small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {repository.language || 'Unknown'} · {repository.isPrivate ? 'Private' : 'Public'}
                    {repository.updatedAt ? ` · đồng bộ ${new Date(repository.updatedAt).toLocaleDateString('vi-VN')}` : ''}
                  </small>
                </span>
                <span className="badge badge-emerald">Quét Repo</span>
              </button>
            ))}
            {!loading && filteredRepos.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Chưa có repository. Hãy kết nối GitHub hoặc bấm “Làm mới Repo”.
              </p>
            )}
            {loading && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải repositories…</p>
            )}
          </div>
        </div>
      )}

      {errorMsg && <p role="alert" style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '6px' }}>{errorMsg}</p>}
    </section>
  );
}
