# Production Readiness Checklist

Ngày đánh giá: 2026-07-31

## Security gate

- [x] 47 finding được đối soát: 4 Critical, 33 High, 9 Medium, 1 Low; max CVSS 9.8.
- [x] 5 True Positive có patch, regression test và rescan xác nhận.
- [x] 41 False Positive có source/sink/control evidence; không tắt rule.
- [ ] Shared rate-limit store cho multi-instance. Hiện startup fail closed nếu instance count >1.
- [x] Không còn admin seed/default password hoặc credential logging trong runtime source.
- [x] Compose bắt buộc database password; `.env`/key/cert/credential artifact nằm trong `.gitignore`.
- [x] Runtime secret helper hỗ trợ `*_FILE`; production fail closed với JWT/DB secret thiếu hoặc yếu.
- [x] Cookie HttpOnly; Secure production; SameSite policy hợp lệ; clearCookie đồng nhất.
- [x] Auth IP + normalized email/nickname throttling; Retry-After và reset window được test.
- [x] Admin router có server-side role guard; owner-scoped report/payment/assistant/GitHub queries được kiểm tra.
- [x] Payment/GitHub webhook dùng raw-body signature và idempotency/freshness phù hợp.
- [x] Structured logging redacts auth, cookie, password, token, email, phone, API key và card-like data.

## Auto-Patch

- [x] Unavailable contract dùng `after:null`, `unifiedDiff:null`, `reasonUnavailable`.
- [x] AI/legacy patch không thể bật Apply nếu thiếu validated metadata.
- [x] AFTER/unified diff bị ẩn khi unavailable; không còn placeholder `// Chưa có patch code`.
- [x] Counter “Đã vá” chỉ đếm `verified`.
- [x] Virtual project apply có path/symlink/conflict/backup/rollback/rescan contract.
- [x] Authorization/IDOR bị loại khỏi bulk apply nếu thiếu policy evidence.
- [ ] Persistent filesystem patch writer chưa được triển khai; không được trả `available:true` cho local disk cho tới khi có realpath/atomic write sandbox.

## Build và validation

- [ ] `npm run lint`: không có script.
- [ ] `npm run typecheck`: không có script.
- [ ] `npm test`: không có script.
- [x] `npm run qa:security`: PASS, SAST 93 files, 0 findings.
- [x] `npm run build`: PASS.
- [x] `npm audit --omit=dev --audit-level=high`: PASS, 0 vulnerabilities.
- [x] `docker compose config -q` với QA-only overrides: PASS.
- [x] `docker build -t lunar:security-qa-fixed .`: PASS.
- [x] Isolated Docker smoke ở ports 5650/5651: health, ready và frontend root PASS.
- [x] Full QA smoke với isolated PostgreSQL: PASS sau khi cập nhật Auto-Patch response contract.
- [x] Browser auth lifecycle: register → logout → session 401 → login lại bằng nickname; 0 failed fetch.
- [x] Production routing browser: split-origin API/CORS/GitHub config PASS, 0 provider call.
- [x] Automated axe/WCAG AA, dialog focus trap và effective zoom 200%: PASS trên Google Chrome.
- [x] Container runtime: user `node`, read-only root filesystem, `cap_drop: ALL`.
- [ ] Safari thật, screen reader thật và production domain OAuth callback chưa được kiểm thử; không tuyên bố pass.

## Deployment configuration

- [ ] Rotate mọi credential đã xuất hiện trong local `.env`, terminal output trước đó hoặc lịch sử git; không tái sử dụng QA value.
- [ ] Set strong `LUNAR_JWT_SECRET` và `LUNAR_POSTGRES_PASSWORD` bằng secret manager/file secret.
- [ ] Set exact HTTPS `PUBLIC_APP_URL`, `CORS_ORIGINS`, GitHub callback và `COOKIE_SECURE=true`.
- [ ] Chọn `COOKIE_SAME_SITE`; nếu `none` thì bắt buộc Secure và exact CORS origins.
- [ ] Cấu hình trusted proxy theo hop/subnet thực tế; không dùng blanket trust cho Internet-facing app.
- [ ] Cấu hình payment/GitHub webhook secret riêng, beneficiary fields và provider callback allowlist.
- [ ] Xóa `ADMIN_BOOTSTRAP_TOKEN` ngay sau bootstrap đầu tiên; xác nhận audit event.
- [ ] Không scale trên một instance cho tới khi có shared rate-limit store.
- [ ] Xác nhận backup/restore PostgreSQL, retention audit log và incident rotation runbook.

## Release decision

**Code security gate: PASS. Production release: CONDITIONAL / NOT YET APPROVED.**

Blocker còn lại cần con người/hạ tầng: credential rotation, production OAuth/domain/cookie configuration, shared rate-limit store nếu scale-out, và kiểm thử browser/accessibility thật. Không có deploy production trong nhiệm vụ này.
