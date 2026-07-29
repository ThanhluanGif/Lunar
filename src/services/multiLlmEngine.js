/**
 * Multi-LLM Engine — Real AI Provider Orchestrator
 * Routes to real AI providers via server proxy, falls back to local SAST.
 */

import { scanCodeForSecurityVulnerabilities as scanCodeForVulnerabilities } from './securityScannerEngine.js';

export const AI_PROVIDERS = [
  { id: '9router-proxy', name: '9Router AI Proxy (Multi-LLM)', badge: 'Multi-LLM Router', speed: '0.2s', type: 'proxy' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Google)', badge: 'Fast AI Scan', speed: '0.8s', type: 'ai' },
  { id: 'gpt-4o-security', name: 'GPT-4o Security (OpenAI)', badge: 'Deep Logic Audit', speed: '1.2s', type: 'ai' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Anthropic)', badge: 'Max Code Repair', speed: '1.0s', type: 'ai' },
  { id: 'lunar-sast-native', name: 'Lunar Native SAST Engine', badge: 'Offline Instant', speed: '0.05s', type: 'local' }
];

/** Try 9Router local proxy */
async function tryNineRouter(code, filename) {
  try {
    const res = await fetch('http://localhost:9000/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.0-flash',
        messages: [
          { role: 'system', content: 'You are a security code auditor. Analyze for OWASP vulnerabilities. Respond in JSON with: { vulnerabilities: [{ cweId, title, severity, cvss, line, codeSnippet, suggestedPatch, aiReasoning }], securityScore: number }' },
          { role: 'user', content: `Scan this file "${filename}":\n\`\`\`\n${code.substring(0, 6000)}\n\`\`\`` }
        ],
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      return match ? JSON.parse(match[1].trim()) : null;
    }
  } catch {
    return null;
  }
}

/** Call server AI proxy for any provider */
async function callServerAI(code, filename, provider) {
  try {
    const res = await fetch('/api/v1/ai/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code.substring(0, 8000),
        language: detectLanguage(filename),
        filename,
        provider
      })
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.error) return null;

    // Normalize AI response to our vulnerability format
    const vulnerabilities = (data.annotations || [])
      .filter(a => a.type === 'security' || a.severity === 'critical' || a.severity === 'high')
      .map((a, i) => ({
        id: `vuln-ai-${a.line || i}`,
        cve: a.cweId || 'CWE-000',
        title: a.title || 'AI-Detected Vulnerability',
        severity: a.severity || 'high',
        cvss: a.severity === 'critical' ? 9.1 : a.severity === 'high' ? 7.5 : 4.5,
        line: a.line || 0,
        codeSnippet: a.codeSnippet || '',
        suggestedPatch: a.suggestion || '',
        aiReasoning: a.message || ''
      }));

    return {
      vulnerabilities,
      securityScore: data.scores?.security || data.overallScore || 85
    };
  } catch {
    return null;
  }
}

/** Detect language from filename extension */
function detectLanguage(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', go: 'go', php: 'php', rb: 'ruby',
    cs: 'csharp', rs: 'rust', sql: 'sql', sh: 'shell', kt: 'kotlin',
    swift: 'swift', dart: 'dart', vue: 'vue', svelte: 'svelte'
  };
  return map[ext] || ext;
}

/**
 * Run Multi-LLM Audit — Main entry point
 * Routes to selected provider, falls back gracefully.
 *
 * @param {Object} params - { code, filename, provider, customPolicies }
 * @returns {Object} - { providerUsed, latencyMs, securityScore, maxCvss, vulnerabilities, summary, aiPowered }
 */
export async function runMultiLlmAudit({ code, filename, provider = 'gemini-2.0-flash', customPolicies = [] }) {
  const selectedProvider = AI_PROVIDERS.find(p => p.id === provider) || AI_PROVIDERS[1];
  const startTime = Date.now();

  let result = null;
  let aiPowered = false;

  // Route based on provider type
  if (selectedProvider.id === 'lunar-sast-native') {
    // Use local SAST scanner directly
    const scanResult = scanCodeForVulnerabilities(code, filename);
    result = {
      vulnerabilities: scanResult.vulnerabilities || [],
      securityScore: Math.max(40, 100 - ((scanResult.stats?.criticalCount || 0) * 20) - ((scanResult.stats?.highCount || 0) * 10))
    };
  } else if (selectedProvider.id === '9router-proxy') {
    // Try 9Router first, fall back to server proxy, then local SAST
    result = await tryNineRouter(code, filename);
    if (result) aiPowered = true;

    if (!result) {
      result = await callServerAI(code, filename, 'gemini-2.0-flash');
      if (result) aiPowered = true;
    }

    if (!result) {
      const scanResult = scanCodeForVulnerabilities(code, filename);
      result = {
        vulnerabilities: scanResult.vulnerabilities || [],
        securityScore: Math.max(40, 100 - ((scanResult.stats?.criticalCount || 0) * 20))
      };
    }
  } else {
    // AI providers — try server proxy, fall back to local SAST
    result = await callServerAI(code, filename, selectedProvider.id);
    if (result) aiPowered = true;

    if (!result) {
      const scanResult = scanCodeForVulnerabilities(code, filename);
      result = {
        vulnerabilities: scanResult.vulnerabilities || [],
        securityScore: Math.max(40, 100 - ((scanResult.stats?.criticalCount || 0) * 20))
      };
    }
  }

  const latencyMs = Date.now() - startTime;
  const vulnerabilities = result.vulnerabilities || [];
  const maxCvss = vulnerabilities.reduce((max, v) => Math.max(max, v.cvss || 0), 0);

  return {
    providerUsed: selectedProvider,
    latencyMs,
    scannedFilename: filename || 'app.ts',
    securityScore: result.securityScore || Math.max(40, 100 - (vulnerabilities.length * 15)),
    maxCvss: maxCvss || 0.0,
    vulnerabilities,
    summary: `[${selectedProvider.name}] Scan hoàn tất trong ${latencyMs}ms. Phát hiện ${vulnerabilities.length} lỗ hổng.${aiPowered ? ' (AI-powered)' : ' (Heuristic mode)'}`,
    aiPowered
  };
}
