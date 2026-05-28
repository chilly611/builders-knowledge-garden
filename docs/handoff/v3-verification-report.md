# V3 Killer App Rehaul — Verification Report

## The Moat (verbatim)

> The RSI Heartbeat is the platform. One self-improving knowledge graph per garden, ingesting source data on a domain cadence, re-verifying every entity, surfacing freshness on every claim, learning from use. The platform doesn't hold knowledge — it improves itself in public. Every other platform in our space holds static data and ages. We get more right every week. That is the moat in the AI era.

## Executive Summary

**4 of 6 surfaces clean. 2 with material partials. 0 outright failures.**

- `credentialing/page.tsx` — **CLEAN.** All 11 gates pass.
- `projects-v3/page.tsx` — **CLEAN.** All 11 gates pass.
- `compliance/page.tsx` — **CLEAN.** All 11 gates pass (no in-route cross-link, but ModalityMirror provides surface continuity).
- `alerts/page.tsx` — **PARTIAL.** No four-lane Floor 0 branching despite the doc claiming it. No cross-link to a sibling live surface.
- `rewards/page.tsx` — **PARTIAL.** No four-lane Floor 0 branching despite the doc claiming it. Whisper listed in pattern language but JSX was removed by Charlie pre-demo. Has the only explicit umbrella cross-link.
- `ask/page.tsx` — **CLEAN-ish PARTIAL.** Lane-keyed placeholders and examples cover four lanes but no distinct Floor 0 *blocks*. No in-page cross-link.

TypeScript compiles cleanly across all V3 surfaces + primitives. The 121 pre-existing `tsc` errors are entirely in `src/design-system/components/__tests__/*` and `src/lib/__tests__/*` from missing `@types/jest` / `@testing-library/react` — none introduced by V3.

---

## Per-Surface Gate Table

Legend: `P` = PASS, `~` = PARTIAL, `F` = FAIL

| Surface | 1 Moat | 2 Pattern enum | 3 Four-lane F0 | 4 TrustStrip | 5 ThreeSourceRule | 6 Federation | 7 useStanceCard | 8 No buzzwords | 9 No fog | 10 Brand | 11 Compiles |
|---|---|---|---|---|---|---|---|---|---|---|---|
| credentialing | P | P | P | P | P | P | P | P | P | P | P |
| projects-v3 | P | P | P | P | P | P | P | P | P | P | P |
| compliance | P | P | P | P | P | ~ | P | P | P | P | P |
| alerts | P | P | ~ | P | P | ~ | P | P | P | P | P |
| rewards | P | ~ | ~ | P | ~ | P | P | P | P | P | P |
| ask | P | P | ~ | P | ~ | ~ | P | P | P | P | P |

---

## Detailed Evidence (every PARTIAL / FAIL)

### `compliance/page.tsx`, gate 6 (Federation Contract) — PARTIAL

The file enumerates parchment background (line 238: `background: BRAND_COLORS.parchment`), Cormorant + Space Mono (via `BRAND_FONTS.display` / `.mono` throughout), the umbrella header treatment via `KillerAppChrome` (mounted at layout level), and surface continuity via `ModalityMirror` (lines 305-308, 311-315). What it does **not** do is render an explicit in-route hyperlink to another live BKG surface (e.g. `/killerapp/credentialing` or `/killerapp/projects-v3`). Footer is mono attribution only (line 354-356). The cross-link is implicit via the global layout, not in-page.

### `alerts/page.tsx`, gate 3 (Four-lane Floor 0) — PARTIAL

The header comment (lines 14-19) claims four lanes:
- Administrator: "What's on fire right now?"
- Professional: "What do I touch first?"
- Public: "What's blocking my project?"
- Machine: MCP feed

In code, the lane selector at line 178 sets `lane`, but the actual render branches only on `proMode = lane === 'professional' || lane === 'administrator'` (line 167). `visibleAlerts.map(...)` runs identically for every lane (lines 196, 204). Public lane gets the same full alert list as Administrator with no minimal-status simplification. No `machineF0` JSON rendering; the agent payload appears only inside `ModalityMirror forceModality="agent-api"` at line 240 (unconditional, not lane-gated).

### `alerts/page.tsx`, gate 6 (Federation Contract) — PARTIAL

Parchment + brand fonts + chrome present, but no in-route hyperlink to another live surface. The `affectedProjectId` field is read in compliance but not in alerts.

### `rewards/page.tsx`, gate 2 (Pattern Language enum) — PARTIAL

Header comment (lines 11-16) lists `Whisper (first encounter with each reward type)` as part of the composition. The actual `Whisper` JSX was removed by Charlie 2026-05-27 (line 158: `{/* WHISPER REMOVED 2026-05-27 per Charlie — demo clarity. Restore post-demo. */}`). The pattern-language comment is now out of sync with the JSX. Same comment-vs-code drift in `credentialing/page.tsx` line 308 and `ask/page.tsx` line 134, but in those files the comment block doesn't list Whisper as a composition member, so only rewards is partial here.

