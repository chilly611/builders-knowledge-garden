# W9.D Session Handoff — Pickup Brief for the Next Cowork Session

**Date sealed:** 2026-04-28
**Last live commit:** `28a50da` — "W9.D.9 — cockpit zones filled + RSI demo + Knowledge Gardens umbrella + marketplace + best practices (9-lane wave)"
**Production URL:** `builders.theknowledgegardens.com` (Vercel project `chillyd-2693s-projects/app`)
**Source of truth:** `https://github.com/chilly611/builders-knowledge-garden` — main branch.

This document is the **single self-contained pickup** for the next session. Read it first. Everything else is in the repo.

---

## What's live right now (verify against the deployed URL)

### The Killer App (`/killerapp/...`)
- 17 workflow routes shipping. 3 are LLM-backed and contractor-smoke-tested:
  - **Code Compliance** (q5) — jurisdiction picker (CA/AZ/NV + IBC), 4 trade specialists, 3-source verification (IBC/NEC/local amendments), entity-cited responses.
  - **Estimating** (q2) — voice-first scope intake, $X–$Y range with line-item breakdown by trade, 13-trade table, regional multiplier, risk items, confidence signal.
  - **Supply Ordering** (q11) — live cost matrix from Home Depot Pro, 84 Lumber, White Cap. Lead time + branch distance + confidence badges.
- **ProjectCockpit** (W9.D.9) — single sticky band at top of every workflow route. Three zones with brass-circle hinge dividers between them:
  - JourneyArc (left, 40%): seven-station drafting arc, brass tick marks, navy ink curve, brass compass needle pointing at current stage. Click any station = jump to first workflow of that stage.
  - TimeMachineDial (center, 25%): drafting compass dial with brass needle + snapshot ticks + relative-timestamp tooltips.
  - BudgetSnapshot (right, 35%): log-scaled 7-stage sparkline (brass = spent, faded-rule outline = committed, redline = over-budget) + two-line summary.
- **StageBackdrop** — per-stage atmospheric backdrop on every workflow route. Five raster (beginning-journey, sizeup, lock, plan, build) + three SVG drafting-paper for stages 5–7. Stage-accent multiply-blend wash + Trace overlay tuned per-stage.
- **KillerAppNav** — top chrome bar with stage-landscape pill row (always visible) on right side. Each pill routes to first workflow of that stage. Click logomark → /killerapp picker.
- **CommandPalette (⌘K)** — global launcher, type any stage or workflow, Enter routes.
- **VoiceCommandNav** — feature-flagged FAB (`NEXT_PUBLIC_VOICE_NAV=enabled`). Web Speech API, 14 intents, trigram fuzzy + regex.
- **GlobalAiFab** (bottom-right) — stage-aware copilot. Streams from `/api/v1/copilot` with stage context. Renders markdown including `[label](action:/path)` action buttons.
- **CompassBloom** (bottom-right secondary) — architect-dividers FAB with knurled brass hinge, navy ink legs, brass protractor arc. Active-lane subtle rotation (motion-reduce safe).
- **Demo seed** — auto-loads on first visit. Project: "San Diego ADU 2500 sqft 2BR modernist" — $385K committed / $47.2K spent across 7 stages. 3 Time Machine snapshots (contract signed / permits filed / foundation poured). 3 workflows in various completion states.
- **Error boundaries** on `/killerapp/error.tsx` + `/killerapp/workflows/error.tsx` so no white-screen crashes.

### Supporting routes
- **`/rsi`** — public-facing recursive self-improvement narrative. Hero + five loop cards with sparklines + "why it matters" feedback-cycle SVG flowchart + volume callout strip + CTA to live specialist. The investor moat page.
- **`/umbrella`** — Knowledge Gardens parent landing. Four-garden constellation: Builder's (Brass · Live), Health (Robin's Egg), Orchid (deep purple), NatureMark (moss green). Compounding-moat link to /rsi.
- **`/marketplace`** — six-pillar overview: Supplies + Equipment + Legal (Live), Talent + Capital + Robots-and-AI-agents (in design / Q3 / Q4). Cross-pillar example flow card.
- **`/dream/*`** — 14 experimental DREAM-tier interfaces (some prototypes from earlier sessions; quality varies).

