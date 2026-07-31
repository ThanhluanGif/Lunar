# QA Security Remediation Report

Ngày thực hiện: 2026-07-31  
Nhánh: `mac`  
Không commit, push, merge hoặc deploy.

## Kết quả

- Initial inventory theo đặc tả: **47 findings** — 4 Critical, 33 High, 9 Medium, 1 Low; maximum individual CVSS **9.8**.
- Triage: **5 True Positive**, **41 False Positive**, **1 Needs Review**.
- Lifecycle: **5 proposed / 5 applied / 5 verified**. False Positive và Needs Review không được giả mạo thành patched.
- Final repository SAST: **96 files, 0 findings, 0 Critical, 0 High, 0 Medium**.
- Build, dependency audit, Docker build và isolated QA smoke đều pass. Persistent filesystem Auto-Patch và multi-instance rate-limit store vẫn là các giới hạn được ghi rõ.

## Khảo sát và baseline

- Frontend: React/Vite; backend: Express/CommonJS; PostgreSQL; routers đăng ký dưới `/api/v1` trong `server/index.js`.
- Auth: JWT HttpOnly cookie/Bearer, DB identity + auth version; admin guard ở router; owner checks tại query/service.
- SAST: deterministic browser scanner, server scanner, regression/self-audit scripts; process spawn chỉ nằm trong QA scripts với executable/argument cố định.
- Test framework: repository dùng executable regression scripts, không có `npm test`, lint hoặc typecheck script.
- Docker: multi-stage image, non-root runtime, Compose internal network/read-only/cap-drop/resources.
- CI: `.github/workflows/qa.yml` gọi security/build gates.

Baseline thực tế:

| Lệnh | Kết quả baseline |
|---|---|
| `npm run lint` | Không có script |
| `npm run typecheck` | Không có script |
| `npm test` | Không có script |
| `npm run qa:security` | PASS; 92 files, 0 blocking finding |
| `npm run build` | PASS |
| `npm audit --omit=dev --audit-level=high` | PASS; 0 vulnerability |
| `docker compose config` | YAML hợp lệ, nhưng lần chạy baseline đã expand local `.env` ra terminal; mọi credential liên quan phải rotate |

Không đọc/in lại `.env`; validation cuối dùng QA-only overrides và `docker compose config -q`.

## True Positive đã sửa

### 1. Admin seed/default password

- Xóa `ensureSeedAdminUser` khỏi `server/db/connection.js`, gồm bcrypt literal, hai ADMIN upsert và log credential.
- Xóa ADMIN seed khỏi development fallback trong `server/routes/authRoutes.js`; store bắt đầu rỗng.
- Giữ cơ chế `/auth/bootstrap-admin`: actor đã xác thực + one-time bootstrap token + transaction/advisory lock + audit, và từ chối khi đã có ADMIN.
- Kết quả: restart không còn tạo, nâng quyền hoặc reset password của account ADMIN.

### 2. Username login và throttling

- `server/routes/authRoutes.js` chỉ nhận string identifier, validate bằng `normalizeEmail` hoặc `normalizeNickname`, query email/nickname parameterized.
- Xóa logic suy diễn `${input}@lunar.dev`; không còn alias domain có thể va chạm account.
- Password được verify trước khi trả trạng thái suspended, giảm account enumeration.
- `server/middleware/rateLimiter.js` thêm `username`, canonicalize nickname có/không `@`, hash identifier và không đọc raw `X-Forwarded-For`.
- `src/components/AuthModal.jsx` cho phép nhập email hoặc nickname ở login nhưng giữ email input cho register/recovery.

### 3. Logout khi API tạm mất kết nối

- `src/App.jsx` luôn xóa local identity/tier và rời admin tab dù request logout bị network error; UI thông báo server chưa xác nhận xóa cookie.
- Backend logout vẫn clear cookie bằng cùng policy và auth responses dùng `no-store`.
- Đây là thay đổi UX fail-safe; HttpOnly cookie server có thể còn tới khi hết hạn nếu backend hoàn toàn unreachable, nên thông báo không tuyên bố server session đã bị revoke.

