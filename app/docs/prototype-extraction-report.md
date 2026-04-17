# Prototype Extraction Report

**Date:** 2026-04-17
**Source:** chilly611/bkg-killer-app v3.2 at `killer-app/bkg-killer-app-v3.html` (3322 lines, build tag `bkg-killer-app-v3.2-2026-04-16`)
**Extracted by:** Cowork autonomous session
**Output location:** `app/docs/workflows.json`, `app/docs/ai-prompts/*.md`

## Environment notes (read this first)

First pass of this report flagged two blockers; both are now resolved:

1. **Context docs — RESOLVED.** The three grounding docs live in the repo (`chilly611/builders-knowledge-garden`) at `docs/`. Located this session: `docs/killer-app-direction.md`, `docs/revenue-plan.md`, and `docs/design-constitution.md` (this last one appears to be the successor to `design-draft-v0.1.md` referenced in the original brief — version 1.0 locked April 16, 2026). The extraction was cross-checked against all three and the priority recommendations below are now aligned with the 18 founder-locked decisions in `killer-app-direction.md`.
2. **Git repository — RESOLVED.** Cloned `chilly611/builders-knowledge-garden` to the session working directory. Deliverables were merged in at `app/docs/` (a new top-level directory under the repo root, matching the path convention in the task brief) and committed as `Extract prototype workflows + AI specialist prompts from bkg-killer-app v3.2` against `main`.

## Summary

- **Total workflows extracted:** 27 (matches brief)
- **Total workflow steps:** 137 across all 27 workflows
- **Total specialist prompts extracted:** 22 (matches brief)
- **Full system prompt text found:** 22 of 22 (100%)
- **System prompts with only promptId reference (need authoring):** 0 of 22
- **Orphan analysis steps (use `analysis_result` type but no promptId):** 4

Every prompt in the prototype's `ANALYSIS_PROMPTS` dictionary has its full `systemPrompt`, `inputLabel`, and `inputPlaceholder` defined. Nothing is a stub reference. However, four workflow steps set `type: 'analysis_result'` without a `promptId`, which means they currently have no specialist prompt attached to them — those are listed under "Surprises" below.

## Workflows by lifecycle stage

The prototype calls stages "levels" and calls stage 1 "Scout"; the JSON output uses "Size Up" per the brief's renaming convention. Both names are preserved in `workflows.json` metadata.

| Stage | Count | Workflows |
|---|---|---|
| 1 — Size Up (Scout) 🧭 | 3 | q1 Pre-Bid Risk Score, q2 AI Estimating Gate, q3 CRM Client Lookup |
| 2 — Lock 🔒 | 2 | q4 Contract Templates, q5 Code Compliance Lookup |
| 3 — Plan 📐 | 8 | q6 Job Sequencing, q7 Worker Count, q8 Permit Applications, q9 Sub Management, q10 Equipment Management, q11 Supply Ordering, q12 Services Todos, q13 Hiring Lane |
| 4 — Build 🔨 | 6 | q14 Weather Scheduling, q15 Voice-to-Daily-Log, q16 OSHA Toolbox Talks, q17 Expense Tracking, q18 Contacts + Outreach, q19 Compass Navigation |
| 5 — Adapt 🔄 | 1 | q20 Change-Order Generation |
| 6 — Collect 💰 | 4 | q21 Draw-Request Auto-Fill, q22 Lien-Waiver Tracking, q23 Payroll Classification, q24 Photo-to-Punch-List |
| 7 — Reflect 📖 | 3 | q25 Retainage Chase, q26 Warranty Reminders, q27 Lessons Learned |

The distribution is lopsided: Plan has 8 workflows while Adapt has 1. This matches how real construction projects work (planning absorbs most effort and most tool surface area) but it also means the three high-cognitive-load stages (Plan / Build / Collect, 18 workflows combined) are where BKG's value concentrates, and the bookend stages (Size Up, Lock, Adapt, Reflect, 9 workflows combined) are lighter. Worth naming explicitly when prioritizing rebuild order.

## Specialist prompts by category

