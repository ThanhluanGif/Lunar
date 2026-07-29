# Báo cáo Nghiệm thu Tính năng Hệ thống Thanh toán (Walkthrough)

**Dự án**: Lunar Code Review  
**Nhánh Git**: `Acer`  
**Trạng thái**: ✅ HOÀN THÀNH 100% (PASS ALL QA TESTS)  

---

## 🛠 TÓM TẮT CÁC THAY ĐỔI ĐÃ THỰC HIỆN

### 1. Database Schema (`server/schema.sql`)
- Bổ sung bảng `payments` lưu trữ chi tiết giao dịch (mã đơn hàng, số tiền, nội dung chuyển khoản, phương thức `VIETQR`/`CARD`, mã QR URL và trạng thái `PENDING`/`SUCCESS`/`FAILED`).
- Bổ sung bảng `subscriptions` theo dõi thời hạn nâng cấp gói cước người dùng.

### 2. Backend REST API (`server/routes/paymentRoutes.js` & `server/index.js`)
- `POST /api/v1/payment/create-order`: Sinh mã đơn hàng và mã VietQR động chuẩn ngân hàng MBBank.
- `GET /api/v1/payment/status/:orderCode`: Lấy trạng thái giao dịch thực tế.
- `POST /api/v1/payment/mock-webhook`: Endpoint webhook mô phỏng cho QA Circuit Breaker để xác nhận giao dịch không cần gọi gateway thật.
- `GET /api/v1/payment/subscription`: Tra cứu thông tin gói cước và hạn mức sử dụng.

### 3. Frontend Giao diện Thanh toán (`src/components/PaymentModal.jsx` & `PricingModal.jsx`)
- Giao diện Editorial Minimal tuân thủ `DESIGN.md`: Không có Emoji, màu sắc tối giản tinh tế, biểu tượng Lucide SVG.
- Mặc định ưu tiên **VietQR Scan-to-pay** với mã QR động, sao chép STK/nội dung chuyển khoản 1-click, đếm ngược 10 phút.
- Thẻ quốc tế Visa/Mastercard được xếp vào tab tùy chọn thứ hai.
- Giá hiển thị định dạng chuẩn Việt Nam: `₫290,000` (Pro) và `₫1,500,000` (Enterprise).

---

## 🧪 KẾT QUẢ KIỂM THỬ VÀ XÁC MINH

| Kịch bản Test | Kết quả kỳ vọng | Trạng thái Thực tế |
|---|---|---|
| Mở bảng giá chọn gói Pro | Modal hiển thị giá `₫290,000` và chuyển sang Payment Modal | PASS |
| Khởi tạo VietQR | Mã QR động được render chính xác từ `img.vietqr.io` | PASS |
| Sao chép nhanh STK & Nội dung | Sao chép thành công vào Clipboard và hiển thị phản hồi "Đã chép" | PASS |
| Chạy Mock Webhook Test | Backend cập nhật status `SUCCESS` & Nâng cấp user tier lên `PRO` | PASS |

---

## 📸 HƯỚNG DẪN KIỂM TRA TRÊN BÀN LÀM VIỆC

1. Đảm bảo ứng dụng chạy tại: `http://localhost:5173`.
2. Trên Header, nhấn nút **Up Pro** hoặc chọn gói **PRO (₫290,000/tháng)**.
3. Trong giao diện thanh toán, bạn sẽ thấy mã VietQR động cùng nút **Thanh Toán Giả Lập (Test)**.
4. Bấm nút giả lập để trải nghiệm luồng nâng cấp tài khoản tự động thành công 100%.