### 4. Auto-Patch fail-closed

- Thêm `src/services/autoPatchPolicy.js`: contract unavailable, path containment syntax, symlink metadata guard, exact-content conflict, backup, rollback, deterministic rescan và verified transition.
- Scanner/backend AI findings trả `available:false`, `after:null`, `unifiedDiff:null`, `reasonUnavailable`; AI suggestion/legacy `patchCode` không bật Apply.
- UI ẩn AFTER/diff khi unavailable, disable Apply, chỉ đếm verified và block bulk authorization/IDOR nếu thiếu policy evidence.
- `src/App.jsx` không còn xóa mọi finding sau click; chỉ cập nhật project sau rescan thành công.

## False Positive có bằng chứng

- Command execution/RSA: signatures nằm trong regex/string/fixture, sink là `RegExp.exec`, không phải OS execution/crypto runtime. Payload regression chứng minh không tạo side effect.
- Authorization: admin routes kế thừa router guard; protected routes có inline auth/tier/role; webhook dùng HMAC thay session auth.
- IDOR: report/payment/assistant/GitHub/scan queries ràng buộc actor hoặc capability ADMIN; non-owner và missing resource dùng 404 khi phù hợp.
- Cookie/rate/CSRF/debug: centralized helper, trusted proxy boundary, reset window, structured redaction và origin checks có regression test.
- Chi tiết từng finding nằm trong `QA_SECURITY_TRIAGE_REPORT.md`; endpoint policy nằm trong `AUTHORIZATION_MATRIX.md`.

## Test và rescan cuối

| Test/lệnh | Kết quả cuối |
|---|---|
| `node scripts/sast-regression.cjs` | PASS; command payload/side-effect và scanner precision |
| `node scripts/auto-patch-regression.mjs` | PASS; unavailable, traversal, symlink, conflict, backup, rollback, verified, IDOR bulk policy |
| `node scripts/security-regression.cjs` | PASS; auth, username throttle, reset window, proxy boundary, cookies/logout, owner/non-owner, admin role, webhooks, redaction |
| `npm run qa:security` | PASS; 96 files; 0 findings |
| `npm run build` | PASS |
| `npm audit --omit=dev --audit-level=high` | PASS; 0 vulnerabilities |
| `docker compose config -q` với QA-only secret | PASS |
| `docker build -t lunar:security-qa-fixed .` | PASS |
| Docker container smoke 5650/5651 | PASS health/ready/frontend; non-root/read-only/cap-drop verified |
| `node scripts/qa-smoke.cjs` trên isolated PostgreSQL | Lần 1 FAIL do test còn đòi legacy `patchCode`; sửa test theo contract bắt buộc; lần 2 PASS toàn bộ flow |
| `npm run qa:a11y` | PASS axe/WCAG AA, accessible names, dialog focus trap, focus restore, effective zoom 200% trên Google Chrome |
| `npm run qa:production-routing:browser` | PASS split-origin routing/CORS; 0 provider call |
| `npm run qa:auth-lifecycle:browser` | Lần đầu FAIL vì selector placeholder cũ sau thay đổi login field; cập nhật selector semantic và login bằng nickname; lần sau PASS, 0 failed fetch |

Isolated Compose project `lunar_security_qa_20260731`, containers, network và volume QA đã được xóa sau test. Không chạm ports 5050/5433 hoặc production container.

## File thay đổi

