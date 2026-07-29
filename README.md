# 🌙 Lunar.dev — AI Code Review, SAST Security Audit & 1-Click Auto-Fix Workbench

<p align="center">
  <img src="https://img.shields.io/badge/Lunar.dev-AI_Security_Workbench-2563eb?style=for-the-badge&logo=moon" alt="Lunar Banner" />
  <img src="https://img.shields.io/badge/SAST-OWASP_Top_10-dc2626?style=for-the-badge&logo=shield" alt="OWASP Shield" />
  <img src="https://img.shields.io/badge/Supabase-Realtime_Cloud_DB-059669?style=for-the-badge&logo=supabase" alt="Supabase Realtime" />
  <img src="https://img.shields.io/badge/Auto--Fix-1--Click_Patch_Diff-0284c7?style=for-the-badge&logo=git" alt="Auto-Fix" />
  <img src="https://img.shields.io/badge/License-MIT-7c3aed?style=for-the-badge" alt="MIT License" />
</p>

---

## 📖 Giới Thiệu (About)

**Lunar.dev** là nền tảng **Kiểm tra An toàn Mã nguồn (SAST — Static Application Security Testing)** và **Vá Lỗi Tự Động (1-Click Code Repair Workbench)** chuyên sâu, phục vụ cộng đồng Lập trình viên & Chuyên gia An toàn Thông tin.

Nền tảng giúp phát hiện các lỗ hổng mã nguồn nguy hiểm theo tiêu chuẩn an toàn quốc tế (**OWASP Top 10**, **CWE Database**, **CVSS v3.1**), tự động sinh ra bản vá lỗi với giao diện so sánh trực quan (Red/Green Diff), và hỗ trợ đẩy thẳng bản vá thành **GitHub Pull Request** thông qua GitHub Action Bot.

---

## 🌟 Tính Năng Nổi Bật (Key Features)

### 1. 🛡️ SAST Security Engine & CVSS v3.1 Scoring
- Tự động quét và phát hiện các danh mục lỗ hổng nguy hiểm:
  - **CWE-798** — Lộ Hardcoded API Keys, Secret Tokens & Passwords
  - **CWE-89** — SQL Injection (truy vấn ghép chuỗi không tham số hóa)
  - **CWE-352 / CWE-79** — CSRF & Cross-Site Scripting (XSS)
  - **CWE-347** — Insecure JWT Authentication
  - **CWE-95** — Remote Code Execution (RCE qua `eval`/`exec`)
- Đo lường và phân cấp rủi ro theo thang điểm quốc tế **CVSS v3.1** (Critical, High, Medium, Low)

### 2. 🛠️ 1-Click Code Repair Workbench
- **1-Click Apply Patch** — Áp dụng bản vá an toàn chỉ với một cú nhấp chuột
- **Side-by-Side & Unified Diff View** — Màn hình đối sánh song song mã gốc bị lỗi (`ORIGINAL`) và mã đã vá an toàn (`AI PATCHED`)
- Tải file đã vá về máy hoặc sinh file cấu hình **GitHub CI/CD Action Workflow** (`lunar-security.yml`)

### 3. 📂 GitHub Workspace & Local File Scanner
- **Đồng bộ GitHub cá nhân** — Nhập Username GitHub hoặc đăng nhập để tự động nạp toàn bộ danh sách Repositories
- **Local Drag & Drop Scanner** — Kéo thả hoặc chọn tệp từ máy tính (`.js`, `.jsx`, `.ts`, `.py`, `.sql`, `.json`,...) để quét và vá lỗi trực tiếp

### 4. ⚡ Supabase Realtime Monitoring & Persistent Auth
- **Supabase Cloud DB & Realtime Channel** — Giám sát thời gian thực số lượng dự án đã quét, tổng lỗ hổng phát hiện và bản vá AI thành công
- **Cơ chế lưu phiên bền vững** — Lưu giữ trạng thái người dùng qua `localStorage` và Supabase Auth session

### 5. 🏆 Community & Gamification
- **Leaderboard** — Bảng xếp hạng cộng đồng theo Karma Points
- **Community Audits** — Nơi chia sẻ và thảo luận các bài kiểm tra bảo mật
- **Portfolio Badge** — Huy hiệu trình độ bảo mật cá nhân

### 6. 📊 Admin Dashboard & Analytics
- Thống kê tổng quan hệ thống: số lượng users, scans, vulnerabilities
- Quản lý người dùng và kiểm soát quota

---

