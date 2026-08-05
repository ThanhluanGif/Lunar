# Stage 00-inspect — Brownfield assessment (existing codebase)

Run this BEFORE planning when the project ALREADY EXISTS. Goal: an honest current-state map so
planning starts from reality, not a blank page. Fill every section from EVIDENCE (read the code),
then check the gate. `/flow assess` seeds the auto-scan and validates this gate.

## Gate — check ALL before planning
- [x] I detected the stack / build / test / run commands (from real files; listed below)
- [x] I mapped the main components/modules and entry points
- [x] I assessed current functionality state (works / partial / broken) with file evidence
- [x] I assessed UI/UX state vs the product's stated goals (or noted "no UI")
- [x] I listed the top risks / tech-debt / known issues
- [x] I noted the test + quality baseline (what is covered vs not)
- [x] A human reviewed this assessment (brownfield assessment is operator-gated)
- [x] No FILL placeholders remain in this file

## Detected (auto-scan)

- Runtime and UI: Node.js, Express 5, React 18 and Vite 8 (`package.json`, `server/package.json`).
- Persistence and integrations: PostgreSQL via `pg`, Supabase browser client, GitHub OAuth/API, Vercel AI Gateway (`server/db/connection.js`, `src/services/supabaseClient.js`, `server/routes/githubAuthRoutes.js`, `server/services/aiAssistantService.js`).
- Deployment: Vercel static Vite build plus the Express serverless entrypoint `api/index.js`; Docker and nginx are alternative production surfaces (`vercel.json`, `Dockerfile`, `docker-compose.yml`, `deploy/nginx/lunar.conf`).
- Entry points: `src/main.jsx` -> `src/App.jsx` for the browser; `api/index.js` -> `server/index.js` on Vercel; direct Node/Docker starts `server/index.js`.
- Commands from `package.json`: `npm run dev`, `npm run build`, `npm run qa`, `npm run qa:security`, `npm run qa:production-routing`, `npm run qa:production-routing:browser`, `npm run qa:docker`, and `npm run qa:ui`.
- CI: `.github/workflows/qa.yml` runs the repository quality gates.

## Ranked surfaces (auto-scan — read these first)

The auto-scan ranks source files by how widely their symbols are referenced (highest-leverage
code first). The routing investigation inspected the cross-cutting surfaces that can explain the
reported response: `src/services/lunarApi.js` constructs every API request and classifies non-JSON
responses; `server/index.js` owns CORS, CSRF, middleware ordering and every `/api/v1` mount;
`server/services/corsPolicy.js` normalizes the allowlist; `server/middleware/rateLimiter.js`
controls public/auth request quotas; and `server/routes/scanRoutes.js` accepts the security-code
payload most likely to resemble hostile input. The product-heavy ranked surfaces
`server/services/reportService.js`, `server/routes/adminRoutes.js`, and `server/routes/aiRoutes.js`
remain relevant but are downstream of the edge-routing failure.

## What this product is (from docs/specs/code, not guesses)

Lunar.dev is a browser-based SAST and code-repair workbench for developers, technical leads and
application-security practitioners (`README.md:14-51`). Its core job is to ingest pasted/local or
GitHub-hosted source, produce OWASP/CWE/CVSS findings, and carry verified findings into repair,
reporting and account workflows.

## Current functionality state (evidence)

- **Production API routing works on the canonical aliases now.** At 2026-08-02 17:14 ICT,
  `GET https://lunar-zeta-ruddy.vercel.app/api/v1/health` and
  `GET https://lunar-thanhluangifs-projects.vercel.app/api/v1/health` returned HTTP 200 JSON with
  both `x-vercel-id` and `x-correlation-id`. `OPTIONS /api/v1/auth/login` returned 204 and a test
  login POST reached Express and returned the expected JSON 401, proving the edge is no longer
  returning the reported non-JSON 403.
- **Guest scanning reaches the application through Vercel.** Benign, `eval(...)`, and SQL/XSS-like
  public scan payloads all returned HTTP 200 JSON from `/api/v1/scans/guest-preview`; the security
  payload was not blocked by the current WAF (`server/routes/scanRoutes.js:257-288`).
- **Frontend request routing is implemented but its 403 branch is diagnostic only.** Requests use
  relative same-origin `/api/v1/*` when `VITE_API_BASE_URL` is empty
  (`src/services/apiUrl.js:24-27`, `src/services/lunarApi.js:3-31`). Non-JSON 403 responses are
  classified as Vercel Deployment Protection, Vercel Edge, or generic hosting rejection
  (`src/services/lunarApi.js:35-73`); this message cannot bypass an edge denial.