- Runtime/auth: `server/db/connection.js`, `server/routes/authRoutes.js`, `server/middleware/rateLimiter.js`, `server/routes/aiRoutes.js`.
- Frontend: `src/App.jsx`, `src/components/AuthModal.jsx`, `src/components/VulnerabilityPatcher.jsx`, `src/components/CodeRepairWorkbench.jsx`, `src/services/securityScannerEngine.js`, `src/services/multiLlmEngine.js`, `src/services/autoPatchPolicy.js`.
- QA: `scripts/security-regression.cjs`, `scripts/sast-regression.cjs`, `scripts/auto-patch-regression.mjs`, `scripts/qa-smoke.cjs`, `package.json`.
- Báo cáo: `QA_SECURITY_TRIAGE_REPORT.md`, `QA_SECURITY_REMEDIATION_REPORT.md`, `AUTHORIZATION_MATRIX.md`, `AUTO_PATCH_DESIGN.md`, `PRODUCTION_READINESS_CHECKLIST.md`.

`src/components/SecurityDashboard.jsx` tồn tại và đã được khảo sát; không cần patch bảo mật trong vòng này.

## Finding/rủi ro còn lại

- Needs Review: shared rate-limit store chưa có. Code chủ động từ chối multi-instance production; đây là blocker scale-out, không phải finding bị che.
- Persistent filesystem Auto-Patch writer chưa tồn tại. UI chỉ hỗ trợ virtual project apply; mọi AI/native patch production vẫn unavailable.
- Chưa kiểm thử Safari thật, screen reader thật, production GitHub OAuth app/domain hoặc provider production.
- Mô hình ADMIN là all-or-nothing; chưa có granular capability/tenant admin.

## Secret rotation

Local `.env` có credential trông như đang hoạt động và baseline Compose output từng expand chúng. Không ghi giá trị vào báo cáo. Cần rotate tối thiểu JWT, PostgreSQL, GitHub OAuth/token encryption/webhook, payment webhook, AI/provider và SMTP credentials có liên quan; rà lịch sử git/terminal/CI artifacts. Không tự sửa `.env` để tránh phá môi trường người dùng.

## Breaking change

- Username login được hỗ trợ rõ ràng; identifier không hợp lệ trả 400.
- Không còn tài khoản ADMIN seed. Môi trường từng dựa vào account mặc định phải dùng bootstrap một lần hoặc quy trình provisioning chính thức.
- AI/native `patchCode` không còn được xem là patch có thể Apply; consumer phải dùng contract `available/after/unifiedDiff/reasonUnavailable`.

## Rollback plan

1. Rollback từng nhóm code bằng patch đảo ngược có review, không khôi phục default credential/admin seed.
2. Nếu Auto-Patch UI regression, giữ server findings unavailable và tắt riêng nút bằng product feature flag đã review; không nhận legacy patchCode.
3. Nếu username login regression, tạm giới hạn UI về email nhưng giữ canonical rate-limit key và không khôi phục domain synthesis.
4. Restore database từ backup chỉ khi có migration/data incident; migration login-event mới là additive và không xóa dữ liệu cũ.
5. Sau rollback phải chạy lại security regression, build, SAST, Docker smoke và rotate secret nếu có exposure.

## Follow-up: dashboard isolation và realtime admin

Ngày xác minh: 2026-07-31. Không commit, push, merge hoặc deploy.

### Triage và exploit path

- False Positive backend data mixing: mọi query `/dashboard/overview` đã ràng buộc `req.user.id`; non-owner không đọc được project, scan hoặc finding của owner.
- True Positive client stale-state exposure: `LunarDashboard` giữ response tài khoản trước trong lúc account mới đang fetch; response chưa có owner contract để client tự kiểm tra.
- True Positive cache boundary: `/dashboard` và `/admin` chưa có response `Cache-Control: no-store, private` và `Vary: Cookie`, tạo rủi ro reuse response qua phiên ở proxy/CDN.
- True Positive realtime mismatch: `AdminDashboard` chỉ fetch khi mount/range đổi dù UI ghi LIVE; không polling, focus refresh hoặc stale-request cancellation.
- True Positive login analytics: backend chỉ ghi đè `users.last_login_at`; nhiều lần đăng nhập cùng account không tăng counter, và GitHub login không cập nhật timestamp này.

### Patch đã áp dụng

