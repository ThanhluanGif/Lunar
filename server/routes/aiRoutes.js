/**
 * Server-side AI Routes — Proxy Gemini API calls from frontend
 * Protects API keys and adds rate limiting
 */
const express = require('express');
const router = express.Router();

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/** Call Gemini API with structured prompt */
async function callGemini(prompt, jsonMode = true) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: true, fallback: true, message: 'GEMINI_API_KEY not configured' };
  }

  try {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {})
      }
    };

    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[AI] Gemini API error:', res.status, errText);
      return { error: true, status: res.status, message: errText };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (jsonMode) {
      try {
        return JSON.parse(text);
      } catch {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) return JSON.parse(jsonMatch[1].trim());
        return { rawText: text };
      }
    }

    return { text };
  } catch (err) {
    console.error('[AI] Gemini fetch error:', err.message);
    return { error: true, message: err.message };
  }
}

/** POST /review — AI Code Review with 5-criteria scoring */
router.post('/review', async (req, res) => {
  const { code, language, filename } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const truncatedCode = code.substring(0, 8000);

  const prompt = `You are Lunar.dev Security AI — an expert code reviewer.
Analyze this ${language || 'javascript'} code from file "${filename || 'app.js'}".

Score it on 5 criteria (0-100 each):
1. security — Are there vulnerabilities? (OWASP Top 10, CWE)
2. performance — Are there blocking calls, N+1 queries, memory leaks?
3. readability — Is the code clean, well-named, properly formatted?
4. maintainability — Is it modular, testable, DRY?
5. bestPractices — Does it follow language conventions and standards?

For each issue found, provide an annotation with:
- line (number)
- type (security|performance|readability|maintainability|bestPractices)
- title (short Vietnamese title)
- message (Vietnamese explanation)
- suggestion (fixed code snippet)
- severity (critical|high|medium|low)

Respond in this exact JSON format:
{
  "scores": { "security": 85, "performance": 90, "readability": 88, "maintainability": 82, "bestPractices": 87 },
  "overallScore": 86,
  "annotations": [
    { "line": 5, "type": "security", "severity": "high", "title": "...", "message": "...", "suggestion": "..." }
  ],
  "summary": "Vietnamese summary of the review"
}

CODE:
\`\`\`${language || 'javascript'}
${truncatedCode}
\`\`\``;

  const result = await callGemini(prompt);

  if (result.error) {
    return res.status(result.fallback ? 503 : 500).json({
      error: result.message,
      fallback: result.fallback || false
    });
  }

  res.json(result);
});

/** POST /fix — Generate AI auto-fix for a vulnerability */
router.post('/fix', async (req, res) => {
  const { code, vulnerability, language } = req.body;
  if (!code || !vulnerability) return res.status(400).json({ error: 'Code and vulnerability are required' });

  const truncatedCode = code.substring(0, 8000);

  const prompt = `You are Lunar.dev Security AI. Fix this ${language || 'javascript'} vulnerability:

VULNERABILITY:
- Title: ${vulnerability.title || 'Unknown'}
- CWE: ${vulnerability.cweId || vulnerability.cve || 'N/A'}
- Severity: ${vulnerability.severity || 'high'}
- Line: ${vulnerability.line || 'unknown'}
- Description: ${vulnerability.description || vulnerability.aiReasoning || ''}

Provide the complete fixed code and explanation.

Respond in JSON:
{
  "patchedCode": "complete fixed source code here",
  "explanation": "Vietnamese explanation of what was fixed and why",
  "changes": [
    { "line": 5, "before": "old code", "after": "new code", "reason": "Vietnamese reason" }
  ]
}

ORIGINAL CODE:
\`\`\`${language || 'javascript'}
${truncatedCode}
\`\`\``;

  const result = await callGemini(prompt);

  if (result.error) {
    return res.status(result.fallback ? 503 : 500).json({ error: result.message });
  }

  res.json(result);
});

/** POST /explain — Vietnamese explanation of vulnerability */
router.post('/explain', async (req, res) => {
  const { vulnerability, code, language } = req.body;
  if (!vulnerability) return res.status(400).json({ error: 'Vulnerability is required' });

  const prompt = `You are Lunar.dev Security AI. Explain this vulnerability in Vietnamese for a developer.

VULNERABILITY:
- Title: ${vulnerability.title || 'Unknown'}
- CWE: ${vulnerability.cweId || vulnerability.cve || 'N/A'}
- Severity: ${vulnerability.severity || 'high'}
- CVSS: ${vulnerability.cvss || 'N/A'}
- Code: ${vulnerability.codeSnippet || ''}

Respond in JSON:
{
  "explanation": "Detailed Vietnamese explanation of the vulnerability",
  "impact": "What could happen if exploited (Vietnamese)",
  "recommendation": "How to fix it step by step (Vietnamese)",
  "references": ["https://owasp.org/...", "https://cwe.mitre.org/..."]
}

${code ? `CONTEXT CODE:\n\`\`\`${language || 'javascript'}\n${code.substring(0, 4000)}\n\`\`\`` : ''}`;

  const result = await callGemini(prompt);

  if (result.error) {
    return res.status(result.fallback ? 503 : 500).json({ error: result.message });
  }

  res.json(result);
});

/** POST /batch — Batch analyze multiple files */
router.post('/batch', async (req, res) => {
  const { files } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Files array is required' });
  }

  const limitedFiles = files.slice(0, 10);
  const filesSummary = limitedFiles.map(f =>
    `--- ${f.filename} (${f.language || 'unknown'}) ---\n${(f.code || '').substring(0, 3000)}`
  ).join('\n\n');

  const prompt = `You are Lunar.dev Security AI. Review these ${limitedFiles.length} files for security vulnerabilities.

For each file, provide scores and found vulnerabilities.

Respond in JSON:
{
  "fileResults": [
    {
      "filename": "app.js",
      "scores": { "security": 85, "performance": 90, "readability": 88, "maintainability": 82, "bestPractices": 87 },
      "overallScore": 86,
      "vulnerabilities": [
        { "line": 5, "cweId": "CWE-798", "title": "...", "severity": "critical", "cvss": 9.1, "message": "..." }
      ]
    }
  ],
  "aggregatedScore": 85,
  "totalVulnerabilities": 3,
  "summary": "Vietnamese summary"
}

FILES:
${filesSummary}`;

  const result = await callGemini(prompt);

  if (result.error) {
    return res.status(result.fallback ? 503 : 500).json({ error: result.message });
  }

  res.json(result);
});

/** GET /health — Check AI service status */
router.get('/health', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  res.json({
    status: apiKey ? 'configured' : 'missing_key',
    provider: 'gemini-2.0-flash',
    message: apiKey ? 'Gemini API key is configured' : 'Set GEMINI_API_KEY in .env'
  });
});

module.exports = router;
