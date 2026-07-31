# QA Security Triage Report

Ngày thực hiện: 2026-07-31  
Nhánh: `mac`  
HEAD khảo sát: `418ee43`

## Phạm vi và giới hạn bằng chứng

- Đặc tả bắt buộc: `docs/CODEX_TASK_CARD.md`. Repository không có `AGENTS.md`, `QA_SECURITY_FIX_PROMPT.md` hoặc `docs/CODE_TASK_CARD.md` tại thời điểm khảo sát.
- Đặc tả nêu 47 finding nhưng không kèm raw scanner export, ID gốc hoặc line snapshot. Bảng dưới dùng ID nội bộ ổn định `LUNAR-QA-*`, đối soát đúng 4 Critical, 33 High, 9 Medium, 1 Low và CVSS tối đa 9.8.
- Line number được thay bằng statement/endpoint hiện tại. `server/config/connection.js` trong đặc tả không tồn tại; file runtime thực tế là `server/db/connection.js`. `schema.sql` thực tế là `server/schema.sql`.
- Verdict chỉ được đưa ra sau khi kiểm tra source, sink, middleware kế thừa và exploit path. Finding route được xếp False Positive nếu control server-side hiện hữu trước handler và query ràng buộc actor/owner; không dựa vào UI guard.

## Kết quả đối soát

| Kết quả | Số lượng |
|---|---:|
| True Positive | 5 |
| False Positive | 41 |
| Needs Review | 1 |
| Tổng | 47 |
| Proposed / Applied / Verified | 5 / 5 / 5 |

## Critical — 4

| ID | CWE / CVSS | Vị trí, source → sink, middleware | Exploit scenario và verdict | Sửa, test, trạng thái |
|---|---|---|---|---|
| LUNAR-QA-C01 | CWE-798 / 9.1 | `docker-compose.yml`; source là password default trong manifest cũ, sink là `DATABASE_URL`/`POSTGRES_PASSWORD`; không có middleware vì xảy ra khi deploy. | Người có source dùng credential mặc định để truy cập DB. **True Positive**, đã được loại bỏ trước baseline hiện tại; Compose nay bắt buộc `LUNAR_POSTGRES_PASSWORD`. | Required interpolation + runtime secret helper; `docker compose config -q`; **proposed → applied → verified**. Secret từng dùng phải rotate. |
| LUNAR-QA-C02 | CWE-798 / 9.1 | `server/db/connection.js`; source là literal mật khẩu ADMIN, sink là bcrypt hash rồi `INSERT ... ON CONFLICT DO UPDATE`; chạy trong `initPgDatabase`, không có request middleware. | Mỗi restart tạo/nâng quyền và đặt lại mật khẩu ADMIN biết trước. **True Positive**. | Xóa toàn bộ seed/upsert; giữ bootstrap một lần; security regression + SAST rescan; **proposed → applied → verified**. |
| LUNAR-QA-C03 | CWE-798 / 9.1 | `server/routes/authRoutes.js`; source là literal mật khẩu, sink là fallback `usersDb` với role `ADMIN`; `/login` chỉ có throttling, không làm credential an toàn. | Khi chạy fallback development, attacker đăng nhập bằng credential công khai và nhận JWT ADMIN. **True Positive**. | Fallback bắt đầu rỗng; admin chỉ qua bootstrap có token; auth regression + SAST rescan; **proposed → applied → verified**. |
| LUNAR-QA-C04 | CWE-78 / 9.8 | `server/services/sastEngine.js`; source là regex signature chứa `execSync(`, sink thực tế chỉ là `RegExp.exec`; không có `child_process` trong engine runtime. | Chuỗi payload chỉ được so khớp như dữ liệu, không được truyền tới shell. **False Positive**. | Giữ rule để bảo toàn recall; test `;`, `&&`, `$()`, backtick, newline, option injection, traversal và marker side-effect; **triaged**. |

## High — 33

