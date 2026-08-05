# Stage 03 — PRD

1-2 pages max. Test: could a stranger build v1 from this without asking you anything?

## Gate — check ALL before `/flow next`
- [x] Every section below is filled from MY scope decision (stage 02), not re-expanded
- [x] Success metric is a NUMBER, not vibes ("save time" fails; "first response < 2h" passes)
- [x] Each feature names the user action and the observable result, tagged with a stable `FRn:` id
- [x] Pain & gain is a MAPPING TABLE: every pain cites evidence (a stage-01 quote or a named observation), and names the v1 feature that kills it; every v1 feature kills at least one pain
- [x] A stranger could build v1 from this without asking me anything
- [x] No FILL placeholders remain in this file

## Context

Lunar là React/Vite frontend và Express API được deploy cùng origin trên Vercel, với `/api/v1/*` phải rewrite vào một serverless entry trước SPA fallback. Canonical production hiện trả JSON đúng, nhưng một báo cáo trước đó nhận HTML 403 từ gateway/WAF và preview branch cũ trả HTML 404, trong khi regression hiện tại chủ yếu kiểm chuỗi source. Vercel không có custom firewall rule, IP block, Attack Mode hay Firewall Event trong cửa sổ đã kiểm tra, nên v1 phải tạo bằng chứng tái lập và chẩn đoán chứ không giả định một rule là thủ phạm. Phạm vi giữ nguyên API/business behavior và mọi security control hiện có.

## Target users

- **Lunar operator/maintainer (Thanh Luan):** deploy từ Git, đọc CI/Vercel log và cần biết request có đến Express hay bị edge/SPA bắt trước.
- **Người dùng Lunar trên canonical production:** thực hiện login/scan trong browser và cần nhận dữ liệu JSON hoặc thông báo tiếng Việt có status/request ID đủ để báo lỗi, thay vì một kết luận CORS sai.

## Pain & gain (mapping table — the traceability spine of the PRD)

Every row: a concrete pain, the evidence it's real, what people do about it today, the
ONE v1 feature that kills it, and the observable gain. If a feature kills no pain, cut
it; if a pain has no feature, it goes to the "not addressed" list — honestly.

| # | Persona | Pain (concrete) | Evidence (stage-01 quote/source or named observation) | Today's workaround | V1 feature that kills it | Observable gain |
|---|---|---|---|---|---|---|
| P1 | Lunar operator | Source assertion có thể xanh trong khi generated/live routing vẫn đưa `/api/v1/*` vào SPA HTML. | Stage 01: Switch Labs báo “Only dynamic routes fail with HTML 404s”; quan sát Lunar: preview `mac` cũ trả 404 nhưng canonical production trả JSON. | Chạy curl rời rạc và suy luận từ deploy log. | FR1 — Production API edge reliability contract | Một lệnh regression/live smoke chỉ PASS khi API wildcard thắng SPA fallback và canonical target trả đúng status/content type. |
| P2 | Người dùng Lunar | HTML 403 ở edge bị browser mô tả như CORS, nên báo lỗi thiếu dữ kiện và dễ dẫn đến nới firewall sai chỗ. | Stage 01: Tessdashservices ghi nhận `X-Vercel-Mitigated: challenge`, HTTP 403 và `text/html`; Anujamanthrirathne thấy 403 rồi console báo CORS. | Chụp console hoặc thử sửa CORS dù request chưa đến Express. | FR1 — Production API edge reliability contract | Non-JSON 403 được phân loại bằng header/status và lộ request ID có sẵn, không lộ HTML/token; CORS chỉ được nhắc ở đúng ngữ cảnh cross-origin/network failure. |
| P3 | Lunar operator | Không có một bằng chứng live, read-only và canonical để gắn vào issue/deploy verification. | Quan sát ngày 2026-08-02: canonical production health/auth/preflight khỏe; firewall events 7 ngày rỗng; preview cũ không đại diện production. | Kiểm từng URL bằng tay, có nguy cơ chọn nhầm preview alias hoặc endpoint có side effect. | FR1 — Production API edge reliability contract | Live report ghi target canonical, status, content type và request/correlation ID cho bộ probe không side effect. |

