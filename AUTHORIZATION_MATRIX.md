# Authorization Matrix

Ma trận này mô tả enforcement phía server. UI ẩn/hiện tab không được coi là security boundary.

| Router / endpoint | Anonymous | Authenticated owner | Non-owner / tenant khác | ADMIN | Control và resource-not-found |
|---|---|---|---|---|---|
| `POST /auth/register` | Cho phép, IP+identifier limit | N/A | N/A | Như anonymous | Không nhận role/tier từ client; duplicate trả lỗi generic. |
| `POST /auth/login` | Cho phép, IP+email/nickname limit | N/A | N/A | N/A | Email/nickname chuẩn hóa; lỗi credential generic; suspended chỉ lộ sau mật khẩu đúng. |
| `POST /auth/logout` | Cho phép idempotent | Cho phép | N/A | Cho phép | Clear cookie cùng policy; frontend xóa local identity kể cả API tạm mất kết nối. |
| `POST /auth/bootstrap-admin` | 401 | Chỉ actor có one-time token và khi chưa có ADMIN | 403/409 | 409 nếu đã có ADMIN | Transaction + advisory lock + audit; không seed/default password. |
| `GET /auth/me` | 401 | Chỉ actor | 404 | Chỉ actor | DB identity/auth version authoritative. |
| forgot/reset/verify email | Cho phép có limiter | Cho phép | Không tiết lộ account | Cho phép như user | Token hash, expiry, one-time; generic response. |
| `POST /auth/resend-verification` | 401 | Chỉ actor | 404 | Chỉ actor | `verifyToken`, recovery limiter. |
| `PATCH /auth/account` | 401 | Cho phép actor | Không có target ID | Cho phép actor | `WHERE id=req.user.id`; field allowlist. |
| `POST /auth/change-password` | 401 | Cho phép actor | Không có target ID | Cho phép actor | Verify current password; increment auth version. |
| `GET /auth/scan-history` | 401 | Chỉ actor | 404/empty | Chỉ actor | Query `user_id=req.user.id`, limit clamp. |
| `GET /auth/github/config` | Cho phép | Cho phép | N/A | Cho phép | Chỉ public configuration, không trả secret. |
| `GET /auth/github/start` | Cho phép có limiter | Cho phép | N/A | Cho phép | OAuth state, expiry, redirect allowlist/registered callback. |
| device start/poll/callback | Flow-specific | Actor hoặc state-bound flow | Không link email chưa verify | Cho phép | State/expiry, verified GitHub email, account-link guard. |
| GitHub status/repositories/sync/disconnect | 401 | Chỉ connection của actor | 404/không match | Chỉ connection của actor | Queries ràng buộc `user_id=req.user.id`; token encrypted. |
| `POST /github/pull-requests` | 401 | Owner + ENTERPRISE | 404 | ADMIN không tự bypass ownership nếu không có project/connection | Owned project/connection, path validation, blob SHA/content conflict. |
| `POST /github/webhook` | Chỉ request ký hợp lệ | N/A | N/A | N/A | HMAC raw body + delivery idempotency; không dùng session auth. |
| `POST /scans/run` | 401 | Actor trong quota | 401/không có owner override | Theo tier/quota của actor | Persist `user_id=req.user.id`; file/input bounds. |
| `POST /scans/guest-preview` | Cho phép có quota IP | N/A | N/A | Cho phép như guest nếu không auth | Chỉ trả aggregate, không line/code/patch. |
| deep-scan capabilities/repository | 401 | Actor có GitHub connection/repository | 409/404 | Không bypass ownership mặc định | Owner-scoped connection/project, tier/quota, bounded fetch. |
| report export/PDF/CSV | 401 | Chỉ scan owner | 404 | Không có global-admin bypass | `WHERE scan.id=$1 AND scan.user_id=$actor`; tránh disclosure. |
| policy list | Cho phép | Cho phép | Cho phép | Cho phép | Read-only public policy metadata. |
| policy create/toggle | 401 | 403 | 403 | Cho phép | Inline `verifyToken + requireRole('ADMIN')`. |
| payment plans | Cho phép | Cho phép | Cho phép | Cho phép | Catalog server-side, read-only. |
| payment create order | 401 | Actor | Không thể đặt cho user khác | Actor ADMIN vẫn dùng identity của mình | Ignore client amount/userId/price; tier from allowlisted catalog. |
| payment status | 401 | Owner | 404 | Cho phép capability ADMIN | SQL owner-or-admin, memory fallback rechecks owner. |
| payment webhook | Chỉ signature hợp lệ | N/A | N/A | N/A | HMAC raw body, freshness, replay/idempotency, amount match. |
| payment subscription | 401 | Actor | Không có target ID | Actor | Identity từ token. |
| dashboard access | Guest summary | Actor summary | Không có target ID | Actor summary | `optionalToken`, không tải dữ liệu owner khác. |
| dashboard overview | 401 | Actor | 404/empty | Actor | Queries owner-scoped. |
| AI review/audit/simulation/providers | 401 | Actor trong quota | Không có target owner ID | Actor trong quota | `verifyToken`, limiter, DB usage quota, bounded input; patch AI unavailable. |
| assistant status/chat | Guest native không persistence | Actor, history owner-scoped | Không đọc history khác | Actor | `optionalToken`; authenticated persistence binds user ID. |
| assistant history/delete | 401 | Owner | 404/không match | Không global bypass | Conversation query/delete includes actor ID. |
| public stats/reviews | Cho phép | Cho phép | N/A | Cho phép | Read-only hoặc optional identity; input allowlist. |
| security health-check | Cho phép | Cho phép | N/A | Cho phép | Không chứa secret. |
| security audit-log | 401 | 403 | 403 | Cho phép | Inline ADMIN guard. |
| mọi `/admin/*` gồm analytics | 401 | 403 | 403 | Cho phép | Router-level `verifyToken, requireRole('ADMIN')`; mutation cần reason, allowlist, transaction, audit; missing resource 404. |

## Capability gap

Hệ thống hiện chỉ có role `USER`/`ADMIN`; chưa có capability nhỏ hơn như `ADMIN_READ_ANALYTICS`, `ADMIN_MANAGE_USERS` hoặc tenant-admin. Vì vậy trường hợp “ADMIN không đủ capability” chưa thể biểu diễn trong data model. Production chỉ được coi sẵn sàng với mô hình all-or-nothing ADMIN hiện tại; nếu sản phẩm cần delegated admin hoặc multi-tenant admin, phải bổ sung schema, policy middleware và test trước khi bật.