| ID | CWE / CVSS | Vị trí/endpoint; source → sink; control kế thừa | Verdict và bằng chứng exploit path | Test/trạng thái |
|---|---|---|---|---|
| LUNAR-QA-H01 | CWE-78 / 8.8 | `src/services/securityScannerEngine.js`; regex command signature → `RegExp.exec`, không gọi OS process. | **False Positive**; AST loại string/regex literal, payload không tạo marker. | `scripts/sast-regression.cjs`; triaged. |
| LUNAR-QA-H02 | CWE-862 / 8.1 | `GET /api/v1/admin/overview`; query KPI; kế thừa `router.use(verifyToken, requireRole('ADMIN'))`. | **False Positive**; anonymous 401, USER 403, chỉ ADMIN vào handler. | `security-regression`, `qa-smoke`; triaged. |
| LUNAR-QA-H03 | CWE-862 / 8.1 | `GET /api/v1/admin/users`; filter/pagination → user list; cùng router guard ADMIN. | **False Positive**; không có đường anonymous/non-admin tới query. | Admin RBAC smoke; triaged. |
| LUNAR-QA-H04 | CWE-639 / 8.1 | `PATCH /api/v1/admin/users/:userId`; param ID → transaction update; router ADMIN, field allowlist, reason, audit. | **False Positive**; ID là capability ADMIN, missing ID trả 404, tự hạ role/status bị chặn. | Admin mutation/audit smoke; triaged. |
| LUNAR-QA-H05 | CWE-639 / 8.1 | `POST /api/v1/admin/users/:userId/reset-quota`; param → locked row/update; router ADMIN + audit. | **False Positive**; non-admin dừng trước DB, missing resource 404. | Admin quota smoke; triaged. |
| LUNAR-QA-H06 | CWE-862 / 8.1 | `GET /api/v1/admin/payments`; payment list; router ADMIN. | **False Positive**; dữ liệu toàn hệ thống chỉ sau role guard. | Admin RBAC smoke; triaged. |
| LUNAR-QA-H07 | CWE-639 / 8.1 | `PATCH /api/v1/admin/payments/:orderCode`; order code → locked payment; ADMIN, final-state allowlist, reason/audit. | **False Positive**; USER 403; nonexistent 404; trạng thái final không ghi đè. | Signed payment/admin smoke; triaged. |
| LUNAR-QA-H08 | CWE-862 / 8.1 | `GET /api/v1/admin/audit-log`; audit rows; router ADMIN. | **False Positive**; inherited server-side ADMIN guard. | Admin RBAC smoke; triaged. |
| LUNAR-QA-H09 | CWE-862 / 8.1 | `GET /api/v1/admin/analytics`; query `days` đã allowlist; router ADMIN. | **False Positive**; route mới vẫn nằm sau `router.use` và không nhận tenant/user ID từ client. | Source review + admin guard test; triaged. |
| LUNAR-QA-H10 | CWE-639 / 8.1 | `PATCH /api/v1/auth/account`; body name → `UPDATE users WHERE id=req.user.id`; `verifyToken`. | **False Positive**; client không truyền target user ID. | Owner update smoke; triaged. |
| LUNAR-QA-H11 | CWE-639 / 8.1 | `POST /api/v1/auth/change-password`; password body → current actor row; `verifyToken` + mutation limiter. | **False Positive**; query khóa theo `req.user.id`, auth version vô hiệu session cũ. | Password lifecycle smoke; triaged. |
| LUNAR-QA-H12 | CWE-639 / 8.1 | `GET /api/v1/auth/scan-history`; query limit → scans; `verifyToken`, SQL `WHERE user_id=$actor`. | **False Positive**; đổi ID không có vì endpoint không nhận owner ID. | Owner/non-owner contract; triaged. |
| LUNAR-QA-H13 | CWE-862 / 8.1 | `POST /api/v1/ai/review`; source code → provider/native review; `verifyToken`, AI limiter, quota. | **False Positive**; anonymous dừng 401, quota server-side. | AI fail-closed regression; triaged. |
| LUNAR-QA-H14 | CWE-862 / 8.1 | `POST /api/v1/ai/audit`; cùng handler/guards như review. | **False Positive**; protected before sink. | Security regression; triaged. |
| LUNAR-QA-H15 | CWE-862 / 8.1 | `POST /api/v1/ai/project-attack-simulation`; project files → scanner/provider; `verifyToken`, limiter, quota, input bounds. | **False Positive**; no anonymous provider use; generated patch fail-closed. | QA smoke + Auto-Patch regression; triaged. |
| LUNAR-QA-H16 | CWE-862 / 7.5 | `GET /api/v1/deep-scans/capabilities`; capability metadata; `verifyToken`. | **False Positive**; no sensitive repository data and authenticated route. | QA smoke; triaged. |
| LUNAR-QA-H17 | CWE-639 / 8.1 | `POST /api/v1/deep-scans/repository`; repository name → GitHub connection/project query; `verifyToken`, limiter, owner connection. | **False Positive**; repository must belong to actor; unconnected resource 409/404. | Deep-scan guard smoke; triaged. |
| LUNAR-QA-H18 | CWE-639 / 8.1 | `POST /api/v1/reports/export`; scanId → report query; `verifyToken`, limiter, `s.user_id=$actor`. | **False Positive**; non-owner và missing cùng null/404. | Owner/non-owner/resource-not-found regression; triaged. |
| LUNAR-QA-H19 | CWE-639 / 8.1 | `GET /api/v1/reports/export/pdf/:scanId`; param → PDF; same owner query. | **False Positive**; no cross-owner export. | Anonymous 401 + owner scope test; triaged. |
| LUNAR-QA-H20 | CWE-639 / 8.1 | `GET /api/v1/reports/export/csv/:scanId`; param → CSV; same owner query and CSV neutralization. | **False Positive**; owner bound and formula payload neutralized. | CSV/owner regression; triaged. |
| LUNAR-QA-H21 | CWE-639 / 8.1 | `GET /api/v1/assistant/history`; actor/conversation → DB query; `verifyToken`, owner predicates. | **False Positive**; no userId accepted from client. | Assistant persistence smoke; triaged. |
| LUNAR-QA-H22 | CWE-639 / 8.1 | `DELETE /api/v1/assistant/history/:conversationId`; ID → delete; `verifyToken`, owner predicate. | **False Positive**; another user's conversation does not match. | Assistant delete smoke; triaged. |
| LUNAR-QA-H23 | CWE-639 / 8.1 | `POST /api/v1/github/pull-requests`; repo/path/patch → GitHub API; `verifyToken`, ENTERPRISE, owned project+connection, blob conflict check. | **False Positive**; non-owner cannot obtain connection; changed blob gives 409. | Source review + provider fail-closed; triaged. |
| LUNAR-QA-H24 | CWE-862 / 8.1 | `POST /api/v1/github/webhook`; raw body → durable event; no session auth by design, HMAC signature + delivery idempotency. | **False Positive**; unsigned request 401; adding session auth would break provider webhook model. | GitHub signature regression; triaged. |
| LUNAR-QA-H25 | CWE-639 / 8.1 | `GET /api/v1/auth/github/repositories`; actor → encrypted connection/repositories; `verifyToken`. | **False Positive**; query scopes by `req.user.id`. | Authenticated/anonymous smoke; triaged. |
| LUNAR-QA-H26 | CWE-639 / 8.1 | `POST /api/v1/auth/github/sync`; actor connection → provider sync; `verifyToken`. | **False Positive**; no client userId/installation owner override. | OAuth boundary regression; triaged. |
| LUNAR-QA-H27 | CWE-639 / 8.1 | `POST /api/v1/auth/github/disconnect`; actor → delete connection; `verifyToken`. | **False Positive**; delete is owner-scoped. | Authorization source review; triaged. |
| LUNAR-QA-H28 | CWE-639 / 8.1 | `POST /api/v1/payment/create-order`; client tier/method → order; `verifyToken`, limiter; userId/amount/price from server catalog/actor. | **False Positive**; client-controlled amount/userId ignored. | Plan catalog/payment smoke; triaged. |
| LUNAR-QA-H29 | CWE-639 / 8.1 | `GET /api/v1/payment/status/:orderCode`; code → payment query; `verifyToken`, SQL owner or ADMIN. | **False Positive**; non-owner gets 404; ADMIN capability explicit. | Owner-scope source review; triaged. |
| LUNAR-QA-H30 | CWE-862 / 8.1 | `POST /api/v1/payment/webhook`; raw body → payment/subscription mutation; HMAC, timestamp, replay/idempotency, amount match. | **False Positive**; unsigned/stale/replayed payload cannot mutate. | Signed webhook regression/smoke; triaged. |
| LUNAR-QA-H31 | CWE-639 / 7.5 | `GET /api/v1/payment/subscription`; actor → tier response; `verifyToken`, actor ID only. | **False Positive**; no target identifier from client. | Auth smoke; triaged. |
| LUNAR-QA-H32 | CWE-862 / 8.1 | `POST /api/v1/scans/run`; code → persisted scan; `verifyToken`, scan limiter, quota and actor ID. | **False Positive**; guest path is separate masked preview; verified scan requires actor. | Guest 401 + authenticated QA smoke; triaged. |
| LUNAR-QA-H33 | CWE-862 / 8.1 | `GET /api/v1/security/audit-log`; logs → response; inline `verifyToken`, `requireRole('ADMIN')`. | **False Positive**; anonymous/user cannot reach log sink. | Admin role guard regression; triaged. |

