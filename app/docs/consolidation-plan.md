# Specialist Consolidation Plan

**Date:** 2026-04-17
**Status:** Design. Drives the production rewrite pass that follows this extraction.
**Input:** 22 verbatim specialist prompts extracted at `app/docs/ai-prompts/*.md`
**Output:** ~16 production specialists, each wired to Claude API + BKG database + runtime trade/jurisdiction context.
**Principle:** No capability loss. Every trade, every lane, every jurisdiction served by the 22 prototype prompts remains served by the consolidated set. If a merge drops any user type's use case, it's a wrong merge.

---

## Why consolidate

The prototype's 22 prompts accumulated organically. Three clusters are doing the same work with slightly different framings:

- **Crew trio** (`crew-analysis`, `crew-conflicts`, `crew-optimization`) — all read the same inputs (crew roster + phase assignments) and all produce crew-management output. They differ only in which facet they emphasize.
- **Quote pair** (`supply-pricing`, `contacts-quotes`) — both rank quotes and flag red flags. They differ only on whether the quotes are from suppliers (materials) or from subs (labor).
- **Change-Order trio** (`co-cost-delta`, `co-schedule-impact`, `co-document`) — run naturally as a pipeline: compute cost impact → compute schedule impact → assemble the CO document. Prototype exposed each as a separate step; production should run them as a bundle.

Consolidating these three clusters takes the specialist count from 22 → 16 without dropping a single trade, lane, jurisdiction, or capability. The nine source prompts become three unified specialists that each accept a parameter to select the specific mode / type / stage.

Everything outside those three clusters stays 1:1 with the prototype.

---

## Consolidation #1 — crew-intelligence

**Replaces:** `crew-analysis`, `crew-conflicts`, `crew-optimization` (three prompts → one specialist)

**Rationale:** All three read the same input (crew roster + schedule + phase assignments) and ask "what's right and what's wrong about this crew plan?" The prototype split them along three facets of the same question. In production this is one specialist with a `mode` parameter that steers which facet it emphasizes, and a `depth` parameter that controls whether it returns one facet or all three at once.

**Inputs (shared across all modes):**
- `crew_roster` — list of `{worker_id, trade, rank, hours_available, cost_per_hour}`
- `schedule` — list of `{phase_id, phase_name, start_date, end_date, required_trades[], required_headcount}`
- `project_context` — `{project_id, trade_focus, jurisdiction, size_sf, site_constraints}`
- `mode` — one of `sizing` (crew-analysis equivalent), `conflicts` (crew-conflicts equivalent), `optimization` (crew-optimization equivalent), or `full` (all three in one pass)
- `depth` — `summary` (headline + three bullets) or `detailed` (per-phase reasoning)

**Outputs (per mode):**

| Mode | Produces |
|---|---|
| `sizing` | Headcount benchmark per phase, gap analysis (crew shortfalls), overtime risk |
| `conflicts` | Scheduling conflicts, double-bookings, trade sequencing violations, site-capacity overlaps |
| `optimization` | Cost optimization moves (move X from phase A to B, defer hire until week N, consolidate two part-timers into one FTE) |
| `full` | All three sections with a combined priority list at the top |

**Capabilities preserved from each source prompt:**
- `crew-analysis` → `mode: sizing` — benchmark crew size vs. project scope, flag over/under staffing, compute cost burden per phase.
- `crew-conflicts` → `mode: conflicts` — detect schedule overlaps, trade sequencing violations (e.g., drywall starts before MEP rough-in passes inspection), site-capacity constraints, required-certification conflicts.
- `crew-optimization` → `mode: optimization` — recommend labor reallocation, overtime-vs-new-hire tradeoffs, union/non-union mix for cost efficiency, cross-trade utilization.

