Bạn là Principal Application Security Engineer và Senior Node.js Engineer.

Hãy kiểm tra, phân loại và khắc phục 50 phát hiện SAST của dự án Lunar AI Code Review Platform. Thực hiện thay đổi trực tiếp trong repository nhưng KHÔNG commit, push, deploy hoặc sử dụng credential production.

THÔNG TIN PHÁT HIỆN
- 4 Critical
- 36 High
- 9 Medium
- 1 Low
- Mức cao nhất: CVSS 9.8
- Nhóm chính:
  - CWE-798: hard-coded/default secrets
  - CWE-78: OS command execution
  - CWE-862: thiếu authorization
  - CWE-639: IDOR
  - CWE-614: cookie thiếu thuộc tính an toàn
  - CWE-307: thiếu throttling
  - CWE-326: RSA key yếu
  - CWE-200: debug output nhạy cảm

LƯU Ý QUAN TRỌNG
Scanner là công cụ heuristic. Không mặc định mọi phát hiện đều là True Positive. Phải đọc toàn bộ luồng route → middleware → controller/service → database trước khi phân loại.

Không áp dụng bản vá giả như:

DATABASE_URL: postgresql://${USER:-admin}:${PASSWORD:-default_password}@db/db
# SECURE FIX

Việc thêm comment nhưng giữ secret mặc định KHÔNG phải bản vá.

PHẠM VI QUYỀN
Được phép:
- Đọc và sửa file trong repository.
- Tạo middleware, helper, test và tài liệu.
- Cài dependency cần thiết.
- Chạy lint, typecheck, test, SAST, build và Docker QA.
- Sửa cấu hình Docker/Compose/CI.

Không được phép:
- Deploy hoặc thay container production.
- Commit, push, merge hoặc tạo release.
- Đọc/in/log secret thật.
- Gọi GitHub OAuth, SMTP, payment hoặc AI gateway production.
- Tắt scanner/rule hoặc dùng `|| true` để che lỗi.
- Hạ security threshold chỉ để CI xanh.
- Xóa chức năng nếu chưa chứng minh đó là cách sửa phù hợp.

GIAI ĐOẠN 1 — BASELINE VÀ TRIAGE

1. Đọc:
   - AGENTS.md nếu có
   - package.json và package-lock.json
   - Dockerfile và docker-compose.yml
   - server/index.js
   - middleware authentication/authorization
   - toàn bộ route bị cảnh báo
   - sastEngine.js và securityScannerEngine.js
   - schema.sql và connection.js
   - test hiện tại

2. Chạy:
   - git status --short
   - npm test nếu có
   - npm run lint nếu có
   - npm run typecheck nếu có
   - npm run qa:security nếu có
   - npm run build

3. Lập bảng cho từng phát hiện:
   - ID/CWE
   - file và dòng
   - source dữ liệu
   - sink nguy hiểm
   - middleware kế thừa
   - exploit path
   - True Positive / False Positive / Needs Review
   - bằng chứng
   - phương án sửa
   - test hồi quy cần thêm

4. Không dùng CVSS tổng hợp sai. Ghi rõ CVSS là theo từng phát hiện và 9.8 là mức tối đa.

GIAI ĐOẠN 2 — CWE-798: SECRETS TRONG DOCKER COMPOSE

Kiểm tra docker-compose.yml dòng 20, 81 và toàn bộ manifest.

Yêu cầu:
- Xóa mọi mật khẩu/token/key mặc định khỏi file được commit.
- Không dùng fallback kiểu:
  ${PASSWORD:-lunar_local_password}
- Với biến bắt buộc, dùng fail-fast:
  ${LUNAR_POSTGRES_PASSWORD:?LUNAR_POSTGRES_PASSWORD is required}
- Ưu tiên Docker Compose secrets khi phù hợp.
- Cho phép file `.env.example` chỉ chứa placeholder, không chứa secret hoạt động.
- Bảo đảm `.env`, secret files và credential artifacts nằm trong `.gitignore`.
- Nếu ứng dụng cần đọc Docker secret, hỗ trợ biến `*_FILE` hoặc `/run/secrets/...`.
- Không truyền secret bằng Dockerfile ARG/ENV trong build stage.
- Kiểm tra secret có từng được commit hay không; nếu có, ghi rõ cần rotate ngoài phạm vi code.
- Thêm validation startup để production fail closed khi thiếu secret.
- Development có thể sử dụng file local không commit, nhưng không đặt password mặc định trong Compose.

Ví dụ mục tiêu hợp lệ:

environment:
  LUNAR_POSTGRES_USER: ${LUNAR_POSTGRES_USER:-lunar_admin}
  LUNAR_POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password

secrets:
  - postgres_password

