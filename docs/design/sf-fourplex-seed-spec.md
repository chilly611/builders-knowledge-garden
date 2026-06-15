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
