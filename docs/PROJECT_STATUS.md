# Trạng thái dự án Lunar

> Cập nhật: 2026-07-31
> Baseline đã đồng bộ: `main` và `mac` tại commit `192429b`

Đây là tài liệu tổng hợp duy nhất cho tiến độ, quyết định kỹ thuật, phần đã nghiệm
thu và công việc còn lại. Các báo cáo phase/QC/security cũ đã được gộp vào đây
để tránh nhiều tài liệu mô tả các trạng thái khác nhau.

## 1. Trạng thái hiện tại

Lunar đang chạy được bằng Docker tại `http://localhost:5050` với React/Vite,
Express và PostgreSQL 16. Backend là nguồn dữ liệu có thẩm quyền cho identity,
role, tier, quota, scan, payment và lịch sử trợ lý.

Các gate tự động đã đạt trên baseline:

- `npm run build`
- `npm run qa:docker`
- `npm run qa:security`
- `npm run qa:sast`
- `npm run qa:a11y`
- `npm run qa:ui:mac`
- `npm audit --audit-level=high`
- `npm audit --omit=dev`
- Docker production-like image build và Docker Scout: `0C / 0H / 0M / 0L`
- GitHub Actions `QA Gate`

QA hiện kiểm tra auth/RBAC, PostgreSQL, scan, 555 rule signatures, dashboard,
payment webhook, GitHub guard, report authorization, trợ lý AI và giao diện
Chrome không có lỗi console/network.

Đợt production-readiness ngày 2026-07-31 chỉ build và chạy stack QA cô lập ở
port `5150/5544`; không deploy, thay thế container đang chạy hoặc gọi provider
production. Tất cả kết quả kiểm thử đã được hợp nhất tại đây và `docs/QA_RELEASE_CHECKLIST.md`.

## 2. Chức năng đã triển khai

### Tài khoản và phân quyền

- Đăng ký, đăng nhập, đăng xuất bằng JWT HttpOnly cookie.
- Xác minh email, quên/đặt lại mật khẩu và vô hiệu session cũ bằng
  `auth_version`.
- Role/tier/status luôn được xác minh lại từ PostgreSQL.
- Admin API có RBAC và audit log cho mutation quan trọng.

### Scan, AI và sửa lỗi

- Guest preview che line, snippet và patch.
- Authenticated scan lưu project, scan và finding trong PostgreSQL.
- Deterministic SAST hỗ trợ 22 ngôn ngữ với 555 language-rule signatures.
- Babel AST analysis cho JavaScript/TypeScript.
- Scanner bỏ qua import/path tĩnh, chuỗi/regex/JSX text không thực thi và thư
  mục test/fixture; finding được khử trùng theo file, dòng và CWE.
- Regression SAST tự kiểm tra cả precision/recall và quét toàn bộ source
  production; gate thất bại nếu còn finding critical/high.
- Deep repository scan có giới hạn file, kích thước, tổng byte và concurrency.
- AI review qua Gemini/OpenAI/Anthropic; fail-closed nếu provider chưa cấu hình.
- Native project attack simulation và repair workbench.
- Lunar AI assistant nổi toàn website:
  - Khách dùng chế độ nội bộ, không gọi provider ngoài.
  - User đăng nhập có thể dùng Vercel AI Gateway.
  - Lịch sử chat tách theo `user_id`.
  - Không gửi raw source code mặc định và không trả secret xuống frontend.

### GitHub và report

- GitHub OAuth, repository sync và bounded deep scan.
- Quick Scan đặt ngay dưới hero, hợp nhất repository OAuth, public username và
  thư mục local; không còn hai khối GitHub trùng chức năng.
- OAuth local dùng GitHub Device Flow để không phụ thuộc callback host/port;
  device code chỉ nằm trong cookie HttpOnly được mã hóa. Production vẫn dùng
  web callback trên domain HTTPS. Tra cứu public chấp nhận username,
  `@username` hoặc URL profile.
- Sau khi xác thực, Lunar tạo/cập nhật user, đặt session JWT, lưu avatar/email,
  đồng bộ repository trong cùng transaction và Quick Scan tự nạp dữ liệu thật.
- Quick Scan chưa có phiên đi thẳng GitHub OAuth; modal đăng nhập mặc định mở
  GitHub với một CTA duy nhất, còn Email được thu gọn thành liên kết phụ.
- GitHub webhook yêu cầu HMAC SHA-256 và delivery receipt chống replay.
- Backend có luồng tạo branch/commit/PR với kiểm tra owner, tier và stale SHA.
- Audit report PDF nhiều trang gồm rule, CWE, severity, CVSS, file/dòng,
  evidence đã che secret, hướng khắc phục và badge cho GitHub README.