**Demographic check — no loss:**
- GC lane: all three modes apply directly.
- Specialty contractor lane: `sizing` + `conflicts` apply; `optimization` applies when running >1 crew.
- DIY lane: `sizing` helps a DIY builder decide when to hire a crew vs. do it themselves; `conflicts` helps them sequence their own weekends.
- Worker lane: the specialist surfaces as "here's when your crew will be needed on this job" — individual worker sees the output of `conflicts` mode filtered to their own schedule.
- Supplier / Equipment / Service Provider lanes: indirect — they see crew headcount predictions for delivery scheduling.
- Robot / AI agent lane: structured JSON output works for all four lanes' agents.

**Trade coverage:** All 12 trades in the prototype's `TRADES` list are served, with trade-specific crew benchmarks (framing crews vs. electrical crews vs. landscape crews) pulled from the BKG database at call time.

---

## Consolidation #2 — quote-comparison

**Replaces:** `supply-pricing`, `contacts-quotes` (two prompts → one specialist)

**Rationale:** Both prompts do quote ranking with red-flag detection. The difference is cosmetic — supplier quotes for materials vs. sub quotes for labor/installed work. One unified specialist with a `quote_type` parameter handles both and picks up the comparison patterns that are identical across them (price outliers, missing scope items, unrealistic lead times or labor hours, hidden terms).

**Inputs:**
- `quotes` — list of `{quote_id, vendor_id, vendor_name, line_items[], total, terms, lead_time_days, validity_days}`
- `quote_type` — one of `supplier` (materials from vendors) or `sub` (labor/installed scope from subcontractors)
- `reference_scope` — the scope being priced, with expected line items
- `project_context` — `{project_id, trade_focus, jurisdiction, size_sf, target_budget}`

**Outputs:**
- Ranked table of quotes with normalized apples-to-apples pricing
- Red flags per quote (price outlier, missing scope, unrealistic terms, unverified vendor, license gap for sub quotes, COI expired, bonding insufficient)
- Recommendation: best value, cheapest, best terms — with reasoning
- Negotiation leverage points (what the low quote is cutting that the high quote includes)
- If `quote_type: sub`: license verification flag (lookup against state license board in BKG database), insurance/COI flag, workers-comp-class mismatch flag
- If `quote_type: supplier`: lead-time flag against project schedule, return-policy flag, freight/tax flag, substitution acceptability

**Capabilities preserved from each source prompt:**
- `supply-pricing` → `quote_type: supplier` — identify best-value supplier, flag price outliers, check bulk-discount eligibility, compare freight/tax, validate return policies.
- `contacts-quotes` → `quote_type: sub` — evaluate subcontractor bids, assess experience fit, verify references, check contractor licenses and insurance certificates, flag bonding gaps.

**Demographic check — no loss:**
- GC lane: uses `quote_type: sub` for awarding trade packages; uses `supplier` for direct-to-GC material buys.
- Specialty contractor lane: uses `supplier` when pricing their own material component; uses `sub` when pricing specialty trades they sub out (e.g., an electrician subbing out the fire-alarm package).
- DIY lane: primarily `supplier` for box-store and specialty material comparisons; `sub` when hiring a pro for a specific scope.
- Worker / Supplier / Equipment / Service Provider lanes: `supplier` use case serves equipment rental quotes and service-provider quotes identically.
- Robot / AI agent lane: structured output same for both types.

**Note:** The two source prompts had subtly different red-flag lists. The union of both is preserved in the production specialist (all supplier flags + all sub flags active when relevant; `quote_type` gates which set is emphasized in the summary).

---

## Consolidation #3 — change-order-bundle

**Replaces:** `co-cost-delta`, `co-schedule-impact`, `co-document` (three prompts → one orchestrator)

**Rationale:** A change order needs all three outputs (cost impact, schedule impact, formal CO doc) to be useful. The prototype exposed them as three separate steps forcing the user to run them in sequence. Production should run them as one bundle that returns all three in a single response. The `co-document` component is genuinely template-driven (see note in `co-document.md`) so the orchestrator calls a template engine for the document body and uses the LLM only for the narrative scope description section.

