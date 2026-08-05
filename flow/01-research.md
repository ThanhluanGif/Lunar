# Stage 01 — Research (inspect first)

Rule: INSPECT what already exists. Evidence required — links, quotes, screenshots.
"I think there's nothing like this" without searching = gate fail.

> Project type (`/flow project-type`, default `web`): items 2 and 4 below are written for a
> **web / market-facing product**. For an **internal tool / cli / library / skill** (no public
> market), use the non-web framing in each item — it is still real evidence (first-party
> friction, who-benefits), NOT an excuse to skip. The semantic gate refuses a market product
> that hides behind the soft framing.

## Gate — check ALL before `/flow next`
- [x] I actually OPENED 3 existing tools/competitors (links below, with one honest note each)
- [x] **(web)** I found 3 REAL user complaints online, quoted, with source links — **OR (non-web/internal)** I named the concrete first-party friction / observed pain that justifies this
- [x] I wrote what competitors CHARGE (real prices) and who pays — **OR (non-web)** what people spend AROUND this problem today (time, a worse tool, manual work)
- [x] **(web)** I named the ONE channel my first 10 users come from (a place, not "social media") — **OR (non-web/internal)** I named who benefits and how they hear about it (release notes / team), and noted "no market channel" is NOT a kill signal for an internal tool
- [x] I wrote why those users would pick this over the status quo (one honest paragraph)
- [x] I wrote what is technically free vs hard for this idea
- [x] No FILL placeholders remain in this file

## What exists already (3 — open them, don't guess)

Đã mở ngày 2026-08-02: ba trang dưới đây, cộng với trang giá của từng dịch vụ.

