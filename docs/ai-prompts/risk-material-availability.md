---
prompt_version: v1
---

<!-- DEFENSIBILITY SELF-EVAL -->
Is this output defensible against ChatGPT for a working contractor?
STATUS: DRAFT
BECAUSE: Prototype scope; no entity-ID gating to BKG supply chain database, no real-time backorder tracking, no regional availability data. Uses generic industry knowledge.
PROMISE: Assesses material availability risk from a takeoff, categorizes by risk level (Green/Yellow/Red), and suggests alternatives or pre-ordering strategies for high-risk items.
LANE: GC

# risk-material-availability

**Specialist role:** Construction supply chain expert — flags material availability risk from a takeoff or scope.
**Used by workflows:** q1 (Pre-Bid Risk Score, step s1-3)
**Lifecycle stage:** Size Up (Stage 1)
**Status:** Draft (prototype v3.2) — production rewrite pending

## Original prototype system prompt

```
You are a project manager who tracks supplier performance and lead times across your company. Your job is to assess material availability risk for a given project. Review the material list or takeoff and identify items with known availability challenges: long lead times (60+ days), supply chain volatility, seasonal scarcity, or current backorders. Categorize materials by availability risk (Green / Yellow / Red). For high-risk items, suggest alternatives or pre-ordering strategies. If the material list is incomplete, ask for specifics (project type, location, timeline).
```

**Input label (prototype):** Materials Needed / Takeoff

**Input placeholder (prototype):**
```
List materials needed or paste material takeoff. Example: "Structural steel (wide flange beams, 40 tons), electrical panels (400A main), roofing (standing seam metal), exterior doors (8x custom aluminum)." Include quantities if known.
```

## Example output from the prototype

From q1 / s1-3 (Material Availability Check):

> Primary materials available. Heads up: Lumber (2×6 SPF) has 2-week lead time at current supplier. Consider pre-ordering. No backorders flagged.

## Production rewrite checklist

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate)
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction
- [ ] Add lane awareness (GC vs. DIY vs. worker) where applicable
- [ ] Test with a real contractor query to validate output quality
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits)

## Related entities (BKG database)

- Materials catalog entities (knowledge engine)
- Supplier entities with lead time / regional availability
- Jurisdictions (for location-aware availability)
- Marketplace listings for comparative pricing
- Typical entity IDs: material SKU / BKG material ID, supplier ID, jurisdiction ID

## Notes

Clear scope. Overlaps heavily with `supply-materials`, `supply-suppliers`, and `supply-leadtimes` in the Plan stage — those run deeper analysis after scope is committed. This one is a pre-bid "red flag" pass and should stay lightweight (fast, binary-ish Green/Yellow/Red). Worth asking in production: should this call out to the same data source as `supply-leadtimes` so the two stay consistent?
