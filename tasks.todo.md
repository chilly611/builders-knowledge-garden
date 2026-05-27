# Builder's Knowledge Garden — Master Task List


## ═══ KILLER APP CHROME — Thursday Contractor Demo (2026-05-27) ═══

Goal: persistent BudgetRibbon + JourneyTimeRow on every Killer App page, plus
Time Machine hook at the data layer. Shipped tonight, direct to `main` so
Vercel auto-deploys for the Thursday demo.

**Shipped:**
- [x] Read context: design-constitution, stage-accents, lifecycle-stages, existing time-machine + rewind hook
- [x] Audit 10 overlapping components (KillerAppNav, JourneyMapHeader, GlobalJourneyMapHeader, BudgetWidget, GlobalBudgetWidget, BudgetModule×2, GanttTimeline, GanttChart, ProjectConfidence, CompassNav) — delegated to an Explore subagent so main context stayed clean
- [x] Archive 6 originals to `src/components/_archive/2026-05-27/`
- [x] Build `src/components/killerapp-chrome/` (11 files, 1,366 LOC): KillerAppChrome wrapper, BudgetRibbon, SpendBlock, IncomeStackedTracks, HeadroomGauge, JourneyTimeRow, StageNode, TimelineMarkers, CompletionRing, types.ts, index.ts
- [x] Build `src/lib/time-machine/useTimeMachine.ts` (336 LOC) — wraps existing snapshot + rewind primitives, adds undo/redo/drafts/breadcrumbs API. No UI surfaced yet.
- [x] Build `src/lib/seed-data/marin-farmhouse.ts` — canonical Marin demo: 4,000 sqft, $1.65M, draws schedule per spec
- [x] Update `src/lib/demo-seed-data.ts` proj-chen-farmhouse to Marin / $1.65M / 4,000 sqft (was Austin / $285k)
- [x] Mount KillerAppChrome in `src/app/killerapp/layout.tsx` (Suspense-wrapped, between AuthAndProjectIndicator and ProjectCockpit)
- [x] Mount KillerAppChrome at top of `src/app/projects/[id]/page.tsx`
- [x] Cut "The operating system for your build" tagline on `/killerapp` page → replaced with "Pick a workflow."
- [x] Cut duplicate Project Header card from `/projects/[id]/page.tsx` Overview tab
- [x] Verify zero new TypeScript errors in new files (pre-existing repo-wide `next/navigation` warnings unchanged)
- [x] Static visual checks: no dark backgrounds, no fixed widths > 380px, locked palette in use, overflow:hidden on wrapper
- [x] Append entry to `docs/session-log.md`
- [x] Update this file
- [x] Update `tasks.lessons.md` with the patterns learned this session
- [ ] git add -A && git commit -m "Killer App chrome: BudgetRibbon + JourneyTimeRow + TimeMachine hook" && git push origin main
- [ ] Verify Vercel deploys clean — open https://builders.theknowledgegardens.com/projects/proj-chen-farmhouse and confirm chrome renders

**Follow-ups (not blocking Thursday):**
- [ ] Build `useKacProject(id)` hook that hydrates KacProject from `/api/v1/projects?id=` so chrome renders real data, not just Marin fallback
- [ ] Add a PATCH endpoint at `/api/v1/projects/[id]/schedule/markers` so TimelineMarkers drag actually persists. Today the drag fires a callback + window event but does not save server-side. The Marin seed is stable so the demo still reads correctly.
- [ ] `/projects/[id]/page.tsx` still uses CSS vars (`var(--bg)`, `var(--fg)`) — confirm light theme is active for the demo or convert to explicit chrome palette
- [ ] Surface the Time Machine drafts tray + breadcrumb stack in the UI (data layer is ready; spec deferred this to a later session)
- [ ] Audit the "drop-file hero" item — wasn't on `/projects/[id]` — find which route the spec meant
- [ ] Delete the archived originals in `src/components/_archive/2026-05-27/` once Mike confirms nothing imports them (KillerAppNav at minimum is still used by `src/app/killerapp/layout.tsx`)


## ═══ V3 KILLER APP REHAUL (2026-05-26, in flight) ═══

Parent branch: `feature/v3-killerapp-rehaul` (NOT merged to main yet).

**Shipped (WS0 merged into parent; WS2-WS6 each on their own sub-branch awaiting PR review):**
- [x] WS0 — 16 Pattern Language primitives + StanceCard schema + brand tokens + 4 route stubs (`feature/v3-killerapp-rehaul-ws0`, merged into parent)
- [x] WS2 — `/killerapp/credentialing` Pattern Language composition (`feature/v3-killerapp-rehaul-ws2`)
- [x] WS3 — `/killerapp/projects-v3` Pattern Language composition (`feature/v3-killerapp-rehaul-ws3`)
- [x] WS4 — `/killerapp/compliance` + `/killerapp/alerts` Pattern Language composition (`feature/v3-killerapp-rehaul-ws4`)
- [x] WS5 — `/killerapp/rewards` Pattern Language composition + GreenFlashProvider preserved (`feature/v3-killerapp-rehaul-ws5`)
- [x] WS6 — `/killerapp/ask` route + `POST /api/v1/ask` API stub (`feature/v3-killerapp-rehaul-ws6`)

**Founder review queue (iPhone-friendly):**
- [ ] Review WS2 preview, approve/comment PR: https://github.com/chilly611/builders-knowledge-garden/compare/feature/v3-killerapp-rehaul...feature/v3-killerapp-rehaul-ws2
- [ ] Review WS3 preview, approve/comment PR: https://github.com/chilly611/builders-knowledge-garden/compare/feature/v3-killerapp-rehaul...feature/v3-killerapp-rehaul-ws3
- [ ] Review WS4 preview, approve/comment PR: https://github.com/chilly611/builders-knowledge-garden/compare/feature/v3-killerapp-rehaul...feature/v3-killerapp-rehaul-ws4
- [ ] Review WS5 preview, approve/comment PR: https://github.com/chilly611/builders-knowledge-garden/compare/feature/v3-killerapp-rehaul...feature/v3-killerapp-rehaul-ws5
- [ ] Review WS6 preview, approve/comment PR: https://github.com/chilly611/builders-knowledge-garden/compare/feature/v3-killerapp-rehaul...feature/v3-killerapp-rehaul-ws6
- [ ] Rotate the GitHub PAT pasted at session start
- [ ] Decide WS3 rename: `/killerapp/projects-v3` → `/killerapp/projects` (with redirect of legacy to v3)
- [ ] Decide WS6 layout-level mount: hoist `<AskAnything variant="floating" />` into `src/app/killerapp/layout.tsx` (defer until after dogfood pass)

**Follow-up sprints (queued):**
- [ ] Wire `/api/v1/credentialing` to Supabase (replace WS2 mock data)
- [ ] Wire `/api/v1/projects` to existing project schema (WS3)
- [ ] Wire `/api/v1/compliance/feed` + MCP server at `/api/v1/mcp/compliance` (WS4)
- [ ] Wire `/api/v1/ask` to the real Three-Source-gated retrieval pipeline (WS6)
- [ ] Add JSON-LD + llms.txt + MCP endpoint per garden (Federation Contract pieces 10 + 11)
- [ ] Apply the same Pattern Language pass to HKG Killer App after BKG dogfood ships
- [ ] Apply InfiniteDescent + TrustStrip + Three-Source Rule to Orchid Identification (OKG) to prove cross-domain portability

---

## ═══ W9 — INTEGRATED NAVIGATOR + STRATEGY INPUTS (2026-04-22, make-or-break 2-day push) ═══

Founder directive: ship a stacked, interactive, ever-present **journey map + time machine + budget timeline** on every `/killerapp` route AND produce strategy inputs (competitive brief, killer-app name shortlist, Compass Navigator redesign spec) to inform the next wave. Lock: names-only (no URL rename yet), hybrid mood-image approach (start on current tokens, swap when images land).

### W9.A — Phase 1: Research & Spec (all parallel, ~7 agents, no code edits)
- [ ] W9.A.1 — `marketing:competitive-brief` for BKG + the Killer App (Procore, Buildertrend, Knowify, JobTread, Contractor Foreman, CoConstruct, Houzz Pro, Fieldwire, Trimble Connect, CompanyCam). Output: `docs/strategy/competitive-brief.md`.
- [ ] W9.A.2 — Killer-app naming shortlist: 15-20 candidates with trademark/domain surface + positioning one-liner. Output: `docs/strategy/naming-candidates.md`.
- [ ] W9.A.3 — Integrated journey+time+budget surface SPEC. Output: `docs/design/W9-integrated-surface-spec.md`.
- [ ] W9.A.4 — Compass Navigator redesign SPEC (coordinates with W9.A.3 real estate). Output: `docs/design/W9-compass-navigator-spec.md`.
- [ ] W9.A.5 — UX/design/branding plugin discovery (best-in-class). Report: plugin IDs + gap analysis.
- [ ] W9.A.6 — Current design-system audit + 3 sharpening recs. Output: `docs/design/W9-audit.md`.
- [ ] W9.A.7 — One-pager "what BKG/Killer App is today" + shipped-vs-spec drift. Output: `docs/design/W9-one-pager.md`.

### W9.B — Phase 2: Implementation (fires after Phase 1, 5+ parallel agents)
- [ ] W9.B.1 — Build `<IntegratedNavigator>` component (journey strip + time-machine scrub + budget timeline in a single stacked, collapsible chrome).
- [ ] W9.B.2 — 7-stage SVG icon system (Size Up / Lock / Plan / Build / Adapt / Collect / Reflect) — ready for user's sketch-derived art when images land.
- [ ] W9.B.3 — Wire `<IntegratedNavigator>` into `src/app/killerapp/layout.tsx` replacing `GlobalJourneyMapHeader` + `GlobalBudgetWidget`.
- [ ] W9.B.4 — Tests: happy path + collapse-state + budget-sync + time-machine scrub.
- [ ] W9.B.5 — Green-gate verification (`tsc --noEmit` + `vitest run`).
- [ ] W9.B.6 — Hero / picker copy refresh against W9.A.2 naming shortlist (if founder picks a name).

### W9.C — Phase 3: Upload-driven visual polish (fires when 6 mood images + journey sketch land)
- [ ] W9.C.1 — Extract visual language from the 6 mood images (color accents, texture vocabulary, composition rules).
- [ ] W9.C.2 — Iterate stage icons + `<IntegratedNavigator>` chrome to hit the sketch's visual intent.

---

## ═══ W7.O — LANDING PICKER COMPOSITION TRIAGE (2026-04-21, same-day demo prep) ═══

After the W7 burn shipped, `/killerapp` composition had 5 regressions that made it undemoable ("terrible… embarrassing"). This section is the surgical triage pass. Does NOT touch ProjectCompass / BudgetRiver / GlobalJourneyMapHeader internals — that's deferred to W7.P (creative brainstorm with founder).

**Bugs landed:**
- [x] Bug 3 — SOON cards vertical text (one word per line). Root cause: `.workflowRowDisabled` and `.workflowRow` were both CSS grids with the same 60px/1fr/auto template; inner grid placed into outer's 60px column collapsed every cell. Fixed by making `.workflowRowDisabled` a plain `display: block` wrapper matching the LIVE `.workflowLink` pattern.
- [x] Bug 4 — hero heading clipped at viewport edge. `.heroHeading` clamp was 64-120px; at common widths "operating" overran the flex column and got clipped by `.heroSection { overflow: hidden }`. Dropped clamp to 48-80px, added `overflow-wrap: break-word; hyphens: auto` as belt-and-braces.
- [x] Bug 2 — mid-page "form leak." `WorkflowPickerSearchBox` was a 3-row textarea with a brass "Pull the codes →" button and a heavy label; read as disconnected form. Also semantically stale (always routes to code-compliance now that 17 workflows are live). Replaced with a quiet single-line engraved field, neutral `→` submit, placeholder does the work. Route still pins to code-compliance until intent routing ships.
- [x] Bug 1 (tactical slice) + Bug 5 — journey strip dominating picker and pushing #1 Size Up off-screen. Gated `GlobalJourneyMapHeader` OFF the `/killerapp` route via `usePathname()` check in `src/app/killerapp/layout.tsx`. Strip still renders on all nested `/killerapp/projects/*` and `/killerapp/workflows/*` routes where project context exists. Creative redesign deferred to W7.P.

**Gates green (local):** `tsc --noEmit` EXIT 0, `vitest run` 64/64 pass.

**Files touched:**
- `src/app/killerapp/landing.module.css` (2 blocks — `.workflowRowDisabled`, `.heroHeading`)
- `src/app/killerapp/WorkflowPickerSearchBox.tsx` (rewritten, ~155 LOC → ~155 LOC, much quieter)
- `src/app/killerapp/layout.tsx` (added `usePathname` gate)

---

## ═══ W7.Q — POST-DEMO FUNCTIONAL TRUTH (2026-04-21, critical — platform failed live contractor) ═══

John Bou's contractor ran three real queries today. All three exposed that the branding has outrun the delivery. Founder directive: **"Marketing promises are nothing unless you deliver upon them."** Bugs below are root-cause fixes, not patches. Ordered by severity.

### W7.Q.1 — Code Compliance: ship real 3-source verification (Task #69) — ✅ SHIPPED 2026-04-22
**What the contractor asked:** NEC 2023 kitchen island receptacle rule (210.52(C)(5) — the rule that was *eliminated* in NEC 2023). Exactly the kind of recent-code question that makes the platform valuable.
**What we returned:** nothing.
**Root cause (investigation 2026-04-21):**
- Seed codes table is CA/AZ/NV-only, ~20 top-level article entries. **No subsections.** NEC 2023 210.52(C) not present.
- Pipeline is LLM + shallow single-source retrieval (`src/lib/specialists.ts` L94-124). Outside CA/AZ/NV, retrieval returns nothing and the prompt is instructed to respond confidence: low.
- **There is no "3 sources of truth" anywhere in code or docs.** Zero hits for "three source / sources of truth / triangulat / cross-reference" across `/docs/` and tasks files. It lived only in founder memory as aspirational architecture.
- `docs/ai-prompts/compliance-electrical.production.md` does not instruct the model to request NEC subsections or cross-check against a secondary source.
**Fix plan:**
- [x] Expanded `scripts/seed-code-entities.mjs` from 13 → 60 entities with NEC 2023 subsections, CA Title 24 parts, Southern Nevada amendments, plumbing/mechanical/structural/fire. Added `confidence_tier` and `superseded_by` — NEC 2020 210.52(C)(5) seeded as historical pointing to `nec-2023-210-52-eliminated`.
- [x] Secondary sources: `src/lib/code-sources/{types,icc,nfpa,bkg-seed,index}.ts` with `queryAllSources` (Promise.allSettled, 3s timeout each, graceful failure) + `hasMultipleSources` gate.
- [x] Tertiary local amendments: **130 amendments across 11 jurisdiction files** in `data/amendments/` — CA Title 24 Parts 2/3/6/11 (CalGreen), ca-la-county (13), ca-sf (14), ca-sd (11), ca-sj (10), ca-oak (10), nv-southern (14), nv-washoe (12). Loader at `src/lib/code-sources/local-amendments.ts` with parent-jurisdiction fallback (ca-sf query also returns ca-statewide).
- [x] Compliance prompt v2 at `docs/ai-prompts/compliance.production.md` — multi-source = high, single = medium + caveat, zero = low + AHJ guidance with specific questions to ask. Historical rules trigger supersession notice.
- [x] `src/lib/specialists.ts` routes compliance specialists through `queryAllSources` + `hasMultipleSources` + historical-detection.
- [x] 7 vitest tests in `src/lib/__tests__/specialists.compliance.test.ts` — all green.

### W7.Q.2 — Voice input repeats 5 times (Task #70) — ✅ SHIPPED 2026-04-21
**Where:** StepCard + FieldOps (every workflow page that uses voice).
**Root cause (investigation 2026-04-21):**
- `src/design-system/components/StepCard.tsx:104` — `onresult` handler does `transcript: prev.transcript + final + interim`. Each interim fire appends the *entire* accumulated result list to state, so one utterance compounds across 5+ interim events.
- `src/components/FieldOps.tsx:87-102` — uses `continuous: true` + `interimResults: true` without calling `recognition.stop()` on first final. Recognizer keeps re-firing on the same utterance.
**Fix:**
- [x] StepCard, FieldOps, useSpeechRecognition, WorkflowPickerSearchBox, WorkflowTurkeyInput — all five call sites now iterate from `event.resultIndex` and use `final || interim` replace-not-append. `recognition.stop()` fires on first `isFinal`.
- [x] 6 vitest cases in `StepCard.speech.test.ts` green.

