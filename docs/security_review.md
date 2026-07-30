# Security review

> Cập nhật triển khai 2026-07-30: SEC-01, SEC-02, SEC-03, SEC-04 và phần
> production-default của SEC-06 đã được xử lý ở mức code. Regression gate mới:
> `npm run qa:security`. GitHub/DB/payment E2E vẫn cần môi trường sandbox thật
> trước khi production sign-off.

## 1. Kết luận

Code hiện có nhiều kiểm soát tốt: bcrypt, HttpOnly cookie, DB-authoritative role/tier, parameterized query, HMAC webhook chính, transaction/idempotency payment, encrypted OAuth token và one-time token hash. Tuy nhiên chưa thể gọi hệ thống là “OWASP ASVS Level 2 compliant”. Có một đường mock payment Critical và hai bề mặt giả/mở (GitHub webhook, report HTML) phải xử lý trước production.

Không có giá trị secret nào được đưa vào báo cáo này. `.env` không được Git track; chỉ `.env.example` được track.

## 2. Phát hiện

| ID | Mức độ | Phát hiện | Bằng chứng | Khuyến nghị |
|---|---|---|---|---|
| SEC-01 | Critical | Mock webhook có thể cấp tier trong production; cấu hình Compose có development default công khai | `paymentRoutes.js:333-400`, `docker-compose.yml` | Không mount/register route ở production; không có secret default; rotate payment secret nếu đã deploy; regression test route = 404 |
| SEC-02 | High | GitHub webhook không verify signature/replay và trả mock result | `githubRoutes.js:9-53` | HMAC SHA-256 timing-safe, delivery id unique, event allowlist, payload limit, fetch diff bằng installation token |
| SEC-03 | High | HTML injection khi export report bằng `document.write` | `AuditReportExportModal.jsx:75-100` | Server-side PDF hoặc safe DOM; escape mọi field; CSP không thay thế output encoding |
| SEC-04 | Medium | Report API anonymous, client-authoritative, không ownership validation | `reportRoutes.js:8-32` | `verifyToken`, load scan bằng user id, validate schema/size, rate limit |
| SEC-05 | Medium | CSP cho phép `'unsafe-inline'` cho script và style | `securityHeaders.js:22-26` | Loại inline script, dùng nonce/hash; style nonce hoặc stylesheet; thêm object-src/base-uri/form-action/frame-ancestors |
| SEC-06 | Medium | Development fallback/default secrets hiện diện trong code/config | `auth.js:16`, `docker-compose.yml` | Fail closed cho mọi production-like deployment; secret manager; startup validation; rotate nếu từng dùng ngoài local |
| SEC-07 | Medium | Policy mutation cho mọi authenticated user, không ownership/RBAC/persistence | `policyRoutes.js:45-77` | Thiết kế tenant ownership, role/tier gate, validation, audit và DB persistence |
| SEC-08 | Medium | In-memory rate limits/quota không dùng shared store | `rateLimiter.js:62-105` | Redis/shared store, trusted proxy config, composite identity; đặc biệt cho multi-instance |
| SEC-09 | Medium | Payment order code dùng `Math.random`, collision làm DB insert fail nhưng route vẫn có thể trả memory success | `paymentRoutes.js:57,90-110` | CSPRNG/UUID, retry unique collision, fail nếu persistence thất bại |
| SEC-10 | Medium | Audit/security log một phần lưu RAM và mất khi restart | `securityAuditRoutes.js`, `policyRoutes.js` | Central append-only log, retention, redaction, alerting và access control |
| SEC-11 | Low | Error logger có thể ghi provider/DB message chi tiết vào server logs | nhiều `console.error/warn` trong routes | Structured logger, correlation id, redact token/email/payload, production verbosity policy |
| SEC-12 | Low | HSTS luôn được gửi cả khi local HTTP | `securityHeaders.js:8` | Chỉ bật khi HTTPS/production đúng; tránh làm local hostname bị pin ngoài ý muốn |

## 3. Kiểm soát tích cực đã xác nhận trong code

