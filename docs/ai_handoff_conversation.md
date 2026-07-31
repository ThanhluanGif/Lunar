# Bàn giao công việc Lunar cho AI tiếp theo

Cập nhật lần cuối: 29/07/2026 (Asia/Bangkok)

## 1. Mục tiêu của người dùng

Dự án cần kết hợp:

- Giao diện từ nhánh `mac`.
- Backend, dashboard dữ liệu thật, phân quyền và bảo mật từ nhánh Acer.
- Kiểm thử đầy đủ trước khi đưa lên `main`.
- Chỉ chuyển sang `production` sau một vòng QA riêng và có yêu cầu rõ ràng từ người dùng.

Người dùng cũng muốn:

- Dashboard không dùng dữ liệu giả.
- Phân quyền rõ cho guest, các cấp người dùng và admin.
- Admin xem được thông tin hữu ích và có thể thực hiện các thao tác quản trị có audit.
- Đăng nhập GitHub, đồng bộ repository với email/tài khoản người dùng.
- Quét repository sâu và đánh giá bằng AI thật.

## 2. Repository và trạng thái Git

- Repository: `https://github.com/ThanhluanGif/Lunar.git`
- Nhánh làm việc hiện tại: `acer-dashboard-live-data`
- Commit hiện tại: `489e9ca34e0c26056dd47dd8edf23cf001adff34`
- `origin/acer-dashboard-live-data`: `489e9ca`
- `origin/main`: `489e9ca`
- `origin/mac`: `d21d2b1`
- Working tree sạch tại thời điểm tạo tài liệu này.

Nhánh `mac` đã được đưa đầy đủ vào lịch sử nhánh Acer. `main` đã được cập nhật bằng fast-forward đến `489e9ca`, không có conflict.

Không được tự ý merge hoặc deploy sang `production` nếu người dùng chưa yêu cầu rõ.

## 3. Các phần đã hoàn thành

### Đồng bộ Mac UI và Acer backend

- Giữ giao diện dashboard từ Mac.
- Kết nối dashboard với API/backend và dữ liệu PostgreSQL.
- Đồng bộ `mac`, Acer và `main`.

### Dashboard và phân quyền

- Dữ liệu dashboard được lấy từ backend/persistence thay vì mock.
- Kiểm tra quyền guest, user và admin.
- Admin API hỗ trợ dữ liệu quản trị và hành động có audit.
- Có bảng/luồng lưu audit cho thao tác admin.

### GitHub

- Có luồng đăng nhập GitHub phía backend.
- Có đồng bộ repository gắn với người dùng.
- Có deep repository scan được xác thực và giới hạn tài nguyên.
- GitHub CLI đã đăng nhập tài khoản `ThanhluanGif`.
- Nếu lệnh `gh` không có trong `PATH`, dùng:

```powershell
& 'C:\Program Files\GitHub CLI\gh.exe' auth status
```

### AI và SAST

- AI request đi qua backend; API key không đưa ra frontend.
- Hỗ trợ adapter Gemini, OpenAI và Anthropic.
- Gemini mặc định dùng model `gemini-2.5-flash`.
- Có quota AI theo gói: FREE 3/ngày, PRO 50/ngày, Enterprise không giới hạn.
- Khi chưa cấu hình API key, API trả lỗi fail-closed thay vì tạo kết quả giả.
- Có Babel AST cho JavaScript/TypeScript.
- Scanner hỗ trợ 22 ngôn ngữ với 555 chữ ký rule.
- Deep scan có giới hạn số file, tổng dung lượng và concurrency.

### Thanh toán và bảo mật

- Có luồng VietQR/payment và tier enforcement.
- Có middleware xác thực, rate limit, input sanitization và security headers.
- Database có các bảng cần thiết cho AI usage, vulnerability file path, dashboard và audit.
- `npm audit` gần nhất không phát hiện lỗ hổng.

## 4. Kết quả kiểm thử gần nhất

Lệnh:

```powershell
npm run qa
```

Kết quả:

- Frontend build: PASS
- Backend health: HEALTHY
- PostgreSQL: CONNECTED
- Security health: SECURE
- Guest access: PASS
- User RBAC: PASS
- Admin RBAC: PASS
- Persisted dashboard: PASS
- AI fail-closed: PASS
- Deep scan guard: PASS
- SAST signatures: 555
- Audited admin actions: 23
- Payment flow: SUCCESS

Docker cũng đã được build và chạy thành công:

- App: `http://localhost:5000`
- Readiness: `http://localhost:5000/api/v1/ready`
- PostgreSQL host port: `5433`
- Container `lunar-db-1`: healthy
- Container `lunar-app-1`: running

