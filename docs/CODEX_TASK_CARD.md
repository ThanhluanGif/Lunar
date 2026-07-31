Bạn là Principal QA Engineer, Application Security Engineer và Senior Node.js/React Developer.

Hãy thực hiện QA chuyên sâu, xác minh và khắc phục toàn bộ lỗi chức năng, bảo mật và hồi quy trong dự án Lunar AI Code Review Platform.

TỰ CHỦ THỰC HIỆN
- Đọc, phân tích và sửa code trực tiếp trong repository.
- Chạy test, lint, typecheck, build, audit, Docker QA và SAST.
- Tự sửa các lỗi phát hiện trong phạm vi repository.
- Lặp lại quy trình scan → triage → fix → test → rescan cho đến khi:
  1. mọi True Positive có thể sửa bằng code đã được khắc phục;
  2. mọi False Positive có bằng chứng;
  3. mọi vấn đề cần quyết định sản phẩm được ghi thành blocker rõ ràng;
  4. test và build thành công.

KHÔNG ĐƯỢC
- Không deploy production.
- Không dừng hoặc thay thế container production.
- Không commit, push, merge hoặc tạo release.
- Không sử dụng credential/provider production.
- Không in hoặc ghi log secret.
- Không tắt security rule để làm kết quả đẹp.
- Không dùng `|| true`.
- Không xóa test đang thất bại.
- Không thay đổi assertion để hợp thức hóa hành vi sai.
- Không thêm comment “SECURE FIX” mà không đóng exploit path.
- Không đánh dấu finding đã vá nếu chưa có test và rescan xác nhận.

HIỆN TRẠNG

Có 47 phát hiện:
- 4 Critical.
- 33 High.
- 9 Medium.
- 1 Low.
- CVSS cao nhất: 9.8.

Các nhóm chính:
- CWE-798: secret/default password trong deployment manifest.
- CWE-78: OS command execution.
- CWE-862: route có thể thiếu authorization.
- CWE-639: IDOR.
- CWE-614: cookie thiếu thuộc tính an toàn.
- CWE-307: authentication thiếu throttling.
- CWE-326: RSA key yếu.
- CWE-200: debug output nhạy cảm.

PHẠM VI FILE

