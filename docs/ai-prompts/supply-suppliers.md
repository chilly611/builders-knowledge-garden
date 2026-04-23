---
prompt_version: v1
---

<!-- DEFENSIBILITY SELF-EVAL -->
Is this output defensible against ChatGPT for a working contractor?
STATUS: DRAFT
BECAUSE: Prototype scope; no entity-ID gating to real marketplace_listings table, no jurisdiction-aware supplier discovery, no regional rate data. Generic category advice only.
PROMISE: Identifies typical supplier types (lumber yards, steel distributors, concrete suppliers, mechanical wholesalers) by material and location, with evaluation questions for each.
LANE: agnostic

# supply-suppliers

**Specialist role:** Construction procurement consultant — recommends supplier types and evaluation questions per material list and location.
**Used by workflows:** q11 (Supply Ordering, step s11-2)
**Lifecycle stage:** Plan (Stage 3)
**Status:** Draft (prototype v3.2) — production rewrite pending

## Original prototype system prompt

```
You are a construction procurement consultant. Your job is to recommend supplier sources and what to evaluate when requesting quotes. Based on the material list and contractor location, identify supplier types (lumber yards, steel distributors, concrete suppliers, mechanical wholesalers, etc.) that typically stock the items listed. For each supplier type, suggest key questions to ask: delivery lead times, minimum order quantities, pricing structure, delivery fees, rush premiums, and payment terms. Provide a vendor outreach strategy. Note: This analysis is based on typical supplier categories, not real-time supplier databases.
```

**Input label (prototype):** Location & Material List

**Input placeholder (prototype):**
```
Provide location and material list. Example: "Location: Denver, CO. Materials: structural steel (40 tons), electrical panel (400A), copper wire, standing seam roofing (1,500 sf), concrete (200 cubic yards)."
```

## Example output from the prototype

From q11 / s11-2 (Supplier Search):

> Local lumberyard: in-stock, 5% discount. National: 2-3% discount, free delivery over $5k. Specialty flooring: 1 supplier within 50 miles. Recommend splitting orders for best pricing.

## Production rewrite checklist

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate)
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction
- [ ] Add lane awareness (GC vs. DIY vs. worker) where applicable
- [ ] Test with a real contractor query to validate output quality
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits)

## Related entities (BKG database)

- Supplier / vendor entities (marketplace tables)
- Regional supplier coverage by jurisdiction
- Supplier rate cards / pricing history
- Typical entity IDs: supplier_id, jurisdiction_id, material_id

## Notes

Prompt explicitly disclaims: "This analysis is based on typical supplier categories, not real-time supplier databases." For BKG to differentiate, this MUST become data-backed (actual suppliers in user's region with real lead times). Current state: generic category advice — not defensible against ChatGPT. Week 3 priority work per revenue plan. Gate: confirm marketplace_listings has real supplier data seeded before launching this prompt.
