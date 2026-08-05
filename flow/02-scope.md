# Stage 02 — Scope (go/no-go)

Scope = features chosen by IMPACT × COST, inside your time budget.
KILL here is cheap and smart. Killing a weak idea at this gate is a SUCCESS outcome.

## Impact rubric (business value — score BEFORE looking at cost)

| Impact | Meaning |
|---|---|
| H | moves money or the core promise: gets users in (acquisition), gets them paying (revenue), or delivers the one job they came for |
| M | keeps users / saves real time weekly (retention, operations) |
| L | nice-to-have; nobody would pay for or switch over it |

Decision matrix: **H-impact features justify B/C cost** (via the C-paths below).
**L-impact features must be grade A or they're cut** — and even grade-A L-features are
cut when the budget is tight. The classic failure is a v1 full of A-grade L-impact
features: cheap to build, worthless to sell.

## AI coding grade rubric

| Grade | Meaning | Examples |
|---|---|---|
| A | cheap for AI | CRUD, forms, dashboards, content sites, API wrappers |
| B | moderate | file processing, 3rd-party integrations, auth via library, single LLM call, HITL AI drafts |
| C | expensive | realtime, payments from scratch, custom auth, autonomous agentic AI pipelines, heavy concurrency |

**Grade is a COST estimate, not a permission.** The gate is fit(grades, budget), not "no C allowed."
When a C feature is the real need, three honest paths:
1. **The C feature IS the product** → invert the cut: C goes FIRST (riskiest assumption first),
   everything else is minimized to serve it, and the budget is renegotiated against reality.
   But: one C proves the value prop — its siblings are v2 cards, not v1 scope.
2. **Re-architect C down to B** (highest-leverage move): multi-step agent → single LLM call;
   auto-send → human-approves-draft; custom pipeline → managed service / library.
   Same user value, one grade cheaper.
3. **Irreducible C that doesn't fit the budget** → KILL or re-budget. Both are honest.

## Gate — check ALL before `/flow next`
- [x] Every feature below has an IMPACT (H/M/L with the business reason) AND a grade (A/B/C)
- [x] No L-impact feature above grade A survives in v1
- [x] The suggested-features section was actually considered (each suggestion has an in/out decision)
- [x] fit(grades, budget) holds — every C in scope is justified as path 1, 2, or 3 above (written next to the feature)
- [x] If the product IS a C feature: it is FIRST in build order, and its sibling C features are on the cut list
- [x] The cut list is written (what I am NOT building in v1)
- [x] GO / KILL decision is written below
- [x] No FILL placeholders remain in this file

## Time budget

Một hotfix tập trung trong tối đa 6 giờ, gồm điều tra, một card triển khai, regression, review và live verification trên canonical production alias; không mua thêm dịch vụ.

## Features in v1 (each with impact AND grade)

- **Production API edge reliability contract** — impact **H** vì mọi login/scan phụ thuộc `/api/v1/*` đến đúng Express function và lỗi edge phải có dữ liệu chẩn đoán thay vì bị hiểu nhầm là CORS; grade **B** vì đây là một vertical slice qua Vercel rewrite, serverless entry, client response parsing, deterministic regression và một live smoke không side effect. Không có phần C; phạm vi chỉ chuẩn hóa hành vi hiện có, không tự xây proxy/WAF/monitoring platform.

## Suggested features (impact-first — proposed, not decided)

Up to 3 features NOT in the original idea, each chosen for business impact (how does this
get users in / get money in / keep users?). Grounded in the stage-01 GTM findings — e.g.
the first-10-users channel often implies a share/invite/referral surface; the pricing
research often implies an upsell or a paid tier. Default is OUT; each needs an explicit
decision.

- **External uptime monitor có alert** — impact **M** vì giảm thời gian phát hiện cho maintainer GitHub Issues; grade **B** do tích hợp dịch vụ/secret và vận hành định kỳ; **OUT** vì probe bên ngoài không chắc tái hiện WAF theo fingerprint và không cần thiết để chứng minh hotfix.
- **GitHub issue template tự thu status/content-type/request ID** — impact **M** vì giúp maintainer nhận reproduction có cấu trúc; grade **A**; **OUT** để card duy nhất không trộn vận hành cộng đồng với runtime fix, có thể làm sau khi live smoke chứng minh giá trị.
- **Nút/tùy chọn bypass hoặc tắt WAF** — impact **L** trong hiện trạng vì chưa có event/rule nào được chứng minh là thủ phạm; grade **B** do thay đổi security control bên ngoài; **OUT** vì tăng rủi ro bảo mật và không sửa route reproducibility.

## Cut list (NOT in v1 — deferred, not deleted)

- Mua/cấu hình Checkly, Better Stack hoặc dashboard observability riêng — recurring operations ngoài ngân sách hotfix.
- Tắt Attack Mode, Deployment Protection, DDoS mitigation, custom firewall hoặc tạo bypass rule — không có bằng chứng hiện tại và là thay đổi bảo mật ngoài scope.
- Sửa hoặc quảng bá preview branch `mac` đã cũ — preview đó thiếu function và không phải canonical production; chỉ ghi rõ canonical target trong smoke.
- Refactor toàn bộ auth, CORS, cookie, database hoặc UI — các flow này đang qua regression và không cần để sửa route/edge diagnostic.
- Đổi response schema của các business endpoint hoặc log response body/token/challenge HTML — không cần thiết và có nguy cơ rò dữ liệu.

## Decision

**GO** — một card grade B trong 6 giờ có thể đóng khoảng trống tái lập từ Git HEAD và tạo red→green/live evidence, trong khi giữ nguyên firewall và không tuyên bố đã tái hiện một 403 hiện không còn xuất hiện.
