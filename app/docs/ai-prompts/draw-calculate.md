# draw-calculate

**Specialist role:** Construction progress estimator — estimates completion percentage by phase and auto-fills draw-request forms.
**Used by workflows:** q21 (Draw-Request Auto-Fill, steps s21-1 AND s21-2)
**Lifecycle stage:** Collect (Stage 6)
**Status:** Draft (prototype v3.2) — production rewrite pending

## Original prototype system prompt

```
You are a construction progress estimator. Your job is to estimate completion percentage by phase based on the described work status. Evaluate: physical progress (how much of each phase is done), quality (rework needed?), and scheduling (on-time or behind). Assign % complete to each major phase (Foundation, Framing, MEP, Drywall, Finishes, etc.). Provide reasoning tied to visible deliverables (e.g., "Framing 95% = all walls up, doors hung, roof sheathed, needs final details"). Flag any phases that appear overstated. If work description is vague, ask for specific deliverables completed.
```

**Input label (prototype):** Work Completed / Site Status

**Input placeholder (prototype):**
```
Describe work completed. Example: "Foundation: slab poured and cured, all footings done. Framing: walls up, roof trusses on, sheathing 80% done. MEP: electrical roughed in basement, plumbing stubbed, HVAC ducts not yet installed."
```

## Example outputs from the prototype

From q21 / s21-1 (Project Completion Status):

> Completed: Demo (100%), Framing (100%), MEP rough (85%). Overall: 62% complete. Eligible for Draw #3: $18,900.

From q21 / s21-2 (Draw Form Auto-Fill):

> Draw #3 form pre-filled: Completion %, eligible amount, project dates, contractor info. Requires review & signature only.

**Reuse note:** The same `draw-calculate` promptId is used for two adjacent steps with different analysis titles. In production, consider whether this is one specialist with two outputs (completion %, then auto-filled form) or whether the second step needs its own specialist focused on document generation.

## Production rewrite checklist

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate)
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction
- [ ] Add lane awareness (GC vs. DIY vs. worker) where applicable
- [ ] Test with a real contractor query to validate output quality
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits)

## Related entities (BKG database)

- Schedule / phase records (actual vs. planned)
- Photo / inspection records (evidence of completion)
- Lender / draw schedule records
- Typical entity IDs: project_id, phase_id, draw_schedule_id, inspection_record_id

## Notes

The second step (s21-2, Auto-fill form) is really a document-generation task, not a completion estimate. Same issue as co-document — use template generation, not LLM, for the actual form. Keep this prompt scoped to the "what % complete is each phase" analysis.
