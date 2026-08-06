# Stage 01 — Research (inspect first)

Rule: INSPECT what already exists. Evidence required — links, quotes, screenshots.
"I think there's nothing like this" without searching = gate fail.

## Gate — check ALL before `/flow next`
- [x] I actually OPENED 3 existing tools/competitors (links below, with one honest note each)
- [x] I found 3 REAL user complaints online, quoted, with source links
- [x] I wrote what competitors CHARGE (real prices) and who pays
- [x] I named the ONE channel my first 10 users come from (a place, not "social media")
- [x] I wrote why those users would pick this over the status quo (one honest paragraph)
- [x] I wrote what is technically free vs hard for this idea
- [x] No FILL placeholders remain in this file

## What exists already (opened 2026-08-06)

1. [GitHub CodeQL](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning)
   builds a code database and runs maintained queries. It is a stronger reference than Lunar's
   regex-only guest path, but GitHub explicitly notes unsupported/custom frameworks can make
   analysis incomplete; it still requires triage and measurable fixtures.
2. [Semgrep](https://semgrep.dev/) combines static analysis with AI reasoning for detection,
   triage and remediation. Its documented separation of deterministic tools and LLM-backed
   analysis supports Lunar's decision to score those lanes separately instead of marketing one
   blended “AI accuracy” number.
3. [Snyk Code](https://docs.snyk.io/scan-with-snyk/snyk-code) is an AI-based SAST product exposed
   through web, IDE, CLI and source integrations. Its multi-surface delivery is comparable to
   Lunar, and also shows why the same labeled corpus must guard every user-visible entrypoint.

Benchmark references opened:

- [OWASP Benchmark](https://owasp.org/www-project-benchmark/) publishes labeled true/false cases
  and computes TP, FN, TN, FP, TPR/recall and FPR for automated vulnerability tools.
- [NIST Juliet/SARD](https://www.nist.gov/publications/juliet-11-cc-and-java-test-suite) provides
  known-flawed and non-flawed programs for evaluating static analyzers. Lunar v1 will use a much
  smaller JavaScript-focused corpus, but retain the same ground-truth discipline.
- [GitHub OAuth web flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
  defines three real steps: redirect user, receive callback, then use the token. A 302 alone is
  not an end-to-end success.

## What users say

1. A GitHub Community user reported: “Failed to connect to GitHub. Please try again later.”
   [Source](https://github.com/orgs/community/discussions/181237). This is the exact class of vague
   outcome a start-only check cannot explain.
2. Another integration report says: “There was a problem syncing GitHub. Try again later.”
   [Source](https://github.com/orgs/community/discussions/178890). The discussion also contains an
   `OAuth state invalid or not found` report, showing callback/session continuity must be tested.
3. A Semgrep false-positive report concludes the pattern was “overbroad and doesn't rely on any
   semantic property.” [Source](https://github.com/semgrep/semgrep/issues/10984). This matches the
   failure mode of treating regex hits as verified vulnerabilities.

First-party Lunar evidence is stronger than analogy: on 2026-08-06 production guest scan detected
SQL concatenation but missed `exec(req.query.command)` and returned score 100.

## Pricing and who pays

- GitHub CodeQL is available for public GitHub repositories; private/internal repositories require
  GitHub Team or Enterprise with GitHub Code Security. GitHub bills licensed security use by active
  committers; the exact contract price is not public in the product docs.
- Semgrep Code and Supply Chain are free for organizations with at most 10 monthly contributors;
  larger teams need paid Team licenses. AI actions consume plan credits, so repeated AI benchmarks
  have a real quota/cost even when deterministic scanning is free.
- [Snyk pricing](https://snyk.io/plans/) lists Free at **$0/month**, Team from
  **$25/month per contributing developer**, Ignite from **$1,260/year per contributing developer**,
  and Enterprise by quote. Engineering/security teams pay for private-repository scale and controls.

## First-10-users channel

One channel: [GitHub Issues của Lunar](https://github.com/ThanhluanGif/Lunar/issues). Maintainer and
early users can receive a versioned verification report with reproduction commands, rather than a
claim that “AI scan is accurate” or “GitHub login works” without evidence.

## Why switch from the status quo

Today the operator can click OAuth, see a redirect, run a few scanner fixtures and still not know
whether a real session/repository sync completed or whether critical findings were missed. Lunar's
gate is useful only if it makes failure explicit: one redacted live OAuth trace, one versioned
ground-truth corpus, per-engine confusion matrices and a release threshold. This is narrower than
buying another AppSec platform and more honest than adding scanner rules before measuring baseline.

## Technically free vs hard

- Free/existing primitives: GitHub OAuth endpoints, Secure HttpOnly cookie policy, Puppeteer,
  Node assertions/fetch, existing deterministic scanners, OWASP-style confusion-matrix formulas.
- Hard/custom work: keep user consent interactive while collecting reproducible checkpoints;
  prevent token/state/code/cookie leakage; map findings back to labeled cases; distinguish engines;
  run AI three times within quota; report instability and failure without laundering either into
  a green test.
