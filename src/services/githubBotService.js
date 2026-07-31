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
  push:
    branches: [ "main", "master" ]

permissions:
  contents: read

env:
  CI: "true"

concurrency:
  group: lunar-security-\${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  lunar-security-audit:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Check out repository
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - name: Set up Node.js
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: "22"
          cache: npm
      - name: Install locked dependencies without lifecycle scripts
        run: npm ci --ignore-scripts --include=optional
      - name: Audit all installed dependencies
        run: npm audit --audit-level=high
      - name: Require repository-owned security gate
        run: node -e "const p=require('./package.json'); if(!p.scripts?.['qa:security']) throw new Error('Missing qa:security script')"
      - name: Run Lunar security gate
        run: npm run qa:security
  `.trim();
}
