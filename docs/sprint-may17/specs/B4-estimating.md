# B4: Estimating — voice → JSON takeoff → CSI breakdown
**Lane C executor:** C4 | **Depends on:** C1 spine | **Demo:** Marin farmhouse 30s voice → believable estimate

## 30-second demo flow
1. GC opens `/killerapp/workflows/estimating?project=<id>`, ProjectContextBanner shows scope
2. Taps voice at s2-6, speaks "1800sf modern farmhouse in Marin, slab, 3 bed 2 bath, mid-grade"
3. AI streams narrative + ends with `<estimate>...</estimate>` JSON block
4. UI renders parsed total reveal card + CSI division table
5. `handleStepComplete` calls `recordMaterialCost({ amount: total, ... })`; budget chip updates: "Just recorded $452,000 from the AI takeoff"

## Specialist prompt update — `docs/ai-prompts/estimating-takeoff.production.md`
Append HARD-REQUIRED structured block AFTER markdown narrative:
```
<estimate>
{
  "total": 452000,
  "currency": "USD",
  "csi_divisions": [
    { "code": "03", "name": "Concrete", "low": 22000, "high": 28000 },
    { "code": "06", "name": "Wood, Plastics, Composites", "low": 48000, "high": 56000 },
    ...
  ],
  "confidence": 0.82
}
</estimate>
```

Hard Rule 8: "Every response MUST end with `<estimate>...</estimate>` block with valid JSON. No prose after closing tag." Map existing 13-trade table to CSI MasterFormat 16-division (03 Concrete, 06 Wood, 07 Thermal, 08 Openings, 09 Finishes, 15 Mech, 16 Elec). Promote `.production.md` to canonical; deprecate `.md` + `.v2.md`.

## Parser update (EstimatingClient.tsx)
Introduce `parseEstimateBlock(text): { total, csiDivisions, confidence } | null`:
1. Try parseEstimateBlock first (JSON.parse between `<estimate>` and `</estimate>`)
2. Fall back to existing `parseRoughTotal()` regex
3. If both fail: inline "Couldn't parse — give me a budget range?" manual $ input

## CSI division UI
Render under `lastRecordedAmount` chip. Table: Division (code + name) | Range ($low-$high) | % of total (midpoint/total). Mobile: stack to 2-line rows.

## Budget write
V1: single `recordMaterialCost` with total. lifecycleStageId=1 (Size Up → DREAM). isEstimate=true. **P2 next sprint:** per-CSI-division writes with category mapping.

## Files
- `docs/ai-prompts/estimating-takeoff.production.md` — add Hard Rule 8 + CSI mapping
- `src/app/killerapp/workflows/estimating/EstimatingClient.tsx` — parseEstimateBlock + CSI table + parse-failure prompt
- `src/lib/budget-spine.ts` — JSDoc note about P2 per-division writes

## Acceptance criteria
- Voice in → estimate out in <15s
- Budget pill shows new line item
- CSI table renders ≥8 rows summing 100% ±2%
- Refresh = persisted
- Force-fail JSON block: regex fallback still records
- Force-fail both: manual prompt
