/**
 * GitHub API Helper Service
 * Enables fetching repository structure, user repositories & file content directly from GitHub REST API
 */

export function parseGitHubUrl(urlStr) {
  if (!urlStr) return null;
  
  let cleanUrl = urlStr.trim();
  cleanUrl = cleanUrl.replace(/^https?:\/\/github\.com\//, '');
  cleanUrl = cleanUrl.replace(/\/$/, '').replace(/\.git$/, '');
  
  const parts = cleanUrl.split('/');
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] };
  }
  return null;
}

// Fetch all Repositories owned by any GitHub User
export async function fetchUserGitHubRepos(username) {
  if (!username) return [];
  const cleanUsername = username.replace(/^@/, '').trim();
  
  try {
    const res = await fetch(`https://api.github.com/users/${cleanUsername}/repos?sort=updated&per_page=20`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Không tìm thấy người dùng GitHub "${cleanUsername}".`);
      }
      throw new Error(`Lỗi kết nối GitHub API (${res.status})`);
    }
    const repos = await res.json();
    return repos.map(r => ({
      id: `gh-repo-${r.id}`,
      name: r.name,
      fullName: r.full_name,
      htmlUrl: r.html_url,
      description: r.description || 'Public GitHub Repository',
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language || 'JavaScript',
      updatedAt: new Date(r.updated_at).toLocaleDateString('vi-VN'),
      isPrivate: r.private
    }));
  } catch (err) {
    console.warn('GitHub User Repos fetch notice:', err.message);
    throw err;
  }
}

export async function fetchGitHubRepoDetails(urlStr) {
  const parsed = parseGitHubUrl(urlStr);
  if (!parsed) {
    throw new Error('Đường dẫn GitHub không hợp lệ. Ví dụ đúng: https://github.com/facebook/react');
  }

  const { owner, repo } = parsed;

  try {
    // 1. Fetch Repository Info
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        throw new Error(`Không tìm thấy Repository "${owner}/${repo}" hoặc đây là Repo Private.`);
      }
      throw new Error(`Lỗi kết nối GitHub API (${repoRes.status})`);
    }
    const repoData = await repoRes.json();

    // 2. Fetch File Tree (Default Branch)
    const defaultBranch = repoData.default_branch || 'main';
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
    let fileList = [];
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      fileList = (treeData.tree || [])
        .filter(item => item.type === 'blob' && !item.path.includes('node_modules/') && !item.path.includes('.git/'))
        .slice(0, 250);
    }

    // 3. Fetch bounded source previews. Authenticated/private deep scans run on the backend.
    const sampledFiles = [];
    const mainLanguages = ['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'cs', 'cpp', 'html', 'css'];
    
    const candidateFiles = fileList
      .filter(f => mainLanguages.some(ext => f.path.endsWith('.' + ext)))
      .slice(0, 20);

    for (const f of candidateFiles) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${f.path}`);
        if (rawRes.ok) {
          const text = await rawRes.text();
          sampledFiles.push({
            path: f.path,
            language: getLanguageFromExtension(f.path),
            content: text.slice(0, 120000),
            annotations: []
          });
        }
      } catch (err) {
        console.warn('Could not fetch raw file:', f.path, err);
      }
    }

    return {
      title: repoData.name,
      githubUrl: repoData.html_url,
      description: repoData.description || 'Dự án nguồn mở GitHub',
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language || 'JavaScript',
      author: {
        name: repoData.owner.login,
        username: repoData.owner.login,
        avatar: repoData.owner.avatar_url,
        badge: 'GitHub Developer',
        karma: Math.floor(repoData.stargazers_count * 5 + 100)
      },
      files: sampledFiles.length > 0 ? sampledFiles : [
        {
          path: 'README.md',
          language: 'markdown',
          content: repoData.description || '# ' + repoData.name,
          annotations: []
        }
      ]
    };
  } catch (error) {
    throw error;
  }
}

export async function fetchGitHubRepoTree(urlStr, { maxFiles = 250 } = {}) {
  const parsed = parseGitHubUrl(urlStr);
  if (!parsed) throw new Error('GitHub repository URL is invalid.');
  const { owner, repo } = parsed;
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!repoResponse.ok) throw new Error(`GitHub repository request failed (${repoResponse.status}).`);
  const repository = await repoResponse.json();
  const branch = repository.default_branch || 'main';
  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  if (!treeResponse.ok) throw new Error(`GitHub tree request failed (${treeResponse.status}).`);
  const tree = await treeResponse.json();
  if (tree.truncated) throw new Error('GitHub returned a truncated tree.');
  return {
    repository,
    branch,
    files: (tree.tree || [])
      .filter((item) => item.type === 'blob')
      .filter((item) => !/(^|\/)(node_modules|dist|build|vendor|\.git|coverage)(\/|$)/.test(item.path))
      .slice(0, maxFiles)
  };
}

function getLanguageFromExtension(filepath) {
  if (filepath.endsWith('.py')) return 'python';
  if (filepath.endsWith('.ts') || filepath.endsWith('.tsx')) return 'typescript';
  if (filepath.endsWith('.js') || filepath.endsWith('.jsx')) return 'javascript';
  if (filepath.endsWith('.go')) return 'go';
  if (filepath.endsWith('.rs')) return 'rust';
  if (filepath.endsWith('.java')) return 'java';
  if (filepath.endsWith('.css')) return 'css';
  if (filepath.endsWith('.html')) return 'html';
  return 'plaintext';
}