## Medium — 9

| ID | CWE / CVSS | Vị trí, source → sink, control | Verdict | Sửa/test/trạng thái |
|---|---|---|---|---|
| LUNAR-QA-M01 | CWE-614 / 5.4 | `server/routes/authRoutes.js`; JWT → `res.cookie`; options từ `createCookieOptions`. | **False Positive**; HttpOnly luôn bật, Secure production, SameSite/path tập trung; clearCookie dùng cùng options. | Cookie dev/prod/logout regression; triaged. |
| LUNAR-QA-M02 | CWE-614 / 5.4 | `server/routes/githubAuthRoutes.js`; OAuth state → cookie; helper dùng SameSite=Lax, HttpOnly, Secure production. | **False Positive**; callback state/expiry kiểm tra trước exchange. | OAuth cookie regression; triaged. |
| LUNAR-QA-M03 | CWE-307 / 6.5 | `POST /api/v1/auth/login`; username source trước đây không tham gia identifier key; sink bcrypt/DB login; IP limiter vẫn có nhưng distributed attack đổi IP có thể bypass account limiter. | **True Positive**. | Thêm `username`, canonicalize nickname/email, test 6 IP cùng username + Retry-After/reset; **proposed → applied → verified**. |
| LUNAR-QA-M04 | CWE-307 / 6.5 | `POST /api/v1/auth/register`; email/nickname → account create; IP + identifier limiter. | **False Positive**; cả hai limiter chạy trước handler. | Throttle regression; triaged. |
| LUNAR-QA-M05 | CWE-307 / 6.5 | forgot/reset/verify routes; email/token → token service; IP + identifier recovery limiter, generic response. | **False Positive**; enumeration và brute force bị giới hạn, token one-time. | Account lifecycle smoke; triaged. |
| LUNAR-QA-M06 | CWE-307 / 6.5 | `server/middleware/rateLimiter.js`; in-memory store → multi-instance deployment. | **Needs Review**; code fail-closed khi instance count >1, nhưng chưa có shared Redis/store nên scale-out là quyết định hạ tầng. | Giữ một instance hoặc cấp shared store; test fail-closed; lifecycle `triaged`, blocker production scale-out. |
| LUNAR-QA-M07 | CWE-326 / 5.9 | RSA 1024 text chỉ nằm trong scanner regex/self-test fixture; không có runtime key generation/private key frontend. | **False Positive**; non-executable AST ranges và fixture exclusion. | SAST precision regression; triaged. |
| LUNAR-QA-M08 | CWE-352 / 6.5 | state-changing routes dùng cookie; source request Origin → mutation sink; global SameSite + Origin/Referer allowlist trước routers. | **False Positive**; untrusted Origin 403; webhook dùng signature thay session/CSRF. | CSRF origin regression; triaged. |
| LUNAR-QA-M09 | CWE-400 / 5.3 | request body/files → scanners/providers; global 1 MB plus route file/count/total-byte/concurrency limits. | **False Positive**; oversized body 413, deep scan bounded. | Payload/deep-scan regression; triaged. |

