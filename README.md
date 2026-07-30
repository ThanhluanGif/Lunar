# 🌙 Lunar.dev — AI Code Review, SAST Security Audit & 1-Click Repair Workbench

<p align="center">
  <img src="https://img.shields.io/badge/Lunar.dev-AI_Security_Workbench-2563eb?style=for-the-badge&logo=moon" alt="Lunar Banner" />
  <img src="https://img.shields.io/badge/SAST-OWASP_Top_10-dc2626?style=for-the-badge&logo=shield" alt="OWASP Shield" />
  <img src="https://img.shields.io/badge/PostgreSQL-16_Database-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Node.js-Express_5-339933?style=for-the-badge&logo=nodedotjs" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-Vite_5-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/License-MIT-7c3aed?style=for-the-badge" alt="MIT License" />
</p>

---

## 📖 Giới Thiệu (About)

**Lunar.dev** là nền tảng **Kiểm tra An toàn Mã nguồn Tĩnh (SAST — Static Application Security Testing)** và **Tự động Vá Lỗi Lỗ Hổng (1-Click Code Repair Workbench)** cấp doanh nghiệp, được thiết kế cho các Lập trình viên, Tech Leads và Chuyên gia An toàn Thông tin.

Nền tảng giúp phát hiện sớm các lỗ hổng mã nguồn nguy hiểm theo các chuẩn an toàn quốc tế (**OWASP Top 10**, **CWE Database**, **CVSS v3.1 Scoring**), tự động sinh ra các bản vá mã nguồn an toàn với giao diện so sánh trực quan (Red/Green Diff), và hỗ trợ tự động hóa trong quy trình CI/CD.

---

## 🌟 Tính Năng Cốt Lõi (Key Features)

### 1. 🛡️ SAST Security Engine & Thang Điểm CVSS v3.1
- **Phân tích cú pháp AST & Regex Matchers**: Kiểm tra toàn diện mã nguồn JavaScript/TypeScript/Python/SQL.
- **Phân loại lỗ hổng OWASP / CWE**:
  - `CWE-798`: Hardcoded Credentials, API Keys & Secret Tokens.
  - `CWE-89`: SQL Injection (truy vấn nối chuỗi không tham số hóa).
  - `CWE-79`: Cross-Site Scripting (XSS).
  - `CWE-352`: Cross-Site Request Forgery (CSRF).
  - `CWE-347`: JWT Authentication Insecure Configuration.
  - `CWE-95`: Remote Code Execution (RCE qua `eval`/`exec`).
- **Đánh giá rủi ro CVSS v3.1**: Định lượng mức độ nghiêm trọng (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) dựa trên tính khả thi khai thác và tác động hệ thống.

### 2. 🛠️ 1-Click Code Repair Workbench & Unified Diff
- **1-Click Apply Patch**: Tự động thay thế các khối mã bị lỗi bằng mã đã được vá an toàn.
- **Side-by-Side & Unified Diff View**: Màn hình đối sánh song song mã gốc (`ORIGINAL`) và mã đã vá (`AI PATCHED`) trực quan.
- **Xuất file & CI Workflow**: Tải xuống file đã vá hoặc sinh cấu hình GitHub Actions Workflow (`lunar-security.yml`).

### 3. 📂 GitHub Workspace & Quét Mã Nguồn Trực Tiếp
- **Quét Repository GitHub**: Hỗ trợ repository Public và Private qua GitHub OAuth 2.0 hoặc GitHub Personal Access Token (PAT).
- **Drag & Drop Local Scanner**: Kéo thả tệp nguồn từ máy tính (`.js`, `.jsx`, `.ts`, `.tsx`, `.py`, `.sql`, `.json`) để phân tích tức thì trên trình duyệt.

### 4. ⚡ PostgreSQL & Quản Lý Phiên Đăng Nhập Bảo Mật
- **Lưu trữ bền vững**: Sử dụng PostgreSQL 16 lưu trữ dữ liệu người dùng, dự án, lần quét và kết quả audit.
- **HttpOnly Cookie Authentication**: Mã hóa JWT và lưu trong HttpOnly Cookie chống tấn công XSS/Token Hijacking.
- **Phân quyền người dùng (RBAC)**: Phân tầng hạn mức sử dụng (`FREE`, `PRO`, `ENTERPRISE`).

