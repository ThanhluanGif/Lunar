# Stage 05 — Interface Contract (the seam)

Written before implementation. Existing production endpoints are systems under test; C-001 adds
only verification commands, fixtures and reports.

## Gate — check ALL before `/flow next`
- [x] Every PRD feature maps to at least one interface below
- [x] Every interface has input and output shapes written
- [x] Access/effects is filled for every interface
- [x] No FILL placeholders remain in this file

## Interfaces

| Method/interface | Path/name | Access/effects | Input shape | Output shape |
|---|---|---|---|---|
| `GET` | `/api/v1/auth/github/config` | Public, read-only | No body | `200 GitHubConfigResponse` |
| Browser navigation | `/api/v1/auth/github/start` → GitHub → `/api/v1/auth/github/callback` | Public start; operator consent at GitHub; callback may create/update Lunar user, GitHub connection, repository rows and Secure HttpOnly session cookie | No body; browser-managed state cookie; operator authorizes a dedicated account | Redirect to `/?github_auth=success|failed|invalid_state|link_required|unavailable`; secrets never enter report |
| `GET` | `/api/v1/auth/me` | Session cookie; read-only DB | No body | `200 AuthenticatedUserResponse`; `401` after logout |
| `GET` | `/api/v1/auth/github/status` | Session cookie; read-only DB | No body | `200 GitHubStatusResponse` |
| `GET` | `/api/v1/auth/github/repositories` | Session cookie; read-only DB | No body | `200 GitHubRepositoriesResponse`; harness records only count and public-test-repo presence boolean |
| `POST` | `/api/v1/auth/logout` | Session cookie; clears browser cookie | No body | `200 {success:true}`; subsequent `/auth/me` is `401` |
| Local function | `scanCodeForSecurityVulnerabilities(code,path,language)` | Offline; no write/network | One labeled case source and metadata | Normalized finding list mapped to case id/CWE; raw source excluded from report |
| `POST` | `/api/v1/ai/review` | Session cookie; consumes one daily AI review and writes existing usage log | `AiReviewBenchmarkRequest`; same corpus for exactly 3 calls | `200 AiReviewResponse` or sanitized `429/503`; normalized findings mapped to case IDs |
| npm command | `npm run qa:core-trust:baseline` | Offline except optional explicit live phase; writes only a redacted report path | `--mode deterministic|live|all`, `--origin` exact canonical value for live | Exit 0 only when requested measurements complete; stdout `CoreTrustBaselineReport`; verdict may PASS/FAIL/BLOCKED |
| npm command | `npm run qa:core-trust:enforce` | Reads report/fixtures; no application write | `--report .flow/core-trust-baseline.json` | Exit 0 only for PASS and thresholds met; exit 1 for FAIL/BLOCKED/threshold miss; exit 2 invalid input |

## Shared shapes

```text
GitHubConfigResponse {
  success: true,
  configured: boolean,
  code: null | "GITHUB_OAUTH_NOT_CONFIGURED",
  error: string | null,
  missingEnvironmentVariables: string[], // names only; never values
  callbackUrl: string | null,
  authFlow: "web" | "device" | null,
  redirectMode: "registered" | "explicit" | null
}

AuthenticatedUserResponse {
  success: true,
  user: { id: string, role: string, tier: string, ...existingPublicFields }
}

GitHubStatusResponse {
  success: true,
  connected: boolean,
  connection: null | { login: string, email: string, avatarUrl: string,
                        scopes: string[], lastSyncedAt: string }
}

GitHubRepositoriesResponse {
  success: true,
  repositories: Array<{ id, fullName, name, repoUrl, language,
                        isPrivate, updatedAt }>
}

BenchmarkCase {
  id: string,                       // stable, e.g. JS-CWE78-BAD-01
  expected: "VULNERABLE" | "SAFE",
  cwe: "CWE-78" | "CWE-79" | "CWE-89" | "CWE-95" | "CWE-798",
  severity: "CRITICAL" | "HIGH",
  appliesTo: Array<"deterministic" | "ai">,
  filename: string,
  language: "javascript",
  source: string                    // fixture only; never copied to report
}

AiReviewBenchmarkRequest {
  code: string,                     // generated corpus with stable case markers
  filename: "lunar-security-benchmark.js",
  language: "javascript",
  provider: "gemini" | "openai" | "anthropic",
  operation: "benchmark",
  customPolicies: []
}

ConfusionMatrix {
  total: integer,
  tp: integer,
  tn: integer,
  fp: integer,
  fn: integer,
  precision: number | null,         // tp / (tp + fp)
  recall: number | null,            // tp / (tp + fn)
  criticalRecall: number | null
}

OAuthCheckpoint {
  name: "start" | "callback-session" | "auth-me" |
        "github-connection-repositories" | "logout-invalidation",
  status: "PASS" | "FAIL" | "BLOCKED",
  httpStatus: integer | null,
  failureCode: string | null
}

CoreTrustBaselineReport {
  schemaVersion: 1,
  corpusVersion: string,
  generatedAt: string,              // ISO-8601
  origin: "https://lunar-zeta-ruddy.vercel.app" | null,
  oauth: {
    status: "PASS" | "FAIL" | "BLOCKED",
    checkpoints: OAuthCheckpoint[5]
  },
  scan: {
    deterministic: ConfusionMatrix,
    ai: {
      status: "PASS" | "FAIL" | "BLOCKED",
      provider: string | null,
      model: string | null,
      runs: ConfusionMatrix[0|3],
      medianRecall: number | null,
      worstRecall: number | null,
      disagreementCaseIds: string[]
    }
  },
  thresholds: {
    precisionMin: 0.90,
    recallMin: 0.85,
    criticalRecallMin: 1.00,
    aiWorstMedianGapMax: 0.10
  },
  verdict: "PASS" | "FAIL" | "BLOCKED",
  redaction: { secretFieldsEmitted: 0 }
}
```

## Contract rules

- `CoreTrustBaselineReport` must never contain cookie, JWT, OAuth state/code, access token, email,
  login, repository name/URL, source text, raw AI prompt/response or response headers containing
  credentials. Only stable case IDs and aggregate counts survive normalization.
- GitHub OAuth configuration diagnostics expose environment variable names only. `/config` returns
  `200` with `configured:false`; `/start` and `/device/start` fail closed with `503`, code
  `GITHUB_OAUTH_NOT_CONFIGURED`, and never redirect while required values are absent or invalid.
- A checkpoint is `BLOCKED` only for missing operator consent, provider/config/quota unavailability
  or network interruption; an observed product error is `FAIL`, not `BLOCKED`.
- Overall verdict is PASS only when OAuth is PASS, deterministic and AI thresholds pass, AI has
  exactly 3 runs, and `secretFieldsEmitted=0`. Precedence is deterministic: any observed OAuth or
  threshold failure makes the overall verdict FAIL; otherwise a required lane that could not be
  measured makes it BLOCKED; only then may it be PASS.
- Baseline completion and release enforcement are different exit contracts. An exit-0 baseline
  does not imply verdict PASS; `qa:core-trust:enforce` is the only green release signal.
- Express currently has no served OpenAPI spec. This planning contract names the exact existing
  interfaces consumed by C-001; application endpoint shapes must not be changed by the card.

## Feature → interface map

- **FR1 →** GitHub config/start/callback, `/auth/me`, GitHub status/repositories, logout,
  `qa:core-trust:baseline`.
- **FR2 →** deterministic scanner function, `/api/v1/ai/review`, `qa:core-trust:baseline`,
  `qa:core-trust:enforce`.
