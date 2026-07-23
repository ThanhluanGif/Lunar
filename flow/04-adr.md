# Stage 04 — ADR (architecture decisions)

Short. The most valuable section is what you are NOT doing and why.

## Gate — check ALL before `/flow next`
- [x] Each decision has a one-line "why" and a one-line "what I rejected"
- [x] The NOT-doing list is written
- [x] Decisions cover: data storage, auth approach, deploy target
- [x] No FILL placeholders remain in this file

## Decisions

| # | Decision | Why | Rejected alternative |
|---|---|---|---|
| 1 | Component-driven React UI with centralized state in App.jsx | Maintains backwards compatibility with existing mock data and scanner logic while decoupling visual presentation | Rewriting state layer in Redux/Zustand |
| 2 | Pure CSS Design Tokens & Glassmorphic variables in index.css | Enables precise visual parity with Figma spec without external CSS framework overhead | Adding Tailwind CSS or heavy UI libraries |
| 3 | Static Client-Side Vercel/Vite build target | Zero server infrastructure needed for single-page app demonstration | Full-stack Next.js SSR server |

## NOT doing in v1 (and why it's safe to skip)

- Database integration: Using client-side state + mock datasets (`SECURITY_PROJECTS_MOCK`) since primary objective is UI/UX redesign.