## 🏗️ Kiến Trúc Hệ Thống (Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
│  React 18 + Vite 5 │ Lucide Icons │ Mermaid.js Diagrams    │
└─────────────┬───────────────────────────────┬───────────────┘
              │ REST API (Port 5000)          │ Realtime WS
              ▼                               ▼
┌─────────────────────────┐    ┌──────────────────────────────┐
│   Express 5 Backend     │    │   Supabase Cloud Service     │
│  ├── authRoutes         │    │  ├── PostgreSQL Database     │
│  ├── scanRoutes         │    │  ├── Supabase Auth           │
│  ├── communityRoutes    │    │  ├── Realtime Engine         │
│  ├── githubRoutes       │    │  └── Row Level Security      │
│  ├── reportRoutes       │    └──────────────────────────────┘
│  └── policyRoutes       │
│                         │
│  Middleware:             │
│  ├── JWT Auth Guard     │
│  └── Rate Limiter       │
└─────────────────────────┘
```

---

## 💻 Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, JavaScript (ESNext) |
| **UI / Fonts** | Plus Jakarta Sans, Inter, JetBrains Mono, Fira Code — WCAG AAA |
| **Backend** | Express 5, Node.js 20 |
| **Database** | PostgreSQL 16 (via Supabase Cloud) |
| **Auth** | Supabase Auth + JWT (bcryptjs, jsonwebtoken) |
| **Security** | Custom SAST Engine, CVSS v3.1 Evaluator, Rate Limiter |
| **Realtime** | Supabase Realtime Channel |
| **Diagrams** | Mermaid.js |
| **Icons** | Lucide React |
| **Containerization** | Docker, Docker Compose |

---

## 📁 Cấu Trúc Dự Án (Project Structure)

```
lunar/
├── index.html                  # HTML entry point
├── vite.config.js              # Vite configuration
├── package.json                # Dependencies & scripts
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose orchestration
├── .env.example                # Environment variables template
├── .gitignore
│
├── src/                        # Frontend source code
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Main application component
│   ├── components/             # UI Components
│   │   ├── FigmaLunarLanding.jsx       # Landing page
│   │   ├── LunarDashboard.jsx          # Main dashboard
│   │   ├── AdminDashboard.jsx          # Admin panel
│   │   ├── SecurityDashboard.jsx       # Security overview
│   │   ├── CodeRepairWorkbench.jsx     # 1-Click patch workbench
│   │   ├── VulnerabilityPatcher.jsx    # Vulnerability patching
│   │   ├── CodeViewer.jsx              # Source code viewer
│   │   ├── UserGitHubWorkspace.jsx     # GitHub integration
│   │   ├── SecurityCommunity.jsx       # Community features
│   │   ├── Leaderboard.jsx             # Karma leaderboard
│   │   ├── AuthModal.jsx               # Authentication modal
│   │   ├── Navbar.jsx                  # Navigation bar
│   │   ├── ScoreRadar.jsx              # Score visualization
│   │   ├── PricingModal.jsx            # Pricing tiers
│   │   └── ...                         # Other modals & components
│   ├── services/               # Business logic & API clients
│   │   ├── supabaseClient.js           # Supabase client config
│   │   ├── securityScannerEngine.js    # SAST scanner engine
│   │   ├── aiReviewEngine.js           # AI review logic
│   │   ├── githubService.js            # GitHub API integration
│   │   ├── githubBotService.js         # GitHub bot actions
│   │   ├── gmailMailerService.js       # Email notifications
│   │   ├── multiLlmEngine.js           # Multi-LLM support
│   │   └── nineRouterService.js        # 9Router navigation
│   ├── data/                   # Static data & configurations
│   └── styles/                 # CSS stylesheets
│
└── server/                     # Backend source code
    ├── index.js                # Express server entry point
    ├── schema.sql              # PostgreSQL DDL schema
    ├── package.json            # Server dependencies
    ├── db/
    │   └── connection.js       # Database connection pool
    ├── middleware/
    │   ├── auth.js             # JWT authentication middleware
    │   └── rateLimiter.js      # Rate limiting middleware
    └── routes/
        ├── authRoutes.js       # Auth endpoints (register, login)
        ├── scanRoutes.js       # Code scan endpoints
        ├── communityRoutes.js  # Community audit endpoints
        ├── githubRoutes.js     # GitHub integration endpoints
        ├── reportRoutes.js     # Report generation endpoints
        └── policyRoutes.js     # Security policy endpoints
