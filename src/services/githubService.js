/**
 * GitHub API Helper Service
 * Enables fetching repository structure, user repositories & file content directly from GitHub REST API
 * UPGRADED: Full repo tree fetching, batch file content, smart filtering
 */

// =========================================================
// Scannable file extensions
// =========================================================
const SCANNABLE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'py', 'java', 'go', 'php', 'rb', 'cs', 'rs', 'sql',
  'sh', 'bash', 'kt', 'swift', 'dart', 'scala',
  'vue', 'svelte',
  'html', 'css', 'scss', 'less',
  'json', 'yml', 'yaml', 'xml', 'toml',
  'env', 'cfg', 'ini', 'properties',
  'gradle', 'tf', 'hcl',
  'dockerfile', 'makefile'
]);

// Directories to skip
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', 'vendor', '__pycache__',
  '.next', '.nuxt', 'coverage', '.cache', '.turbo', '.vercel',
  'target', 'bin', 'obj', '.gradle', '.idea', '.vscode',
  'venv', '.venv', 'env', '.tox', 'eggs', '.eggs',
  'bower_components', 'jspm_packages',
  '.terraform', '.serverless'
]);

// Binary extensions to skip
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp', 'tiff',
  'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'wav', 'ogg',
  'zip', 'tar', 'gz', 'rar', '7z', 'bz2',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'exe', 'dll', 'so', 'dylib', 'bin',
  'lock', 'map'
]);

// =========================================================
// Original functions (backward compatible)
// =========================================================

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