### 5. 🤖 Trợ Lý Ảo Lunar AI & Báo Cáo Audit PDF
- **Lunar AI Assistant**: Hỗ trợ giải thích lỗ hổng và hướng dẫn remediate theo ngữ cảnh mã nguồn.
- **Xuất Báo Cáo PDF Chuyên Nghiệp**: Tổng hợp kết quả audit, danh sách lỗ hổng, chứng cứ mã nguồn (đã mã hóa/che thông tin nhạy cảm) và khuyến nghị sửa chữa.

---

## 🏗️ Kiến Trúc Hệ Thống (System Architecture)

```mermaid
graph TD
    A[Client Browser - React 18 + Vite] -->|HTTPS / REST API| B[Express 5 API Gateway]
    B --> C[Auth Middleware - JWT HttpOnly Cookie]
    B --> D[SAST Security Scanner Engine]
    B --> E[Report Service & PDF Generator]
    B --> F[PostgreSQL 16 Database]
    B -->|OAuth 2.0| G[GitHub API Services]
    B -->|Vercel AI Gateway| H[Lunar AI Engine]
```

### Kiến Trúc Phân Tầng:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Client Side)                   │
│   React 18 | Vite 5 | Tailwind/Vanilla CSS | Lucide Icons   │
└─────────────┬───────────────────────────────┬───────────────┘
              │ REST API                      │ OAuth 2.0 Flow
              ▼                               ▼
┌─────────────────────────┐    ┌──────────────────────────────┐
│    Express 5 Backend    │    │      GitHub / AI Services    │
│  ├── Auth & Middleware  │    │  ├── GitHub OAuth App        │
│  ├── SAST Engine        │    │  ├── Vercel AI Gateway       │
│  ├── Scan & Audit Routes│    │  └── PDF Export Engine       │
│  └── DB Connection Pool │    └──────────────────────────────┘
└────────────┬────────────┘
             │ SQL Pool
             ▼
┌─────────────────────────┐
│   PostgreSQL 16 DB      │
│  ├── Users & Roles      │
│  ├── Projects & Scans   │
│  └── Vulnerabilities    │
└─────────────────────────┘
```

---

## 💻 Công Nghệ Sử Dụng (Tech Stack)

| Thành Phần | Công Nghệ / Thư Viện | Mô Tả |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 5, JavaScript (ESNext) | Giao diện SPA hiệu năng cao |
| **Styling & Design** | Modern CSS Tokens, Modern Typography | Chuẩn WCAG AAA, giao diện tối ưu UX |
| **Backend** | Node.js 20, Express 5 | RESTful API server |
| **Database** | PostgreSQL 16 | Hệ quản trị cơ sở dữ liệu quan hệ |
| **Xác thực** | JWT (HttpOnly Cookie) + bcryptjs | Bảo mật danh tính & mã hóa mật khẩu |
| **Security SAST** | Custom AST Parser (`@babel/parser`), CVSS v3.1 Engine | Phân tích mã nguồn tĩnh & định lượng rủi ro |
| **Containerization**| Docker, Docker Compose | Đóng gói và triển khai môi trường cách ly |

---

## 📁 Cấu Trúc Thư Mục Dự Án (Project Structure)

```
CodeReviewCommunity/
├── dist/                       # Production build artifacts (git-ignored)
├── docs/                       # Tài liệu hướng dẫn & status dự án
│   ├── PROJECT_STATUS.md       # Trạng thái dự án & backlog
│   └── QA_RELEASE_CHECKLIST.md # Checklist kiểm thử trước khi release
├── scripts/                    # Scripts kiểm thử SAST & regression
│   ├── qa-smoke.cjs
│   ├── sast-regression.cjs
│   ├── sast-self-audit.cjs
│   └── security-regression.cjs
├── server/                     # Backend API Server (Express 5)
│   ├── index.js                # Server entry point
│   ├── schema.sql              # PostgreSQL DDL Schema
│   ├── db/                     # Connection pool config
│   ├── middleware/             # Security & Auth middlewares
│   ├── routes/                 # API endpoint routers
│   └── services/               # Core business services (SAST, Report, AI)
├── src/                        # Frontend Application (React 18)
│   ├── App.jsx                 # Main application shell
│   ├── components/             # Reusable UI components & modals
│   ├── services/               # Frontend API integration & scanner engine
│   └── styles/                 # Global styles & design tokens
├── .env.example                # File mẫu biến môi trường (an toàn)
├── .gitignore                  # Cấu hình chặn file nhạy cảm
├── Dockerfile                  # Docker build instructions
├── docker-compose.yml          # Docker Compose orchestration
├── package.json                # Project dependencies & scripts
└── README.md                   # Tài liệu hướng dẫn dự án
```

---

## 🚀 Hướng Dẫn Cài Đặt (Quick Start)

### Yêu Cầu Môi Trường
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`
- **PostgreSQL**: `16` (hoặc chạy qua Docker Compose)

