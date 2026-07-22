/**
 * Security Scanner & Auto-Patch Engine (SAST - Static Application Security Testing)
 * Evaluates code for OWASP Top 10, calculates CVSS v3.1 Risk Score, and generates automated fix patches.
 */

export function scanCodeForSecurityVulnerabilities(fileContent, filePath = 'app.js', language = 'javascript') {
  const lines = (fileContent || '').split('\n');
  const vulnerabilities = [];

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const lower = lineText.toLowerCase();

    // 1. Hardcoded Credentials / Secrets (CWE-798)
    if (
      (lower.includes('secret') || lower.includes('password') || lower.includes('api_key') || lower.includes('private_key') || lower.includes('token')) &&
      (lineText.includes('=') || lineText.includes(':')) &&
      !lower.includes('process.env') && !lower.includes('os.getenv') && !lower.includes('export') && !lower.includes('//')
    ) {
      vulnerabilities.push({
        id: `vuln-${lineNum}-1`,
        line: lineNum,
        cwe: 'CWE-798',
        category: 'Hardcoded Credentials',
        title: 'Lộ Thông Tin Nhạy Cảm Trực Tiếp Trong Code',
        severity: 'CRITICAL',
        cvss: 9.1,
        description: 'Biến bí mật (API Key / Password / Secret) được lưu trữ dạng plain-text trong mã nguồn. Hacker có thể trích xuất nếu dự án bị lộ hoặc lưu trữ công khai trên Git.',
        impact: 'Cho phép kẻ tấn công chiếm quyền truy cập toàn bộ tài nguyên API & Database.',
        originalCode: lineText.trim(),
        patchedCode: getPatchedLine(lineText, 'secret'),
        recommendation: 'Chuyển thông tin nhạy cảm sang biến môi trường (.env / process.env).'
      });
    }

    // 2. SQL Injection (CWE-89)
    if (
      (lower.includes('select ') || lower.includes('insert ') || lower.includes('update ') || lower.includes('delete ')) &&
      (lineText.includes('+') || lineText.includes('${') || lineText.includes('%s'))
    ) {
      vulnerabilities.push({
        id: `vuln-${lineNum}-2`,
        line: lineNum,
        cwe: 'CWE-89',
        category: 'SQL Injection (OWASP A03:2021)',
        title: 'Lỗ Hổng Ghép Chuỗi Trong Truy Vấn SQL',
        severity: 'CRITICAL',
        cvss: 9.8,
        description: 'Truy vấn SQL được xây dựng bằng cách cộng chuỗi trực tiếp với đầu vào của người dùng mà không dùng Parameterized Queries hoặc ORM.',
        impact: 'Kẻ tấn công có thể chèn các câu lệnh SQL độc hại để đọc, sửa đổi hoặc xóa toàn bộ cơ sở dữ liệu.',
        originalCode: lineText.trim(),
        patchedCode: getPatchedLine(lineText, 'sqli'),
        recommendation: 'Dùng Parameterized Queries (vd: db.query("SELECT * FROM users WHERE id = $1", [userId])).'
      });
    }

    // 3. Cross-Site Scripting - XSS (CWE-79)
    if (
      lower.includes('dangerouslysetinnerhtml') || lower.includes('.innerhtml =') || lower.includes('document.write(') || lower.includes('v-html')
    ) {
      vulnerabilities.push({
        id: `vuln-${lineNum}-3`,
        line: lineNum,
        cwe: 'CWE-79',
        category: 'Cross-Site Scripting - XSS (OWASP A03:2021)',
        title: 'Lỗ Hổng Render HTML Độc Hại Không Phân Tách (XSS)',
        severity: 'HIGH',
        cvss: 7.5,
        description: 'Sử dụng innerHTML hoặc dangerouslySetInnerHTML trực tiếp với dữ liệu chưa qua lọc (sanitization).',
        impact: 'Kẻ tấn công có thể chèn đoạn mã JavaScript độc hại để đánh cắp Cookie, Session Token của người dùng.',
        originalCode: lineText.trim(),
        patchedCode: getPatchedLine(lineText, 'xss'),
        recommendation: 'Sử dụng thư viện DOMPurify.sanitize() hoặc render text thuần túy (textContent / innerText).'
      });
    }

    // 4. Insecure JWT Token Verification (CWE-347)
    if (
      lower.includes('jwt.decode(') && !lower.includes('jwt.verify(')
    ) {
      vulnerabilities.push({
        id: `vuln-${lineNum}-4`,
        line: lineNum,
        cwe: 'CWE-347',
        category: 'Insecure Authentication',
        title: 'Giải Mã JWT Mà Không Xác Thực Chữ Ký (Signature Validation)',
        severity: 'HIGH',
        cvss: 8.1,
        description: 'Hàm `jwt.decode` chỉ giải mã payload mà không kiểm tra tính hợp lệ của chữ ký cryptographic.',
        impact: 'Kẻ tấn công có thể tự tạo Token giả mạo quyền Admin mà không bị phát hiện.',
        originalCode: lineText.trim(),
        patchedCode: lineText.replace('jwt.decode(', 'jwt.verify('),
        recommendation: 'Thay thế hoàn toàn bằng `jwt.verify(token, SECRET_KEY)`.'
      });
    }

    // 5. Unsafe Remote Code Execution / Eval (CWE-95)
    if (
      lower.includes('eval(') || lower.includes('exec(') || lower.includes('os.system(')
    ) {
      vulnerabilities.push({
        id: `vuln-${lineNum}-5`,
        line: lineNum,
        cwe: 'CWE-95',
        category: 'Remote Code Execution (RCE)',
        title: 'Thực Thi Lệnh Hệ Thống Không An Toàn (Eval/Exec)',
        severity: 'CRITICAL',
        cvss: 9.8,
        description: 'Hàm eval() hoặc exec() thực thi lệnh trực tiếp từ chuỗi dữ liệu.',
        impact: 'Cho phép hacker chiếm quyền điều khiển Server hoàn toàn (Remote Code Execution).',
        originalCode: lineText.trim(),
        patchedCode: `// REDACTED FOR SAFETY: Không dùng eval/exec\nJSON.parse(userInput);`,
        recommendation: 'Tuyệt đối không dùng eval(). Dùng parser chuyên dụng như JSON.parse().'
      });
    }
  });

  // Calculate Overall CVSS Score
  let maxCvss = 0;
  if (vulnerabilities.length > 0) {
    maxCvss = Math.max(...vulnerabilities.map(v => v.cvss));
  }

  const criticalCount = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
  const highCount = vulnerabilities.filter(v => v.severity === 'HIGH').length;
  const mediumCount = vulnerabilities.filter(v => v.severity === 'MEDIUM').length;

  return {
    filePath,
    vulnerabilities,
    stats: {
      total: vulnerabilities.length,
      maxCvss,
      criticalCount,
      highCount,
      mediumCount
    }
  };
}

function getPatchedLine(lineText, type) {
  if (type === 'secret') {
    return lineText.replace(/=(.*)/, '= process.env.SECRET_KEY || "";');
  }
  if (type === 'sqli') {
    return `const query = "SELECT * FROM users WHERE id = $1";\nconst result = await db.query(query, [userId]);`;
  }
  if (type === 'xss') {
    return lineText.replace(/innerHTML\s*=\s*(.*)/, 'textContent = DOMPurify.sanitize($1);');
  }
  return lineText;
}
