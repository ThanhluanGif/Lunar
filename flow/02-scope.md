# Stage 02 — Scope (go/no-go)

Scope = features chosen by IMPACT × COST, inside your time budget.
KILL here is cheap and smart. Killing a weak idea at this gate is a SUCCESS outcome.

## Impact rubric (business value — score BEFORE looking at cost)

| Impact | Meaning |
|---|---|
| H | moves money or the core promise: gets users in (acquisition), gets them paying (revenue), or delivers the one job they came for |
| M | keeps users / saves real time weekly (retention, operations) |
| L | nice-to-have; nobody would pay for or switch over it |

Decision matrix: **H-impact features justify B/C cost** (via the C-paths below).
**L-impact features must be grade A or they're cut** — and even grade-A L-features are
cut when the budget is tight. The classic failure is a v1 full of A-grade L-impact
features: cheap to build, worthless to sell.

## AI coding grade rubric

| Grade | Meaning | Examples |
|---|---|---|
| A | cheap for AI | CRUD, forms, dashboards, content sites, API wrappers |
| B | moderate | file processing, 3rd-party integrations, auth via library, single LLM call, HITL AI drafts |
| C | expensive | realtime, payments from scratch, custom auth, autonomous agentic AI pipelines, heavy concurrency |

**Grade is a COST estimate, not a permission.** The gate is fit(grades, budget), not "no C allowed."
When a C feature is the real need, three honest paths:
1. **The C feature IS the product** → invert the cut: C goes FIRST (riskiest assumption first),
   everything else is minimized to serve it, and the budget is renegotiated against reality.
   But: one C proves the value prop — its siblings are v2 cards, not v1 scope.
2. **Re-architect C down to B** (highest-leverage move): multi-step agent → single LLM call;
   auto-send → human-approves-draft; custom pipeline → managed service / library.
   Same user value, one grade cheaper.
3. **Irreducible C that doesn't fit the budget** → KILL or re-budget. Both are honest.

## Gate — check ALL before `/flow next`
- [x] Every feature below has an IMPACT (H/M/L with the business reason) AND a grade (A/B/C)
- [x] No L-impact feature above grade A survives in v1
- [x] The suggested-features section was actually considered (each suggestion has an in/out decision)
- [x] fit(grades, budget) holds — every C in scope is justified as path 1, 2, or 3 above (written next to the feature)
- [x] If the product IS a C feature: it is FIRST in build order, and its sibling C features are on the cut list
- [x] The cut list is written (what I am NOT building in v1)
- [x] GO / KILL decision is written below
- [x] No FILL placeholders remain in this file

## Time budget

4 hours (Frontend redesign & component polish)

## Features in v1 (each with impact AND grade)

- Figma-aligned Design System & Top Navbar: Impact H (Acquisition/Visual first impression) — Grade A (React + Vanilla CSS Design Tokens)
- Figma-inspired Landing Hero & Live Code Editor Demo: Impact H (Core value prop conversion) — Grade A (Interactive React State & Before/After Code Diff)
- Security Dashboard & Vulnerability Scanner: Impact H (Core job execution) — Grade A (Regex/AST heuristic scan engine + interactive CVE cards)
- Code Repair Workbench & Patch Generator: Impact H (User delight & actionability) — Grade A (Interactive patch review & apply logic)
- Community Reviews & Leaderboard: Impact M (Retention & social proof) — Grade A (React state tables & badge modals)
- Modals (Auth, Pricing, GitBot Config, Export Audit Report): Impact M (Revenue & integrations) — Grade A (React modal overlays)

## Suggested features (impact-first — proposed, not decided)

- Dark Glassmorphic Theme System — Impact H (Figma visual alignment) — Grade A — IN (Directly matches the requested Figma spec)
- Animated Code Repair Streamer — Impact M — Grade B — OUT (Keep existing fast state transitions without extra runtime complexity)

## Cut list (NOT in v1 — deferred, not deleted)

- Realtime WebSocket Multi-user Collaboration: Deferred to v2 to focus on single-user UI perfection.
- Custom Backend OAuth Server: Deferred (using mock auth state).

## Decision

GO — Redesign Lunar frontend layout to match Figma specification while preserving 100% of existing application state, modals, and scanning logic.