Và chỉ khai báo secret từ file hoặc secret manager do operator cung cấp.

GIAI ĐOẠN 3 — CWE-78: COMMAND EXECUTION

Các vị trí trọng yếu:
- server/services/sastEngine.js quanh dòng 105
- src/services/securityScannerEngine.js quanh dòng 106

Với từng vị trí:
1. Truy ngược dữ liệu từ HTTP/UI/repository input tới command sink.
2. Xác định đây là chức năng chạy scanner có chủ đích hay command injection thật.
3. Ưu tiên loại bỏ shell command và dùng Node API/library trực tiếp.
4. Nếu bắt buộc chạy process:
   - dùng spawn hoặc execFile;
   - shell: false;
   - executable phải là allowlist cố định;
   - arguments là mảng tách biệt;
   - không nối chuỗi lệnh;
   - không cho phép user chọn executable;
   - canonicalize và giới hạn path trong workspace scan;
   - chặn `..`, symlink escape và path ngoài scan root;
   - giới hạn timeout, stdout/stderr, memory và concurrency;
   - sử dụng working directory tạm biệt lập;
   - không truyền toàn bộ process.env;
   - không chạy với root;
   - không mount Docker socket;
   - kill process tree khi timeout.
5. Không coi regex escape shell là biện pháp chính.
6. Nếu scanner chạy mã repository không tin cậy, thực thi trong container/sandbox riêng, read-only filesystem khi có thể, không network và không secret.
7. Viết test với payload:
   - `; touch /tmp/pwned`
   - `&& whoami`
   - `$(id)`
   - backticks
   - newline
   - option injection như `--config`
   - path traversal
8. Test phải chứng minh payload không tạo side effect.

OWASP ưu tiên tránh gọi OS command trực tiếp; nếu bắt buộc thì tách executable và arguments, dùng allowlist và cô lập quá trình.

GIAI ĐOẠN 4 — CWE-862 VÀ CWE-639

Không thêm `auth` lên mọi route một cách máy móc.

Với từng endpoint:
- Xác định route public hay protected.
- Kiểm tra middleware cấp app, parent router, router.use và controller.
- Phân biệt authentication, role permission, ownership và tenant isolation.

Yêu cầu:
- Account route: người dùng chỉ truy cập tài nguyên của mình.
- Admin route: bắt buộc authentication và capability/role admin.
- AI/assistant/deep scan/report/policy/scan: kiểm tra owner, organization, project, quota và quyền hành động.
- GitHub route: kiểm tra owner của installation/repository và OAuth scope.
- Payment route: không tin userId, plan, price hoặc amount từ client.
- Truy vấn database phải ràng buộc theo owner/tenant, không chỉ kiểm tra record tồn tại.
- Chống mass assignment bằng allowlist field.
- Dùng 404 thay 403 khi cần tránh resource enumeration.
- Mặc định fail closed nếu thiếu actor, tenant hoặc permission.

Các route bắt buộc public cần biện pháp khác:
- Login/register/reset: rate limit và chống enumeration.
- OAuth callback: state một lần, expiry, redirect allowlist, PKCE nếu hỗ trợ.
- Webhook: raw-body signature, timestamp window, replay protection và idempotency.
- Healthcheck: không trả secret hoặc chi tiết nội bộ.

Thêm authorization matrix và test:
- anonymous;
- authenticated owner;
- authenticated non-owner;
- cross-tenant user;
- admin hợp lệ;
- admin không đủ capability;
- ID bị sửa;
- record không tồn tại.

GIAI ĐOẠN 5 — CWE-614: COOKIE

Tập trung cấu hình cookie vào một helper duy nhất.

Yêu cầu:
- httpOnly: true với session/access/refresh token.
- secure: true trong production.
- sameSite theo đúng luồng, không mặc định `none`.
- Nếu sameSite `none`, bắt buộc secure.
- path/domain phải tối thiểu.
- maxAge/expires phù hợp.
- clearCookie phải dùng cùng path/domain/sameSite/secure.
- Không làm hỏng local HTTP development.
- Nếu sau reverse proxy, cấu hình trust proxy bằng số hop/subnet rõ ràng; không tùy tiện `true`.
- Không lưu access token vào cookie không HttpOnly.
- Thêm test Set-Cookie cho development và production.

GIAI ĐOẠN 6 — CWE-307: RATE LIMIT

Áp dụng cho login và các authentication endpoint nhạy cảm:
- Rate limit theo IP và identifier chuẩn hóa khi phù hợp.
- Không tin `X-Forwarded-For` nếu proxy chưa được cấu hình.
- Production multi-instance phải dùng shared store, không dựa vào memory store.
- Response không tiết lộ account tồn tại.
- Có retry-after và window hợp lý.
- Tránh permanent account lockout/DoS.
- Thêm test vượt giới hạn và reset window.

