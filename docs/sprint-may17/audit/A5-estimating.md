# A5 — Estimating Workflow Audit

## Executive summary

The estimating workflow (q2, step s2-6) **flows end-to-end successfully** but with a critical structural misalignment: the v2 prompt (JSON-only output) contradicts the text parser that expects a human-readable "Rough total:" line. Both paths work in isolation — the parser tolerates either format — but the pipeline lacks a unified contract.

## Voice → estimate flow

1. User provides project description (text or voice) → step s2-1
2. Steps s2-2 through s2-5 collect location, sqft, trades, files
3. Step s2-6 (`analysis_result`, promptId `estimating-takeoff`) calls `callSpecialist('estimating-takeoff', context)`
4. Specialist runner loads v2 prompt (production default per `specialists.ts:85`)
5. Claude returns JSON in markdown fence (` ```json...``` `)
6. Runner parses JSON (`EstimatingClient.tsx:386-391` handles both `<json>` tags and markdown fences)
7. `parseRoughTotal(payload.input)` extracts `rough_total` (line 201)
8. `recordMaterialCost()` writes to budget (line 205-211)
9. Budget snapshot refreshes

**Result:** works. End-to-end <5s.

## Dual-path problem

Two prompt versions ship simultaneously:

- **v2 prompt** (`estimating-takeoff.v2.md`): JSON-only output inside markdown fences
- **production prompt** (`estimating-takeoff.production.md`): markdown table + human prose + "Rough total: $XXXk" anchor line

Runtime defaults to v2 (`specialists.ts:85`), but `parseRoughTotal()` (lines 84-101) targets production format:

```typescript
const anchored = text.match(/Rough total:\s*(\$[\d,]+\.?\d*k?)/i);   // production fmt
const candidate = anchored?.[1] ?? text.match(/\$[\d,]+\.?\d*k?[^$]*$/)?.[0];  // fallback
```

**Parser never reads the JSON structure.** If v2 lands raw JSON in `payload.input`, the regex finds the first/last `$` figure in the prose preamble — which may be wrong. Masked in production because v2 also includes narrative prose with dollar figures.

## CSI / division handling: not present

No CSI division parsing in the codebase. Grep for `csi`, `CSI`, `division` returned zero results in `src/`. Budget schema (`budget-spine.ts`) uses flat `BudgetCategory` enum (materials, labor, permits, equipment, subcontractor, overhead, other). No trade-specific divisions.

The takeoff prompt instructs AI to label line items "Framing", "Electrical", etc., but no downstream code maps these to CSI categories. UI renders as flat text in narrative; budget stores lump-sum under `materials`.

## Calibration against BUILDING_TYPES

| Type | `knowledge-data.ts` range | v2 few-shot | Production few-shot |
|---|---|---|---|
| SFR | $150-$400/sf | not shown | not shown |
| ADU | $200-$500/sf | 2,500 sqft @ $19/sf — IMPLAUSIBLE | 2,500 sqft @ $208/sf — in-range ✓ |
| Office | $250-$600/sf | not shown | not shown |

**No regional multiplier calibration baked into either prompt.** SF coastal premium, Phoenix labor index, Vegas dust palliative not captured.

## Worst-case bad estimate

1. **Ambiguous scope + default assumptions.** "Remodel a house, San Diego" → v2 returns ~$45k (kitchen-remodel anchor). Reality $150-$400k. Demo recorded at 11% of actual.
2. **JSON parsing failure.** v2 returns pure JSON. `parseRoughTotal` matches `$350` inside `"$52350"`. Budget records $350; actual $52,350.
3. **Regional multiplier ignored.** SF project (1.25× labor index) priced at national average. $87.5k estimate when reality is $110k+.

## Recommendation for demo

1. **Unify output format.** Commit to v2 JSON-only and update `parseRoughTotal()` to read `structured.rough_total` directly (no regex).
2. **Add scope validation.** Reject vague inputs ("remodel a house") with a clarification prompt.
3. **Inject regional cost index.** Pass multiplier from `knowledge-data.ts` BUILDING_TYPES into prompt context.
4. **Test the three demo projects:**
   - Marin farmhouse (1,800 sf SFR @ ~$470/sf → $850k mid)
   - ADU in Sausalito (700 sf ADU @ ~$360/sf → $250k mid)
   - Commercial TI in SoMa (8,400 sf office @ ~$135/sf → $1.13M mid)
   Each is now seeded with `estimated_cost_low/high` so the demo can compare estimator output to the pre-seeded range.

Workflow is **defensible for a 30-second demo** if you cherry-pick a clear scope. Breaks visibly on vague input or extreme regional cases.