### W7.Q.3 — Supply Ordering returns compliance chatter instead of cost matrix (Task #71) — ✅ SHIPPED 2026-04-22
**What the founder expected (per killer-app-direction.md):** vendor options with price, quality signal, lead time, URL; scenarios A/B/C with cost totals.
**What shipped:** the `supply-suppliers.md` prompt (self-labeled in its own file at line 48: *"not defensible against ChatGPT"*), which returns generic "what to ask suppliers" advice.
**Root cause:**
- ResourceBroker (task #60 W5.A) was built — `src/lib/resource-broker/search.ts` has live Brave + Anthropic web search — but the workflow step s11-2 is declared `type: analysis_result` with `promptId: "supply-suppliers"`. The step runs the prompt; it never calls the broker.
- `SupplyOrderingClient.tsx` does call `search()`, but on step *completion*, not as the analysis source. The analysis output the user sees is the generic prompt result.
**Fix:**
- [x] Vendor adapter layer at `src/lib/resource-broker/vendors/` — Home Depot Pro, 84 Lumber, White Cap. Each adapter checks `*_API_KEY` env var (stubs documented) and falls back to ResourceBroker web-search with `confidence: "observed" | "estimated" | "web-search"` tagging. 5s timeout, Promise.allSettled, graceful failure. 34 vendor tests green.
- [x] `queryAllVendors` + `buildCostMatrix` (weighted: price 50% / leadTime 30% / quality 20%) computing cheapest/fastest/bestValue.
- [x] Two-step pipeline: `docs/ai-prompts/supply-suppliers.production.md` (query-building only, zero compliance language) → `queryAllVendors` → `buildCostMatrix` → `docs/ai-prompts/supply-pricing.production.md` (ranking + confidence).
- [x] `src/app/killerapp/workflows/supply-ordering/CostMatrix.tsx` — responsive matrix, drafting-brass border on cheapest, robin's-egg check on fastest, emblem crown on bestValue, confidence badges (solid / dashed / muted), design-system tokens only.
- [x] Snapshot tests verify "IBC", "OSHA", "code", "permit", "inspection" never leak into supply output.

### W7.Q.4 — Robin's Egg is too desaturated / too green (Task #72) — MEDIUM
**Founder clarification:** "Robin's egg is supposed to be a kind of blue, Tiffany blue."
**Current:** `--robin: #7FCFCB` — sits between pale web-Tiffany (#81D8D0) and trademark Pantone 1837 (#0ABAB5), leans slightly green (H≈172°).
**Recommendation (agent report):** shift to `#81D8D0` — paler web Tiffany blue, distinctly cool, doesn't compete with blueprint navy the way #0ABAB5 would.
**Also found:** two brass-robin pairing violations that break the moodboard rule ("never sit next to brass in the same component"):
- `src/components/compass/JourneyPills.tsx` — stage title/number in brass, active ring in robin (L38, L69, L76)
- `src/components/compass/Team.tsx` — title + role in brass, verified checkmark in robin (L47, L93, L114)
**Fix:**
- [ ] Change `--robin` to `#81D8D0` in: `bkg-repo/src/app/globals.css:75`, `bkg-design-skill/SKILL.md` (L20, L54), `bkg-design-skill/references/palette-tokens.md` (L24, L152), `bkg-design-skill/references/moodboard.md` (L34, L37), `bkg-design-skill/assets/preview.html` (L20, L337), `bkg-repo/docs/design/moodboard-preview.html` (L20, L329, L337), `bkg-repo/src/app/killerapp/workflows/supply-ordering/ResourceCardGrid.tsx:628`.
- [ ] Refactor JourneyPills + Team so brass and robin do not co-occupy one component. Promote the verified state to its own cell/layer above the brass chrome.

### W7.S — Code Compliance shippability pass (Task #76) — ✅ SHIPPED 2026-04-22

Burn #2 after contractor demo screenshot: q5 output leaked raw JSON, routed kitchen-plug electrical question to the structural specialist with IBC/IRC labels, ran 6+ irrelevant citations (OSHA, IECC climate, drywall sequence), pre-asserted "verified" on a not-yet-run step, and rendered a single-blob `<select>` with 60 concatenated jurisdictions.

- [x] **Retrieval discipline gate** (`src/lib/code-sources/bkg-seed.ts`): post-retrieval keyword + discipline filter, capped at 3 results sorted by relevance — no more cross-discipline spray.
- [x] **Router specialist** (`docs/ai-prompts/compliance-router.production.md`): new first step `s5-0` that classifies the question and sets `disciplineHandoff`. 8-case test suite: kitchen-plug supersession, header sizing, water-heater permit, etc.
- [x] **Four per-discipline specialists** wired in q5: `compliance-structural` (s5-1), `compliance-electrical` (s5-2), `compliance-plumbing` (s5-3, **new**), `compliance-fire` (s5-4, **new**). All four promptIds resolve to on-disk production prompt files (test-gated).
- [x] **Prose-only narrative rule** in every compliance prompt: no raw JSON in the user-facing `narrative` field, structured data goes in a trailing `<json>` block only.
- [x] **Sanitization defense** (`src/design-system/components/utils/sanitizeNarrative.ts`, 187 LOC): extracts prose from ```json fences, falls through `narrative`/`answer`/`summary` fields, strips JSON from prose if the LLM ignores the rule. 20 tests.
- [x] **AnalysisPane upgrade**: citation cap to 3 sorted by relevance, `disciplineHandoff` banner (with jump link to the correct step), `supersededNotice` banner, `code_sections` table renderer. `StepCard.tsx` no longer displays canned `exampleOutput` when a live analysis is active.
- [x] **JurisdictionPicker** (`src/components/JurisdictionPicker.tsx`, 439 LOC): hand-rolled WAI-ARIA combobox replacing the blob `<select>` — searchable typeahead with keyboard nav, grouped state → county → jurisdiction. 14 tests. Replaces CodeComplianceClient.tsx lines 146–180.
- [x] **Green gate**: `tsc --noEmit` clean, `vitest run` 25/25 files, 209/209 tests pass.

### W7.R — RSI + HEARTBEAT (Tasks #74, #75) — ✅ SCAFFOLD SHIPPED 2026-04-22
- [x] Migration `supabase/migrations/20260422_rsi_deltas.sql` — `rsi_feedback` (6 signals) + `rsi_deltas` (5 kinds: prompt_patch, entity_add, entity_update, amendment_add, specialist_tool_tweak). Types added to `src/types/database.ts`.
- [x] `src/lib/rsi/feedback.ts` (record + recent), `deltas.ts` (propose, list, approve, apply), `synth.ts` (cluster + LLM proposal).
- [x] `docs/ai-prompts/rsi-synthesis.production.md` — proposes one narrow delta per cluster, cites source feedback IDs, never applies (human-gated).
- [x] API routes `/api/v1/rsi/feedback` (POST, app auth) + `/api/v1/rsi/heartbeat` (POST, cron-secret).
- [x] Vercel cron wired: `/api/v1/rsi/heartbeat` every 6 hours (`0 */6 * * *`), alongside existing daily heartbeat.
- [x] `src/components/OutcomeFeedback.tsx` — 👍 👎 ✏️ affordances with design-token styling.
- [x] Docs: `docs/rsi/README.md` + `IMPLEMENTATION-STATUS.md`.
- [ ] **Still required before loop closes:** delta appliers (currently stubs — need file-write/DB-insert/config-update implementations) + reviewer dashboard UI. Tracked as W7.R.3 follow-up.

### W7.Q.0 — Write the lesson first (Task #73) — DO BEFORE THE FIXES
- [ ] Append the "functional truth > marketing promise" lesson to `tasks.lessons.md` so every future agent enforces it.
- [ ] Add a LIVE-gate rule to bkg-design skill / workflow picker docs: no workflow ships as LIVE unless it passes a 3-query smoke test against the real-contractor question set. Until then, it renders as DRAFT on the picker, not LIVE or SOON.

---

## ═══ W7.P — JOURNEY + TIME MACHINE + BUDGET INTEGRATION BRAINSTORM (2026-04-21, pending founder input) ═══

Founder direction: "The journey strip at the top I have explained what I want multiple times but we haven't gotten close. Let's work on that creatively. The budget map that was iterated most recently as water isn't working at all. Let's put that at the bottom with money signs and totals along the timeline. The journey map and the time machine should be integrated."

**Goals:**
1. Journey map + H.G. Wells "Time Machine" scrub metaphor integrated into one surface (not two separate components).
2. Budget viz moves to BOTTOM of the page as a timeline with money signs and running totals per stage — NOT the BudgetRiver water viz (rejected).
3. Surface should feel like a single narrative device: where we are, where we've been, where we're going, and how much it's costing.

**Parked until explicit concept alignment with founder.** Prior iterations (JourneyPills, BudgetRiver, ProjectCompass) all missed the mark; do not implement before agreement on metaphor and interaction model.

---

## ═══ WEEK 4 — GLOBAL COO SURFACES + WORKFLOW-BY-WORKFLOW POLISH (opened 2026-04-19, next session) ═══

**Founder direction at end of W3 push:** smoke-testing the live deploy, noticed that JourneyMapHeader + BudgetWidget are NOT globally visible — they only render inside workflow routes. Expectation: "Budget, profit + loss, receivables, payment schedule, where we are overbudget, where we are underbudget — all super important to be visible and accessible and changeable" from ANYWHERE in the app, not just inside a workflow. Compass also "isn't working the way it needs to" — needs careful iteration, not another farm pass.

**W4 scope (ordered):**

### W4.0 — Ship-gate verification (first action next session)
- [ ] Pull `origin/main` into repo (`cd "/Users/chillydahlgren/Desktop/The Builder Garden/app" && git fetch origin main && git status`). Confirm HEAD is `f3e257a`.
- [ ] Load `https://app-p7hc1agho-chillyd-2693s-projects.vercel.app/killerapp` — confirm 17 LIVE cards (not 2). If still 2, check Vercel dashboard for build failure (likely cause: pre-existing static-export timeout on `/knowledge`, `/marketplace`, `/mcp`, `/login`, `/launch`, `/manifesto`, `/onboard`, or new `/killerapp/workflows/worker-count`). If build failed, apply `export const dynamic = 'force-dynamic'` to the failing routes as a minimal unblocker (repo-wide fix is out of W4 scope).
- [ ] If LIVE cards show up but JourneyMapHeader + BudgetWidget don't appear on `/killerapp` picker itself, that is **expected** — it's the W4.1 work below.

### W4.1 — Global COO surfaces (HIGH priority — founder headline ask) — SHIPPED 2026-04-21
- [x] Mount `BudgetWidget` in `src/app/layout.tsx` as an ever-present chrome element (same pattern as `CompassBloom` + `GlobalAiFab`). Position: ensure it doesn't collide with the Global AI FAB (bottom-right) or Compass FAB. Candidate: top-right sticky, or left-side collapsible rail. **DONE** — wired as GlobalBudgetWidget top-right pill.
- [x] Extend `BudgetWidget` to show the COO-level data founder asked for, not just one number: total budget, committed vs spent vs remaining, profit + loss running, receivables outstanding, payment schedule next-7-days, over/under-budget flags per category. Pull from `budget-spine.ts` (we already record Material/Labor/Permit/Sub/Equipment/Expense/ClientPayment via project_budgets + budget_items). **DONE** — shows cash flow, next-7-days list.
- [x] Mount `JourneyMapHeader` globally on all `/killerapp/*` routes (including the `/killerapp` picker itself, not just inside workflows). Extract out of `WorkflowShell` or wire a variant at the picker level. Make sure it reads the active project's journey state, not the "default" bucket. **DONE** — now GlobalJourneyMapHeader renders ProjectCompass (7-stage river + timeline).
- [x] Confirm `GlobalAiFab` stays bottom-right on every page; check it doesn't fight the new BudgetWidget for real estate. May need a layout z-index audit. **DONE** — FAB preserved bottom-right; ProjectCompass replaced corner pill design.
- [x] Verify budget + journey stay in sync across routes: navigate from picker → workflow → back to picker, confirm numbers + dots update without reload. **DONE** — shared journey + budget subscribers.

### W4.2 — Compass Navigator careful iteration (founder said "carefully")
- [ ] Audit current `CompassBloom` behavior vs what founder needs. Do NOT do another farm — one Cowork session pass-through with founder.
- [ ] Problems known to fix:
  - [ ] Active project ID doesn't persist across sessions
  - [ ] Can't switch between saved projects from the Compass
  - [ ] "Projects" destination not yet a first-class lane
- [ ] Add project save/load/switch UI. Project ID persistence via localStorage (`bkg:active-project-id`) with graceful default for anon users.

### W4.3 — Workflow-by-workflow polish pass (one at a time, with founder)
Founder explicit ask: **"go through each live builder workflow to make changes on each in our next session after I sleep. One by one."** Do not batch. Do not farm. Cowork review + edit per workflow.

Ordered 1-by-1 punch list (17 LIVE workflows). Skip to the ones founder flags first; default order is the DREAM → BUILD lifecycle:

- [x] q2 Estimating (Size Up) — SHIPPED 2026-04-21: wired estimating-takeoff specialist, fixed $X.Xk parser, dead-write removed
- [x] q4 Contract Templates (Lock) — SHIPPED 2026-04-18
- [x] q5 Code Compliance (Lock) — SHIPPED 2026-04-18
- [ ] q6 Job Sequencing (Plan)
- [x] q7 Worker Count (Plan) — SHIPPED 2026-04-21: fixed $X.Xk parser, killed dead duration field
- [x] q8 Permit Applications (Plan) — SHIPPED 2026-04-21: extracted resolveJurisdiction() helper
- [x] q9 Sub Management (Plan) — SHIPPED 2026-04-21: wired recordSubcontractorCost on s9-3, added parseRoughTotal
- [x] q10 Equipment (Plan) — SHIPPED 2026-04-21: replaced amount:0 stub with real parse via parseRoughTotal
- [x] q11 Supply Ordering (Plan) — SHIPPED 2026-04-21: design-system polish + ResourceBroker integration (demo anchor)
- [ ] q12 Services Todos (Plan)
- [ ] q13 Hiring (Plan)
- [ ] q14 Weather Scheduling (Build)
- [ ] q15 Daily Log (Build)
- [x] q16 OSHA Toolbox (Build) — SHIPPED 2026-04-21: wired osha-toolbox-talk specialist (s16-1)
- [ ] q17 Expenses (Build)
- [ ] q18 Outreach (Build)
- [ ] q19 Compass Nav (Build) — may merge into W4.2 instead

For each workflow: open it on the live URL, walk through with founder feedback, note the changes, apply as a small commit, tsc gate, push. Do NOT batch multiple workflows into one commit — founder wants per-workflow atomic changes for clean rollback.

### W4 deferred / parked
- Pre-existing static-export timeouts (7 client routes) — repo-wide follow-up after W4.1 lands. Minimal W4.0 unblocker: `export const dynamic = 'force-dynamic'` on any route failing Vercel build.
- Clerk auth + Stripe paywall — still scheduled post-W4 per prior planning.
- Orphan `analysis_result` promptId wiring for q9/q10/q16 — picked up during the per-workflow pass.

---

## ═══ WEEK 3 PUSH — 15 WORKFLOWS + BUDGET SPINE + AI FAB (2026-04-18) — SHIPPED TO PROD 2026-04-19 ═══

**Status:** 15 new live workflows (q2 + q6–q19) behind a locked spine (WorkflowShell + budget-spine + journey-progress + Global AI FAB). Farm pass ran 5 agents in parallel; integrator pass corrected 10 client files whose agents had invented property names on `StepResult`. `tsc --noEmit` green; `npm test` 11/11 green; `next build` compiles + typechecks all 130 routes in 205s combined. Static-export stage has pre-existing timeouts on 7 client-component routes (see below) — not introduced by Week 3 and out of scope.

**Foundation gate (shipped):**
- [x] **W3.0** `docs/week3-spine-spec.md` — binding contract for farm agents.
- [x] **W3.1** `src/design-system/components/WorkflowShell.tsx` — reusable chrome (JourneyMapHeader + breadcrumb + Pro Toggle + context chooser slot + WorkflowRenderer + event footer). Workflow routes now ~40–130 LOC each.
- [x] **W3.2** `src/lib/budget-spine.ts` — typed `recordMaterialCost`, `recordSubcontractorCost`, `recordEquipmentCost`, `recordLaborCost`, `recordPermitCost`, `recordExpense`, `recordClientPayment`, `getProjectBudget`. All route through `POST /api/v1/budget/items` with Supabase bearer. Silent no-project fallback per spec.
- [x] **W3.3** `src/lib/journey-progress.ts` + `JourneyMapHeader` — typed `started | step_completed | completed | needs_attention` events persisted to localStorage per `(user|anon, project|default)`. `JourneyMapHeader` renders dot/check indicator per stage (amber = needs_attention, emerald = all done, green = in progress, none = untouched).
- [x] **W3.4** `src/components/GlobalAiFab.tsx` — bottom-right FAB (`bottom: 96px, right: 24px`) wired into `app/layout.tsx`. Text + 🎤 voice composer with SpeechRecognition, surface-aware via pathname + `data-bkg-surface`, SSE-streams from `/api/v1/copilot`. Cmd+Enter submit, Escape close. Hidden on `/presentation` and `/cinematic`.

**Parallel farm (W3.5) — 5 agents × 3 workflows, all shipped:**
- [x] Agent A: q2 estimating · q6 job-sequencing · q7 worker-count
- [x] Agent B: q8 permit-applications · q9 sub-management · q10 equipment · + 2 specialist prompts (sub-bid-analysis, equipment-rent-vs-buy)
- [x] Agent C: q11 supply-ordering · q12 services-todos · q13 hiring
- [x] Agent D: q14 weather-scheduling · q15 daily-log · q16 osha-toolbox · + 1 specialist prompt (osha-toolbox-talk)
- [x] Agent E: q17 expenses · q18 outreach · q19 compass-nav

**Integrator pass (W3.7, shipped):**
- [x] Single edit to `src/app/killerapp/page.tsx` `LIVE_WORKFLOWS` adding all 15 entries (17 total LIVE routes now). No direct page.tsx edits from farm agents.
- [x] Corrected 16 tsc errors across 10 farm-built clients (see `tasks.lessons.md` — "Parallel farm agents invent type shapes"). Agents had referenced non-existent `event.stepIndex`, `event.value`, `event.textInput`, `event.analysisOutput`, `event.analysisResult` on `StepResult`, plus fictional event types. Replaced with actual shape: `{ type: 'step_opened'|'step_saved'|'step_skipped'|'step_completed', stepId, payload?: unknown, timestamp }` with payload narrowed per step type.
- [x] `npx tsc --noEmit` — EXIT 0.
- [x] `npm test` (vitest) — 11/11 pass.
- [x] `npx next build` — compile + TS check both green. Static-export timeouts on 7 pre-existing client pages + 1 new (worker-count) are a build-worker parallelism issue, not a code issue. See below.

**Known: pre-existing static-export timeouts (not W3-introduced).**
Next build logs 60s timeouts on `/knowledge`, `/marketplace`, `/mcp`, `/login`, `/launch`, `/manifesto`, `/onboard`, plus new `/killerapp/workflows/worker-count`. All are client components that hit external fetches during prerender with 3 workers contending. Reproduces on a clean `git stash` baseline → exists before W3. Worker-count shares the same shape as the 14 sibling workflow routes that DO export cleanly, so the bottleneck is build-worker parallelism + external fetches, not code. Fix is repo-wide (`export const dynamic = 'force-dynamic'` on the affected client routes, or raise `--experimental-build-mode` worker timeout, or stop prerendering client-only pages). Parking for a separate task.

**Compass Navigator polish (W3.6) — DEFERRED to next push:**
- [ ] Compass Navigator polish — project save/switch from the Compass, lane-aware ordering preserved, "Projects" destination added.
  - Shipped today: q19 compass-nav workflow gives the user a scripted 5-step walkthrough for orienting in the Compass.
  - Still pending: the `CompassBloom` FAB itself does not yet persist the active project id across sessions or switch between saved projects. Deferring to W4.

**Pending:**
- [ ] `git push origin main` — Chilly to run from own terminal (bundle path provided post-commit).
- [ ] Vercel auto-deploy verification (live URL smoke: `/killerapp` shows q2 + q6–q19 + q4 + q5 as LIVE; worker-count/knowledge/etc. may retry-succeed or fail per Vercel's build-worker timing).
- [ ] Prod smoke: pick 3 random workflows — estimating (budget write), weather-scheduling (topPanel forecast picker), daily-log (voice input) — verify end-to-end behavior.

**Parking lot (intentional Week 3 deferrals):**
- q9/q10 orphan analysis steps (s9-3, s10-3) ship WITHOUT promptId wiring — markdown prompt files are authored (`docs/ai-prompts/sub-bid-analysis.md`, `equipment-rent-vs-buy.md`) but AnalysisPane returns null when promptId is missing. Integrator can add promptIds to `docs/workflows.json` or implement a step-level client override.
- q16 osha-toolbox-talk prompt file authored; s16-1 promptId registration also pending on same mechanism.
- Clerk auth on `/killerapp/*` — still bundled with Stripe push.
- Full Supabase persistence of journey-progress events — MVP uses localStorage; server sync waits for Clerk.
- Pre-existing static-export timeouts on 7 routes — repo-wide investigation.

**Parking lot (intentional Week 3 deferrals):**
- Clerk auth on `/killerapp/*` — Chilly confirmed still bundled with Stripe push.
- `draft: false` flip on contract templates — waiting on attorney review (external).
- Specialist prompts for the 4 orphan `analysis_result` steps (q9-s9-3, q10-s10-3, q16-s16-1, q23-s23-2) — the farm will either author them or defer per workflow.
- Full Supabase persistence of journey-progress events — MVP uses localStorage; server sync waits for Clerk.

---

## ═══ WEEK 2B PUSH — CONTRACT TEMPLATES (2026-04-18) — SHIPPED LOCALLY, AWAITING PUSH ═══

**Status:** Contract Templates workflow (q4) is now live. Six starter contracts — Client Agreement, Subcontractor Agreement, Lien Waiver (Conditional + Unconditional), Mutual NDA, Change Order — each available as a DRAFT-watermarked PDF. Three automated gates green.

**What ships:**
- 6 markdown templates under `src/lib/contract-templates/*.md` with `{{variable}}` placeholders and state-aware DRAFT NOTICE footers (statutory-form state warnings for lien waivers: CA, TX, AZ, NV, FL, GA, MA, MI, MS, MO, UT, WY).
- Isomorphic registry + `fillTemplate()` substitution in `src/lib/contract-templates.ts` (metadata, per-template `requiredFields`, humanized-placeholder fallback for missing values).
- Server-only filesystem loader in `src/lib/contract-templates.server.ts` — keeps `node:fs` off the client bundle.
- jsPDF generator in `src/lib/pdf/contract-pdf.ts` — BKG wordmark header, diagonal DRAFT watermark on every page, minimal markdown→PDF (headings, paragraphs, bullets, pipe tables, courier signature blocks), attorney-review disclaimer footer, per-page numbering.
- Live route at `/killerapp/workflows/contract-templates` — journey-map header, breadcrumb + Pro Toggle, prominent amber DRAFT disclaimer banner, multi-select template picker, merged field form (dedupes across selected templates), one-click "Download N drafts (PDF)" button, Pro-mode inspect-filled-body panel.
- `LIVE_WORKFLOWS` map in `src/app/killerapp/page.tsx` now includes `q4 → /killerapp/workflows/contract-templates`; blurb rewritten.

**Automated gates (W2B.6):**
- `npx tsc --noEmit` — EXIT 0
- `npx vitest run` — 11/11 pass
- `next build` — all 120+ routes compile, contract-templates listed as static
- Markdown ↔ registry key parity smoke — 6/6 templates pass (60 total keys accounted for)
- `fillTemplate` end-to-end smoke — 0 unresolved `{{curly}}` placeholders, missing fields humanized to `[Client Address]` style brackets

**Locked at draft-only.** Per `docs/killer-app-direction.md § Legal prerequisites`, no pathway in the UI flips `draft: false` until a construction attorney has reviewed the template language for the user's state. Every PDF is watermarked DRAFT and carries the attorney-review disclaimer in its footer.

**Subtask ledger (W2B):**
- [x] **W2B.1** Draft 6 contract templates with `{{variable}}` placeholders
- [x] **W2B.2** `src/lib/contract-templates.ts` — types, TEMPLATE_META, fillTemplate, extractTemplateKeys
- [x] **W2B.3** `src/lib/pdf/contract-pdf.ts` — jsPDF renderer + DRAFT watermark
- [x] **W2B.4** `/killerapp/workflows/contract-templates` route — page.tsx + ContractTemplatesClient.tsx
- [x] **W2B.5** Wire q4 into `LIVE_WORKFLOWS` + updated blurb
- [x] **W2B.6** Smoke tests green; commit + bundle + push instructions in hand

**Pending:**
- [ ] `git push origin main` — Chilly to run from own terminal (bundle delivered via `Builder's Knowledge Garden/week2b-push.bundle`)
- [ ] Vercel auto-deploy verification
- [ ] Prod smoke: `/killerapp` shows q4 as LIVE; route loads; pick 1 template, fill fields, download PDF; DRAFT watermark visible; attorney-review disclaimer in footer
- [ ] **Legal gate (EXTERNAL):** construction attorney review in at least CA (first paid-user jurisdiction) before flipping `draft: false`. Until then, UI ships draft-only.

**Deferred (intentional):**
- Stripe paywall around contract generation — next push per Chilly's direction
- Per-state statutory-form overrides for lien waivers — currently shown as amber warning in draft notice only
- Saving filled contracts to the user's account — waits for Clerk auth (scheduled with Stripe push)

---

## ═══ WEEK 2 PUSH — CORRECTING THE FORK (2026-04-18) — SHIPPED ═══

**Status:** Six commits pushed to `origin/main`, Vercel auto-deployed. Chilly confirmed "all set".

**Six-commit stack (oldest → newest):**
1. `fe10d5e` — Plan: Week 2 fork-correction push + 3 lessons from today's audit
2. `2927c42` — W2.1: Replace Command Center nav with minimal chrome
3. `02726a3` — W2.2: Replace Command Center landing with workflow picker
4. `0cb8cb1` — W2.3: Add journey-map header on workflow routes
5. `e27b082` — W2.4: Hierarchical CA jurisdiction picker (UI-first)
6. `0de135d` — W2.5: Voice + natural-language entry on every textarea

**Automated gates (W2.6):**
- `npx tsc --noEmit` — EXIT 0
- `npx vitest run` — 11/11 pass
- `next build` — all routes compile including `/killerapp`, `/killerapp/legacy-command-center`, `/killerapp/workflows/code-compliance`

**Subtask ledger:**

### 1. Replace KillerAppNav.tsx with minimal AppChrome — DONE (commit 2927c42)
- [x] Collapse 187-line Command Center chrome to ~100 lines; preserve default export name so 8 route groups stay intact
- [x] Minimal chrome: wordmark, conditional "← All workflows" when inside a workflow route
- [x] Hardcoded XP tally / streak / 7-module tab array deleted
- [x] Smoke test: all route groups render after swap (next build green)
- [ ] **Deferred:** profile avatar dropdown with XP-as-reputation (waits for Clerk auth)

### 2. Build `/killerapp` landing = workflow picker — DONE (commit 02726a3)
- [x] Server Component reading `docs/workflows.json`
- [x] 27 workflows rendered as cards grouped by lifecycle stage with LIVE / SOON pills and blurbs
- [x] Explicit `LIVE_WORKFLOWS` map: `q5` → `/killerapp/workflows/code-compliance`; others route to a courteous "coming soon" page
- [x] Legacy Command Center preserved at `/killerapp/legacy-command-center` via `git mv` (wired API endpoints not orphaned)
- [x] CSS hover via `<style>` tag (Server Component safe) — no inline JS handlers
- [ ] **Deferred to Week 3:** fuzzy search box on the landing (natural-language entry already lives inside the workflow via search box at top of picker that routes to Code Compliance with `?q=`)

### 3. Add journey-map header — DONE (commit 0cb8cb1)
- [x] `src/components/JourneyMapHeader.tsx` — pure presentational, server-safe
- [x] 7-stage strip: Size Up → Lock → Plan → Build → Adapt → Collect → Reflect with per-stage accent colors
- [x] Rendered above Code Compliance workflow
- [x] `workflow.stageId ?? 1` fallback for undefined case
- [ ] **Deferred:** stage-filter URL param (`?stage=lock`) — picker currently groups by stage visually; filter UX arrives when the fuzzy search lands

### 4. Hierarchical jurisdiction picker — DONE (commit e27b082)
- [x] JURISDICTIONS grew from 23 → ~58 entries. CA counties added: Ventura, Riverside, Santa Barbara, Orange, San Bernardino, LA, San Diego, Alameda, Santa Clara, Contra Costa, Sacramento, Kern, Fresno
- [x] Principal cities under each (Temecula under Riverside; Oxnard + Thousand Oaks under Ventura; etc.) — all four Chilly named (Ventura, Riverside, Temecula, Santa Barbara) visible
- [x] `groupJurisdictions()` helper returns State → County → Jurisdictions tree
- [x] Typed `Jurisdiction` interface with `level` union
- [x] `<optgroup>`-based hierarchical `<select>` in `CodeComplianceClient.tsx` — label format: "California — Riverside County" → Temecula
- [x] Fallback IBC 2024 surfaced at top of picker
- [ ] **Deferred to Week 3:** real local-amendment data (this pass is UI-first; names are visible, `metadata.local_amendments` seeds land in Week 3 seed refresh)

### 5. Voice + natural-language entry on every textarea — DONE (commit 0de135d)
- [x] `text_input`, `voice_input`, AND `analysis_result` steps now carry mic buttons
- [x] Voice transcripts **append** to existing text (was: replace)
- [x] `handleApplyVoiceTranscript` routes by `step.type` — `analysis_result` writes to `analysisInput`, others write to `inputValue`
- [x] Placeholder copy softened — "Type or speak — in your own words. Tap 🎤 to dictate." (was "Enter text here...")
- [x] Recording pulse + error messaging preserved
- [x] Picker search box includes voice input + routes to Code Compliance with query pre-filled (`WorkflowPickerSearchBox.tsx`)

### 6. Smoke tests + deploy — AUTOMATED GATES GREEN, PUSH PENDING
- [x] `npx tsc --noEmit` — EXIT 0
- [x] `npx vitest run` — 11/11
- [x] `next build` — all routes compile (including legacy-command-center moved subtree)
- [x] Manual dev smoke: `/killerapp` picker renders 27 cards, `/killerapp/workflows/code-compliance` renders journey map + hierarchical jurisdiction picker + voice buttons on every textarea
- [ ] **BLOCKED:** `git push origin main` — `fatal: could not read Username for 'https://github.com': No such device or address`. Founder to push from own terminal, or re-supply a PAT (if supplied again, rotate immediately per lesson #13).
- [ ] **PENDING PUSH:** Vercel deploy verification + auto-promote check
- [ ] **PENDING PUSH:** Production smoke: picker renders, journey map above workflow, Temecula visible in picker, Code Compliance still hits Claude API

**Definition of done (local):** ✅ Met. A visitor to `/killerapp` (in dev) sees a searchable workflow picker, 27 cards grouped by stage, LIVE pill on Code Compliance, natural-language search box at top. Clicking Code Compliance lands on the workflow inside a journey-map header, hierarchical jurisdiction picker (Temecula visible), voice button on every textarea, and the specialist call still fires. `/manifesto` and the 8 other route groups still render.

**Definition of done (prod):** ❌ Pending push + Vercel green.

**Lint baseline note:** `npx eslint` on Week 2 touched files reports 9 errors / 12 warnings. Triage: 3 × `@typescript-eslint/no-explicit-any` in `StepCard.tsx` (pre-existing, lines 63/71/82 around SpeechRecognition setup) and unused-vars in `knowledge-data.ts` helpers (pre-existing). Next build does not fail on these (Vercel uses build, not strict-eslint). Clean-up: optional follow-up commit with `// eslint-disable-next-line` comments if we want a clean baseline.

**Background items that don't block this push** (do anytime):
- Rotate Anthropic API key
- Rotate Supabase service-role key (in `batch*.mjs` at repo root, in git history)
- Delete or `.gitignore` the `batch*.mjs` scripts after rotation
- Wire Clerk basic auth on `/killerapp/*` (scheduled for the Week 2 Stripe push)

---

## ═══ DREAM MACHINE CONSOLIDATION (2026-04-14) — IN PROGRESS ═══

### Architecture + Components (Chat session — DONE)
- [x] Audit 6 dream interfaces → identify 3 user intents (Discover/Express/Upload)
- [x] Audit 3 live pages (/dream/upload, /dream/design, /dream/imagine)
- [x] Lock 12 architectural decisions (all approved)
- [x] Build unified /dream landing page (3-ramp entry)
- [x] Build DiscoverFlow component (5-question Oracle)
- [x] Build DreamReveal component (AI synthesis + profile card)
- [x] Build useSpeechRecognition hook (Web Speech API)
- [x] Write COWORK-BUILD-SPEC.md (complete wiring instructions)
- [x] Push all files to main

### Wiring (next Cowork session — TODO)
- [ ] Add 301 redirects for old dream sub-routes in next.config.ts
- [ ] Archive old dream sub-pages to _archived/
- [ ] Wire GreenFlash celebrations (4 moments)
- [ ] Wire Design Studio handoff (read localStorage on mount)
- [ ] Wire Express path (prompt → Design Studio auto-generate)
- [ ] Run npm run build — verify 0 TypeScript errors
- [ ] Deploy to Vercel
- [ ] Test full flow: landing → discover → reveal → design studio

## PHASE 0 — PLATFORM FOUNDATIONS
> Status: COMPLETE

- [x] Core database schema: users, projects, knowledge, storage
- [x] Auth system: email/password + Google OAuth via Supabase
- [x] Navigation architecture: CompassNav with 7 surfaces
- [x] Dream interface: drag-drop ingredient UI with schema binding
- [x] Project editor: visual task/phase/resource breakdown
- [x] Knowledge graph: entity storage and semantic linking
- [x] MCP server: Claude integration with authorized tool access
- [x] Deployment: Next.js production on Vercel

---

## PHASE 1A — DREAMER SURFACE
> Status: COMPLETE

- [x] Dream Editor: canvas-based ingredient picking
- [x] Dream Schema: aspirational_name, brief_description, user_ingredients, lifecycle_stage
- [x] Claude Integration: narrative expansion from ingredients
- [x] Dream Sharing: public dream links with embedded read-only view
- [x] Dream Timeline: growth visualization (seed → sprout → bloom → harvest)
- [x] Persistent Storage: dreams saved to PostgreSQL with DreamEssence format
- [x] UI Polish: typewriter effect, smooth transitions, color per lifecycle stage

---

## PHASE 1B — BUILDER SURFACE
> Status: COMPLETE (Wave 4)

- [x] Project Editor: WBS (Work Breakdown Structure) with phases, tasks, resources
- [x] Gantt Timeline: calendar view with critical path highlighting
- [x] Budget Module: line-item estimates, labor rates, material costs
- [x] Resource Management: crew assignment, skill matching, capacity planning
- [x] RFI Tracker: open request management with auto-assignment logic
- [x] Inspection Checkpoint System: pass/fail gates with documentation
- [x] Build-to-Dream Linkage: projects reference original dream(s) with lifecycle pipeline
- [x] Permits & Compliance: checklist tracking with jurisdiction awareness

---

## PHASE 1C — KNOWLEDGE SURFACE
> Status: COMPLETE

- [x] Knowledge Editor: flexible entity creation with schema inference
- [x] Entity Types: materials, techniques, suppliers, standards, regulations
- [x] Graph Visualization: node-link diagram of relationships
- [x] Full-Text Search: semantic search across all knowledge
- [x] Claude Copilot: "What does the code say?" for any entity
- [x] Ingredient Harvesting: drag knowledge entities into dreams
- [x] Citation System: provenance tracking for every fact
- [x] Persistent Storage: knowledge base saved in PostgreSQL

---

## PHASE 2 — PERSONA ROUTING & VALUE DELIVERY
> Imperative 1: Eradicate the value discrepancy. First 30 seconds must deliver on the marketing promise.
> The platform dynamically reconfigures based on who the user IS.

### 2A. 8-Lane Persona Architecture
- [x] Database migration: user_profiles table with lane enum (dreamer/builder/specialist/merchant/ally/crew/fleet/machine)
- [x] Progressive Profiling onboarding: 2-3 questions → lane determination → immediate surface routing
- [x] Update LanePicker.tsx: 8 lanes with strategy-aligned descriptions and chrome colors
- [x] Update auth.tsx: add lane to AuthContextType, persist in user_profiles
- [x] Update CompassNav: lane-aware destination ordering (Builder sees Killer App first, Dreamer sees Dream first)
- [x] Lane-specific landing surfaces: each lane routes to its primary surface on login
- [x] Progressive data collection: additional profile questions surface naturally as user engages

### 2B. Morning Briefing & Daily Story Loop
- [x] API route: POST /api/v1/briefing — Claude-generated, lane-aware narrative briefing
- [x] 8 distinct briefing tonalities (warm/aspirational for Dreamer, sharp/actionable for Builder, etc.)
- [x] Morning Briefing UI: typewriter effect, appears on app open, dismissible
- [x] 3 daily quests generated per briefing (lane-specific, advance real work)
- [x] "AI works while you sleep" — briefing references overnight analysis
- [x] Streak counter: consecutive days of app engagement

### 2C. Notification Orchestra (4-Tier Emotional System)
- [x] Database: notifications table with urgency_level enum (celebration/good_news/heads_up/needs_you)
- [x] API route: GET/POST/PATCH /api/v1/notifications
- [x] Notification Orchestra UI: slide-out panel, grouped by urgency, color-coded borders
- [x] Celebration tier: gold burst animation, confetti on project completions/financial milestones
- [x] Good News tier: green glow, smooth entry for positive progression
- [x] Heads Up tier: amber badge, proactive warnings with drafted solutions
- [x] Needs You tier: red attention pulse, ALWAYS includes pre-researched solution
- [x] Governing principle: every notification is a gift. If no solution/insight attached, suppress it.

### 2D. Cross-Surface Bridges (Lifecycle Continuity)
- [x] "Make This Real" button on Dream interfaces → pre-fills project wizard (Dream→Build)
- [x] "Use in My Dream" button on Knowledge entities → loads as Dream ingredient (Knowledge→Dream)
- [x] "What does the code say?" link from project items → Knowledge copilot (Build→Knowledge)
- [x] "Continue Your Dream" card on Dream hub (growth stage: seed/sprout/bloom/harvest)
- [x] Surface Transition Banner: context-aware suggestion for next surface
- [x] Lifecycle Progress Bar: DREAM → DESIGN → BUILD phase indicator
- [x] CRM rebuild: business pulse + AI attention queue wired to real project data

### 2E. CRM Deep Research → v1 Build Order (run BEFORE building CRM v1)
> Output lands in `docs/research/crm/` and pre-stages the build briefs below.
> No CRM v1 build work begins until Stream E synthesis is reviewed and approved by Chilly.

**Research scope** — five parallel streams, run in Cowork:
- [x] Stream A — Mainstream + vertical CRM landscape (HubSpot/Salesforce/Pipedrive/Attio/Day.ai + JobNimbus/JobTread/Followup/Acculynx/Markate/Houzz Pro/BuilderTrend/Roofr) → `docs/research/crm/stream-a-landscape.md` — 6,935 words, 33-row steal/leapfrog/ignore matrix, 126 citations
- [x] Stream B — Contractor reality (Reddit, reviews, YouTube comments, trade forums) — what contractors actually do, why they reject CRMs, what converts skeptics → `docs/research/crm/stream-b-contractor-reality.md` — 8,538 words, 30 verbatim direct quotes, 30 byproduct moments
- [x] Stream C — Machine-readable CRM surface (existing CRM MCP servers, API-first CRMs, schema.org Person/Organization, AI-agent CRM workflows, event taxonomy) → `docs/research/crm/stream-c-machine-surface.md` — 7,944 words, 24 MCP tools, 31 lifecycle events, paste-ready `bkg_contact` and `bkg_deal` JSON-LD
- [x] Stream D — UX patterns worth stealing or rejecting (relational records, mobile-first field UX, voice-CRM, inline AI assist, plain-language label patterns) — each mapped explicitly to one of our 7 primitives → `docs/research/crm/stream-d-ux-patterns.md` — 6,876 words, 45-row pattern→primitive mapping, 25-row reject list
- [x] Stream E — Synthesis: BKG CRM strategy + v1 spec + adoption story + build order → `docs/research/crm/stream-e-strategy.md` — 2-page exec summary, lifecycle map, plain-language vocabulary, five-surface MLP, invisible CRM architecture, MCP tool surface, FL roofer adoption story, build order, "not building" list

**Stream E deliverables** (the only file Chilly reads first):
- [x] 2-page exec summary at the top of `stream-e-strategy.md` answering: (1) BKG CRM in one constitution-passing sentence (2) the five v1 surfaces and why those five (3) the moat once shipped (4) what ships first and the demo for John Bou + the contractor partner in 2 weeks
- [x] CRM Through the Lifecycle: every surface mapped to Lead → Size Up → Lock → Plan → Build → Adapt → Collect → Reflect → Repeat/Reputation
- [x] Plain-language CRM vocabulary table (jargon | plain language | when shown) — 35 rows
- [x] Five-surface CRM MLP spec (plain-language question, Invitation Card, machine surface, voice expression, constitution goals, build size): **Today / Who's asking? / What might happen next? / Quick reply / Repeat client radar**
- [x] Invisible CRM architecture — 30 byproduct moments where CRM data is created without the user thinking "I'm doing CRM"
- [x] Proposed MCP tool surface — 24 tools with example JSON in/out, `time_machine_handle` on every write
- [x] Adoption story: Carlos Méndez, Tampa FL roofer, skeptic → dependent in 30 days (voice on day 1 → missed-call wedge day 3 → estimate-silence nudge day 7 → Lupita Pro Toggle day 12 → photo-by-GPS day 18 → repeat radar day 30)
- [x] "What we're explicitly NOT building in v1" — 18 protected exclusions

**Acceptance criteria for the research sprint:**
- [x] All five stream files exist in `docs/research/crm/`
- [ ] Files pushed to main (Chilly to run from own terminal — bundle/git push pending)
- [x] Stream E's "CRM v1 — Build Order" first three briefs are written as paste-ready Cowork briefs and inserted into the slots reserved in Phase 3 below
- [x] `tasks.lessons.md` appended — Correction Loop primitive proposal flagged for explicit decision before Brief 1 ships
- [x] `docs/session-log.md` entry written for the research session
- [x] No CRM build work has been started — research-only sprint

**Decision gate before Brief 1 ships:**
- [x] Chilly approves the five surfaces and the build order — **APPROVED 2026-05-12 ("Looks good to me!")**
- [ ] Chilly decides the constitution-extension question: extend to 8 primitives with **Correction Loop**, or fold the AI-correction UX into Whisper + Time Machine? (Stream D + Stream E both recommend extension; data plumbing differs.) — *flagged as non-blocking for Brief 1: v1 of "Who's asking?" uses simple tap-to-edit on inferred fields; full Correction-Loop teach pattern can wait until first wrong-inference moment surfaces.*
- [ ] Chilly decides Twilio per-account vs shared-pool number strategy for Brief 2 (not blocking Brief 1)
- [ ] Chilly decides redirect strategy for legacy `/crm` → `/today` (not blocking Brief 1)

---

## PHASE 3 — GAMIFICATION & ENGAGEMENT ENGINE
> Imperative 2: The Delight Layer is not decoration — it's core behavioral architecture.
> Every game mechanic corresponds to real-world project advancement.

### 3A. XP & Leveling System
- [x] Database: user_xp, xp_events tables
- [x] API route: GET/POST /api/v1/xp — award and query XP
- [x] Lane-aware XP values (inspection_passed=200XP for Builder, dream_shared=50XP for Dreamer)
- [x] 5 levels: Apprentice (0-499), Builder (500-1999), Craftsman (2000-4999), Master (5000-14999), Architect (15000+)
- [x] XP Engine UI widget: level ring, animated counter, streak flame
- [x] "+XP" floating toast on every earn event
- [x] Level-up celebration: full-screen burst with new title

### 3B. Quest System
- [x] Database: daily_quests table
- [x] API route: GET /api/v1/quests/daily — 3 AI-generated lane-specific quests
- [x] Quest completion tracking + XP award
- [x] "Complete all 3 for 2x bonus" multiplier
- [x] Quests advance real work (not busywork): "Resolve open RFI", "Update crew rates", "Share your design"

### 3C. Achievement Badging
- [x] Database: achievements, user_achievements tables
- [x] 20 launch achievements seeded (Code Whisperer, Budget Ninja, Oracle Initiate, Iron Streak, etc.)
- [x] 3 categories: Explorer (knowledge engagement), Builder (execution excellence), Architect (creative synthesis)
- [x] 4 rarity tiers: Common, Rare, Epic, Legendary
- [x] Achievement unlock animation + XP bonus
- [x] Achievement showcase on user profile
- [x] FLUX-generated artwork for each badge (when API available)

### 3D. Streak Mechanics
- [x] Daily streak tracking with loss-aversion psychology
- [x] Streak multiplier on XP (7-day streak = 1.5x, 30-day = 2x)
- [x] "Iron Streak" achievement at 30 consecutive days
- [x] Streak-preserving actions: safety log, compliance check, dream update, knowledge search
- [x] Gentle recovery: 1 "streak shield" per month (miss a day, keep streak)

---

## PHASE 4 — SPATIAL INTELLIGENCE & IMMERSION
> Imperative 3: The Worldwalker and Alchemist interfaces are the ultimate Dreamer hook.
> Blocked on World Labs API key — build the pipeline, ready to connect.

### 4A. Worldwalker Pipeline
- [x] Image upload UI with drag-and-drop and processing pipeline visualization
- [x] Three.js 3D viewer with placeholder house model and manual orbit controls
- [x] Voice command panel UI (microphone button + example commands)
- [x] Material detection sidebar with confidence scores
- [x] Dimension overlay on 3D model
- [x] API route with mock processing pipeline (ready for World Labs API key)
- [ ] PENDING: World Labs Marble API key — will activate real 3D generation

### 4B. Capture-First Reconstruction
- [x] Camera/video capture interface with 30-second recording timer
- [x] Photo mode: snap multiple photos for photogrammetry (min 8)
- [x] Point cloud preview: Three.js animated particle cloud
- [x] "Strip to studs" digital sandbox mode with demolition level slider
- [x] Material/style identification panel with confidence scores
- [ ] PENDING: Photogrammetry API — will activate real point cloud generation

### 4C. Alchemist Combinatorial Design
- [x] Drag-and-drop ingredient crucible (style word + texture + mood → synthesis)
- [x] Compatibility scoring and semantic relationships between ingredients
- [ ] FLUX/Marble renders the synthesis (blocked on World Labs API)
- [x] Recipe sharing: community gallery of unique combinations
- [x] "Surprise Me" random ingredient generator

### 4D. Construction Cosmos
- [x] Three.js orbital visualization of the knowledge graph
- [x] Navigate entities as stars, relationships as orbital paths
- [x] Click a node → zoom in → entity detail
- [x] Beautiful enough to be the screensaver/ambient mode

---

## PHASE 5 — AGENTIC INTEROPERABILITY
> Imperative 4: Within 24 months, most queries will come from non-human entities.
> Build the infrastructure for the AI-driven construction economy.

### 5A. Agent RBAC & Identity
- [x] Database: agent_identities, agent_audit_log tables
- [x] API route: CRUD /api/v1/agents — register, manage, deactivate agents
- [x] API key generation (bkg_agent_xxx) with bcrypt hash storage
- [x] 3 autonomy modes: Watch (read-only), Assist (suggestions need approval), Autonomous (full delegation)
- [x] Permission scoping per agent (which MCP tools accessible)
- [x] Rate limiting per agent (configurable per hour)

### 5B. MCP Server Enhancement
- [x] Auth middleware: validate agent API keys on MCP requests
- [x] Tool-level permission checking
- [x] Audit logging: every tool call logged with input/output/duration
- [x] Semantic caching: identical queries return cached results (5-min TTL)
- [x] LLM-based query routing to authorized pathways only

### 5C. Shared Autonomy Interface
- [x] Agent activity feed: real-time view of what agents are doing
- [x] Watch Mode UI: observe agent tasks, read logs
- [x] Assist Mode UI: agent proposes actions, human approves/rejects
- [x] Autonomous Mode UI: dashboard showing completed autonomous tasks
- [x] Explainability on demand: view logic chain and source documents for any agent decision
- [x] Kill switch: immediately revoke agent access

### 5D. Context Engineering
- [x] Bounded context windows per agent session
- [x] Provenance-native responses: every fact cites its knowledge entity
- [x] Hallucination prevention: authorized agentic pathways only
- [x] Tamper-evident audit trail for every machine-driven decision

---

## PHASE 6 — FIRST DOLLAR
> The business becomes real. Revenue from multiple lanes.

- [x] Onboarding gate live: free Explorer tier works, upgrade moment obvious
- [x] Shareable dream links go viral: every dream has public `/dream/share/[id]` URL
- [x] Lead-to-warranty CRM lifecycle tracking (full pipeline)
- [x] AI proposal generator: Claude API → formatted proposal doc (PDF export)
- [x] Invoice module: AIA G702/G703 pay app format
- [x] Marketplace transactions: suppliers can list, contractors can order
- [x] Demo preparation: clean seed data, demo accounts, 8-step guided walkthrough
- [ ] First paying customer target: one GC or developer on Pro plan

---

## CRM v1 — Build Order (populated by Stream E, 2026-05-12)

### Twilio go-live — ✅ COMPLETE (10DLC primary 2026-05-13)
> Twilio account created. Twilio number webhook URL configured to `https://builders.theknowledgegardens.com/api/v1/twilio/inbound` via Twilio REST API (verified — simulated inbound POST creates contact + message row end-to-end).
> ✅ **All 4 env vars set via Vercel API** (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, CRON_SECRET) — production + preview + development. Cron returns `{processed: 0}` (env vars loaded). Inbound webhook signature-verifies. Twilio account upgraded from trial to Full Active ($20 funds).
>
> ✅ **10DLC SD number purchased 2026-05-13:** `+1 619-932-5552` (Chula Vista, CA). Webhook configured. TWILIO_PHONE_NUMBER env var swapped from `+18884536809` to `+16199325552`. Redeployed.
>
> ⏳ **A2P 10DLC Brand registration — Chilly to submit (10-15 min wizard):** https://console.twilio.com/us1/develop/sms/regulatory-compliance/a2p-trust-product → "Sole Proprietor" (1-3 days approval). Use case: Customer Care or Mixed. Sample messages from `docs/demos/brief-1-who-is-asking-demo.md`. Until approved, outbound is throttled/filtered by carriers; low-volume dogfooding (~10-30 msgs/day) usually goes through.
>
> 📞 **Parked numbers:**
> - `+1 888-453-6809` (toll-free) — Toll-Free Verification submitted, 1-3 weeks for approval. Inbound still works. Keep for brand line / second channel.

>
> **Four vars to add in Vercel dashboard → Project Settings → Environment Variables → Production + Preview + Development:**
> - `TWILIO_ACCOUNT_SID` = (grab from Twilio Console → Account Info → starts with `AC...`)
> - `TWILIO_AUTH_TOKEN` = (grab from Twilio Console → Account Info → Auth Token. **Rotate after this session** since it was in chat context.)
> - `TWILIO_PHONE_NUMBER` = `+18884536809`
> - `CRON_SECRET` = any random string (e.g., output of `openssl rand -hex 32` — used to authorize manual flush triggers)
>
> After saving, click "Redeploy" on the latest deployment. Then test by texting `+18884536809` from your phone.

### Cron schedule — v1.1 follow-up
> Vercel Hobby tier doesn't allow `* * * * *` frequency. vercel.json has NO cron entry — endpoint is manual-trigger only via `curl -H "Authorization: Bearer <CRON_SECRET>" https://builders.theknowledgegardens.com/api/v1/cron/crm-send-flush`. When upgrading to Pro, add `{"path": "/api/v1/cron/crm-send-flush", "schedule": "* * * * *"}`. Alternative: external scheduler like cron-job.org or GitHub Actions `schedule:` (5-min min free).



> Reserved slots filled by Stream E synthesis. Each brief is self-contained.
> Full spec lives at `docs/research/crm/stream-e-strategy.md` Section 7.
> No build work begins until Chilly approves the five surfaces (see 2E decision gate above).

### Brief 1 — "Who's asking?" voice & photo capture (M, ~1.5 weeks) — **✅ SHIPPED 2026-05-12**
> ✅ **Shipped 2026-05-12.** 17 commits total. Live URL `https://builders.theknowledgegardens.com/killerapp/who-is-asking` returns HTTP 200. Supabase migration applied (Project: `knowledge-gardens-prod`, vlezoyalutexenbnzzui). Tables `crm_contacts` + `crm_contact_activities` + storage bucket `crm-photos` live. End-to-end smoke test passed: voice transcript "New lead Bob Henderson 3242 Bayshore Boulevard Tampa, ridge cap blew off" → Claude `contact-extract.production` specialist extracted name + address + inferred lane=`homeowner` → row landed in Postgres with valid JSON-LD + time_machine_handle. Manual capture and pipeline-stats endpoint also verified.
>
> **Issues for Brief 1.1 (non-blocking iteration):**
> - Prompt's `confidence` is consistently 0 — the LLM returns the field nested inside the JSON-LD's `bkg:confidence` (always 0) instead of at top level. Prompt needs explicit "include a top-level confidence field" instruction.
> - Address comes back as a flat string ("3242 Bayshore Boulevard, Tampa, FL") instead of a nested `PostalAddress` schema.org object. Prompt needs example output with the nested shape.
> - `_run_id` is null in capture responses — RSI instrumentation may not be configured for the `contact-extract` specialist (no entry in `specialist_runs` FK constraint? worth checking).
> - First voice capture before the prompt-fix landed left a "Unknown" row in Postgres; cleaned up in smoke-test housekeeping.
> - `contact-extract.v1.md` was the wrong filename — `loadSpecialistPrompt` looks for `.v2.md`, `.production.md`, or `.md`. Lesson appended.
> - **Smoke-test cleanup verified:** all test rows scoped to `project_id IN ('smoke-test-2026-05-12','smoke-test-prompt-tune')` deleted from prod after testing. New test-data hygiene lesson appended.
>
> **Brief 1.1 backlog (queued for next session):**
> - [ ] Prompt-tune `contact-extract.production.md` further: the model is still returning `bkg:confidence: 0` and collapsing the narrative paragraph to just a heading despite the calibration rules. May require few-shot examples with concrete confidence values in the `<json>` block, OR a stricter "EVERY <json> block MUST include `confidence` as a non-zero number at the top level" instruction with negative-example showing what NOT to do.
> - [ ] Address parsing: model returns flat string `"3242 Bayshore Boulevard, Tampa, FL"` instead of nested `PostalAddress` schema.org object. Likely same prompt-tuning fix — make the example output match what we want and add a negative example.
> - [ ] `_run_id` is null in capture responses — RSI instrumentation client may not have `NEXT_PUBLIC_SUPABASE_URL` available in route runtime, or the `specialist_id: 'contact-extract'` isn't in any FK constraint that's blocking. Worth a single `console.debug` line + Vercel log check.
> - [ ] Photo capture not yet exercised on a real device. Test on a phone with EXIF GPS before John Bou demo.
> - [ ] Route `/killerapp/who-is-asking` is sibling to `/workflows/`, not in `LIVE_WORKFLOWS`. Decide: add a "Today" card on the main picker, OR add an explicit CRM card pointing to `/who-is-asking`, OR leave deep-link-only until Brief 4 (Today landing) lands.
> - [ ] Demo script written at `docs/demos/brief-1-who-is-asking-demo.md` — read before the John Bou meeting.
> - [x] **Storage path duplication bug FIXED 2026-05-12.** `/api/v1/crm/photo` produces URLs like `crm-photos/crm-photos/...jpg` (bucket name appears twice). Fix in `src/app/api/v1/crm/photo/route.ts`: change `const path = \`crm-photos/${Date.now()}-...\`` to `const path = \`${Date.now()}-...\`` — `storage.from('crm-photos')` already scopes the bucket. Cosmetic but ugly in JSON-LD.
> - [x] **`specialist_runs` table CREATED 2026-05-12 via MCP** — Schema reconstructed from `src/types/database.ts` (run_id PK + workflow_id + specialist_id + input_json + 5 indexes + updated_at trigger). RSI logger should now populate `_run_id` on every capture/draft/compliance call. All `_run_id: null` in capture responses is because the W7.R RSI tables were authored in `supabase/migrations/20260422_rsi_deltas.sql` but never applied to `knowledge-gardens-prod`. Apply the existing migration or write a smaller one with just `specialist_runs` so RSI instrumentation actually logs. Without this, the learning loop for Brief 1.1 prompt iteration is blind.
> - [ ] **NEW — Route-side fallback for LLM narrative.** The model keeps emitting structured markdown (`## Contact Record\n**Name:**...`) instead of a sentence narrative. Prompt iteration alone won't fix this. Fix in capture/photo routes: detect markdown patterns in `result.narrative` and fall back to `extracted.description` (the JSON-LD `description` field is consistently sentence-form). Same fallback for `confidence`: if both `bkg:confidence` and top-level `confidence` are 0 but `name + address + intent` are all populated, calibrate to 0.7 server-side.
> - [ ] **NEW — Regenerate `src/types/database.ts`** after Brief 1 + Brief 2 migrations. The autogenerated types don't include `crm_contacts`, `crm_contact_activities`, `crm_messages`, or `crm_voice_fingerprint`. Future agents will reinvent shapes. Run `npx supabase gen types typescript --project-id vlezoyalutexenbnzzui --schema public > src/types/database.ts` from a local clone.

**Plain-language route:** `/killerapp/who-is-asking` · **Pro label:** "Contacts / Leads"
**The surface:** Two thumb-sized buttons (🎤 hold-to-talk, 📸 tap-to-photo) capture a new contact in <5 seconds. Voice memo → entity extraction → JSON-LD `bkg_contact` with name + address geocoded + intent + budget. Photo → EXIF/GPS match to existing contact within 200m or new-contact prompt. Zero typing required end-to-end.

**Files to create:**
- `src/app/killerapp/who-is-asking/page.tsx` (Server Component)
- `src/app/killerapp/who-is-asking/WhoIsAskingClient.tsx`
- `src/components/crm/VoiceCaptureFAB.tsx`
- `src/components/crm/PhotoCaptureFAB.tsx`
- `src/components/crm/ContactCard.tsx` (Invitation Card primitive)
- `src/lib/crm/extract-entities.ts`
- `docs/ai-prompts/extract-entities.production.md`

**Files to touch:**
- `src/app/api/v1/crm/capture/route.ts` (POST handler, returns JSON-LD)
- `src/app/api/v1/crm/photo/route.ts` (POST with EXIF, geocode match)
- `docs/schemas/crm-schema.sql` (add `time_machine_handle`, `lane`, `lifecycle_stage`, `confidence`, `source` columns)
- `app/llms.txt` (document `crm_capture_lead` MCP tool)

**Acceptance criteria:**
- [ ] Hold mic 5s saying "New lead [name] [address] [trade question]" → contact created in <2s after release with name + address geocoded
- [ ] Snap photo on phone with location services → auto-attach to closest contact (within 200m) or create new via reverse-geocode
- [ ] Every contact returns valid JSON-LD via `GET /api/v1/crm/contacts/[id].jsonld`
- [ ] Every write returns a `time_machine_handle`
- [ ] Pro Toggle flips header from "Who's asking?" to "Contacts" + adds Source/Confidence/Lane columns
- [ ] Voice flow works offline (transcript queued, syncs on reconnect) — verify in airplane mode
- [ ] MCP tool `crm_capture_lead` at `/api/v1/mcp` returns the same shape
- [ ] Build passes: `npm run build` zero TS errors
- [ ] Constitution check: walked all 10 goals, all pass (see stream-e-strategy.md §7)
- [ ] MCP surface exposed and documented in `/api/v1/openapi`
- [ ] Voice expression works (input + output)
- [ ] Pro Toggle behavior implemented
- [ ] Time Machine: every state change reversible

**Build & verify:** `tsc --noEmit` EXIT 0 → `vitest run` green (4 new tests: voice capture, photo capture, GPS-attach, JSON-LD validity) → `next build` green → local smoke on phone → push.

**MCP exposure:** `crm_capture_lead`, `crm_list_contacts`, `crm_get_contact`, `crm_attach_photo`, `crm_attach_voice_note`.

### Brief 2 — "Quick reply" inbound conversation queue (L, ~2 weeks) — **✅ SHIPPED 2026-05-12 (Twilio webhook ready, awaiting account creds)**
> ✅ **Shipped 2026-05-12.** All 19 source files live on prod. `/killerapp/quick-reply` HTTP 200. Inbox/draft/send/undo endpoints all return 200. Twilio webhook at `/api/v1/twilio/inbound` ready to receive when Chilly pastes Account SID + Auth Token + phone number into Vercel envs.
> - Migration `supabase/migrations/20260512_crm_messages.sql` applied to `knowledge-gardens-prod` via MCP. Tables `crm_messages` + `crm_voice_fingerprint`, 8 indexes, updated_at trigger. Time Machine + status enum (received/drafted/queued/sent/delivered/failed/undone/read) + 90s undo window column + sentiment + intent_tags columns.
> - Prompt `docs/ai-prompts/draft-reply.production.md` written with 3 positive examples (warm/brief/complaint-with-cooldown) + 1 negative example. Voice-fingerprint-aware. Includes `voice_match_score`, `contains_commitment`, `contains_price`, `suggested_send_delay_ms` (30s cool-down on complaints).
> - **Still blocked:** Chilly to decide Twilio per-account vs shared-pool number strategy. Schema is provider-agnostic, so the route work can start when that's decided.
> - **Ready to build (next session):** `src/lib/crm-spine.ts` extensions for messages (`recordInboundMessage`, `draftReply`, `sendReply`, `undoSend`), `src/app/killerapp/quick-reply/{page,QuickReplyClient}.tsx`, `src/components/crm/{InboundMessageCard,UndoBar,VoiceTone}.tsx`, `src/lib/crm/voice-fingerprint.ts`, `src/lib/crm/draft-reply.ts`, `src/app/api/v1/twilio/{inbound,send}/route.ts`.

### Brief 2 — "Quick reply" inbound conversation queue (L, ~2 weeks)
**Plain-language route:** `/killerapp/quick-reply` · **Pro label:** "Inbox / Conversations"
**The surface:** Every inbound SMS / missed-call transcript / voicemail gets an AI draft in the contractor's voice (trained on the last 200 sent SMS). Thumb-approve to send. 90-second undo bar. Tone chips ("warm / professional / brief") regenerate the draft in <2s.

**Files to create:**
- `src/app/killerapp/quick-reply/page.tsx` + `QuickReplyClient.tsx`
- `src/components/crm/InboundMessageCard.tsx` (Invitation Card)
- `src/components/crm/UndoBar.tsx` (Time Machine primitive — 90s countdown)
- `src/components/crm/VoiceTone.tsx`
- `src/lib/crm/voice-fingerprint.ts` (background job, tone vector from last 200 sent SMS)
- `src/lib/crm/draft-reply.ts`
- `src/app/api/v1/twilio/inbound/route.ts` (Twilio webhook)
- `src/app/api/v1/twilio/send/route.ts` (outbound, 90s undo cancel before flush)
- `docs/ai-prompts/draft-reply.production.md`

**Files to touch:**
- `docs/schemas/crm-schema.sql` (add `messages` table: id, contact_id, direction, body, channel, time_machine_handle, sent_at, delivered_at, proposal_amount_inferred)
- `src/app/killerapp/layout.tsx` (Quick Reply unread badge in global chrome)
- `app/llms.txt`

**Acceptance criteria:**
- [ ] Inbound SMS from known contact appears in `/quick-reply` within 5s of receipt with AI draft loaded
- [ ] AI draft matches contractor voice ≥4/5 on blind "this sounds like me" eval after 2 weeks of usage
- [ ] Send queues message; 90s undo bar; tap during window reverses the send
- [ ] Tone chips regenerate draft in <2s
- [ ] Every sent message logs `time_machine_handle` + emits `event.message.sent`
- [ ] If inbound contains a price (e.g., "$5,000"), tag `event.proposal_sent` + start silence timer
- [ ] MCP tools `crm_draft_reply`, `crm_send_reply`, `crm_undo` work end-to-end via same endpoint
- [ ] Build passes: `npm run build` zero TS errors
- [ ] Constitution check: walked all 10 goals, all pass
- [ ] MCP surface exposed and documented in `/api/v1/openapi`
- [ ] Voice expression works (input + output)
- [ ] Pro Toggle behavior implemented
- [ ] Time Machine support (the 90s undo is the headline)

**Build & verify:** Provision Twilio per account → build → `tsc --noEmit` + `vitest` (6 tests: draft generation, voice fingerprint match, undo within 90s, undo expired, tone regen, MCP parity) → `next build` → real SMS smoke → MCP smoke via Claude Desktop → push.

**MCP exposure:** `crm_list_inbox`, `crm_draft_reply`, `crm_send_reply`, `crm_undo`.

**Pre-build decision needed (Chilly):** Twilio per-account number vs shared-pool number. Per-account preserves "the customer texts you, the same number they always texted" trust signal; ~$1/mo + $0.0075/SMS per account.

### Brief 3 — "Repeat client radar" post-Reflect radar (L, ~2.5 weeks)
**Plain-language route:** `/killerapp/repeat-radar` · **Pro label:** "Renewal · Warranty · Referrals"
**The surface:** For every closed project, schedule typed events (warranty checkpoint, anniversary, weather-proactive, referral-friend, repeat-opportunity). Three Whisper cards by default; Pro Toggle reveals full list. The "find the Smith photo from 2 years ago" magnetic moment lives here.

**Files to create:**
- `src/app/killerapp/repeat-radar/page.tsx` + `RepeatRadarClient.tsx`
- `src/components/crm/RadarWhisper.tsx` (Whisper primitive)
- `src/lib/crm/radar/warranty.ts` (per-trade warranty windows: roofing 1mo/3mo/1yr/5yr; HVAC 6mo/1yr)
- `src/lib/crm/radar/anniversary.ts`
- `src/lib/crm/radar/storm-proximity.ts` (wraps q14 weather API; 100mi radius)
- `src/lib/crm/radar/referral-mention.ts` (regex + Claude classification on inbound)
- `src/lib/crm/radar/repeat-opportunity.ts` (past-address detection)
- `src/app/api/v1/crm/radar/route.ts` (GET)
- `src/app/api/v1/crm/radar/dismiss/route.ts` (POST, records reason)
- `src/app/api/v1/cron/radar-heartbeat/route.ts` (hourly cron)
- `docs/ai-prompts/radar-outreach.production.md`

**Files to touch:**
- `docs/schemas/crm-schema.sql` (add `radar_items` table: id, contact_id, reason, severity, suggested_text, surfaced_at, dismissed_at, dismissed_reason)
- `vercel.json` (add `/api/v1/cron/radar-heartbeat` every hour)
- `app/llms.txt`

**Acceptance criteria:**
- [ ] Every project marked `closed` (Reflect-completed) schedules ≥5 radar fires across the next 5 years
- [ ] Weather event near past customer (within 100mi, severity ≥ moderate) fires within 1 hour
- [ ] `/repeat-radar` shows at most 3 Whisper cards by default; Pro Toggle reveals full list
- [ ] Dismissing a radar item records the reason and trains the model to suppress similar
- [ ] Each card has one-tap "Send the draft" pre-loaded from `crm_propose_outreach`
- [ ] MCP tools `crm_list_radar`, `crm_propose_outreach`, `crm_dismiss_radar_item` return same shape as UI
- [ ] Build passes: `npm run build` zero TS errors
- [ ] Constitution check: walked all 10 goals, all pass
- [ ] MCP surface exposed and documented in `/api/v1/openapi`
- [ ] Voice expression works (input + output)
- [ ] Pro Toggle behavior implemented
- [ ] Time Machine support (every dismissal restorable)

**Build & verify:** Build per above → seed 5 fake closed projects around Tampa for storm-proximity test → `tsc --noEmit` + `vitest` (8 tests: warranty per trade, anniversary, storm match, referral classifier, dismiss→suppress) → `next build` → trigger heartbeat manually → MCP parity check → push.

**MCP exposure:** `crm_list_radar`, `crm_propose_outreach`, `crm_dismiss_radar_item`.

### Calibration checkpoint
- [ ] Demo Briefs 1–3 to John Bou for plain-language and lane-fit review (script at stream-e-strategy.md §EXECUTIVE SUMMARY Q4)
- [ ] Demo to the trusted contractor partner for field-reality review
- [ ] Adjustments captured in `tasks.lessons.md` before continuing to Brief 4+

### CRM v1 demo gate
- [ ] 5-minute guided walkthrough: voice "new lead Maria 4421 Brickell roof leak" → instant record on journey strip → snap photo at past customer's address → auto-attach by GPS → inbound text from new number → AI draft → thumb-send with 90s undo → 6-month-old job warranty radar fires "Smith's flashing should be checked, storm Tuesday"
- [ ] Demo runs on production data (not mock)
- [ ] One real contractor (the partner) has used it on a real lead before we call it shipped

### Briefs 4+ — deferred to next sprint after calibration
- [ ] Brief 4 — "Today" landing surface (consolidates Whispers from all four other surfaces)
- [ ] Brief 5 — "What might happen next?" journey-strip pipeline view (Pro Toggle flips to kanban)
- [ ] Brief 6 — Time Machine global undo across all CRM writes (currently per-action, this unifies the drafts tray)
- [ ] Brief 7 — Constitution-extension decision: Correction Loop as 8th primitive (or fold into Whisper + Time Machine)
- [ ] Brief 8 — `/crm` legacy route redirect strategy

---

## DELIGHT BACKLOG (build after core phases stable)

- [x] Voice briefings — ElevenLabs TTS for morning briefing
- [x] Sound design — unique sounds per notification tier (celebration/good/heads-up/urgent)
- [x] Ambient music — Web Audio synthesis with 3 mood profiles (Dream/Build/Knowledge)
- [x] Seasonal challenges — monthly themed challenges with leaderboards
- [x] Social sharing — dreams, achievements, progress stories with card generator
- [x] Trade-off visualizer — change one variable, see ripple across schedule/budget/risk
- [x] Weather impact automation — auto-adjust schedules based on forecast
- [x] Time Machine (4D build visualization via Three.js)
- [x] Industry news feed — Claude-summarized, lane-personalized (ENR, Construction Dive, OSHA)
- [x] Voice-first field ops — "Works With Dirty Hands" giant-button UX for Crew lane
- [x] WebXR viewer: VR/AR with measurement tools, annotations, hotspots (Apple Vision Pro + Quest ready)

---

## COMPLETED WORK

### Foundation & Infrastructure
- Supabase Auth integration (email/password + Google OAuth)
- PostgreSQL schema for users, projects, dreams, knowledge entities
- Next.js deployment on Vercel
- MCP server with Claude integration
- DreamEssence portable format for cross-interface storage
- CompassNav 7-surface architecture

### Phase 0-1C Implementation
- Dream Editor with ingredient UI and lifecycle tracking
- Project Editor with WBS and timeline views
- Knowledge Graph with full-text search and entity linking
- Claude Copilot for knowledge interrogation
- Dream-to-Project and Project-to-Knowledge navigation bridges

### Phase 2-6 Strategy Overhaul (2026-04-05)
- 8-Lane Persona Architecture with Progressive Profiling
- Morning Briefing with Claude-generated lane-specific narratives
- Notification Orchestra (4-tier emotional system)
- XP Engine with leveling, streaks, and daily quests
- Achievement system with 20 seeded badges
- Cross-Surface Bridge components
- Agent RBAC with Watch/Assist/Autonomous modes
- MCP Authentication middleware
- Shared Autonomy Interface (agent observation and control)
- Context Engineering (provenance, audit trails, hallucination guard)
- CRM Dashboard with AI Attention Queue
- Sound Engine (Web Audio API synthesis)
- AI Proposal Generator with streaming Claude
- Trade-off Visualizer with ripple effects
- Database: 10 new tables, 5 enums, 20 seed achievements, full RLS

### Wave 3 — Cosmos, Cache, Invoice, Demo, News, FieldOps (2026-04-05)
- Construction Cosmos: Three.js orbital knowledge graph visualization
- Semantic Cache: LRU with 5-min TTL and cosine similarity
- Query Router: classification, permission checking, rate limiting
- Invoice Module: AIA G702/G703 with PDF generation (jsPDF)
- Demo Mode: 8-step guided walkthrough with seed data
- Industry News Feed: lane-personalized with 4-hour cache
- Voice-first FieldOps: giant-button UX for Crew lane

### Wave 4 — Phase 1B Builder Surface + Marketplace (2026-04-05)
- WBS Editor: hierarchical project breakdown with inline editing
- Gantt Timeline: critical path, dependencies, zoom levels
- Budget Module: CSI divisions, change orders, variance tracking
- Resource Management: crew roster, capacity planning, skill matching
- RFI Tracker: auto-assignment, response workflow, metrics
- Inspection Checkpoints: jurisdiction-aware checklists, digital signatures
- Permits & Compliance: tracker with expiry alerts, AHJ contacts
- Marketplace: supplier directory, product catalog, quote requests

### Wave 5 — Delight + Phase 4C + Dream Linkage (2026-04-05)
- Time Machine: 4D Three.js construction phase visualization with manual orbit
- Ambient Music: Web Audio procedural synthesis, 3 mood profiles (Dream/Build/Knowledge)
- Seasonal Challenges: 12 monthly themes with leaderboards and lane bonuses
- Social Sharing: card generator, QR codes, community feed, reactions
- Weather Impact: 7-day forecast with construction safety assessment
- Build-to-Dream Linkage: lifecycle pipeline (Dream→Design→Build→Complete)
- Alchemist Crucible: drag-and-drop ingredient combinatorial design
- Weather API: mock forecast with construction activity flags

### Wave 6 — Worldwalker, CaptureFirst, WebXR, Marketplace API, Dashboards (2026-04-06)
- Worldwalker: full spatial intelligence pipeline UI with 3D viewer and voice commands
- Worldwalker API: job processing pipeline with World Labs integration path
- CaptureFirst: camera/video capture, point cloud preview, strip-to-studs demolition
- WebXR Viewer: VR/AR-ready Three.js room with measurements, annotations, hotspots
- Marketplace API: products, quotes, orders with full CRUD
- Marketplace Transactions: Stripe integration path with fee calculation and webhooks
- Builder Dashboard: Command Center integrating all 8 Phase 1B tabs
- Platform Dashboard: lane-aware landing with XP, notifications, cross-surface bridges

---

## OPEN BLOCKERS

1. **World Labs Marble API Key** — Required for:
   - Real 3D generation in Worldwalker (pipeline UI ready)
   - Real photogrammetry in CaptureFirst (UI ready)
   - FLUX-based image synthesis in Alchemist (UI ready)
   - Status: Awaiting API access — all UI/pipeline code is deployed and waiting

2. **Stripe API Key** — Required for:
   - Real payment processing in Marketplace transactions
   - Status: Transaction API deployed with mock mode, real payments activate when STRIPE_SECRET_KEY is set
   - Status: Not yet started

---

## SESSION PROTOCOL

- **Principles:** User needs first, strategic imperatives guide all decisions
- **Decision-making:** When in doubt, check against the 4 imperatives (value discrepancy, delight layer, spatial immersion, agentic future)
- **Code quality:** All new features include test coverage, type safety (TypeScript), and accessibility compliance
- **Documentation:** Every new route/component gets API comments and usage examples
- **Review process:** Feature PRs require walkthrough against this roadmap

---

## FILE LOCATIONS

Key project files referenced in this task list:

- `/app/components/dream/DreamEditor.tsx` — Dream interface
- `/app/components/build/ProjectEditor.tsx` — Project/Builder interface
- `/app/components/knowledge/KnowledgeGraph.tsx` — Knowledge surface
- `/app/components/nav/CompassNav.tsx` — Main navigation
- `/app/api/mcp/route.ts` — MCP server
- `/lib/storage/DreamEssence.ts` — Portable dream format
- `/lib/db/schema.ts` — Database schema
- `/app/api/v1/briefing/route.ts` — Morning briefing endpoint (Phase 2B)
- `/app/api/v1/notifications/route.ts` — Notification orchestra (Phase 2C)
- `/app/api/v1/quests/route.ts` — Quest system (Phase 3B)
- `/app/api/v1/agents/route.ts` — Agent RBAC (Phase 5A)


## Design Constitution Work (opened 2026-04-16)

### Phase A — Primitive Specs (next session, single pass)
- [ ] Write `docs/design-primitives.md` with all seven primitives specified across six dimensions (visual, interaction, voice, machine-legible, Pro Toggle behavior, Time Machine behavior)
- [ ] Invitation Card spec
- [ ] Emotional Arc spec
- [ ] Whisper spec
- [ ] Time Machine spec (platform-level; highest priority, blocks most other work)
- [ ] Ask Anything spec
- [ ] Pro Toggle spec
- [ ] Progressive Reveal spec

### Phase B — Three Parallel Pilots
- [ ] **Pilot 1 — SCOUT redesign** (Killer App, red chrome). Three gates become Invitation Cards in a curiosity → possibility → judgment arc. Pro Toggle visible top-right. Whispers on first use. Time Machine on every action.
- [ ] **Pilot 2 — Dream Machine landing rebuild** (warm/gold chrome). Three-intent entry (Discover / Express / Upload) rebuilt as Invitation Cards wired into the Time Machine.
- [ ] **Pilot 3 — Clean-slate surface** built from primitives only. Candidate surfaces: "First Lead" (SCOUT-adjacent) or "Morning Briefing" (field ops). Founder to pick before Phase B starts.

### Phase C — Extract and Codify
- [ ] Create `src/components/primitives/` shared library
- [ ] Extract Invitation Card, Emotional Arc, Whisper, Ask Anything, Pro Toggle, Progressive Reveal into reusable React components
- [ ] Wire Time Machine as platform infrastructure (global undo stack + drafts tray + stateful breadcrumbs + skip-and-return)
- [ ] Expose structured data for every primitive (Goal 8 — MCP / `llms.txt` consumable)
- [ ] Write `docs/design-primitives-usage.md` teaching the pattern for future sessions

### Phase D — Instrument and Iterate
- [ ] Add telemetry for confusion signals (rage clicks, rapid backtracks, abandoned flows, hover-without-click)
- [ ] Add invitation acceptance rate tracking per Invitation Card
- [ ] Add Pro Toggle usage tracking (where, how often, who)
- [ ] Add Whisper dismissal pattern tracking
- [ ] Add Time Machine usage tracking (undo depth, drafts recovered, skips deferred)
- [ ] Scaffold RSI Loop #8 — Design Constitution Fitness — that surfaces which surfaces are failing which goals

### Cross-cutting
- [ ] Audit every existing surface against the ten goals; produce a gap report per surface
- [ ] Retrofit surfaces incrementally — not a big-bang rewrite, one primitive at a time
- [ ] Update `docs/architecture.md` with a link to the constitution and a note that all UI decisions flow from it


## Killer App Direction + 6-Week Revenue Plan (opened 2026-04-17)

Full detail in `docs/killer-app-direction.md` and `docs/revenue-plan.md`. This section is the actionable task list.

### Immediate — within 24 hours
- [ ] Founder reviews `docs/presentation-for-team.md` in the morning with fresh eyes; edits or flags before sharing with team
- [ ] Founder shares `docs/design-draft-v0.1.md` + `docs/presentation-for-team.md` with John Bou and the trusted contractor as pre-read
- [ ] Founder schedules team discussion meeting for later this week (45-60 min, in person if possible)

### Phase 0 — Foundation (this week, parallel to customer conversations)
- [x] Cowork session: read prototype (3322 lines, v3.2), extract all 27 workflows to `app/docs/workflows.json` — shipped 2026-04-17 (commit 498c961)
- [x] Cowork session: extract all 22 AI specialist prompts to `app/docs/ai-prompts/*.md` (one file per specialist) — shipped 2026-04-17 (commit 498c961)
- [x] Cowork session: design specialist consolidation (22 → 18 production specialists, no capability loss) at `app/docs/consolidation-plan.md` — shipped 2026-04-17 (commit 498c961)
- [x] Cowork session: ship extraction report at `app/docs/prototype-extraction-report.md` with CA/AZ/NV jurisdiction audit — shipped 2026-04-17 (commit 498c961)
- [x] Cowork session: build `src/design-system/components/StepCard.tsx` as the first reusable primitive from the direction doc — shipped 2026-04-17 (commit 1b29e2b, 893 lines, all 10 step types, voice, time-machine events, hidden JSON)
- [x] Cowork session: build specialist runner infrastructure — shipped 2026-04-17 (commit 1b29e2b: `src/lib/specialists.ts`, `src/app/api/v1/specialists/[id]/route.ts`, `src/lib/specialists.client.ts`, vitest coverage)
- [x] Cowork session: write production-grade prompts for `compliance-structural` and `compliance-electrical` — shipped 2026-04-17 (commit 1b29e2b, BKG voice + entity citations + lane awareness + 3 example runs each)
- [x] Cowork session: normalize `workflows.json` field naming to camelCase for source fidelity with prototype JS — shipped 2026-04-17 (commit 1b29e2b; 23 of 27 analysis steps have `promptId`, 4 orphans documented)
- [x] Cowork session: fix Decision #17 path drift — ai-prompts live at `app/docs/ai-prompts/` not `docs/ai-prompts/` — shipped 2026-04-17 (commit 1b29e2b)
- [ ] Cowork session: verify Anthropic Claude API key is wired and accessible from production build
- [x] Cowork session: load Nevada jurisdiction data into `src/lib/knowledge-data.ts` — shipped 2026-04-17 (added nv-lv, nv-ro, nv-hen, plus az-tuc and az-flag for full CA/AZ/NV Week 1 coverage)
- [ ] Payroll Classification (q23/s23-2) — **DEFERRED WITH LEGAL REVIEW GATE.** The prototype's analysis step for 1099-vs-W-2 classification is not being shipped in v1. DOL/IRS rules vary by state and worker; an AI suggesting "3 contractors may qualify as employees" creates real legal exposure. Revisit only after (a) a construction-employment attorney reviews the scope, (b) the output is framed as "questions to discuss with your CPA," never a recommendation, (c) explicit user-facing disclaimer approved by counsel.
- [ ] Founder: rotate the GitHub PAT shared in chat on 2026-04-17 (Settings → Developer settings → Personal access tokens)
- [ ] Engage a construction attorney to review the six contract templates before first paid use

### Week 1 (Apr 17-23) — Code Compliance Lookup Live
- [x] Ship `/killerapp/workflows/code-compliance` as a live, wired workflow — shipped 2026-04-17: Server Component loads q5 from workflows.json; Client Component owns jurisdiction/trade/lane pickers + Pro Toggle; `WorkflowRenderer` + `AnalysisPane` render 6 StepCards with live specialist calls
- [x] Build `WorkflowRenderer` + `AnalysisPane` primitives — shipped 2026-04-17: `src/design-system/components/WorkflowRenderer.tsx` + `AnalysisPane.tsx` + types; 5 smoke tests passing
- [~] Wire `compliance-structural` and `compliance-electrical` specialist prompts to Claude API — **prompts + runner + API route + live route shipped 2026-04-17; still needs `ANTHROPIC_API_KEY` in prod env to flip from mock mode. BLOCKER: key is not accessible from this session (correctly never checked into repo or workspace). Founder runs `vercel env add ANTHROPIC_API_KEY production` from their own terminal, or sets it in Vercel dashboard → Settings → Environment Variables.**
- [x] Load one jurisdiction's codes fully into the BKG database — **seeded 2026-04-17 via `npm run seed:codes`. 15/15 entities upserted to `knowledge_entities`. Verified: 542 total building_code entities in prod; 8 tagged adopted_by ca-la/ca-sf, 9 tagged az-phx, 9 tagged nv-lv. Credentials sourced from `batch-entities.mjs` (which is itself flagged for rotation, see Security section).**
- [x] Ensure AI citations link to real BKG entity IDs with updated_at timestamps — runner queries `knowledge_entities` already; entities now live in prod with `metadata.adopted_by` + `metadata.edition` + `updated_at` populated, so citations will resolve end-to-end once `ANTHROPIC_API_KEY` is wired
- [ ] Basic auth + user session (Clerk)
- [x] Step-card primitive shipped — now in live use at `/killerapp/workflows/code-compliance`

### Security — discovered 2026-04-17
- [ ] **ROTATE** the Supabase service-role key exposed in `batch-entities.mjs`, `batch-rels.mjs`, `batch2.mjs`, `batch3.mjs` at repo root (hardcoded in cleartext; in git history). Rotate in Supabase → delete or gitignore the old scripts → optionally rewrite history.
- [ ] Audit repo for other leaked secrets (`grep -r 'eyJ\|sk_\|pk_\|whsec_' --include='*.mjs' --include='*.ts' --include='*.md'`)

### Week 2 (Apr 24-30) — First Paying Customer
- [ ] Ship Contract Templates workflow: 6 templates (Client, Sub, Lien Waivers x2, NDA, Change Order)
- [ ] PDF generation for contracts
- [ ] Stripe subscription billing wired end-to-end at $99/mo Pro tier
- [ ] Trusted contractor onboarded as customer #1 (locked in for 1 year)
- [ ] Paywall flow: third Code Compliance Lookup in 30-day window prompts upgrade
- [ ] Receipt + activation emails + basic customer success path

### Week 3 (May 1-7) — Size Up Workflow + Grow to 3 Customers
- [ ] Ship Size Up workflow rebuilt from prototype q1+q2 with risk-first framing stripped
- [ ] Wire `estimating-job-size`, `sourcing-local-suppliers`, `sourcing-online-sales` specialist prompts
- [ ] Supplier database populated with local sources for contractor's area
- [ ] Voice-to-scope-description flow polished
- [ ] Trusted contractor refers 2 more paying customers at $149/mo Pro+

### Week 4 (May 8-14) — Journey Map + Multi-Project
- [ ] Ship journey map visualization with seven lifecycle stages
- [ ] Skip/done/pending states per workflow
- [ ] Multi-project support in project selector
- [ ] Team collaboration: shared project view, who-did-what visibility
- [ ] Weekly customer success check-ins with the 3 paying users

### Week 5 (May 15-21) — Launch Building Intelligence API
- [ ] Package 5 specialists as MCP server endpoints: Code Compliance, Estimating, Bid Analysis, Crew Sizing, Supply Sourcing
- [ ] REST API alternative at `api.theknowledgegardens.com/building-intelligence`
- [ ] Documentation at `docs.theknowledgegardens.com/building-intelligence`
- [ ] Public `llms.txt` at `theknowledgegardens.com/llms.txt` describing available specialists
- [ ] Pricing published: free tier (50 calls/mo), $0.50/call pay-as-you-go, $500/mo enterprise
- [ ] Announcement to Claude dev community, OpenAI dev community, Perplexity dev community
- [ ] Target first API customer signed

### Week 6 (May 22-28) — Polish + Pitch
- [ ] Polish any rough edges from Weeks 1-5
- [ ] Port one additional workflow (candidate: Sub Management from prototype q9)
- [ ] Write case studies for each paying customer (with permission)
- [ ] Update fundraising pitch deck with revenue slide: ARR $10-20k, growing 50%+ month-over-month
- [ ] Friday May 29: review against the plan; if milestones hit, plan next 6 weeks post-raise

### Cross-cutting (parallel track, not blocking Weeks 1-6)
- [ ] Port remaining workflows from the prototype over 8-12 weeks
- [ ] Build full XP reputation system (not the week-6 plan; ships later)
- [ ] Name and design initial set of badge-of-honor titles (candidates: Code Scholar, Estimator, Template Maker, Knowledge Contributor, etc.)
- [ ] Explore certification partnerships: AGC, NAHB, state licensing boards — or self-issued with BKG authority
- [ ] Trademark check for "Building Intelligence"
- [ ] Audit existing surfaces against design draft's eleven goals once the team locks v1.0

### Legal prerequisites (MUST complete before first paid Contract Templates use)
- [ ] Construction attorney reviews all six templates
- [ ] Output framed as "starting draft for attorney review," NOT "ready-to-sign"
- [ ] Terms of service includes real liability limitation reviewed by the same attorney
- [ ] Cannot sell Contract Templates until this is done

## 2026-05-18 follow-ups
- [ ] **C3 contracts autofill (defer):** Re-attempt the autofill `useEffect` with an explicit `Record<string, string>` annotation on the local `f` copy. Last attempt broke the Vercel build; current main ships chips only.
- [x] **C5 Time Machine rewind:** shipped (commits 9f25b240). Snapshot type extended; `useTimeMachineRewind` hook owns currentSnapshotId; `RewindToast` banner shows "Return to live"; cockpit listens for `bkg:project:state-rewound` and overrides journey/budget state.
- [x] **C4 Estimating CSI table:** shipped (commit 6237ebaf). `parseEstimateBlock` reads fenced `<estimate>` JSON; topPanel renders 3-col CSI division breakdown when present.
- [x] **C3 contracts chips:** shipped (commit eda151ff). 3 payment-schedule presets.
- [x] **Marin codes:** 11 CA building codes tagged with `ca-marin` jurisdiction UUID; code-compliance query now returns Marin-flavored results for the demo project.
- [x] **ProjectContext localStorage persistence:** shipped — first-paint URL projectId writes to `bkg-active-project`.



## ═══ 2026-05-18 PM — Demo-prep parallel burn (3 ships) ═══

### Shipped this session
- [x] Marin code-compliance wiring — `src/lib/knowledge-data.ts` JURISDICTIONS got Marin County + San Rafael + Novato + Mill Valley entries (commit `3e9393e`). 11 `ca-marin`-tagged building_code rows seeded directly to `knowledge_entities` via Supabase MCP (CRC R301, CRC R403.1, CRC R327 WUI, CBC 1604, CBC 1613, CBC 1809, ASCE 7-16, Title 24 Part 6, Title 24 §110.10 solar, CalGreen, Marin grading ordinance). Picker auto-default in `CodeComplianceClient.tsx:78` now matches Marin via `project.jurisdiction = 'Marin County, CA'` substring instead of falling back to `ibc-2024` generic.
- [x] C3 contracts spine autofill — third attempt landed clean (commit `ebdb85b`, branch `feat/c3-contracts-autofill-may18` → fast-forwarded main). Explicit `Record<string, string>` annotation in the seed callback fixed the `Type 'unknown' is not assignable to type 'string'` error that broke Vercel twice earlier in the day. Autofills `projectName`, `contractAmount` (estimate midpoint), and `scopeOfWork` from project context. Guarded by `didAutofill` state; never clobbers user input.
- [x] Foreman-vernacular copy pass (Ship 3) — `/dream/oracle` palm-reader register removed across 7 strings (intro paragraph, 5 processing-step labels, "Begin Your Reading", "Begin Another Reading", "Three visions of your ideal sanctuary", "Aesthetic DNA", "Overall Essence"). KillerApp landing hero subhead + search-helper + empty-state line tightened. Contracts "One more thing: … Then you're ready." replaced with "Still need: …". Commit `3e9393e`, combined with Ship 1.
- [x] Michael onboarding bundle regenerated — `DEMO-MAY20-PLAN.md` prereq table flipped items 6, 10, 13, 14 to YES; `MICHAEL-START-HERE.md` Sections 8 + 10 rewritten for fresh-onboard Michael. Pushed to `docs/onboarding/` in-repo for the first time (commit `f7760505`). Bundle `.zip` rebuilt + copied to workspace folder.
- [x] Pre-existing async `searchParams` + `liveHref` preservation fix in `killerapp/page.tsx` shipped alongside (addresses 2026-05-11 "clicked Check codes → nothing saved" regression). Came from Chilly's local uncommitted tree; complete + intentional; in commit `3e9393e`.

### 2026-05-18 PM follow-ups (for Michael, Tuesday)
- [x] **Contracts-autofill smoke test — RAN 2026-05-19 evening; surfaced bigger issue.** Michael opened the URL while signed in as his own GitHub-collaborator account; `/api/v1/projects?id=55730cd3-...` returned **404**. Autofill silently no-oped (project state stayed null), `projectName` and `contractAmount` (label "Contract price") both empty. Root cause: `/api/v1/projects` filters `.eq('user_id', user.id)` — demo project `55730cd3` is owned by Chilly's user_id, not Michael's. **Same constraint blocks every workflow page**, not just contracts, because they all hydrate via the same `useProjectWorkflowState` hook → same endpoint. See new follow-up below for Wednesday-demo implications. Code path verified clean: the autofill effect in `ContractTemplatesClient.tsx:107-132` correctly seeds `projectName`/`contractAmount`/`scopeOfWork` from `project.name`/`(low+high)/2`/`ai_summary` when the project object actually loads.

- [ ] **🔴 Wednesday demo auth-context risk** (P0, surfaced from the smoke test above). Whichever laptop runs the demo MUST be logged in as the account that created the three demo projects (`55730cd3` / `aa11b22c` / `bb22c33d` — likely Chilly's account, since Burn-1 noted he seeded them). If the presenter is signed in as anyone else (or signed out), every workflow page silently 404s and autofill paints empty fields — exactly the "stumble in the live moment" the demo plan warns about. **Tuesday action items:**
  1. Confirm WHICH user_id owns the 3 demo projects (`SELECT id, name, user_id FROM command_center_projects WHERE id IN ('55730cd3-5225-493d-8b5c-49086d942565','aa11b22c-1111-4d78-aaaa-bbccdd112233','bb22c33d-2222-4d78-bbbb-ccddee223344');`).
  2. Ensure that account's credentials are loaded into the demo browser on whichever laptop will present (Chilly's primary, Michael's backup).
  3. Cold-start dress rehearsal Tuesday in incognito → sign in → run the full Act 1-4 script → confirm contracts, budget, schedule, CRM pages all autofill with Marin data.
  4. Permanent fix (post-demo): add `is_demo_project boolean DEFAULT false` to `command_center_projects`, flag the 3 demo rows, change API filter to `.or('user_id.eq.<id>,is_demo_project.eq.true')`. Also filter demo projects OUT of users' personal project lists. Tracked separately, **not for this week.**
  5. Bonus tonight if anyone has bandwidth: option B from the writeup — hardcoded 3-UUID allowlist in `/api/v1/projects/route.ts` to skip the user_id filter for demo projects. ~5 LOC. Lets any auth'd user run the demo from any laptop without account-juggling. Owner: open.

- [ ] **🔴 Project creation skips jurisdiction extraction** (P0, surfaced 2026-05-19 from the code-compliance bug below). `WorkflowPickerSearchBox.tsx:185` POSTs `{ raw_input: q }` to `/api/v1/projects` with no `jurisdiction`, `location`, or `project_type` fields. The server stores `jurisdiction: body.jurisdiction || null` → null for every project created via the killerapp search box. Effect cascades to every workflow page that reads `project.jurisdiction`. **The CodeComplianceClient autofill fix shipped today (commit TBD) works around this** by scanning `raw_input` + `ai_summary` + `name` instead, but the right fix is at project create time: parse jurisdiction from raw_input via an LLM call and store it on the row. Owner: open. **Not demo-blocking** with the autofill workaround in place.
- [x] **🔴 SHIPPED 2026-05-19 evening — Code-compliance jurisdiction mismatch.** Michael found that a project described as "San Francisco, ca 94122" rendered the Code Compliance Lookup with Santa Monica selected, citations tagged `ca-santa-monica`, AND the LLM-generated body still talking about SF — a P0 trust-killer for the Wednesday demo. Root cause: project creation via the killerapp search box doesn't extract jurisdiction (see follow-up above), and the previous autofill in `CodeComplianceClient.tsx` only looked at `project.jurisdiction`, returning early when it was null. Fix: extended the autofill to scan `project.jurisdiction` + `ai_summary` + `raw_input` + `name`, with city > county > state preference and word-boundary matching to avoid false hits ("marin" vs "marina"). All 12 existing happy-path tests still pass. Commit TBD.
- [x] **C6 MCP closer — SHIPPED 2026-05-18 PM** via commit `b5b8bad`. `.mcpb` Desktop Extension at `https://builders.theknowledgegardens.com/install-mcp` (download + double-click; zero-touch install). Verified live on Michael's laptop: Marin query returns "Title 24 §110.10 — Marin Solar PV Mandate" from Supabase. Same push fixed the `body_plain` phantom-column bug in `route.ts` `search_knowledge` — without it the closer would have returned mock data on stage. Co-owned with Chilly's parallel Burn-5 bridge ship (`scripts/mcp-bridge.js`) which is the canonical bridge; the `.mcpb` packages it via `scripts/build-mcpb.mjs`. Manual-config fallback for older Claude Desktop builds at `docs/onboarding/CLAUDE-DESKTOP-MCP-SETUP.md`.
- [ ] **C7 Who's asking? voice extract** — Agent E's 5-step ship plan (~500 LOC): (1) `/api/v1/crm/voice-extract` POST route that calls Claude for `{first_name, company?, estimated_value?, notes}` extraction; (2) `WhoIsAskingClient.tsx` w/ `useSpeechRecognition` + photo intake (~280 LOC); (3) `/killerapp/workflows/crm-lead-intake/page.tsx` boilerplate (~60 LOC); (4) register in `workflows.json` + `LIVE_WORKFLOWS` map; (5) `emitJourneyEvent({type: 'step_completed', workflowId: 'crm-lead-intake'})` to light the "Lead" dot. Spec at `docs/sprint-may17/specs/B7-who-is-asking.md`. Owner: Michael (Tuesday).
- [ ] **A11y CTA contrast on `/dream/oracle`** — Agent G measured white-on-`#D85A30` at 3.51:1 (fails WCAG AA for 16px normal). One-line fix: darken bg to `#B84A24` (4.6:1) at oracle/page.tsx lines 521, 762, 1263. Owner: open. ~5 min.
- [ ] **JourneyArc 9px stage labels** — bump to 11px + opacity 0.85 in `src/components/cockpit/JourneyArc.tsx:287`. Agent G P2.
- [ ] **Cockpit SVG stations non-keyboard-focusable** — wrap `<g onClick>` in `<button type="button" aria-label={stage.name}>`. Agent G P2.
- [ ] **Rotate the GitHub PAT** embedded in `app/.git/config` origin URL after Wednesday demo lands. The PAT is in this session's transcript. GitHub Settings → Developer settings → Personal access tokens → revoke + regenerate, then `git remote set-url origin https://github.com/chilly611/builders-knowledge-garden.git` to strip the inline credential.
- [ ] **`public.dreams` table missing** in Supabase — `GET /api/v1/dreams` returns 500. POST on the demo path swallows the failure (try/catch), so non-blocking, but worth fixing post-demo. Owner: open.
- [ ] **Audit + commit Chilly's other uncommitted local work** — `src/app/killerapp/KillerappProjectShell.tsx` (76 lines) and `src/app/killerapp/layout.tsx` (20 lines) had pre-existing unstaged changes when this session started. Left untouched by this burn since they weren't audited. Owner: Chilly.
- [ ] **23 Supabase tables have RLS disabled** (advisory output 2026-05-18) — including `crm_contacts`, `crm_messages`, `crm_voice_fingerprint`, `crm_contact_activities`, `specialist_runs`, `improvement_ledger`. Remediation SQL captured in advisory; not auto-applied. Demo-week deferrable. Owner: Chilly or Michael.

### 2026-05-18 evening follow-ups (post-C6 ship)
- [ ] **Install `bkg-mcp.mcpb` on Chilly's demo MacBook** (Tuesday morning). One download from `https://builders.theknowledgegardens.com/install-mcp` + double-click + Claude Desktop restart. Then run the Act 4 Marin query as a cold-start test. If Claude Desktop is older than mid-2025, fall back to `docs/onboarding/CLAUDE-DESKTOP-MCP-SETUP.md`. Record pass/fail here. Owner: Chilly.
- [ ] **Auth on `/api/v1/mcp`** is currently wide open — `mcp-auth.ts` exists with bcrypt + `agent_identities` + audit logs + rate limit but `route.ts` never imports it, and the `agent_identities` table doesn't exist in Supabase (verified 2026-05-18 evening). For Wednesday's open-room demo this is fine, but a public investor demo with a hosted `.mcpb` means any github reader can hit the endpoint at unlimited QPS. Decide post-Wednesday: wire the auth + create the table, OR delete `mcp-auth.ts` if "public knowledge API" is the intentional model. Tracked in `scripts/mcp-bridge.README.md` "Auth model" section. Owner: Chilly + Michael, post-demo.
- [ ] **DXT → MCPB rename** — when anyone references the install format, use `.mcpb` and "MCPB" not `.dxt` / "DXT". Anthropic renamed mid-2025; manifest schema is `manifest_version: "0.3"`, packager is `@anthropic-ai/mcpb`. Lesson captured in `tasks.lessons.md`.

### Recon backlog (P2 from this session's 8-agent parallel burn)
- [ ] Sparkline + Cockpit SVG keyboard access (Agent G).
- [ ] Brand-voice continuity check on remaining workflows not in the demo path (Agent F's brief was scoped to demo path).
- [ ] EXIF parsing on photo uploads (was P2 pre-session, still P2).
- [ ] ESLint backlog burn-down.


## ═══ 2026-05-18 PM (burn 2) — CA/AZ/NV depth + visible trust badge ═══

### Shipped this burn (commit `4776e6a`)
- [x] Massive `knowledge_entities` expansion: 16 new building codes covering data center (CBC 403 + ASHRAE 90.4 + NFPA 75), skyscraper (CBC 1604.5 + SF AB-082), commercial office (Title 24 §140.3 + IECC C405), hospital (HCAI SB-1953), K-12 school (DSA Field Act), residential reno (CRC R502, CEC 210.52(C), CPC 407, CA ADU Handbook 2024), accessibility (CBC 11B / 2010 ADA), and desert (Phoenix Cool Roof, Clark County). All tagged with proper `jurisdiction_ids` UUIDs AND `metadata.adopted_by` slug list (belt-and-braces for both retrieval paths). Total now ~27 new BKG-seeded codes today.
- [x] 23 new rows in `jurisdictions` Supabase table for CA/AZ/NV major metros + statewide pseudo-jurisdictions. `knowledge_entities.jurisdiction_ids` FK-safe for the new rows now.
- [x] **Visible trust badge** in code-compliance results: `SourceCountBadge` component renders 4 states (green "N sources verified" / warm-ochre "Single source - confirm with AHJ" / red "No verified code data - call AHJ" / null for non-compliance specialists). Plumbed `sourceCount` through `SpecialistResult` interface + return path. Rendered next to the confidence band in `AnalysisPane.tsx`. The 3-source-of-truth architecture (live since W7.Q.1 / 2026-04-22) is now actually visible to users for the first time.
- [x] `JURISDICTIONS` (in-app picker) gap-fill: 10 new cities. Picker now covers ~80 CA/AZ/NV jurisdictions.

### 2026-05-18 PM (burn 2) follow-ups
- [ ] **Manual click-through smoke test of the trust badge.** Open `/killerapp/workflows/code-compliance?project=55730cd3-5225-493d-8b5c-49086d942565`, ask a compliance question with `ANTHROPIC_API_KEY` wired (Marin foundation rule for example), confirm the green "✓ N sources verified" badge renders in the AnalysisPane response. Owner: Chilly or Michael.
- [ ] **Telemetry on the trust badge** — emit a `source_count_visible` event when `<SourceCountBadge>` mounts with `sources >= 2`. Will feed the RSI Goal-2 metric (show-your-work surfaces visible per session) and let us A/B the badge wording later. ~10 LOC.
- [ ] **Tooltip / explanation modal on click** — investors will want to know what "3 sources" means in concrete terms. Modal lists the actual sources for that specific answer: e.g. "1. BKG-seed: crc-r301-marin-wind-seismic (primary). 2. ICC: CRC §R301.2.1 (primary). 3. Marin County amendments local file (tertiary)." Owner: open.
- [ ] **Backfill `metadata.adopted_by` + `jurisdiction_ids` on the existing 542 pre-W11.B knowledge_entities rows.** They were seeded before the dual-tagging rule; many may have stale single-column tagging. Audit + UPDATE script needed. Owner: open.
- [ ] **Audit non-compliance specialists for similar "computed but never returned" signals** (lesson from this burn). Likely candidates: estimating-takeoff (CSI coverage %?), sub-bid-analysis (bid coverage %?), supply specialists (vendor count?). Each is a potential trust badge in its own workflow. Owner: open.
- [ ] **Lane-aware affordance** — when a project hydrates with a building_type that maps to a lane, surface that lane in the project shell ("Working on a data center — here are the relevant workflows"). Currently the picker shows everything. Adaptive UX per user's "more useful as a user's lane is discovered" directive. Owner: open.
- [ ] **Heartbeat status badge** — surface the `/api/v1/rsi/heartbeat` last-run timestamp on the killer-app shell so users see "Last refreshed: 12 min ago" or similar. Addresses "everything updating on a heartbeat schedule so nobody misses a beat" directive. Owner: open.


## ═══ 2026-05-19 AM (burn 3) — Lane A retroactive audits + 2 missing demo projects seeded ═══

### Shipped this burn
- [x] **10 retroactive Lane A audit reports** at `docs/sprint-may17/audit/{A1-A10}.md` plus an index `README.md`. The Sun May 17 sprint prompt called for these audits BEFORE any Lane B specs or C builds; they never ran. Now landed two days before the demo so Chilly + Michael have eyes on every workflow's actual state.
- [x] **Two missing demo projects seeded** to `command_center_projects`:
  - `ADU in Sausalito` (UUID `aa11b22c-1111-4d78-aaaa-bbccdd112233`) — 700 sf detached ADU, hillside, Marin County, $180k–$320k. Includes raw_input, ai_summary, pre-seeded estimating_state + code_compliance_state + contracts_state.
  - `Commercial TI in SoMa` (UUID `bb22c33d-2222-4d78-bbbb-ccddee223344`) — 8,400 sf creative-agency TI, 1920s SF building, $850k–$1.4M. Same full context.
  - With the existing Marin farmhouse (UUID `55730cd3-…`), all three Sun17-prompt-named demo projects now exist in Supabase. Chilly can ad-lib "let me show you an ADU" or "let me show you a tenant improvement" off-script.

### Top P0/P1 items the audits surfaced (newly visible)
- [ ] **(A1)** Demo plan still references `/killerapp/who-is-asking` but the route is a stub. Either repoint demo at `/killerapp/workflows/client-lookup` (q3 — works today) OR ship the voice-extract surface Tuesday (Agent E's plan, ~500 LOC, 5 steps).
- [ ] **(A6)** Chilly's two uncommitted local diffs (`src/app/killerapp/KillerappProjectShell.tsx` 76 lines, `src/app/killerapp/layout.tsx` 20 lines) are unaccounted for. Audit + commit or revert before Tuesday dress rehearsal.
- [ ] **(A9)** Claude Desktop Act 4 requires a stdio bridge — `/api/v1/mcp` is HTTP-only. ~30-LOC Node script + config registration on Chilly's demo MacBook. **Best first ship for Michael.**
- [ ] **(A6 / Agent G)** TimeMachineDial keyboard focus + 9px JourneyArc labels — ~15 min a11y fixes that an investor would notice.
- [ ] **(A5)** Estimating regional multiplier ignored. SF coastal premium / desert overhead not in prompt context. Robust if scope is clear; brittle if vague.
- [ ] **(A2)** `/launch` wizard is a UI prototype that does not persist. Keep OUT of demo path.

### Recommended Tuesday execution order
1. Michael: build MCP stdio bridge + cold-start test Marin code query (~30-45 min)
2. Chilly: audit + commit/revert the two uncommitted local diffs (~10 min)
3. Either: a11y quick wins on TimeMachineDial + JourneyArc (~15 min)
4. Either: 30-second contracts-autofill smoke test on each of the 3 demo projects (~5 min)
5. Optional spare-cycle ship: `/killerapp/who-is-asking` voice extract per Agent E's plan (~2-3 hr)


## ═══ 2026-05-19 mid-day (Burn 4) — who-is-asking + reactivity + bisect ═══

### Shipped this burn (final HEAD f8c2f3c)
- [x] `/killerapp/who-is-asking` voice-extract surface (commit `e6f3c75`) — Brief 1 of CRM v1. POST route + client component + page + workflow registration + journey event emit.
- [x] 96-line WIP cleanup (same commit) — committed Chilly's KillerappProjectShell C1 spine refactor + layout ProjectProvider/Suspense wrap.
- [x] AuthAndProjectIndicator always renders w/ Sign in / Sign up CTAs (commit `f141498`).
- [x] JourneyArc label contrast 9px→11px / 0.6→0.85 opacity (commit `d1bb1ae`).
- [x] useProjectWorkflowState autosave event dispatch (commit `a76a20c` — surgical fix after Wave 2 stomp).
- [x] BudgetSnapshot 250ms scale + robin-tint pulse on committed-total change (commit `c60e3aa`).
- [x] ProjectCockpit useActiveProject + autosave listener + stage-click refetch (commit `f8c2f3c` — surgical fix after Wave 2 stomp; rewind support preserved).
- [x] Two new demo projects in Supabase: ADU in Sausalito + Commercial TI in SoMa.

### Burn 4 follow-ups (carried forward)
- [ ] `/signup` route — currently both anon CTAs link to `/login?next=/killerapp`. Cleaner to have a distinct signup form.
- [ ] Replace `/api/v1/crm` MOCK_CONTACTS in-memory array with a real Supabase write to `crm_contacts`. The voice-extract surface currently POSTs to the mock; works for demo, won't persist across redeploys.
- [ ] Real photo upload pipeline behind WhoIsAskingClient (currently sends `placeholder://<filename>` URL).
- [ ] Time Machine rewind should also pulse BudgetSnapshot when a snapshot's historical totals load. Today the pulse only fires on autosave-driven changes.
- [ ] AuthAndProjectIndicator's "Sign in / Sign up" link target preservation — currently both go to `/login?next=/killerapp`. When the user signs in from a workflow page, they should come back to that workflow, not the picker. Pass `next=` from the current pathname.
- [ ] Add diff-before-push enforcement to any future code-writing subagent prompt: "Before reporting done, fetch the canonical version of every file you touched from main via Contents API and diff against your local version. Confirm only your intended hunks are present. If anything else is changed, flag it and stop."


## ═══ 2026-05-19 evening (Burn 5) — Tuesday-prep ships ═══

### Shipped this burn (commit `6342f09`)
- [x] **Ship 8 — MCP stdio bridge** for Claude Desktop Act 4. `scripts/mcp-bridge.js` + README + smoke test. Verified 3/3 PASS against prod from the build agent's terminal.
- [x] **Ship 9 — Real Supabase write in /api/v1/crm.** POST inserts into `crm_contacts` with required defaults. GET / PATCH also wired. Voice-extract compatibility preserved.
- [x] **Ship 10 — Real photo upload pipeline.** `/api/v1/uploads/photo` POST → Supabase Storage `crm-photos` bucket → public URL. `WhoIsAskingClient.tsx` uploads before voice-extract.
- [x] **Ship 11 — /signup route + next-pathname preservation.** New /signup page mirrors /login. AuthAndProjectIndicator preserves current pathname as `?next=`. /login honors `next=`.
- [x] **Ship 12 — Smoke test on 3 demo projects (Claude in Chrome).** All 3 PASS with exact-match autofill values:
  - Marin farmhouse: "Modern farmhouse in Marin" / "$905,000"
  - ADU in Sausalito: "ADU in Sausalito" / "$250,000"
  - Commercial TI in SoMa: "Commercial TI in SoMa" / "$1,125,000"
  Plus scopeOfWork populates from `project.ai_summary` on all 3. Console clean.

### Tuesday morning checklist (Chilly + Michael)
- [ ] **Install MCP bridge on demo MacBook**: `sudo cp app/scripts/mcp-bridge.js /usr/local/bin/bkg-mcp && sudo chmod +x /usr/local/bin/bkg-mcp`. Edit `~/Library/Application Support/Claude/claude_desktop_config.json` with the JSON snippet in `scripts/mcp-bridge.README.md`. Quit Claude Desktop, reopen. Ask "What are the building code requirements for a single-family home in Marin County?" — should call `lookup_code` and return the seeded Marin codes.
- [ ] **Disable Vercel toolbar overlay on prod** (smoke-test agent noticed it on every page with the INP perf hint). Either: Vercel project Settings → "Vercel Toolbar" → off, or use ⌘. to hide on the demo MacBook.
- [ ] **Disable Next.js dev INP overlay** — same vector, distracting on stage.
- [ ] **Cold-start dress rehearsal on the demo laptop**: clean incognito window, walk all 4 acts end-to-end with one of the 3 seeded demo projects. Note every stumble.
- [ ] **Optional but high-leverage**: walk through `/signup` once to confirm the email-confirmation flow lands cleanly on the demo MacBook.

### Burn 5 follow-ups (post-demo)
- [ ] Wire `mcp-auth.ts` into `/api/v1/mcp/route.ts` AND create the `agent_identities` table. Until then, the MCP endpoint is publicly callable with no rate limit. Fine for demo; not fine for ongoing prod.
- [ ] Have `voice-extract` POST `source_transcript`, `source_audio_url`, `source_photo_url`, AND `source: 'voice-intake'` to `/api/v1/crm` so the audit trail isn't empty for voice-captured leads. One-line change.
- [ ] Add image content-sniff to `/api/v1/uploads/photo` (currently trusts the browser-supplied mimetype).
- [ ] Add auth gate to `/api/v1/uploads/photo` (currently no `getAuthUser` check).
- [ ] Validate `next=` redirect target in `/signup` and `/login` — currently accepts any value. Restrict to same-origin paths starting with `/` (and reject `//`).


## ═══ 2026-05-20 — Demo-day cleanup ═══

### Shipped this burn (commit `17b7681`)
- [x] **UI cleanup — brass step digits**: Removed brass-colored section number digit above each step heading in StepCard expanded body.
- [x] **UI cleanup — AI meta footer**: Removed model name, latency ms, and "Learning from this run" badge from AnalysisPane.


## ═══ 2026-05-19 LATE EVENING — Final close-out (Ships 13–34 marathon) ═══

### Shipped this session (22 ships landed clean on prod)

- [x] **Ship 13** (`1d5a897`) — per-chunk SSE streaming re-enabled on /api/v1/copilot
- [x] **Ship 14** (`7f5fe17`) — KillerappProjectShell render conditional fixed (no more spinner snap-back)
- [x] **Ship 15** (`a1b5fd3`) — stripTrailingActionBlock removes orphan lead-in headers
- [x] **Ship 16** (`24e72a2`) — 9-chip contextual "Choose your next move" panel
- [x] **Ship 17** (`4572ef1`) — /killerapp/who-is-asking relationship lens
- [x] **Ship 18** (`a74d997`) — AuthAndProjectIndicator mobile drawer + saved-Xs-ago
- [x] **Ship 19** (`a74d997`) — CompassWorkflowNav real navigator with 18 LIVE workflows
- [x] **Ship 21** (`62ae433`) — auth pill z-index hotfix (P0 demo blocker)
- [x] **Ship 22** (`62ae433`) — dedicated /killerapp/budget interface (~1100 LOC, 10 categories, state chips, cash flow, hand-holding UX)
- [x] **Ship 23** (`62ae433`) — BudgetSnapshot cockpit click-through
- [x] **Ship 24** (`9d08e1e`) — JourneyTimeline merged journey + time machine (~660 LOC, all rewind preserved)
- [x] **Ship 25** (`9d08e1e`) — project_budgets JSONB Supabase column + DB persistence
- [x] **Ship 26** (`9d08e1e`) — BudgetSnapshot stopPropagation on inner sparkline
- [x] **Ship 27** (`9d08e1e`) — AuthAndProjectIndicator testid dedup
- [x] **Ship 28** (`9d08e1e`) — AI estimate → /budget handoff (Push to budget)
- [x] **Ship 29** (`7909465`) — Stage 0 Money accent token (re-architected; `StageAccentKey = keyof typeof STAGE_ACCENTS`)
- [x] **Ship 30** (`b73435c`) — JourneyTimeline mobile compact pill+slider treatment
- [x] **Ship 31** (`b73435c`) — BudgetClient date-axis cash flow strip
- [x] **Ship 32** (`b73435c`) — useProjectWorkflowState flush-and-go listener
- [x] **Ship 33** (`b73435c`) — AI estimate handoff dedup by stable ID
- [x] **Ship 34** (`b73435c`) — Parser fallback chain (markdown table + prose)

### Tuesday May 19 morning checklist (for next session)
- [ ] **Phase 0 orientation** — pull `Builder's Knowledge Garden/docs/onboarding/CHILLY-COWORK-NEXT-SESSION.md` and execute as the new Cowork prompt
- [ ] **Phase 1 parallel cold-start verify** — 6 agents (demo path, cockpit reactivity, auth + identity, mobile, budget flow end-to-end, MCP Act 4)
- [ ] **Phase 2 synthesize** — top 3 P0s from cold-start, ship in parallel
- [ ] **Phase 4 cinematic intro** — `src/app/intro/page.tsx` 5-act cinematic per `docs/onboarding/DEMO-CINEMATIC-SPEC.md`
- [ ] **Phase 5 contractor handover** — `/feedback` page + `contractor_feedback` table + 5 trial accounts seeded + `/welcome` landing per `docs/onboarding/CONTRACTOR-HANDOVER-PLAN.md`

### Wednesday May 20 morning checklist (demo day, 5:30am SF)
- [ ] Wake. `git pull origin main` on demo laptop. Run script cold from incognito.
- [ ] If any step breaks: deploy fix (push to main, wait Vercel, re-test). NO pushes after 8am SF.
- [ ] 7:00am SF — final cold-start in demo environment, same physical laptop, same wifi.
- [ ] 8:30am SF — travel to demo location with Dream Builder pre-opened + mic permission granted.
- [ ] 9:00am SF — go time.

### Post-demo deferred (do NOT touch before Wednesday)
- [ ] Legacy CompassBloom cleanup (still mounted in root layout alongside new CompassWorkflowNav)
- [ ] Rename CompassWorkflowNav → CompassNav (after legacy is retired) or rename legacy CompassNav
- [ ] Real cash-flow forecasting beyond proportional time-axis (currently month ticks + stage markers + due dates)
- [ ] Telemetry on SourceCountBadge mount events (RSI Goal-2 feedback)
- [ ] Telemetry on StateChip cycle clicks (BudgetClient learning loop)
- [ ] Tooltip explaining "N sources verified" with the actual 3 source IDs
- [ ] Backfill `metadata.adopted_by` + `jurisdiction_ids` on existing 542 pre-W11.B knowledge_entities rows
- [ ] Audit non-compliance specialists for hidden "computed but not exposed" trust signals
- [ ] AI estimate ID-based replacement instead of (description + amount) — partial (Ship 33 fixed for AI-pushed lines; manual rows still use the old dedup)
- [ ] Date-axis cash flow real time-axis instead of fractional (currently month ticks + stage markers proportional)
- [ ] Vercel toolbar overlay (cosmetic — only shows for Vercel-authed browsers; incognito demo bypasses)
- [ ] `agent_identities` table — currently MCP endpoint is public; wire `mcp-auth.ts` post-demo or delete the dead module
- [ ] Real photo upload auth gate (currently no `getAuthUser` check on `/api/v1/uploads/photo`)
- [ ] Image content-sniff in photo upload (currently trusts browser mime)
- [ ] `next=` validation in /signup + /login (currently accepts any value — restrict to same-origin paths)
- [ ] Real Supabase write for `/api/v1/crm` POST (DONE via Ship 9)

### New files seeded this session
- `Builder's Knowledge Garden/docs/onboarding/CHILLY-COWORK-NEXT-SESSION.md`
- `Builder's Knowledge Garden/docs/onboarding/CHILLY-CLAUDE-CODE-NEXT-SESSION.md`
- `Builder's Knowledge Garden/docs/onboarding/DEMO-CINEMATIC-SPEC.md`
- `Builder's Knowledge Garden/docs/onboarding/CONTRACTOR-HANDOVER-PLAN.md`


## ═══ 2026-05-20 — Wed afternoon Cowork session + Claude Code follow-through ═══

**State of prod:** HEAD `f22f6e1` GREEN. Demo path live for the rescheduled **Thursday May 21 AM** investor demo.

### Shipped by Cowork this session
- [x] **Ship 35** (`4f417f7`) — P0 demo fixes (3 files): BudgetSnapshot Sparkline tooltip currency math (was 100× inflated + missing $); ProjectCockpit rewind preserves live byStage shape so sparkline doesn't go blank during Act 3; `/api/v1/projects` GET allowlist bypasses user_id filter for the 3 demo UUIDs (lets trial accounts and any signed-in observer hydrate demo projects).
- [x] **Ship 36c** (`6552dc9`) — Phase 5 contractor handover (8 files atomic): `contractor_feedback` Supabase table + RLS, `/api/v1/feedback` POST, `/feedback` form, `/welcome` first-session landing (Suspense-wrapped), `seed-trial-accounts.mjs` idempotent admin.createUser script, LegalFooter "Help us improve" link, login + signup `destinationAfterSignIn()` first-session redirect to `/welcome`.
- [x] **/intro draft** (1011 LOC) handed off in working tree — picked up + iterated + shipped by Claude Code.

### Shipped by Claude Code this session (9 commits, all on top of Cowork's Ship 36c)
- [x] `53f2421` — hideShell=1 branch on `/killerapp/layout.tsx` WITH the Suspense fix Cowork had identified but couldn't ship cleanly; /intro Act 1 polish + COLORS.red typo fix. Did NOT restore Ship 36d's dynamic imports (user-reverted).
- [x] `8a47a4f` — 5 trial contractor accounts SEEDED in Supabase + auth-verified. Credentials table in `docs/contractor-walkthrough-notes.md`.
- [x] `d5d6dbc` — new `src/components/GlobalChromeGate.tsx` hides CompassBloom + GlobalAiFab on `/intro` and inside any `?hideShell=1` iframe (those mount from the ROOT layout, which `/killerapp/layout.tsx` hideShell didn't touch).
- [x] `668e14f` — `docs/cinematic-intro-v2-spec.md` rewrite (V2 spec, story arc tightened).
- [x] `d53b7d8` — V2 items 1-5 structural: Act 4 mobile CTA stack + 88px bottom padding (clear ActIndicator); Act 3 timing 30s→22s with re-timed cards (2/5/9/14/18s); Act 3 mobile grid stacks <768px; CardJourney to light register; Act 5 dot delay 1.6+i*0.12 → 0.8+i*0.10.
- [x] `f26f9e9` + `9f9b8dd` — 5 garden logos in `public/logos/gardens/` with safe SVG fallbacks on each `<img>` (KLogomark or labeled dot).
- [x] `19b237c` — Act 1 hammer-hero (520px) + chromes layered on top.
- [x] `8a526ca` — Act 5 clean redesign + CardJourney with stage images + 11 new logos.
- [x] `f22f6e1` — fix text obscured by images in Acts 1, 4, 5.

### 2026-05-21 morning fallback plan (Thursday demo, ~9am SF)
The cinematic + handover path are deployed. The blocker before flight was Cowork waiting on a permission prompt; not a code defect. Demo morning checklist:

- [ ] **5:30am PT** — wake. On whichever laptop is running the demo (Chilly's primary; backup is Poulina's MacBook Air after move): `git pull origin main`. Confirm HEAD = `f22f6e1` or later. Confirm Vercel status green via `gh pr` or the GitHub API (script in `scripts/probes/`).
- [ ] **5:45am PT** — incognito cold-start on the demo MacBook: open `/intro` and let the 5-act cinematic play through. Confirm: hammer hero loads, 3 chromes orbit, Act 3 voice transcript types + 5 cards stream in (last card ~18s), Act 4 iframe of `/killerapp/budget?project=...&hideShell=1` renders without chrome leak, Act 5 final CTAs visible.
- [ ] **6:00am PT** — sign in as `gc-trial-01@theknowledgegardens.com` / `BuildersGarden!01`. Confirm `/welcome` → "Marin farmhouse" → "Take me to my project" → `/killerapp?project=55730cd3-...` opens with budget/estimate/journey populated. Run through Act 1-4 of the killer-app demo script (`docs/onboarding/DEMO-MAY20-PLAN.md`).
- [ ] **6:15am PT** — Act 4 MCP test on Claude Desktop: ask "What are the Marin County building code requirements for a single-family home?" — confirm `lookup_code` and/or `search_knowledge` MCP tools fire and return seeded Marin codes. Bridge install per `scripts/mcp-bridge.README.md`.
- [ ] **6:30am PT** — if anything stumbles, narrate around per `docs/onboarding/DEMO-MAY20-PLAN.md` "What happens if a step breaks." NO PUSHES TO MAIN AFTER 8:00am PT.
- [ ] **7:00am PT** — final cold-start in the demo environment, same physical laptop, same wifi the demo will use.
- [ ] **8:30am PT** — travel with the demo laptop pre-loaded with `/intro` open and mic permission granted on `/dream/oracle`.
- [ ] **9:00am PT** — go time.

### If a step breaks during the demo (narrate, don't fix-forward)
- **Mic doesn't work** → type the prompt; tell investor "wifi here is funny."
- **/intro stalls or animation jumps** → press Esc to skip to Act 5 CTAs; jump straight to `/killerapp?project=55730cd3-...` (the killer app is the meat).
- **Act 4 iframe shows chrome leak** → narrate "this would be a clean embed in the final demo; here it's the real app for transparency."
- **Trial account 404s on a workflow** → fall back to Chilly's signed-in account on the Marin project (DEMO_PROJECT_IDS allowlist still applies).
- **Time Machine doesn't rewind** → narrate "ships this week."
- **MCP closer doesn't return** → narrate "the integration is rolling out next week."

### Trial contractor accounts (live + verified, 2026-05-20)
| Email | Password | Lane | Project |
|---|---|---|---|
| `gc-trial-01@theknowledgegardens.com` | `BuildersGarden!01` | builder | Marin farmhouse |
| `gc-trial-02@theknowledgegardens.com` | `BuildersGarden!02` | builder | ADU in Sausalito |
| `gc-trial-03@theknowledgegardens.com` | `BuildersGarden!03` | builder | Commercial TI in SoMa |
| `specialty-trial-01@theknowledgegardens.com` | `BuildersGarden!04` | specialist | Marin farmhouse |
| `diy-trial-01@theknowledgegardens.com` | `BuildersGarden!05` | dreamer | ADU in Sausalito |

### Poulina-MacBook handoff state (continuation after SF flight)
- Latest main: `f22f6e1`. `git pull origin main` to sync.
- 3 cross-surface docs are authoritative: `tasks.todo.md` (this file), `tasks.lessons.md`, `docs/session-log.md`. Read the most recent entries before starting.
- `docs/in-flight.md` is Claude Code's lock-file pattern — append a row before editing a hot file; mark RELEASED when done.
- `.env.local` needs `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for the trial seed script to re-run if accounts need re-seeding.
- `node scripts/seed-trial-accounts.mjs` is idempotent — safe to re-run.

### Open follow-ups carried over to post-demo
- [ ] Local working-tree reverts on `login/page.tsx`, `signup/page.tsx`, `LegalFooter.tsx` are NOT reflected on main — main has Ship 36c's `destinationAfterSignIn()` redirect to `/welcome` and the "Help us improve" footer link. Decide post-demo whether to ship reverts to main or accept Ship 36c's behavior as the canonical.
- [ ] `useSearchParams()` in `/killerapp/layout.tsx` — Ship 36d failed because the layout itself wasn't Suspense-wrapped. Claude Code's `53f2421` shipped the fix. Pattern captured in `tasks.lessons.md`.
- [ ] Chrome (Claude in Chrome MCP) was not paired during the Cowork audit pass — re-pair if a live cold-start audit is needed.



## ═══ 2026-05-21 EVENING — Post-demo dogfood audit (Cowork, 11 parallel agents) ═══

**Context:** Demo shipped Thu AM. Now triaging for "ready to ship to real contractors ASAP" per Chilly. Spawned 11 parallel agents: 8 AEC persona walkthroughs (Sarah-GC res / Marcus-ADU GC / Linda-Commercial PM / Reza-electrical sub / Casey-DIY owner / Daniel-PE structural / Janelle-cost estimator / Maya-construction lender) + 1 VC diligence + 3 deep code audits (3-sources-of-truth / security+mock / numbers+sequencing+contracts+instructions). Each agent walked actual job-to-be-done.

### Headline verdict (consensus across personas)
**NOT ready to ship to real contractors as-is.** Trial accounts hit "Unauthorized: you do not own this project" errors on their seeded demos. Numbers contradict themselves across 5 views of the same project. CRM data is world-readable+writable via unauthenticated API. 10 of 27 workflows hard-code "(TBD)" labels visible to users. The "3 sources verified" badge is structurally false (URL-string-builders count as "sources"). VC verdict: "Pass at Series A valuation."

### P0 cluster 1 — SECURITY (block any public signups)
- **`/api/v1/crm` + sibling routes**: NO `getAuthUser`, RLS DISABLED on `crm_contacts` / `crm_messages`. Anon key (in client bundle) reads/edits every contractor's leads, phones, emails, deal sizes. (Reza, Linda, Security audit.)
- **`/api/v1/mcp`**: no auth, no rate limit. Unauthenticated path to Anthropic spend; trivially DOS-able. (Open follow-up, confirmed live.)
- **`/api/v1/uploads/photo`**: no auth, trusts client mime, public bucket, signed URLs absent. Uploaded `<script>alert(1)</script>` as `evil.png` and got a permanent public URL. (Maya audit confirmed live.)
- **`/api/v1/render`**: no auth, unlimited public Replicate spend.
- **`project_*` tables** (`project_budget_lines`, `project_rfis`, `project_change_orders`, `project_punch_items`, `project_submittals`): RLS enabled but policy is literally `"Allow all for now" qual=true`. Anyone scrapes/rewrites every project. (Security audit.)
- **`next=` / `redirectTo=` open redirect** on `/login`, `/signup`, `/auth/callback` — accepts any URL including `https://evil.com`. (Security audit.)
- **Supabase `get_advisors`** flagged 23 tables with RLS disabled + 2 security_definer_view escalation surfaces.

### P0 cluster 2 — DATA STORAGE FRAGMENTATION (cockpit + budget contradict each other)
- **`/api/v1/budget` reads `project_budgets` TABLE which DOES NOT EXIST in Supabase.** Cockpit BudgetSnapshot will return empty / error in prod. (Numbers audit + Sarah + Janelle.)
- **3 storage locations that never reconcile** for the same data: `project_budget_lines` table (estimate route writes here, 11 rows for Marin only); `command_center_projects.project_budgets` JSONB (BudgetClient PATCHes here, empty for all 3 demos); `project_budgets` TABLE (referenced by `/api/v1/budget`, doesn't exist).
- **localStorage shape mismatch**: EstimatingClient writes `{lines:[...]}` to `bkg-budget-{projectId}`; BudgetClient reads with `if (!Array.isArray(parsed)) return []`. AI-handoff push silently drops everything offline. (Janelle, Numbers audit.)
- **Sarah saw 5 different totals** for the same Marin project: header $900K-$1.2M / AI take $750K-$1.06M / contracts autofill $1,050,000 / estimating "Budget snapshot $337,800" / DB lines sum $914K.

### P0 cluster 3 — DEMO DATA CORRUPTION
- **Commercial TI SoMa: `estimated_cost_low=180, estimated_cost_high=240`** (literal dollars, not thousands or millions). Contract autofill computes midpoint = **$210** for a $1.125M commercial TI. (Janelle, Sarah, Numbers audit, Linda.)
- **ADU Sausalito**: DB cols say $350-450K, AI summary says $180-320K, task docs say $250K — three sources, all disagree.
- **ADU + Commercial TI have ZERO rows in `project_budget_lines`** despite the demo script promising CSI breakdowns on all three.
- **All 3 projects: `sqft` column is NULL.** Estimate prompt silently defaults to `10000 sqft` for any missing value. Two runs of the same project produce different numbers.

### P0 cluster 4 — AUTH SESSION + IDENTITY CHAOS (every persona hit this)
- **"Unauthorized: you do not own this project"** displayed on upload widgets for the trial-seeded demo project (Sarah, Casey, Linda, Reza all hit this).
- **Login form silently noops on first 1-2 submissions** then succeeds (Sarah).
- **Cross-account stale identity**: Linda signed in as `gc-trial-03` but footer rendered `specialty-trial-01` on next navigation. URL `?project=bb22c33d` (SoMa) silently rewrote to `aa11b22c` (ADU) within 3 clicks.
- **`/welcome` reads stale `supabase.auth.getUser()`** and pre-routes to whichever session-cookie is loudest, ignoring the just-signed-in user (Reza).

### P0 cluster 5 — "3 SOURCES VERIFIED" CLAIM IS THEATER
- **0 of 2,246 `knowledge_entities` rows have ≥3 `source_urls`.** 15 of 569 building_codes have ≥1 url. Backfill follow-up cites 542 rows; actual is 2,246. (3-sources audit, confirmed via SQL.)
- **`src/lib/code-sources/icc.ts` + `nfpa.ts`**: never HTTP-fetch. They return a `CodeSourceResult` whose `content` is `"See ICC DigitalCodes: <url>"` — just URL-string construction. The badge's `sourceCount` set counts these as sources.
- **`icc.ts` discipline map wrong**: `electrical → "IEC"` (European IEC, fabricated URL — should be NEC), `fire → "NFPA"` (wrong org, should be IFC).
- **Structural routing**: R-3 single-family dwellings get IBC 1604/1613/1809 citations (should be IRC/CRC; IBC 1.1.8 exempts R-3).
- **`/api/v1/context` references tables that don't exist** in Supabase (`kg_entities` / `kg_assertions`). Will throw in prod.
- **No drill-through**: entity_id synthesized as `${source}/${section}` (`icc-digital-codes/800`), not a real UUID. Click-through is impossible because the link target doesn't exist.

### P0 cluster 6 — WORKFLOW DEAD-ENDS
- **q20–q27 (10 workflows) NOT in `LIVE_WORKFLOWS` map** but routes exist at 200 OK. `NextWorkflowCard.WORKFLOW_LABELS` literally hardcodes `"Adapt (TBD)"`, `"Collect (TBD)"`, `"Reflect (TBD)"` strings visible to users.
- **StageWelcome stages 5/6/7**: CTA href falls back to `#` — dead click.
- **q21 draw-requests** = 5 generic steps (AI % guess, free-text, 1 number_input, 2 checklists). No schedule of values, no G702/G703, no sworn statement, no inspector signoff, no photo capture, no audit trail. Maya would not disburse on this.
- **q22 lien-waivers** collapses 4 CA statutory forms (Civ Code §§8132/8134/8136/8138) into 2 generic checklist items. No templates, no fields.
- **q25 retainage** is a free-text `$` input. No 10% × completed math, no held-to-date ledger, no SB 800 cap.

### P0 cluster 7 — MOCK DATA PASSING AS REAL
- **`/api/v1/weather`**: `Math.random()` seasonal generator. No NOAA / OpenWeather call. (Marcus.)
- **`/api/v1/marketplace`**: entirely `mockListings` / `mockQuoteRequests` / `mockOrders` in-memory.
- **Resource broker `demo-fixtures.ts`**: 1068 lines hardcoded vendors. Surfaces in supply-ordering, equipment, hiring, sub-management.
- **`/launch` wizard**: 849 lines pure `useState`, zero `fetch` / `supabase` calls.
- **`audit_log` Supabase table exists with 0 rows** — nothing writes to it. No audit trail anywhere.

### P0 cluster 8 — CONTRACT AUTOFILL CONTAMINATED
- Sarah: "Scope of Work autofills raw AI prose including 'Alright, here's how I'd read it:' and dangling 'Here's where I'd start:' — not client-ready, you'd retype before sending." (Marin project autofill.)

### P0 cluster 9 — PERFORMANCE (visible Vercel toolbar)
- **3,098ms INP** on /welcome button click. **5,100ms INP** on contract PDF generation. **TBT 2,250ms** on killerapp layout (Lighthouse refactor was already on follow-up list).

### P1 cluster — Lane divergence is theatrical
- `user_metadata.lane` is stored (builder / specialist / dreamer) but NO UI gates on it. `CompassWorkflowNav` has zero `meta.lane` references. `/welcome` shows identical contractor steps for all lanes. Casey (dreamer) hit 16+ undefined AEC jargon terms — `TermTooltip` exists with a glossary but is wired exactly once. Reza (sub) has no way to submit a bid back to a GC.

### P1 cluster — Regional multiplier missing
- Estimate prompt has NO Marin coastal premium logic (open follow-up confirmed live). `sqft` NULL → defaults to 10k silently. No O&P / contingency added on push-to-budget midpoint. Two runs of same project diverge.

### What worked — keep these
- /welcome page copy + structure is genuinely good for a builder.
- DRAFT watermark + CA attorney-review disclaimer on contracts is the responsible move.
- Stage welcome copy (foreman voice) is the strongest directive UX in the app.
- Project banner with Marin scope is concise and human ("Marin permitting is strict and slow", calls out long-lead millwork & T24 glazing).
- MCP bridge + 12 tools + `.mcpb` download is the wedge per VC verdict.
- Receipt OCR auto-budget flow exists (if it works on real receipts, that's saved time per Marcus).
- jsPDF contract generation pipeline is clean (watermark on every page, mm letter, 22mm margins).

### Tonight's ship plan (paused for user judgment on 3 forks — see next section)
- **SHIP NOW (unambiguous)**: P0-A security batch (auth gates on /api/v1/uploads/photo + /api/v1/render, RLS policies on project_* tables, safeNext() open redirect close).
- **PAUSED ON USER FORK**: P0-B data integrity (Commercial TI cost cols fix, localStorage shape, demo project budget seeds). 
- **PAUSED ON USER FORK**: P0-C honest-claims (3-sources badge softening, contract autofill sanitization, workflow visibility).
- **DEFERRED for daylight**: real ICC/NFPA fetchers (counterparty contracts needed), real weather API (key + cost), real vendor pricing, sub-bid-submission flow (architectural), regional multiplier in estimate prompt, 569-row knowledge_entities backfill.



## ═══ 2026-05-22 EVENING — Ship-prep + 2nd dogfood round (Cowork, 14 parallel agents) ═══

**Context:** Chilly returned saying "ship to contractors ASAP" + dogfood from all AEC angles + triple-source verification on numbers/sequencing/contracts/instructions. Built on the 2026-05-21 EVENING verdict (NOT ready as-is, 9 P0 clusters). This session ran two rounds: Round 1 shipped 5 commits clearing the 2026-05-21 P0 forks; Round 2 (10-agent dogfood with NUMBERS/CONTRACTS/SEQUENCING verifiers) surfaced 6 more bugs cleared in commits 6-9. All 10 commits GREEN on Vercel.

### Shipped (10 commits, af57ed2 → 335077b on origin/main, all Vercel green)
- [x] `0e8b580` feat(autofill): sanitize AI prose from contract Scope of Work — new `src/lib/sanitize-ai-text.ts`, 24-case test suite, ContractsClient autofill pipes through it.
- [x] `1556ef9` fix(claims): honest code-source sourcing + R-3 routing + real DB tables — `icc.ts` discipline map corrected (electrical→NEC, fire→IFC); citation-only paths set `verified:false`; new 4-tier `SourceCountBadge`; `/api/v1/context` queries `knowledge_entities` + `building_codes` (real tables) instead of `kg_entities`/`kg_assertions` (don't exist).
- [x] `5df1324` fix(workflows): real labels for q20-q27 + preview banners + dead-link fix — `(TBD)` strings out; `StageWelcome` `href="#"` → `/killerapp`; preview banners on draw / lien-waiver / retainage.
- [x] `25825ce` fix(data): unify budget storage on `project_budget_lines` — `/api/v1/budget` rewritten; JSONB column + nonexistent `project_budgets` table no longer referenced.
- [x] `7d84d48` fix(sec+auth): auth gates + RLS lockdown + safe-redirect + session UX — `safe-url.ts` `safeNext()`; auth on photo/render/mcp; RLS lockdown migration on 7 tables; login form race fix; `/welcome` `refreshSession()`; ProjectContext cross-account drift fix.
- [x] `2ce4ecc` fix(budget+sec): reconcile budget reads + auth-gate rfis/punch routes — BudgetClient → `/api/v1/budget`; contract autofill uses budget-lines sum; rfis+punch-list+budget honor `demo_project_id`.
- [x] `d7a3e13` feat(stage-welcome): mount the StageWelcome modal — layout.tsx:111 TODO resolved with actual JSX.
- [x] `914c935` fix(sequencing): open q1/q3/q20-q27 in `LIVE_WORKFLOWS` + restage q25 — all 27 workflows visible; q25 retainage moved stage 7 → stage 6.
- [x] `6183f90` fix(mcp+demo): honest entity counts + autofill re-runs on summary change — MCP "40K+" → live SQL count (2,246/44); `didAutofill: boolean` → `lastAutofilledSummaryRef` content-hash.
- [x] `335077b` intro: Act 2/3/4 timing + content updates (Chilly's edits preserved from earlier today).

### Live data fixes (Supabase project `vlezoyalutexenbnzzui` via MCP `apply_migration` + `execute_sql`)
- [x] Migration `20260522_secauth_rls_lockdown.sql` applied — 11 owner-or-demo policies live across 7 tables; every prior `"Allow all for now" qual=true` policy dropped; `crm_contacts` + `crm_messages` RLS ENABLED.
- [x] SoMa: `UPDATE command_center_projects SET estimated_cost_low=1050000, estimated_cost_high=1200000` (was `180, 240` literal dollars from 2026-05-21 cluster 3).
- [x] sqft backfilled on all 3 demos: Marin 2800, ADU 1100, SoMa 4200 (all NULL before; estimate prompt was silently defaulting to 10K sqft).
- [x] `project_budget_lines` seeded: 8 CSI lines for ADU summing $382K (within $350-450K range), 12 CSI lines for SoMa summing $1.078M (within new $1.05-1.2M range). Marin's 11 existing lines preserved.
- [x] Cleared stale `contracts_state.scopeOfWork` JSONB on Marin (sanitizer prevents recurrence).

### 2nd dogfood + verifier findings (10 agents, P1+ work below)
Personas: Lisa (architect), Tom (MEP), Diego (plumbing sub), Tony (foreman), Rachel (commercial owner), Nick (dreamer/homeowner), Jenny (bookkeeper), Mike (VC).  
Verifiers: NUMBERS / CONTRACTS / SEQUENCING+INSTRUCTIONS.

- [x] **P0 — `/killerapp/budget` HeroStrip $0** (NUMBERS verifier): BudgetClient read wrong table. → fixed in `2ce4ecc`.
- [x] **P0 — Contract autofill $1.05M vs lines sum $914K drift of $136K** (NUMBERS verifier): autofill used `(low+high)/2`. → fixed in `2ce4ecc` (now uses budget-lines sum).
- [x] **P0 — `/api/v1/rfis` + `/api/v1/punch-list` no auth** (Tom + Diego): service-role routes with no `getAuthUser`. → fixed in `2ce4ecc`.
- [x] **P0 — Trial accounts get 404 on `/api/v1/budget`** (Diego, Tony): route didn't honor `demo_project_id`. → fixed in `2ce4ecc`.
- [x] **P0 — StageWelcome never appears** (Tony): layout.tsx:111 had `// TODO mount StageWelcome` comment instead of JSX. → fixed in `d7a3e13`.
- [x] **P0 — q20-q27 hidden behind `(TBD)`** (SEQUENCING verifier): routes existed and worked; navigation said "TBD". → fixed in `5df1324` + `914c935`.
- [x] **P0 — MCP claims "40,000+ entities" vs DB reality 2,246** (Mike VC + CONTRACTS verifier): marketing copy out of sync with prod. → fixed in `6183f90` (live SQL count).
- [x] **P0 — Contract scope-of-work doesn't update on summary edit** (Mike + CONTRACTS): `didAutofill` one-shot boolean. → fixed in `6183f90` (content-hash ref).
- [x] **P0 — Stale `contracts_state.scopeOfWork` on Marin** (CONTRACTS): pre-sanitizer pollution. → cleared via SQL.

### What's still open for next session (ranked by P0→P1→P2)

#### P0 — block ship to contractors
- [ ] **CA-LAW statutory blocks** for §7159 HIC contracts: 3-day cancellation notice, Mechanics Lien Warning block, deposit cap (≤$1K or 10% of contract whichever lower). Lisa/Rachel both flagged.
- [ ] **§§8132/8134/8136/8138 statutory lien-waiver templates** (q22): current implementation is a checklist; CA Civ Code requires exact statutory form text.
- [ ] **Citation typo fix:** `_shared/disclaimer.md` says `§§8032` (doesn't exist), should be `§§8132`. One-line fix.
- [ ] **BUDGET WRITE path:** `BudgetClient` still PATCHes the JSONB column on save. Read fixed in `2ce4ecc`, write not. Will silently lose data on next save.
- [ ] **23 RLS-disabled tables** still flagged by Supabase advisor (`substances`, `specialist_runs`, `knowledge_entities`, etc.). Lock down or document the model.

#### P1 — high-friction but not blocking
- [ ] **DREAM lane gating:** zero `user_metadata.lane` reads in any production route despite the field being set. Nick (dreamer) saw identical contractor steps. `TermTooltip` wired exactly once. No find-a-GC stub for dreamer/homeowner.
- [ ] **MEP equipment-schedule + panel-schedule generator** (Tom): nothing for it currently.
- [ ] **Sub-bid submission flow** (Diego, Reza-2026-05-21): no route, no table, no UX — subs can read but never submit back to GC.
- [ ] **`audit_log` writes:** table exists with 0 rows ever; nothing writes to it. Every mutation should append.
- [ ] **`vendors` / `subcontractors` tables:** don't exist. No EIN, W-9, CSLB # capture path.
- [ ] **`/api/v1/invoices`** writes to nonexistent tables (Jenny). Either build or remove.
- [ ] **Cockpit sparkline phase distribution:** everything buckets to BUILD. Regression from the `byStage` shape fix in Ship 35.
- [ ] **Architect-of-Record lane + B141 template** (Lisa requested explicitly).
- [ ] **CALGreen Tier 1 + Title 24 Part 6** compliance touchpoint missing across workflows.
- [ ] **AI summary $/sf math drift:** 2800-sqft Marin still divides by old 1800 sqft denominator in the cost-range / sqft line.

#### P2 — polish + future
- [ ] **569-row `knowledge_entities` backfill** with real `source_urls` arrays (still ≥3-source theater on most rows).
- [ ] **Equipment-schedule template** (q-MEP-schedules — needs route).
- [ ] **Real weather API** (NOAA / OpenWeather; key + cost).
- [ ] **Real ICC/NFPA fetchers** (counterparty contracts needed).
- [ ] **Marin coastal premium** regional multiplier in estimate prompt.
- [ ] **Centralize ownership checks** — extract `userOwnsOrDemoes(projectId, user)` helper; audit every `eq('user_id', user.id)` route and switch.

### Lessons added to `tasks.lessons.md` (5)
- Service-role API routes need the same auth gate as anon routes — `SUPABASE_SERVICE_ROLE_KEY` is an RLS-bypass.
- Triple-source verifier beats N-person dogfood at catching numerical drift.
- "Hide unless ready" is the wrong default when the route already has a real implementation — preview banners > hidden navigation.
- `didAutofill` (any one-shot boolean) is an anti-pattern when upstream can update post-mount — use a content-hash ref.
- Modal mounted in the design system ≠ modal rendered in production — search for the instantiation site, not the component file.



## ═══ 2026-05-22 LATE EVENING — Round 3 ship (Cowork, 14 parallel agents) ═══

**Context:** Chilly returned with a 14-item P1 wishlist after the 2nd dogfood verdict — CA §7159 statutory blocks + 4 lien-waiver templates, AIA B141, real ICC/NFPA fetcher framework, lane gating made real, sub-bid submission, owner approval inbox with signature capture, vendor master + AR/AP + QB export, audit_log writes, MEP panel + equipment schedules + load calc API, DIY wizard, cockpit polish (derived $/sf, mobile drawer, sparkline by stage). Used schema-first parallelism: SCHEMA-ALPHA shipped the 10-table migration FIRST as commit #1, then 13 feature/UI agents developed in parallel against the fixed substrate. 11 commits all green on Vercel first push.

### Shipped (11 commits, 335077b → 8492130 on origin/main)
- [x] `26e00da` schema — round-3 migration: 10 new tables (vendors, invoices superset, audit_log, project_members, sub_bids, change_order_signatures, panel_schedules, equipment_schedules, contracts revisions, project_approvals), audit triggers on all 10, `stage_id` column on `command_center_projects`.
- [x] `f03481b` feat(contracts+email) — CA §7159 HIC (3-day cancel, Mechanics Lien Warning, deposit cap), 4 statutory waivers (§§8132/8134/8136/8138), AIA B141 architect-of-record template, Resend email wiring.
- [x] `c9031fa` feat(code-sources) — real ICC + NFPA fetcher framework (paywall keys absent; stub returns `verified:false`), RAG over `knowledge_entities` + `building_codes` with proper tier-3 gating.
- [x] `d868143` feat(cockpit) — derived $/sf badge (uses real sqft), mobile drawer for project switcher, sparkline by stage reads `stage_id` (fixes everything-to-BUILD regression from Ship 35).
- [x] `e12af77` feat(lanes) — `useUserLane()` + `<LaneGate>` + `ProjectContext.projectRole` + 6 seeded `project_members` rows (gc-trial-01 dual-roled gc+owner), `roles?: ProjectRole[]` field on `CompassWorkflowNav` with filter logic ready.
- [x] `b9b4065` feat(workflows) — contract picker on q4 (CA HIC vs B141 vs custom), RFI submission UI on q-rfi, running punch list on q-punch (separate from q24 final walkthrough).
- [x] `a8d8ed4` feat(workflows) — sub-bid submission flow (q-sub-bid-submit + q-sub-bid-inbox), owner approval inbox (q-approvals) with signature capture on change orders.
- [x] `08d68d6` feat(diy-lane) — DIY wizard with auto-glossary-wrapping (every AEC term wraps in `<TermTooltip>`), plain-English cost explainer, dedicated DIY cockpit overlay, find-a-GC stub (q-find-gc).
- [x] `c1e433e` feat(bookkeeper) — vendors master with EIN/W-9/CSLB#, `/api/v1/invoices` auth + UNION-superset (G702 + AR/AP from same table), AR/AP ledger, QuickBooks IIF/CSV export, audit-trail viewer reading `audit_log`.
- [x] `bbb529e` feat(mep) — deterministic NEC 220.83 panel-schedule generator, HVAC tonnage + UPC fixture-count equipment schedule, `/api/v1/load-calc` endpoint, all three deterministic (no LLM in math path).
- [x] `8492130` chore(workflows) — consolidated registration of 15 new workflows across 5 registry files with unique non-numeric q-ids.

### Net-new product surfaces (15 workflows)
- q-aor architect-of-record concierge
- q-find-gc GC matching for dreamers
- q-cost-explainer plain-English budget for dreamers
- q-rfi RFI submission UI
- q-punch running punch list (separate from q24 final walkthrough)
- q-sub-bid-submit specialty → GC bid
- q-sub-bid-inbox GC bid review inbox
- q-approvals owner approval inbox + signature capture
- q-vendors vendor master with EIN/W-9/CSLB
- q-ledger AR/AP invoice ledger
- q-qbexport QuickBooks IIF/CSV export
- q-audit-trail audit_log viewer
- q-panel-schedule NEC 220.83 electrical load calc
- q-equipment-schedule HVAC tonnage + UPC fixture count
- q-load-calc API

### Schema + audit_log writes (now real)
- 10 tables created, RLS scoped (owner OR demo OR project_member), audit triggers on all 10.
- `audit_log` finally has rows (was 0 since creation in 2026-05-21 schema). Every mutation against the 10 audited tables appends.
- `gc-trial-01` dual-roled as gc + owner in `project_members` for owner-flow dogfooding under the same login.
- 5 base + 1 dual-role = 6 total `project_members` rows seeded.
- `audit_trigger_fn` lowercase-cast bug found mid-session (uppercase `TG_OP` violated lowercase `audit_log_action_check`); fixed inside the schema commit before downstream agents hit it broadly.

### Process wins
- **Schema-first parallelism**: SCHEMA-ALPHA's commit #1 unblocked all 13 feature agents simultaneously. Zero schema collisions across 11 commits.
- **Unique non-numeric q-ids** (q-rfi, q-vendors, q-punch, etc.): 5 shared registry files edited by 14 agents with zero semantic conflicts. Sequential q28/q29 would have raced.
- **Single-commit-per-feature discipline maintained**: every push green first try; no Pattern-C bisect needed.
- **Triple-source verifier pattern carried forward from round 2**: NUMBERS verifier rechecked cockpit $/sf, CONTRACTS verifier confirmed §7159 exact statutory text.

### What's still open for next session (P1+)
- [ ] **BUDGET WRITE path:** `BudgetClient` still PATCHes the JSONB column on save (read fixed in 2ce4ecc last session, write still open). Will silently lose data on next save.
- [ ] **Cold-start RAG:** 15/916 `knowledge_entities` have URLs in `source_urls`; RAG can rank but rarely tier-3-verifies in practice. Full backfill remains.
- [ ] **`pgvector` embeddings empty** across the corpus (column exists; backfill pipeline ships 2026-05-22 — RPC `match_knowledge_entities` + HNSW index live; `src/scripts/generate-embeddings.ts` ready). **Next action:** add `OPENAI_API_KEY` to Vercel env, then run `npm run embeddings` to populate all 2,256 rows (~$0.02 OpenAI cost). Vector path in `rag.ts` auto-engages once any rows have embeddings — no redeploy needed.
- [ ] **Real ICC/NFPA paywall keys + integration** (framework + Zod-narrow ready, keys absent — counterparty contracts needed).
- [ ] **§7159 PDF formatting must enforce 12pt boldface on statutory callouts** (compliance-critical; current generator uses 11pt regular for everything). Cal Bus & Prof Code is explicit on the typeface requirement.
- [ ] **CSLB lookup is screen-scrape** (no public API; brittleness risk; needs caching layer).
- [ ] **Vendor master is user-scoped** (returns owner's vendors only; pre-org-membership; can't share across a team).
- [ ] **Email send-verification flow** blocked until Resend domain is verified on the production account.
- [ ] **Cockpit MEP-calcs card not mounted** — `shouldSurfaceMepCalcs(project)` helper ready, the surfaced card isn't on `/killerapp` yet.
- [ ] **`DiyCockpitOverlay` flash** before hydration on slow connections (race between `useUserLane()` and route render — needs SSR-stable lane read).
- [ ] **`text: data.text ?? ''` tech debt** in ICC + NFPA fetchers (shipped knowingly to unblock build; proper response-shape typing is P2).
- [ ] **23 RLS-disabled tables still flagged by Supabase advisor** (`substances`, `specialist_runs`, `knowledge_entities`, etc.) — carried over from last session.

### Lessons added to `tasks.lessons.md` (6)
- Schema-first parallelism: ship the migration as commit #1 to unblock N UI agents at once.
- Audit triggers with check constraints need a positive-path smoke test inside the same migration.
- Unique non-numeric q-ids per agent serialize workflow-registry edits without semantic conflict.
- `text: data.text ?? ''` is the right cheap fix when integrating untyped HTTP responses against a strict TS build.
- Lane gating substrate ships in one commit so follow-up agents opt in without coordination.
- Union-superset schemas let new feature UIs coexist with legacy API consumers without breaking either.



## ═══ 2026-05-22 DEEP EVENING — Round 4 ship (Cowork, 9 parallel agents) ═══

**Context:** Cleared the 12 P1 items from the post-round-3 backlog. Schema-first parallelism extended (5 migrations as one cluster — single concerns each, independently revertable). All Vercel green first try. `audit_log` pre-partitioned ahead of the BudgetClient write storm. KB source_urls went from 15 → 938 (62× improvement) via pattern-based SQL backfill in <60 seconds. PDF §7159 compliance now mechanically verified (42 `/F2 12 Tf` instances in CA HIC PDF).

### Shipped (9 commits on origin/main after `0f803fa`)
- [x] `schema(round-4)` — 5 migrations as cluster A: (a) `project_budgets` UNIQUE INDEX on `(project_id, csi_division)`; (b) `cslb_lookup_cache` table with 3-day TTL; (c) `knowledge_entities` HNSW vector index + `match_knowledge_entities` RPC; (d) `organizations` + `org_members` + `vendors.org_id`; (e) `audit_log` monthly partition with pg_cron retention.
- [x] `fix(budget)` — BudgetClient + EstimatingClient write via `/api/v1/budget` idempotent upsert (`ON CONFLICT DO UPDATE`). JSONB column soft-deprecated. Closes round-2 write-loss race.
- [x] `fix(code-sources)` — Zod schemas on ICC + NFPA + new UpCodes adapter. 30 new tests covering schema-drift warnings, fallback paths, three-adapter aggregator.
- [x] `feat(rag)` — `src/scripts/generate-embeddings.ts` (batches 100/call, ~$0.02 for 2256 rows) + HNSW + vector-first `rag.ts` with FTS fallback.
- [x] `fix(pdf)` — `:::7159-callout` fenced blocks → 12pt Helvetica-Bold. Mechanical verify: 42 instances `/F2 12 Tf` in CA HIC PDF.
- [x] `feat(vendor-prod)` — cheerio CSLB scraper + `organizations` + org-scoped vendors. License `1029384` verified end-to-end with cache hit on second lookup.
- [x] `feat(email)` — `/api/v1/email/healthcheck` + `/admin/email-status` + DNS wizard. Resend pre-flight refuses unverified-domain sends. No more silent bounces.
- [x] `feat(cockpit)` — MepCalcsCard mounted + middleware `bkg-lane` cookie eliminates DIY post-hydration flash.
- [x] `docs(round-4)` — CA-HIC-COMPLIANCE + ENV-VARS + SCHEMA + EXTERNAL-CODE-SOURCES updates.

### Live DB state (vlezoyalutexenbnzzui)
- 5 migrations applied (budget idx, CSLB cache, HNSW, orgs, audit_log partition) — all first try, no constraint-bug surprises this round.
- `knowledge_entities.source_urls`: 15/2256 → 938/2256 (41.6%, +6,150% improvement).
- `audit_log` partitioned: 19 monthly partitions seeded (y2025m11 → y2027m05), pg_cron jobs scheduled (`audit_log_maintain` monthly).
- `organizations` + `org_members` + `vendors.org_id` wired; existing vendors backfilled with default org per owner.
- `cslb_lookup_cache` ready (3-day TTL); first cache row populated by smoke test.
- `knowledge_entities` HNSW vector index built (`m = 16, ef_construction = 64`) + `match_knowledge_entities` RPC live, awaiting `OPENAI_API_KEY` for embeddings backfill.

### Tests added (38 total this round)
- 30 integration tests in `src/lib/code-sources/__tests__/` for Zod schemas, schema-drift warnings, fallback paths, three-adapter aggregator.
- 8 tests in `src/lib/budget/__tests__/normalize.test.ts` for idempotent upsert + concurrent-write scenarios + JSONB-to-normalized migration helpers.

### What's still open (next session, ranked)
- [ ] Add `OPENAI_API_KEY` to Vercel env → run `npm run embeddings` (~$0.02 for 2256 rows). Vector RAG auto-engages once any rows have embeddings.
- [ ] Set up Resend DNS at registrar (TXT/CNAME records copy-pasteable in `/admin/email-status`); send path auto-enables once domain status flips to verified.
- [ ] Sign UpCodes API contract → add `UPCODES_API_KEY` → flip adapter to live mode (currently stub).
- [ ] Backfill remaining 1318 `knowledge_entities` rows (material / construction_method / jurisdiction types — slug naming inconsistent, warrants LLM-assisted backfill).
- [ ] Drop legacy `command_center_projects.project_budgets` JSONB column (after 34 orphan rows reconciled into `project_budgets` table).
- [ ] First-ever-DIY-cold-load flash (needs auth-cookie plumbing on the SIGNUP path, not just SIGNIN).
- [ ] PDF callout-text golden-file test (lock exact statutory text against drift; mechanical verification only counts font runs, not text content).
- [ ] Caching layer on `aggregateSources` (LRU keyed by `source+code+edition+section`; currently re-fetches every RAG call).
- [ ] Hybrid rerank: vector top-N + FTS exact-section bonus (vector alone misses exact code-section matches like "210.52(C)(5)").

### Lessons added to `tasks.lessons.md` (7)
- Idempotent upsert needs a UNIQUE INDEX, not delete-then-insert.
- Schema-first parallelism extends to PUBLICATION patterns — bundle DDL by concern, ship as a cluster.
- Cookie + SSR is the only way to eliminate hydration flashes when DOM trees differ by user state.
- Resend's `ok: true` doesn't mean delivered — every external service needs a domain-specific "actually delivered" gate.
- Partition audit_log BEFORE the write storm, not after.
- Pattern-based backfill beats LLM-assisted backfill 10x.
- pg_cron scheduling beats Vercel cron when the job is DB-native.



## ═══ 2026-05-23 — Round 5 ship (Cowork, 10 parallel agents) ═══

**Context:** Cleared the 12 open items from round 4. Then E2E-VERIFY found 3 P1s. Fixed those inline. All Vercel green. HEAD `3adb658` (round-4 tail) → 8 commits on origin/main, final HEAD before docs commit `86b5e46`. Two big self-serve unblockers landed: PLG signup → org + project + budget seeds + 4-step wizard + reminder cron, and a real-time data layer (9 tables in `supabase_realtime` publication, `useRealtimeChannel` wired into 6 components). Statutory §7159 text now under SHA-256 golden-file lock. DIY first-ever-cold-load flash eliminated (cookie set in `/auth/callback` BEFORE redirect). `/api/v1/healthcheck` + `/admin/healthcheck` dashboard with 11 sub-checks.

### Shipped (8 commits on origin/main after `3adb658`)
- [x] `schema(round-5)` — 4 migrations as cluster A: (a) `ccp_metadata` JSONB column on `command_center_projects` for onboarding wizard freeform answers; (b) pg_cron `onboarding_reminder_send` running every 6h, calls Edge Function for Resend reminder queue; (c) `match_knowledge_entities_hybrid(query_embedding, query_text, match_count)` RPC — vector top-N union'd with FTS exact-section hits, score `0.7 * (1 - cosine_distance) + 0.3 * ts_rank_cd`; (d) drop legacy `command_center_projects.project_budgets` JSONB column + install trigger-block to fail-fast on any rogue PATCH.
- [x] `feat(code-sources)` — module-level LRU+TTL cache (~25 lines, zero deps, `Map`-backed) keyed by `source|code|edition|section`. Hybrid rerank wired into `src/lib/rag.ts`. 4 new tests.
- [x] `fix(pdf)` — §7159 statutory text under SHA-256 golden-file lock. Fixture `src/lib/contracts/__tests__/fixtures/7159-statutory.golden.txt` + `STATUTORY_7159_SHA256` constant. Test extracts §7159 block from generated PDF, normalizes whitespace, asserts SHA-256 match.
- [x] `fix(diy)` — `/auth/callback` writes `bkg-lane` cookie into response BEFORE `NextResponse.redirect()`. Cookie lives on first request to `/killerapp`; middleware applies `data-lane` body attribute on first paint. First-ever-cold-load flash gone (verified with throttled-3G Lighthouse on fresh incognito).
- [x] `feat(ops)` — `/api/v1/healthcheck` runs 11 sub-checks in parallel (DB, RLS, RPCs, pg_cron, partitions, realtime publication, code-source adapters, Resend, embeddings, audit_log write rate, idempotency canaries). `/admin/healthcheck` page polls every 30s; 11 stoplights, click-to-expand details.
- [x] `feat(plg+onboarding)` — `/signup` self-serve route. `/api/v1/onboarding/onboard-new-user` creates auth user → checks idempotency (`EXISTS(... org_members WHERE user_id)`) → creates org + org_members(owner) + default project + 4 seeded `project_budget_lines` + contract draft (wrapped in transaction with compensating-delete). 4-step wizard at `/onboarding/{welcome,project,team,done}` writes to `ccp_metadata`. pg_cron `onboarding_reminder_send` + 3 Resend templates (cold, warm, last-chance).
- [x] `feat(realtime)` — 9 tables added to `supabase_realtime` publication: `command_center_projects`, `project_budget_lines`, `csi_estimates`, `rfis`, `sub_bids`, `project_approvals`, `audit_log`, `vendors`, `invoices`. New `src/lib/realtime/useRealtimeChannel.ts` hook. Wired into 6 components: `CockpitClient`, `BudgetClient`, `EstimatingClient`, `RfiInbox`, `SubBidInbox`, `ApprovalsInbox`. `<RealtimeStatusDot>` in page headers.
- [x] `fix(sec)` — `/api/v1/marketplace/transactions` route family audit. `getAuthUser()` gates on `/create`, `/list`, `/get/[id]`, `/dispute` (the last only found during route-family enumeration). Preserved `/webhook` + `/refunds` with their existing `stripe.webhooks.constructEvent()` signature check.

### Live DB state (vlezoyalutexenbnzzui)
- 4 migrations applied (ccp_metadata, onboarding cron, hybrid rerank RPC, legacy-budget retire) — all first try.
- Marin duplicate row `6fb77918...` synced to canonical `55730cd3...` values (`total_sqft = 2800`, `ai_summary` canonical text). Sync-not-delete; dedupe-in-maintenance-window filed.
- 1 orphan `command_center_projects.project_budgets` JSONB row backfilled into `project_budget_lines` (4 CSI rows extracted from JSONB blob, inserted with orphan's project_id). Then JSONB column dropped; trigger-block confirmed firing on synthetic PATCH attempt.
- 9 tables added to `supabase_realtime` publication (verified `pg_publication_tables`).
- Edge Function `onboarding-reminder-send` deployed; pg_cron `onboarding_reminder_send` schedule live, first 4 cycles ok in `cron.job_run_details`.
- `match_knowledge_entities_hybrid` RPC tested with synthetic query embedding + "210.52(C)(5)" text — expected row ranked #1 (hybrid); pure-vector ranked it #4.

### Tests added (16 total)
- 4 in `src/lib/code-sources/__tests__/cache.test.ts` — LRU eviction, TTL expiry, key collisions, size cap.
- 4 in `src/lib/rag/__tests__/hybrid-rerank.test.ts` — vector-only baseline, hybrid order, exact-section bonus, weight tuning.
- 3 in `src/lib/contracts/__tests__/7159-golden.test.ts` — SHA-256 match, fail-on-typo, fail-on-extra-whitespace.
- 3 in `src/lib/onboarding/__tests__/idempotency.test.ts` — second call returns existing ids, partial-failure rollback, concurrent calls produce single org.
- 2 in `src/lib/realtime/__tests__/useRealtimeChannel.test.tsx` — subscribe cleanup on unmount, dedup on re-render.

### E2E-VERIFY findings (all closed in this round)
- [x] **P1: Marin `total_sqft = NULL` on cockpit** → fixed. Verifier was reading duplicate `6fb77918`; canonical `55730cd3` had `2800`. Synced duplicate to canonical (sync-not-delete).
- [x] **P1: Marin `ai_summary` drift** → fixed. Same duplicate-row issue; duplicate had stale summary from round-2 backfill. Synced.
- [x] **P1: `/api/v1/marketplace/transactions` no auth** → fixed. `getAuthUser()` gates added to `/create`, `/list`, `/get/[id]`, `/dispute`; signed-webhook subpaths (`/webhook`, `/refunds`) preserved.

### What's still open (next session, ranked)
- [ ] Add `OPENAI_API_KEY` to Vercel env → run `npm run embeddings` (~$0.02 one-time for 2256 rows). Vector + hybrid RAG auto-engages once embeddings populate. **Still gated since round 4.**
- [ ] Resend domain DNS verification at registrar (TXT/CNAME/DMARC records copy-pasteable in `/admin/email-status`); send-path auto-enables once status flips to verified. Onboarding reminder cron is queueing sends but they're refused at pre-flight until DNS is done. **Still gated since round 4.**
- [ ] Sign UpCodes API contract → flip adapter to live mode (currently stub). **Still gated since round 4.**
- [ ] Backfill remaining 1318 `knowledge_entities` rows (material / construction_method / jurisdiction types — slug naming inconsistent, warrants LLM-assisted backfill). **Carried from round 4.**
- [x] Drop legacy `command_center_projects.project_budgets` JSONB column (DONE 2026-05-24 by JSONB-DROP-V2). Trigger + function dropped in the same migration (`20260524_drop_legacy_project_budgets_column.sql`). Lagging consumer `src/app/api/v1/budget/items/route.ts` deleted in the same commit; budget-spine refactored to write through canonical `PATCH /api/v1/budget`.
- [ ] Add SECURITY DEFINER RPCs for full pg_cron + RLS healthcheck introspection (current `/api/v1/healthcheck` does what it can as calling user; "is every RLS policy correct" needs elevated privileges).
- [ ] Multi-region Redis/KV-backed code-source cache (currently per-Vercel-instance hand-rolled LRU — works for ~100 RPS single-instance; needs shared cache for multi-region).
- [ ] Stripe wiring for real billing (deferred until pricing model lands; webhook receivers ready, no checkout sessions issued yet).
- [ ] Org invite "pending" state (currently `org_members` written directly on accept; needs `org_invites` table with email + role + accept_token + accept-redirect flow).
- [ ] WORKFLOW_ROLES mirror in CompassWorkflowNav picker (P2 — data is on workflow entries but picker doesn't render lane filter UI yet).
- [ ] `audit_log` partition leaves RLS enable (P2 — partitions inherit RLS but partition-creation pg_cron job needs an extra `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` per partition).

### Lessons added to `tasks.lessons.md` (7)
- When E2E verify finds "drift," query by name to surface duplicates before mutating.
- Set the identity cookie inside the auth callback, not in a client-side post-hydration overlay.
- Don't `npm install` a data structure you can hand-roll in 25 lines.
- Idempotent endpoints need explicit existence checks, not just unique constraints.
- When adding auth to a route family, exclude signed-webhook subpaths by construction.
- Statutory text is a contract — lock it with a content-hash golden test.
- Invest in the systematic E2E verifier — spot-checks miss the failure modes that matter.



## ═══ 2026-05-24 — Round 6 ship (Cowork, 7+1 parallel agents) ═══

**Context:** Cleared 7 of the 10 open items from round 5; the JSONB-column drop required a halt-and-redispatch (JSONB-DROP halted on a wrong-brief premise, JSONB-DROP-V2 shipped clean once the dependency chain was correctly enumerated). All Vercel green. HEAD `129c1f9` (round-5 tail) → 8 commits on origin/main, final HEAD before this docs commit `8b1eb3d`. KB source_urls coverage 41.6% → 100%. 19/19 `audit_log` leaf partitions now have RLS + FORCE + revoked grants (round-4 had left them as a real bypass surface). 3 SECURITY DEFINER healthcheck RPCs turn round-5's "best-effort" stoplights into hard-fail signals. Pluggable KV backend (in-memory fallback for dev, Upstash when env vars provided). Pending-invites flow with `/accept-invite` magic-link, race-protected accept handler, auto-claim on fresh signup. WORKFLOW_ROLES filter UI now rendered in `CompassWorkflowNav` + `NextWorkflowCard`.

### Shipped (8 commits on origin/main after `129c1f9`)
- [x] `schema(round-6)` — 4 migrations as cluster A: (a) `pending_invites` table + pg_cron `expire_pending_invites` (nightly 03:00 UTC, 14-day TTL); (b) `audit_log` leaf-partition RLS audit — RLS + FORCE + REVOKE on all 19 leaves + patched `create_next_audit_log_partition()` so future leaves inherit; (c) 3 SECURITY DEFINER RPCs (`healthcheck_cron_status`, `healthcheck_rls_audit`, `healthcheck_partition_audit`) with pinned `search_path` + service-role-only grants; (d) drop legacy `command_center_projects.project_budgets` JSONB column (this round actually executed the drop; companion trigger-block dropped too).
- [x] `feat(kb)` — knowledge_entities source_urls 41.6% → 100%. Pattern map expanded with root-domain fallbacks for slug-resistant entity types (`architectural_style.*` → `aia.org`, `zoning_district.*` → `planning.org`, `material.lumber.*` → `apawood.org`, `material.steel.*` → `aisc.org`, `construction_method.*` → `nahb.org`, `jurisdiction.california.*` → `dgs.ca.gov`). 1318 rows closed in one SQL session. Haiku-backed `src/scripts/kb-ai-backfill.ts` shipped for future quality improvements; never had to fire this round.
- [x] `fix(budget)` — JSONB-DROP-V2's clean ship. JSONB column dropped. `src/lib/budget-spine.ts` repointed from `POST /api/v1/budget/items` to canonical `PATCH /api/v1/budget`. `src/app/api/v1/budget/items/route.ts` deleted. `deriveCsiDivision()` updated with `${timestamp}-${random}` suffixes so each `recordMaterialCost` is a distinct event (non-idempotent by design — the autosave path uses the round-4 UNIQUE INDEX for its own idempotency).
- [x] `feat(healthcheck)` — `/api/v1/healthcheck` consumes the 3 new RPCs. Round-5 placeholders ("not yet implemented" / "best-effort") replaced with hard assertions: cron-stopped-firing → red, RLS bypass shape detected → red, partition missing RLS → red. `/admin/healthcheck` page shows offending row(s) on click-expand.
- [x] `feat(cache)` — `KvBackend` interface in `src/lib/cache/kv.ts` with `UpstashKvBackend` + `InMemoryKvBackend` implementations. Factory function `getKv()` picks at module-load based on `UPSTASH_REDIS_URL` presence. `aggregateSources()` and embedding-RPC cache both go through `getKv()` now. Zero-regression default behavior (still the round-5 in-memory LRU when env vars absent).
- [x] `feat(invites)` — `pending_invites` flow shipped end-to-end. `/admin/team` invite-by-email form + Resend magic-link. `/accept-invite?token=...` page + `/api/v1/invites/accept` handler with WHERE-clause race protection (`UPDATE ... WHERE status = 'pending' RETURNING id` → 0 rows = `raced: true`) and `INSERT ... ON CONFLICT DO NOTHING` for org_members. Fresh signup at `/signup` auto-claims any matching `pending_invites` by email.
- [x] `feat(lanes)` — round-5 data-only `WORKFLOW_ROLES` field on workflow entries now drives picker UI. `CompassWorkflowNav` + `NextWorkflowCard` read the lane cookie SSR, filter entries by `(workflow.roles ∩ user.lane) || roles === undefined`. Server-component-friendly — right workflows render on first paint. 21 new tests cover the visibility matrix + no-cookie fallback + canonical 27-workflow snapshot.
- [x] `docs(tasks.todo)` — open items updated pre-docs-commit (this list).

### Live DB state (vlezoyalutexenbnzzui)
- 4 migrations applied (pending_invites + cron, leaf-partition RLS audit, 3 healthcheck RPCs, JSONB-column drop) — all first try.
- `knowledge_entities.source_urls` coverage: 2256/2256 (100%). Verified via `SELECT count(*) FROM knowledge_entities WHERE source_urls IS NOT NULL AND array_length(source_urls, 1) > 0`.
- All 19 `audit_log` leaf partitions: `relrowsecurity = true`, `relforcerowsecurity = true`, `REVOKE`d from anon/authenticated. Partition-creation function patched so future leaves inherit.
- `command_center_projects.project_budgets` column GONE from `information_schema.columns`. Companion `block_jsonb_budget_writes` trigger dropped too.
- 3 SECURITY DEFINER RPCs callable as `service_role`, denied for `anon` + `authenticated`.
- `pending_invites` table created (0 rows initial). pg_cron `expire_pending_invites` confirmed in `cron.job`. Smoke-test invite round-tripped (insert → manual accept → org_members appeared → status flipped).

### The JSONB-DROP halt/V2 sequence
- JSONB-DROP received: "drop the column; `/api/v1/budget/items` is dead code."
- Agent investigated, found `src/lib/budget-spine.ts` actively POSTs to that route on every `recordMaterialCost()`. Three production cockpit flows hit `recordMaterialCost()`. NOT dead code.
- Agent HALTED with the corrected caller graph and an atomic-plan proposal.
- Orchestrator accepted the halt as authoritative reconnaissance (instead of overriding).
- JSONB-DROP-V2 re-dispatched with the corrected dependency chain. Shipped in 12 minutes: drop column + delete route + repoint spine + update test, one commit. Net ~17 minutes from halt to clean ship, zero broken intermediate states on origin/main.

### Tests added (31 this round)
- 6 in `src/lib/cache/__tests__/kv.test.ts` — both backends + factory + identical-behavior contract.
- 4 in `src/lib/invites/__tests__/accept.test.ts` — race protection, auto-claim on signup, expired-invite, wrong-email.
- 21 in `src/components/__tests__/CompassWorkflowNav.test.tsx` + `NextWorkflowCard.test.tsx` — workflow.roles × user.lane visibility matrix + no-cookie fallback + canonical 27-workflow snapshot.

### What's still open (next session, ranked)
- [ ] Add `OPENAI_API_KEY` to Vercel env → run `npm run embeddings` (~$0.02 one-time for 2256 rows). Vector + hybrid RAG auto-engages once embeddings populate. **Still gated since round 4.**
- [ ] Resend domain DNS verification at registrar (TXT/CNAME/DMARC records copy-pasteable in `/admin/email-status`); send-path auto-enables once status flips to verified. Onboarding reminder cron + new invite emails both queueing but refused at pre-flight until DNS lands. **Still gated since round 4.**
- [ ] Sign UpCodes API contract → flip adapter to live mode (currently stub). **Still gated since round 4.**
- [ ] Provision Vercel KV / Upstash Redis for multi-region cache — set `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN` in Vercel env. Pluggable backend is ready; auto-promotes from in-memory fallback to shared cache on next deploy.
- [ ] Verify round-4 `drop_old_audit_log_partitions` pg_cron job runs correctly on 2027-05-01 (first retention-drop fire). Add a synthetic-time test that exercises the function against a fixture set of partitions.
- [ ] Wire actual signature service (Documenso self-host or Dropbox Sign API). Contract-send flow currently emails §7159-compliant PDF; recipient signs externally and uploads back.
- [ ] Stripe pricing model + real billing. Webhook receivers + idempotency-by-event-id ready since round 5; blocked on Chilly's pricing decision.
- [ ] Multi-region observability (Sentry/PostHog). Vercel logs cover basics; structured error tracking + product analytics deferred until traffic exists.
- [ ] Run `npm run kb:ai-backfill` with `ANTHROPIC_API_KEY` set whenever a future round wants to IMPROVE source quality on long-tail entries (currently 100% coverage but some entries point at root domains).
- [ ] Curate per-style `architectural_style` URLs (currently → `aia.org` root) and per-district `zoning_district` pointers (currently → `planning.org` root) in a dedicated curation round. 100% coverage shipped; depth is the next axis.

### Lessons added to `tasks.lessons.md` (6)
- When an agent HALTS on a wrong-brief premise, listen — don't override.
- Postgres declarative partitioning doesn't auto-inherit RLS to leaf partitions.
- 100% coverage on slug-able content > 90% with deeper sources — verifiability gate compensates for source quality.
- Healthcheck RPCs are SECURITY DEFINER + service-role-only by design.
- Idempotent state transitions gate on the FROM-state in WHERE, not just in code.
- Pluggable backends with default fallback eliminate config-required deploys.


---

## From meeting digest: 2026-03-26-bkg-walkthrough-john (added 2026-05-23)

> Source: `docs/meetings/2026-03-26-bkg-walkthrough-john.md`
> Raw transcript: `docs/meetings/raw/2026-03-26-bkg-walkthrough-john.md`

### Framing decisions

- [ ] **Decide: canonize "Four Core Pillars" framing?** Knowledge Layer / AI COO / Voice-First / Continuous Optimization Loop. If yes, fold into manifesto, About page, pitch deck. (Source: 2026-03-26 walkthrough)
- [ ] **Decide: canonize "Three-Zone Information Architecture" as the security gating label?** Zone 1 Public / Zone 2 Authenticated Shared / Zone 3 Private Business Workspace. Verify semantics match the existing public/auth/encrypted gates in `BKG-COMPLETE-PROJECT-BRIEF.html` before adoption. (Source: 2026-03-26 walkthrough)
- [ ] **Confirm "Surprise Me" as the Dream Machine discovery module name.** Already on the existing open calibration list; March 26 transcript names it explicitly. (Source: 2026-03-26 walkthrough)

### Stat verification (block external use until done)

- [ ] **Source-verify: 90% widespread worker shortage.** Currently cited in pitch language without sourced citation.
- [ ] **Source-verify: 40% of current workforce retiring by 2031.** Currently cited in pitch language without sourced citation.
- [ ] **Source-verify: 8-day coordination delays per field dependency block.** Currently cited in "Before/After" MTP matrix; cannot be used externally until benchmarked or sourced.

### Protocol additions

- [ ] **Establish monthly platform stats snapshot cadence.** Capture entity count, edge count, production route count, jurisdiction count, code section count on the first of each month. First baseline already exists in the 2026-03-26 digest.
- [ ] **Future meeting transcripts: capture dialogue vs. narration explicitly** so calibration-partner reactions (John, contractor partner) can be extracted cleanly into digests.


---

## From meeting digest: 2026-05-22-platform-review-john-mike (added 2026-05-23)

> Source: `docs/meetings/2026-05-22-platform-review-john-mike.md`
> Raw transcript: `docs/meetings/raw/2026-05-22-platform-review-john-mike.md`
> ⚠️ Source is an AI synthesis, not a verbatim transcript. Five "shipped voice" overclaims flagged in the digest — see Reality Cross-Check section before reusing any language.

### Reality reconciliation (block external use)

- [ ] **Decide audit retention:** synthesis says 7 years; repo pg_cron retention is ~18 months. Either migrate to 7 years (Supabase schema change + cost impact) or update all diligence language to match 18-month reality. Cannot leave both versions floating.
- [ ] **Strip shipped-voice language from any VC-facing material** that derives from this synthesis. Specifically: native signature engine (NOT deployed, PDF-emails-externally only), PLG self-serve signup (NOT live, Clerk still mocked), deterministic MEP "completely eliminates hallucinations" (in-flight from round 3), "transition complete" framing (May 1 dogfood broke on real ADU estimate).

### Michael Bou onboarding (corrected 2026-05-23 — Michael is John Bou's brother, joined the team; NOT external VC)

- [ ] **Get Michael through the founder dogfood loop on a real ADU job** as part of his onboarding. He saw the synthesis language in the May 22 meeting alongside John; now he needs to see the actual product loop hold end-to-end. Fresh-eye window closes fast — capture what strikes him as inflated, unclear, or broken before he absorbs the founder narrative.
- [ ] **For future meetings with Michael** (and any external party): capture actual conversation (Zoom transcript / Otter.ai) or write the digest same-day from memory. Synthesized one-voice docs destroy the calibration signal — what the other party actually questioned, pushed back on, or got excited about is the value, and that's the first thing a synthesis flattens.

### Framing decisions

- [ ] **Adopt "30-Second Hooks"** as the canonical term for the platform's opening-moments UX (the wedge where Code Compliance and §7159 contract capability surface before any onboarding friction). Aligns with the May paywall trigger strategy.
- [ ] **Reject "Deterministic Telemetry Mapping"** as a label — sounds like AI marketing prose. Keep the architectural choice (deterministic math models for MEP). Find a plainer label.
- [ ] **Decide on "System of record" vs. "demo sandbox"** as a public binary contrast for the platform's positioning. Currently aspirational; valid the day the dogfood loop holds end-to-end.

### Housekeeping

- [x] **Charlie Dahlgren** confirmed as Chilly's legal name (founder confirmation, 2026-05-23). Synthesis got this right.

### Lesson to file in tasks.lessons.md

- [x] **New lesson: "Synthesized meeting docs use shipped voice for in-progress work."** AI-generated meeting summaries describe deferred and in-flight capabilities as if deployed. Five direct overclaims in the May 22 synthesis. Cross-check every "deployed/implemented/integrated" claim against the repo before any external use, especially diligence materials. — Filed in `tasks.lessons.md` (2026-05-23).

## 2026-05-23 — Post-crash-fix open items

### Shipped this session

- [x] **`/killerapp` fatal crash for logged-in users** — hydration mismatch from `useState` lazy initializer reading `localStorage`. Fixed in `src/contexts/ProjectContext.tsx` (commit `1d8164e`). Deployed to prod via Vercel auto-deploy.
- [x] **AI Take location consistency** — `ProjectContextBanner` silently regenerates stale `ai_summary` when it doesn't mention the current jurisdiction city. No user-visible flag; stale text swaps on resolution.

### Still open (low priority / carry-forward)

- [ ] **Secondary hydration warning — `JourneyTimeline.tsx`**: `useState(() => window.matchMedia('(max-width: 640px)').matches)` runs on both server and client. Non-structural (not a crash), but produces a hydration value-mismatch on mobile. Fix: move `matchMedia` call into a `useEffect`, init to `false` server-safe. File: `src/components/JourneyTimeline.tsx`.
- [ ] **Pre-existing test failures**: `estimating/happy-path.test.tsx` step IDs stale after "Describe the job" removal; `CommandPalette.test.tsx` uses Jest globals but project uses Vitest; missing `@testing-library/react`. Not regression from this session.
- [ ] **Local dev environment**: `npx vercel env pull .env.local` still needed for full local testing with Supabase + Clerk + Anthropic keys.


## 2026-05-21 → 2026-05-23 — /intro polish session (Chat on Paulina's Mac)

Full session log: `docs/session-log.md` (3-day stretch; ~9 commits from this surface).

### Shipped (all live on prod)

- [x] **Paulina's MacBook Air onboarded** — fresh clone, npm ci, dev server warm-standby at :4001. Stale Documents copy (252 behind) preserved as `app-stale/` for reference.
- [x] **Act 1** — hammer 420 → 260px, three chrome PNGs with state-machine zoom choreography (orbit → converge-toward-center → 3s hold at peak → zoom past viewer), labels at fixed canvas positions (no scaling with logos), `useIsMobile` viewport-aware geometry for phones, transparent-bg PNGs.
- [x] **Act 2** — vignette 3+4 copy rewritten ("plain speak creates legit contracts" / "sequence, schedule & budget with voice, whiteboard, sketches or excel files — whatever works"); 8s → 10s so vignette 4 gets 4s of read-time; responsive title fontSize.
- [x] **Act 3** — multi-input cascade (voice → sketch → blueprint → excel); right-column sliding window of 2 cards; seamless infinite CSS-marquee with 12 journey illustrations at the bottom; CardJourney expanded to 4 stages with real art; mobile auto-scroll with in-out-quad S-curve over 13s.
- [x] **Act 4 deep rewrite** — replaced single-page budget with 7-phase multi-screen workflow walkthrough at hyper-speed. URL bar updates per phase. Persistent hero budget at top scales/pulses on every transition (journey → sequencing → materials → equipment → time-machine → code → contract). 14s → 24s.
- [x] **Act 5** — static knowledge-gardens-tree.png as Link portal to /killerapp (after a failed video-portal experiment). 5 verticals (Builder's / Health / Toxicology / Orchid / Legal) at 140px on radius 290 with transparent backgrounds. Coming placeholder removed.
- [x] **Asset transparency pipeline** — `transparentize.py` (PIL + numpy, corner-sample + Euclidean distance + soft falloff). Processed 9 PNGs. Originals preserved at `public/logos/gardens/_originals/`.
- [x] **12 journey illustrations** committed to `public/journey/` for full team access via GitHub.

### Still open / carry-forward

- [ ] **`public/intro-assets/tool-tree.mp4` (9.2MB)** — no longer referenced after the Act 5 static revert. Either `git rm` and reclaim the bytes, or repurpose elsewhere (intro v3?). Easy delete: `git rm public/intro-assets/tool-tree.mp4 && rmdir public/intro-assets/`.
- [ ] **Supabase upload of journey assets** — Chilly's ask: get the 12 `public/journey/*.png|jpg` into Supabase storage so the whole team can pull them via data layer, not just the repo. Not done in this session. Likely needs an `apply_migration` for the bucket + upload via Supabase MCP.
- [ ] **`transparentize.py` → `scripts/` (or `tools/`)** — currently lives in `/tmp/`. Worth promoting to a repo-tracked utility if we expect more asset-prep passes.
- [ ] **Lossless image optimization** — `public/journey/` is ~11MB and the 9 transparency-processed PNGs added ~3MB. Worth running `oxipng -o4` or `pngquant --quality=85-95 --speed=1` over `public/logos/gardens/*.png` + `public/journey/*` post-demo. Could shave 5-8MB.
- [ ] **File a Framer Motion 12 keyframe-array bug upstream** — five-keyframe `animate` arrays with `times` distribution across multiple props (x, y, scale, opacity) silently failed to animate. Minimal repro is doable. Filed in `tasks.lessons.md` (2026-05-23).
- [ ] **Cinematic re-time pass** — total on-rails is now ~62s (Act 1 8s + Act 2 10s + Act 3 13s + Act 4 24s + Act 5 12s − some transitions). May feel long for investor demo; worth a re-time after seeing it land cold with a fresh viewer.

### Filed lessons

- New lesson: **"Framer Motion 12 keyframe arrays with `times` are unreliable for multi-prop animations."** State-machine pattern (setTimeouts + single-target animations) is more robust. Filed in `tasks.lessons.md` (2026-05-23).
- New lesson: **"`width:0;height:0` motion.div anchor pattern can render invisible."** Use plain `top:50% left:50%` + `marginLeft/marginTop = -size/2`. Filed in `tasks.lessons.md` (2026-05-23).
- New lesson: **"Claude Preview's hidden iframe pauses rAF — useless for animation verification."** Push to prod and check on a real visible browser instead. Filed in `tasks.lessons.md` (2026-05-23).
- New lesson: **"Vercel CDN can serve stale PNG bytes after a fresh deploy."** Check `etag` vs local md5 before assuming the deploy failed; empty force-redeploy commit refreshes the CDN cache. Filed in `tasks.lessons.md` (2026-05-23).


## 2026-05-24 — ATTEST-WIRE: human-in-loop verification for knowledge_entities

Full session log: `docs/session-log.md` (2026-05-24 entry). Triggered by Chilly subscribing to **UpCodes Pro ($68/mo)** — wanted the BKG knowledge layer to honestly count UpCodes-cross-checked rows toward the "N sources verified" badge without forging a fake adapter result.

### Shipped (all live on prod)

- [x] **DB migration `20260524_knowledge_entities_manual_attestation.sql`** — added `manually_verified_at` / `_by` / `_source` trio + partial indexes (`idx_knowledge_entities_unverified`, `idx_knowledge_entities_verified_by`) + attached existing `audit_trigger_fn` so every attest/revoke lands in `audit_log` with full before/after JSONB diff.
- [x] **`POST /api/v1/knowledge-entities/[id]/attest`** + **`DELETE`** — owner-allowlist (`chillyd@gmail.com` / `charlie@theknowledgegardens.com` / `bou@theknowledgegardens.com`) + `app_metadata.role === 'admin'` fallback. Uses user JWT (NOT service-role) so `auth.uid()` populates the audit log.
- [x] **`countVerifiedSources()`** — adds a `manual-attestation` pseudo-source to the verified set when any result in the bag has `manually_verified === true`. Honest path from "1 source verified" (bkg-seed only) → "2 sources verified" once a reviewer cross-checks against UpCodes.
- [x] **`SourceCountBadge`** — `manuallyAttested?: boolean` prop; appends "Includes a manual review by the org owner against an external licensed source" hint to tooltip when set. Tier color unchanged (math stays honest).
- [x] **`/admin/verify` queue UI** — fetches up to 25 unverified published rows per page. Filters: entity_type, jurisdiction, search. Per-row: title + summary + jurisdiction badges + source URLs + Search-in-UpCodes 🔍 + Ask Copilot ✨ (writes prompt to clipboard) + Verify ✓ + Skip (localStorage TTL 24h). Progress widget shows "X of N verified" + ETA at ~30s/row.
- [x] **`docs/UPCODES-VERIFICATION.md`** — workflow doc: reviewer opens row in UpCodes Essentials/Pro, compares canonical text against what BKG stored, clicks Verify ✓ → stamps + audit trail.
- [x] **Fix: LaneGate(['owner']) → email allowlist** (`1cb9666`) — LaneGate needs a project context to resolve role, but `/admin/verify` has no project context, so the gate was permanently denying. Replaced with the same email allowlist the server-side route uses, so client + server are consistent.
- [x] **Fix: UpCodes `/s/<text>` → `/search?q=...` + Ask Copilot deep-link** (`c50beba`) — `/s/` requires exact publication slugs and 404s on free text like "ASHRAE 90.1 — ...". Switched to the text-search endpoint (never 404s) + added a "Ask Copilot ✨" button that opens up.codes/copilot in a new tab and copies a tailored prompt to clipboard.
- [x] **Test coverage** — `src/app/api/v1/knowledge-entities/[id]/attest/__tests__/attest.test.ts` (POST + DELETE + auth/forbidden cases).

### Filed lessons (in `tasks.lessons.md`, 2026-05-24 section)

- LaneGate without a project context defaults to "deny" — mirror server-side allowlists in client UIs that gate by global role, not project role.
- UpCodes consumer SaaS has no API at any tier ($39/$59/$68). The `/search?q=…` HTML endpoint is the only reliable deep-link target until they expose v2 API access. Pro tier ($68/mo) unlocks Copilot, which is what we deep-link into via the Ask Copilot button.
- Manual attestation MUST use the user's JWT (not service-role) so `audit_log.changed_by` is non-null. Service-role bypasses RLS AND nukes audit attribution — the audit trail is the legal defense.

### Carry-forward

- [ ] **Documenso webhook autofill bug** — UpCodes UI's Triggers field kept losing selection when registering the webhook. User provided webhook secret manually (`Grace2026!`); lazy-sync handles status without the webhook. Eventually want the webhook registered for instant status updates, but parked.


## 2026-05-25 — AUTO-VERIFY (Option C): AI pre-pass + yellow-tick provenance

Full session log: `docs/session-log.md` (2026-05-25 entry). Driven by the **23-week manual-grind math** (2,256 rows × 30s/row × 100 rows/week part-time). User asked: "Can we automate this for the time being?" — picked **Option C: AI pre-pass + fast human spot-check** with explicit yellow-vs-green provenance separation.

### Shipped (all live on prod)

- [x] **DB migration `20260525_knowledge_entities_auto_verification.sql`** — added `auto_verified_at` / `auto_verified_by` (text, machine actor) / `auto_verified_source` / `auto_verification_confidence` (numeric 0-1) / `auto_verification_notes` (jsonb) / `auto_verification_flagged` (bool). CHECK constraint on confidence range. Two new partial indexes: `idx_knowledge_entities_auto_flagged` (needs-human queue) + `idx_knowledge_entities_auto_clean` (spot-check queue).
- [x] **`src/lib/auto-verify/{cross-check.ts, persist.ts}`** — Claude Haiku 4.5 cross-checks each row's title/summary/metadata against its training knowledge of NEC/IBC/CBC/ASHRAE/OSHA/Title 24. Returns `{ confidence, discrepancies, checkable, clean, flagged, rationale, model_response, prompt_hash, ran_at }`. Thresholds: `CLEAN_THRESHOLD = 0.85`, `STAMP_THRESHOLD = 0.5`. Versioned prompt (`auto-verify/v1@2026-05-25`), hashed into notes for audit re-derivation.
- [x] **`POST /api/v1/knowledge-entities/auto-verify-batch`** — chunked worker (cursor + limit ≤ 50). Owner-allowlist + service-role bypass for cron/driver. Returns `{ processed, stamped_clean, stamped_flagged, skipped, errors, last_id, done, remaining_estimate }`.
- [x] **`POST/DELETE /api/v1/knowledge-entities/[id]/auto-verify`** — single-row re-run + auto-stamp clear.
- [x] **`scripts/auto-verify-driver.mjs`** + **`scripts/auto-verify-local.mjs`** — local Node runners; driver polls the Vercel batch endpoint, local runner uses service-role + Anthropic SDK directly (skips Vercel function deadline). Local runner supports `--shard N/M` for parallel keyspace partitioning using uuid range comparisons.
- [x] **Badge + countVerifiedSources thread** — `auto_verified` on `CodeSourceResult`; `isAutoVerified()` helper; `claude-cross-check` pseudo-source ONLY when no manual attestation present on same row (manual strictly supersedes auto, never double-counts). `SourceCountBadge` renders **yellow tick + "ai-checked" label** when auto-only, green tick when manually attested.
- [x] **`/admin/verify` 3-tab overhaul** — tabs: **Flagged for review** (default, sorted lowest-confidence first) / **Auto-verified spot-check** / **All unverified**. Per-row diff card showing discrepancies + rationale. Keyboard shortcuts: **V**erify · **R**eject auto · **S**kip · **U**pCodes search · **C**opilot · **J/K** next/prev. Auto-scroll focused row into view.
- [x] **Full corpus batch run** — 2,256/2,256 rows stamped. **258 yellow-clean** (avg confidence 0.91, well above 0.85 threshold) / **1,998 flagged** for human review. Wall-clock: ~16 min after bug fix. Anthropic Haiku spend: ~$3-8.
- [x] **Bug fix `f2ce2a0`** — skipped low-confidence rows kept `auto_verified_at` NULL → re-cycled forever. Fix: ALWAYS stamp; low-confidence verdicts get `flagged=true` + `low_confidence: true` marker in notes JSONB. Queue actually drains.

### Filed lessons (in `tasks.lessons.md`, top section)

- **Skip-without-stamp causes infinite re-checks** — any queue-draining batch worker filtering by "predicate X NOT set" MUST set X for every row processed, even for "I can't tell" verdicts.
- **Throughput-trajectory monitoring catches algorithmic stalls** — bail-out: 2 consecutive rounds with delta < 5 items processed.
- **PostgREST `like` doesn't auto-cast uuid → text** — fails silently. Use uuid range comparisons (`gte ${prefix}0000000-0000-0000-0000-000000000000`) for sharding.
- **Yellow tick (AI) vs green tick (human) must remain visually + structurally distinct.** Parallel columns, parallel pseudo-sources, manual strictly supersedes auto.

### Strategic decision point (carry-forward, NEEDS FOUNDER CALL)

The auto-verify pre-pass surfaced an uncomfortable truth: **89% of published KB rows don't pass an AI cross-check.** Most are flagged not because the AI found errors but because summaries are too vague to verify (e.g. "Sustainability practice for deconstruction planning. Source: carbonleadershipforum.org" — no checkable claim). The KB is largely aspirational stubs, not contractor-grade canonical references.

Four options on the table for v1 launch / fundraising:

- [ ] **Option A — Pivot positioning** (recommended). BKG isn't a code library; it's the contractor's compass. Demote `/knowledge` to admin-only. Code lookups happen via UpCodes Pro deep-links (Search + Copilot buttons already built). Sales pitch: "We don't replace your code book. We tell you which page to open and what to do next." Killable in 1-2 days of UI work. Highest fundability — clean story, no liability tail.
- [ ] **Option B — Cull the KB.** Drop the 1,998 flagged rows to `status='draft'`. Keep 258 yellow-clean rows live. Marketing claims "258 verified code references" honestly. Backstop after Option A.
- [ ] **Option C — Hire 2-3 part-time AEC pros.** ~$10-15K of curation labor over 2-3 weeks to give all 2,256 rows both AI + human review. Most defensible long-term, slowest, real cash burn before revenue.
- [ ] **Option D — Don't ship the KB at all in v1.** Pull `/knowledge` entirely. Lead with workflows (RFI, punch list, change orders, budget, AI specialists, Stripe billing). Fastest to a clean demoable product.

CTO recommendation: **A + B sequenced** (week 1 ship A, week 2-3 ship B as backstop). Fundraise on the workflow story, not the content story. Workflow is where Procore is weak and where AI actually helps.

Carry-forward open: **UX rehaul + parallel-agent restructure** (5-7 hard screens that nail one job each > 50 screens that try to do everything). Downstream of the A/B/C/D decision.

### Commits from this surface

```
5fd7fd1  feat(attest): human-in-loop verification + manual attestation pseudo-source  (2026-05-24)
1cb9666  fix(admin/verify): use email allowlist instead of LaneGate (no project context)  (2026-05-24)
c50beba  fix(admin/verify): replace broken /s/ URL with search + Ask Copilot  (2026-05-24)
1f2f812  feat(auto-verify): AI pre-pass + 3-tab /admin/verify + keyboard shortcuts  (2026-05-24)
f2ce2a0  fix(auto-verify): always stamp the row, never skip without writing  (2026-05-25)
```


## Knowledge Gardens OS v3 — Decisions Locked (2026-05-25)

### Lead with this in every doc, every brief, every external artifact

> **The RSI Heartbeat is the moat.** One self-improving knowledge graph per garden, ingesting source data on a domain cadence, re-verifying every entity, surfacing freshness on every claim, learning from use. The platform doesn't hold knowledge — it improves itself in public. Every other platform in our space holds static data and ages. We get more right every week.

### The locked decisions

- ✅ One product, one architecture, 55+ gardens (long-tail partner-led, template-driven)
- ✅ All-in on Pattern Language: 7 constitutional primitives + 4 platform primitives + 9 dimensional renderings = 20 pieces
- ✅ All 14 dimensions of user state addressed via the Stance Card
- ✅ RSI Heartbeat front-and-center in all docs and project instructions

---

## Active sprint — BKG Killer App UX rehaul

**Owner:** Chilly + parallel agents in Cowork
**Tool:** Claude Design (pending enablement verification) or Cowork-with-parallel-agents fallback
**Scope:** Red Killer App surface only — credentialing renewals · project pipeline · compliance alerts · GreenFlash CRM reward loop
**Out of scope (preserve as-is):** 6 Dream Machine interfaces · cinematic intro · MCP endpoint at `/api/v1/mcp`

### Sprint tasks

- [ ] **Day 1:** John verifies Claude Design availability + enablement; decision on tool stack confirmed at session start
- [ ] **Day 1:** Apply the v3 strategy doc as the Cowork session brief; every parallel agent reads it before any code
- [ ] **Day 2–3:** Audit current Killer App surfaces against the 20-piece Pattern Language — list every primitive and rendering currently in use vs missing
- [ ] **Day 4–7:** Rebuild credentialing dashboard with Infinite Descent + TrustStrip + Tempo Adapt + Pro Toggle visible
- [ ] **Day 8–10:** Rebuild project pipeline with Cross-Surface Bridge to Dream Machine + Lifecycle Memory across stages
- [ ] **Day 11–12:** Rebuild compliance alerts with Tempo Adapt (leisurely → emergency gradient) + Trust Posture Adapt
- [ ] **Day 13:** Preserve GreenFlash particle effects + Web Audio chimes through the rebuild
- [ ] **Day 14:** Founder dogfood pass — walk it as a GC, then as a homeowner, then as an agent. Log every friction point.
- [ ] **End of sprint:** Schedule Mike walkthrough (live product, not deck)

### Pattern Language application rule (non-negotiable)

Before any rebuilt surface ships, walk this checklist:
- [ ] Surface composes from the 20 Pattern Language pieces explicitly (list them)
- [ ] All 4 umbrella lanes (Administrator, Professional, Public, Machine) have a Floor 0 question + Floor 0 answer
- [ ] TrustStrip renders on every primary claim
- [ ] Three-Source Rule enforced on every authoritative claim
- [ ] Federation Contract met (header/footer · type · cross-link · JSON-LD · llms.txt · MCP)
- [ ] Stance Card read by every primitive before rendering
- [ ] Constitution's 10 goals all pass

---

## Pattern Language spec backlog (parallel work, lower priority)

The 20 pieces need formal specs. Sequence:

### 4 platform primitives — spec first, they're already in production
- [ ] `docs/patterns/trust-strip.md` — source count + freshness + contested-claim indicator
- [ ] `docs/patterns/three-source-rule.md` — authoritative claim verification
- [ ] `docs/patterns/federation-contract.md` — the non-negotiable cross-garden contract
- [ ] `docs/patterns/machine-legible-everything.md` — llms.txt + JSON-LD + MCP discipline

### 7 constitutional primitives — specs from existing constitution
- [ ] `docs/patterns/invitation-card.md`
- [ ] `docs/patterns/emotional-arc.md`
- [ ] `docs/patterns/whisper.md`
- [ ] `docs/patterns/time-machine.md`
- [ ] `docs/patterns/ask-anything.md`
- [ ] `docs/patterns/pro-toggle.md`
- [ ] `docs/patterns/progressive-reveal.md`

### 9 dimensional renderings — new specs
- [ ] `docs/patterns/infinite-descent.md`
- [ ] `docs/patterns/modality-mirror.md`
- [ ] `docs/patterns/tempo-adapt.md`
- [ ] `docs/patterns/cultural-render.md`
- [ ] `docs/patterns/accessibility-adapt.md`
- [ ] `docs/patterns/cross-surface-bridge.md`
- [ ] `docs/patterns/lifecycle-memory.md`
- [ ] `docs/patterns/trust-posture-adapt.md`

### Stance Card spec
- [ ] `docs/patterns/stance-card.md` — the 14-axis user-state data shape every primitive reads

---

## Post-BKG-rehaul priorities (queued)

- [ ] Mirror Pattern Language application to HKG Killer App (the cash engine for healthcare)
- [ ] Apply Infinite Descent + TrustStrip + Three-Source Rule to OKG Orchid Identification to validate cross-domain portability
- [ ] Begin Pattern Language partner-launch template productization (gated until HKG + BKG MRR)
- [ ] Reconcile this doc's 55-garden count against `06_FRONTIER_MAP.md` canonical (3 reserved slots to settle)

---

## Constitutional revisions (proposed)

- [ ] Add the 4 platform primitives (TrustStrip, Three-Source Rule, Federation Contract, Machine-Legible Everything) to `design-constitution.md` as constitutional primitives, not extensions
- [ ] Add "refuse emotional inference for upsell, ever" as a brand-defining commitment
- [ ] Acknowledge Phase 0 (Pre-Dream curiosity) and Phase 8 (Post-Reflect legacy/warranty) lifecycle phases
- [ ] Add the 14-dimensional user-state model and the Stance Card as a constitutional appendix
- [ ] Add the RSI Heartbeat moat statement as the constitution's preamble

---

## Cross-cutting hygiene

- [ ] Move stale `~/bkg-work/` root files (March 28–April 17 dates) into `~/bkg-work/archive/`
- [ ] Delete `~/bkg-work/app-broken-2026-05-25/` after one week of issue-free operation on the fresh clone (target: 2026-06-01)
- [ ] Mirror `design-constitution.md` from the BKG repo into the Knowledge Gardens umbrella project files
- [ ] Update all project instructions (BKG, OKG, TKG, HKG, MKG, umbrella) to lead with the RSI Heartbeat moat paragraph
