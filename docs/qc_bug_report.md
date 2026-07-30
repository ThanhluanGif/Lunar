# Báo cáo lỗi QC

> Cập nhật triển khai 2026-07-30: BUG-001, BUG-002, BUG-003, BUG-004, BUG-005,
> BUG-006, BUG-007, BUG-011, BUG-014, BUG-015 và BUG-017 đã được sửa ở mức code.
> BUG-008/009/012/013 đã được cải thiện một phần. Các kết luận gốc bên dưới được
> giữ lại làm baseline QC; xem `development_roadmap.md` để biết evidence và phần
> còn chờ E2E.

## 1. Kết quả chạy kiểm tra

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Cài dependency sạch | PASS | `npm ci`: 267 packages, 0 vulnerability |
| Production frontend build | PASS | Vite 8.1.5, 1534 modules transformed |
| Dependency vulnerability audit | PASS | `npm audit --omit=dev`: 0 vulnerability |
| Full smoke QA | BLOCKED | `/ready` trả 503 vì `ECONNREFUSED 127.0.0.1:5433` |
| Unit/component tests | KHÔNG CÓ | Không tìm thấy `*test*` hoặc `*spec*`; chỉ có smoke scripts |
| Lint/typecheck | KHÔNG CÓ | `package.json` không có script lint/typecheck |

Build đã làm thay đổi generated `dist/index.html`; file này đã được hoàn nguyên sau kiểm tra. Database và `.env` không bị thay đổi.

## 2. Danh sách lỗi

### BUG-001 — Mock payment webhook còn khả dụng trong production

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **Critical** |
| Bước tái hiện | Triển khai bằng Docker Compose mặc định; tạo order hợp lệ; gọi `POST /api/v1/payment/mock-webhook` với order code và header dùng development default được công bố trong cấu hình |
| Hiện tại | Endpoint có thể chuyển payment sang SUCCESS và cập nhật tier user (`paymentRoutes.js:333-400`) |
| Mong đợi | Production không đăng ký endpoint mock; tier chỉ được cấp bởi signed gateway webhook hoặc admin action có audit |
| Nguyên nhân dự kiến | Test endpoint được để chung production router; Compose có secret development mặc định |
| File liên quan | `server/routes/paymentRoutes.js:333`, `docker-compose.yml` |

### BUG-002 — Giá Enterprise không khớp giữa UI và backend

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **High** |
| Bước tái hiện | Mở Pricing; chọn Enterprise; so giá hiển thị với `amount` trả về từ `/payment/create-order` |
| Hiện tại | UI hiển thị 690.000đ/tháng; backend tạo order 1.500.000 VND |
| Mong đợi | Một mức giá duy nhất từ catalog server-authoritative |
| Nguyên nhân dự kiến | Giá hard-code ở hai lớp |
| File liên quan | `src/components/PricingModal.jsx:77-90`, `server/routes/paymentRoutes.js:56` |

### BUG-003 — “Create GitHub PR” trả thành công giả

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **High** |
| Bước tái hiện | Mở repair workbench, sinh patch, chọn tạo PR |
| Hiện tại | Client đợi 1,2 giây rồi trả PR number/URL ngẫu nhiên; không gọi GitHub API |
| Mong đợi | Tạo branch, commit và PR thật hoặc hiển thị rõ “demo” và không tuyên bố thành công |
| Nguyên nhân dự kiến | Service mock được nối trực tiếp vào production UI |
| File liên quan | `src/services/githubBotService.js:35-45`, `src/components/CodeRepairWorkbench.jsx:132` |

### BUG-004 — GitHub webhook không xác minh chữ ký và trả SAST giả

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **High** |
| Bước tái hiện | Gửi POST bất kỳ tới `/api/v1/github/webhook` với `x-github-event: pull_request` |
| Hiện tại | Request không ký vẫn nhận kết quả COMPLETED với finding hard-code |
| Mong đợi | Verify `X-Hub-Signature-256`, delivery id/event/action, chống replay; fetch diff và scan thật |
| Nguyên nhân dự kiến | Endpoint scaffold/mock chưa được khóa |
| File liên quan | `server/routes/githubRoutes.js:9-53` |

