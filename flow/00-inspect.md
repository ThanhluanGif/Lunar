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

## Detected stack and entry points

- Node.js, Express 5, React 18 and Vite 8 (`package.json`, `server/index.js`, `src/main.jsx`).
- PostgreSQL persistence, GitHub OAuth/API and three optional AI providers (`server/db/connection.js`,
  `server/routes/githubAuthRoutes.js`, `server/routes/aiRoutes.js`).
- Canonical Vercel production origin: `https://lunar-zeta-ruddy.vercel.app`; Express is exported
  through `api/index.js` and mounted below `/api/v1`.
- Relevant commands: `npm run build`, `npm run qa`, `npm run qa:security`, `npm run qa:sast`,
  `npm run qa:auth-lifecycle:browser`, `npm run qa:ui`.

## Product and trust-critical surfaces

Lunar is a browser SAST and AI-assisted code-review workbench. The two trust-critical user journeys
are: (1) authorize GitHub, receive a Lunar session and see synchronized repositories; (2) submit
source and receive security findings that distinguish real vulnerabilities from safe code.

Primary surfaces inspected:

- OAuth/session: `src/components/AuthModal.jsx`, `src/App.jsx`, `src/services/lunarApi.js`,
  `server/routes/githubAuthRoutes.js`, `server/routes/authRoutes.js`.
- Deterministic scan: `server/routes/scanRoutes.js`, `server/services/sastEngine.js`,
  `src/services/securityScannerEngine.js`.
- AI review: `server/routes/aiRoutes.js`, `src/services/geminiService.js`,
  `src/services/aiReviewEngine.js`.

## Verified current state — 2026-08-06

- `GET /api/v1/health` returned HTTP 200 JSON on the canonical production origin.
- `GET /api/v1/auth/github/config` returned `configured=true`, `authFlow=web`,
  `redirectMode=registered` and the canonical callback URL.
- `GET /api/v1/auth/github/start` returned HTTP 302 to GitHub and set a Secure, HttpOnly,
  SameSite=Lax state cookie. This proves only initiation; no operator completed consent, callback,
  Lunar session creation or repository synchronization, so GitHub login is **not verified E2E**.
- Production guest scan returned 0 findings for parameterized SQL and 1 finding for concatenated
  SQL injection, but returned score 100 and 0 findings for
  `exec(req.query.command)`. That is a reproduced critical false negative on a user-facing scan.
- `npm run qa:sast` ran the focused regression suites successfully, then exited 1 after the
  repository self-audit reported 6 critical command-execution findings in the local Flow harness.
  Those findings remain untriaged; a red suite is not evidence of scanner accuracy.

## UI / UX state vs the product promise

The UI offers “Tiếp Tục Với GitHub”, repository synchronization, “SAST & AI review” and AI repair.
It already warns that human verification is required, but it does not show a measured scanner
precision/recall baseline. A configured OAuth button and a successful redirect can also look
healthy before callback/session/repository sync fails. The product currently exposes activity,
not an end-to-end trust proof.

## Risks / tech debt / known issues

1. OAuth tests cover configuration, invalid callback and mocked boundaries, not a real production
   authorization-code round trip with a GitHub account.
2. There are multiple scan implementations with different rule sets. Guest/verified scan uses five
   regex rules, while browser and deep scan paths use separate engines; results can drift by entrypoint.
3. AI `/api/v1/ai/review` validates JSON shape but has no versioned ground-truth corpus, confusion
   matrix or repeatability measure. “AI-based” is not an accuracy claim.
4. Current scan tests use a handful of hand-written fixtures. They do not publish TP, TN, FP, FN,
   precision or recall, and they miss the production command-injection example above.
5. OAuth live verification handles credentials and user data; any harness must keep consent human,
   never print cookies/tokens/state/code, and use a dedicated test account.

## Test + quality baseline

- Existing OAuth regression: route/config/state/error behavior is covered locally.
- Existing SAST regression: selected positive/negative fixtures and self-audit exist, but there is
  no stable labeled benchmark shared by deterministic and AI paths.
- Missing OAuth baseline: five live checkpoints — start, callback/session, `/auth/me`, GitHub status
  plus repository list, and logout invalidation.
- Missing scan baseline: at least 40 labeled cases, per-engine TP/TN/FP/FN, precision/recall,
  critical-CWE recall and three-run AI stability.

## Verdict

Do not continue the old routing-only card. Build a verification gate first. The gate may honestly
report `FAIL` or `BLOCKED`; its job is to establish reproducible evidence before any OAuth or
scanner repair is scoped. No auth implementation, scanner rule or AI prompt is changed in C-001.

<!-- auto-scan -->
stack:
  - node (package.json)
  - CI: github actions (.github/workflows)
  - docker
context files present:
  - README.md
  - docs
ranked surfaces:
  - server/routes/githubAuthRoutes.js
  - server/routes/aiRoutes.js
  - server/routes/scanRoutes.js
  - src/services/securityScannerEngine.js
  - src/services/lunarApi.js