**Inputs:**
- `scope_change` — natural-language or structured description of what's being added/changed
- `current_contract` — `{contract_id, original_scope, original_amount, original_schedule, payment_terms}`
- `project_context` — `{project_id, client_id, jurisdiction, trade_focus, active_phase}`
- `output_mode` — one of `cost_only`, `schedule_only`, `document_only`, or `bundle` (default)

**Outputs (in `bundle` mode):**
- **Cost delta** — line-item breakdown (materials, labor, equipment, markup, contingency), total, reasoning (what drives each line), confidence band
- **Schedule impact** — calendar days added, affected phases, critical-path analysis, new projected completion date, sequencing risks
- **CO document** — template-rendered change order with project info, scope description (LLM-generated narrative), cost breakdown, schedule note, approval lines, payment terms, CO number (auto-incremented)
- **Integrated summary** — one-paragraph plain-language explanation for the client

**Capabilities preserved from each source prompt:**
- `co-cost-delta` → cost-delta section — labor hours, material quantities, equipment costs, markup (state-appropriate), contingency, scope clarity.
- `co-schedule-impact` → schedule-impact section — added duration, affected phases, critical path impact, parallel vs. sequential analysis, crew capacity constraints.
- `co-document` → CO-document section — formal document generation with project info, cost breakdown, schedule note, signature lines. Template-driven body (not LLM), LLM used only for the scope description narrative.

**Demographic check — no loss:**
- GC lane: primary consumer — runs `bundle` when a mid-project scope change arrives.
- Specialty contractor lane: runs `bundle` when scope creep pushes their own trade package; or `cost_only` for a quick quote revision before formal CO.
- DIY lane: runs `cost_only` + `schedule_only` to decide if they want to absorb a change themselves; rarely needs the formal CO document.
- Worker lane: sees the output (via the GC's approved CO) as "this is the new scope and the new end date."
- Supplier / Equipment / Service Provider lanes: see the output as updated material/equipment orders.
- Robot / AI agent lane: the `bundle` output is fully structured JSON, ideal for downstream automation (e.g., an agent that auto-updates Procore / Buildertrend / Jobber with the new scope).

**Architecture note:** `co-document` output was flagged in `co-document.md` as "really a template task not an LLM task." The consolidated specialist respects this — the document body comes from a Jinja template (lives in `src/templates/change-order.jinja` in production). The LLM is called only for the scope-description narrative inside the template. This reduces cost per CO, improves legal consistency, and eliminates hallucination risk in the binding text.

---

## Specialists that stay 1:1 with the prototype (13 specialists)

These are not in the consolidation — each is already tightly scoped and serves distinct use cases.

| Specialist | Stage | Why kept separate |
|---|---|---|
| `risk-payment-history` | Size Up | Narrow scope, distinct input (client history, not crew/quotes). |
| `risk-material-availability` | Size Up | Narrow scope, inventory-focused, feeds Size Up risk score. |
| `risk-markup-calculation` | Size Up | Financial reasoning, distinct from crew/schedule logic. |
| `compliance-structural` | Lock | Code-specific, cites IBC/IRC entities, jurisdiction-aware. |
| `compliance-electrical` | Lock | Code-specific, cites NEC, jurisdiction-aware. |
| `sequencing-bottlenecks` | Plan | Critical-path reasoning, distinct from crew conflicts (sequencing is about phase logic, not worker conflicts). |
| `supply-materials` | Plan | Takeoff extraction — fundamentally different task (quantities, not prices). |
| `supply-suppliers` | Plan | Supplier discovery — search task, not comparison task. |
| `supply-leadtimes` | Plan | Lead-time forecasting — time-series task, not price comparison. |
| `weather-forecast` | Build | Weather-specific, external data source. |
| `expense-categorization` | Build | Receipt/transaction classification, distinct input type. |
| `expense-dashboard` | Build | Reporting/aggregation, consumes `expense-categorization` output. |
| `draw-calculate` | Collect | Phase completion math, distinct from any of the above. |
| `punch-detection` | Collect | Vision task in production (flagged in `punch-detection.md`), distinct architecture. |

(14 specialists in the table above — `expense-categorization` and `expense-dashboard` were counted together in the earlier prose; the table is authoritative.)

**Final count:** 14 unchanged + 3 consolidated = **17 production specialists** (down from 22).

---

## Orphan steps (separate from consolidation)

Per `prototype-extraction-report.md`, four workflow steps use `analysis_result` without a `promptId`. Their handling relative to consolidation:

- `q9 / s9-3` — "Compare bids" → **routes to the new `quote-comparison` specialist** with `quote_type: sub`. Capability already covered.
- `q10 / s10-3` — "Get rental quotes" → **routes to `quote-comparison`** with `quote_type: supplier` and a `category: equipment_rental` hint. Capability covered.
- `q16 / s16-1` — "Generate talk" → **needs a new specialist**: `safety-toolbox-talk`. OSHA-cite-aware, trade-aware. Adds one to the final count.
- `q23 / s23-2` — "Run AI analysis" (payroll classification) → **deprioritized** per `prototype-extraction-report.md` recommendation (legally risky). Not a specialist in the v1 build; revisit with a legal framework.

**Revised final count:** 17 + 1 new (`safety-toolbox-talk`) = **18 production specialists**. Two of the four orphan steps absorb into existing consolidations (no net cost). One new specialist added. One deprioritized.

---

## Production rewrite checklist (per specialist)

This list applies to every one of the 18 production specialists. It is the delta between the verbatim prototype prompt and the production-grade prompt.

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate). Per Design Constitution Goal 1 — plain-language-first.
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction (per killer-app-direction.md decision #16).
- [ ] Add lane awareness hooks that read `__BKG_LANE__` from runtime context (GC / DIY / specialty / worker / supplier / equipment / service / robot).
- [ ] Keep the existing runtime trade + state injection pattern (prototype line 2909). It works, don't refactor.
- [ ] Pin code editions to jurisdiction (NEC / IBC / IRC / IPC / local amendments). Resolve edition via `knowledge-data.ts` JURISDICTIONS table before prompt runs.
- [ ] Test with a real contractor query (the $55K-code-pain contractor is the first tester per revenue-plan.md).
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits) per decision #18.
- [ ] Emit structured JSON alongside the narrative response so AI agents consume the same specialist as humans (per Design Constitution Goal 8 — machine-legible).