### BUG-005 — Quota renewal trên UI chỉ sửa localStorage

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **High** |
| Bước tái hiện | User Free nhấn gia hạn quota; refresh hoặc gọi scan API |
| Hiện tại | UI giảm `daily_scans_used`, cộng karma trong state/localStorage; không gọi `/scans/renew-quota` |
| Mong đợi | Gọi backend, dùng response authoritative, xử lý loading/error/idempotency |
| Nguyên nhân dự kiến | `lunarApi` thiếu method renew; handler legacy còn lại |
| File liên quan | `src/App.jsx:354-366`, `server/routes/scanRoutes.js:250`, `src/services/lunarApi.js` |

### BUG-006 — Export PDF không tạo PDF và route trả dữ liệu mẫu

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **High** |
| Bước tái hiện | Mở Audit Report, chọn download; hoặc POST `{}` tới `/api/v1/reports/export` |
| Hiện tại | UI mở HTML print dialog; API trả 2 finding mặc định và `downloadUrl` không có endpoint |
| Mong đợi | PDF thật từ dữ liệu scan được phép truy cập; URL download tồn tại |
| Nguyên nhân dự kiến | Hai prototype export độc lập, chưa tích hợp |
| File liên quan | `AuditReportExportModal.jsx:71-108`, `reportRoutes.js:8-32` |

### BUG-007 — Stored/reflected HTML injection trong cửa sổ report

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **High** |
| Bước tái hiện | Tạo/chọn project có title chứa HTML/script payload; mở report download |
| Hiện tại | `project.title` được nội suy trực tiếp vào HTML rồi `document.write` |
| Mong đợi | Escape/sanitize dữ liệu hoặc dùng DOM text nodes/template PDF an toàn |
| Nguyên nhân dự kiến | Dựng HTML bằng template string từ dữ liệu không tin cậy |
| File liên quan | `src/components/AuditReportExportModal.jsx:75-100` |

### BUG-008 — Dashboard hiển thị dữ liệu hard-code lẫn dữ liệu thật

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **Medium** |
| Bước tái hiện | Đăng nhập, mở Dashboard và so repository/recent review với API/database |
| Hiện tại | Overview gọi API nhưng repo/review và một số scan input được tạo từ mock cố định |
| Mong đợi | Mọi KPI/list có source rõ ràng; demo data được gắn nhãn |
| Nguyên nhân dự kiến | Figma mock được giữ lại sau khi tích hợp backend |
| File liên quan | `src/components/LunarDashboard.jsx:38,102,844` |

### BUG-009 — Supabase Realtime được quảng bá nhưng code không thể chạy

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **Medium** |
| Bước tái hiện | Cấu hình Supabase, mở app/admin, cập nhật record từ client khác |
| Hiện tại | Effect trả về ngay trước code load/subscription; code sau đó unreachable |
| Mong đợi | Realtime hoạt động hoặc tài liệu/UI bỏ tuyên bố realtime |
| Nguyên nhân dự kiến | Legacy integration bị vô hiệu bằng early return |
| File liên quan | `src/App.jsx:101-159`, `src/components/AdminDashboard.jsx:67-117` |

### BUG-010 — Security policy mất sau restart và không tác động scan

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **Medium** |
| Bước tái hiện | POST policy mới; restart server; chạy scan |
| Hiện tại | Policy lưu array RAM, mất khi restart và scanner không đọc policy |
| Mong đợi | Persistent, scoped theo owner/org, versioned và được scanner áp dụng |
| Nguyên nhân dự kiến | API prototype chưa có schema/service integration |
| File liên quan | `server/routes/policyRoutes.js:5-77` |

### BUG-011 — Renewal quota không atomic

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **Medium** |
| Bước tái hiện | Gọi renew khi update user thành công nhưng insert `quota_logs` thất bại |
| Hiện tại | Quota/karma có thể đã đổi nhưng audit log không có; không BEGIN/ROLLBACK |
| Mong đợi | Update và audit log trong một transaction; chống gửi lặp |
| Nguyên nhân dự kiến | Hai query độc lập |
| File liên quan | `server/routes/scanRoutes.js:259-272` |

