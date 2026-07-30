# Checklist QA và phát hành

Checklist này chỉ chứa các kiểm tra còn dùng cho mỗi lần merge/release. Trạng
thái dự án và backlog nằm tại [`PROJECT_STATUS.md`](./PROJECT_STATUS.md).

## 0. Bằng chứng tự động gần nhất (2026-07-31)

- [x] `npm run qa:a11y`: axe WCAG AA, dialog/focus trap/restore và zoom 200% đạt.
- [x] `npm run qa:security`: security contract đạt; SAST quét 84 file, 0 finding.
- [x] `npm run qa:docker`: integration đạt, 555 SAST signatures và webhook correlation đạt.
- [x] `npm run qa:sast` và `npm run qa:ui:mac`: đạt trên stack QA cô lập.
- [x] Cả hai lệnh `npm audit` ở threshold High: 0 vulnerability.
- [x] Image `lunar:production-readiness-qa-20260731`: Docker Scout báo `0C/0H/0M/0L`.
- [x] Compose QA dùng `--env-file /dev/null`, app/db healthy, runtime non-root/read-only.
- [ ] Đây chưa phải production sign-off; các mục browser/screen reader/provider/ops thủ công bên dưới vẫn bắt buộc.

## 1. Điều kiện trước test

- [ ] Checkout sạch, không dùng `.env` cá nhân làm fixture.
- [ ] PostgreSQL disposable được dựng và migration chạy từ database rỗng.
- [ ] Có seed user Guest/Free/Pro/Enterprise/Admin và repo GitHub sandbox.
- [ ] Provider ngoài dùng sandbox hoặc mock contract được kiểm soát.
- [ ] Secret test chỉ inject qua CI secret; không in vào log.
- [ ] `AUTH_EMAIL_ALLOW_INSECURE_BASE_URL=false` ở mọi môi trường ngoài dry-run QA cục bộ.
- [ ] Chạy trên ít nhất Chrome, Firefox, Safari/WebKit và mobile viewport.

## 2. Build, dependency và startup

- [ ] `npm ci` thành công.
- [ ] `npm run build` thành công.
- [ ] `npm audit --omit=dev` không có High/Critical chưa xử lý.
- [ ] Server fail-fast khi production thiếu JWT/encryption secret bắt buộc.
- [ ] Thiếu payment beneficiary/webhook secret không làm app ngừng chạy; API payment tương ứng trả `503`.
- [ ] `/api/v1/health` trả 200 khi process sống.
- [ ] `/api/v1/ready` trả 503 khi DB mất và 200 sau reconnect/restart theo thiết kế.
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
- [ ] GitHub OAuth kiểm tra state, callback error và replay.

## 4. Authorization/IDOR

- [ ] Guest không gọi scan verified, admin hoặc deep scan.
- [ ] USER không gọi mọi admin endpoint.
- [ ] User A không xem payment/project/scan/report/GitHub của user B.
- [ ] Suspended user không tiếp tục dùng JWT cũ.
- [ ] Policy CRUD tuân owner/org/role sau khi triển khai.
- [ ] Report export chỉ đọc scan server-authoritative thuộc user.

## 5. Scan/SAST/AI

- [ ] Code rỗng, whitespace, > limit, filename dài/sai type.
- [ ] Fixture SQLi/XSS/RCE/secret/JWT phát hiện đúng và không quá nhiều false positive.
- [ ] Import/path tĩnh, chuỗi mô tả, regex rule và JSX text không bị báo như mã thực thi.
- [ ] Source production tự quét không còn critical/high; test/fixture được thống kê là excluded.
- [ ] Guest result không lộ line/snippet/patch.
- [ ] Quota Free đạt ngưỡng, reset ngày, renew, gửi lặp và concurrent requests.
- [ ] Hai request scan đồng thời không vượt quota.
- [ ] DB lỗi giữa transaction không để project/scan/finding mồ côi.
- [ ] AI provider unavailable trả 503, không fabricated fallback.
- [ ] AI malformed/timeout/rate-limit xử lý an toàn và không trừ quota sai.
- [ ] Prompt injection trong source được coi là data.
- [ ] Guest assistant không gọi AI ngoài hoặc lưu history phía server.
- [ ] Assistant history tách theo user; prompt injection không làm lộ secret.
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

## 8. Admin/dashboard

- [ ] Admin search/filter/sort/pagination với 0, 1 và >100 users/payments.
- [ ] Admin không đổi role/status chính mình trái policy.
- [ ] Mọi admin mutation bắt buộc reason và ghi before/after audit.
- [ ] Dashboard loading/empty/error không dùng fake data.
- [ ] Realtime/polling reconnect, duplicate event và multi-tab.

## 9. Report/export

- [ ] PDF dùng dữ liệu server-authoritative, UTF-8 tiếng Việt đúng.
- [ ] PDF có rule/CWE/CVSS/file/dòng/evidence/remediation, phân trang không cắt nội dung.
- [ ] Password, token, API key và Bearer credential trong evidence được che trước khi xuất.
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
- [ ] Log có correlation ID xuyên proxy/app/provider/webhook/audit record.
- [ ] Direct client correlation ID bị thay thế; chỉ trusted proxy được chuyển ID hợp lệ.
- [ ] Password/token/cookie/API key/payment/PII/body/payload bị redact trong log JSON.
- [ ] Central log retention, encryption, access control và append-only audit đã cấu hình theo policy.

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

## 12. Regression command gate

- [ ] `npm run build`
- [ ] `npm run qa:docker`
- [ ] `npm run qa:security`
- [ ] `npm run qa:sast`
- [ ] `npm run qa:a11y`
- [ ] `npm run qa:ui:mac`
- [ ] `npm audit --audit-level=high`
- [ ] `npm audit --omit=dev --audit-level=high`
- [ ] `docker compose --env-file /dev/null -p <qa-project> up -d --no-build` và cả app/db đều healthy.
- [ ] Docker Scout không còn Critical/High trong image runtime phát hành.

- [ ] Unit: scanner, token, crypto, validation, serializers.
- [ ] API integration: auth, RBAC, payment, scan, admin, report.
- [ ] Contract: GitHub/AI provider.
- [ ] E2E: register → verify → scan → report; payment sandbox; GitHub PR sandbox.
- [ ] Security: webhook spoof/replay, IDOR matrix, XSS payload, rate limit.
- [ ] Visual/accessibility: responsive screenshots + axe.
- [ ] GitHub Actions `QA Gate` thành công trước production deployment.
