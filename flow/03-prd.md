# Stage 03 — PRD

## Gate — check ALL before `/flow next`
- [x] Every section below is filled from MY scope decision (stage 02), not re-expanded
- [x] Success metric is a NUMBER, not vibes
- [x] Each feature names the user action and observable result, tagged with a stable `FRn` id
- [x] Pain & gain maps every evidenced pain to one v1 feature
- [x] A stranger could build v1 from this without asking the operator anything
- [x] No FILL placeholders remain in this file

## Context

Production routing is healthy. GitHub OAuth is configured and starts correctly, but its callback,
session and repository sync have not been completed by a real user during verification. Scanner
tests are not a benchmark: production guest scan missed command injection, and AI review has no
versioned labeled corpus or published stability measure.

## Target users

- Thanh Luan, Lunar operator, who decides whether a release can claim GitHub login and scan work.
- Early Lunar users who authorize GitHub and depend on findings before changing security code.

## Pain & gain

| # | Persona | Pain | Evidence | Current workaround | V1 feature | Observable gain |
|---|---|---|---|---|---|---|
| P1 | Operator/user | OAuth redirect looks healthy without proof callback, session or repo sync succeeded. | Live 2026-08-06: config 200 + start 302; no consent/callback run. GitHub docs define three OAuth steps. | Click repeatedly, inspect vague toast or database/log manually. | FR1 — OAuth E2E evidence | One redacted report identifies the exact checkpoint as PASS/FAIL/BLOCKED. |
| P2 | Operator/user | Scan can assign score 100 while missing a critical sink. | Live guest scan missed `exec(req.query.command)`; current tests publish no confusion matrix. | Trust a few fixtures or manually compare output. | FR2 — Ground-truth scan baseline | Per-engine TP/TN/FP/FN, precision, recall and critical recall are visible. |
| P3 | Operator | AI results can vary between runs but current QA checks only schema. | `/api/v1/ai/review` calls an external model; no repeatability benchmark exists. | Rerun ad hoc and choose the answer that looks plausible. | FR2 — Ground-truth scan baseline | Three identical runs expose worst/median metrics and disagreement. |

## Problem statement

Lunar currently measures whether OAuth and scanner components respond, not whether the user journey
finishes or the findings match ground truth. Build one bounded verification gate that records live
OAuth checkpoints and deterministic/AI benchmark metrics without modifying the systems under test.

## Features

- **FR1:** As the operator, I run an interactive verification against the canonical production
  origin, complete GitHub consent in the opened browser, and receive a redacted OAuth result for
  five checkpoints: start, callback/session, `/auth/me`, GitHub connection plus repositories, and
  logout invalidation.
- **FR2:** As the operator, I run a versioned 40-case JavaScript security corpus containing exactly
  five CWE families (`CWE-78`, `CWE-79`, `CWE-89`, `CWE-95`, `CWE-798`), each with four vulnerable
  and four safe cases; I receive separate
  deterministic and AI confusion matrices, three-run AI stability and an explicit release verdict.

## Non-functional requirements

- C-001 is observation-only for application behavior: no auth, scanner, AI prompt/model or database
  schema changes.
- Interactive browser is required for GitHub consent. Automation must not click GitHub's authorize
  action, bypass MFA/SSO, persist browser profile, or disconnect/revoke grants.
- Report/log/stdout contain no cookie, JWT, OAuth state/code, access token, email, repository name,
  private source or raw AI prompt/response. Only counts, stable case IDs, provider/model and sanitized
  failure codes may appear.
- Corpus labels are reviewed data, never derived from Lunar output. Every case declares expected
  vulnerable/safe, CWE, severity and expected engine applicability.
- `baseline` exits successfully only when measurement completed and always includes verdict
  `PASS|FAIL|BLOCKED`; `enforce` exits non-zero unless thresholds pass. This prevents a measured
  failure from looking like a green release gate.
- Live origin is exactly `https://lunar-zeta-ruddy.vercel.app`; no preview or redirect to another
  Lunar origin is accepted.

## Tech stack

- Node.js scripts and native assertions for corpus/metrics.
- Puppeteer interactive browser for same-origin production session without exporting HttpOnly cookie.
- Existing Express endpoints and existing deterministic/AI engines as systems under test.
- JSON report checked into no persistent user-data store; operator saves only a redacted artifact.

## Success metric

- Measurement completeness: OAuth **5/5** checkpoints recorded; deterministic corpus **40/40** cases
  classified; AI corpus evaluated **3/3** times or explicitly `BLOCKED` with a stable provider/quota
  reason; **0** secrets or user identifiers in output.
- Release bar reported but not repaired by C-001: overall precision **>=90%**, overall recall
  **>=85%**, critical-CWE recall **100%**, and AI worst-run recall no more than **10 percentage
  points** below its median. Any lower result produces verdict `FAIL`.