1. [Vercel Rewrites](https://vercel.com/docs/routing/rewrites) — giải quyết đúng lớp route: rewrite giữ URL và có wildcard cho `/api/v1/*`; đây là lựa chọn nền tảng hợp lý cho Lunar. Điểm thiếu: tự nó không chứng minh generated route table đã đặt API trước SPA fallback, cũng không báo cho Lunar khi WAF chặn trước khi Express chạy.
2. [Checkly API Checks](https://www.checklyhq.com/pricing/) — có HTTP API check, header/payload và assertion, vì vậy có thể báo khi health endpoint không còn JSON. Điểm thiếu: probe chạy từ IP/UA của Checkly, nên có thể không tái hiện một quyết định WAF phụ thuộc fingerprint của khách; nó cũng không có `x-vercel-id`/Firewall Event nội bộ nếu edge không trả chúng.
3. [Better Stack Uptime](https://betterstack.com/pricing) — monitor HTTP đa vị trí, alert và ảnh lỗi giúp biết lỗi nằm ngoài browser của Lunar. Điểm thiếu: status/keyword monitor là lớp quan sát ngoài; không thay được regression route table, request ID tương quan, hay chẩn đoán response body an toàn trong client.

## What users say (web: 3 real complaints quoted+linked · non-web: real first-party friction)

1. Tessdashservices 7443, Vercel Community, 2026-05-14: “Issue started suddenly without code changes or redeploy.” Báo cáo kèm HTTP 403, `X-Vercel-Mitigated: challenge`, `Content-Type: text/html` và API không đến server — đúng dạng lỗi edge cần phân biệt khỏi CORS/app lỗi. [Nguồn](https://community.vercel.com/t/production-api-and-vercel-dev-blocked-by-x-vercel-mitigated-challenge-403-false-cors/41873).
2. Anujamanthrirathne, Vercel Community, 2025-02-18: “previous week this web page work these couple day come this issue”. Bài có `/api/v1/get-events` trả 403 HTML và browser hiển thị như CORS lỗi; đây là lý do UI/monitor phải ghi content type và ID thay vì đổ lỗi CORS. [Nguồn](https://community.vercel.com/t/403-forbiden-error-comming-i-add-cors-url-corectly-help-me/5966).
3. Switch Labs, Vercel Community, 2025-06-06: “Only dynamic routes fail with HTML 404s”. Họ nói local trả JSON nhưng deployment chỉ trả HTML 404, chặn chức năng production — phù hợp nhu cầu kiểm tra route thực tế, không chỉ source assertion. [Nguồn](https://community.vercel.com/t/dynamic-api-routes-returning-html-404-pages-instead-of-route-handlers/12641).

## GTM & business reality

Building is the cheap part now. Distribution and willingness-to-pay are where ideas die —
research them BEFORE planning, not after shipping.

### Who pays today, and how much (pricing reference points)

- [Vercel](https://vercel.com/pricing): Hobby **$0/tháng** (có WAF/DDoS mitigation); Pro **$20/tháng** và usage overage, Enterprise báo giá. Chủ project/team Lunar trả; Vercel là runtime/router/WAF hiện tại, không phải một “sản phẩm mới” để mua. Pricing đã kiểm tra ngày 2026-08-02.
- [Checkly](https://www.checklyhq.com/pricing/): Hobby **$0/tháng** gồm 10 uptime monitor và 10.000 API runs/tháng; Starter **$24/tháng** (billed annually); overage API Starter **$2,60/10.000**. Chủ vận hành Lunar trả nếu cần external synthetic alerting. Đây là chi phí tùy chọn, không phải điều kiện của hotfix.
- [Better Stack](https://betterstack.com/pricing): free tier gồm **10 monitor**; thêm 50 monitor **$25/tháng** (hoặc $21/tháng trả năm); responder/on-call bắt đầu **$34/license/tháng** (hoặc $29/tháng trả năm). Chủ vận hành/on-call Lunar trả khi muốn escalation. Không cần mua để xác nhận routing contract.

### The first-10-users channel (web) · who-benefits (non-web/internal)

**Một kênh duy nhất:** [GitHub Issues của Lunar](https://github.com/ThanhluanGif/Lunar/issues). Mười người đầu tiên ở đây là maintainer/contributor hoặc người đã dùng Lunar và gặp API/preview bất thường; họ đã có repo, URL production và nơi gửi reproduction, nên maintainer có thể mời họ chạy thử canonical smoke/diagnostic qua issue ghim hoặc release note. Đây là kênh vận hành của một hotfix chứ không phải tuyên bố có mười khách hàng trả tiền; không suy diễn traffic từ preview cũ.

### Why switch (vs the status quo)

Những người ở GitHub Issues không cần “chuyển” sang một dashboard mới: status quo của họ là đọc console CORS, Vercel 403/404 HTML hoặc deploy log rồi đoán route/WAF. Họ chọn hardening này nếu nó làm deploy từ Git HEAD tái tạo được route `/api/v1/*`, kiểm tra canonical production trả JSON, và khi response là HTML thì lộ status, `content-type`, `x-vercel-id`/correlation ID có sẵn (không log secret/body nhạy cảm) để mở Vercel case. Đây nhanh hơn mua/thêm một monitor chung chung và an toàn hơn bypass/disable WAF. Nó **không** hứa chữa được mọi 403: production chuẩn hiện khỏe, HTML 403 được báo chưa tái hiện hôm nay, và preview `mac` 404 là deploy cũ thiếu function chứ không chứng minh production hỏng.

## Technically free vs hard

- Free (solved by libraries/platforms): Vercel đã có rewrite/serverless route, HTTPS/WAF/DDoS mitigation và `x-vercel-id`; Node/Express trả JSON; CI có thể chạy scripted assertion; curl/fetch có thể kiểm `status`, `content-type` và header. Vercel nói rewrite chuyển request sang destination mà không đổi URL, nên không cần tự xây reverse proxy. Các primitive này không yêu cầu nới WAF.
- Hard (custom work, real risk): bảo đảm config committed sinh đúng route table trước SPA fallback; chọn canonical production URL thay vì preview cũ; live smoke đủ nhỏ/đúng auth để không gây side effect; phân loại HTML 403/404 trước app mà không tiết lộ token, HTML challenge hay payload scan; giữ correlation/request ID xuyên browser–Vercel–log; và xác định false positive từ evidence Firewall/Vercel, không từ phỏng đoán. Không có bằng chứng hiện tại để tắt/bypass firewall — làm vậy là regression bảo mật, không phải diagnostic.
