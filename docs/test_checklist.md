# Checklist kiểm thử lại sau sửa

## 1. Điều kiện trước test

- [ ] Checkout sạch, không dùng `.env` cá nhân làm fixture.
- [ ] PostgreSQL disposable được dựng và migration chạy từ database rỗng.
- [ ] Có seed user Guest/Free/Pro/Enterprise/Admin và repo GitHub sandbox.
- [ ] Provider ngoài dùng sandbox hoặc mock contract được kiểm soát.
- [ ] Secret test chỉ inject qua CI secret; không in vào log.
- [ ] Chạy trên ít nhất Chrome, Firefox, Safari/WebKit và mobile viewport.

## 2. Build, dependency và startup

- [ ] `npm ci` thành công.
- [ ] `npm run build` thành công.
- [ ] `npm audit --omit=dev` không có High/Critical chưa xử lý.
- [ ] Server fail-fast khi production thiếu JWT/payment/encryption secrets.
- [ ] `/health` trả 200 khi process sống.
- [ ] `/ready` trả 503 khi DB mất và 200 sau reconnect/restart theo thiết kế.
- [ ] Static app và 404 route hoạt động.

## 3. Authentication

- [ ] Register hợp lệ tạo USER/FREE bất kể client gửi role/tier khác.
- [ ] Email/nickname trùng trả lỗi ổn định, không tạo record một phần.
- [ ] Email sai format, password ngắn/dài/yếu, field rỗng bị từ chối.
- [ ] Login đúng/sai/unknown account không làm lộ enumeration quá mức.
- [ ] Brute-force đạt rate limit; headers retry đúng.
- [ ] Logout xóa cookie và session không dùng lại được.
- [ ] JWT hết hạn, sai chữ ký, auth_version cũ, user bị xóa/suspend đều bị chặn.
- [ ] Forgot-password luôn trả response trung tính.
- [ ] Reset/verify token hết hạn, sai, đã dùng, gửi lặp bị từ chối.
- [ ] Đổi password vô hiệu hóa session cũ trên các thiết bị theo policy.
- [ ] GitHub OAuth/Gmail OAuth kiểm tra state, callback error và replay.

## 4. Authorization/IDOR

- [ ] Guest không gọi scan verified, admin, notification, deep scan.
- [ ] USER không gọi mọi admin endpoint.
- [ ] User A không xem payment/project/scan/report/GitHub/Gmail của user B.
- [ ] Suspended user không tiếp tục dùng JWT cũ.
- [ ] Policy CRUD tuân owner/org/role sau khi triển khai.
- [ ] Report export chỉ đọc scan server-authoritative thuộc user.

## 5. Scan/SAST/AI

- [ ] Code rỗng, whitespace, > limit, filename dài/sai type.
- [ ] Fixture SQLi/XSS/RCE/secret/JWT phát hiện đúng và không quá nhiều false positive.
- [ ] Guest result không lộ line/snippet/patch.
- [ ] Quota Free đạt ngưỡng, reset ngày, renew, gửi lặp và concurrent requests.
- [ ] Hai request scan đồng thời không vượt quota.
- [ ] DB lỗi giữa transaction không để project/scan/finding mồ côi.
- [ ] AI provider unavailable trả 503, không fabricated fallback.
- [ ] AI malformed/timeout/rate-limit xử lý an toàn và không trừ quota sai.
- [ ] Prompt injection trong source được coi là data.
- [ ] Deep scan vượt file/byte/total/concurrency limit bị chặn.
- [ ] Repo private/public, branch rỗng, binary, symlink/submodule và file lỗi encoding.

## 6. Repair và GitHub

- [ ] Apply patch preview không sửa nhầm file/finding.
- [ ] Patch conflict/stale SHA được phát hiện.
- [ ] Create PR tạo branch/commit/PR thật trên repo sandbox.
- [ ] Retry không tạo PR trùng.
- [ ] Token thiếu scope/revoked/rate-limited hiển thị lỗi hữu ích.
- [ ] Webhook thiếu/sai signature trả 401.
- [ ] Delivery replay không scan/post comment hai lần.
- [ ] Unsupported event/action được bỏ qua có log.
- [ ] Payload lớn và repository không được cấp quyền bị từ chối.

## 7. Payment/billing