- Dashboard response trả `scope: OWN_ACCOUNT` và `identity.userId`; frontend xóa state khi đổi user, remount theo user ID và chỉ render response khớp owner.
- Admin response trả `scope: SYSTEM`; frontend remount theo admin ID, abort request cũ, tự refresh mỗi 10 giây và refresh khi tab/window active lại.
- Dashboard người dùng refresh có giới hạn mỗi 15 giây; request cũ bị request gate loại bỏ nên không thể ghi đè account mới.
- Thêm bảng append-only `user_login_events`; password/GitHub login ghi event riêng trong PostgreSQL và cập nhật `last_login_at`.
- Admin analytics có `loginCount`, recent login event riêng và KPI `loginEventsToday`; hai lần đăng nhập từ hai máy được tính thành hai sự kiện.
- Auth/dashboard/admin responses dùng `no-store, private`, `Pragma: no-cache`, `Expires: 0` và `Vary: Cookie`.

### Evidence cuối

| Boundary | Evidence |
|---|---|
| UI → request | Request gate từ chối response cũ; account/admin component có key theo user ID |
| Request → API | Credential cookie, request `cache: no-store`, response private/no-store + `Vary: Cookie` |
| API → data | User query bind `req.user.id`; admin query aggregate system; login events append-only |
| Data → response | User response có owner ID; admin response có system scope và per-login event IDs |
| Response → UI | User A/B isolation PASS; admin polling 10s/focus refresh; two-device counter increment PASS |

### Test follow-up

- `npm run qa:dashboard`: PASS request epoch, owner/system scope và bounded polling.
- `node scripts/qa-smoke.cjs` với PostgreSQL QA cô lập cổng 55437: PASS user A/B isolation, RBAC, cache headers, hai login event và KPI tăng 2.
- Lần smoke đầu fail vì hai device fixture dùng cùng IP và chạm IP rate limit hợp lệ; fixture được sửa dùng hai trusted QA IP, không nới lỏng rule/assertion; lần hai PASS.
- `npm run qa:a11y`: PASS axe/WCAG AA, accessible names, keyboard/focus và zoom 200%.
- `npm run qa:security`: PASS; final SAST 96 files, 0 finding.
- `npm run build`: PASS; `npm audit --omit=dev --audit-level=high`: 0 vulnerability; `docker compose config --quiet`: PASS.

Compose project tạm `lunar-dashboard-qa`, database volume và network đã được xóa sau test. Container/cổng hiện có `5050/5433` không bị thay đổi.

## Follow-up: bảng nâng cấp khi hết quota FREE

Ngày xác minh: 2026-07-31. Không commit, push, merge hoặc deploy.

### Triage và exploit path

- True Positive contract mismatch: `/deep-scans/repository` trả 429 chỉ có `error: "FREE daily scan quota reached."`; frontend yêu cầu `quotaExceeded: true`, nên response đi vào `setScanError` và được render thẳng qua `DeepScanProgress`.
- True Positive UI coverage: `UserGitHubWorkspace` và `CodeRepairWorkbench` chưa nhận callback quota chung; AI simulation/deep scan 429 bị ghi vào `scanError` hoặc `simulationError` thay vì mở bảng nâng cấp.
- Middleware vẫn đúng: deep scan đi qua `verifyToken` và `deepScanRateLimiter`; quota account được kiểm tra trong transaction theo `req.user.id`. Lỗi nằm ở response contract và UI routing, không phải bypass xác thực/quota.
- False Positive provider/burst throttling: 429 chung như `TOO_MANY_REQUESTS: Quá nhiều deep scan` không có contract quota account và không khớp chính xác legacy message, nên vẫn là lỗi vận hành chứ không bị biến thành paywall.

### Patch đã áp dụng

