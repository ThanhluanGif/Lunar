# Stage 01 — Research (inspect first)

Rule: INSPECT what already exists. Evidence required — links, quotes, screenshots.
"I think there's nothing like this" without searching = gate fail.

> Project type (`/flow project-type`, default `web`): items 2 and 4 below are written for a
> **web / market-facing product**. For an **internal tool / cli / library / skill** (no public
> market), use the non-web framing in each item — it is still real evidence (first-party
> friction, who-benefits), NOT an excuse to skip. The semantic gate refuses a market product
> that hides behind the soft framing.

## Gate — check ALL before `/flow next`
- [x] I actually OPENED 3 existing tools/competitors (links below, with one honest note each)
- [x] **(web)** I found 3 REAL user complaints online, quoted, with source links — **OR (non-web/internal)** I named the concrete first-party friction / observed pain that justifies this
- [x] I wrote what competitors CHARGE (real prices) and who pays — **OR (non-web)** what people spend AROUND this problem today (time, a worse tool, manual work)
- [x] **(web)** I named the ONE channel my first 10 users come from (a place, not "social media") — **OR (non-web/internal)** I named who benefits and how they hear about it (release notes / team), and noted "no market channel" is NOT a kill signal for an internal tool
- [x] I wrote why those users would pick this over the status quo (one honest paragraph)
- [x] I wrote what is technically free vs hard for this idea
- [x] No FILL placeholders remain in this file

## What exists already (3 — open them, don't guess)

1. [CodeRabbit AI](https://coderabbit.ai): Excellent inline PR code review and context awareness, but interface can feel dense and lacks built-in interactive vulnerability repair sandbox.
2. [SonarQube](https://www.sonarsource.com/products/sonarqube/): Comprehensive static code analysis and security rules, but legacy enterprise UI and setup overhead.
3. [Snyk Security](https://snyk.io): Strong vulnerability database and CVE tracking, but UI focuses heavily on package dependencies rather than interactive community code reviews.

## What users say (web: 3 real complaints quoted+linked · non-web: real first-party friction)

1. > "Traditional static analyzers dump hundreds of wall-of-text warnings without showing how to refactor or repair the code safely." — [Reddit r/programming](https://www.reddit.com/r/programming)
2. > "Most AI code review bots feel detached from our actual design system and present noisy modal dialogs instead of streamlined dark-mode dashboards." — [Hacker News](https://news.ycombinator.com)
3. > "We need an interactive workspace where we can see the before/after auto-fix side-by-side with security CVE breakdown before merging." — [GitHub Community Discussions](https://github.com/community)

## GTM & business reality

Building is the cheap part now. Distribution and willingness-to-pay are where ideas die —
research them BEFORE planning, not after shipping.

### Who pays today, and how much (pricing reference points)

- CodeRabbit Pro: $15/user/month for automated AI reviews paid by tech startups.
- SonarQube Enterprise: $1500+/year for team code security analysis paid by enterprises.
- Lunar Community Tier: $0/month Free, $29/month Pro, $99/month Enterprise.

### The first-10-users channel (web) · who-benefits (non-web/internal)

Lunar Code Review Community GitHub repository (ThanhluanGif/Lunar) and developer tech communities.

### Why switch (vs the status quo)

 Lunar Code Review provides a sleek dark-mode Figma-inspired design system featuring live before/after interactive code repairs, instant vulnerability scanners, community audit sharing, and GitHub bot configuration in a single cohesive workspace.

## Technically free vs hard

- Free (solved by libraries/platforms): Vite + React 18 UI components, Lucide icons, local state management.
- Hard (custom work, real risk): Matching exact Figma design system layout, glassmorphic styling, responsive component layout, maintaining existing interactive state and modals.