Kiểm tra tối thiểu:
- Dockerfile
- docker-compose.yml
- package.json
- package-lock.json
- sast-self-audit.cjs
- server/index.js
- server/config/connection.js
- server/middleware/*
- server/routes/*
- server/services/*
- src/services/*
- src/components/VulnerabilityPatcher.jsx
- src/components/CodeRepairWorkbench.jsx
- src/components/SecurityDashboard.jsx
- schema.sql
- vite.config.js

GIAI ĐOẠN 1 — KHẢO SÁT VÀ BASELINE

1. Đọc AGENTS.md và tài liệu dự án nếu có.
2. Chạy `git status --short`; bảo toàn thay đổi hiện tại.
3. Xác định:
   - kiến trúc frontend/backend;
   - route registration;
   - authentication và authorization middleware;
   - database access;
   - SAST pipeline;
   - patch generation;
   - test framework;
   - Docker/Compose;
   - CI/CD.
4. Chạy baseline:
   - npm run lint nếu có;
   - npm run typecheck nếu có;
   - npm test;
   - npm run qa:security nếu có;
   - npm run build;
   - npm audit --omit=dev --audit-level=high;
   - docker compose config.
5. Ghi lại lỗi ban đầu; không sửa test để che lỗi.

GIAI ĐOẠN 2 — TRIAGE 47 FINDINGS

Với từng finding, lập bảng:
- ID và CWE.
- File/dòng.
- Endpoint/chức năng liên quan.
- Source dữ liệu.
- Sink nguy hiểm.
- Middleware kế thừa.
- Exploit scenario.
- True Positive, False Positive hoặc Needs Review.
- Mức độ ưu tiên.
- Cách sửa.
- Test hồi quy.
- Trạng thái proposed/applied/verified.

Không tin tuyệt đối line number vì code có thể đã thay đổi. Tìm statement và luồng dữ liệu thực tế.

GIAI ĐOẠN 3 — CWE-798: SECRET

Tại docker-compose.yml và toàn bộ repository:
- Xóa password/token/key mặc định được commit.
- Không giữ `${PASSWORD:-lunar_local_password}`.
- Dùng biến bắt buộc:
  `${LUNAR_POSTGRES_PASSWORD:?LUNAR_POSTGRES_PASSWORD is required}`
  hoặc Docker Compose secrets.
- Hỗ trợ `*_FILE` và `/run/secrets/...` nếu phù hợp.
- `.env.example` chỉ chứa placeholder.
- `.env`, secret file và credential artifact phải nằm trong `.gitignore`.
- Production fail closed khi thiếu secret.
- Không đưa secret vào Dockerfile ARG/ENV build-time.
- Không log giá trị secret.
- Nếu secret từng commit, ghi rõ cần rotate.
- Chạy `docker compose config` để kiểm tra YAML.

GIAI ĐOẠN 4 — CWE-78: COMMAND INJECTION

Kiểm tra:
- server/services/sastEngine.js.
- src/services/securityScannerEngine.js.
- Mọi exec, execSync, spawn, spawnSync và execFile.

Yêu cầu:
- Ưu tiên Node API/library thay cho OS command.
- Nếu bắt buộc tạo process:
  - dùng spawn/execFile;
  - `shell: false`;
  - executable cố định bằng allowlist;
  - argument là mảng;
  - không nối chuỗi command;
  - không cho user chọn executable;
  - validate và canonicalize path;
  - giới hạn path trong scan root;
  - chặn `..` và symlink escape;
  - timeout;
  - giới hạn output;
  - environment tối thiểu;
  - không truyền secret;
  - không chạy root;
  - cô lập repository không tin cậy.
- Thêm test với:
  - `; touch /tmp/pwned`
  - `&& whoami`
  - `$(id)`
  - backticks
  - newline
  - option injection
  - path traversal.
- Test phải chứng minh không có side effect.
- Nếu vị trí bị báo là test fixture của chính scanner, phân loại rõ thay vì vô hiệu hóa rule.

GIAI ĐOẠN 5 — CWE-862: AUTHORIZATION

Không thêm auth middleware hàng loạt.

Với từng route:
- Kiểm tra middleware ở app, parent router, router.use và controller.
- Xác định route public/protected.
- Phân biệt authentication, role, capability, ownership và tenant.

Yêu cầu:
- Account: user chỉ quản lý tài khoản của mình.
- Admin: bắt buộc role/capability admin phía server.
- AI/assistant/scan/deep scan/report/policy: kiểm tra owner, project, organization, quota và permission.
- GitHub: kiểm tra owner của repository/installation và OAuth scope.
- Payment: không tin userId, plan, price hoặc amount từ client.
- Mặc định fail closed khi thiếu actor/tenant/permission.
- Public login/register/reset phải dùng rate limit.
- OAuth callback dùng state, expiry, redirect allowlist và PKCE nếu hỗ trợ.
- Webhook dùng raw-body signature, timestamp, replay protection và idempotency.
- Không thêm session auth vào webhook thay cho signature.

Thêm test:
- anonymous;
- authenticated owner;
- authenticated non-owner;
- user thuộc tenant khác;
- admin hợp lệ;
- admin không đủ capability;
- resource không tồn tại.

GIAI ĐOẠN 6 — CWE-639: IDOR

Tại adminRoutes.js và mọi route nhận ID:
- Không tin `req.params.id`, userId, ownerId, organizationId hoặc repositoryId.
- Query phải ràng buộc theo actor/tenant hoặc kiểm tra capability admin.
- Kiểm tra quyền trước khi đọc/sửa/xóa.
- Chống mass assignment bằng allowlist field.
- Dùng 404 khi cần tránh tiết lộ resource.
- Test đổi ID sang tài nguyên của người khác.
- Test cross-tenant và admin access.

GIAI ĐOẠN 7 — CWE-614: COOKIE

Tập trung cookie options vào một helper:
- httpOnly cho session/access/refresh token.
- secure trong production.
- sameSite phù hợp với OAuth.
- `sameSite: none` bắt buộc `secure: true`.
- path/domain tối thiểu.
- maxAge/expires phù hợp.
- clearCookie dùng cùng path/domain/sameSite/secure.
- Không làm hỏng development HTTP.
- Cấu hình trust proxy theo số hop/subnet cụ thể.
- Test Set-Cookie ở development và production.
- Test JavaScript không đọc được cookie nhạy cảm.

GIAI ĐOẠN 8 — CWE-307: RATE LIMIT

Với login/reset/verification:
- Rate limit theo IP và identifier chuẩn hóa khi phù hợp.
- Không tin X-Forwarded-For ngoài trusted proxy.
- Chống account enumeration.
- Có Retry-After và window hợp lý.
- Không tạo permanent account lockout.
- Production nhiều instance phải dùng shared store hoặc ghi rõ blocker.
- Test vượt limit, reset window và proxy spoofing.

GIAI ĐOẠN 9 — CWE-326 VÀ CWE-200

RSA:
- Xác định đây là crypto runtime hay scanner fixture.
- Runtime RSA tối thiểu 2048 bit; ưu tiên 3072 nếu tương thích.
- Không đưa private key vào frontend.
- Không phá dữ liệu hiện có nếu chưa có migration.
- Fixture phải được đánh dấu đúng thay vì làm mất khả năng tự kiểm thử của scanner.

Debug:
- Xóa hoặc redact token, cookie, authorization, secret và PII.
- Production không trả stack trace cho client.
- Dùng structured logging.
- Thêm correlation ID.
- Debug log chỉ bật rõ ràng trong development.
- Viết test redaction.

GIAI ĐOẠN 10 — AUTO-PATCH HUB

Sửa pipeline và giao diện Auto-Patch:
- Không sử dụng `// Chưa có patch code` như bản vá.
- Không có patch thì trả:
  `available: false`, `after: null`, `unifiedDiff: null`,
  cùng `reasonUnavailable`.
- Disable Apply khi patch không tồn tại.
- Chỉ hiển thị unified diff hợp lệ.
- YAML phải dùng cú pháp YAML; không chèn comment JavaScript.
- Trạng thái:
  detected → triaged → proposed → applied → verified.
- “Đã vá” chỉ đếm verified.
- Apply patch phải:
  - giới hạn file trong repository;
  - chặn path traversal;
  - chặn symlink escape;
  - tạo backup;
  - phát hiện conflict;
  - validation;
  - rollback nếu thất bại;
  - rescan trước khi đánh dấu verified.
- “Vá tất cả” không tự động áp dụng authorization/IDOR patch thiếu policy rõ ràng.

GIAI ĐOẠN 11 — QA CHỨC NĂNG

Kiểm tra các luồng:
- đăng ký, đăng nhập, đăng xuất;
- refresh/session;
- quên và đặt lại mật khẩu;
- account settings;
- admin dashboard;
- scan và deep scan;
- AI assistant;
- GitHub OAuth/repository;
- report/export;
- pricing/payment/webhook;
- quota/paywall;
- error handling;
- loading/empty/error states.

Chỉ dùng mock, contract test và webhook ký cục bộ. Không gọi production provider.

GIAI ĐOẠN 12 — QA FRONTEND

Kiểm tra:
- console errors;
- failed network requests;
- React error boundary;
- keyboard navigation;
- focus trap;
- accessible labels;
- dialog semantics;
- responsive layout;
- zoom 200%;
- loading/error states;
- XSS trong dữ liệu finding, filename, diff và AI output;
- không render HTML không tin cậy;
- diff lớn không làm treo UI.

Tự động hóa axe nếu phù hợp. Không tuyên bố Safari/screen reader pass nếu chưa thực sự kiểm tra.

GIAI ĐOẠN 13 — XÁC MINH CUỐI

Sau mỗi nhóm sửa:
1. Chạy test liên quan.
2. Chạy toàn bộ test.
3. Build.
4. Rescan.
5. So sánh findings trước/sau.
6. Kiểm tra không phát sinh regression.

Chạy tối thiểu:
- npm run lint nếu có;
- npm run typecheck nếu có;
- npm test;
- npm run qa:security;
- npm run build;
- npm audit --omit=dev --audit-level=high;
- docker compose config;
- docker build -t lunar:security-qa-fixed .;
- smoke test bằng port QA riêng;
- git diff --check.

Nếu thiếu script, ghi rõ. Không giả vờ đã chạy.

ĐẦU RA BẮT BUỘC

Tạo:
1. QA_SECURITY_TRIAGE_REPORT.md
2. QA_SECURITY_REMEDIATION_REPORT.md
3. AUTHORIZATION_MATRIX.md
4. AUTO_PATCH_DESIGN.md
5. PRODUCTION_READINESS_CHECKLIST.md

Báo cáo cuối phải nêu:
- 47 findings ban đầu.
- Số True Positive.
- Số False Positive.
- Số Needs Review.
- Số proposed/applied/verified.
- File và endpoint đã sửa.
- Test đã chạy và kết quả thật.
- Finding còn lại.
- Rủi ro còn lại.
- Secret cần rotate.
- Kiểm thử thủ công còn thiếu.
- Breaking change nếu có.
- Kế hoạch rollback.

Kết thúc bằng:
- git diff --stat
- git diff --check
- git status --short
- danh sách test pass/fail
- không commit, push hoặc deploy.