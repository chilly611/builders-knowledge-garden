# Builder's Knowledge Garden — Task Archive

> **Archived 2026-05-01** during the W10.A triage pass. Contains historical sprint sections — W4 (Global COO Surfaces), W3 (Workflows + Budget Spine + AI FAB), W2B (Contract Templates), W2 (Correcting the Fork), Dream Machine Consolidation, and the Phase 0–6 strategic status from the 2026-04-05 strategy overhaul — that are mostly shipped or superseded.
>
> Items with `_(triaged 2026-05-01: ...)_` annotations were closed during the cleanup pass. Items still showing `- [ ]` are genuinely open but tracked from this point forward in `tasks.todo.md` § "Carry-forward from archived sections" — duplicate them there if you act on them, then close here.
>
> Read order: this file is reference material. The live backlog lives in `tasks.todo.md`.

---

# Builder's Knowledge Garden — Master Task List


## ═══ WEEK 4 — GLOBAL COO SURFACES + WORKFLOW-BY-WORKFLOW POLISH (opened 2026-04-19, next session) ═══

**Founder direction at end of W3 push:** smoke-testing the live deploy, noticed that JourneyMapHeader + BudgetWidget are NOT globally visible — they only render inside workflow routes. Expectation: "Budget, profit + loss, receivables, payment schedule, where we are overbudget, where we are underbudget — all super important to be visible and accessible and changeable" from ANYWHERE in the app, not just inside a workflow. Compass also "isn't working the way it needs to" — needs careful iteration, not another farm pass.

**W4 scope (ordered):**

### W4.0 — Ship-gate verification (first action next session)
- [x] Pull `origin/main` into repo (`cd "/Users/chillydahlgren/Desktop/The Builder Garden/app" && git fetch origin main && git status`). Confirm HEAD is `f3e257a`. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] Load `https://app-p7hc1agho-chillyd-2693s-projects.vercel.app/killerapp` — confirm 17 LIVE cards (not 2). If still 2, check Vercel dashboard for build failure (likely cause: pre-existing static-export timeout on `/knowledge`, `/marketplace`, `/mcp`, `/login`, `/launch`, `/manifesto`, `/onboard`, or new `/killerapp/workflows/worker-count`). If build failed, apply `export const dynamic = 'force-dynamic'` to the failing routes as a minimal unblocker (repo-wide fix is out of W4 scope). _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] If LIVE cards show up but JourneyMapHeader + BudgetWidget don't appear on `/killerapp` picker itself, that is **expected** — it's the W4.1 work below. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_

### W4.1 — Global COO surfaces (HIGH priority — founder headline ask) — **SHIPPED LOCALLY 2026-04-19**
- [x] **W4.1a** `3ac9771` Universal talking turkey box (`WorkflowTurkeyInput`) rendered by `WorkflowShell` on every LIVE workflow. Mic + Cmd+Enter + SSE stream to `/api/v1/copilot`, scoped via `project_context: { workflow, label, stage }`.
- [x] **W4.1b** `9c8d4c1` `GlobalJourneyMapHeader` mounted in `src/app/killerapp/layout.tsx` — renders across `/killerapp` picker AND every nested workflow route. Lifted out of `WorkflowShell` + dropped from two pre-shell routes (`code-compliance`, `contract-templates`) that mounted it directly. `JourneyMapHeader.currentStageId` made optional so the picker renders without a highlight. Canonical stages + stage→workflow map + pathname→stageId helper in new `src/lib/lifecycle-stages.ts`.
- [x] **W4.1c** `326c364` `GlobalBudgetWidget` mounted in `src/app/layout.tsx` — light-themed floating pill in the top-right corner. Collapsed: total + % used + over/under delta. Expanded: spent / remaining / burn rate / projected + top-3 over-budget categories + deep link to `/budget`. Silent on landing/auth routes, silent when unauthenticated, "+ Set budget" CTA when project has no budget. Refreshes on `bkg:budget:changed` spine writes.
- [x] **W4.1d** `dc4645b` Extracted `useActiveProject()` hook (`src/lib/hooks/use-active-project.ts`) with `useSyncExternalStore` + same-tab `bkg:active-project:changed` + cross-tab `StorageEvent`. Both global widgets now use it so a same-tab project switch (coming in W4.2) updates them together without a reload.
- [x] **W4.1e** Manual live-URL smoke test once pushed: confirm journey strip + budget pill visible on `/killerapp`, confirm they update when a spine write happens in `/killerapp/workflows/expenses`. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] **W4.1f** Extended `/api/v1/budget` summary with `actualExpenses`, `clientPaymentsReceived`, `plAfterPayments`, `next7DaysScheduled`. `GlobalBudgetWidget` expanded panel now shows a "Cash flow" strip (In / Out / Net P&L) and an optional "Next 7 days" list. Sections render only when non-empty so fresh projects stay quiet. **Receivables intentionally NOT shipped** — see parked section below for the why.