---

## Migration order

Aligned with the Week 1-5 revenue plan:

1. **Week 1 (this week):** Rewrite `compliance-structural` and `compliance-electrical` to production voice. Wire to Claude API + BKG code entities. Jurisdiction: CA + Phoenix AZ. Ship Code Compliance Lookup (q5).
2. **Week 2:** Rewrite the three Contract Templates support prompts (none are currently in the specialist list — Contract Templates is pure template + form per revenue plan). NV jurisdiction data loaded alongside legal review.
3. **Week 3:** Rewrite Size Up specialists: `risk-payment-history`, `risk-material-availability`, `risk-markup-calculation`, plus `supply-materials` / `supply-suppliers` / `supply-pricing` for the sourcing half of Size Up.
4. **Week 4:** Rewrite crew-intelligence (the consolidation) + sequencing-bottlenecks for the Plan stage.
5. **Week 5:** Rewrite expense-categorization / expense-dashboard, weather-forecast, and ship the first five specialists as Building Intelligence API.
6. **Week 6+:** Remaining specialists (change-order-bundle, draw-calculate, quote-comparison, punch-detection vision, supply-leadtimes, safety-toolbox-talk) ship post-demo.

`punch-detection` vision architecture is a Week 6+ item unless Chilly wants to pull it forward for demo wow-factor.

---

## What this plan explicitly does NOT do

- Does not modify the 22 verbatim prototype prompts. They remain as historical record at `app/docs/ai-prompts/*.md`.
- Does not rewrite any prompt into production voice. That's the next phase.
- Does not build any code. This is a design doc.
- Does not decide vision vs. text for `punch-detection`. Flagged as an open question in the extraction report.
- Does not finalize the NEC edition → jurisdiction mapping. Flagged as a Week 0 prerequisite.