### 1. Clone Repository
```bash
git clone https://github.com/ThanhluanGif/Lunar.git
cd Lunar
```

### 2. Thiết Lập Biến Môi Trường
Sao chép file `.env.example` thành `.env`:
```bash
cp .env.example .env
```
*Lưu ý: Không bao giờ commit file `.env` chứa bí mật thực tế lên Git.*

### 3. Cài Đặt Dependencies
```bash
npm install
```

### 4. Khởi Chạy Môi Trường Phát Triển (Development)
```bash
# Khởi chạy PostgreSQL & Server Backend bằng Docker Compose (Port 5050)
docker compose up -d --build

# Khởi chạy Frontend Vite (Port 3000)
npm run dev
```

Mở trình duyệt tại địa chỉ: **`http://localhost:3000`**

### 5. Build Sản Phẩm Production
```bash
npm run build
npm run preview
```

---

## 🔒 Bảo Mật & Quản Lý Secret (Security Guidelines)

Dự án Lunar tuân thủ nghiêm ngặt các tiêu chuẩn an toàn bảo mật thông tin:

1. **Chống Rò Rỉ File Nhạy Cảm**:
   - File `.env`, `.env.*`, các file chứng chỉ (`*.pem`, `*.key`), và logs **tuyệt đối không được push lên Git**.
   - Cấu hình `.gitignore` đã được tối ưu để tự động loại trừ mọi file cấu hình cá nhân hoặc credentials.
2. **Bảo Vệ Token & Phiên Đăng Nhập**:
   - JWT Auth Token được truyền qua HTTP-Only, Secure, SameSite Cookie.
   - GitHub OAuth Tokens được mã hóa AES-256 trước khi lưu vào cơ sở dữ liệu (`LUNAR_GITHUB_TOKEN_ENCRYPTION_KEY`).
3. **Chống Tấn Công Phổ Biến**:
   - Tích hợp `helmet` security headers, CORS restrict origin, và Express Rate Limiter chống Brute-force/DDoS.

---

## ⚙️ Bảng Biến Môi Trường (Environment Variables)

| Biến Môi Trường | Mô Tả | Mặc Định / Mẫu |
| :--- | :--- | :--- |
| `PORT` | Port cho Express Server backend | `5050` |
| `NODE_ENV` | Môi trường ứng dụng | `development` / `production` |
| `JWT_SECRET` | Khóa bí mật ký mã JWT (bắt buộc đổi ở prod) | *Chuỗi mã hóa ngẫu nhiên* |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | `postgres://lunar:lunar_pass@localhost:5433/lunar_db` |
| `LUNAR_GITHUB_CLIENT_ID` | OAuth App Client ID từ GitHub | *GitHub Client ID* |
| `LUNAR_GITHUB_CLIENT_SECRET` | OAuth App Client Secret từ GitHub | *GitHub Client Secret* |
| `LUNAR_GITHUB_TOKEN_ENCRYPTION_KEY` | Khóa mã hóa token GitHub (AES-256) | *Chuỗi ngẫu nhiên 32+ ký tự* |

---

## 🧪 Đảm Bảo Chất Lượng & Regression Tests (QA)

Chạy các bộ test tự động để đảm bảo chất lượng hệ thống trước khi release:

```bash
# Chạy toàn bộ kiểm thử SAST Engine & Security Regression
npm run qa:security

# Chạy tự kiểm thử SAST Rules
npm run qa:sast

# Chạy kiểm thử tích hợp Docker Stack
npm run qa:docker

# Chạy kiểm thử giao diện tự động (macOS Chrome Headless)
npm run qa:ui:mac
```

---

## 📜 Giấy Phép (License)

Dự án được phân phối theo giấy phép **MIT License**.

---

<p align="center">
  Được phát triển với 💙 bởi <strong>ThanhluanGif</strong> • <a href="https://github.com/ThanhluanGif/Lunar">Lunar GitHub Repository</a>
</p>