- Backend deep scan trả contract quota thống nhất gồm `quotaExceeded`, `quotaType: VERIFIED_SCAN`, `tier`, `limit` và `remaining`; chuỗi response cũ không còn được phát ra từ route hiện tại.
- Frontend chấp nhận có giới hạn response production cũ chỉ khi status 429, tier hiện tại là FREE và message khớp chính xác `FREE daily scan quota reached.`; tài khoản trả phí và provider 429 không mở modal.
- `App` cung cấp một `handleQuotaExceeded` chung cho Submit Scan, Quick Scan GitHub, quét folder local và Code Repair attack simulation. Các catch này dừng render lỗi quota thô sau khi modal được mở.
- Local SAST vẫn giữ kết quả deterministic khi AI quota hết; metadata lỗi quota được chuyển có kiểm soát để mở modal mà không làm mất kết quả quét local.
- `QuotaDepletedModal` hiển thị bảng Pro/Enterprise responsive, feature list và giá lấy trực tiếp từ `/payment/plans`; không hardcode amount trong frontend.
- Chọn gói mới mở `PricingModal` với đúng plan để tạo order VietQR. Guest hết quota được chuyển sang đăng nhập thay vì tạo order vô danh.

### Evidence cuối

- `npm run qa:quota`: PASS structured response, exact legacy compatibility, paid-tier/provider 429 separation, plan catalog và wiring mọi scan surface → modal.
- PostgreSQL QA cô lập cổng `55439`: PASS full `qa-smoke`, gồm AI quota 3 lượt và deep scan quota 5 lượt trả đúng upgrade contract. Lần đầu dừng do fixture thêm một registration chạm auth rate-limit hợp lệ; fixture được sửa dùng user QA hiện có, không nới rule hoặc bỏ assertion; lần hai PASS.
- `npm run build` và `npm run qa:a11y`: PASS; Chrome regression xác nhận axe/WCAG AA, accessible name, keyboard/focus trap, focus restore và zoom 200%.
- `npm run qa:security`: PASS; SAST cuối 96 files, 0 finding. `npm audit --omit=dev --audit-level=high`: 0 vulnerability. `docker compose config --quiet`: PASS với credential QA giả.

Container PostgreSQL tạm `lunar-quota-modal-qa-db` đã được xóa sau kiểm thử; không tác động container/cổng `5050/5433` hiện có.

## Follow-up: remediation chi tiết và file bàn giao toàn bộ finding

Ngày xác minh: 2026-07-31. Không commit, push, merge hoặc deploy.

### Khảo sát, triage và trust boundary

- True Positive về khả năng bàn giao: UI cũ chỉ hiển thị mô tả/defense strategy ngắn, không có root cause, lý do finding được tạo, attack path phòng thủ, checklist validation hoặc điều hướng finding trước/sau. Người nhận không đủ dữ kiện để tái hiện và sửa theo từng lỗi.
- True Positive về export: PDF/CSV cũ phụ thuộc verified scan đã lưu và chưa có Markdown có cấu trúc để chuyển cho developer hoặc AI khác. Finding đang có ở client vì quét local/AI chưa thể xuất thành một hồ sơ remediation đầy đủ.
- Source là finding từ deterministic scanner, verified scan hoặc AI review; sink là nội dung hiển thị và file PDF/Markdown/CSV tải xuống. Dữ liệu đi qua normalization, giới hạn độ dài/số lượng và redaction trước khi tới file generator.
- Middleware của portable export là `verifyToken` rồi `reportRateLimiter`; global JSON body limit là 1 MB và report chỉ nhận tối đa 1000 findings. Route không gọi provider hoặc production service.
- `NEEDS_REVIEW` chỉ là yêu cầu xác minh source, sink, middleware, ownership và runtime reachability; không được diễn giải thành bằng chứng exploitability. Bản vá AI chỉ là đề xuất cho tới khi apply, test và rescan thành công.

### Patch đã áp dụng