- **Vercel serverless routing is present in the dirty worktree and deployed production build.**
  `vercel.json:3-12` maps `/api/v1/*` to the `api` function before the SPA catch-all, and
  `api/index.js:1-3` exports the Express app. The generated `.vercel/output/config.json` maps the
  API route to `/api?path=$1`; the production function is present in Vercel deployment
  `dpl_9DUNWy6q5AUJ29dPrBEjSJgYKQm1`.
- **Preview branch routing is stale/broken.** The existing `mac` preview alias serves the SPA but
  `/api/v1/health` returns Vercel `NOT_FOUND` because that preview predates the serverless routing
  commit. The canonical production aliases do not have this failure.
- **Auth, dashboard, admin, scans, reports, payments and AI routes exist.** They are mounted under
  `/api/v1` in `server/index.js:121-139`; auth/session state is consumed by `src/App.jsx:119-204`.

## UI / UX state vs product goals

The React application contains landing, authentication, dashboard, admin, GitHub workspace,
submission, vulnerability repair, reports, pricing and assistant surfaces (`src/App.jsx:1-28`).
The reported non-JSON response is surfaced directly in the relevant modal/error state, which is
useful for operators but too infrastructure-specific for end users. More importantly, a user can
land on the stale preview UI and only discover its missing API after an action; the UI currently
does not identify that the preview deployment is not a valid production surface.

## Risks / tech-debt / known issues

1. **Deployment is not reproducible from Git HEAD.** Production metadata records `gitDirty=1`,
   while the worktree has 48 modified/deleted tracked files. The working production route depends
   on uncommitted edits to `vercel.json`, `api/index.js`, `server/index.js`, and related tests.
2. **The reported 403 has no matching current platform evidence.** Vercel reports no custom WAF
   rules, no IP blocks, no pending firewall draft, Attack Mode disabled, no firewall actions over
   the last seven days, and no production runtime 403 logs. Disabling security controls would be
   an unjustified security regression.
3. **Stale preview URLs are externally visible.** GitHub deployment status links and the `mac`
   branch alias point at deployments without the API function; consumers may confuse those URLs
   with the canonical production alias.
4. **Routing regression checks are mostly source assertions.** `scripts/production-routing-regression.mjs:79-91`
   checks strings but does not exercise the generated Vercel route table or a public deployment.
   The browser test validates split-origin local processes, not Vercel edge behavior
   (`scripts/production-routing-browser.cjs:95-167`).
5. **The Express API has no served OpenAPI document.** The current application predates Flow and
   therefore cannot yet perform the standard runtime contract-drift check.

## Test + quality baseline

- `npm run qa:production-routing` passes and covers base URL normalization, OAuth redirect origin,
  cookie policy, local proxy alignment, CORS allowlist fallback and diagnostic strings.
- `npm run qa:production-routing:browser` passes a real Chromium flow against separate local Vite
  and Express origins, including a credentialed CORS response.
- The live probes above cover canonical production health, auth JSON behavior, CORS preflight and
  WAF-sensitive guest scan payloads. No current 403 was reproduced.
- Broader suites are available through `npm run qa`, `npm run qa:security`, `npm run qa:a11y`,
  `npm run qa:docker`, and `npm run qa:ui`; there is no configured line/branch coverage threshold.
- Missing baseline: an automated assertion that Vercel's generated route table contains the API
  function before the SPA fallback, plus a safe live smoke against the canonical production URL.

## Verdict

The codebase is healthy enough for a narrowly scoped production-routing hardening card, and the
canonical production API is currently healthy. The first fix is to make the already-working
serverless route reproducible and regression-tested, explicitly reject stale preview evidence,
and keep live verification on the canonical production alias. Firewall/protection must not be
disabled without a concrete Vercel firewall event or request ID proving a false-positive rule.

<!-- auto-scan -->
stack:
  - node (package.json)
  - CI: github actions (.github/workflows)
  - docker
context files present:
  - README.md
  - docs
ranked surfaces (most-referenced first - inspect these before planning):
  1. server/services/reportService.js  (score 399; height, source, reportLine)
  2. server/services/accountEmailService.js  (score 321; from, protocol, smtpUrl)
  3. src/components/ScoreRadar.jsx  (score 299; center, radius, angle)
  4. server/routes/paymentRoutes.js  (score 256; payment, orderCode, amount)
  5. server/middleware/auth.js  (score 245; currentUser, verifyToken, optionalToken)
  6. server/routes/adminRoutes.js  (score 238; reason, page, recentLogins)
  7. server/middleware/rateLimiter.js  (score 226; body, identifier, reportRateLimiter)
  8. src/services/lunarApi.js  (score 217; request, lunarApi, download)
  9. server/routes/aiRoutes.js  (score 211; model, highCount, reasonUnavailable)
  10. src/components/SubmitModal.jsx  (score 206; file, preview, projectScan)
