---
name: qa-circuit-breaker
description: Skill tự động kiểm thử (Unit/API/Integration), sử dụng Mock Engine cho 3rd-party APIs, kích hoạt Circuit Breaker khi cần tay người thao tác (WAITING_HUMAN_INPUT), ngắt vòng lặp tối đa 2 retries để bảo vệ Token Budget.
---

# QA & CIRCUIT BREAKER SKILL

Chịu trách nhiệm kiểm thử tự động toàn bộ ứng dụng, bảo đảm chất lượng (QA) và bảo vệ Token Budget bằng cơ chế ngắt mạch thông minh (Circuit Breaker).

## NGUYÊN TẮC KIỂM THỬ THÔNG MINH

1. **Cơ chế Mock Engine cho 3rd-Party Service**:
   - Khi test các tính năng phụ thuộc bên ngoài (Google Auth, Zalo Webhook, Payment Gateway, SMS OTP): **KHÔNG gọi API thật**.
   - Khởi tạo Mock Server / Stub responses để kiểm tra xem Backend/Frontend của ta xử lý HTTP status code (200, 400, 401, 500) có đúng logic không.

2. **Cơ chế Circuit Breaker (Cầu chì ngắt mạch)**:
   - **Max Retries**: Đặt giới hạn tối đa 2 lần sửa lỗi lặp lại cho một bug.
   - **Phát hiện kẹt phụ thuộc**: Nếu lỗi do thiếu API Key thật trong `.env` hoặc cần con người đăng nhập/nhập OTP:
     - **NGẮT LẬP TỨC VÒNG LẶP (PAUSE)**.
     - Chuyển trạng thái sang `STATUS: WAITING_HUMAN_INPUT`.
     - Xuất hướng dẫn rõ ràng cho người dùng, KHÔNG cố lặp vô hạn gây tốn Token.

3. **Cơ chế Trung Thực (No False-PASS)**:
   - Chỉ trả về `STATUS: PASS` khi log runtime kiểm thử thực tế đạt 100% pass rate.
   - Tuyệt đối không tự ngụy tạo PASS khi quá giới hạn retry.
