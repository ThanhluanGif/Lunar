---
name: master-app-builder
description: MASTER SKILL DỰNG ỨNG DỤNG TỰ ĐỘNG (ONE-PROMPT INSTANT BUILDER). Người dùng chỉ cần đưa Ý tưởng, Skill tự phân hóa toàn bộ nghiệp vụ, thiết kế UI/UX Anti-AI-look, gọi generate_image sinh asset thật, tự chọn Model phù hợp, cấu hình DB & Bảo mật OWASP, và tự động test ra THÀNH PHẨM HOÀN CHỈNH.
---

# ONE-PROMPT MASTER APP BUILDER SKILL

> **Triết lý "Một Lệnh Ra Thành Phẩm"**: Người dùng chỉ cần đưa Ý TƯỞNG -> Master Skill tự động phân hóa nghiệp vụ, dựng UI/UX Anti-AI-Look, gọi `generate_image` tạo asset thật, cấu hình DB & Bảo mật OWASP.

## 🚀 QUY TRÌNH TỰ ĐỘNG PHÂN HÓA (AUTO-ORCHESTRATION PIPELINE)

### 1. Tự Động Phân Tích & Chọn Model (Auto-Model Selection)
- Tự động chọn Model Tier phù hợp (`Flash` cho research, `Pro` cho UI/UX & logic, `Reasoning` cho security/compaction).

### 2. Tự Động Phân Hóa Nghiệp Vụ Chuyên Sâu (Auto Domain Breakdown)
- Tự định hình danh mục nghiệp vụ (Sản phẩm, Dịch vụ, Người dùng, Báo cáo, Thanh toán).
- Tự thiết kế Database Schema (Users, Products, Orders, Auth Logs).
- Tự cấu hình luồng làm việc chính (Checkout, Search, Dashboard, Form).

### 3. Tự Động Tạo Giao Diện Anti-AI-Look & Asset Thật (Auto UI/UX & Real Assets)
- Khởi tạo thư mục `public/assets/images/` và gọi tool `generate_image` tạo Banner, Logo, Avatars thật.
- Áp dụng Design Tokens: Google Fonts (`Mona Sans`, `Inter`, `Outfit`), Slate Obsidian Theme.

### 4. Tự Động Tích Hợp Bảo Mật & Self-Testing (Auto Security & Self-Correction)
- Bắt buộc HttpOnly Cookie (`Secure`, `SameSite=Strict`), Input Sanitization Zod, Rate Limiting.
- Chạy test tự động với QA Circuit Breaker -> PASS 100% mới hoàn tất.
