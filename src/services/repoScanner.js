import { scanCodeForSecurityVulnerabilities } from './securityScannerEngine';

const DEFAULT_CONCURRENCY = 4;

async function mapConcurrent(items, limit, worker, onProgress) {
  const results = new Array(items.length);
  let cursor = 0;
  let completed = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
      completed += 1;
      onProgress?.({ completed, total: items.length, percent: Math.round((completed / items.length) * 100) });
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export async function scanLocalFiles(files, {
  concurrency = DEFAULT_CONCURRENCY,
  onProgress
} = {}) {
  const sourceFiles = Array.from(files || []).filter((file) => file.size <= 512000);
  const results = await mapConcurrent(
    sourceFiles,
    Math.min(Math.max(concurrency, 1), 8),
    async (file) => {
      const content = await file.text();
      const path = file.webkitRelativePath || file.name;
      const scan = scanCodeForSecurityVulnerabilities(content, path);
      return {
        path,
        size: file.size,
        status: scan.stats.criticalCount ? 'critical' : scan.stats.total ? 'warning' : 'safe',
        findings: scan.vulnerabilities,
        content
      };
    },
    onProgress
  );
  return {
    files: results,
    findings: results.flatMap((file) => file.findings),
    filesScanned: results.length
  };
}
