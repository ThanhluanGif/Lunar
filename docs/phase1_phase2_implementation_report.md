# Phase 1–2 implementation report

## Delivered

- Server-side AI proxy with provider adapters for Gemini, OpenAI and Anthropic.
- Gemini structured JSON review using `gemini-2.5-flash` by default.
- Server-enforced daily AI quotas: Free 3, Pro 50, Enterprise unlimited.
- No browser-exposed AI keys and no fabricated fallback response.
- Deterministic SAST catalog supporting 22 languages and 555 language-rule signatures.
- Babel AST analysis for JavaScript and TypeScript security sinks.
- Authenticated GitHub deep scans with bounded file count, file size, total bytes and concurrency.
- Smart filtering for generated, dependency and binary-oriented directories.
- Scan findings, file paths and history persisted in PostgreSQL.
- Repository progress, per-file status tree and local folder scanning UI.

## Security decisions

- Source code is treated as untrusted prompt data.
- Provider keys remain server-side.
- AI input has a hard character limit and output uses a JSON schema where supported.
- GitHub tokens remain encrypted at rest.
- Deep scans require a connected GitHub account and the authenticated user's token.
- Free-tier scan and AI quotas are enforced on the server.
- External providers fail closed with `503` when not configured.

## Required configuration

At minimum, configure:

```env
LUNAR_GEMINI_API_KEY=...
LUNAR_GEMINI_MODEL=gemini-2.5-flash
```

GitHub deep scanning also requires the GitHub OAuth variables documented in `.env.example`.

## Validation

- `npm run qa`
- `npm audit --omit=dev`
- Docker multi-stage production build
- PostgreSQL migration verification
- AI unavailable/fail-closed test
- Deep-scan authentication/connection guard test
- Expanded SAST fixture test

## Remaining production work

- A live Gemini call requires a valid API key and was intentionally not simulated.
- Private repository access should use a fine-grained GitHub App rather than a broad classic OAuth `repo` scope.
- The current deep scan request is bounded and synchronous. A queue/worker plus SSE or WebSocket events is recommended for very large repositories.
- Multi-language parsing outside JavaScript/TypeScript currently uses deterministic lexical rules; tree-sitter parsers can be added incrementally.
