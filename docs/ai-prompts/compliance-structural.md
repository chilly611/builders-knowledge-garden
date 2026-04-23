---
prompt_version: v1
---

<!-- DEFENSIBILITY SELF-EVAL -->
Is this output defensible against ChatGPT for a working contractor?
STATUS: DRAFT
BECAUSE: Prototype scope; no entity-ID gating to BKG IBC/IRC database or jurisdiction-specific amendments. Uses generic code citation knowledge.
PROMISE: Identifies applicable code sections for structural scope by scope element, cites IBC/IRC sections, and flags items requiring structural engineering review.
LANE: agnostic

# compliance-structural

**Specialist role:** Code compliance expert in structural systems — identifies applicable IBC/IRC sections for a structural scope.
**Used by workflows:** q5 (Code Compliance Lookup, step s5-1)
**Lifecycle stage:** Lock (Stage 2)
**Status:** Draft (prototype v3.2) — production rewrite pending

## Original prototype system prompt

```
You are a code compliance expert in structural systems (IBC/IRC). Your job is to identify applicable code sections for the described structural scope. Reference the International Building Code (IBC) or International Residential Code (IRC) depending on project type. For each scope element, cite specific code sections and key requirements: load paths, bearing, bracing, foundation types, framing methods, etc. Flag items requiring structural engineering review or special inspections. Keep citations specific and actionable. If scope is vague, ask for clarification on building type, occupancy, and size.
```

**Input label (prototype):** Structural Scope Description

**Input placeholder (prototype):**
```
Describe structural scope. Example: "2-story residential wood frame, addition to existing house, new foundation slab on grade, 28' clear-span truss roof, removing interior bearing wall."
```

## Example output from the prototype

From q5 / s5-1 (Structural Code Check):

> IBC Section 1607: Live loads verified for residential occupancy. IRC R602.3: Wall framing spacing compliant at 16" OC. No seismic design category upgrades required for this jurisdiction.

## Production rewrite checklist

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate)
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction
- [ ] Add lane awareness (GC vs. DIY vs. worker) where applicable
- [ ] Test with a real contractor query to validate output quality
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits)

## Related entities (BKG database)

- BKG knowledge engine: 2,847 code sections, 142 jurisdictions
- IBC / IRC code section entities (`compliance` table)
- Jurisdiction entities with local amendments
- Inspection sequence entities (tied to jurisdiction + scope)
- Typical entity IDs: ibc_section_1607, irc_r602_3, jurisdiction_id, amendment_id

## Notes

One of the Week 2 priority prompts (Code Compliance Lookup is the Week 1 ship). Revenue plan depends on this. The prototype fakes the code lookup — production needs to RAG against the actual 2,847-section code database. Critical to verify: does the database cover all 50 states' amendments? Per tasks.todo.md, there are "142 jurisdictions" which is a lot but not all 20,000+ AHJs in the US. Flag for Chilly: scope the Week 1 launch to jurisdictions actually loaded, and communicate that boundary to users.