- `VulnerabilityPatcher` có điều hướng Previous/Next và chỉ số `Finding n/total`; mỗi finding trình bày root cause, cơ sở triage, tác động, attack path phòng thủ, chiến lược sửa, bước triển khai, before/proposed-after/diff và definition of done/rescan checklist.
- AI review schema và native fallback bổ sung `rootCause`, `whyThisIsValid` và `remediation.validationSteps`; output thiếu contract bắt buộc bị từ chối thay vì được coi là bản phân tích hoàn chỉnh.
- Thêm portable report contract dùng chung để chuẩn hóa severity/CVSS/CWE/location/triage/confidence/patch lifecycle. Patch chưa validated giữ `available:false`, không có AFTER/diff và ghi rõ lý do chưa khả dụng.
- Modal export có `Full Remediation Report (PDF)` cho người đọc và `AI Fix Handoff (README.md)` cho developer/AI; CSV vẫn được giữ và bổ sung trường root cause, validation và patch status.
- Backend thêm `POST /api/v1/reports/export/portable/pdf`, `POST /api/v1/reports/export/portable/markdown` và Markdown từ verified scan tại `GET /api/v1/reports/export/markdown/:scanId`.
- Verified-scan persistence lưu rule ID, CWE, severity, CVSS và file path thật thay cho metadata tổng quát, giúp file bàn giao trỏ đúng finding/source location.
- PDF dùng ASCII transliteration an toàn cho renderer hiện tại; Markdown giữ Unicode UTF-8. Secret-like evidence được che trong PDF, Markdown và CSV; CSV giữ raw leading tab/CR cho tới bước chống formula injection.

### Evidence source -> sink -> output

| Boundary | Evidence |
|---|---|
| Finding source | Deterministic/AI finding được normalize thành contract có triage, confidence, remediation và validation |
| Client -> API | `downloadPortableRemediationReport` gửi payload qua authenticated API; format chỉ cho phép `pdf` hoặc `markdown` |
| API middleware | `verifyToken` + `reportRateLimiter`; JSON 1 MB; tối đa 1000 findings |
| API -> generator | Text được giới hạn, control character được xử lý, evidence/patch được redact trước khi sinh file |
| Generator -> download | Content-Type/Content-Disposition riêng cho PDF, Markdown và CSV; filename được sanitize |
| Report -> fix lifecycle | Hướng dẫn bắt buộc verify reachability, apply patch, chạy test và rescan trước khi đánh dấu fixed |

### Test, build và rescan cuối

- `npm run qa:remediation-report`: PASS detailed contract, AI handoff Markdown, PDF content, redaction, authenticated export wiring và slide navigation/checklist.
- Regression CSV lần đầu phát hiện formula-injection prefix bị normalization làm mất trước sanitize; code được sửa để giữ raw source field đến bước `sanitizeCsvField`. Không nới assertion hoặc tắt security rule.
- `npm run qa:a11y`: PASS cho modal/navigation, accessible name, keyboard/focus trap, focus restore và zoom 200%.
- `npm run build`: PASS.
- `npm run qa:security`: PASS; SAST cuối 97 files, 0 finding.
- `npm run qa:sast`: PASS. `npm audit --omit=dev --audit-level=high`: 0 vulnerability. `docker compose config --quiet`: PASS.
- Full `qa-smoke` trên PostgreSQL QA cô lập cổng `55440`: PASS. Container `lunar-remediation-report-qa-db` đã được xóa; không tác động container/cổng `5050/5433` hiện có.
- Sample cuối `output/pdf/lunar-security-remediation-sample.pdf` được render bằng Poppler và kiểm tra trực quan. Lỗi header overlap và glyph `đ` ở các bản trung gian đã được sửa; bản cuối không clipping/overlap, có pagination, footer và redaction.

### Giới hạn được công bố

- Báo cáo cung cấp chỉ dẫn remediation và proposed patch, không cam kết mọi AI suggestion là đúng hoặc có thể apply tự động.
- Portable payload từ client được xác thực và giới hạn nhưng không thay thế verified persisted scan cho audit pháp lý; report ghi rõ scan ID khi có và trạng thái triage/patch thực tế.
- PDF transliterate một số ký tự tiếng Việt để tránh lỗi font trong generator hiện tại; Markdown là bản bàn giao giữ đầy đủ Unicode và phù hợp hơn cho AI/developer tiếp tục xử lý.
