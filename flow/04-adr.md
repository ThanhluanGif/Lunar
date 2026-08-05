# Stage 04 — ADR (architecture decisions)

Short. The most valuable section is what you are NOT doing and why.

## Gate — check ALL before `/flow next`

- [x] Each decision has a one-line "why" and a one-line "what I rejected"
- [x] The NOT-doing list is written
- [x] Decisions cover: data storage, auth approach, deploy target
- [x] No FILL placeholders remain in this file

## Decisions

| # | Decision | Why | Rejected alternative |
|---|---|---|---|
| 1 | Giữ PostgreSQL hiện hữu và không lưu kết quả smoke/regression mới; report chỉ là output đã redact của lệnh kiểm tra. | Hotfix chỉ chứng minh route/edge và không cần state bền, migration hay dữ liệu người dùng mới. | Tạo bảng audit/telemetry hoặc một datastore cho từng probe, vì mở rộng schema, retention và quyền truy cập vượt một feature. |
| 2 | Giữ nguyên auth bằng cookie hiện hữu (HttpOnly, Secure, SameSite), credential/CORS allowlist và schema endpoint; smoke chạy anonymous, không gửi cookie hay Authorization. | Điều này kiểm chứng edge route mà không làm thay đổi session, CSRF hoặc dữ liệu tài khoản. | Đổi sang bearer token, nới SameSite/CORS, hoặc dùng tài khoản test đăng nhập, vì đó là thay đổi auth/security không cần để đo health, 404 API và preflight. |
| 3 | Giữ rewrite Vercel `/api/v1/:path* -> /api` đứng trước SPA fallback `/(.*) -> /index.html`, với `api/index.js` là Express serverless entry. | API wildcard phải thắng SPA fallback để mọi `/api/v1/*` có response Express JSON thay vì HTML. | Đưa API sang một origin/proxy mới hoặc sửa frontend gọi preview URL, vì tạo thêm điểm vận hành và không xử lý contract same-origin hiện có. |
| 4 | Phân loại non-JSON 403 ở client bằng status và header an toàn (`x-vercel-error`, `x-vercel-mitigated`, `x-vercel-id`, `server`, `x-correlation-id`); chỉ expose request ID đã sanitize hoặc `null`, không đọc/ghi body HTML. | Header cho biết response có khả năng bị chặn trước Express mà không làm lộ challenge HTML, token hay nội dung gateway. | Suy đoán mọi 403 là CORS hoặc parse/hiển thị body trang chặn để tìm marker, vì CORS không tạo HTTP 403 đọc được và body có thể nhạy cảm. |
| 5 | `npm run qa:production-routing` là regression offline, deterministic cho URL/routing order, policy và bốn synthetic non-JSON 403 cases; canonical live smoke là lệnh riêng, không chạy trong PR CI. | Offline test cô lập logic có thể tái lập, còn smoke xác minh deploy thực tế mà không khiến CI phụ thuộc mạng/production. | Dùng một lệnh live duy nhất làm regression hoặc coi source assertion là bằng chứng production, vì cách đầu flaky/có side effect vận hành còn cách sau không chứng minh edge runtime. |
| 6 | Live smoke chỉ gọi rõ ràng canonical HTTPS origin `https://lunar-zeta-ruddy.vercel.app`, tối đa 10 giây mỗi probe, không theo redirect sang origin khác và chỉ probe health, unknown API path, login preflight. | Ba request read-only này kiểm tra 200 JSON, 404 JSON và 204/CORS mà không sửa dữ liệu hay gửi bí mật. | Smoke preview branch `mac`, gọi login/scan thật, hoặc tự chọn URL từ redirect, vì preview không đại diện production và các lựa chọn kia có thể sai target hoặc tạo side effect. |
| 7 | Vercel project `lunar` và canonical production alias là deploy target duy nhất; giữ nguyên WAF, Firewall, Attack Mode và Deployment Protection. | Hiện không có 403 được tái hiện hay rule có bằng chứng là thủ phạm, nên contract phải quan sát an toàn thay vì nới kiểm soát. | Tắt/bypass Deployment Protection hoặc WAF, thêm allowlist/firewall exception, hay repair preview deployment, vì đều là thay đổi security/target ngoài bằng chứng và ngoài scope. |
| 8 | Không mua monitoring mới; chỉ dùng regression, smoke thủ công có chủ đích và request/correlation ID sẵn có trong report redact. | Đủ bằng chứng để xác nhận hotfix trong ngân sách 6 giờ mà không thêm chi phí hoặc secret vận hành. | Cấu hình Checkly, Better Stack hoặc dashboard observability riêng, vì cần subscription, credential và quy trình alert ngoài phạm vi. |

## NOT doing in v1 (and why it's safe to skip)

- Không tuyên bố đã tái hiện hay đã tìm được nguyên nhân một HTTP 403 hiện tại: evidence chỉ xác nhận canonical probes và synthetic cases, nên không biến giả định thành kết luận.
- Không tắt, bypass hoặc nới WAF, Deployment Protection, Attack Mode, firewall/IP rule: không có event/rule được chứng minh và việc giữ nguyên controls không cản trở probe read-only.
- Không sửa hay deploy preview branch `mac`: canonical production alias mới là contract, nên sửa preview không nâng độ tin cậy production.
- Không đổi PostgreSQL, auth/cookie/CORS, business endpoint schema hoặc frontend feature: FR1 chỉ thêm contract routing/diagnostic, các thay đổi đó làm tăng rủi ro security và regression.
- Không thêm external monitoring, alert, dashboard hoặc lưu response body/challenge token: hotfix vẫn có bằng chứng bounded/redact mà không tạo chi phí, secret hoặc dữ liệu nhạy cảm mới.
- Không dùng smoke để login, scan, tạo order hoặc gọi endpoint thay đổi state: ba probe được chọn đã đủ bao phủ path/response-class/CORS và không tác động người dùng.