```

---

## 🚀 Hướng Dẫn Cài Đặt (Quick Start)

### Yêu cầu môi trường
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- Tài khoản [Supabase](https://supabase.com) (miễn phí)

### 1. Clone repository

```bash
git clone https://github.com/ThanhluanGif/Lunar.git
cd Lunar
```

### 2. Cấu hình biến môi trường

```bash
cp .env.example .env
```

Mở file `.env` và điền các giá trị thực tế của bạn (xem phần [Cấu hình biến môi trường](#%EF%B8%8F-cấu-hình-biến-môi-trường-environment-variables) bên dưới).

### 3. Cài đặt dependencies

```bash
npm install
```

### 4. Chạy môi trường phát triển

```bash
npm run dev
```

Mở trình duyệt tại: **`http://localhost:3000`**

### 5. Đóng gói bản Production

```bash
npm run build
npm run preview
```

---

## 🐳 Chạy bằng Docker

```bash
# Build và chạy toàn bộ hệ thống
docker-compose up --build

# Chạy ở chế độ nền
docker-compose up -d --build
```

Truy cập tại: **`http://localhost:5000`**

---

## ⚙️ Cấu Hình Biến Môi Trường (Environment Variables)

Tạo file `.env` tại thư mục gốc dự án (file này đã được bảo vệ trong `.gitignore`).

Tham khảo file `.env.example` để biết danh sách đầy đủ các biến cần thiết:

| Biến | Mô tả | Bắt buộc |
| :--- | :--- | :---: |
| `PORT` | Port cho Express server | ✅ |
| `NODE_ENV` | Môi trường (`development` / `production`) | ✅ |
| `JWT_SECRET` | Secret key cho JWT token signing (tự tạo chuỗi ngẫu nhiên) | ✅ |
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `VITE_SUPABASE_URL` | URL của Supabase project | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Key (public) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (server-side only) | ⚠️ |
| `SUPABASE_POSTGRES_PASSWORD` | Mật khẩu PostgreSQL | ✅ |

> **⚠️ QUAN TRỌNG:** Không bao giờ commit file `.env` lên Git. File này chứa các credentials nhạy cảm và đã được thêm vào `.gitignore`.

### Tạo JWT Secret an toàn

```bash
# Tạo JWT secret ngẫu nhiên bằng Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Hoặc bằng openssl
openssl rand -base64 64
```

### Lấy Supabase Credentials

1. Truy cập [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn → **Settings** → **API**
3. Copy **Project URL** → `VITE_SUPABASE_URL`
4. Copy **anon public** key → `VITE_SUPABASE_ANON_KEY`
5. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (chỉ dùng ở server)
6. Vào **Settings** → **Database** → copy **Connection string** → `DATABASE_URL`

---

## 🗄️ Database Schema

Khởi tạo database bằng file schema có sẵn:

```bash
# Nếu dùng Docker Compose, schema tự động chạy khi khởi tạo
docker-compose up -d

# Hoặc chạy thủ công trên PostgreSQL
psql $DATABASE_URL -f server/schema.sql
```

Các bảng chính:
- **`users`** — Tài khoản người dùng với RBAC (FREE / PRO / ENTERPRISE)
- **`projects`** — Danh sách dự án cần quét
- **`scans`** — Kết quả các lần quét bảo mật
- **`vulnerabilities`** — Chi tiết lỗ hổng phát hiện
- **`community_audits`** — Bài viết kiểm tra bảo mật từ cộng đồng
- **`audit_comments`** — Bình luận thảo luận
- **`karma_transactions`** — Lịch sử điểm Karma
- **`quota_logs`** — Nhật ký sử dụng quota

---

## 🔒 Bảo Mật (Security)

Dự án tuân thủ các nguyên tắc bảo mật:

- **JWT Authentication** — Token-based auth với bcrypt password hashing
- **Rate Limiting** — Giới hạn số lượng request để chống brute-force và DDoS
- **Row Level Security (RLS)** — Supabase RLS đảm bảo người dùng chỉ truy cập dữ liệu của mình
- **Environment Variables** — Không hardcode credentials trong source code
- **CORS Configuration** — Kiểm soát cross-origin requests
- **Input Validation** — Kiểm tra đầu vào tại cả frontend và backend

---

## 🤝 Đóng Góp (Contributing)

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit changes: `git commit -m "feat: mô tả thay đổi"`
4. Push lên branch: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

---

## 📜 Giấy Phép (License)

Dự án được phát triển và phân phối theo giấy phép [MIT License](LICENSE).

---

<p align="center">
  Được phát triển bởi <strong>ThanhluanGif</strong> • <a href="https://github.com/ThanhluanGif/Lunar">GitHub</a>
</p>
