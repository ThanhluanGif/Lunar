# 🌙 Lunar - AI Code Review, Security Audit & Auto-Patch Workbench

<p align="center">
  <img src="https://img.shields.io/badge/Lunar.dev-AI_Code_Security-8b5cf6?style=for-the-badge&logo=moon" alt="Lunar Banner" />
  <img src="https://img.shields.io/badge/SAST-OWASP_Top_10-f43f5e?style=for-the-badge&logo=shield" alt="OWASP Shield" />
  <img src="https://img.shields.io/badge/Auto--Fix-Code_Repair_Diff-10b981?style=for-the-badge&logo=git" alt="Auto-Fix" />
  <img src="https://img.shields.io/badge/License-MIT-06b6d4?style=for-the-badge" alt="MIT License" />
</p>

---

## 📖 Giới Thiệu (About Lunar)

**Lunar** (`Lunar.dev`) là nền tảng **AI Code Review Chuyên Sâu, Quét Lỗ Hổng Bảo Mật (SAST)** và **Tự Động Vá Lỗi Mã Nguồn (Code Repair Workbench)** kết hợp cùng **Cộng Đồng Cybersecurity Việt Nam**.

Lunar cho phép lập trình viên dán link GitHub Repository hoặc dán mã trực tiếp để AI kiểm định theo các tiêu chuẩn an ninh quốc tế (OWASP Top 10, CWE Database), tính điểm rủi ro **CVSS v3.1** và tự động sinh bản vá lỗi trực quan (Diff View).

---

## 🌟 Feature Highlights (Tính Năng Nổi Bật)

### 1. 🛡️ Lunar AI Security SAST & CVSS v3.1 Scoring
- Tự động kiểm tra và phát hiện các lỗ hổng nguy hiểm:
  - 🚨 **CWE-798**: Lộ thông tin nhạy cảm (Hardcoded Secret Keys, Tokens, Passwords).
  - 💉 **CWE-89**: Lỗi SQL Injection (ghép chuỗi truy vấn trực tiếp).
  - 🕸️ **CWE-79**: Cross-Site Scripting (XSS qua innerHTML/dangerouslySetInnerHTML).
  - 🔑 **CWE-347**: Insecure JWT Authentication (Decode không verify chữ ký cryptographic).
  - ⚡ **CWE-95**: Remote Code Execution (RCE qua eval/exec).
- Đo lường và xếp hạng rủi ro theo thang điểm chuẩn **CVSS v3.1** (Critical 9.0+, High, Medium, Low).

### 2. 🛠️ AI Code Repair Workbench (Sửa Code Tự Động)
- **1-Click Apply Auto-Fix Patch**: Sửa lỗi tự động chỉ với 1 cú nhấp chuột.
- **Side-by-Side & Unified Diff View**: Màn hình đôi so sánh mã lỗi cũ (`🔴 ORIGINAL`) vs mã đã được vá an toàn (`🟢 AI PATCHED`).
- **3 Phong Cách Sửa Code AI**:
  - 🔒 `Max Security (OWASP Standard)`
  - ⚡ `High Performance Async`
  - 📖 `Clean Code & Comments`
- Tải file đã vá về máy hoặc tự động tạo **GitHub Pull Request**.

### 3. 🔒 Phân Quyền Guest / Member Paywall Gate
- **Guest Mode (Khách vãng lai)**: Quét thử miễn phí, xem Điểm CVSS và số lượng lỗ hổng tổng quan.
- **Paywall Gate Container**: Tự động mờ (Blur Overlay) nội dung từng dòng code và bản vá AI đối với Khách; mở khóa 100% khi Đăng ký / Đăng nhập.

### 4. 👥 Cộng Đồng Cybersecurity & White-Hat Hackers
- Diễn đàn thảo luận dành riêng cho Pentesters, Security Researchers và Developers.
- Xếp hạng Top Ethical Hackers dựa trên điểm Karma và đóng góp vá lỗi.

---

## 💻 Tech Stack

- **Frontend Core**: React 18, Vite 5, JavaScript (ESNext).
- **Styling & Theme**: Vanilla CSS Custom Variables, Deep Cosmic Dark Theme, Glassmorphism, Micro-animations.
- **Icons**: Lucide React.
- **API Services**: GitHub REST API Service & Static Application Security Testing (SAST Engine).

---

## 🚀 Quick Start (Hướng Dẫn Chạy Dự Án)

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Chạy Dev Server
```bash
npm run dev
```
Truy cập ứng dụng tại `http://localhost:3000`.

### 3. Build Sản Xuất (Production Build)
```bash
npm run build
```

---

## 📦 Hướng Dẫn Đẩy Code Lên GitHub (`https://github.com/ThanhluanGif/Lunar.git`)

Chạy các lệnh Git sau trong thư mục dự án để khởi tạo và push code lên GitHub:

```bash
# 1. Khởi tạo Git repository (nếu chưa khởi tạo)
git init

# 2. Thêm tất cả các file vào staging
git add .

# 3. Tạo commit đầu tiên
git commit -m "feat: Initial commit for Lunar AI Code Review & Security Platform"

# 4. Đổi tên branch chính thành main
git branch -M main

# 5. Thêm remote repository GitHub
git remote add origin https://github.com/ThanhluanGif/Lunar.git

# 6. Đẩy code lên GitHub
git push -u origin main
```

---

## 📜 License
Phát triển và phát hành theo giấy phép [MIT License](LICENSE).