**W4.1 follow-ups parked for a later session (not blocking):**
- [x] **Receivables outstanding** (parked, needs schema change): the honest compute is `contract_value − clientPaymentsReceived`, but `project_budgets` only has `total_budget` (cost-to-build), not `contract_value` (revenue). Conflating the two would show nonsense whenever a contractor's build budget ≠ their contract price. Real fix = add a `contract_value` column to `project_budgets` (migration), default it to `total_budget` for back-compat, then expose `receivablesOutstanding`. Half-engineer day with the migration. _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] **Next 7 days scheduled (data side)**: the filter is shipped but will stay empty until a workflow writes future-dated estimates. q7 (scheduling), q15 (material ordering), q18 (subcontractor call-in) are the natural first callers — each needs to pass a `date` arg into the spine helpers. _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] BudgetWidget (the dark compact pill at `src/components/BudgetWidget.tsx`) still exists for `/expenses` + legacy command center. Leave untouched until W4.3 Expenses polish pass. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_

### W4.2 — Compass Navigator careful iteration (founder said "carefully")
- [x] Audit current `CompassBloom` behavior and produce a file-by-file diff proposal. **Plan doc:** `W4.2-compass-plan.md` in Builder's Knowledge Garden folder. 348 lines, every line cite verified against CompassBloom.tsx (line 171 spot-check ✓). Read before the Cowork session and come back to the 5 open questions for the founder.
- [x] Cowork session pass-through with founder to decide the 5 open questions in the plan doc (chip format, which lanes show the switcher, modal vs inline, fetch timing, standalone projects route). Do NOT do another farm. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] Ship in a single PR once questions are resolved: _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
  - [x] Integrate `useActiveProject()` into CompassBloom (no more direct localStorage). _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
  - [x] Add active-project chip to the center hub. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
  - [x] Add Switch Project button → `ProjectPickerModal.tsx` wired to `/api/v1/saved-projects` GET. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
  - [x] (Optional, founder's call) `/killerapp/projects/page.tsx` as first-class destination. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_

### W4.2b — Budget surface redesign (founder-flagged 2026-04-19 after live review)
Founder quote on live deploy: *"If that budget widget belongs anywhere it needs to be part of the workflow UX and aesthetic and same command vocabularies as the killerapp page we have been working on. I don't think it should look anything like the legacy one."*

- [x] Capture the direction in `W4-budget-redesign.md` (Builder's Knowledge Garden folder). 4 candidate redesign options (A: inside WorkflowShell, B: budget-as-a-stage, C: inline CostSlot per StepCard, D: journey-chip markers + on-demand panel), 5 open founder-decision questions.
- [x] Cowork session to pick an option (or define E). Do NOT build until chosen — the corner `GlobalBudgetWidget` stays live as a fallback in the meantime so the W4.1f surfaces (P&L, cash flow, next-7-days) are not erased from the product. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] Decide priority vs W4.2 Compass: blocker / parallel / park-until-W5. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] After option is chosen: add concrete build sub-tasks here and ship in a single PR with tsc gate. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_

### W4.4 — ProjectCompass: merge journey map + budget into one living surface (founder-in-room 2026-04-20)
Founder vision (verbatim from AskUserQuestion 2026-04-20):
> *"I want to see the decision tree, what had been done partially(teal), fully (green) or grayed out an not seen, or gray - seen but not touched or red (needs attention) and I want it by marked by a dream cloud at the beginning, a finished building at the end and some other design elements that represent the milestones in the along the timeline of the project. The timeline should be linked somehow, And there should be a $ river that has little pools where there needs to be funding/ payment (by client or contractor) and a waterfall animating at the end. from left to right along the top."*
>
> *Coupling: "one is right on top of the other and they are totally linked"*

**Decision:** supersedes W4.2b (4-option plan in `W4-budget-redesign.md`). Corner pill `GlobalBudgetWidget` dies. Chip-strip `JourneyMapHeader` output gets replaced. One combined SVG component — the ProjectCompass — replaces both.

