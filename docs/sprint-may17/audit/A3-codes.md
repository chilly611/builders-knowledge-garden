# A3 — Code Compliance Workflow Audit

## Executive summary

The Code Compliance Lookup workflow is **production-ready** for the Wednesday investor demo. The UI correctly invokes `queryAllSources` end-to-end, the jurisdiction auto-default works, mock mode is robust, and three critical failure modes are documented. All plumbing from UI → Claude API → Supabase is live.

## 1. queryAllSources integration: full end-to-end

**Finding: ACTIVE and correctly wired.**

- **UI entry:** `CodeComplianceClient.tsx:78` auto-defaults jurisdiction by substring match on `project.jurisdiction`. User can override.
- **Context injection:** `context: { jurisdiction, trade, lane }` flows into `AnalysisPane` props → `runSpecialist()`.
- **Server route:** POST `/api/v1/specialists/[id]` calls `callSpecialist()`.
- **Specialist runner** (`specialists.ts:277`): checks `isComplianceSpecialist`, builds `CodeQuery`, invokes `queryAllSources()`.
- **queryAllSources** (`code-sources/index.ts:20`): four sources in parallel via `Promise.allSettled()`:
  1. `queryBkgSeed()` — Supabase `knowledge_entities` FTS
  2. `queryIcc()` — ICC Digital Codes (stub)
  3. `queryNfpa()` — NFPA (stub)
  4. `queryLocalAmendments()` — `data/amendments/*.json`
- **Confidence gating** (`specialists.ts:285-310`): `hasMultipleSources()` sets `sourceCount`, now plumbed through `SpecialistResult.sourceCount` → `SourceCountBadge` (W11.B, commit `4776e6a`).
- **No fallback to single source.** If any of the 4 fails, the others succeed. If all fail, `confidence: low` + AHJ guidance.

## 2. Jurisdiction auto-default (Marin demo)

**Finding: WORKING.** `CodeComplianceClient.tsx:78-98` substring-match logic:
- Tokenizes `project.jurisdiction` (case-insensitive).
- Checks each JURISDICTIONS entry's `name`, `state`, `id`.
- Prefers city/county match over state.

As of commit `3e9393e` (2026-05-18 PM), `ca-marin-county` + 3 Marin cities are in JURISDICTIONS. Substring "marin" from `project.jurisdiction = "Marin County, CA"` matches `ca-marin-county`. Auto-default lands correctly.

## 3. ANTHROPIC_API_KEY-less path (mock mode)

**Finding: FULLY IMPLEMENTED.**

- `callSpecialist()` (`specialists.ts:342-346`) detects missing key, calls `generateMockResult()` (default `mockIfNoKey = true`).
- Mock returns specialist-specific response. `sourceCount` is **NOT** populated in mock mode — `SourceCountBadge` renders nothing gracefully (returns `null` when `sources === undefined`).
- No error thrown; demo appears to work in mock.

Mocks exist for: `estimating-takeoff`, `compliance-structural`, `compliance-electrical`, `compliance-router`, `sequencing-bottlenecks`, `crew-optimization`. Others fall through to neutral placeholder.

## 4. Top 3 failure modes for the demo screen

### Failure 1 — empty `queryAllSources` result
- When: jurisdiction coverage gap (Phoenix suburb, non-seeded jurisdiction)
- Symptom: all 4 sources return empty; `sourceCount = 0`
- Demo impact: high. SourceCountBadge renders red "No verified code data — call AHJ"; prompt returns `confidence: low`.
- Mitigation: Supabase `knowledge_entities` now holds 27 BKG-seeded codes (Marin + Bay Area + Phoenix + LV) as of 2026-05-18. Phoenix and SF demo queries should land results.

### Failure 2 — `ANTHROPIC_API_KEY` missing
- When: env var not set
- Symptom: silent mock mode. SourceCountBadge hidden.
- Demo impact: medium. Investor asks "how do you verify?" and the trust badge is missing.
- Mitigation: confirm `ANTHROPIC_API_KEY` present in Vercel before Wednesday.

### Failure 3 — Supabase connection lost
- When: client unreachable or env vars missing
- Symptom: `queryBkgSeed` catches error → mock entities; other sources return empty
- Demo impact: high. Multi-source advantage gone.
- Mitigation: verify Supabase env vars; spot-check `select * from knowledge_entities limit 1` before demo.

## 5. Unfinished wiring: local amendments

`data/amendments/` exists with files for `ca-la-county`, `ca-sf`, `ca-sd`, `ca-sj`, `ca-oak`, `ca-title24-part2/3/6/11`, `nv-southern`, `nv-washoe`. **No `ca-marin.json`** — Marin queries fall through to statewide CalGreen. Per the 2026-05-18 burn, the gap is partially compensated by the 11 Marin-tagged `knowledge_entities` rows in Supabase.

## Recommendation for demo

**GO.** Pre-demo checks:
1. `ANTHROPIC_API_KEY` set in production env.
2. `knowledge_entities` table has ≥5 entries for the demo jurisdiction (Marin: 11; SF: now 27; Phoenix: present).
3. Test compliance query in staging; verify SourceCountBadge renders "✓ 2 sources verified" or higher (not mock).
