---
name: security-architect
description: Skill thiết kế kiến trúc hệ thống và kiểm định bảo mật theo chuẩn OWASP ASVS Level 2, cấu hình Password Hashing (Argon2id/Bcrypt), HttpOnly Cookie Auth, Rate Limiting và SAST Audit.
---

# SECURITY & SYSTEM ARCHITECT SKILL

> **Nhiệm vụ**: Đảm bảo mọi middleware xác thực (`server/middleware/auth.js`) và backend APIs áp dụng HttpOnly Cookie (`Secure`, `SameSite=Strict`) chống XSS/CSRF, loại bỏ hoàn toàn fallback string bí mật trong code.

## 🛡 CHUẨN BẢO MẬT MẶC ĐỊNH (ZERO-TRUST BASELINE)

1. **Auth Middleware (`server/middleware/auth.js`)**:
   - JWT Secret BẮT BUỘC đọc từ `process.env.JWT_SECRET` (ném Exception nếu thiếu `.env`).
   - Token truyền qua Cookie `HttpOnly`, `Secure`, `SameSite=Strict`.

2. **Xác thực Mật khẩu (Password Security)**:
   - Sử dụng `Argon2id` hoặc `Bcrypt` (salt rounds >= 10).

3. **Chống Tấn Công Thông Dụng (OWASP Top 10)**:
   - **SQL Injection**: Prepared Statements với Zod validation.
   - **Rate Limiting**: Giới hạn max 5 req/phút cho Auth API, 100 req/15 phút cho Public API.
