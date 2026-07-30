# Kiểm kê chức năng và phân tích khoảng trống

## 1. Phạm vi và mức độ tin cậy

- Dự án: Lunar.dev.
- Commit được audit: `46901f8`.
- Ngày audit: 2026-07-30.
- Phạm vi: frontend React/Vite, Express API, PostgreSQL schema, Docker, tài liệu và script QA.
- Không sửa source code, database hay `.env`.
- `npm run build`: **PASS**.
- `npm audit --omit=dev`: **PASS**, 0 vulnerability đã biết tại thời điểm chạy.
- `npm run qa`: **BLOCKED** trước khi chạy các test nghiệp vụ vì PostgreSQL tại `127.0.0.1:5433` không hoạt động. Vì vậy các chức năng cần database được đánh giá kết hợp từ code, schema và nội dung test; không được coi là đã nghiệm thu runtime trong môi trường hiện tại.
- Không có tài khoản test, provider AI, GitHub OAuth, Gmail OAuth hay payment gateway thật được cung cấp.

## 2. Hiểu hệ thống

### Mục tiêu thực tế

Theo `README.md` và code, Lunar.dev là nền tảng kiểm tra mã nguồn tĩnh (SAST), AI code review, quét repository GitHub, gợi ý/vá lỗi, dashboard bảo mật, cộng đồng, gói trả phí và quản trị. Đối tượng chính là lập trình viên, security engineer và quản trị viên hệ thống.

### Vai trò và quyền

| Vai trò | Quyền được tìm thấy trong code | Bằng chứng |
|---|---|---|
| Guest | Xem landing/community/leaderboard, chạy preview scan bị che chi tiết | `server/routes/scanRoutes.js:286`, `server/routes/dashboardRoutes.js:52` |
| USER/FREE | Tài khoản, verified scan có quota, AI quota, GitHub/Gmail cá nhân, community | `server/middleware/auth.js:70`, `server/routes/scanRoutes.js:98`, `server/routes/aiRoutes.js:460` |
| USER/PRO | Quyền theo tier và quota cao hơn; UI mở repair workbench khi đã đăng nhập | `server/middleware/auth.js:119`, `src/App.jsx:604` |
| USER/ENTERPRISE | Không giới hạn AI theo code; tài liệu quảng bá Git bot | `server/routes/aiRoutes.js:460`, `src/components/PricingModal.jsx:77` |
| ADMIN | Dashboard, user/payment/quota management và audit log | `server/routes/adminRoutes.js:6`, `src/App.jsx:527` |

Không có vai trò tổ chức/team, reviewer, billing admin hoặc read-only admin trong schema hiện tại.

### Kiến trúc

- Frontend: React 18, Vite, state cục bộ trong `src/App.jsx`; không có router library.
- Backend: Express, route modules dưới `server/routes`, middleware JWT/RBAC/rate limit.
- Database: PostgreSQL, 19 bảng/nhóm bảng được tạo bởi `server/schema.sql`.
- Auth: JWT trong HttpOnly cookie; password bcrypt; token reset/verify chỉ lưu hash.
- Dịch vụ ngoài: GitHub OAuth/API, Gemini/OpenAI/Anthropic, Google OAuth/Gmail API, SMTP, VietQR image service, Supabase tùy chọn.
- Triển khai: Docker multi-stage, Express phục vụ bundle frontend.

### Luồng nghiệp vụ quan trọng

1. Đăng ký/đăng nhập → JWT cookie → `/auth/me`.
2. Guest preview hoặc authenticated scan → SAST → lưu project/scan/finding → cập nhật quota.
3. GitHub OAuth → sync repository → deep scan → lưu kết quả.
4. AI review/project attack simulation → quota theo tier → provider hoặc native engine.
5. Tạo order → gateway webhook có chữ ký → transaction cập nhật payment/user/subscription.
6. Community post/upvote → karma/leaderboard.
7. Admin quản lý user/payment/quota → ghi `admin_action_logs`.
8. Gmail OAuth cá nhân → preferences → gửi PDF report → delivery history.

## 3. Điểm tài liệu và code không thống nhất

