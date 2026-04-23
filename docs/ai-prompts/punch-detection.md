---
prompt_version: v1
---

<!-- DEFENSIBILITY SELF-EVAL -->
Is this output defensible against ChatGPT for a working contractor?
STATUS: DRAFT
BECAUSE: Prototype scope; no entity-ID gating to BKG defect taxonomy or historical punch data. Uses generic industry terminology for defect categorization.
PROMISE: Generates detailed punch list from site observations or photos; describes deficiency, assigns responsible trade, severity level (Critical/Major/Minor), and corrective action.
LANE: GC

# punch-detection

**Specialist role:** Construction punch-list specialist — generates a detailed punch list from site observations or photo descriptions.
**Used by workflows:** q24 (Photo-to-Punch-List, step s24-2)
**Lifecycle stage:** Collect (Stage 6)
**Status:** Draft (prototype v3.2) — production rewrite pending

## Original prototype system prompt

```
You are a GC doing final walkthrough on a project. Your job is to generate a detailed punch list from the provided site observations or photo descriptions. For each deficiency or incomplete item: describe what's wrong, identify which trade is responsible (framing, MEP, drywall, finishes), assign severity (Critical/Major/Minor based on safety, function, appearance), and recommend corrective action. Organize punch list by trade and severity. Use industry standard terminology. Flag items that may indicate larger issues (e.g., nail pops = settling/framing issue). If observations are vague, ask for specific locations and details.
```

**Input label (prototype):** Site Observations / Photo Descriptions

**Input placeholder (prototype):**
```
Describe what you see in photos or during walkthrough. Example: "Interior: drywall has several nail pops in second-floor bedroom, caulk missing around kitchen window, electrical outlet loose in hallway. Exterior: paint inconsistency on north wall, gutters not hanging straight, one downspout disconnected."
```

## Example output from the prototype

From q24 / s24-2 (Punch List Detection):

> Analyzed 47 photos. Detected 12 potential punch items: 3 drywall gaps, 2 trim misalignments, 4 paint issues, 3 outlet cover gaps. See detail view.

## Production rewrite checklist

- [ ] Rewrite in BKG voice (warm, builder-first, plain language; NOT corporate)
- [ ] Instruct the AI to cite BKG database entity IDs with timestamps and jurisdiction
- [ ] Add lane awareness (GC vs. DIY vs. worker) where applicable
- [ ] Test with a real contractor query to validate output quality
- [ ] Package for Building Intelligence API exposure (input/output schema, rate limits)

## Related entities (BKG database)

- punch_items
- Photo / inspection_records
- Trade taxonomy
- Typical entity IDs: punch_item_id, project_id, trade_id, photo_id

## Notes

The prototype says "Analyzed 47 photos" — this implies a vision model reads actual photos. The current system prompt is text-only. In production, the prompt should be rewritten as a vision prompt (multimodal Claude) that actually ingests the photos. This is a significant architecture choice — flag for Chilly: will punch-detection use vision models or only text descriptions? The output is much more valuable with vision.
