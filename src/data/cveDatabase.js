export const CVE_DATABASE = [
  {
    cveId: 'CVE-2024-21626',
    name: 'runc Leaky File Descriptors Container Breakout',
    severity: 'CRITICAL',
    cvss: 8.6,
    affectedPackage: 'runc < 1.1.12',
    description: 'Lỗ hổng rò rỉ file descriptor cho phép tiến trình bên trong Container vượt rào (Container Breakout) để chiếm quyền Root trên Host Server.',
    patchCommand: 'npm update runc || go get github.com/opencontainers/runc@v1.1.12'
  },
  {
    cveId: 'CVE-2023-4863',
    name: 'WebP Heap Buffer Overflow Vuln',
    severity: 'CRITICAL',
    cvss: 9.8,
    affectedPackage: 'libwebp < 1.3.2',
    description: 'Tràn bộ nhớ đệm Heap khi xử lý file ảnh WebP cho phép thực thi mã từ xa (RCE).',
    patchCommand: 'apt-get update && apt-get install --only-upgrade libwebp-dev'
  },
  {
    cveId: 'CVE-2023-38545',
    name: 'cURL SOCKS5 Heap Buffer Overflow',
    severity: 'HIGH',
    cvss: 7.5,
    affectedPackage: 'curl < 8.4.0',
    description: 'Lỗi tràn bộ nhớ đệm khi thiết lập kết nối proxy SOCKS5.',
    patchCommand: 'yum update curl'
  }
];

export const SECURITY_PROJECTS_MOCK = [
  {
    id: 'sec-proj-1',
    title: 'Fintech Banking Payment Gateway',
    githubUrl: 'https://github.com/vietsec/payment-gateway-api',
    author: {
      name: 'Nguyễn Thanh Nam',
      username: 'nam-security-dev',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      badge: 'AppSec Specialist',
      karma: 2850
    },
    language: 'TypeScript',
    stars: 340,
    cvssScore: 9.8,
    status: 'CRITICAL_VULNERABILITIES_FOUND',
    description: 'Cổng thanh toán điện tử kết nối với các Ngân hàng. Cần kiểm định bảo mật gắt gao trước khi Audit PCI-DSS.',
    submittedAt: '30 phút trước',
    files: [
      {
        path: 'src/controllers/paymentController.ts',
        language: 'typescript',
        content: `import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';

const JWT_SECRET = "MY_SUPER_SECRET_BANKING_KEY_123456"; // CRITICAL: Hardcoded Secret

export async function processPayment(req: Request, res: Response) {
  const { accountId, amount, userQuery } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  // VULNERABILITY 1: Insecure JWT decode without verification
  const decoded = jwt.decode(token);

  // VULNERABILITY 2: SQL Injection flaw
  const sql = "SELECT * FROM accounts WHERE id = '" + accountId + "' AND balance >= " + amount;
  const account = await db.query(sql);

  // VULNERABILITY 3: Cross-Site Scripting (XSS)
  const auditLogHtml = "<div class='log'>Thanh toán thành công cho: " + userQuery + "</div>";

  return res.status(200).send({
    status: "SUCCESS",
    logView: auditLogHtml
  });
}`
      }
    ],
    communityAudits: [
      {
        id: 'aud-1',
        author: 'Lê Hoàng Dương',
        role: 'Senior Pentester @ CyStack',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        severityFlag: 'CRITICAL',
        comment: 'Phát hiện câu lệnh SQL Injection cực kỳ nguy hiểm ở dòng 15. Kẻ tấn công có thể chèn `' + "' UNION SELECT username, password FROM users --`" + ' để rút toàn bộ dữ liệu người dùng!',
        createdAt: '15 phút trước',
        likes: 38
      }
    ]
  },
  {
    id: 'sec-proj-2',
    title: 'Hospital Patient Health Portal',
    githubUrl: 'https://github.com/medtech-vn/patient-portal',
    author: {
      name: 'Vũ Quốc Khánh',
      username: 'vkhanh-health',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      badge: 'Fullstack Engineer',
      karma: 1120
    },
    language: 'Python',
    stars: 195,
    cvssScore: 7.5,
    status: 'PATCHED_SAFE',
    description: 'Hệ thống hồ sơ bệnh án điện tử cho Bệnh viện. Đã qua kiểm định và vá thành công 3 lỗ hổng bảo mật.',
    submittedAt: '2 giờ trước',
    files: [
      {
        path: 'app/security/auth.py',
        language: 'python',
        content: `import os
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()
SECRET_KEY = os.getenv("PATIENT_PORTAL_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("PATIENT_PORTAL_SECRET_KEY environment variable is mandatory!")

def verify_token(credentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.verify(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn")`
      }
    ],
    communityAudits: [
      {
        id: 'aud-2',
        author: 'Đặng Tuấn Kiệt',
        role: 'Security Researcher',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        severityFlag: 'PASSED',
        comment: 'Code đã chuyển hoàn toàn sang đọc biến môi trường và verify chữ ký JWT chuẩn mực. Đạt chuẩn HIPAA Compliance!',
        createdAt: '1 giờ trước',
        likes: 29
      }
    ]
  }
];
