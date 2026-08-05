# Stage 05 — Interface Contract (the seam)

The contract is whatever sits between your core and its consumer. For a web app that's
API endpoints (the table below). For a CLI it's commands + flags + output shapes; for a
plugin it's hooks + filters; for a pipeline it's input/output file schemas. Keep the
table's SPIRIT — every feature maps to an interface, every interface has its shapes
written before code — and adapt the columns to your project's shape.

Written BEFORE any code. Backend cards build TO this table; UI cards consume FROM it.
The #1 AI-build failure is producer/consumer drift — backend ships one shape, UI assumes
another, both look green. This file is the cheap fix.

## Gate — check ALL before `/flow next`
- [x] Every PRD feature maps to at least one INTERFACE below (web: endpoint · cli: command · library: public function · skill: command/file)
- [x] Every interface has its INPUT and OUTPUT shapes written (web: request+response · cli: flags+output/exit code · library: args+return)
- [x] Access/effects column filled for every interface (web: public/token/admin · non-web: writes/side-effects, or "none")
- [x] No FILL placeholders remain in this file

## OpenAPI / Swagger rule  (web only — N/A for cli/library/skill)

For non-web types there is no served spec; the equivalent "no producer/consumer drift" check
is the per-type done-evidence (the command runs / the API imports / the skill installs+runs).
For `web`:

This table is the PLANNING source of truth. If the framework serves a spec (FastAPI →
`/openapi.json` + `/docs`), the served spec is the RUNTIME artifact of this same contract:
- Path/method/shapes here and in the served spec must agree — the contract-test card
  asserts every endpoint in this table exists in the live `/openapi.json` with matching
  request/response shapes.
- Change flows ONE way: amend this file first, then the code, then the spec follows.
- **Docs land with the API, not after**: the served spec is live from the vertical-slice
  card onward, and every backend card's verify checks its endpoints appear in the live
  `/docs` with correct schemas. The contract-test card later asserts full agreement —
  but by then the docs have been growing card by card, never a catch-up task.
- Keep `/docs` enabled at least until v1 ships — it's the free human-readable contract.

## Interfaces  (web: endpoints · cli: commands · library: functions · skill: commands)

Adapt the columns to your project type. Web: Method/Path/Access(=auth: public/token/admin)/
Request/Response. CLI: Command/Flags/Access(=side-effects)/Input/Output+exit. Library:
Function/—/Access(=none)/Args/Return. The shared column below is "Access/Effects".

| Method/Interface | Path/Name | Access/Effects | Input shape | Output shape |
|---|---|---|---|---|
| `GET` | `/api/v1/health` | Public; read-only; không cookie/token; không truy cập DB | Không body; `Accept: application/json`; redirect mode `manual` trong live smoke | `200 application/json`; body `HealthResponse`; header `x-correlation-id: SafeRequestId`, và edge có thể thêm `x-vercel-id` |
| `GET` | `/api/v1/__routing_contract_probe__` | Public; read-only; route cố ý không tồn tại; không cookie/token | Không body; `Accept: application/json`; redirect mode `manual` | `404 application/json`; body `ApiNotFoundResponse`; header `x-correlation-id: SafeRequestId`, và edge có thể thêm `x-vercel-id` |
| `OPTIONS` | `/api/v1/auth/login` | Public preflight; read-only; không cookie/token | Không body; headers `Origin: <canonical origin>`, `Access-Control-Request-Method: POST` | `204`, body rỗng 0 byte và không có `content-type`; `access-control-allow-origin` bằng đúng canonical origin; `access-control-allow-credentials: true`; `access-control-allow-methods` chứa `POST` |
| Client response classifier | `classifyNonJsonApiResponse(meta)` | Client-local; không network/write; không log body/header bí mật | `NonJsonResponseMeta`; tuyệt đối không truyền/đọc response body | Ném/trả `ApiResponseError`; precedence: `x-vercel-error` → `DEPLOYMENT_PROTECTED`; `x-vercel-mitigated` hoặc `x-vercel-id`/`server: Vercel` → `VERCEL_EDGE_FORBIDDEN`; 403 khác → `HOSTING_FORBIDDEN`; non-403 → `INVALID_API_RESPONSE` |
| npm verification command | `npm run qa:production-routing:live -- --origin https://lunar-zeta-ruddy.vercel.app` | Read-only external network tới đúng canonical origin; không cookie/token/body; exit non-zero khi contract sai | `--origin` bắt buộc và phải bằng đúng canonical HTTPS origin, không path/query/credential; timeout cố định `10000` ms/probe | stdout đúng một `LiveRoutingReport` JSON cho pass/probe failure; exit `0` khi `passed=3,total=3`, exit `1` khi probe/network/redirect/contract fail, exit `2` khi input CLI không hợp lệ |

