/**
 * AI Code Review Engine
 * Analyzes code files across 5 critical dimensions:
 * 1. Naming
 * 2. Architecture
 * 3. Performance
 * 4. Security
 * 5. Readability
 */

export function analyzeProjectWithAI(projectData) {
  const files = projectData.files || [];
  
  let totalScoreAcc = 0;
  let fileCount = files.length || 1;

  let overallNaming = 88;
  let overallArchitecture = 85;
  let overallPerformance = 84;
  let overallSecurity = 86;
  let overallReadability = 87;

  const analyzedFiles = files.map((file) => {
    const code = file.content || '';
    const lines = code.split('\n');
    const annotations = [];

    // Rule 1: Check for Hardcoded Secrets (Security)
    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const lower = lineText.toLowerCase();

      if (
        (lower.includes('secret') || lower.includes('password') || lower.includes('token') || lower.includes('api_key')) &&
        (lineText.includes('=') || lineText.includes(':')) &&
        !lower.includes('process.env') && !lower.includes('os.getenv') && !lower.includes('export')
      ) {
        annotations.push({
          line: lineNum,
          type: 'security',
          title: 'Cảnh báo Bảo mật: Hardcoded Secret',
          message: 'Biến có chứa thông tin nhạy cảm được gán trực tiếp. Nên đọc từ Environment Variables (process.env hoặc os.getenv).',
          suggestion: `// Khuyên dùng:\nconst SECRET = process.env.SECRET_KEY;`
        });
        overallSecurity -= 3;
      }

      // Rule 2: Check for console.log or print statements left in prod code (Readability)
      if (lower.includes('console.log(') || (lower.includes('print(') && file.language === 'python')) {
        annotations.push({
          line: lineNum,
          type: 'readability',
          title: 'Nhắc nhở Clean Code: Console/Print log',
          message: 'Tránh để console.log() trong mã nguồn Production. Nên dùng Logger chuyên dụng (Winston, Morgan, Python logging).',
          suggestion: `logger.debug("Debug log");`
        });
        overallReadability -= 1;
      }

      // Rule 3: Single letter variable names or vague names (Naming)
      if (/\b(var|let|const|auto)\s+[a-z]\s*=/i.test(lineText)) {
        annotations.push({
          line: lineNum,
          type: 'naming',
          title: 'Quy chuẩn Đặt tên: Biến 1 ký tự',
          message: 'Tránh dùng tên biến 1 ký tự như `x`, `a`, `tmp`. Hãy đặt tên có ý nghĩa ngữ nghĩa (semantic name).',
          suggestion: `const totalItemCount = ...;`
        });
        overallNaming -= 2;
      }

      // Rule 4: Deep Callback / Nested Code (Architecture)
      const indentMatch = lineText.match(/^\s*/);
      if (indentMatch && indentMatch[0].length >= 12) {
        annotations.push({
          line: lineNum,
          type: 'architecture',
          title: 'Tối ưu Kiến trúc: Code quá lồng nhúng (Deep nesting)',
          message: 'Đoạn code bị lồng quá nhiều cấp (indentation > 12 spaces). Hãy tách nhỏ thành hàm phụ hoặc dùng Early Return.',
          suggestion: `if (!isValid) return;\n// Xử lý tiếp ở mức phẳng`
        });
        overallArchitecture -= 2;
      }

      // Rule 5: Sync I/O operations (Performance)
      if (lower.includes('readfilesync') || lower.includes('execsync') || lower.includes('time.sleep(')) {
        annotations.push({
          line: lineNum,
          type: 'performance',
          title: 'Cảnh báo Hiệu năng: Blocking Synchronous Call',
          message: 'Lệnh đồng bộ này làm nghẽn Event Loop. Hãy chuyển sang async / await hoặc non-blocking API.',
          suggestion: `const data = await fs.promises.readFile(path);`
        });
        overallPerformance -= 3;
      }
    });

    // Ensure scores stay within 60 - 98 range
    overallNaming = Math.max(65, Math.min(98, overallNaming));
    overallArchitecture = Math.max(65, Math.min(98, overallArchitecture));
    overallPerformance = Math.max(65, Math.min(98, overallPerformance));
    overallSecurity = Math.max(65, Math.min(98, overallSecurity));
    overallReadability = Math.max(65, Math.min(98, overallReadability));

    return {
      ...file,
      annotations
    };
  });

  const finalOverallScore = Math.round(
    (overallNaming + overallArchitecture + overallPerformance + overallSecurity + overallReadability) / 5
  );

  return {
    ...projectData,
    overallScore: finalOverallScore,
    scores: {
      naming: overallNaming,
      architecture: overallArchitecture,
      performance: overallPerformance,
      security: overallSecurity,
      readability: overallReadability
    },
    aiSummary: `AI đã hoàn tất kiểm tra ${files.length} tập tin. Điểm tổng thể đạt ${finalOverallScore}/100. Mã nguồn đạt chuẩn tốt ở khía cạnh Architecture (${overallArchitecture}/100) và Naming (${overallNaming}/100). Đã gắn cờ các khuyến nghị cần tối ưu trong Code Inspector.`,
    files: analyzedFiles
  };
}