| Kiểm soát | Bằng chứng | Đánh giá |
|---|---|---|
| Password hashing bcrypt cost 12 | `authRoutes.js`, `githubAuthRoutes.js` | Tốt |
| JWT HttpOnly cookie | `authRoutes.js:30-36` | Tốt; `Secure` phải bắt buộc production |
| Session invalidation khi đổi password | `auth_version` trong auth middleware/schema | Tốt |
| Account suspended check | `auth.js:86` | Tốt |
| Admin RBAC backend | `adminRoutes.js:6` | Tốt |
| Parameterized PostgreSQL queries | route files dùng `$1...` | Tốt trong phạm vi đã rà |
| Payment HMAC timing-safe | `paymentRoutes.js:13-21` | Tốt cho webhook chính |
| Payment transaction/idempotency | `paymentRoutes.js:205-326`; unique event | Tốt |
| IDOR payment status | user id/role filter | Tốt |
| OAuth state cookies | GitHub/Gmail routes | Tốt |
| OAuth token encryption at rest | GitHub/Gmail services/schema | Tốt nếu key đủ mạnh và được quản lý đúng |
| Reset/verify token chỉ lưu SHA-256 hash | `account_action_tokens` | Tốt |
| Registration không nhận role/tier client | `authRoutes.js`; QA assertion | Tốt |
| CORS allowlist + credentials | `server/index.js:40-51` | Tốt nếu production allowlist hẹp |
| Dependency audit | `npm audit --omit=dev` | 0 known vulnerability tại thời điểm audit |

## 4. Theo nhóm OWASP

### Authentication và session

- Cookie chính dùng SameSite Strict; OAuth callback dùng Lax hợp lý cho redirect.
- Password change tăng auth version, vô hiệu session cũ.
- Chưa kiểm chứng expiry, multi-device và revocation runtime vì DB không chạy.
- Không thấy MFA; chưa coi là thiếu bắt buộc nếu chưa có yêu cầu Enterprise/ASVS chính thức.

### Authorization/IDOR

- Admin route có backend guard tập trung.
- Payment status lọc owner.
- Project scan kiểm tra `project_id` thuộc user.
- Report và policy là ngoại lệ cần sửa.

### Injection/XSS

- SQL dùng parameter binding.
- Global “sanitizer” thực chất chỉ bỏ null byte/prototype keys; đây là normalization, không phải XSS protection.
- Report `document.write` là sink thực tế.
- Mermaid SVG dùng `dangerouslySetInnerHTML`; cần bảo đảm Mermaid strict security mode và diagram source không nhận nội dung tùy ý.

### CSRF

- SameSite cookie giảm đáng kể CSRF.
- OAuth state có triển khai.
- Với cookie Lax sau GitHub OAuth, vẫn nên có Origin/Referer validation hoặc CSRF token cho mutation nhạy cảm để defense-in-depth.

### Secrets

- `.env` không được track.
- Có các default local secret trong code/Compose. Không phải secret bí mật, nhưng nguy hiểm nếu dùng nguyên trạng.
- Nếu cấu hình này từng được deploy ngoài máy local: thu hồi/thay mới JWT, payment webhook và encryption keys liên quan.

### Upload/file handling

- Local file scan diễn ra chủ yếu trong browser, không thấy server lưu binary upload.
- Deep scan giới hạn số file/kích thước/tổng byte và lọc directory.
- Cần kiểm tra zip bomb/path traversal nếu sau này bổ sung archive upload.

## 5. Điều kiện security gate trước production

1. Đóng SEC-01, SEC-02, SEC-03.
2. Loại toàn bộ production default secret và thực hiện startup validation.
3. CI chạy API security regression với PostgreSQL disposable.
4. Report chỉ dùng server-authoritative data và authorization.
5. Threat model cho GitHub App/OAuth, payment gateway và Gmail OAuth.
6. Log redaction, retention, monitoring và incident response runbook.
7. Backup/restore drill và migration rollback evidence.
8. Chỉ tuyên bố ASVS sau khi có checklist control-by-control và evidence.
