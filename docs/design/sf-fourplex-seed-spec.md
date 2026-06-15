# SF Fourplex — Seed-Data Spec (PROPOSED — founder to LOCK)

*Second canonical demo project, added alongside Marin (which stays per `CLAUDE.md`). This is the reference project for the SF fidelity mockups. It mirrors the structure of `src/lib/seed-data/marin-farmhouse.ts` so the seed lane can build it the same way.*

> **⚠️ EVERYTHING below is PROPOSED.** Numbers are internally consistent and realistic for SF multifamily, but they are NOT locked. Founder confirms/edits, THEN a Code lane writes `src/lib/seed-data/sf-fourplex.ts`. Do not bake these into a seed module before sign-off. Names are example/fictional — confirm or replace. "Demo data must reconcile everywhere" is a locked rule, so the invariants at the bottom must hold after any edits.

## Project meta
| Field | Proposed value | Notes |
|---|---|---|
| `id` | (new UUID — generate at seed time) | not `55730cd3…` (that's Marin) |
| `name` | **SF Fourplex** | working name — confirm (e.g. "Folsom Street Fourplex") |
| `clientName` | (developer entity) | e.g. "Dolores Built LLC" — example, confirm |
| `type` | Ground-up multifamily infill, 4 units | |
| `location` | San Francisco, CA | neighborhood optional (e.g. Mission) |
| `unitMix` | 2× 2BR/2BA + 2× 1BR/1BA | |
| `grossSqft` | 5,200 | |
| `stories` | 4 (3 residential over garage) | |
| `activeStage` | **Build** | matches the mockup |
| `buildProgress` | 42% | schedule progress (journey node) |
| `week` | 6 of 14 | |

## Budget (the load-bearing numbers — must reconcile)
| Constant | Proposed | 
|---|---|
| `TOTAL` | **$3,200,000** |
| `SPENT` | **$1,340,000** |
| `COMMITTED` | **$410,000** |
| `REMAINING` | **$1,450,000** |
| `HEADROOM` (optional, mirrors Marin) | $190,000 |

Project-level spend = 1,340,000 / 3,200,000 = **41.9% ≈ 42%** (this is the figure that feeds the budget readout's "NN% SPENT" and the active stage-chip number).

### Budget lines (CSI-ish divisions; sum to TOTAL)
| Division | Amount | % |
|---|---|---|
| General conditions | 224,000 | 7% |
| Site & foundation | 320,000 | 10% |
| Structure & framing | 512,000 | 16% |
| Envelope (roof / windows / cladding) | 384,000 | 12% |
| MEP (mechanical / electrical / plumbing) | 480,000 | 15% |
| Interiors & finishes | 576,000 | 18% |
| Kitchens & baths (×4 units) | 320,000 | 10% |
| Permits / fees / soft costs | 224,000 | 7% |
| Contingency | 160,000 | 5% |
| **Sum** | **3,200,000** | **100%** |

## Cast (scaled for a 4-unit developer project; mirror Marin's `MARIN_CAST` shape)
All example/fictional — confirm or replace. Roles use the existing `Lane`/`LaneSubtype` model.

| Lane | Who (example) | Subtype |
|---|---|---|
| OWNER | Developer principal + LLC (1–2) | — |
| GC | General contractor (1) | — |
| SUB | Foundation/concrete, Framing, Roofing, Plumbing, Electrical, Drywall/Finish (≈6) | per trade |
| SERVICE-PROVIDER | Architect, Structural engineer (2) | Architect / Engineer |
| SUPPLIER | Lumber/building-supply, Windows (1–2) | Lumber / Windows |
| WORKER | Lead carpenter, Apprentice (1–2) | Laborer / Apprentice |

Each cast member needs: `id, name, role, company?, lane, laneSubtype, joined_at, invited_by, personalizing_detail, status` — same fields as Marin. The `invited_by` graph must close (every ref resolves to another cast id or `'founder'`).

## Owner-lens content (mirror `MARIN_OWNER_LENS`, optional for first pass)
- `welcome_message`, a few `contributions`, and 1–2 `pending_approvals` (e.g. a framing pay-app + a change order), with amounts that fit within the budget lines above.

## Invariants (must hold — `CLAUDE.md` "reconcile everywhere")
- `SPENT + COMMITTED + REMAINING = TOTAL` → 1,340,000 + 410,000 + 1,450,000 = **3,200,000 ✓**
- `sum(budget lines) = TOTAL` → **3,200,000 ✓**
- Every component reads these via `useStageProject()`; switching `?project=` between SF Fourplex and Marin flips ALL dimensions with **no bleed** (this is also an acceptance-gate item in `component-fidelity.md`).
- Zero hardcoding of any project's figures in components.

## Build steps (after founder locks numbers)
1. Create `src/lib/seed-data/sf-fourplex.ts` mirroring `marin-farmhouse.ts` (constants, budget lines, cast, lens).
2. Register it wherever Marin is registered (`getCanonicalProject` / demo-seed) as a *second* selectable project — do NOT replace Marin.
3. Add a module-load invariant check (like Marin's) that warns if the sums drift.
4. Verify `?project=<sf-fourplex-id>` flips every surface; Marin unchanged.

## Visual seed set (portal imagery) — GENERATED 2026-06-14 (local draft)

*The visual parallel to the Marin seed set in `docs/design/seed-and-portals.md` §5. The brand **render register** (warm cream/vellum/brass/amber + teal shadow, no pure white, no red, filmic for heroes / cream-paper ink for studies) is the CONSTANT; only the subject below is the variable layer, derived from this spec (4-unit SF infill, 5,200 sqft, stacked over a garage, **Build / 42%**). Slugs and seeds are deliberately distinct from Marin's so both sets coexist in `brand-assets/assets/bkg/fidelity/` with no collision.*

| slug | kind | seed | model | use |
|---|---|---|---|---|
| `hero-sf-fourplex-golden-a` | hero (16:9) | 430017 | flux-1.1-pro | Builder hero — golden-hour establishing |
| `hero-sf-fourplex-golden-b` | hero (16:9) | 430042 | flux-1.1-pro | Builder hero — dusk, warm interior glow |
| `study-sf-massing-options` | study (4:5) | 780304 | flux-dev | Dream "In motion" — massing trio |
| `study-sf-stacking-clearance` | study (4:5) | 780302 | flux-dev | Dream "In motion" — site/setback + stacking |
| `study-sf-light-well` | study (4:5) | 780303 | flux-dev | Dream "In motion" — light-well daylight section |
| `thumb-sf-site-framing` | thumb (1:1) | 661101 | flux-1.1-pro | field-log / plate |
| `thumb-sf-material-detail` | thumb (1:1) | 661102 | flux-1.1-pro | field-log / plate |
| `thumb-sf-detail-sketch` | thumb (1:1) | 661103 | flux-dev | field-log / plate |
| `gauge-face-primary` | gauge-face | — | (hand-authored) | **reused** — `public/_design-preview/gauge-face-primary.svg` is a brand constant; no SF variant |

Seeds are fixed so a chosen option regenerates byte-similar at production resolution.

### How they were made / how to remake them
The recipe lives in `stage-sf-fourplex-assets.mjs` (repo root) — the SF parallel to `stage-fidelity-assets.mjs`. Exact prompts + params are in that file.

```bash
node stage-sf-fourplex-assets.mjs --dry-run                                 # plan only
node --env-file=.env stage-sf-fourplex-assets.mjs --go                      # generate LOCAL → ./fidelity-out-sf/
node --env-file=.env stage-sf-fourplex-assets.mjs --go --only=study-sf-light-well   # regenerate one
```

**Status:** all 8 generated 2026-06-14 to `./fidelity-out-sf/` (local, draft, NOT committed — binaries are gitignored). **Not uploaded to the shared `brand-assets` bucket and not cataloged** — that is the supervised, founder-run promotion step (`--upload`, then `--catalog --schema-confirmed`). Code never promotes. (`study-sf-massing-options` was re-rolled to seed 780304 with a hardened negative prompt to clear a stray red speck — now clean.)

**Schema confirmed 2026-06-15.** Live `public.brand_assets` does NOT match the original Marin staging script — the catalog insert here is corrected and validated (rolled-back test insert) against the real table: `asset_type` ∈ {`illustration` for hero/thumb, `plate` for study}, `generator='flux'`, `status='draft'` (table default `'working'` is rejected by the CHECK), `rendition_role` ∈ {hero/thumb/original}; required `filename`/`mime_type`/`title`/`key` are set; `key=fidelity.<slug>`; `storage_path=bkg/fidelity/<slug>.png` (assets/ stripped); upsert on `slug`. Provenance moved to `metadata` (no `provenance` column). The Marin script (`stage-fidelity-assets.mjs`) still has the OLD broken insert — Marin's 8 are uploaded to storage but were never cataloged.