| Category | Count | Prompts |
|---|---|---|
| Risk assessment (Size Up) | 3 | risk-payment-history, risk-material-availability, risk-markup-calculation |
| Code compliance (Lock) | 2 | compliance-structural, compliance-electrical |
| Sequencing (Plan) | 1 | sequencing-bottlenecks |
| Crew intelligence (Plan) | 3 | crew-analysis, crew-conflicts, crew-optimization |
| Supply chain (Plan) | 4 | supply-materials, supply-suppliers, supply-pricing, supply-leadtimes |
| Weather (Build) | 1 | weather-forecast |
| Expense tracking (Build) | 2 | expense-categorization, expense-dashboard |
| Contacts / procurement (Build) | 1 | contacts-quotes |
| Change order (Adapt) | 3 | co-cost-delta, co-schedule-impact, co-document |
| Draw request (Collect) | 1 | draw-calculate |
| Punch list (Collect) | 1 | punch-detection |

Notice: no specialist prompts exist for Reflect-stage workflows (q25, q26, q27). Those workflows are all task-tracking patterns (reminders, checklists, tagging) rather than AI-assisted analysis, so that's probably fine — but if Chilly wants AI to help with the "Lessons Learned" synthesis (q27), that prompt would need to be authored.

## Surprises and observations

**Four orphan analysis steps.** These workflow steps use `type: 'analysis_result'` but reference no `promptId`, so they fall back to the prototype's `analysisTitle` + `analysisResult` demo output with no real specialist behind them:

- `q9 / s9-3` — "Compare bids" (Sub Management). Needs a subcontractor bid comparison specialist. Strong candidate to reuse `contacts-quotes`.
- `q10 / s10-3` — "Get rental quotes" (Equipment Management). Needs an equipment rent-vs-buy / rental market specialist.
- `q16 / s16-1` — "Generate talk" (OSHA Toolbox Talks). Needs a toolbox talk generator specialist (safety-topic-aware, OSHA-cite aware).
- `q23 / s23-2` — "Run AI analysis" (Payroll Classification). Needs a 1099-vs-W-2 classification specialist. This is genuinely high-value and high-risk territory (IRS / DOL compliance) — needs careful scoping.

**The prototype injects trade + state context at call time.** Line 2909 of the prototype reads `window.__BKG_TRADE__` and `window.__BKG_STATE__` and appends them to every specialist's system prompt. This is a smart architectural pattern: lane awareness lives at the orchestration layer, not baked into each prompt. Preserve this pattern in the rebuild. It also means the existing prompt text does NOT currently address trade-specific variance — the runtime append handles it.

**Prompt count discrepancy with tasks.todo.md.** `tasks.todo.md` (line 17) says "AI analysis prompts (24 prompts)" but the prototype has 22 in `ANALYSIS_PROMPTS`. The 4 orphan analysis steps bring total *analysis-result-type steps* to 26 (22 with prompts + 4 orphans). So the "24" in `tasks.todo.md` is a stale count. Minor — just flagging.

**tasks.lessons.md flags a bug pattern relevant here.** Lesson "Missing Switch Cases Silently Fail" says `handleStepInput` originally didn't handle `file_upload`, `select`, `multi_select`, `template_chooser`. This is fixed in v3.2 (confirmed by reading the `switch` block at lines 2583-2614) but worth knowing: any new step type added to the rebuild must be added to every consumer switch statement. The lesson file's "Rule: Every new step type → verify ALL switch/if-chains that dispatch on step.type" should travel with the rebuild.

**Two workflows look like vestigial / misfits.** `q19 Compass Navigation` is mostly a set of "Save X" checklists for the app's own persistence — it feels more like a system-internal checkpoint than a user workflow. `q12 Services Todos` is five unrelated site-services checklists (utility locates, dumpster, porta-potty, inspections, fuel delivery) that might be better modeled as a flat checklist rather than a workflow. Both could be cut or merged in the rebuild.

**Heavy prompt overlap in three places:**
- `crew-analysis`, `crew-conflicts`, `crew-optimization` — all read the same input (crew roster + phase assignments). Consider collapsing into one crew specialist with a `mode` parameter.
- `supply-pricing` and `contacts-quotes` — both compare quotes. Consolidate into one quote-comparison specialist with a `type` parameter (supplier vs. sub).
- `co-cost-delta`, `co-schedule-impact`, `co-document` — run naturally as a pipeline. Consider an orchestrator that calls all three and produces a single CO bundle.

**Document-generation prompts are misused.** `co-document` and `draw-calculate` (the s21-2 variant) are really template-fill tasks, not analysis. Template engines (Jinja + signed PDF) produce more consistent, legally cleaner output than LLMs for these. Use the LLM for narrative sections only.