## Low — 1

| ID | CWE / CVSS | Vị trí, source → sink | Verdict | Sửa/test/trạng thái |
|---|---|---|---|---|
| LUNAR-QA-L01 | CWE-200 / 3.7 | `server/db/connection.js`; literal admin email/password → `writeSystemLog`. | **True Positive**; credential bị lộ cho log collector/operator. | Xóa seed và log chứa credential; redaction + repository rescan; **proposed → applied → verified**. |

## False Positive evidence chung

- CWE-78/CWE-326: `scripts/sast-regression.cjs` đưa đầy đủ payload command vào scanner, kiểm tra marker không được tạo; `scripts/sast-self-audit.cjs` bỏ qua test/fixture và AST non-executable ranges nhưng không tắt rule.
- CWE-862: admin routes có router-level guard tại đầu router; các route khác có inline `verifyToken`, role/tier hoặc webhook signature trước handler.
- CWE-639: report, payment, assistant, GitHub, dashboard và scan queries dùng `req.user.id` hoặc capability ADMIN; non-owner/missing resource dùng 404 khi phù hợp.
- CWE-614/CWE-307: cookie helper và rate limiter được test ở development/production, reset window, Retry-After, username và raw forwarding-header spoofing.

## Finding còn lại

- `LUNAR-QA-M06` không phải exploit đang mở ở cấu hình một instance: startup chủ động fail closed nếu cấu hình nhiều instance. Production muốn scale-out phải chọn và vận hành shared rate-limit store; đây là blocker hạ tầng, không được che bằng cách tắt validation.