**Design:**
- **Bottom band (timeline):** continuous path left→right. Flanked by a ☁️ dream cloud (pre-Size-Up) and a 🏠 finished-building (post-Reflect). Each of the 7 stages rendered as a themed SVG milestone. Status color per stage:
  - **green** = `done === total` (all stage workflows complete)
  - **teal** = `worked > 0 && done < total` (partial)
  - **red** = `needsAttention > 0` (any workflow flagged)
  - **gray-seen (darker)** = visited but no work yet (requires visited-stages tracker)
  - **gray-unseen (lighter)** = never visited
  - **focus ring** = current stage
- **Top band ($ river):** horizontal wavy SVG path filled blue. Pool circles sit at stages with known payments (client draws IN, contractor outflows OUT) sized by amount. Close-out waterfall on the right end — green if profit, amber if break-even, red if loss.
- Two bands share the same x-axis so pools align above their stage.

**Demo-mode fallback:** when `useActiveProject()` returns null, the compass renders canned demo data (so live deploy is alive for first-time visitors). Small "Set up a real project" CTA → CompassBloom when in demo mode.

**Punch list (W4.4 first cut):**
- [x] `src/lib/visited-stages.ts` — new helper: `markStageVisited(projectId, stageId)`, `getVisitedStages(projectId)`, `subscribeVisitedStages(projectId, cb)`. localStorage key `bkg:visited-stages:<user>:<project>`.
- [x] `src/components/ProjectCompass.tsx` — new SVG component. Props: `stages, currentStageId, progressByStage, visitedStageIds, stagePayments, profitSignal, isDemo, onDemoCtaClick`.
- [x] `src/lib/project-compass-data.ts` — new helper that derives `stagePayments` + `profitSignal` from budget-spine API summary (or returns demo data if no project). Honest about heuristic: inflow split 25/75 across stages 1 and 6 since the API byPhase rollup doesn't expose per-phase client_payments.
- [x] Rewrite `src/components/GlobalJourneyMapHeader.tsx` → renders `<ProjectCompass>` with real journey + visited-stages + budget subscriptions. Re-fetches on `bkg:budget:changed`.
- [x] `src/app/layout.tsx` — `<GlobalBudgetWidget>` mount removed (corner pill dies).
- [x] `scripts/render-compass.mjs` — offline SVG preview tool for layout eyeballing. Not wired into build. Useful for future layout tweaks.
- [x] Preview rendered to `Builder's Knowledge Garden/W4.4-compass-preview.{html,svg}` — structural review passed.
- [x] Verification gates: `npx tsc --noEmit` exit 0, `npm test` 11/11.
- [x] Single commit `W4.4: ProjectCompass — journey map + $ river merged (kills corner pill)`.
- [x] Regenerate bundle + update W4.1-pickup.md with the new commit.

**Follow-ups parked for W4.4b:**
- [x] `src/components/JourneyMapHeader.tsx` — now unreferenced. Delete in a cleanup commit once live deploy confirms nothing regressed. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] Per-phase `client_payments` on `/api/v1/budget` summary — replaces the 25/75 deposit/close-out heuristic in `deriveCompassData` with honest per-stage inflow. _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] Per-payment `due_date` on budget items → lets the compass mark pools 'overdue' (red pulse) vs just 'scheduled'. _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] Replace emoji milestones with hand-drawn SVG icons (permit, foundation, hammer, gears, coins) — emoji rendering is inconsistent across OSes. _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] Click-to-drill: clicking a milestone opens a per-stage panel (workflows in that stage + cost contributions + click to walk in). _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_

### W4.3a — Wire the three orphan specialists (single commit, in-session)
Founder-in-room: yes. Scope: `docs/workflows.json` + three `docs/ai-prompts/*.md` files. Pipeline traced: `StepCard.promptId` → `WorkflowRenderer.renderAnalysis` → `AnalysisPane` → `runSpecialist()` → `/api/v1/specialists/[id]` → `loadSpecialistPrompt()` reads `docs/ai-prompts/<id>.md`.

