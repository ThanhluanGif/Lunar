import React, { useState, useEffect } from 'react';
import { Github, RefreshCw, FolderGit2, ArrowRight, ShieldCheck, Loader2, Search, UserCheck, KeyRound } from 'lucide-react';
import { fetchUserGitHubRepos, fetchGitHubRepoDetails } from '../services/githubService';
import { analyzeProjectWithAI } from '../services/aiReviewEngine';
import { supabaseDb } from '../services/supabaseClient';

export default function UserGitHubWorkspace({ currentUser, onSelectProject, onOpenAuth }) {
  // Dynamic Username: Uses logged in user's handle if available, or user input
  const [inputUsername, setInputUsername] = useState(
    currentUser?.nickname?.replace('@', '') || ''
  );
  const [activeUsername, setActiveUsername] = useState(
    currentUser?.nickname?.replace('@', '') || ''
  );
  const [userRepos, setUserRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanningRepoId, setScanningRepoId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    if (currentUser?.nickname) {
      const cleanName = currentUser.nickname.replace('@', '');
      setInputUsername(cleanName);
      setActiveUsername(cleanName);
      handleSyncRepos(cleanName);
    }
  }, [currentUser]);

  const handleSyncRepos = async (targetUser = null) => {
    const userToFetch = (targetUser || inputUsername || '').trim();
    if (!userToFetch) return;

    setLoading(true);
    try {
      const repos = await fetchUserGitHubRepos(userToFetch);
      setUserRepos(repos);
      setActiveUsername(userToFetch);
      setHasSynced(true);
    } catch (err) {
      console.warn('Error fetching repos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuditUserRepo = async (repo) => {
    setScanningRepoId(repo.id);
    try {
      const rawData = await fetchGitHubRepoDetails(repo.htmlUrl);
      const analyzed = analyzeProjectWithAI(rawData);
      analyzed.id = 'synced-' + repo.name + '-' + Date.now();
      
      // Save audit to Supabase / LocalStorage
      await supabaseDb.saveCodeAudit({
        title: analyzed.title,
        cvss: analyzed.cvssScore || 7.5,
        scanned_at: new Date().toISOString()
      });

      onSelectProject(analyzed);
    } catch (err) {
      alert(`Không thể tải Repo "${repo.name}": ${err.message}`);
    } finally {
      setScanningRepoId(null);
    }
  };

  const filteredRepos = userRepos.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="glass-panel" style={{ padding: '28px', marginBottom: '40px', borderColor: 'var(--border-color)' }}>
      
      {/* Workspace Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '8px',
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)'
          }}>
            <FolderGit2 size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              Đồng Bộ GitHub Repositories Cá Nhân
              {activeUsername && (
                <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                  <Github size={12} /> @{activeUsername}
                </span>
              )}
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Đăng nhập hoặc nhập Username GitHub của bạn để AI đọc trực tiếp danh sách dự án thật của bạn
            </p>
          </div>
        </div>

        {/* Dynamic Controls for Any User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSyncRepos(); }} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Github size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Nhập GitHub Username của bạn..."
                className="input-control"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                style={{ paddingLeft: '36px', height: '36px', fontSize: '0.82rem', width: '220px' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputUsername.trim()}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px' }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Tải Repos
            </button>
          </form>

          {!currentUser && (
            <button
              onClick={onOpenAuth}
              className="btn btn-emerald btn-sm"
              style={{ gap: '6px' }}
            >
              <UserCheck size={14} /> Đăng Nhập GitHub
            </button>
          )}
        </div>
      </div>

      {/* Main Content State */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#1e293b', borderRadius: 'var(--radius-md)' }}>
          <Loader2 size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
          <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Đang kết nối GitHub API & tải danh sách dự án của @{inputUsername}...
          </div>
        </div>
      ) : !hasSynced ? (
        <div style={{
          padding: '36px 20px',
          textAlign: 'center',
          background: '#0f172a',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-color)'
        }}>
          <Github size={36} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
            Chưa đồng bộ Repository GitHub
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 16px auto' }}>
            Nhập <strong>GitHub Username</strong> của bạn ở ô trên hoặc bấm <strong>Đăng nhập GitHub</strong> để ứng dụng tự động hiển thị các dự án thật của bạn.
          </p>
        </div>
      ) : filteredRepos.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Không tìm thấy Repository công khai nào của @{activeUsername}.
        </div>
      ) : (
        <>
          {/* Search Filter for Repos */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Hiển thị <strong>{filteredRepos.length}</strong> dự án GitHub thật của <strong>@{activeUsername}</strong>:
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                placeholder="Lọc tên repo..."
                className="input-control"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', height: '32px', fontSize: '0.78rem', width: '180px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {filteredRepos.map((repo) => (
              <div
                key={repo.id}
                className="glass-card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border-color)',
                  background: '#1e293b'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Github size={18} color="#60a5fa" />
                      <h3 style={{ fontSize: '1.02rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#fff' }}>
                        {repo.name}
                      </h3>
                    </div>
                    <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                      {repo.language}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.5', minHeight: '38px' }}>
                    {repo.description}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span>⭐ {repo.stars} stars</span>
                      <span>🍴 {repo.forks} forks</span>
                    </div>
                    <span>Cập nhật {repo.updatedAt}</span>
                  </div>

                  <button
                    onClick={() => handleAuditUserRepo(repo)}
                    disabled={scanningRepoId === repo.id}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', gap: '8px' }}
                  >
                    {scanningRepoId === repo.id ? (
                      <>
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Đang Quét SAST & AI Review...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        <span>Quét Bug & AI Auto-Fix Repo Này</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
