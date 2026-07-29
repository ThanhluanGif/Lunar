import { scanCodeForSecurityVulnerabilities, languageFromPath } from './securityScannerEngine';
import { simulateProjectHackerAttack } from './geminiService';

const DEFAULT_CONCURRENCY = 4;
const MAX_SIMULATION_FILES = 20;
const MAX_SIMULATION_CHARACTERS = 110000;
const MAX_SIMULATION_CHARACTERS_PER_FILE = 30000;
const IMPORTANT_PATH_PATTERN = /(^|\/)(routes?|controllers?|auth|middleware|models?|schemas?|database|db|config)(\/|\.|$)|(^|\/)(dockerfile|docker-compose|package\.json|.*\.sql)$/i;

function importanceScore(file) {
  const filePath = String(file.path || file.name || '');
  let score = IMPORTANT_PATH_PATTERN.test(filePath) ? 100 : 0;
  if (/\b(router|app)\.(get|post|put|patch|delete)\b/.test(file.content)) score += 80;
  if (/\b(auth|token|session|permission|role|database|query|sql)\b/i.test(file.content)) score += 50;
  if (/\.(js|jsx|ts|tsx|py|java|go|php|rb|cs|rs|sql)$/i.test(filePath)) score += 20;
  return score;
}

export function selectImportantProjectFiles(files, limit = MAX_SIMULATION_FILES) {
  const candidates = Array.from(files || [])
    .filter((file) => typeof file.content === 'string' && file.content.trim())
    .map((file, index) => ({ file, index, score: importanceScore(file) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit);
  let remainingCharacters = MAX_SIMULATION_CHARACTERS;
  return candidates.reduce((selected, { file }) => {
    if (remainingCharacters <= 0) return selected;
    const content = file.content.slice(
      0,
      Math.min(MAX_SIMULATION_CHARACTERS_PER_FILE, remainingCharacters)
    );
    remainingCharacters -= content.length;
    selected.push({
      path: file.path || file.name,
      language: file.language || languageFromPath(file.path || file.name),
      content
    });
    return selected;
  }, []);
}

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
  onProgress,
  repositoryName,
  simulateAttack = true,
  provider = 'auto'
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
        language: scan.language,
        size: file.size,
        status: scan.stats.criticalCount ? 'critical' : scan.stats.total ? 'warning' : 'safe',
        findings: scan.vulnerabilities,
        content
      };
    },
    onProgress
  );
  let projectAttackSimulation = null;
  let projectAttackSimulationError = null;
  if (simulateAttack && results.length) {
    try {
      projectAttackSimulation = await simulateProjectHackerAttack({
        projectFiles: selectImportantProjectFiles(results),
        repositoryName: repositoryName || sourceFiles[0]?.webkitRelativePath?.split('/')[0] || 'local-project',
        provider
      });
    } catch (error) {
      projectAttackSimulationError = {
        status: error.status || null,
        message: error.message
      };
    }
  }
  return {
    files: results,
    findings: results.flatMap((file) => file.findings),
    filesScanned: results.length,
    projectAttackSimulation,
    projectAttackSimulationError
  };
}

export async function scanRepository(projectFiles, {
  repositoryName = 'repository',
  provider = 'auto'
} = {}) {
  const normalizedFiles = Array.from(projectFiles || []).map((file, index) => ({
    path: file.path || file.name || `file-${index + 1}.txt`,
    language: file.language || languageFromPath(file.path || file.name),
    content: String(file.content || ''),
    size: file.size ?? String(file.content || '').length
  }));
  const scannedFiles = normalizedFiles.map((file) => {
    const scan = scanCodeForSecurityVulnerabilities(file.content, file.path, file.language);
    return {
      ...file,
      status: scan.stats.criticalCount ? 'critical' : scan.stats.total ? 'warning' : 'safe',
      findings: scan.vulnerabilities
    };
  });
  const projectAttackSimulation = await simulateProjectHackerAttack({
    projectFiles: selectImportantProjectFiles(scannedFiles),
    repositoryName,
    provider
  });
  return {
    files: scannedFiles,
    findings: scannedFiles.flatMap((file) => file.findings),
    filesScanned: scannedFiles.length,
    projectAttackSimulation,
    projectAttackSimulationError: null
  };
}