| Chủ đề | Tài liệu/UI | Code hiện tại | Kết luận |
|---|---|---|---|
| Free scan quota | UI gói Free ghi 3 scan/ngày | scan/deep scan giới hạn 5; AI review giới hạn 3 | Khái niệm “scan” và “AI review” không được giải thích, dễ gây hiểu nhầm |
| Enterprise price | UI ghi 690.000đ/tháng | backend tạo order 1.500.000 VND | Sai giá nghiêm trọng |
| GitHub auto-fix PR | README/UI mô tả tạo PR thật | `githubBotService.js` chỉ delay và trả số/URL ngẫu nhiên | Chức năng mô phỏng |
| GitHub webhook SAST | README mô tả review PR | endpoint trả finding hard-code, không xác minh chữ ký | Chưa phải tích hợp thật |
| Export PDF | UI/README quảng bá PDF | route export trả JSON và URL không tồn tại; UI dùng print dialog | Hoàn thành một phần |
| Supabase Realtime | README quảng bá monitoring realtime | các effect tương ứng bị chặn bởi `return undefined` | Không hoạt động trong luồng hiện tại |
| “OWASP ASVS L2 compliant” | Health endpoint tự tuyên bố compliant | chưa có evidence checklist/independent verification | Không đủ bằng chứng để xác nhận |
| Payment mock | tài liệu cũ mô tả nút thanh toán giả lập | UI hiện chỉ poll status, nhưng endpoint mock vẫn tồn tại | Dead/test surface còn trong production |

## 4. Bảng kiểm kê chức năng

Chỉ sử dụng các trạng thái được yêu cầu.