**`punch-detection` is text-only but the UX implies vision.** The example output says "Analyzed 47 photos" but the system prompt reads as text-input-only. In production, `punch-detection` should be a vision prompt (multimodal) that actually looks at photos. This is a meaningful architecture decision that affects cost, latency, and capability — needs explicit input from Chilly before Week 2+.

**Compliance prompts don't pin NEC / IBC edition.** `compliance-electrical` says "Reference the current NEC code" without specifying an edition. NEC adoption lags by state (some use 2017, some 2020, some 2023). Rebuild must resolve NEC edition from the user's jurisdiction before the prompt runs. Same pattern for IBC/IRC.

**27 workflows × 137 steps × 22 specialists = a large surface area.** The rebuild's Week 1/2/3 ships (Code Compliance, Contract Templates, Size Up) cover roughly 5 workflows (q1, q2, q4, q5, and parts of q3). That's 18% of the prototype. The remaining 82% is backlog. Make sure the rebuild architecture (step renderer, specialist router, state management) can accommodate the remaining 22 workflows without refactor churn.

## Priority recommendations

The revenue plan commits to:
- **Week 1:** Code Compliance Lookup (q5)
- **Week 2:** Contract Templates (q4)
- **Week 3:** Size Up — estimating + sourcing (q1, q2, and parts of q11)

Based on what I extracted, those three are still the right first ships, with these caveats:

**Week 1 — Code Compliance Lookup (q5) — GREEN with a scope gate.**
Strongest contained workflow. Two specialists (`compliance-structural`, `compliance-electrical`) have tight scope and clear value. BUT `tasks.todo.md` says the knowledge engine has 142 jurisdictions and 2,847 code sections loaded — that's a small fraction of US jurisdictions. Decide before launch: does Week 1 ship with "all 50 states" marketing or "first 142 jurisdictions" honest scope? If the former, the data loading has to accelerate dramatically. If the latter, user messaging has to communicate the boundary. The worst outcome is shipping broadly and being wrong on a jurisdiction a paying contractor tests.

**Week 2 — Contract Templates (q4) — GREEN.**
Cleanest workflow in the whole prototype. Only 4 steps, no AI dependency, all template + form. Could arguably ship in Week 1 because it needs zero code compliance data. If Code Compliance is data-blocked, flip these two weeks.

