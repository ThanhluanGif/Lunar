/**
 * Gemini AI Service — Real AI Integration for Lunar.dev
 * Calls Gemini API via server proxy at /api/v1/ai/*
 * All API keys are kept server-side for security.
 */

const AI_PROXY_BASE = '/api/v1/ai';

/** Retry with exponential backoff */
async function fetchWithRetry(url, options, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

/**
 * AI Code Review — 5 criteria scoring with detailed annotations
 * @param {string} code - Source code to review
 * @param {string} language - Programming language
 * @param {string} filename - File name for context
 * @returns {Promise<Object>} - Structured review with scores and annotations
 */
export async function reviewCode(code, language = 'javascript', filename = 'app.js') {
  try {
    const res = await fetchWithRetry(`${AI_PROXY_BASE}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, filename })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `AI Review failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.warn('[GeminiService] reviewCode fallback:', err.message);
    return null; // Caller should fallback to heuristic scoring
  }
}

/**
 * AI Auto-Fix — Generate patched code for a vulnerability
 * @param {string} code - Vulnerable source code
 * @param {Object} vulnerability - Vulnerability details { title, cweId, severity, line, codeSnippet }
 * @param {string} language - Programming language
 * @returns {Promise<Object>} - { patchedCode, explanation, diff }
 */
export async function generateFix(code, vulnerability, language = 'javascript') {
  try {
    const res = await fetchWithRetry(`${AI_PROXY_BASE}/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, vulnerability, language })
    });

    if (!res.ok) {
      throw new Error(`AI Fix failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.warn('[GeminiService] generateFix fallback:', err.message);
    return null;
  }
}

/**
 * AI Explain — Vietnamese explanation of vulnerability
 * @param {Object} vulnerability - Vulnerability details
 * @param {string} code - Code context
 * @param {string} language - Programming language
 * @returns {Promise<Object>} - { explanation, impact, recommendation }
 */
export async function explainVulnerability(vulnerability, code, language = 'javascript') {
  try {
    const res = await fetchWithRetry(`${AI_PROXY_BASE}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vulnerability, code, language })
    });

    if (!res.ok) {
      throw new Error(`AI Explain failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.warn('[GeminiService] explainVulnerability fallback:', err.message);
    return null;
  }
}

/**
 * Batch Analyze — Process multiple files
 * @param {Array<{filename, code, language}>} files - Files to analyze
 * @returns {Promise<Object>} - Aggregated results
 */
export async function analyzeRepository(files) {
  try {
    const res = await fetchWithRetry(`${AI_PROXY_BASE}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: files.slice(0, 20) }) // Limit to 20 files per batch
    });

    if (!res.ok) {
      throw new Error(`AI Batch failed (${res.status})`);
    }

    return await res.json();
  } catch (err) {
    console.warn('[GeminiService] analyzeRepository fallback:', err.message);
    return null;
  }
}

/**
 * Check AI service availability
 * @returns {Promise<boolean>}
 */
export async function isAIAvailable() {
  try {
    const res = await fetch(`${AI_PROXY_BASE}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
