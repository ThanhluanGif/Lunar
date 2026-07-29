/**
 * Repository Scanner — Orchestrates full repo deep scanning
 * Fetches all files from GitHub, runs SAST + AI on each file,
 * aggregates results with progress tracking.
 */

import { fetchFullRepoTree, fetchFileContent, getScannableFiles } from './githubService.js';
import { scanCodeForSecurityVulnerabilities as scanCodeForVulnerabilities } from './securityScannerEngine.js';
import { reviewCode } from './geminiService.js';

/** Detect language from filename */
function detectLang(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', go: 'go', php: 'php', rb: 'ruby',
    cs: 'csharp', rs: 'rust', sql: 'sql', sh: 'shell', kt: 'kotlin',
    swift: 'swift', dart: 'dart', vue: 'vue', svelte: 'svelte',
    html: 'html', css: 'css', json: 'json', yml: 'yaml', yaml: 'yaml',
    xml: 'xml', toml: 'toml', md: 'markdown'
  };
  return map[ext] || ext;
}

/**
 * Scan a GitHub repository end-to-end.
 *
 * @param {string} owner - GitHub username/org
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name (default 'main')
 * @param {Object} options
 * @param {Function} options.onProgress - Callback({ phase, current, total, currentFile, results })
 * @param {boolean} options.enableAI - Enable AI review on high-risk files (default false)
 * @param {number} options.maxFiles - Max files to scan (default 200)
 * @param {AbortSignal} options.signal - Abort signal to cancel scan
 * @returns {Promise<Object>} - Full scan results
 */