**Week 3 — Size Up (q1, q2) — YELLOW.**
q1 Pre-Bid Risk Score depends on three specialists (payment history, material availability, markup calc). Payment history needs real invoice data (the contractor's own, presumably imported). Material availability overlaps with `supply-materials` / `supply-leadtimes` which are Week 3+ features — meaning you'd be shipping the "quick risk check" before the "deep supply analysis" it sort of depends on. q2 AI Estimating Gate is effectively an input-collection form with no AI in it (no `analysis_result` steps at all). It's really "set up the project" — reasonable to ship but not AI-differentiated.

**Consider pulling q24 Photo-to-Punch-List forward.** High "wow factor" per dollar of engineering. Single specialist (`punch-detection`). Vision model + a photo upload = something no other contractor tool does well. Would generate strong demo traction. But: requires the vision architecture decision mentioned above.

**Consider pulling q17 Expense Tracking forward.** Two specialists (`expense-categorization`, `expense-dashboard`), low data dependency (user provides receipts), directly saves money for contractors. Could be a Week 4 ship.

**Deprioritize q23 Payroll Classification.** Classifying 1099 vs W-2 is legally risky territory. DOL / IRS rules vary by state and by worker. An AI suggesting "3 contractors may qualify as employees" could create legal exposure. Ship this only with explicit "consult your CPA" framing and never as a recommendation.

## Gaps needing human judgment

1. **Naming: "Scout" vs. "Size Up".** The brief renames stage 1 to "Size Up". The prototype uses "Scout" everywhere (code, emoji, UI strings). Confirm the rename is final — if yes, decide whether to update the prototype HTML for consistency or let it diverge.

2. **Orphan analysis steps (4 total).** Decide whether to author specialist prompts for s9-3 (Compare bids), s10-3 (Equipment rentals), s16-1 (Toolbox talks), s23-2 (Payroll classification), OR to downgrade those steps to plain `text_input` / `checklist` for the rebuild.

3. **Jurisdiction coverage boundary for Week 1 — PARTIALLY RESOLVED.** Chilly picked California, Arizona, and Nevada as the Week 1 launch jurisdictions. Audit of the cloned repo shows:

   - **California — GO.** `src/lib/knowledge-data.ts` catalogs LA, SF, and SD (CBC 2022 + LAMC). Climate zones 2 and 3 cover CA in `batch2.mjs`. California-specific challenges (seismic) are wired into `src/lib/dream-parser.ts`. This is the most complete of the three.
   - **Arizona — GO with narrow coverage.** Phoenix is in the JURISDICTIONS catalog (IBC + local 2021). Climate zone 2 explicitly names Arizona. Good enough for Phoenix / Tucson metro; Flagstaff (climate zone 5) would need a tiny data extension.
   - **Nevada — NOT READY.** No NV entry in the JURISDICTIONS catalog. "Las Vegas" appears only as an example city in climate zone 3. A NV jurisdiction row (`nv-lv` with Southern Nevada Amendments 2018, `nv-ro` with Reno code) needs to be added to `knowledge-data.ts` and code entities loaded before NV can ship. Estimate: half a day of data population.

   **Recommendation for Week 1:** Ship with CA + Phoenix AZ in the jurisdiction picker. Add NV in Week 2 alongside Contract Templates — parallel to legal review so engineering isn't blocked. Keep the original "one jurisdiction" guidance from `revenue-plan.md` line 22 in mind; shipping CA + AZ in Week 1 is already more ambitious than the plan assumed.

4. **NEC / IBC edition resolution.** Need a jurisdiction-to-code-edition mapping before `compliance-structural` / `compliance-electrical` can be accurate. Does this exist? If not, it's a Week 0 prerequisite.

5. **Vision or text for punch-detection.** Architecture decision that affects cost per request, latency, and capability. Text-only is cheap and wrong; vision is expensive and useful.

6. **Prompt consolidation — RESOLVED (direction set, design in `app/docs/consolidation-plan.md`).** Collapsing the 22 prototype prompts toward ~16 production specialists: the crew trio becomes one specialist with a `mode` parameter, the quote pair becomes one specialist with a `type` parameter, and the CO trio becomes one orchestrator. Every capability present in the nine source prompts is preserved in the design — no trade, no lane, no use case is dropped. See `consolidation-plan.md` for the full mapping and input/output schemas. The 22 verbatim prototype prompts stay on disk as archival record; the consolidated specialists are what get rewritten in BKG voice and wired to Claude API.

7. **Template engine vs. LLM for document generation.** Affects `co-document`, `draw-calculate` (form-fill variant), and potentially future contract-generation features. Decision impacts cost, legal quality, and where LLMs get to show up.

8. **Lane awareness architecture.** The prototype appends trade + state context at call time (runtime). Should that stay in the rebuild, or should specialists be re-authored to address lane awareness natively? Both work; each has tradeoffs. Current runtime approach is simpler and keeps prompts reusable.

9. **The "18 product decisions" from the overnight review.** Not visible from the prototype alone. The extraction report assumes the decisions are captured in the missing `killer-app-direction.md`. If any of those decisions affect how workflows should be restructured (e.g., merge workflows, drop workflows, split workflows), this extraction will need a revision pass.

10. **Workflow XP totals as-extracted (preserved from prototype).** Totals range from 50 to 120 XP per workflow; per-step XP is computed as `ceil(totalXP / steps.length)`. Confirm these balance numbers are intended to carry forward to the rebuild, or whether a new XP economy is on the table.

## Commit and push

**Executed.** Cloned `chilly611/builders-knowledge-garden` into the session directory, copied the full `app/docs/` tree in, staged and committed with:

```
git add app/docs/
git commit -m "Extract prototype workflows + AI specialist prompts from bkg-killer-app v3.2"
git push origin main
```

The PAT Chilly shared in-band was used once for the push and then removed from the session's filesystem (see "PAT cleanup" at the end of this report). The PAT was also shared in plaintext in the chat transcript and should be rotated in GitHub settings (Settings → Developer settings → Personal access tokens).

## PAT cleanup

- `.git/config` in the session-local clone was scrubbed of the embedded PAT before leaving the repo.
- No `.git-credentials` file was written to `$HOME`.
- The session's clone lives under the session working directory and will be torn down with the session.

Chilly: **rotate the PAT** (`github_pat_11AOSLQDQ04uzWGA7...`). Anything visible in a chat transcript is effectively public. Rotating now is cheap; a leaked `repo`-scoped PAT is not.
