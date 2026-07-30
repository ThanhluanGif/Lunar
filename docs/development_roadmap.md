# Roadmap phát triển sau QC

## Tiến độ triển khai 2026-07-30

### Đã triển khai và có regression/build evidence

- `SEC-001`: production không đăng ký mock payment route; Docker không còn JWT/payment secret mặc định.
- `BILL-001`, `BILL-002`: catalog giá/quota server-authoritative; Pricing UI và order dùng chung catalog.
- `GH-001`: GitHub webhook bắt buộc HMAC SHA-256, delivery id và receipt PostgreSQL chống replay.
- `REP-001`: report bắt buộc auth, scan ownership và dữ liệu server-authoritative.
- `REP-002`: download PDF thật; đã loại `document.write` và dữ liệu HTML không tin cậy.
- `QUOTA-001`: UI gọi backend; renewal và Karma update chạy trong transaction, chỉ một lần/ngày.
- `ERR-001` phần frontend: đã có application Error Boundary.
- `DASH-001` phần mock cleanup: đã loại repository/review/source giả khỏi dashboard/admin operational flow.
- `QA-003` bước đầu: `npm run qa:security` kiểm tra production mock route, plan catalog, webhook signature và report auth.

### Đã có code nhưng cần E2E với dịch vụ thật

- `GH-003`: tạo branch/commit/PR bằng GitHub API, kiểm tra tier, repository ownership, Blob SHA và stale content. Chưa nghiệm thu vì không có OAuth token/repository sandbox có quyền ghi.
- `REP-002` Gmail: email report yêu cầu verified scan trong production; chưa gửi qua Gmail thật vì thiếu OAuth credential.
- Schema mới cho GitHub delivery receipt và quota renewal cần chạy trên PostgreSQL thật.

### Chưa triển khai

- `GH-002`, migration framework/backup restore, persistent policy engine, community moderation, CSV export, queue worker và full accessibility focus management.
- Full `npm run qa` vẫn bị chặn tại readiness do PostgreSQL local `127.0.0.1:5433` không chạy. CI đã được bổ sung security gate và vốn có PostgreSQL service.

## Nguyên tắc ưu tiên

- P0: chặn production/revenue/security.
- P1: hoàn thiện chức năng cốt lõi và khả năng kiểm thử/vận hành.
- P2: cải thiện sản phẩm, UX, accessibility.
- P3: scale và tính năng mở rộng.
- Ước lượng là engineering time cho một coding agent, chưa gồm chờ credential/review.

## Roadmap task