| Module | Chức năng | Trạng thái | Bằng chứng | Vấn đề |
|---|---|---|---|---|
| Authentication | Đăng ký email/password | Hoàn thành một phần | `authRoutes.js:43`; `qa-smoke.cjs:238` | Chưa chạy được integration test do DB offline |
| Authentication | Đăng nhập/đăng xuất/session | Hoàn thành một phần | `authRoutes.js:162,240,326`; `App.jsx:191` | Chưa kiểm chứng multi-device/expiry runtime |
| Authentication | Quên/đặt lại mật khẩu | Hoàn thành một phần | `accountRoutes.js:39,77`; token hash trong schema | Email/provider và DB chưa chạy thực tế |
| Authentication | Xác minh/resend email | Hoàn thành một phần | `accountRoutes.js:135,182`; `App.jsx:69` | Cần SMTP thật để nghiệm thu end-to-end |
| Authentication | GitHub OAuth login | Hoàn thành một phần | `githubAuthRoutes.js:143,170`; `AuthModal.jsx:35` | Chưa có credential/test account |
| Authorization | JWT, status, auth version | Hoàn thành một phần | `auth.js:39-95` | Code tốt; runtime DB chưa xác nhận |
| Authorization | Admin RBAC backend | Hoàn thành một phần | `adminRoutes.js:6`; `securityAuditRoutes.js:51` | Chưa chạy integration suite |
| Account | Sửa tên, đổi mật khẩu | Hoàn thành một phần | `accountRoutes.js:215,235`; `AccountSettingsModal.jsx` | Không có avatar/delete account |
| Account | Lịch sử scan | Hoàn thành một phần | `accountRoutes.js:283`; `AccountSettingsModal.jsx:46` | Chỉ limit, chưa có pagination UI |
| Scan | Guest preview bị che finding | Hoàn thành | `scanRoutes.js:286`; assertions `qa-smoke.cjs:213-230` | Logic có test script; suite hiện bị DB readiness chặn trước khi đến test |
| Scan | Verified single-file scan | Hoàn thành một phần | `scanRoutes.js:98-240` | Phụ thuộc DB; engine backend nhỏ hơn engine frontend/native |
| Scan | Deep repository scan | Hoàn thành một phần | `deepScanRoutes.js:95`; `GitHubRepoSelector.jsx:112` | Đồng bộ, bounded nhưng synchronous |
| Scan | Local folder/file scan | Hoàn thành một phần | `SubmitModal.jsx`, `FolderDropZone.jsx` | Phần lớn chạy client; chưa có test tự động |
| AI | AI review nhiều provider | Có code nhưng chưa hoạt động | `aiRoutes.js:593`; `geminiService.js` | Không có provider key; API chủ đích trả 503 |
| AI | Native project attack simulation | Hoàn thành một phần | `aiRoutes.js:595`; QA contract trong `qa-smoke.cjs:448` | Chưa chạy suite hiện tại |
| Repair | Sinh patch/diff/apply trong UI | Hoàn thành một phần | `CodeRepairWorkbench.jsx`; `App.jsx:290` | Apply chỉ cập nhật state trình duyệt, không ghi repository/file |
| Repair | Tạo GitHub PR | Có giao diện nhưng chưa có xử lý | `githubBotService.js:35-45` | Trả kết quả giả ngẫu nhiên |
| GitHub | Sync danh sách repository | Hoàn thành một phần | `githubAuthRoutes.js:329,349`; selector UI | Chưa có OAuth credential để chạy |
| GitHub | Webhook PR review | Có API nhưng chưa tích hợp giao diện | `githubRoutes.js:9-53` | Không verify signature, trả mock finding |
| Community | Feed/create audit | Hoàn thành một phần | `communityRoutes.js:18,50`; `SecurityCommunity.jsx` | Thiếu edit/delete/moderation |
| Community | Upvote idempotent | Hoàn thành một phần | `communityRoutes.js:120`; PK composite schema | Có contract test nhưng DB chưa chạy |
| Community | Comments | Có code nhưng chưa hoạt động | Có bảng `audit_comments`, không có endpoint | Schema không được sử dụng |
| Community | Leaderboard | Hoàn thành một phần | `communityRoutes.js:169`; `Leaderboard.jsx` | Không có filter/pagination |
| Dashboard | User overview/statistics | Hoàn thành một phần | `dashboardRoutes.js:67`; `LunarDashboard.jsx:32` | Nhiều card/review/repo vẫn hard-code |
| Dashboard | Realtime monitoring | Có code nhưng chưa hoạt động | `App.jsx:102-159`; `AdminDashboard.jsx:67-117` | Effect return sớm làm code realtime unreachable |
| Admin | Overview/users/payments/audit log | Hoàn thành một phần | `adminRoutes.js`; `AdminDashboard.jsx:24-65` | Search/filter/paging server chưa được UI sử dụng đầy đủ |
| Admin | User/tier/status/quota mutations | Hoàn thành một phần | `adminRoutes.js:227,310`; UI handlers | Chưa có integration runtime trong môi trường audit |
| Payment | Tạo VietQR order và poll status | Bị lỗi | `paymentRoutes.js:45,122`; `PricingModal.jsx:100` | Giá Enterprise UI/backend không khớp; payee hard-code |
| Payment | Signed/idempotent gateway webhook | Hoàn thành một phần | `paymentRoutes.js:180-327`; event table | Code có transaction/idempotency; DB test bị chặn |
| Payment | Subscription history/current plan | Hoàn thành một phần | schema `subscriptions`; `/payment/subscription` | Endpoint chỉ trả tier hiện tại, không đọc lịch sử/expiry |
| Notification | Gmail OAuth cá nhân | Hoàn thành một phần | `notificationRoutes.js:183-338` | Chưa có OAuth credential thật |
| Notification | Preferences/history/audit email | Hoàn thành một phần | `notificationRoutes.js:338-393`; Gmail modals | Có dry-run contract, chưa gửi thật |
| Report | Xuất báo cáo PDF | Có giao diện nhưng chưa có xử lý | `AuditReportExportModal.jsx:71`; `reportRoutes.js` | Print HTML, không sinh/tải PDF; route trả mock JSON |
| Policy | Danh sách/tạo/toggle policy | Có API nhưng chưa tích hợp giao diện | `policyRoutes.js` | In-memory, mất khi restart, không dùng trong scan |
| File | Upload/xem file local | Hoàn thành một phần | `FolderDropZone.jsx`, `CodeViewer.jsx` | Không có server file storage/delete |
| Search/filter | Repo/admin/dashboard | Hoàn thành một phần | repo combobox, admin filters | Không nhất quán; thiếu pagination UI |
| Error pages | 404 | Hoàn thành | `App.jsx:262`; `NotFoundPage.jsx` | Không có 403/500 page/error boundary |
| Activity log | Admin audit log | Hoàn thành một phần | `admin_action_logs`; admin route | Không phải nhật ký hoạt động toàn hệ thống |
| Backup/restore | Database backup/restore | Còn thiếu | Không có script/tài liệu | Chưa có RPO/RTO hay restore drill |
| Responsive | Desktop/tablet/mobile | Hoàn thành một phần | flex-wrap/inline layout | Không có `@media`; chưa có visual regression/device QA |
| Accessibility | Keyboard/labels/focus/contrast | Hoàn thành một phần | Một số aria-label/role | Modal focus trap/restore focus không đồng nhất |
| Export CSV/Excel | Dữ liệu admin/scan | Còn thiếu | Không có code | CSV hữu ích cho findings/admin; Excel chưa cần ở MVP |