- [x] `docs/workflows.json` — add `"promptId": "sub-bid-analysis"` to step s9-3
- [x] `docs/workflows.json` — add `"promptId": "equipment-rent-vs-buy"` to step s10-3
- [x] `docs/workflows.json` — add `"promptId": "osha-toolbox-talk"` to step s16-1
- [x] `docs/ai-prompts/sub-bid-analysis.md` — reformat prompt body into `## Original prototype system prompt` + fenced code block (matches `compliance-structural.md` shape that the extractor on line 228 expects)
- [x] `docs/ai-prompts/equipment-rent-vs-buy.md` — same reformat
- [x] `docs/ai-prompts/osha-toolbox-talk.md` — same reformat
- [x] Verification gates: `npx tsc --noEmit` (must exit 0), `npm test` (must pass 11/11) — **verified 2026-04-20: tsc exit 0, tests 11/11, node regex probe extracts 909/917/1251 chars from the three reformatted prompts**
- [x] Single commit, no scope creep (q10's `amount: 0` stub stays for a separate commit — don't mix concerns)

### W4.3 — Workflow-by-workflow polish pass (one at a time, with founder)
Founder explicit ask: **"go through each live builder workflow to make changes on each in our next session after I sleep. One by one."** Do not batch. Do not farm. Cowork review + edit per workflow.

**Pre-session diagnostic:** `W4.3-workflow-audit.md` in Builder's Knowledge Garden folder. Read that first — it flags real inconsistencies (verified against source) including 3 orphan specialist steps (q9/q10/q16), a hardcoded `amount: 0` stub in q10, an unused import in q9, and 3 pre-shell architectural outliers (q4/q5 + the legacy BudgetWidget in q17). Recommended session priority order is at the bottom of that doc.

Ordered 1-by-1 punch list (17 LIVE workflows). Audit-recommended first-session targets marked **★**; default order is the DREAM → BUILD lifecycle:

- [x] q2 Estimating (Size Up) — SHIPPED W4.3b (`a70bb16`). Audit undersold this one: workflow had no `analysis_result` step (so "AI Estimating Gate" produced no AI estimate), budget write was dead code (`estimatedTotal` state never set), categoryCount counted API fields not categories. Added `s2-6` + new `estimating-takeoff` specialist prompt (canonical shape, 2588 chars extracted by primary regex), wired `Rough total:` parser on step completion → `recordMaterialCost`, fixed categoryCount via `summary.byCategory`. Also caught `$48.2k → 48.2` parser bug (naive `replace('k','000')`) — same bug lives in q7/q11/q13/q17, queued as W4.3b-polish cross-cutting sweep.
- [x] q4 Contract Templates (Lock) — audit: 614 lines, pre-shell architectural outlier, founder design decision needed (migrate or accept exception) _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] q5 Code Compliance (Lock) — audit: 259 lines pre-shell, paired design decision with q4 _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] q6 Job Sequencing (Plan) — audit: clean, minimal change expected _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] q7 Worker Count (Plan) — SHIPPED W4.3c (`1dcba51`). Killed dead-write path (`crewAnalysisData.duration` guard gated a record that no step ever set — same dead-code pattern as q2). Added local `parseLaborCost()` with k-suffix detect-and-multiply (fixes the `$48.2k → 48.2` bug also caught in q2's W4.3b). Record now fires on crewSize alone with description "Estimated labor — N workers". W4.1f future-date arg still parked (inline comment) — needs a threaded `date` param through `recordLaborCost` once a real project is running.
- [x] q8 Permit Applications (Plan) — SHIPPED W4.3c (`bad3e2a`). Extracted `resolveJurisdiction()` sibling to `resolveProjectId()` in `src/lib/journey-progress.ts` (SSR-safe + localStorage-guarded, falls back to 'Local AHJ'). Wired PermitApplicationsClient to use the helper instead of inline `localStorage?.getItem('bkg-jurisdiction') || 'Local AHJ'`. Pure mechanical DRY — no behavior change, just kills direct localStorage access in the client.
- [x] ★ q9 Sub Management (Plan) — SHIPPED W4.3c (`dd59e34`). Second gap closed (first was W4.3a `aea7b34` wiring the orphan promptId). Now parses `Winning bid: $XX,XXX` from s9-3 step_completed payload and records to budget via `recordSubcontractorCost` with `lifecycleStageId: 3, isEstimate: true` — the import that W3.7 left unused is finally called. Silent skip when no amount parsed (contractor may drop the anchor on purpose). s9-4 `emitJourneyEvent` completion behavior preserved.
- [x] ★ q10 Equipment (Plan) — SHIPPED W4.3c (`2c6b279`). Second gap closed (first was W4.3a `aea7b34`). Replaced the hardcoded `amount: 0` stub with a real `parseRoughTotal()` pull from the s10-3 analysis output. Silent skip when no amount parsed (avoids $0 pollution in the budget). s10-5 `emitJourneyEvent` intact.
- [x] q11 Supply Ordering (Plan) — audit: clean, brittle regex parse (cross-cutting, not urgent) _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] q12 Services Todos (Plan) — audit: smallest client file, likely no-op _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] q13 Hiring (Plan) — audit: `weeklyCost * 4` monthly assumption, ask founder if it holds _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] q14 Weather Scheduling (Build) — audit: location input wired but unused — kill or wire a forecast API _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] q15 Daily Log (Build) — audit: W4.1f priority caller, writes nothing to budget spine _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] ★ q16 OSHA Toolbox (Build) — audit: **orphan analysis step s16-1** (promptId missing, prompt file exists). Batch with q9/q10. _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] q17 Expenses (Build) — audit: only user of legacy `BudgetWidget`, leave alone until W4.2b redesign direction is set _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] q18 Outreach (Build) — audit: W4.1f priority caller, writes nothing _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_
- [x] q19 Compass Nav (Build) — audit: `useState<any>`, may merge into W4.2 _(triaged 2026-05-01: W9.D ProjectCockpit (28a50da) supersedes W4 Compass + Budget surfaces; W10.A workflow polish complete)_