export async function scanRepository(owner, repo, branch = 'main', options = {}) {
  const { onProgress, enableAI = false, maxFiles = 200, signal } = options;
  const startTime = Date.now();

  const emitProgress = (phase, current, total, currentFile, partialResults) => {
    if (onProgress) {
      onProgress({ phase, current, total, currentFile, results: partialResults, startTime });
    }
  };

  // Phase 1: Fetch file tree
  emitProgress('fetching_tree', 0, 0, '', null);
  let tree;
  try {
    tree = await fetchFullRepoTree(owner, repo, branch);
  } catch (err) {
    return { error: true, message: `Không thể lấy cấu trúc repo: ${err.message}` };
  }

  if (!tree || tree.length === 0) {
    return { error: true, message: 'Repository trống hoặc không tìm thấy file.' };
  }

  // Filter scannable files
  const scannableFiles = getScannableFiles(tree).slice(0, maxFiles);
  const totalFiles = scannableFiles.length;

  if (totalFiles === 0) {
    return { error: true, message: 'Không tìm thấy file code để quét.' };
  }

  // Phase 2: Scan files
  const fileResults = [];
  const allVulnerabilities = [];
  let scannedCount = 0;

  // Process in batches of 5 concurrent requests
  const batchSize = 5;
  for (let i = 0; i < scannableFiles.length; i += batchSize) {
    if (signal?.aborted) break;

    const batch = scannableFiles.slice(i, i + batchSize);
    const batchPromises = batch.map(async (fileInfo) => {
      try {
        const content = await fetchFileContent(owner, repo, fileInfo.path, branch);
        if (!content || content.length < 5) return null;

        // Run SAST scanner
        const scanResult = scanCodeForVulnerabilities(content, fileInfo.path);
        const vulns = scanResult.vulnerabilities || [];

        scannedCount++;
        const fileResult = {
          filename: fileInfo.path,
          size: fileInfo.size || content.length,
          language: detectLang(fileInfo.path),
          vulnCount: vulns.length,
          score: Math.max(0, 100 - (vulns.filter(v => v.severity === 'critical').length * 20) - (vulns.filter(v => v.severity === 'high' || v.severity === 'warning').length * 10) - (vulns.filter(v => v.severity === 'medium' || v.severity === 'info').length * 3)),
          severity: vulns.some(v => v.severity === 'critical') ? 'critical' : vulns.some(v => v.severity === 'high' || v.severity === 'warning') ? 'high' : vulns.some(v => v.severity === 'medium') ? 'medium' : 'safe',
          vulnerabilities: vulns
        };

        allVulnerabilities.push(...vulns.map(v => ({ ...v, file: fileInfo.path })));
        return fileResult;
      } catch {
        scannedCount++;
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.filter(Boolean).forEach(r => fileResults.push(r));

    emitProgress('scanning_files', scannedCount, totalFiles, batch[batch.length - 1]?.path || '', {
      scanned: scannedCount,
      vulnsFound: allVulnerabilities.length
    });
  }

  // Phase 3: AI review on high-risk files (optional)
  let aiReviews = [];
  if (enableAI) {
    const highRiskFiles = fileResults.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 5);

    for (let i = 0; i < highRiskFiles.length; i++) {
      if (signal?.aborted) break;
      emitProgress('ai_review', i + 1, highRiskFiles.length, highRiskFiles[i].filename, null);

      try {
        const content = await fetchFileContent(owner, repo, highRiskFiles[i].filename, branch);
        const aiResult = await reviewCode(content, highRiskFiles[i].language, highRiskFiles[i].filename);
        if (aiResult && !aiResult.error) {
          aiReviews.push({ filename: highRiskFiles[i].filename, ...aiResult });
        }
      } catch { /* skip AI failures */ }
    }
  }

  // Phase 4: Complete — aggregate results
  const criticalCount = allVulnerabilities.filter(v => v.severity === 'critical').length;
  const highCount = allVulnerabilities.filter(v => v.severity === 'high' || v.severity === 'warning').length;
  const mediumCount = allVulnerabilities.filter(v => v.severity === 'medium' || v.severity === 'info').length;
  const lowCount = allVulnerabilities.filter(v => v.severity === 'low').length;

  const overallScore = Math.max(0, Math.min(100,
    100 - (criticalCount * 15) - (highCount * 8) - (mediumCount * 3) - (lowCount * 1)
  ));

  const result = {
    repository: `${owner}/${repo}`,
    branch,
    totalFiles: tree.length,
    scannedFiles: fileResults.length,
    skippedFiles: tree.length - fileResults.length,
    overallScore,
    vulnerabilities: allVulnerabilities,
    fileResults: fileResults.sort((a, b) => a.score - b.score), // worst first
    aiReviews,
    stats: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      total: allVulnerabilities.length
    },
    summary: {
      totalVulnerabilities: allVulnerabilities.length,
      securityScore: overallScore,
      scanDuration: Date.now() - startTime,
      aiEnabled: enableAI,
      aiReviewCount: aiReviews.length
    }
  };

  emitProgress('complete', totalFiles, totalFiles, '', result);
  return result;
}

/**
 * Scan locally uploaded files
 * @param {Array<{name, content}>} files - Files with content
 * @param {Object} options - { onProgress, enableAI }
 * @returns {Object} - Scan results
 */
export async function scanLocalFiles(files, options = {}) {
  const { onProgress, enableAI = false } = options;
  const startTime = Date.now();
  const allVulnerabilities = [];
  const fileResults = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress({
        phase: 'scanning_files',
        current: i + 1,
        total: files.length,
        currentFile: file.name,
        results: { scanned: i, vulnsFound: allVulnerabilities.length }
      });
    }

    const scanResult = scanCodeForVulnerabilities(file.content, file.name);
    const vulns = scanResult.vulnerabilities || [];

    allVulnerabilities.push(...vulns.map(v => ({ ...v, file: file.name })));

    fileResults.push({
      filename: file.name,
      size: file.content.length,
      language: detectLang(file.name),
      vulnCount: vulns.length,
      score: Math.max(0, 100 - (vulns.filter(v => v.severity === 'critical').length * 20) - (vulns.filter(v => v.severity === 'high' || v.severity === 'warning').length * 10)),
      severity: vulns.some(v => v.severity === 'critical') ? 'critical' : vulns.some(v => v.severity === 'high' || v.severity === 'warning') ? 'high' : 'safe',
      vulnerabilities: vulns
    });
  }

  const criticalCount = allVulnerabilities.filter(v => v.severity === 'critical').length;
  const highCount = allVulnerabilities.filter(v => v.severity === 'high' || v.severity === 'warning').length;
  const overallScore = Math.max(0, 100 - (criticalCount * 15) - (highCount * 8));

  return {
    repository: 'local-upload',
    totalFiles: files.length,
    scannedFiles: fileResults.length,
    overallScore,
    vulnerabilities: allVulnerabilities,
    fileResults: fileResults.sort((a, b) => a.score - b.score),
    stats: {
      critical: criticalCount,
      high: highCount,
      medium: allVulnerabilities.filter(v => v.severity === 'medium' || v.severity === 'info').length,
      low: allVulnerabilities.filter(v => v.severity === 'low').length,
      total: allVulnerabilities.length
    },
    summary: {
      totalVulnerabilities: allVulnerabilities.length,
      securityScore: overallScore,
      scanDuration: Date.now() - startTime
    }
  };
}
