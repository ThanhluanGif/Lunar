import { lunarApi } from './lunarApi';

function repositoryFromUrl(repoUrl) {
  try {
    const url = new URL(repoUrl);
    if (url.hostname !== 'github.com') return '';
    return url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '');
  } catch {
    return '';
  }
}

export async function createGitHubSecurityPR(repoUrl, fileContent, patchedContent, vulnInfo) {
  const repository = repositoryFromUrl(repoUrl);
  if (!repository) {
    throw new Error('Chọn một GitHub repository đã kết nối trước khi tạo Pull Request.');
  }
  const filePath = vulnInfo?.filePath || vulnInfo?.path;
  if (!filePath) {
    throw new Error('Không xác định được file cần vá trên GitHub.');
  }
  return lunarApi.createGitHubSecurityPR({
    repository,
    filePath,
    originalCode: fileContent,
    patchedCode: patchedContent,
    expectedBlobSha: vulnInfo?.githubBlobSha,
    title: `[Lunar Security] ${vulnInfo?.title || 'Security remediation'}`
  });
}

export function generateLunarGitHubActionYaml() {
  return `
name: Lunar Security Scan

on:
  pull_request:
    branches: [ "main", "master" ]

permissions:
  contents: read

concurrency:
  group: lunar-security-\${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  lunar-security-audit:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Check out repository
        uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - name: Install locked dependencies
        run: npm ci
      - name: Audit production dependencies
        run: npm audit --omit=dev --audit-level=high
      - name: Require repository-owned security gate
        run: node -e "const p=require('./package.json'); if(!p.scripts?.['qa:security']) throw new Error('Missing qa:security script')"
      - name: Run Lunar security gate
        run: npm run qa:security
  `.trim();
}
