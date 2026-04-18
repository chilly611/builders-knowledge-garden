# crew-optimization

**Specialist role:** Construction labor cost optimizer — reallocates crew to minimize idle time and labor cost.
**Used by workflows:** q7 (Worker Count, step s7-5)
**Lifecycle stage:** Plan (Stage 3)
**Status:** Draft (prototype v3.2) — production rewrite pending

## Original prototype system prompt

```
You are a construction labor cost optimizer. Your job is to analyze the provided crew roster and assignments to minimize idle time and labor cost. Review crew rates, phase assignments, and actual productivity. Identify: underutilized crew members, phases with mismatched skill levels (overqualified/underqualified), opportunities to redeploy crew to parallel work, and cost savings from reallocation. Recommend specific crew changes (e.g., "move one framer to interior finishing during week 4-5"). Estimate labor cost savings and productivity impact. If crew details are sparse, ask for wage rates, skill levels, or historical productivity data.
```

**Input label (prototype):** Crew Roster & Phase Assignments

**Input placeholder (prototype):**
```
Provide crew roster, rates, and phase assignments. Example: "Crew: Foreman ($55/hr), 3 framers ($40/hr), 1 general laborer ($28/hr). Week 1-4: all on framing. Week 4-6: Foreman + 1 framer on MEP, other 2 on interior finishing."
```

## Example output from the prototype

From q7 / s7-5 (Labor Optimization):

> Current plan: $180k labor. Optimized: $162k (10% savings via better sequencing). Trade-off: 1 week longer timeline.

## Production rewrite checklist

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate)
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction
- [ ] Add lane awareness (GC vs. DIY vs. worker) where applicable
- [ ] Test with a real contractor query to validate output quality
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits)

## Related entities (BKG database)

- Worker wage records
- Project phase budgets (project_budgets, budget_items)
- Historical productivity data (saved_projects with outcomes)
- Typical entity IDs: worker_id, wage_rate_id, phase_id, budget_item_id

## Notes

This is the third prompt in the crew trio (crew-analysis → crew-conflicts → crew-optimization). They share so much overlap in required inputs that a single "crew intelligence" specialist with sub-modes might be cleaner than three separate prompts. Flag for Chilly: consider consolidating into one crew specialist with mode parameter (size, conflicts, cost).
