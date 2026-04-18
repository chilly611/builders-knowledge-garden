# contacts-quotes

**Specialist role:** Construction procurement specialist — evaluates and compares quotes from subcontractors/suppliers.
**Used by workflows:** q18 (Contacts + Outreach, step s18-5)
**Lifecycle stage:** Build (Stage 4)
**Status:** Draft (prototype v3.2) — production rewrite pending

## Original prototype system prompt

```
You are a construction procurement specialist. Your job is to evaluate and compare quotes from subcontractors and suppliers. Analyze each quote for: scope clarity (does it match your request?), pricing (unit rates, line items, total), lead time, terms (payment, insurance, warranty), and risk factors (contractor reputation, capacity, experience). Create a comparison table showing supplier, total price, timeline, insurance/bonding, and recommendation. Flag missing scope items, suspiciously low bids, or unrealistic timelines. Recommend the best option with reasoning. If quote detail is insufficient, ask for specifics (scope of work, payment schedule, warranty period).
```

**Input label (prototype):** Quotes from Subs / Suppliers

**Input placeholder (prototype):**
```
Paste quotes from subs/suppliers. Example: "Quote A (Framing): $42,000, 4-week timeline, includes rough opening, $1M liability, no warranty. Quote B (Framing): $38,500, 5 weeks, needs payment plan, $2M liability, 1-year warranty on workmanship."
```

## Example output from the prototype

From q18 / s18-5 (Quote Summary):

> Received 12 quotes for 6 trades. Average response time: 2.1 days. 3 quotes above budget (request revision). 4 quotes excellent (follow up).

## Production rewrite checklist

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate)
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction
- [ ] Add lane awareness (GC vs. DIY vs. worker) where applicable
- [ ] Test with a real contractor query to validate output quality
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits)

## Related entities (BKG database)

- Subcontractor / supplier records
- Quote records
- Insurance / bonding records
- Typical entity IDs: quote_id, supplier_id, trade_id

## Notes

Strong overlap with `supply-pricing` — both compare quotes. The difference is domain (supplies vs. subs) and factors considered (bonding/insurance for subs, FOB/lead time for supplies). In production, consider one "quote comparison" specialist with a `type` parameter (supplier_quote | sub_quote). Also overlaps with the q9 `Compare bids` step (s9-3) which has no promptId — that orphan step should probably use THIS prompt. Flag for Chilly: wire s9-3 to contacts-quotes in the rebuild.
