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

jobs:
  lunar-security-audit:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npx lunar-security-cli scan --strict --fail-on-critical
  `.trim();
}
