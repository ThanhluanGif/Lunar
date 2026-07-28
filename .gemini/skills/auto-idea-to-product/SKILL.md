---
name: auto-idea-to-product
description: UNIVERSAL PROACTIVE AI CARD SKILL: Tự động chuyển đổi Prompt Terminal/Gemini thành Thẻ Task, AI tự đọc Thẻ & chạy tự động cho người dùng lười đọc, AI chủ động đề xuất Thẻ phát triển tiếp theo khi hết idea, NÉN THẺ PHÂN CẤP (10 Thẻ Lẻ -> 1 File Milestone -> 1 Báo Cáo Tổng To), và TỰ ĐỘNG VẼ ĐỒ THỊ CẤU TRÚC DỰ ÁN TRÊN DOCS/ARCHITECTURE.HTML.
---

# AUTO IDEA TO PRODUCT (PROACTIVE CARD & GRAPH VISUALIZER ENGINE)

> **Mục tiêu**: Hệ thống Skill tự động hóa 100%. Áp dụng Quy chế Nén Thẻ Phân Cấp (10-in-1 Compaction) và Tự động vẽ Đồ thị Kiến trúc Cấu trúc Dự án trên file `docs/architecture.html` (để tránh làm hỏng file `index.html` của ứng dụng React/Vite).

## 🎨 TỰ ĐỘNG VẼ ĐỒ THỊ CẤU TRÚC DỰ ÁN (`docs/architecture.html`)

Hệ thống luôn tự động tạo và cập nhật file **`docs/architecture.html`** để trực quan hóa:
1. **Sơ đồ Kiến trúc C4 Model**: Thể hiện các luồng tương tác giữa Prompt -> Card Manager -> Compaction Engine -> Subagents -> Execution.
2. **Sơ đồ Luồng Nén Thẻ Phân Cấp (Hierarchical Compaction Flowchart)**: Trực quan hóa tiến trình nén 10 Thẻ Lẻ -> 1 File Milestone (`data/milestones/`) -> 1 Báo Cáo Tổng To (`data/reports/`).
3. **Bảng Theo Dõi Trạng Thái Thẻ Thời Gian Thực**: Mermaid.js & HTML Table cập nhật tiến độ công việc minh bạch.

---

## 🗂 QUY CHẾ NÉN THẺ PHÂN CẤP (HIERARCHICAL CARD COMPACTION)

```mermaid
graph TD
    RawCards["Tầng 0: 10 Thẻ Lẻ (CARD-001 ... CARD-010 trong cards.json)"] -->|Nén tự động khi đủ 10 thẻ| MilestoneFile["Tầng 1: 1 File Milestone (data/milestones/MILESTONE-001.json)"]
    MilestoneFile -->|Nén tự động khi đủ 10 Milestones| MasterReport["Tầng 2: 1 Báo Cáo Tổng To (data/reports/MASTER_EXECUTIVE_REPORT_001.md)"]
```

1. **Tầng 0: Thẻ Lẻ (`cards.json`)**: Chỉ giữ lại tối đa < 10 thẻ active.
2. **Tầng 1: File Milestone (`data/milestones/MILESTONE-xxx.json`)**: 10 Thẻ Lẻ -> 1 File Milestone.
3. **Tầng 2: Báo Cáo Tổng To (`data/reports/MASTER_EXECUTIVE_REPORT_xxx.md`)**: 10 File Milestone (100 Thẻ) -> 1 Trang Báo Cáo Tổng To.