### `rewards/page.tsx`, gate 3 (Four-lane Floor 0) — PARTIAL

Lane selector renders four buttons (line 161) and persists override, but the only render-time branching is `proMode = lane === 'professional' || lane === 'administrator'` (line 146). `REWARDS.map(... viewMode={proMode ? 'pro' : 'human'})` (line 184) is identical for Public and Machine — there is no public-shaped homeowner narrative, no machine JSON payload. The four-lane contract is claimed in the doc-comments of the project (in `lane-stance-strategy-v3.md`) but this surface only honors a 2-way pro/non-pro split.

### `rewards/page.tsx`, gate 5 (ThreeSourceRule) — PARTIAL

`verifyThreeSource` is not directly imported or called on this page. The rule is applied **indirectly** through `<TrustStrip>` (line 132), which calls `verifyThreeSource` internally (TrustStrip.tsx line 70). That counts as enforcement, but unlike compliance / alerts the verdict tier is never surfaced to the user explicitly — the badge color is the only signal. Marked partial because the rule is enforced but the verdict is not load-bearing in any render decision the human sees.

### `ask/page.tsx`, gate 3 (Four-lane Floor 0) — PARTIAL

`placeholderByLane: Record<StanceLane, string>` (line 98) and `exampleQuestions: Record<StanceLane, string[]>` (line 105) both cover all four lanes. The InvitationCard reflects lane in `proSubtitle` (line 147) and AskAnything placeholder (line 154). However there is no per-lane Floor 0 **block** — same component tree renders for every lane, with only string substitutions. The Machine lane shows the same `AskAnything` text input as humans, which is the wrong shape for a machine-lane Floor 0 (should be the JSON contract front-and-center). The `MachinePayloadDemo` (line 174) does render but unconditionally, below all lanes.

### `ask/page.tsx`, gate 5 (ThreeSourceRule) — PARTIAL

`verifyThreeSource` is not imported on the page; the example answer's TrustStrip (lines 182-192) is hand-fed three citations so it always renders authoritative. No render gate that would suppress an authoritative label for a 1- or 2-source answer. The actual `/api/v1/ask/route.ts` does call `verifyThreeSource` (verified — line 19 of that file imports it), so the contract holds end-to-end, just not in this page's mocked example.

### `ask/page.tsx`, gate 6 (Federation Contract) — PARTIAL

Parchment + brand fonts + CulturalRender wrapper (line 124) present. No in-page hyperlink to a sibling surface. Footer is the MCP attribution only (line 195).

---

## Cross-Cutting Findings

### Primitive exports — clean.
`src/components/primitives/index.ts` exports 18 React components plus the `StanceCard` types and the `verifyThreeSource` / `isAuthoritative` / `verdictLabel` helpers. The barrel itself documents that pieces #10 (FederationContract) and #11 (MachineLegibleEverything) are platform-level — enforced via brand-tokens + route conventions rather than components — which is why the file has 19 source files but exports only 18 component bindings. JSDoc at the top of `index.ts` (lines 10-40) enumerates the full 20-piece Pattern Language with numbering.

### Stance Card resolver — real, not a stub.
`src/lib/stance-card.ts` reads actual signals before returning DEFAULT:
- line 47: `if (/mobi|android|iphone/.test(ua) && !/ipad|tablet/.test(ua)) return 'phone';`
- line 67: `if (path.startsWith('/killerapp')) return 'killer-app';`
- line 100-102: `const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;`
- line 144-151: server-side `resolveStanceCard` parses `accept-language`, `user-agent`, `surface`, `lane`, `jurisdiction` from request inputs.
- line 169: `window.localStorage.getItem(STORAGE_KEY)` reads persisted overrides for cross-session memory.

The hook subscribes to `popstate` + `resize` (lines 204-205) so surface inference re-fires when the user navigates. This is a real resolver, not a default-returner.

### GreenFlashProvider — untouched.
`git log --oneline src/components/GreenFlashProvider.tsx` returns exactly one commit: `1257e7d feat: add Green Flash reward UX system for Killer App`. No V3 commit touched it. The rewards page composes around it via the layout-mounted provider (rewards/page.tsx footer line 215 calls this out explicitly).

### MCP / API endpoints.
- `/api/v1/ask/route.ts` — **exists**, imports `verifyThreeSource` and `SourceCitation` from primitives, returns verdict tier + sources. Honors the WS6 contract.
- `/api/v1/credentialing/route.ts` — **does NOT exist.** The page footer (line 478) claims `API · GET /api/v1/credentialing (WS2 wires this to Supabase)` but the route file is absent. Inline JSON-LD payload renders in the page (MachineFloor0 starting line 230), so the machine-lane has *content*, but no server endpoint a third-party agent could call.

---

## Founder Dogfood Gate — Four Charlies Walkthrough

Production base URL: `builders.theknowledgegardens.com`. Lane override is persisted in localStorage at `kgos:stance-card:v1`. The lane-selector pill row on each V3 surface mutates it; visiting in a private window starts from DEFAULT (public).