export async function fetchUserGitHubRepos(username) {
  if (!username) return [];
  const cleanUsername = username.replace(/^@/, '').trim();
  
  try {
    const res = await fetch(`https://api.github.com/users/${cleanUsername}/repos?sort=updated&per_page=30`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Không tìm thấy người dùng GitHub "${cleanUsername}".`);
      }
      if (res.status === 403) {
        throw new Error('GitHub API rate limit. Vui lòng đợi vài phút.');
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
      defaultBranch: r.default_branch || 'main',
      updatedAt: new Date(r.updated_at).toLocaleDateString('vi-VN'),
      isPrivate: r.private,
      size: r.size
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
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        throw new Error(`Không tìm thấy Repository "${owner}/${repo}" hoặc đây là Repo Private.`);
      }
      throw new Error(`Lỗi kết nối GitHub API (${repoRes.status})`);
    }
    const repoData = await repoRes.json();

    const defaultBranch = repoData.default_branch || 'main';
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
    let fileList = [];
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      fileList = (treeData.tree || [])
        .filter(item => item.type === 'blob' && !item.path.includes('node_modules/') && !item.path.includes('.git/'))
        .slice(0, 30);
    }

    const sampledFiles = [];
    const mainLanguages = ['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'cs', 'cpp', 'html', 'css'];
    
    const candidateFiles = fileList
      .filter(f => mainLanguages.some(ext => f.path.endsWith('.' + ext)))
      .slice(0, 3);

    for (const f of candidateFiles) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${f.path}`);
        if (rawRes.ok) {
          const text = await rawRes.text();
          sampledFiles.push({
            path: f.path,
            language: getLanguageFromExtension(f.path),
            content: text.slice(0, 4000),
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
      defaultBranch,
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

// =========================================================
// NEW: Full repository scanning functions
// =========================================================

/**
 * Fetch complete recursive file tree from GitHub API
 * @param {string} owner - GitHub username/org
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name
 * @returns {Promise<Array>} - Array of { path, type, size }
 */
export async function fetchFullRepoTree(owner, repo, branch = 'main') {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );

  if (!res.ok) {
    if (res.status === 404) {
      // Try 'master' branch as fallback
      const res2 = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`
      );
      if (!res2.ok) throw new Error(`Không tìm thấy repo hoặc branch (${res.status})`);
      const data2 = await res2.json();
      return (data2.tree || []).map(item => ({
        path: item.path,
        type: item.type === 'blob' ? 'file' : 'dir',
        size: item.size || 0,
        sha: item.sha
      }));
    }

    // Check rate limit
    const remaining = res.headers.get('X-RateLimit-Remaining');
    if (remaining === '0') {
      const resetTime = res.headers.get('X-RateLimit-Reset');
      const resetDate = new Date(parseInt(resetTime) * 1000);
      throw new Error(`GitHub API rate limit. Thử lại lúc ${resetDate.toLocaleTimeString('vi-VN')}`);
    }

    throw new Error(`GitHub API error (${res.status})`);
  }

  const data = await res.json();
  return (data.tree || []).map(item => ({
    path: item.path,
    type: item.type === 'blob' ? 'file' : 'dir',
    size: item.size || 0,
    sha: item.sha
  }));
}

/**
 * Fetch raw content of a single file
 * @param {string} owner
 * @param {string} repo
 * @param {string} path - File path within repo
 * @param {string} branch
 * @returns {Promise<string>} - File content as text
 */
export async function fetchFileContent(owner, repo, path, branch = 'main') {
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
  );

  if (!res.ok) {
    if (res.status === 404) {
      // Try master branch
      const res2 = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/master/${path}`
      );
      if (res2.ok) return await res2.text();
    }
    return null;
  }

  const text = await res.text();
  // Limit to 50KB per file to avoid memory issues
  return text.substring(0, 50000);
}

/**
 * Fetch multiple files in parallel with concurrency limit
 * @param {string} owner
 * @param {string} repo
 * @param {Array<string>} filePaths
 * @param {string} branch
 * @param {number} concurrency - Max concurrent requests
 * @returns {Promise<Array<{path, content}>>}
 */
export async function fetchBatchFiles(owner, repo, filePaths, branch = 'main', concurrency = 5) {
  const results = [];
  
  for (let i = 0; i < filePaths.length; i += concurrency) {
    const batch = filePaths.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (filePath) => {
        const content = await fetchFileContent(owner, repo, filePath, branch);
        return content ? { path: filePath, content } : null;
      })
    );
    results.push(...batchResults.filter(Boolean));
  }

  return results;
}

/**
 * Filter tree to only scannable code files (skip binary, vendor dirs, etc.)
 * @param {Array} tree - Full file tree from fetchFullRepoTree
 * @returns {Array} - Filtered list of scannable files
 */
export function getScannableFiles(tree) {
  return tree.filter(item => {
    if (item.type !== 'file') return false;
    
    // Skip large files (> 500KB)
    if (item.size > 500000) return false;
    
    // Check if any parent directory should be skipped
    const pathParts = item.path.split('/');
    for (const part of pathParts.slice(0, -1)) {
      if (SKIP_DIRS.has(part.toLowerCase())) return false;
    }
    
    // Get file extension
    const filename = pathParts[pathParts.length - 1].toLowerCase();
    const ext = filename.split('.').pop();
    
    // Skip binary files
    if (BINARY_EXTENSIONS.has(ext)) return false;
    
    // Check if extension is scannable, or if filename is scannable
    if (SCANNABLE_EXTENSIONS.has(ext)) return true;
    if (filename === 'dockerfile' || filename === 'makefile' || filename === '.env') return true;
    
    return false;
  });
}

// =========================================================
// Helper
// =========================================================

function getLanguageFromExtension(filepath) {
  const ext = filepath.split('.').pop().toLowerCase();
  const map = {
    py: 'python', ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript', mjs: 'javascript',
    go: 'go', rs: 'rust', java: 'java', kt: 'kotlin',
    swift: 'swift', dart: 'dart', cs: 'csharp', rb: 'ruby',
    php: 'php', scala: 'scala', sql: 'sql',
    css: 'css', scss: 'scss', html: 'html', vue: 'vue',
    json: 'json', yml: 'yaml', yaml: 'yaml', xml: 'xml',
    sh: 'shell', bash: 'shell', tf: 'terraform',
    md: 'markdown', toml: 'toml'
  };
  return map[ext] || 'plaintext';
}