## 5. Chức năng còn thiếu phù hợp mục tiêu

| Phân loại | Vấn đề/người dùng ảnh hưởng | Giá trị | Ưu tiên / độ phức tạp | Module tác động | Điều kiện nghiệm thu |
|---|---|---|---|---|---|
| Bắt buộc | GitHub PR đang giả; Enterprise user không nhận được chức năng đã bán | Hoàn thành lời hứa cốt lõi auto-fix | P0 / Cao | FE, BE, GitHub service, DB | Tạo branch/commit/PR thật bằng token user, idempotent, audit được, test với repo sandbox |
| Bắt buộc | Mock payment surface có thể nâng tier | Ngăn gian lận doanh thu/chiếm quyền tier | P0 / Vừa | Payment API, config, tests | Endpoint không tồn tại ở production; mọi tier grant chỉ qua signed webhook/admin audited flow |
| Bắt buộc | Giá/entitlement/quota không có nguồn cấu hình duy nhất | Tránh thu sai tiền và tranh chấp | P0 / Vừa | Pricing FE, payment BE, DB | Một catalog server-side trả giá/quyền; UI dùng catalog; contract tests |
| Bắt buộc | Chưa có migration/versioning/backup-restore | Vận hành và nâng cấp DB an toàn | P1 / Vừa | DB, deployment | Migration có version, backup định kỳ, restore test có bằng chứng và RPO/RTO |
| Bắt buộc | Chưa có test suite chạy độc lập, CI và DB fixture rõ ràng | Ngăn regression chức năng/bảo mật | P1 / Vừa | QA/CI | CI dựng PostgreSQL, chạy unit/API/UI tests; không phụ thuộc `.env` máy cá nhân |
| Bắt buộc | Report PDF được quảng bá nhưng chưa tồn tại | Đáp ứng deliverable của sản phẩm | P1 / Vừa | Report FE/BE | PDF thật, dữ liệu server-authoritative, authorization, encoding/sanitization và download test |
| Nên có | Dashboard còn mock và realtime bị vô hiệu | Số liệu đáng tin cậy | P1 / Vừa | Dashboard, API, DB | Không còn repository/review KPI giả; loading/empty/error; realtime hoặc polling có test |
| Nên có | Policy chỉ lưu RAM và không ảnh hưởng scanner | Chính sách doanh nghiệp có ý nghĩa | P2 / Cao | Policy FE/BE/DB, scan engine | CRUD persistent, ownership/RBAC, policy version gắn với scan và finding |
| Nên có | Community thiếu comment/moderation/edit/delete | Quản trị nội dung và chống abuse | P2 / Vừa | Community, admin, DB | CRUD có ownership, moderation, rate limit và audit |
| Nên có | Findings không có CSV export | Dễ tích hợp workflow security | P2 / Thấp | Report/API/UI | CSV chuẩn UTF-8, chỉ dữ liệu user sở hữu, kiểm tra formula injection |
| Có thể phát triển sau | Queue/worker cho deep scan lớn | Tăng scalability | P3 / Cao | Worker, queue, API, UI | Job async, progress/cancel/retry, idempotency |
| Có thể phát triển sau | Team/organization/RBAC chi tiết | Hỗ trợ B2B | P3 / Cao | Auth, billing, DB, UI | Chỉ làm sau khi có yêu cầu sản phẩm chính thức |
| Không nên làm | Thêm nhiều AI provider/UI mới trước khi ổn định provider hiện tại | Tránh tăng vận hành nhưng không tăng độ tin cậy | Không ưu tiên | AI | Chỉ xem xét khi Gemini/native flow có SLO và test production |

## 6. Thông tin chưa đủ để kết luận

- Không có roadmap/requirements chính thức ngoài README và tài liệu triển khai rời rạc.
- Không có definition of entitlement chính thức cho Free/Pro/Enterprise.
- Không có test account hoặc OAuth/provider credential.
- Không có payment gateway contract/provider production thực tế.
- Không có dữ liệu production, volume, SLO, RPO/RTO hay yêu cầu pháp lý.
- Không có thiết kế mobile/tablet hoặc accessibility acceptance criteria.
- Chưa biết repository private có nằm trong MVP hay không.