### BUG-012 — UI không có responsive breakpoints

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **Medium** |
| Bước tái hiện | Mở các dashboard/modal ở 320px, tablet portrait và zoom 200% |
| Hiện tại | Không có `@media` trong `src`; nhiều layout/inline fixed sizing chỉ dựa vào flex-wrap |
| Mong đợi | Không tràn ngang/cắt nội dung; navigation, table và modal dùng được bằng touch/zoom |
| Nguyên nhân dự kiến | Thiết kế desktop-first, CSS phân tán trong inline style |
| File liên quan | `src/components/*.jsx`, `src/styles/index.css` |

### BUG-013 — Modal accessibility không nhất quán

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **Medium** |
| Bước tái hiện | Chỉ dùng keyboard mở/đóng và tab qua Auth/Pricing/Report/GitBot modal |
| Hiện tại | Một số modal có role/label, nhưng thiếu focus trap, initial focus, restore focus và Escape đồng nhất |
| Mong đợi | WCAG 2.1 AA dialog behavior |
| Nguyên nhân dự kiến | Modal tự viết riêng lẻ |
| File liên quan | `src/components/AuthModal.jsx`, `PricingModal.jsx`, `AuditReportExportModal.jsx`, `GitBotConfigModal.jsx` |

### BUG-014 — Không có 403/500 UI và React error boundary

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **Medium** |
| Bước tái hiện | Gây component exception hoặc backend 500/403 ngoài các handler riêng |
| Hiện tại | Có 404; không có error boundary/page 403/500 chuẩn |
| Mong đợi | Fallback UI, correlation id/retry/navigation phù hợp |
| Nguyên nhân dự kiến | Error handling theo từng component, chưa có app-level strategy |
| File liên quan | `src/App.jsx`, `src/components/NotFoundPage.jsx` |

### BUG-015 — API export không xác thực và không validate payload

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **Medium** |
| Bước tái hiện | Gọi anonymous POST `/api/v1/reports/export` với payload lớn/sai kiểu |
| Hiện tại | Trả success và dựng report từ dữ liệu client; không verify ownership |
| Mong đợi | Auth, server-side scan lookup/ownership, schema validation, size limit riêng |
| Nguyên nhân dự kiến | Prototype route |
| File liên quan | `server/routes/reportRoutes.js:8` |

### BUG-016 — Full QA không tự dựng dependency database

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **Medium** |
| Bước tái hiện | Từ checkout sạch, chạy `npm ci && npm run qa` khi PostgreSQL chưa chạy |
| Hiện tại | Build PASS rồi timeout readiness/ECONNREFUSED |
| Mong đợi | Script tự dựng disposable DB hoặc fail-fast với hướng dẫn rõ; CI chạy reproducible |
| Nguyên nhân dự kiến | `qa` giả định `DATABASE_URL` đang sẵn sàng |
| File liên quan | `scripts/qa-smoke.cjs:53-62`, `package.json` |

### BUG-017 — Backend package manifest độc lập không đủ dependency runtime

| Thuộc tính | Nội dung |
|---|---|
| Mức độ | **Low** |
| Bước tái hiện | `cd server && npm install && npm start` |
| Hiện tại | `server/package.json` không khai báo `nodemailer`, trong khi service Gmail require package này |
| Mong đợi | Xóa manifest dư hoặc khai báo đầy đủ và có test cho cả cách khởi chạy được tài liệu hỗ trợ |
| Nguyên nhân dự kiến | Root manifest đã trở thành manifest chính nhưng file server cũ chưa cập nhật |
| File liên quan | `server/package.json`, `server/services/gmailService.js:2` |

## 3. Các kịch bản chưa thể chạy

- Database mất kết nối trong lúc transaction.
- Concurrent scan/quota/payment updates trên PostgreSQL thật.
- Token expiry và multi-device session.
- OAuth GitHub/Gmail success callback với provider thật.
- AI provider success/rate limit/malformed output.
- Payment gateway callback thật và replay từ nhiều instance.
- Responsive visual test trên Chrome/Safari/Firefox/mobile.
- Backup/restore và migration trên dữ liệu có sẵn.