### The investor materials (read-only docs)
- `docs/strategy/rsi-narrative.md` (~1,917 words) — the long-form moat argument with cited file paths.
- `docs/strategy/rsi-investor-deck.html` — 10-slide deck, drafting-paper aesthetic, scroll-snap nav, inline SVG.
- `docs/strategy/W9-D-demo-script.md` — 2-minute investor demo script.
- `docs/strategy/W9-D7-demo-smoke.md` — flagship-route smoke audit.
- `docs/strategy/W9-D9-smoke.md` — 138 routes / 377 tests / 60s build verification.
- `docs/strategy/competitive-brief.md` — Procore / Buildertrend / Knowify / JobTread / Foreman / Houzz / Fieldwire / CompanyCam / Trimble + Builty positioning.
- `docs/strategy/naming-candidates.md` — naming exploration.
- `docs/best-practices/` — 5 articles (~7,128 words): bidding, MEP sequencing, 90-day cash flow, local amendments, supply-chain spikes.

### Authoritative source-of-truth docs
- `docs/killer-app-direction.md` — 20 founder-locked decisions. The constitution.
- `docs/design/design-constitution.md` — 10 design goals, W8 palette lock, 7 Primitives Manifest.
- `docs/design/W9-one-pager.md` — vision + drift table.
- `docs/design/W9-integrated-surface-spec.md` — 770-line cockpit spec (now executed via W9.D.9).
- `docs/design/W9-compass-navigator-spec.md` — compass redesign spec.
- `tasks.lessons.md` — durable lessons across all sessions.
- `tasks.todo.md` — pending items.

---

## What's still rough (the next session's work)

### Visible polish gaps
1. **Cockpit cohesion under stress** — three zones render but their visual rhythm needs a designer's pass. Brass hinges, tick spacing, vertical alignment between zones could be tighter.
2. **Mobile cockpit** — currently zones stack vertically at <640px. Needs explicit design pass for thumb-reach + scroll behavior.
3. **Stage backdrop legibility** — variable per page. Plan-it-out's white geometric art competes with content. Adapt/Collect/Reflect SVG backdrops are bare relative to the rasters.
4. **/umbrella + /marketplace** — skeleton-quality. Need real screenshots / mood imagery / live-data wiring.
5. **CompassBloom architectural compass** — visually present but not yet *the* moment it should be on first encounter.

