# B2: Code Compliance Workflow
**Lane C executor:** C2 | **Depends on:** C1 spine | **Demo target:** CA Title 24 Part 6 §110.10 (solar mandate) for Marin farmhouse

## 90-second demo flow
1. (0:00-0:10) ProjectContextBanner reads "Modern farmhouse · Marin County, CA · ~2,800 sf". Picker auto-resolves to a Marin/CA entry.
2. (0:10-0:35) GC voice-asks: "What does Title 24 say about solar on a new farmhouse this size?" Transcribes into scope field.
3. (0:35-1:05) StepCard thinks; specialist returns narrative leading with verdict + cites CA Title 24 Part 6 §110.10 + CEC 2022 Art. 690. Pro Toggle reveals JSON.
4. (1:05-1:30) "Next: Electrical specialist deep-dive" CTA. Time Machine footer shows actions recorded.

## Project context consumption
Workflow already calls `useProjectWorkflowState({ column: 'code_compliance_state', workflowId: 'q5' })`. Existing useEffect (lines 78-98 of CodeComplianceClient) substring-matches `project.jurisdiction` against `JURISDICTIONS`. **Action:** verify a Marin-tagged jurisdiction exists in `knowledge-data.ts`; if not, add `ca-marin` row pointing at CBC 2022 + Title 24.

## Multi-source verification — decision
**Ship with BKG seed + local amendments only.** ICC/NFPA adapters return empty (graceful via Promise.allSettled). Narrate "multi-source" as roadmap. Citation strip already shows confidenceTier.

## Supabase seed verification
Pre-demo: query `SELECT COUNT(*) FROM knowledge_entities WHERE entity_type='building_code' AND (metadata->>'adopted_by')::jsonb ?| array['ca-la','ca-sf','ca-sd'];` Expect ≥50. If empty, run `node scripts/seed-code-entities.mjs`.

C2 sub-task: extend `seed-code-entities.mjs` to add `"ca-marin"` to the `adopted_by` arrays on ~10 demo-critical CA entries (Title 24 §110.10, CBC §1613 seismic, CEC Art. 690, GFCI/AFCI).

## Failure modes
- LLM timeout >15s: "Taking longer than the inspector usually does — try again." Retry button. Question preserved.
- Malformed JSON: fall back to narrative-only render (existing behavior). Citation strip hides.
- Zero results from queryAllSources: specialist injects confidence:low → UI shows "I don't have a cross-verified answer for [jurisdiction] yet. Call your building department."
- Jurisdiction unmatched: falls back to ibc-2024 + banner "Using IBC 2024 baseline — confirm Marin amendments with building dept."

## Files to touch
- `src/lib/knowledge-data.ts` — add `ca-marin` jurisdiction entry
- `scripts/seed-code-entities.mjs` — append `"ca-marin"` to ~10 CA entities' adopted_by
- `src/app/killerapp/workflows/code-compliance/CodeComplianceClient.tsx` — verify project.jurisdiction useEffect token-match handles "Marin"; add fallback banner

## Acceptance criteria
- Pre-demo SQL returns ≥50 CA building_code rows, ≥1 with ca-marin tag
- Loading `/killerapp/workflows/code-compliance?project=<marin-id>` auto-selects CA jurisdiction
- Demo query returns narrative + ≥1 cited section + confidence
- Pro Toggle reveals JSON
- Mock specialist works without ANTHROPIC_API_KEY (offline-safe backup)