- Report export yêu cầu auth, ownership và dữ liệu scan từ server.
- Mermaid architecture chạy ở chế độ `strict` và SVG được hiển thị trong ngữ
  cảnh ảnh, không chèn HTML trực tiếp vào DOM.

### Payment và dashboard

- Server-side plan catalog là nguồn giá/quota duy nhất cho UI và order.
- Payment order dùng CSPRNG, PostgreSQL persistence và VietQR beneficiary từ env.
- Signed webhook kiểm tra số tiền, idempotency và transaction trước khi cấp tier.
- Mock payment route không tồn tại trong production.
- Thiếu beneficiary hoặc webhook secret sẽ trả `503`, không làm website ngừng chạy.
- Dashboard/admin dùng API backend; mock operational data cũ đã được loại.
- Preview dashboard trên landing dùng cùng API PostgreSQL theo tài khoản; guest không
  nhận số liệu giả và được yêu cầu đăng nhập.

### Reliability và UX

- React application error boundary.
- Responsive CSS baseline, touch target và reduced-motion handling.
- Axe WCAG AA tự động, accessible name/ARIA cho dialog, focus trap, Escape,
  restore focus và kiểm tra layout ở effective zoom 200%.
- Structured JSON logging có log level, redaction sâu, không log body/payload,
  che IP và correlation ID xuyên request, provider, webhook và audit record.
- Chỉ nhận correlation ID do trusted proxy chuyển tiếp; request trực tiếp luôn
  được cấp ID mới để chống spoofing/log injection.
- Provider HTTP có timeout, tối đa hai retry và chỉ retry phương thức an toàn;
  mutation/token exchange không tự retry và provider sai credential fail-closed.
- Docker health/readiness checks, runtime non-root/read-only, drop toàn bộ
  capability, `no-new-privileges`, tmpfs và local log rotation.
- Reverse proxy mẫu bỏ query string và địa chỉ client đầy đủ khỏi access log;
  retention/redaction policy và provider runbook đã được tài liệu hóa.
- CI dựng PostgreSQL disposable, chạy QA, security regression, accessibility
  browser gate và build image.

## 3. Việc còn lại trước production sign-off

### Bắt buộc

1. Cấu hình secret production bằng secret manager; bật HTTPS,
   `LUNAR_COOKIE_SECURE=true` và CORS allowlist theo domain thật.
2. Kiểm thử payment sandbox bằng tài khoản thụ hưởng và hợp đồng webhook thật.
3. Chạy E2E OAuth thật cho GitHub; xác nhận callback, revoke và rate-limit.
4. Nghiệm thu tạo PR trên repository sandbox có quyền ghi và kiểm tra retry,
   stale SHA, rollback, duplicate PR.
5. Gửi email verification/reset tới người nhận thử nghiệm được phê duyệt và xác
   nhận HTTPS link, expiry, single-use, correlation header và lỗi SMTP an toàn.
6. Thực hiện live smoke được phê duyệt cho AI Gateway và payment sandbox; xác
   nhận quota, timeout, idempotency và reconciliation theo runbook.
7. Thêm migration versioning, backup/restore runbook và restore drill có RPO/RTO.
8. Kết nối log platform tập trung, xác minh retention job/append-only audit và
   cấu hình `TRUST_PROXY` theo CIDR thật của load balancer.
9. Hoàn thành threat model và security review độc lập.
10. Nghiệm thu thủ công Firefox, Safari, mobile và VoiceOver/NVDA theo checklist.
11. Không tuyên bố OWASP ASVS Level 2 cho tới khi có checklist control-by-control
   cùng evidence.

### Cải tiến tiếp theo

- Scan diff thật trong GitHub webhook và queue/worker cho repository lớn.
- Redis/shared store cho rate limit và quota trong triển khai nhiều instance.
- Policy engine persistent có ownership/version và được áp dụng vào scan.
- Queue/worker và idempotency key bền vững cho job/provider mutation dài hạn.
- Lazy loading và performance budget cho các bundle AST/Supabase lớn.

## 4. Quy tắc cập nhật tài liệu

- `README.md`: cách cài đặt, cấu hình và sử dụng hiện tại.
- `DESIGN.md`: luật thiết kế giao diện.
- `docs/PROJECT_STATUS.md`: tiến độ, quyết định và backlog còn hiệu lực.
- `docs/QA_RELEASE_CHECKLIST.md`: checklist kiểm thử trước merge/release.

Khi một task hoàn tất, cập nhật trực tiếp file này và checklist; không tạo thêm
`phase report`, `walkthrough`, `bug report` hoặc `audit report` mới nếu nội dung
có thể nằm trong hai tài liệu trên.