GIAI ĐOẠN 7 — CWE-326: RSA KEY SIZE

Kiểm tra src/services/securityScannerEngine.js:
- Xác định key dùng cho production cryptography hay chỉ là rule/test fixture.
- Nếu là mã tạo khóa thật, sử dụng RSA tối thiểu 2048 bit; ưu tiên 3072 bit khi phù hợp.
- Không đổi thuật toán hoặc kích thước nếu làm hỏng định dạng dữ liệu hiện hữu mà chưa có migration.
- Nếu chỉ là mẫu scanner dùng để phát hiện code yếu, phân loại False Positive và chứng minh file đó không thực thi tạo key.
- Thêm test xác nhận kích thước key.
- Không đưa private key vào frontend.

GIAI ĐOẠN 8 — CWE-200: DEBUG OUTPUT

- Xóa console/debug chứa token, cookie, code riêng tư, stack trace hoặc PII.
- Tạo structured logger có redaction.
- Production không trả stack trace cho client.
- Log correlation ID nhưng không log secret.
- Cho phép debug chỉ khi explicit development flag.
- Thêm test đảm bảo dữ liệu nhạy cảm bị che.

GIAI ĐOẠN 9 — SAST ENGINE SELF-AUDIT

Dự án này tự xây dựng scanner, nên kiểm tra chất lượng rule:
- Rule “route thiếu authorization” phải hiểu middleware cấp router/app.
- Rule secret không được đề xuất thêm comment rồi giữ nguyên secret.
- Rule command execution phải phân biệt fixed executable với user-controlled command.
- Rule RSA phải phân biệt production code với scanner fixture.
- Auto-Patch Hub chỉ hiển thị nút vá khi có patch có thể áp dụng và kiểm thử.
- Không ghi “Đã vá” nếu diff không thay đổi exploit path.
- Thêm confidence/evidence và trạng thái Needs Review.
- Sửa số lượng tổng để:
  Critical + High + Medium + Low = Total.
- Phân biệt “maximum finding CVSS” với “project risk score”.

GIAI ĐOẠN 10 — XÁC MINH

Chạy các lệnh có sẵn:
- npm run lint
- npm run typecheck
- npm test
- npm run qa:security
- npm run build
- npm audit --omit=dev --audit-level=high
- docker compose config
- docker build -t lunar:security-remediated .
- smoke test container trên port QA riêng

Không sử dụng `|| true`. Nếu script không tồn tại, ghi rõ.

Tạo:
1. SECURITY_TRIAGE_REPORT.md
2. SECURITY_REMEDIATION_REPORT.md
3. AUTHORIZATION_MATRIX.md
4. PRODUCTION_SECURITY_CHECKLIST.md

Mỗi finding phải có:
- trạng thái trước/sau;
- bằng chứng;
- file/dòng sau sửa;
- test chứng minh;
- rủi ro còn lại.

Kết thúc bằng:
- git diff --check
- git diff --stat
- git status --short
- danh sách test pass/fail
- số True Positive đã vá
- số False Positive
- số Needs Review
- các secret cần rotate ngoài repository

Dừng trước commit, push, merge hoặc deploy.

---

## KẾT QUẢ THỰC THI - 2026-07-31

Trạng thái: **IMPLEMENTED, LOCAL QA PASS, NOT DEPLOYED**.

- Đã đối soát đủ 50 finding theo tổng severity của task card: 13 True Positive, 37 False Positive, 0 Needs Review trên code hiện tại.
- Đã xóa PostgreSQL password mặc định trong Compose và thêm runtime secret file support.
- Đã bổ sung IP + identifier throttling, payment webhook timestamp freshness, cookie policy tập trung và owner/admin regression.
- Đã sửa SAST/Auto-Patch: finding mặc định Needs Review, có evidence/confidence, không sinh patch comment giả; UI chỉ áp dụng patch đã đánh dấu validated.
- Báo cáo: `SECURITY_TRIAGE_REPORT.md`, `SECURITY_REMEDIATION_REPORT.md`, `AUTHORIZATION_MATRIX.md`, `PRODUCTION_SECURITY_CHECKLIST.md`.
- Đã pass: `npm run qa:security`, `npm run qa:sast`, `npm run build`, browser auth lifecycle, production routing, a11y, `npm run qa:docker` và production dependency audit.
- Docker image `lunar:security-remediated` đã build và smoke trên cổng QA riêng; disposable container/volume đã được xóa, container hiện hữu `5050/5433` không bị thay đổi.
- Không commit, push, merge, deploy, gọi provider thật hoặc đọc credential production.
