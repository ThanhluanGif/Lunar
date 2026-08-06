# Stage 00 — Idea

## Gate — check ALL before `/flow next`
- [x] The pitch below is 3 sentences, no more
- [x] I can name at least ONE real person/group who has this pain (named below)
- [x] No FILL placeholders remain in this file

## Pitch (3 sentences: who / pain / what)

Thanh Luan và người dùng Lunar cần đăng nhập GitHub thật sự hoàn tất và cần biết kết quả quét bảo mật đáng tin đến mức nào.
Production hiện chỉ chứng minh OAuth bắt đầu được, chưa chứng minh callback/session/repository sync, còn guest scan đã bỏ sót command injection và trả điểm 100.
Ta sẽ xây một cổng xác minh có bằng chứng live cho OAuth và benchmark có ground truth cho deterministic SAST lẫn AI review trước khi quyết định sửa gì.

## One real person/group with this pain

Thanh Luan — chủ repository và production deployment Lunar — cùng nhóm người dùng thử Lunar qua
GitHub Issues, là những người phải quyết định có thể tin luồng đăng nhập và scan hay chưa.
