# Stage 00 — Idea

## Gate — check ALL before `/flow next`
- [x] The pitch below is 3 sentences, no more
- [x] I can name at least ONE real person/group who has this pain (named below)
- [x] No FILL placeholders remain in this file

## Pitch (3 sentences: who, pain, what you'd build)

Người dùng Lunar trên domain production chuẩn và người vận hành dự án cần các lời gọi `/api/v1/*` luôn đến Express API và trả phản hồi JSON có thể chẩn đoán.
Hiện một báo cáo cho thấy gateway/WAF từng trả HTML HTTP 403 trước ứng dụng, trong khi production đang khỏe và preview cũ lại trả 404, khiến nguyên nhân dễ bị gán nhầm cho CORS hoặc WAF mà thiếu request ID.
Ta sẽ củng cố cấu hình route serverless, thêm regression và live smoke có request ID để mọi lỗi edge khác JSON được phát hiện, phân loại và tái hiện mà không hạ firewall.

## One real person/group with this pain

Thanh Luan (chủ repository/deployment Lunar) và người dùng Lunar đã gặp báo cáo HTTP 403 không phải JSON trong chính phiên debug này.
