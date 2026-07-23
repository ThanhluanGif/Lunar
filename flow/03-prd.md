# Stage 03 — PRD

1-2 pages max. Test: could a stranger build v1 from this without asking you anything?

## Gate — check ALL before `/flow next`
- [x] Every section below is filled from MY scope decision (stage 02), not re-expanded
- [x] Success metric is a NUMBER, not vibes ("save time" fails; "first response < 2h" passes)
- [x] Each feature names the user action and the observable result, tagged with a stable `FRn:` id
- [x] Pain & gain is a MAPPING TABLE: every pain cites evidence (a stage-01 quote or a named observation), and names the v1 feature that kills it; every v1 feature kills at least one pain
- [x] A stranger could build v1 from this without asking me anything
- [x] No FILL placeholders remain in this file

## Context

Lunar is an AI-powered code review and vulnerability patch community web application. While the underlying scanning engine and modal dialogs are functional, the frontend design requires a visual overhaul based on the provided Figma link to deliver a high-converting, modern dark-mode aesthetic with refined typography and glassmorphic UI components.

## Target users

Frontend/Backend developers, security auditors, and open-source contributors looking for AI-assisted code reviews, security scans, and community audits.

## Pain & gain (mapping table — the traceability spine of the PRD)

Every row: a concrete pain, the evidence it's real, what people do about it today, the
ONE v1 feature that kills it, and the observable gain. If a feature kills no pain, cut
it; if a pain has no feature, it goes to the "not addressed" list — honestly.

| # | Persona | Pain (concrete) | Evidence (stage-01 quote/source or named observation) | Today's workaround | V1 feature that kills it | Observable gain |
|---|---|---|---|---|---|---|
| P1 | Developer | Cluttered, non-responsive UI makes inspecting code diffs difficult | "AI code review bots feel detached from design system" | Manual inspection in terminal | FR1: Figma-Aligned Dark Design System | Clean, high-contrast code diff view |
| P2 | Auditor | Hard to test before/after fixes interactively | "Need interactive workspace for before/after auto-fix" | Manual refactoring | FR2: Interactive Code Repair Workbench | Instant one-click before/after diff preview |
| P3 | Team Lead | No clear visual dashboard for security CVE scores and repository health | "Traditional static analyzers dump wall-of-text warnings" | Excel spreadsheets / text logs | FR3: Security Dashboard & CVE Scanner | Real-time score radar and severity cards |

### Pains NOT addressed in v1 (deliberate — tie to the scope cut list)

- Realtime multi-user live cursors — deferred to v2.

## Problem statement

Developers need a beautifully designed, high-performance UI matching the Figma reference that seamlessly presents AI code reviews, live repair workbenches, and community security audits without breaking existing functionality.

## Features (user-centric — action → observable result)

- FR1: As a user, I open the site and see a sleek Figma-designed hero section, top navigation bar, and interactive code demo with 100% responsive dark mode theme.
- FR2: As a developer, I click "Watch Lunar Work" or select a project, and I can switch between 'before' and 'after' code states with highlighted vulnerability tags.
- FR3: As a security reviewer, I navigate tabs (Explore, Security Dashboard, Repair Workbench, Community) and view security scores, radar charts, and CVE severity badges.
- FR4: As a user, I can open Auth, Pricing, GitBot Config, Submit, and Export Audit Report modals and complete actions without UI layout breakages.

## Non-functional requirements

- 100% responsive layout across desktop and mobile.
- Zero regression in existing scanner service state (`scanCodeForSecurityVulnerabilities`).
- Fast initial render under 200ms.

## Tech stack

- Frontend: React 18, Vite 5, Lucide React icons, Vanilla CSS design tokens.

## Success metric (numbers only)

100% of 5 main view tabs (Landing, Dashboard, Workbench, Community, Project Detail) and 5 interactive modals render clean Figma-compliant styles with 0 broken state handlers.
