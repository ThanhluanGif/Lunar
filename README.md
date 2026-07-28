# 🌙 Lunar.dev — AI Code Review, SAST Security Audit & 1-Click Auto-Fix Workbench

<p align="center">
  <img src="https://img.shields.io/badge/Lunar.dev-AI_Security_Workbench-2563eb?style=for-the-badge&logo=moon" alt="Lunar Banner" />
  <img src="https://img.shields.io/badge/SAST-OWASP_Top_10-dc2626?style=for-the-badge&logo=shield" alt="OWASP Shield" />
  <img src="https://img.shields.io/badge/Supabase-Realtime_Cloud_DB-059669?style=for-the-badge&logo=supabase" alt="Supabase Realtime" />
  <img src="https://img.shields.io/badge/Auto--Fix-1--Click_Patch_Diff-0284c7?style=for-the-badge&logo=git" alt="Auto-Fix" />
  <img src="https://img.shields.io/badge/License-MIT-7c3aed?style=for-the-badge" alt="MIT License" />
</p>

---

## 📖 Giới Thiệu (About Lunar.dev)

**Lunar.dev** là nền tảng **Kiểm tra An toàn Mã nguồn (SAST - Static Application Security Testing)** và **Vá Lỗi Tự Động (1-Click Code Repair Workbench)** chuyên sâu, phục vụ cộng đồng Lập trình viên & Chuyên gia An toàn Thông tin.

Nền tảng giúp phát hiện các lỗ hổng mã nguồn nguy hiểm theo tiêu chuẩn an toàn quốc tế (**OWASP Top 10**, **CWE Database**, **CVSS v3.1**), tự động sinh ra bản vá lỗi với giao diện so sánh trực quan (Red/Green Diff), và hỗ trợ đẩy thẳng bản vá thành **GitHub Pull Request** thông qua GitHub Action Bot.

---

## 🌟 Tính Năng Nổi Bật (Key Features)

### 1. 🛡️ SAST Security Engine & CVSS v3.1 Scoring
- Tự động quét và phát hiện các danh mục lỗ hổng nguy hiểm:
  - 🚨 **CWE-798**: Lộ Hardcoded API Keys, Secret Tokens & Passwords.
  - 💉 **CWE-89**: Lỗi SQL Injection (truy vấn ghép chuỗi không tham số hóa).
  - 🕸️ **CWE-352 / CWE-79**: CSRF & Cross-Site Scripting (XSS qua `innerHTML`).
  - 🔑 **CWE-347**: Insecure JWT Authentication (Giải mã JWT thiếu xác thực chữ ký).
  - ⚡ **CWE-95**: Remote Code Execution (RCE qua `eval`/`exec`).
- Đo lường và phân cấp rủi ro theo thang điểm quốc tế **CVSS v3.1** (Critical, High, Medium, Low).

### 2. 🛠️ 1-Click Code Repair Workbench (Vá Code Tự Động)
- **1-Click Apply Patch**: Áp dụng bản vá an toàn chỉ với một cú nhấp chuột.
* **Side-by-Side & Unified Diff View**: Màn hình đối sánh song song mã gốc bị lỗi (`🔴 ORIGINAL`) và mã đã vá an toàn (`🟢 AI PATCHED`).
- Tải file đã vá về máy tính hoặc sinh file cấu hình **GitHub CI/CD Action Workflow** (`lunar-security.yml`).

### 3. 📂 GitHub Workspace & Local File Scanner Động
- **Đồng bộ GitHub cá nhân**: Không rào cản. Nhập Username GitHub hoặc đăng nhập để tự động nạp toàn bộ danh sách Repositories thực tế của người dùng đó.
- **Local Drag & Drop Scanner**: Hỗ trợ kéo thả hoặc chọn tệp tin từ máy tính (`.js`, `.jsx`, `.ts`, `.py`, `.sql`, `.json`,...) để quét và vá lỗi trực tiếp.

### 4. ⚡ Supabase Realtime Monitoring & Persistent Auth Session
- **Supabase Cloud DB & Realtime Channel**: Giám sát thời gian thực số lượng dự án đã quét, tổng số lỗ hổng phát hiện và các bản vá AI thành công.
- **Cơ chế lưu phiên đăng nhập bền vững**: Lưu giữ trạng thái người dùng qua `localStorage` và Supabase Auth session, không bao giờ trôi trạng thái khi chuyển trang hoặc F5.

### 5. 🤖 Sơ Đồ Kiến Trúc C4 & Mermaid.js
- Trực quan hóa cấu trúc hệ thống C4 Model, quy trình nén thẻ phân cấp 10-in-1 (Hierarchical Compaction Flow) và đường ống SAST Pipeline trực tiếp bằng Mermaid.js.

---

## 💻 Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ / Thư viện |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite 5, JavaScript (ESNext) |
| **Giao diện & UI System** | Minimalist High-Contrast Standard (Plus Jakarta Sans & Inter, WCAG AAA) |
| **Database & Cloud Backend** | Supabase Cloud Service (PostgreSQL Database, Supabase Auth, Realtime Engine) |
| **SAST Engine** | Custom Static Application Security Testing & CVSS Evaluator |
| **AI Skills Infrastructure** | `thanhluangit-skills` (v2.0.2) & `lunar-skills` (v1.0.0) |
| **Diagrams & Icons** | Mermaid.js, Lucide React Icons |

---

## 🚀 Hướng Dẫn Chạy Dự Án (Quick Start)

### 1. Yêu cầu môi trường
- Node.js version `>= 18.0.0`
- npm hoặc yarn

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Mở trình duyệt tại địa chỉ: **`http://localhost:3000`**

### 4. Đóng gói bản sản xuất (Production Build)
```bash
npm run build
```

---

## ⚙️ Cấu Hình Biến Môi Trường (.env)

Tạo tệp `.env` tại thư mục gốc dự án (file này đã được bảo vệ trong `.gitignore`):

```env
VITE_SUPABASE_URL="https://zqhzfjidwxhobopivkrl.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
DATABASE_URL="postgres://postgres.zqhzfjidwxhobopivkrl:VJl7Gq0LNGcnteUK@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
```

---

## 📜 Giấy Phép (License)

Dự án được phát triển và phân phối theo giấy phép chính thức [MIT License](LICENSE).
