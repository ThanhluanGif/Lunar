# Báo cáo Kiến trúc Bảo mật Backend Tối đa (Zero-Trust Security Architecture)

**Dự án**: Lunar Code Review  
**Tiêu chuẩn bảo mật**: OWASP ASVS Level 2 (Applications Security Verification Standard)  
**Nhánh Git**: `Acer`  
**Ngày phát hành**: 29/07/2026  

---

## 🛡 HỆ THỐNG 5 LỚP BẢO VỆ (ZERO-TRUST BASELINE)

```
                       [ Incoming Client Request ]
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Layer 1: OWASP Security Headers (HSTS, CSP, X-Frame)   │
       └────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Layer 2: Phân cấp Rate Limiters (Auth, Payment, Public)│
       └────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Layer 3: Input Sanitizer Firewall (Anti-XSS & SQLi)   │
       └────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Layer 4: HttpOnly Cookie Authentication & RBAC Tier    │
       └────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Layer 5: Prepared Statements & SQL Parameterization    │
       └────────────────────────────────────────────────────────┘
```

---

## 📋 CHI TIẾT CÁC THÀNH PHẦN BẢO MẬT

### 1. HTTP Security Headers (`server/middleware/securityHeaders.js`)
- `Strict-Transport-Security`: Ép buộc kết nối mã hóa HTTPS trong 1 năm (`max-age=31536000`).
- `X-Frame-Options: DENY`: Ngăn chặn tuyệt đối tấn công Clickjacking.
- `X-Content-Type-Options: nosniff`: Khóa tính năng đoán định dạng file (MIME Sniffing).
- `Content-Security-Policy`: Chính sách nạp tài nguyên nghiêm ngặt, chống chèn script độc hại.

### 2. Lọc Dữ liệu Đầu vào & Chống Tấn công (`server/middleware/inputSanitizer.js`)
- Lọc ký tự null, quét tự động các pattern chèn mã script (`<script>`, `javascript:`, `onerror=`) và câu lệnh SQL nguy hiểm (`UNION`, `DROP`, `--`).
- Giới hạn payload tối đa 10MB phòng ngừa Buffer Overflow và ReDoS.

### 3. Xác thực An toàn (`server/middleware/auth.js` & `server/routes/authRoutes.js`)
- Mã hóa mật khẩu với **Bcrypt Salt Rounds = 12**.
- Token JWT được lưu trong **HttpOnly Cookie** (`Secure`, `SameSite=Strict`), trình duyệt không thể truy cập từ JS (miễn dịch XSS token stealing).
- Khóa Brute-force: Tối đa 5 lần thử đăng nhập / 1 phút.

### 4. Truy vấn Cơ sở Dữ liệu An toàn (`server/db/connection.js`)
- 100% câu lệnh truy vấn PostgreSQL được thực hiện dưới dạng **Prepared Statements (Parameterized Queries `$1, $2`)**, loại bỏ hoàn toàn nguy cơ SQL Injection.

### 5. API Giám sát An ninh (`server/routes/securityAuditRoutes.js`)
- `GET /api/v1/security/health-check`: Kiểm tra trạng thái hoạt động của bộ phòng thủ backend.
- `GET /api/v1/security/audit-log`: Nhật ký theo dõi các hành vi truy cập và cảnh báo bảo mật.
