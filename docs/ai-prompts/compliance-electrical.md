---
prompt_version: v1
---

<!-- DEFENSIBILITY SELF-EVAL -->
Is this output defensible against ChatGPT for a working contractor?
STATUS: DRAFT
BECAUSE: Prototype scope; no entity-ID gating to BKG NEC database or jurisdiction-specific amendments. Uses generic NEC citation knowledge that ChatGPT also knows.
PROMISE: Identifies applicable NEC articles and requirements for electrical scope by scope element, cites specific articles/sections, and flags items requiring licensed electrician.
LANE: agnostic

# compliance-electrical

**Specialist role:** NEC compliance specialist — identifies NEC articles and requirements for an electrical scope.
**Used by workflows:** q5 (Code Compliance Lookup, step s5-2)
**Lifecycle stage:** Lock (Stage 2)
**Status:** Draft (prototype v3.2) — production rewrite pending

## Original prototype system prompt

```
You are a National Electrical Code (NEC) compliance specialist. Your job is to identify applicable NEC articles and requirements for the described electrical scope. Reference the current NEC code. For each scope element, cite specific articles and sections: panel sizing, GFCI/AFCI requirements, outlet spacing, wire sizing, disconnect means, grounding, etc. Flag items requiring licensed electrician involvement or special permitting. Format output as scope element → applicable NEC section(s) → requirement. If scope is unclear, ask for details on building type, service size, and load characteristics.
```

**Input label (prototype):** Electrical Scope Description

**Input placeholder (prototype):**
```
Describe electrical scope. Example: "Kitchen renovation with 6 new circuits, 2 new 240V outlets (range, dryer), adding exterior outlet, upgrading main panel from 100A to 200A."
```

## Example output from the prototype

From q5 / s5-2 (Electrical Code Check):

> NEC Article 210: Branch circuits compliant. GFCI protection required in kitchen, bath, garage, outdoor (210.8). AFCI required for bedrooms (210.12). Service panel sizing adequate at 200A.

## Production rewrite checklist

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate)
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction
- [ ] Add lane awareness (GC vs. DIY vs. worker) where applicable
- [ ] Test with a real contractor query to validate output quality
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits)

## Related entities (BKG database)

- NEC article entities (e.g., Article 210, 250, 310)
- Jurisdiction-specific amendments to NEC (adoption year varies by state)
- License requirements per jurisdiction
- Typical entity IDs: nec_article_210, nec_section_210_8, jurisdiction_id

## Notes

NEC adoption lags — not every state uses the same NEC edition. Production needs to resolve: "what NEC edition applies to the contractor's state/county/city?" The prompt says "Reference the current NEC code" which is ambiguous. Fix in production: have the prompt explicitly ask for / receive the jurisdiction so it can pin to the correct edition. This is a great candidate for the Week 1 Code Compliance Lookup launch because electrical is a high-frequency pain point for every trade.
