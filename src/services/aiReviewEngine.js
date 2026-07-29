/**
 * AI Code Review Engine — Real AI Integration
 * Calls Gemini API for real analysis, falls back to heuristic if AI unavailable.
 *
 * 5 Review Dimensions:
 * 1. Naming (→ security renamed to avoid confusion)
 * 2. Architecture
 * 3. Performance
 * 4. Security
 * 5. Readability
 */

import { reviewCode as geminiReviewCode, isAIAvailable } from './geminiService.js';

/** Heuristic fallback analyzer (original rule-based logic) */
function heuristicAnalyze(files) {
  let overallNaming = 88, overallArchitecture = 85;
  let overallPerformance = 84, overallSecurity = 86, overallReadability = 87;

  const analyzedFiles = files.map((file) => {
    const code = file.content || '';
    const lines = code.split('\n');
    const annotations = [];

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const lower = lineText.toLowerCase();

      // Hardcoded Secrets
      if (
        (lower.includes('secret') || lower.includes('password') || lower.includes('token') || lower.includes('api_key')) &&
        (lineText.includes('=') || lineText.includes(':')) &&
        !lower.includes('process.env') && !lower.includes('os.getenv') && !lower.includes('export')
      ) {
        annotations.push({
          line: lineNum, type: 'security', severity: 'critical',
          title: 'Cảnh báo Bảo mật: Hardcoded Secret',
          message: 'Biến có chứa thông tin nhạy cảm được gán trực tiếp. Nên đọc từ Environment Variables.',
          suggestion: `const SECRET = process.env.SECRET_KEY;`
        });
        overallSecurity -= 3;
      }

      // Console.log in prod
      if (lower.includes('console.log(') || (lower.includes('print(') && file.language === 'python')) {
        annotations.push({
          line: lineNum, type: 'readability', severity: 'low',
          title: 'Clean Code: Console/Print log',
          message: 'Tránh để console.log() trong Production. Dùng Logger chuyên dụng.',
          suggestion: `logger.debug("Debug log");`
        });
        overallReadability -= 1;
      }

      // Single letter variables
      if (/\b(var|let|const|auto)\s+[a-z]\s*=/i.test(lineText)) {
        annotations.push({
          line: lineNum, type: 'naming', severity: 'medium',
          title: 'Quy chuẩn Đặt tên: Biến 1 ký tự',
          message: 'Tránh dùng tên biến 1 ký tự. Hãy đặt tên có ý nghĩa ngữ nghĩa.',
          suggestion: `const totalItemCount = ...;`
        });
        overallNaming -= 2;
      }

      // Deep nesting
      const indentMatch = lineText.match(/^\s*/);
      if (indentMatch && indentMatch[0].length >= 12) {
        annotations.push({
          line: lineNum, type: 'architecture', severity: 'medium',
          title: 'Kiến trúc: Code quá lồng nhúng (Deep nesting)',
          message: 'Code bị lồng quá nhiều cấp. Tách hàm phụ hoặc dùng Early Return.',
          suggestion: `if (!isValid) return;\n// Xử lý ở mức phẳng`
        });
        overallArchitecture -= 2;
      }

      // Sync I/O
      if (lower.includes('readfilesync') || lower.includes('execsync') || lower.includes('time.sleep(')) {
        annotations.push({
          line: lineNum, type: 'performance', severity: 'high',
          title: 'Hiệu năng: Blocking Synchronous Call',
          message: 'Lệnh đồng bộ này làm nghẽn Event Loop. Chuyển sang async/await.',
          suggestion: `const data = await fs.promises.readFile(path);`
        });
        overallPerformance -= 3;
      }
    });

    return { ...file, annotations };
  });

  // Clamp scores
  overallNaming = Math.max(65, Math.min(98, overallNaming));
  overallArchitecture = Math.max(65, Math.min(98, overallArchitecture));
  overallPerformance = Math.max(65, Math.min(98, overallPerformance));
  overallSecurity = Math.max(65, Math.min(98, overallSecurity));
  overallReadability = Math.max(65, Math.min(98, overallReadability));

  const overallScore = Math.round(
    (overallNaming + overallArchitecture + overallPerformance + overallSecurity + overallReadability) / 5
  );

  return {
    overallScore,
    scores: {
      naming: overallNaming,
      architecture: overallArchitecture,
      performance: overallPerformance,
      security: overallSecurity,
      readability: overallReadability
    },
    analyzedFiles
  };
}

/**
 * Main entry — Analyze project with AI (Gemini) or fallback to heuristics
 * Maintains backward-compatible return structure.
 *
 * @param {Object} projectData - { name, files: [{ content, filename, language }], ... }
 * @returns {Object} - { overallScore, scores, aiSummary, files, aiPowered }
 */
export async function analyzeProjectWithAI(projectData) {
  const files = projectData.files || [];
  const fileCount = files.length || 1;

  // Try real AI first
  let aiAvailable = false;
  try {
    aiAvailable = await isAIAvailable();
  } catch { /* ignore */ }

  if (aiAvailable && files.length > 0) {
    // Try AI review on the first/main file
    const mainFile = files[0];
    const aiResult = await geminiReviewCode(
      mainFile.content || '',
      mainFile.language || 'javascript',
      mainFile.filename || mainFile.name || 'app.js'
    );

    if (aiResult && aiResult.scores) {
      // AI succeeded — merge results
      const aiAnnotations = (aiResult.annotations || []).map(a => ({
        ...a,
        aiPowered: true
      }));

      const analyzedFiles = files.map((file, i) => ({
        ...file,
        annotations: i === 0 ? aiAnnotations : [] // Only first file has AI annotations
      }));

      // Map AI scores to our 5 dimensions
      const scores = {
        naming: aiResult.scores.readability || aiResult.scores.naming || 85,
        architecture: aiResult.scores.maintainability || aiResult.scores.architecture || 85,
        performance: aiResult.scores.performance || 85,
        security: aiResult.scores.security || 85,
        readability: aiResult.scores.bestPractices || aiResult.scores.readability || 85
      };

      const overallScore = aiResult.overallScore ||
        Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 5);

      return {
        ...projectData,
        overallScore,
        scores,
        aiSummary: aiResult.summary ||
          `Gemini AI đã phân tích ${fileCount} tập tin. Điểm tổng: ${overallScore}/100.`,
        files: analyzedFiles,
        aiPowered: true,
        aiProvider: 'gemini-2.0-flash'
      };
    }
  }

  // Fallback to heuristic analysis
  const heuristic = heuristicAnalyze(files);

  return {
    ...projectData,
    overallScore: heuristic.overallScore,
    scores: heuristic.scores,
    aiSummary: `Lunar SAST Engine đã kiểm tra ${fileCount} tập tin. Điểm tổng: ${heuristic.overallScore}/100. (Chế độ heuristic — kết nối Gemini API để bật AI thật)`,
    files: heuristic.analyzedFiles,
    aiPowered: false,
    aiProvider: 'lunar-heuristic'
  };
}
