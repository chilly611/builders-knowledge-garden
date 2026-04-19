# Week 3 Integration Worksheet

Parallel agents append to the table below when their workflow route is `ready` to wire into `LIVE_WORKFLOWS`. The integrator pass (W3.7) reads the table and makes a single edit to `src/app/killerapp/page.tsx`.

Format: `q-id | slug | owner | ready-at | notes`. Keep the `status` column honest — `blocked` / `stub` entries are fine, silent stubs are not.

| q-id | slug | owner | ready-at | status | notes |
|------|------|-------|----------|--------|-------|
| q2   | estimating | Agent A | 2026-04-18 23:45Z | ready | Budget spine wired; topPanel shows project summary. Records estimate on s2-5 completion if amount > 0. No-project CTA rendered. |
| q6   | job-sequencing | Agent A | 2026-04-18 23:45Z | ready | No budget writes. Emits `completed` event on final step. Zero external dependencies. |
| q7   | worker-count | Agent A | 2026-04-18 23:45Z | ready | Labor cost recorded on s7-2 analysis completion if cost extracted. Emits `completed` on final step. Silent fail on no-project. |
| q8   | permit-applications | Agent B | 2026-04-18 23:50Z | ready | recordPermitCost on permit fee checklist completion; topPanel for fee amount inputs; emits `completed` on s8-5. No-project silent fail. |
| q9   | sub-management | Agent B | 2026-04-18 23:50Z | ready | recordSubcontractorCost on s9-4 multi_select; orphan analysis s9-3 — prompt `sub-bid-analysis.md` authored, promptId wiring deferred to integrator. |
| q10  | equipment | Agent B | 2026-04-18 23:50Z | ready | recordEquipmentCost on s10-3 analysis completion; orphan analysis — prompt `equipment-rent-vs-buy.md` authored, promptId wiring deferred. Emits `completed` on s10-5. |
| q11  | supply-ordering | Agent C | 2026-04-18 09:42Z | ready | recordMaterialCost on s11-3; budget writes silently skipped if no active project or no total extracted |
| q12  | services-todos | Agent C | 2026-04-18 09:42Z | ready | emitJourneyEvent(completed) on s12-5; no budget writes |
| q13  | hiring | Agent C | 2026-04-18 09:42Z | ready | recordLaborCost on s13-5 final checklist; extracts worker name from s13-3 and weekly cost from context; amount = cost * 4 weeks |
| q14  | weather-scheduling | Agent D | 2026-04-18 22:45Z | ready | topPanel for zip/address picker; journey completion on final step |
| q15  | daily-log | Agent D | 2026-04-18 22:45Z | ready | contextFields=['lane'] per spec; voice_input already in StepCard; journey completion on final step |
| q16  | osha-toolbox | Agent D | 2026-04-18 22:45Z | ready | specialist prompt authored at docs/ai-prompts/osha-toolbox-talk.md; s16-1 analysis_result still requires promptId registration in workflows.json or client-side override |
| q17  | expenses | Farm Agent E | 2026-04-18 | ready | recordExpense on s17-2 analysis_result; BudgetWidget in topPanel for live budget view; emitJourneyEvent(completed) on s17-5 |
| q18  | outreach | Farm Agent E | 2026-04-18 | ready | emitJourneyEvent(completed) on s18-5 analysis_result; no budget writes per spec |
| q19  | compass-nav | Farm Agent E | 2026-04-18 | ready | emitJourneyEvent(completed) on s19-5 checklist; sidePanel shows mini journey summary via getJourneyState; contextFields restricted to trade/lane only |

## Blurb corrections

If your route meaningfully drifts from the one-sentence blurb in `src/app/killerapp/page.tsx WORKFLOW_BLURBS[qX]`, propose a rewrite here. The integrator will fold it into the same edit that adds your `LIVE_WORKFLOWS` entry.

| q-id | current blurb | proposed blurb |
|------|---------------|----------------|

## Spec drift / open questions

If you hit something in the spec that disagrees with reality or with another workflow's behavior, drop a line here:

| q-id | issue | proposed resolution |
|------|-------|---------------------|
| q9, q10 | Orphan analysis steps (s9-3, s10-3) have no promptId in workflows.json. Spec recommends "wire via step-level override" but no clear mechanism found in WorkflowShell API. | Routes ship with prompt files ready (sub-bid-analysis.md, equipment-rent-vs-buy.md) and render analysis_result steps without AnalysisPane (returns null) per WorkflowRenderer behavior when promptId missing. Integrator can add promptIds to workflows.json or implement override mechanism. Per spec: acceptable fallback. |
| q2, q7, q11, q12 (etc.) | Farm agents referenced non-existent properties on `StepResult` — `event.stepIndex`, `event.value`, `event.textInput`, `event.analysisOutput`, `event.analysisResult` — and fictional event types `'analysis_completed'` / `'analysis_result'`. Also: `StepResult` is not re-exported from `WorkflowRenderer.types` (one client imported from the wrong path). Landed 16 tsc errors across 10 client files. | W3.7 integrator corrected all 10 clients to match the actual `StepResult` shape: `{ type: 'step_opened' \| 'step_saved' \| 'step_skipped' \| 'step_completed', stepId, payload?: unknown, timestamp }` with payload narrowed per step type (`{ value }` for text/voice/number, `{ selected }` for select, `{ checked }` for checklist, `{ input }` for analysis_result). Step index derived via `workflow.steps.findIndex(s => s.id === result.stepId)`. Lesson logged in tasks.lessons.md for future farms. |

## Integrator pass (W3.7)

**Date:** 2026-04-19
**By:** main thread (post-farm)

1. Edited `src/app/killerapp/page.tsx` `LIVE_WORKFLOWS` map once — added q2 + q6-q19 → slug mappings (15 entries). Picker now renders all 17 workflows (incl. q4, q5) as LIVE.
2. Ran `npx tsc --noEmit` across full repo → 16 errors surfaced, all in farm-built client files, all traceable to agents inventing `StepResult` property names. Fixed in place.
3. Re-ran `npx tsc --noEmit` → 0 errors.
4. Ran `npm test` → 11/11 pass (`WorkflowRenderer.test.ts`, `specialists.test.ts`).
5. `next build` in progress.

No blurb corrections proposed by any agent; keeping `WORKFLOW_BLURBS` unchanged.
