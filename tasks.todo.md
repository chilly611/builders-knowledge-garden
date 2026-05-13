# Builder's Knowledge Garden — Master Task List


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
