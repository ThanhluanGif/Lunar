# Stage 04 — ADR (architecture decisions)

## Gate — check ALL before `/flow next`
- [x] Each decision has a one-line why and a real rejected alternative
- [x] The NOT-doing list is written
- [x] Decisions cover data storage, auth approach and deploy target
- [x] No FILL placeholders remain in this file

## Decisions

| # | Decision | Why | Rejected alternative |
|---|---|---|---|
| 1 | One versioned corpus of 40 JavaScript cases is the independent source of truth. | OWASP/NIST-style known good/bad labels make TP/TN/FP/FN reproducible. | Generate expected labels from Lunar output, because that would grade the scanner with its own answers. |
| 2 | Score deterministic SAST and AI review separately, then combine only at the release verdict. | The engines have different behavior and failure modes; one blended number hides drift. | Call every result “AI scan” or allow one lane to compensate for a critical miss in another. |
| 3 | Run AI on the same corpus exactly three times and report worst plus median metrics. | Three bounded calls expose instability while fitting the default daily quota and cost budget. | Run once, which hides variance, or loop until a passing result, which launders quality. |
| 4 | Use Puppeteer on canonical production with operator-completed GitHub consent. | The browser preserves HttpOnly session state and verifies the real redirect/callback without exporting secrets. | Mock GitHub, inject a JWT or automate consent/MFA, none of which proves the production user journey. |
| 5 | Keep existing web OAuth, cookie session and PostgreSQL behavior unchanged. | C-001 measures the current system; changing auth while measuring destroys the baseline and adds security risk. | Switch to device flow, bearer tokens or new account-linking logic before identifying the failed checkpoint. |
| 6 | The live harness may create/update a dedicated test account's GitHub connection and public-repo rows, then logs out; it never disconnects or revokes automatically. | These are the intended effects of the real journey, while revocation is a separate operator-authority action. | Use a personal primary account or delete connection/account data automatically after the run. |
| 7 | Emit a redacted `CoreTrustBaselineReport`; baseline and enforcement are separate commands. | Measurement can complete honestly with a FAIL/BLOCKED verdict, while release enforcement must stay red. | Exit 0 with an unlabeled failure or require the measurement card to repair every discovered defect. |
| 8 | Canonical Vercel production is the only live target; offline benchmark remains network-free. | This proves world state and keeps deterministic regression reproducible. | Use stale preview deployments or put interactive OAuth/AI checks in PR CI. |

## NOT doing in v1

- No OAuth implementation, scope, callback, cookie, session, linking or repository-sync change.
- No scanner rule, severity, score, prompt, provider, model, quota or patch-generation change.
- No auto-consent, MFA bypass, token export, session replay or automatic grant revocation.
- No private/org/SSO repository coverage and no cross-vendor accuracy comparison.
- No claim that a `FAIL` baseline is a fixed product; it is evidence for the next scoped card.