| Task ID | Công việc | Lý do | Ưu tiên | File/module | Phụ thuộc | Ước lượng | Điều kiện hoàn thành |
|---|---|---|---|---|---|---|---|
| SEC-001 | Loại mock payment route khỏi production và secret default | Chặn nâng tier trái phép | P0 | payment routes, Compose | Không | 0.5-1 ngày | Production trả 404; signed webhook vẫn pass; secret rotation documented |
| BILL-001 | Tạo server-side plan catalog | Giá/quota/entitlement đang lệch | P0 | payment API, config/DB | Không | 1 ngày | API catalog là nguồn duy nhất, schema validation có test |
| BILL-002 | Refactor Pricing UI dùng catalog | Tránh thu sai giá | P0 | PricingModal, lunarApi | BILL-001 | 1 ngày | UI/QR/order cùng giá và currency; loading/error/expired |
| GH-001 | Khóa GitHub webhook bằng signature + replay guard | Endpoint giả/mở | P0 | githubRoutes, schema/config | Không | 1-2 ngày | Invalid signature 401; duplicate delivery idempotent |
| GH-002 | Thay mock webhook review bằng scan PR diff thật | Chức năng cốt lõi | P1 | GitHub service, scanner, jobs | GH-001 | 3-5 ngày | Repo sandbox PR nhận finding đúng, audit/error/retry |
| GH-003 | Tạo branch/commit/PR auto-fix thật | UI hiện báo thành công giả | P1 | githubBotService, backend routes | GH-001 | 3-5 ngày | PR thật, ownership/tier, idempotency, rollback/error UI |
| REP-001 | Thiết kế report API server-authoritative | Report anonymous/client-controlled | P0 | reportRoutes, scan DB | Không | 1-2 ngày | Auth + ownership + input schema + rate limit |
| REP-002 | Sinh và tải PDF an toàn | Feature được quảng bá chưa có | P1 | report service/UI | REP-001 | 2-3 ngày | PDF UTF-8, no HTML injection, download/email tests |
| QA-001 | Dựng PostgreSQL disposable cho `npm run qa` | QA hiện không reproducible | P1 | scripts, Docker/CI | Không | 1-2 ngày | Một command từ checkout sạch chạy được |
| QA-002 | Tách smoke test theo domain và thêm test runner | Dễ xác định lỗi, tăng coverage | P1 | tests/scripts/package | QA-001 | 2-4 ngày | Auth/payment/scan/admin/community suites riêng |
| QA-003 | Thêm regression test cho top security bugs | Ngăn tái xuất hiện | P1 | API tests | SEC-001, GH-001, REP-001 | 1-2 ngày | Tests cho mock route, webhook signature, report auth/XSS |
| DB-001 | Thêm migration versioning | `schema.sql` monolithic khó rollback | P1 | server/db | QA-001 | 2 ngày | Up/down/forward-only policy, migration CI |
| OPS-001 | Backup/restore runbook và test restore | Thiếu bảo vệ dữ liệu | P1 | ops/docs/DB | DB-001 | 1-2 ngày | RPO/RTO phê duyệt, restore drill pass |
| QUOTA-001 | Nối UI renew quota với backend | UI hiện chỉ đổi localStorage | P1 | App, lunarApi, scan route | QA-001 | 1 ngày | API authoritative, transaction + idempotency + error UI |
| QUOTA-002 | Chuẩn hóa scan/AI quota terminology | 3 và 5 gây hiểu nhầm | P1 | catalog/docs/UI/API | BILL-001 | 0.5-1 ngày | Acceptance copy và counters nhất quán |
| DASH-001 | Loại/gắn nhãn mock dashboard data | KPI không đáng tin | P1 | LunarDashboard/API | QA-001 | 2-3 ngày | Empty/loading/error; không có fake data production |
| DASH-002 | Quyết định và triển khai realtime hoặc polling | Realtime code unreachable | P2 | dashboard/Supabase/API | DASH-001 | 2-4 ngày | Multi-client update test; reconnect/backoff |
| POL-001 | Thiết kế persistent policy model + ownership | Policy hiện vô nghĩa sau restart | P2 | schema/routes/scanner | DB-001 | 3-5 ngày | CRUD/RBAC/version; scan lưu policy version |
| UI-001 | Chuẩn hóa modal primitive accessible | Focus/keyboard không đồng nhất | P2 | components | Không | 2-3 ngày | Focus trap, Escape, aria-modal, restore focus tests |
| UI-002 | Responsive pass 320/768/1024/1440 | Không có breakpoint | P2 | styles/components | Không | 3-5 ngày | Không overflow; tables/nav/modal usable; screenshots |
| ERR-001 | Error boundary và 403/500 UX | Chỉ có 404 | P2 | App/components/API client | Không | 1-2 ngày | Fallback, retry, correlation id, route tests |
| EXP-001 | CSV findings/admin export an toàn | Hữu ích cho workflow | P2 | report/API/UI | REP-001 | 1-2 ngày | Ownership, UTF-8, formula injection prevention |
| COMM-001 | Community comments/moderation | Schema dư, thiếu abuse controls | P2 | routes/UI/admin | DB-001 | 3-4 ngày | CRUD ownership, moderation, rate limit, audit |
| PERF-001 | Bundle/performance budget và lazy loading | Các chunk AST/Supabase lớn | P3 | Vite/App | QA-002 | 1-2 ngày | Route/modal lazy load, agreed performance budget |
| SCALE-001 | Queue/worker cho deep scan | Sync scan không scale repo lớn | P3 | worker/queue/API/UI | QA-002 | 5-8 ngày | Async progress/cancel/retry/idempotency |
| DOC-001 | Cập nhật README và xóa tuyên bố chưa có evidence | Tài liệu overclaim | P1 | README/docs | Các task P0 | 0.5 ngày | Feature matrix phản ánh runtime; ASVS claim có scope/evidence |

## Thứ tự và khả năng song song

### Wave 0 — Production blockers

Làm ngay: `SEC-001`, `BILL-001`, `GH-001`, `REP-001`.

Có thể làm song song vì chạm các module khác nhau. `BILL-002` bắt đầu sau `BILL-001`.

### Wave 1 — Nền QA và chức năng cốt lõi

`QA-001` → `QA-002`; song song với `REP-002`, `GH-002`, `GH-003`.

`QA-003` được thêm ngay khi từng P0 fix hoàn tất, không chờ toàn bộ wave.

### Wave 2 — Dữ liệu và chức năng dở

`DB-001` → `OPS-001`, `POL-001`, `COMM-001`.

`QUOTA-001`, `QUOTA-002`, `DASH-001` có thể chạy song song khi QA database sẵn sàng.

### Wave 3 — UX, accessibility và vận hành

`UI-001`, `UI-002`, `ERR-001`, `EXP-001`, `DASH-002`.

### Wave 4 — Scale

`PERF-001`, `SCALE-001` chỉ làm sau khi chức năng cốt lõi và regression suite ổn định.

## Task nên thực hiện đầu tiên

`SEC-001 — Loại mock payment route khỏi production`.

Lý do: thay đổi nhỏ, tác động bảo mật/doanh thu Critical, không phụ thuộc database đang chạy để cấu trúc route an toàn, và có acceptance test rõ ràng.
