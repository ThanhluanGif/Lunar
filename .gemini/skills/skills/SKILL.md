---
name: skills
description: Quản lý, điều phối và liệt kê toàn bộ Hệ thống Skills trong AGY CLI. Kích hoạt thông qua lệnh /skills để xem danh sách skills, trạng thái roadmap và hướng dẫn sử dụng từng skill.
---

# 🚀 AGY SKILLS MANAGER & DISPATCHER (/skills)

Hệ thống quản lý Skills tích hợp dành riêng cho AGY CLI Terminal Runner. Lệnh `/skills` đóng vai trò là Hub trung tâm để điều phối, tra cứu và kích hoạt các chuyên gia AI (Subagent Skills) trong hệ thống Master AI Virtual Agency.

---

## 📋 DANH SÁCH CORE SKILLS KHẢ DỤNG

| Lệnh / Skill Name | Tên Chuyên Gia | Mô Tả & Nhiệm Vụ Chính | File Trỏ Tới |
| :--- | :--- | :--- | :--- |
| **`master-orchestrator`** | Master Orchestrator | Điều phối luồng làm việc, lập kế hoạch nhân sự AI, xuất báo cáo Org Report & Walkthrough | `.gemini/skills/master-orchestrator/SKILL.md` |
| **`security-architect`** | Security Architect | Kiểm định OWASP ASVS Level 2, cấu hình Password Hashing (Argon2id/Bcrypt), JWT Cookie, Rate Limit | `.gemini/skills/security-architect/SKILL.md` |
| **`anti-ai-ui-developer`** | Anti-AI UI Dev | Thiết kế UI/UX độc quyền chống AI-look, Design Tokens (Google Fonts, HSL), sinh ảnh qua `generate_image` | `.gemini/skills/anti-ai-ui-developer/SKILL.md` |
| **`qa-circuit-breaker`** | QA Circuit Breaker | Kiểm thử tự động, chạy Mock Server (`scripts/mock-server.js`), kích hoạt cầu chì ngắt mạch khi kẹt token | `.gemini/skills/qa-circuit-breaker/SKILL.md` |
| **`skills`** | AGY Skills Hub | Quản lý danh mục skills, hiển thị status roadmap, kiểm tra readiness của hệ thống | `.gemini/skills/skills/SKILL.md` |

---

## 🛠 HƯỚNG DẪN SỬ DỤNG LỆNH `/skills` TRÊN AGY CLI

### 1. Xem danh sách & Trạng thái Skills
Gõ lệnh `/skills` hoặc `/skills status` để hiển thị ma trận trạng thái của các skill và tiến độ triển khai Roadmap.

### 2. Kích hoạt Skill Chuyên biệt
Người dùng hoặc Orchestrator có thể gọi trực tiếp từng Skill theo cú pháp:
- **Kích hoạt Master Orchestrator**: Tham chiếu `@master-orchestrator` hoặc yêu cầu "Chạy skill master-orchestrator để lập kế hoạch".
- **Kích hoạt Security Architect**: Tham chiếu `@security-architect` hoặc yêu cầu "Kiểm tra bảo mật chuẩn OWASP".
- **Kích hoạt Anti-AI UI Dev**: Tham chiếu `@anti-ai-ui-developer` hoặc yêu cầu "Tạo giao diện Landing Page chuẩn UX".
- **Kích hoạt QA & Circuit Breaker**: Tham chiếu `@qa-circuit-breaker` hoặc yêu cầu "Chạy Mock Server và test hệ thống".

---

## ⚙️ CƠ CHẾ NGUYÊN TẮC HOẠT ĐỘNG KHÔNG DỪNG (NON-STOP WORKFLOW PROTOCOL)

1. **Auto-Load Context**: Khi lệnh `/skills` được gọi, AGY CLI tự động load toàn bộ quy trình từ `roadmap.md` và `.gemini/skills/`.
2. **Gated Stage Enforcement**: Đảm bảo hoàn thành Definition of Done (DoD) của từng giai đoạn trước khi chuyển tiếp.
3. **Circuit Breaker Protection**: Nếu thiếu thông số môi trường (.env) hoặc gặp lỗi quá 2 retries, Circuit Breaker lập tức ngắt mạch an toàn và thông báo `WAITING_HUMAN_INPUT`.