### Pains NOT addressed in v1 (deliberate — tie to the scope cut list)

- WAF false positive phụ thuộc IP/UA/challenge → chưa tái hiện và cần Firewall Event/request ID hoặc external synthetic monitoring ở v2; v1 chỉ thu bằng chứng an toàn.
- Phản hồi/triage GitHub Issues tự động → issue template được cắt ở Scope, có thể thêm sau khi live report ổn định.
- Sửa preview deployment lịch sử → không sửa được bằng code hiện tại và không phải canonical production contract.

## Problem statement

Lunar thiếu một contract kiểm chứng được từ source tới production cho đường đi `/api/v1/*`, nên HTML do SPA/edge có thể bị hiểu sai là lỗi Express hoặc CORS. Cần khóa rewrite order, response classification và live probe vào một vertical slice có red→green evidence mà không nới security control.

## Features (user-centric — action → observable result)

Tag each v1 feature with a stable id `FRn:` (functional requirement) — the traceability
anchor. Every `FRn` must later be claimed by a card (`implements: FRn`) and served by an
interface in the contract (`FRn →`); `/flow consistency` checks this mechanically.

- **FR1:** Là Lunar operator, tôi deploy code đã commit và chạy một lệnh kiểm tra production routing; tôi thấy regression xác nhận `/api/v1/*` đi vào Express trước SPA fallback, synthetic HTML 403 được phân loại với status/code/request ID, và live report trên canonical URL xác nhận các probe read-only trả đúng status/content type/CORS mà không ghi secret hay response body.

## Non-functional requirements

- Không thay đổi auth, cookie, CORS allowlist, business endpoint schema, WAF/Deployment Protection/Attack Mode hoặc firewall rule.
- Live smoke chỉ dùng canonical HTTPS origin được truyền rõ ràng, timeout tối đa 10 giây/probe, không theo redirect sang origin khác và không gọi endpoint có side effect.
- Mọi API probe phải kiểm status và `content-type`; report chỉ được chứa URL/path, status, content type, CORS result và `x-vercel-id`/`x-correlation-id` đã sanitize.
- Bốn synthetic 403 cases là: có `x-vercel-error` (trả `DEPLOYMENT_PROTECTED`); có `x-vercel-mitigated` (trả `VERCEL_EDGE_FORBIDDEN`); chỉ có `x-vercel-id`/`server: Vercel` (trả `VERCEL_EDGE_FORBIDDEN`); và không có Vercel signal (trả `HOSTING_FORBIDDEN`). `requestId` dùng `x-vercel-id`/`x-correlation-id` đã sanitize hoặc `null`; classifier không đọc response body.
- Client diagnostic không lưu/log response body, cookie, authorization header hoặc challenge token; copy người dùng tiếp tục là tiếng Việt.
- Regression phải chạy offline trong `npm run qa:production-routing`; live smoke là lệnh riêng vì CI pull request không được phụ thuộc production/network.

## Tech stack

- Frontend: React 18 + Vite 8, API URL helper dùng same-origin mặc định.
- Backend: Node.js + Express 5 qua `api/index.js`; PostgreSQL hiện hữu không đổi.
- Verification: Node `assert`/native `fetch`; Puppeteer regression hiện hữu giữ nguyên.
- Deploy target: Vercel project `lunar`, canonical production alias `https://lunar-zeta-ruddy.vercel.app` được truyền cho live smoke, không hard-code preview deployment URL.

## Success metric (numbers only)

**3/3** canonical live probes PASS sau deploy: health = 200 JSON, unknown `/api/v1` path = 404 JSON, login preflight = 204 với CORS origin đúng; **4/4** synthetic non-JSON 403 cases trả stable diagnostic status/code/request ID; **0** secret, response body hoặc challenge token xuất hiện trong report/log.