## Shared shapes (objects used by multiple interfaces)

```
SafeRequestId = string matching /^[A-Za-z0-9:._-]{1,256}$/

HealthResponse {
  status: "HEALTHY",
  service: string,
  timestamp: string  // ISO-8601 parseable
}

ApiNotFoundResponse {
  success: false,
  error: "API endpoint not found."
}

NonJsonResponseMeta {
  status: integer,
  contentType: string,
  headers: {
    xVercelError?: string,
    xVercelMitigated?: string,
    xVercelId?: string,
    xCorrelationId?: string,
    server?: string
  }
  // no body field by design
}

ApiResponseError {
  status: integer,
  code: "DEPLOYMENT_PROTECTED" | "VERCEL_EDGE_FORBIDDEN" |
        "HOSTING_FORBIDDEN" | "INVALID_API_RESPONSE",
  payload: {
    error: string,       // Vietnamese user-facing message
    code: same as parent code,
    requestId: SafeRequestId | null
  }
}

ApiResponseError message rules {
  DEPLOYMENT_PROTECTED: chỉ dẫn dùng canonical production domain hoặc quyền/bypass
    đã được operator cấp; không khuyên tắt protection mặc định,
  VERCEL_EDGE_FORBIDDEN: nêu Vercel Edge/Firewall/Mitigation và yêu cầu kiểm request ID,
  HOSTING_FORBIDDEN: nêu hosting gateway/WAF 403 và giải thích response 403 đọc được
    không do CORS tạo ra,
  INVALID_API_RESPONSE: nêu status và response không phải JSON
}

LiveProbeResult {
  name: "health" | "api-not-found" | "login-preflight",
  method: "GET" | "OPTIONS",
  path: string,
  expectedStatus: 200 | 404 | 204,
  actualStatus: integer | null,
  contentType: string,
  requestId: SafeRequestId | null,
  corsOrigin: string | null,
  passed: boolean
}

LiveRoutingReport {
  status: "PASS" | "FAIL",
  origin: string,
  probes: LiveProbeResult[3],
  summary: { passed: integer, total: 3 }
}
```

Contract rules: report/classifier không chứa response body, cookie, Authorization,
`x-vercel-challenge-token` hoặc giá trị `x-vercel-mitigated`; request ID không khớp
`SafeRequestId` trở thành `null`. Classifier dùng **sự hiện diện** của `x-vercel-error`
và `x-vercel-mitigated` cho precedence kể cả khi giá trị header là chuỗi rỗng; producer
biểu diễn header vắng mặt bằng `null`. Hai GET live probe chỉ PASS khi có riêng
`x-correlation-id` hợp lệ, dù field `requestId` trong report vẫn ưu tiên `x-vercel-id`;
health timestamp phải khớp cú pháp ISO-8601 chặt và parse được. Express hiện không phục vụ OpenAPI/Swagger và card này
không tạo hay đổi business endpoint/schema, nên v1 kiểm trực tiếp các existing endpoint
trong bảng; bổ sung full served spec cho toàn API là brownfield documentation work ngoài
Scope đã duyệt, không được giả là đã có.

## Feature → interface map

Reference each PRD feature by its `FRn` id so the mapping is machine-checkable
(`/flow consistency` flags any `FRn` with no interface here).

- **FR1 →** `GET /api/v1/health`; `GET /api/v1/__routing_contract_probe__`; `OPTIONS /api/v1/auth/login`; `classifyNonJsonApiResponse(meta)`; `npm run qa:production-routing:live -- --origin https://lunar-zeta-ruddy.vercel.app`.