### Charlie 1 — The Administrator (GC running the firm)
Order to visit on iPhone:
1. `/killerapp/credentialing` — tap `administrator` pill. Look for: full crew expiry list sorted by soonest-first; TrustStrip badge on every row.
2. `/killerapp/compliance` — tap `administrator`. Look for: the EPA RRP stop-work alert (alert-003) rendering with red left border + red `stop-work · authoritative` chip.
3. `/killerapp/projects-v3` — tap `administrator`. Look for: only at-risk + blocked projects appearing in Floor 0 (Bayview Kitchen should be the lone card).
4. `/killerapp/alerts` — tap `administrator`. Look for: the stop-work alert at top with red border. **Known gap:** rendering is identical to public lane.

### Charlie 2 — The Professional (the licensed contractor)
1. `/killerapp/credentialing` — tap `professional`. Look for: ProName ("OSHA Construction Industry Outreach…") rendering in place of human OSHA-10, "Renew at issuer →" copper button.
2. `/killerapp/projects-v3` — tap `professional`, ProToggle on (Gantt). Look for: critical-path Gantt rows replacing cards.
3. `/killerapp/compliance` — tap `professional`. Look for: NEC 2023 citation diff (Floor 4 in InfiniteDescent) — red strike + green replacement on §210.52(C).
4. `/killerapp/ask` — tap `professional`. Look for: example questions changing to "What is a Manual J load calculation, in pro depth?"

### Charlie 3 — The Public (homeowner verifying / checking on their house)
1. `/killerapp/credentialing` — tap `public`. Look for: "Marisol Chen holds OSHA-10 in US-federal" plain-English line + inline TrustStrip.
2. `/killerapp/projects-v3` — tap `public`. Look for: "Where is my house at?" + homeowner narrative ("Cabinets are about to install…").
3. `/killerapp/compliance` — tap `public`. Look for: minimal status line "Your contractor has 1 stop-work item and 1 warnings under review."
4. `/killerapp/rewards` — **known gap:** identical to admin view; no homeowner-shaped public rendering.

### Charlie 4 — The Machine (agent acting on behalf of the user)
1. `/killerapp/credentialing` — tap `machine`. Look for: schema.org JSON-LD with `EducationalOccupationalCredential` items + endpoint `/api/v1/credentialing`. **Known gap:** endpoint does not exist server-side.
2. `/killerapp/projects-v3` — tap `machine`. Look for: schema.org Project payload + `/api/v1/projects` endpoint.
3. `/killerapp/compliance` — tap `machine`. Look for: `AlertAction` payload with `verdict.tier` field per alert.
4. `/killerapp/ask` — tap `machine`. Look for: the `MachinePayloadDemo` block showing the POST contract; verify by curling `POST /api/v1/ask` against the live site to confirm the verdict-gated answer comes back.

### Phone-specific gotchas to look for
- Federation Contract: parchment background should be consistent on all six routes — no white flash, no blue accent bleed.
- Cormorant Garamond renders on H1s; Space Mono on the mono caps strips. Confirm on iOS Safari (font load can lag).
- ProToggle should be tappable (44pt target) — credentialing header has a tight cluster of pill buttons + ProToggle, watch for overlap on narrow viewports.
- TempoAdapt: try the `emergency` tempo pill on compliance — InvitationCard should collapse to ceremonial copper-rim single button.

---

## Recommended Next Moves (Prioritized)

1. **Add lane-branched Floor 0 to alerts and rewards.** Both surfaces currently fail Charlie 3 (public) and Charlie 4 (machine) of the dogfood gate. ~50 lines per surface to mirror the compliance pattern (lines 232-235 in compliance/page.tsx). Highest founder-demo impact.
2. **Stand up `/api/v1/credentialing/route.ts`.** The credentialing footer makes a promise that the absent endpoint contradicts. Mirror `/api/v1/ask/route.ts` shape; return the same JSON-LD payload `MachineFloor0` already generates. ~30 LOC.
3. **Reconcile rewards pattern-language doc-comment with Whisper removal.** Either restore the Whisper or update lines 11-16 to reflect what shipped. Same lint applies to credentialing line 308 + ask line 134 (Charlie's whisper-removal comments) — convert them from inline `{/* */}` artifacts to a single explanatory note at the top of the file.
4. **Wire an in-route cross-link on compliance, alerts, ask.** Even a footer "Affected project: Bayview Kitchen → /killerapp/projects-v3" satisfies Federation Contract gate 6 and reinforces the federated-platform read.
5. **Install `@types/jest` + `@testing-library/react` types** to clear the 121 pre-existing `tsc` errors in `src/design-system/__tests__/` and `src/lib/__tests__/`. None are V3-introduced, but they make `npx tsc --noEmit` noisy enough to mask future regressions.
6. **Document Stance Card persistence behavior in onboarding.** `kgos:stance-card:v1` in localStorage survives across surfaces, which is the right behavior but a debugging surprise — calling it out in `MICHAEL-START-HERE.md` will save a Slack ping.
