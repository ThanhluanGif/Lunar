# 📋 CODEX TASK CARD #01

> **Người giao việc**: Antigravity (Lead Architect / BA / QA Lead)  
> **Người thực thi**: Dev Codex  
> **Ngày giao**: 2026-07-31  
> **Trạng thái**: 🟡 READY FOR IMPLEMENTATION  

---

## 🎯 Mục Tiêu Công Việc

Triển khai 3 tính năng gia cố bảo mật và UX cấp doanh nghiệp cho **Lunar.dev**:
1. **Structured Security Logging & Correlation ID**: Thêm middleware theo vết request (`X-Correlation-ID`) và cấu trúc log JSON để dễ dàng theo vết audit security.
2. **CSV Export Formula Injection Protection**: Đảm bảo các dữ liệu xuất ra CSV được khử trùng (sanitize) các ký tự độc hại (`=`, `+`, `-`, `@`, `\t`, `\r`) chống tấn công CSV Injection.
3. **Modal Focus Trap & Accessibility (A11y)**: Đảm bảo tất cả các Modal trên giao diện React có tính năng Focus Trap và khôi phục Focus chuẩn WCAG 2.1 AA.

---

## 📐 Yêu Cầu Kỹ Thuật Chi Tiết (Technical Specs)

### Task 1.1: Request Correlation ID & Structured Logging (Backend)
- **Vị trí tệp**: `server/middleware/logger.js` hoặc `server/index.js`
- **Mô tả**:
  - Tạo hoặc nâng cấp middleware Express để kiểm tra header `X-Correlation-ID`. Nếu client không gửi, tự động tạo UUIDv4 / CSPRNG random hex ID.
  - Gắn `req.correlationId` và trả về trên Response Header `X-Correlation-ID`.
  - Chuẩn hóa các dòng log bảo mật và audit log trong Express ra định dạng JSON:
    ```json
    {
      "timestamp": "ISO-8601",
      "level": "INFO|WARN|ERROR",
      "correlationId": "uuid-or-hex",
      "userId": "user-uuid-or-null",
      "ip": "client-ip",
      "method": "GET|POST|...",
      "path": "/api/...",
      "status": 200,
      "message": "Log detail text"
    }
    ```

### Task 1.2: CSV Export Formula Injection Mitigation (Backend)
- **Vị trí tệp**: `server/routes/report.js` (hoặc nơi xử lý export CSV)
- **Mô tả**:
  - Tạo hàm helper `sanitizeCsvField(value)`:
    - Nếu `value` là string và bắt đầu bằng một trong các ký tự: `=`, `+`, `-`, `@`, `\t`, `\r`.
    - Thêm ký tự nháy đớn `'` vào đầu chuỗi: `'` + value.
  - Bọc tất cả các trường string dữ liệu trong file CSV trước khi xuất ra cho client.

### Task 1.3: Modal Focus Trap & Accessibility (Frontend)
- **Vị trí tệp**: `src/components/Modal.jsx` (hoặc các component Modal hiện có)
- **Mô tả**:
  - Thêm xử lý phím `Tab` và `Shift+Tab` để giữ tiêu điểm (Focus) bên trong Modal khi Modal đang mở.
  - Khi Modal đóng, tự động trả tiêu điểm về phần tử (button/link) đã kích hoạt mở Modal trước đó.
  - Đảm bảo thuộc tính ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.

---

## ✅ Tiêu Chí Nghiệm Thu (Definition of Done - DoD)

1. `npm run build` vượt qua không có lỗi JSX/Vite.
2. `npm run qa:security` & `npm run qa:sast` vượt qua 100%.
3. Mọi request gửi tới `/api/*` đều có header `X-Correlation-ID` phản hồi.
4. Export CSV không còn rủi ro Formula Injection.
5. Không có lỗi Console / Network breaking khi duyệt UI.

---

## 🔍 Hướng Dẫn Cho Dev Codex Khi Hoàn Thành

Sau khi Codex hoàn tất viết mã:
1. Chạy bộ kiểm thử local để xác nhận không vỡ build.
2. Báo lại cho **Antigravity** để tiến hành QA Audit, chạy các regression gate và lập **QA Verification Report**.