### Functional gaps
1. **14 untested specialists (q12–q27)** — Build / Adapt / Collect / Reflect stage workflows haven't been validated against real contractor questions. Risk: a Code Compliance-style incident in front of an investor.
2. **RSI volume is synthetic** — `/rsi` shows demo data labeled as such. Real RSI telemetry is wired (`src/lib/rsi/`) but volume isn't there. Need 100+ real specialist runs before the page tells a true story.
3. **Building Intelligence commercial model undecided** — separate B2B API/MCP product vs. bundled in tiers? This is the one founder decision that unblocks revenue narrative + investor deck.
4. **Badge / certification thresholds** — designed (rankTiers in workflows.json) but UI rendering not built. Authority decision (self-issued / partnered) deferred.
5. **`/killerapp → /app` rename** — pending (task #78). Affects all existing user URLs; needs redirect plan.

### Pending tasks (from `tasks.todo.md`)
- #46 W3.6 Compass Navigator polish
- #68 W7.P Journey + Time Machine + Budget integration brainstorm (W9.D.9 partially completed but design polish remains)
- #72 W7.Q.4 Audit Robin's Egg color token — Tiffany blue reference
- #78 W8.2 Rename /killerapp → /app with redirects
- #86 W9.A Research + Spec farm (7 parallel agents)
- #104 W9.D Wave 2 integration across workflow routes (per-route cockpit context wiring)

---

## Repository state

- Branch: `main`
- Latest commit on origin: `28a50da` (W9.D.9 cockpit + RSI + umbrella + marketplace).
- Local working tree: clean as of session seal.
- Vercel project: auto-deploys on push to main, except when GitHub webhook desyncs (recurring issue — fix is to manually click "Create Deployment" in Vercel UI pointing at `main`).
- Vercel cron: `vercel.json` has both heartbeats on daily cadence (Hobby tier compliant — do not change to sub-daily without upgrading to Pro).

### Key technical decisions in force
- **Next.js 16.2.1** + React 19 + TypeScript strict + Vitest + Tailwind v4
- **framer-motion 12.38** is installed — use it, don't reinstall
- **W8 canonical palette is locked**:
  - Navy `#1B3B5E` · Navy Deep `#0E2A47`
  - Trace `#F4F0E6` · Graphite `#2E2E30` · Faded Rule `#C9C3B3`
  - Brass `#B6873A` · Redline `#A1473A`
  - Robin's Egg `#7FCFCB` (peak) · Deep Orange `#D9642E` (peak)
- **Stage accents (additive axis, not replacement):** Stage 1 ochre `#C9913F` · Stage 2 indigo `#3E3A6E` · Stage 3 teal `#2E9E9A` · Stage 4 coral `#E05E4B` · Stage 5 magenta `#B23A7F` · Stage 6 brass `#B6873A` · Stage 7 dusk-purple `#5E4B7C`.
- **Token shapes (CRITICAL — agents keep getting this wrong):**
  - `spacing` from barrel `@/design-system/tokens` is **numeric-keyed** (`spacing[2]` = 8px). NOT `spacing.sm`.
  - `fontWeights` is named-keyed: use `fontWeights.regular` NOT `fontWeights.normal`.
  - `fontSizes` is named-keyed: `fontSizes.sm`, `fontSizes.lg` etc.
  - SVG `<text>` does NOT take a `title` attribute — use `<title>` child element.
- **Stage labels** (foreman voice, canonical): `Size up / Lock it in / Plan it out / Build / Adapt / Collect / Reflect` — source `src/lib/lifecycle-stages.ts`.
- **`ANTHROPIC_API_KEY`** must be set in Vercel env for live LLM responses. Without it, copilot mock fallback is stage-aware (no compliance leak across stages).
- **RAG retrieval is gated** — `STAGES_THAT_USE_CODE_RAG = new Set([2])`. Only Lock-it-in stage retrieves code entities. Critical: prevents code-compliance content from bleeding into other stages.
- **`useSpeechRecognition`** has backward-compat aliases (`isListening`, `isSupported`, `startListening`, `stopListening`) — the canonical names are `listening`, `supported`, `start`, `stop`. Don't break the aliases or the dream-route consumers crash.

---

## Operating rules (durable across sessions)

1. **Always run `next build` in main context before pushing.** Three deploys died to the "vitest passes / Turbopack tsc fails" pattern. Trust nothing else.
2. **Parallel agents must be given disjoint file scope + DO NOT TOUCH lists** + canonical references inline. The W9.C / W9.D pattern works.
3. **Never let a parallel agent rename a shared hook's public contract** without grepping all consumers and either updating them or preserving aliases.
4. **CYA vocabulary is banned in user-facing AI output:** "Authority Having Jurisdiction", "AHJ", "consult a licensed architect/engineer/attorney", "we recommend retaining". Sanitizer at `/api/v1/copilot` strips these on the way out.
5. **Stage-3 (Plan it out) copilot prompt is HARD-RULED** to respond with a sequence plan. Never zoning. Never ADU regulations. Test: paste "2500 sqft ADU in San Diego" — should return a critical path table, not a code lecture.
6. **Never commit without explicit user authorization.** This is a standing user preference.
7. **Vercel webhook desyncs.** When pushes don't auto-deploy, click "Create Deployment" → enter `main` → it pulls HEAD.

---

## How to start the next session cleanly

1. Read this file (`docs/strategy/W9-D-session-handoff.md`) first.
2. Read `tasks.lessons.md` (skim — heavy file).
3. Run `git log --oneline -20` to see recent context.
4. Check live deploy at `builders.theknowledgegardens.com` — verify it matches commit `28a50da` or later.
5. Pick from the "Pending tasks" list above OR ask the founder what's next.

If something looks broken on the live site that isn't documented here, suspect:
- Vercel didn't redeploy → click Create Deployment.
- ANTHROPIC_API_KEY rotated → check Vercel env vars.
- Cron-config deprecation warnings (pre-existing, non-blocking on Hobby).

---

**Founder voice signature** for the next session: foreman-on-the-jobsite-phone. Direct, kind, no jargon, no CYA hedging. "We don't hallucinate code. We sequence work. We make builders smarter on every query."

End of handoff.
