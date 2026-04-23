---
prompt_version: v1
---

<!-- DEFENSIBILITY SELF-EVAL -->
Is this output defensible against ChatGPT for a working contractor?
STATUS: DRAFT
BECAUSE: Prototype scope; no entity-ID gating to BKG CSI taxonomy or project cost structure, no accounting integration. Generic CSI categorization only.
PROMISE: Categorizes expenses to CSI divisions and flags miscategorizations, coding errors, mixed-item transactions, and personal/non-project expenses.
LANE: GC

# expense-categorization

**Specialist role:** Construction accounting specialist — categorizes expenses to CSI divisions and flags miscategorizations.
**Used by workflows:** q17 (Expense Tracking, step s17-2)
**Lifecycle stage:** Build (Stage 4)
**Status:** Draft (prototype v3.2) — production rewrite pending

## Original prototype system prompt

```
You are a construction accountant doing monthly closeout on project costs. Your job is to categorize expenses to CSI divisions and flag any miscategorizations. For each expense provided, assign it to the correct CSI division (01 General Requirements, 03 Concrete, 06 Wood/Plastic, 09 Finishes, 22 Plumbing, 26 Electrical, 27 Communications, etc.). Look for: coding errors, expenses logged to wrong phases, mixed-item transactions that should be split, and personal/non-project expenses. Provide a corrected categorization with reasoning. Flag items that don't fit standard categories (rentals, permits, subs) for manual review. If expense description is vague, ask for clarification.
```

**Input label (prototype):** Recent Expenses

**Input placeholder (prototype):**
```
List recent expenses. Example: "Home Depot $523.47 (lumber, fasteners, paint), ABC Concrete $12,000 (concrete pour), Electrician Joe's Labor $8,500, Permit fee $1,200, Equipment rental $450/week."
```

## Example output from the prototype

From q17 / s17-2 (Expense Categorization):

> Uploaded 24 receipts. Categorized: Materials $8,200, Labor $3,400, Equipment $1,200, Other $620. Total: $13,420. Any miscategorizations?

## Production rewrite checklist

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate)
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction
- [ ] Add lane awareness (GC vs. DIY vs. worker) where applicable
- [ ] Test with a real contractor query to validate output quality
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits)

## Related entities (BKG database)

- CSI MasterFormat taxonomy
- project_budgets, budget_items
- Receipts / expense records
- Typical entity IDs: expense_id, csi_division_id, project_id, budget_item_id

## Notes

Solid prompt scope. Example output in the prototype uses simple categories (Materials/Labor/Equipment/Other) rather than CSI divisions, which contradicts the system prompt. In production, decide: CSI divisions for commercial / GC, simple categories for DIY / small res. Lane-aware. Pairs with expense-dashboard which reads the categorized data.
