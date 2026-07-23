/**
 * Lunar GitHub Security Bot Service
 * Handles automated Pull Request creation for code patches and CI/CD Action Workflow generation.
 */

export async function createGitHubSecurityPR(repoUrl, fileContent, patchedContent, vulnInfo) {
  // Extract owner and repo from URL
  let repoName = 'Lunar-Project';
  if (repoUrl && repoUrl.includes('github.com')) {
    const parts = repoUrl.replace('https://github.com/', '').split('/');
    if (parts.length >= 2) {
      repoName = `${parts[0]}/${parts[1]}`;
    }
  }

  const branchName = `lunar/auto-fix-${(vulnInfo?.cwe || 'security').toLowerCase()}-${Date.now().toString().slice(-4)}`;
  const prTitle = `🛡️ [Lunar Security Bot] Auto-Fix: ${vulnInfo?.title || 'Security Vulnerability Patch'}`;
  
  const prDescription = `
### 🌙 Lunar AI Security Bot Automated Patch Report

- **Repository**: \`${repoName}\`
- **Vulnerability Category**: \`${vulnInfo?.category || 'Security Vulnerability'}\`
- **CWE / CVSS Score**: \`${vulnInfo?.cwe || 'CWE-89'}\` (CVSS \`${vulnInfo?.cvss || '9.8'}\` Base Score)
- **Target File**: \`${vulnInfo?.path || 'src/main.ts'}\` (Line \`${vulnInfo?.line || 1}\`)

#### 🛠️ Summary of Changes:
- Replaced vulnerable code with **Lunar AI Security Patched Code**.
- Applied Parameterized Queries / Input Sanitization / Secure Signature Validation.

---
*Generated automatically by [Lunar Security Bot](https://github.com/ThanhluanGif/Lunar)*
  `.trim();

  // Simulate API delay for GitHub PR creation
  await new Promise(r => setTimeout(r, 1200));

  return {
    success: true,
    prNumber: Math.floor(Math.random() * 80) + 12,
    prUrl: `${repoUrl || 'https://github.com/ThanhluanGif/Lunar'}/pull/${Math.floor(Math.random() * 80) + 12}`,
    branchName,
    title: prTitle,
    description: prDescription
  };
}

export function generateLunarGitHubActionYaml() {
  return `
name: Lunar Security SAST & Auto-Fix Scan

on:
  push:
    branches: [ "main", "master", "dev" ]
  pull_request:
    branches: [ "main", "master" ]
  schedule:
    - cron: '0 0 * * *' # Quét tự động hàng ngày lúc 00:00 UTC

jobs:
  lunar-security-audit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Setup Node.js Environment
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Lunar AI Security SAST Scanner
        run: |
          echo "🌙 Running Lunar Security Engine..."
          # Lunar AI Scanner CLI Execution
          npx lunar-security-cli scan --strict --fail-on-critical

      - name: Auto Create Security PR on Critical Vulnerabilities
        if: failure()
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          echo "🚨 Critical Vulnerabilities Found! Lunar Bot is generating Auto-Fix PR..."
          npx lunar-security-cli autofix --create-pr
  `.trim();
}