GitHub Actions trên `main`:

- Workflow: `QA Gate`
- Run: `https://github.com/ThanhluanGif/Lunar/actions/runs/30435062172`
- Kết quả: PASS

Có cảnh báo không chặn build: một số GitHub Actions phiên bản cũ khai báo Node.js 20 và runner đang ép chạy Node.js 24.

## 5. Các commit quan trọng

- `489e9ca` — Implement real AI reviews and deep repository scanning
- `b41a96d` — Add secure GitHub login and repository sync
- `c4427cc` — Merge `origin/main` vào nhánh dashboard Acer
- `7b82b2d` — Merge bảo mật, loại bỏ hardcoded secrets
- `d21d2b1` — README và `.env.example` phía Mac, loại bỏ secrets
- `7e99e17` — Tích hợp Mac UI với Acer backend

## 6. File và khu vực quan trọng

- `server/routes/adminRoutes.js`
- `server/routes/aiRoutes.js`
- `server/routes/dashboardRoutes.js`
- `server/routes/deepScanRoutes.js`
- `server/routes/githubAuthRoutes.js`
- `server/routes/scanRoutes.js`
- `server/services/sastEngine.js`
- `server/schema.sql`
- `src/components/AdminDashboard.jsx`
- `src/components/LunarDashboard.jsx`
- `src/components/UserGitHubWorkspace.jsx`
- `src/services/aiReviewEngine.js`
- `src/services/astParser.js`
- `src/services/lunarApi.js`
- `scripts/qa-smoke.cjs`
- `.github/workflows/qa.yml`
- `docs/phase1_phase2_implementation_report.md`

## 7. Cấu hình cần hoàn thiện

Không ghi bất kỳ secret thật nào vào Git hoặc tài liệu.

Người dùng từng cung cấp ảnh màn hình có GitHub OAuth Client Secret. Secret đó đã bị lộ trong cuộc trò chuyện và cần được revoke/rotate trước khi sử dụng.

Callback trong ảnh là callback của Supabase:

```text
https://<supabase-project>.supabase.co/auth/v1/callback
```

Backend tùy chỉnh hiện dùng callback dạng:

```text
http(s)://<app-host>/api/v1/auth/github/callback
```

AI tiếp theo cần xác định người dùng muốn dùng một trong hai kiến trúc:

1. GitHub OAuth thông qua Supabase Auth; hoặc
2. GitHub OAuth App gọi trực tiếp backend Lunar.

Không trộn Client ID/Secret và callback của hai kiến trúc nếu chưa thiết kế luồng rõ ràng.

Các biến môi trường cần tham khảo trong `.env.example`. Chỉ cấu hình qua môi trường local/deployment, không commit `.env`.

## 8. Việc nên làm tiếp

Ưu tiên đề xuất:

1. Rotate GitHub OAuth Client Secret đã lộ.
2. Chọn dứt điểm Supabase OAuth hoặc backend OAuth.
3. Cấu hình OAuth callback đúng với môi trường local và production.
4. Cấu hình ít nhất một AI provider key và chạy một bài test AI thật end-to-end.
5. Test đăng nhập GitHub bằng tài khoản thật, kiểm tra email mapping và đồng bộ repository.
6. Test admin can thiệp dữ liệu và xác minh audit log.
7. Nâng `actions/checkout` và `actions/setup-node` khi phiên bản mới phù hợp để loại cảnh báo runtime.
8. Chạy lại `npm run qa`, Docker readiness và GitHub Actions.
9. Chỉ khi tất cả đạt và người dùng xác nhận mới triển khai `production`.

## 9. Các lệnh kiểm tra nhanh

```powershell
git status -sb
git fetch --prune origin
git log --oneline --decorate --graph --all -20
npm run qa
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
Invoke-RestMethod http://localhost:5000/api/v1/ready
```

Để xem CI:

```powershell
& 'C:\Program Files\GitHub CLI\gh.exe' run list `
  --repo ThanhluanGif/Lunar `
  --branch main `
  --limit 5
```

## 10. Nguyên tắc bàn giao

- Đọc trạng thái Git trước khi sửa.
- Không ghi đè thay đổi chưa commit của người dùng.
- Làm việc và kiểm thử trên nhánh Acer/feature trước.
- Không force-push.
- Không đưa secret vào source, log, ảnh hoặc tài liệu.
- Không deploy production nếu chưa có xác nhận rõ.
- Sau mỗi thay đổi backend/dashboard, kiểm tra cả RBAC, persistence, audit và Docker.