- [ ] Production `/payment/mock-webhook` trả 404.
- [ ] Không có payment/JWT/encryption default secret production.
- [ ] Giá/currency/plan quyền lợi giống nhau giữa catalog, UI, order và admin.
- [ ] Invalid plan/payment method/amount bị từ chối.
- [ ] Order code unique dưới tải đồng thời.
- [ ] User A không đọc order user B.
- [ ] Webhook thiếu/sai signature, sai amount/order/status bị từ chối.
- [ ] Webhook hợp lệ cấp đúng tier và ghi subscription/event atomically.
- [ ] Retry cùng event id idempotent.
- [ ] Cùng provider transaction cho order khác bị từ chối.
- [ ] Hai webhook đồng thời không tạo subscription/tier update trùng.
- [ ] DB mất giữa webhook rollback toàn bộ.
- [ ] Order expired không thể được UI xác nhận sai.

## 8. Community/admin/dashboard

- [ ] Community create validation: rỗng, quá dài, invalid severity/repo.
- [ ] Upvote gửi lặp và concurrent chỉ tính một.
- [ ] Edit/delete/comment/moderation kiểm tra ownership/RBAC.
- [ ] Leaderboard pagination/sort ổn định khi dữ liệu rỗng/lớn.
- [ ] Admin search/filter/sort/pagination với 0, 1 và >100 users/payments.
- [ ] Admin không đổi role/status chính mình trái policy.
- [ ] Mọi admin mutation bắt buộc reason và ghi before/after audit.
- [ ] Dashboard loading/empty/error không dùng fake data.
- [ ] Realtime/polling reconnect, duplicate event và multi-tab.

## 9. Notification/report/export

- [ ] Gmail refresh token mã hóa, không xuất hiện API/log/UI.
- [ ] Chỉ scope `gmail.send` theo thiết kế.
- [ ] Recipient bị khóa theo account/policy, không nhận email tùy ý.
- [ ] Gmail timeout/revoked grant cập nhật status và cho reconnect.
- [ ] Email history pagination và redaction.
- [ ] PDF dùng dữ liệu server-authoritative, UTF-8 tiếng Việt đúng.
- [ ] Project/finding chứa `<script>`, HTML, control char không thực thi.
- [ ] CSV chống formula injection (`=`, `+`, `-`, `@`) và encoding đúng.
- [ ] Popup blocked/download failed có error state, không dùng alert thô.

## 10. Database/ops

- [ ] PK/FK/unique/check/index áp dụng trên database mới và database nâng cấp.
- [ ] Migration chạy hai lần an toàn theo policy.
- [ ] Migration failure rollback/forward recovery có tài liệu.
- [ ] Không có orphan project/scan/finding/subscription/token.
- [ ] Cascade delete được xác nhận với account deletion/retention policy.
- [ ] Backup tự động chạy; restore vào môi trường mới pass consistency checks.
- [ ] RPO/RTO đạt tiêu chí sản phẩm.
- [ ] Log có correlation id, redaction và retention.

## 11. Responsive/accessibility

- [ ] Viewport 320, 375, 768, 1024, 1440 không overflow ngang.
- [ ] Zoom 200% vẫn dùng được.
- [ ] Navigation/table/modal dùng được bằng touch.
- [ ] Mọi input có label/name/error association.
- [ ] Mọi icon button có accessible name.
- [ ] Modal có `role=dialog`, `aria-modal`, initial focus, focus trap, Escape và restore focus.
- [ ] Tab order hợp lý; focus visible.
- [ ] Loading/success/error dùng `status`/`alert` đúng.
- [ ] Contrast đạt WCAG AA.
- [ ] Screen reader đọc chart/KPI bằng text alternative.
- [ ] `prefers-reduced-motion` được tôn trọng.

## 12. Regression command gate đề xuất

- [ ] Unit: scanner, token, crypto, validation, serializers.
- [ ] API integration: auth, RBAC, payment, scan, admin, community, report.
- [ ] Contract: GitHub/Gmail/AI provider.
- [ ] E2E: register → verify → scan → report; payment sandbox; GitHub PR sandbox.
- [ ] Security: webhook spoof/replay, IDOR matrix, XSS payload, rate limit.
- [ ] Visual/accessibility: responsive screenshots + axe.
- [ ] CI không merge nếu P0/P1 regression fail.