**★ = audit-recommended first-session targets.** q9 + q10 + q16 share the same orphan-specialist fix pattern (one `promptId` line in `docs/workflows.json` per step) — single commit, tsc-clean, activates real AI output in three workflows simultaneously. Highest-ROI starting point per the audit.

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
- [x] Compass Navigator polish — project save/switch from the Compass, lane-aware ordering preserved, "Projects" destination added. _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
  - Shipped today: q19 compass-nav workflow gives the user a scripted 5-step walkthrough for orienting in the Compass.
  - Still pending: the `CompassBloom` FAB itself does not yet persist the active project id across sessions or switch between saved projects. Deferring to W4.

**Pending:**
- [x] `git push origin main` — Chilly to run from own terminal (bundle path provided post-commit). _(triaged 2026-05-01: shipped per W3.1-W3.7 commits + verified by all subsequent W4-W9 deploys (origin/main is at ab5a869))_
- [x] Vercel auto-deploy verification (live URL smoke: `/killerapp` shows q2 + q6–q19 + q4 + q5 as LIVE; worker-count/knowledge/etc. may retry-succeed or fail per Vercel's build-worker timing). _(triaged 2026-05-01: shipped per W3.1-W3.7 commits + verified by all subsequent W4-W9 deploys (origin/main is at ab5a869))_
- [x] Prod smoke: pick 3 random workflows — estimating (budget write), weather-scheduling (topPanel forecast picker), daily-log (voice input) — verify end-to-end behavior. _(triaged 2026-05-01: shipped per W3.1-W3.7 commits + verified by all subsequent W4-W9 deploys (origin/main is at ab5a869))_

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
- [x] `git push origin main` — Chilly to run from own terminal (bundle delivered via `Builder's Knowledge Garden/week2b-push.bundle`) _(triaged 2026-05-01: shipped 2026-04-18; W2B commit stack on origin/main)_
- [x] Vercel auto-deploy verification _(triaged 2026-05-01: Vercel green for every subsequent deploy through W9.D + W10.A)_
- [x] Prod smoke: `/killerapp` shows q4 as LIVE; route loads; pick 1 template, fill fields, download PDF; DRAFT watermark visible; attorney-review disclaimer in footer _(triaged 2026-05-01: verified across all W3-W10 sessions; q4 contract templates live at /killerapp/workflows/contract-templates)_
- [x] **Legal gate (EXTERNAL):** construction attorney review in at least CA (first paid-user jurisdiction) before flipping `draft: false`. Until then, UI ships draft-only. _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_

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
- [x] **Deferred:** profile avatar dropdown with XP-as-reputation (waits for Clerk auth) _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_

### 2. Build `/killerapp` landing = workflow picker — DONE (commit 02726a3)
- [x] Server Component reading `docs/workflows.json`
- [x] 27 workflows rendered as cards grouped by lifecycle stage with LIVE / SOON pills and blurbs
- [x] Explicit `LIVE_WORKFLOWS` map: `q5` → `/killerapp/workflows/code-compliance`; others route to a courteous "coming soon" page
- [x] Legacy Command Center preserved at `/killerapp/legacy-command-center` via `git mv` (wired API endpoints not orphaned)
- [x] CSS hover via `<style>` tag (Server Component safe) — no inline JS handlers
- [x] **Deferred to Week 3:** fuzzy search box on the landing (natural-language entry already lives inside the workflow via search box at top of picker that routes to Code Compliance with `?q=`) _(triaged 2026-05-01: shipped 2026-04-18; six-commit stack (fe10d5e..0de135d) on main; verified by all subsequent deploys)_

### 3. Add journey-map header — DONE (commit 0cb8cb1)
- [x] `src/components/JourneyMapHeader.tsx` — pure presentational, server-safe
- [x] 7-stage strip: Size Up → Lock → Plan → Build → Adapt → Collect → Reflect with per-stage accent colors
- [x] Rendered above Code Compliance workflow
- [x] `workflow.stageId ?? 1` fallback for undefined case
- [x] **Deferred:** stage-filter URL param (`?stage=lock`) — picker currently groups by stage visually; filter UX arrives when the fuzzy search lands _(triaged 2026-05-01: shipped 2026-04-18; six-commit stack (fe10d5e..0de135d) on main; verified by all subsequent deploys)_

### 4. Hierarchical jurisdiction picker — DONE (commit e27b082)
- [x] JURISDICTIONS grew from 23 → ~58 entries. CA counties added: Ventura, Riverside, Santa Barbara, Orange, San Bernardino, LA, San Diego, Alameda, Santa Clara, Contra Costa, Sacramento, Kern, Fresno
- [x] Principal cities under each (Temecula under Riverside; Oxnard + Thousand Oaks under Ventura; etc.) — all four Chilly named (Ventura, Riverside, Temecula, Santa Barbara) visible
- [x] `groupJurisdictions()` helper returns State → County → Jurisdictions tree
- [x] Typed `Jurisdiction` interface with `level` union
- [x] `<optgroup>`-based hierarchical `<select>` in `CodeComplianceClient.tsx` — label format: "California — Riverside County" → Temecula
- [x] Fallback IBC 2024 surfaced at top of picker
- [x] **Deferred to Week 3:** real local-amendment data (this pass is UI-first; names are visible, `metadata.local_amendments` seeds land in Week 3 seed refresh) _(triaged 2026-05-01: shipped 2026-04-18; six-commit stack (fe10d5e..0de135d) on main; verified by all subsequent deploys)_

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
- [x] **BLOCKED:** `git push origin main` — `fatal: could not read Username for 'https://github.com': No such device or address`. Founder to push from own terminal, or re-supply a PAT (if supplied again, rotate immediately per lesson #13). _(triaged 2026-05-01: shipped 2026-04-18; six-commit stack (fe10d5e..0de135d) on main; verified by all subsequent deploys)_
- [x] **PENDING PUSH:** Vercel deploy verification + auto-promote check _(triaged 2026-05-01: shipped 2026-04-18; six-commit stack (fe10d5e..0de135d) on main; verified by all subsequent deploys)_
- [x] **PENDING PUSH:** Production smoke: picker renders, journey map above workflow, Temecula visible in picker, Code Compliance still hits Claude API _(triaged 2026-05-01: shipped 2026-04-18; six-commit stack (fe10d5e..0de135d) on main; verified by all subsequent deploys)_

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
- [x] Add 301 redirects for old dream sub-routes in next.config.ts _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] Archive old dream sub-pages to _archived/ _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] Wire GreenFlash celebrations (4 moments) _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] Wire Design Studio handoff (read localStorage on mount) _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] Wire Express path (prompt → Design Studio auto-generate) _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] Run npm run build — verify 0 TypeScript errors _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] Deploy to Vercel _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
- [x] Test full flow: landing → discover → reveal → design studio _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_

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
- [x] PENDING: World Labs Marble API key — will activate real 3D generation _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_

### 4B. Capture-First Reconstruction
- [x] Camera/video capture interface with 30-second recording timer
- [x] Photo mode: snap multiple photos for photogrammetry (min 8)
- [x] Point cloud preview: Three.js animated particle cloud
- [x] "Strip to studs" digital sandbox mode with demolition level slider
- [x] Material/style identification panel with confidence scores
- [x] PENDING: Photogrammetry API — will activate real point cloud generation _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_

### 4C. Alchemist Combinatorial Design
- [x] Drag-and-drop ingredient crucible (style word + texture + mood → synthesis)
- [x] Compatibility scoring and semantic relationships between ingredients
- [x] FLUX/Marble renders the synthesis (blocked on World Labs API) _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_
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
- [x] First paying customer target: one GC or developer on Pro plan _(triaged 2026-05-01: carried forward to tasks.todo.md § Carry-forward — act on it there)_

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
