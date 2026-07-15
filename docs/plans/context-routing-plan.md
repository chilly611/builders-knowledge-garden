# Context-Routing Plan — make stage tools reflect the active project

_Status: read-only analysis + plan. **No code changes in this doc.**_
_Author: Cowork (Opus). Code read at `feat/shared-app-shell` (`d1b63d4`), which is an ancestor of `main` (`4fa7839`) — the seal/homepage commits between them do not touch stage code, so this analysis applies to `main`._

---

## 1. Symptom

Every project — regardless of building type or jurisdiction — shows: the **same building codes** (always San Francisco), the **same cost-split %**, and the **same Marin dollar figures** ($1.65M / $312K, etc.). Earlier instance on record: `docs/session-log.md:1956` — an SF ADU rendered the code tool as **Santa Monica** with SF body text (a context-routing miss in the same family).

## 2. Root cause (with citations)

The stage pages and their tools read project data from **compile-time constants**, not from the active project.

**a) All 7 stage pages import the Marin fixture and use it directly.**
`src/app/killerapp/stages/{size-up,lock,plan,build,adapt,collect,reflect}/page.tsx` all `import { MARIN_PROJECT, MARIN_PROJECT_ID, MARIN_BUDGET_TOTAL, MARIN_BUDGET_SPENT, MARIN_PLAN_PHASES } from '@/lib/demo/marin-4000'` and pass them straight into `StageShell` and the tools:
- `adapt`, `collect`, `reflect`, `build`: fully hardcoded — `projectId={MARIN_PROJECT_ID}`, `initialBudget={MARIN_BUDGET_TOTAL}`, `budgetSpent={MARIN_BUDGET_SPENT}`, `projectMeta={…MARIN_PROJECT.sqft… MARIN_PROJECT.jurisdiction}`. No active-project read at all.
- `size-up` (`:279`) and `lock` (`:154`): **do** resolve `const id = readActiveProjectId() ?? MARIN_PROJECT_ID` and `size-up` fetches a per-project jurisdiction/intake record `j` (overriding sqft/jurisdiction/buildingType) — but they **fall back to Marin** when absent and still hardcode `budgetSpent={MARIN_BUDGET_SPENT}` (`size-up:310`, `lock:181`).

**b) The "canonical project" loader is Marin-only.**
`src/lib/projects/getCanonicalProject.ts` — `getCanonicalProject(): KacProject` takes **no `projectId`** and returns only the Modern Farmhouse in Marin (built from `@/lib/seed-data/marin-farmhouse` constants). There is no `getProject(id)`. So the one "project loader" is Marin by definition.

**c) The code tool is hardcoded to San Francisco.**
`src/components/stage-kit/CodeLookup.tsx` imports `SF_CODE_TOPICS, SF_JURISDICTION_LABEL` from `./code-data` and renders the jurisdiction badge as `SF_JURISDICTION_LABEL` ("San Francisco, CA") and queries the specialist with `jurisdiction: SF_JURISDICTION_LABEL` — **always**, ignoring the project. `code-data.ts` defines **only** `SF_*` topics; there is no per-jurisdiction set. `projectType` is the *only* project signal passed through (to the AI narrative); topics, label, and citations are SF-locked.

**d) Cost-split comes from the static Marin phases.**
`plan/page.tsx:164` seeds `useState<PlanPhase[]>(MARIN_PLAN_PHASES)` and computes the budget/schedule from it — same phase split for every project.

**e) Lane and ProjectContext never reach the stage pages.**
No stage page imports `useUserLane` or `ProjectContext` (grep across `src/app/killerapp/stages/` is empty). Stages are lane-neutral and do not consume the active-project context object. (Lane gating lives upstream in `LaneRouter`/owner-home, not in stage tools.)

### How the four dimensions actually flow today
| Dimension | Reaches the stage tools? | Mechanism / gap |
|---|---|---|
| **active-project** | 2 of 7 pages read the *id* (`size-up`, `lock`); 0 of 7 load its *data* | `readActiveProjectId()` exists; but data still comes from `MARIN_*` constants |
| **building-type** | captured in `size-up` intake (`inferBuildingType`) but **not propagated** | not threaded into Lock/Plan/Build tools or the cost-split |
| **jurisdiction** | **no** — `CodeLookup` is SF-hardcoded | `code-data.ts` has only `SF_*`; label + specialist query ignore the project |
| **lane** | **no** | stages don't read `useUserLane`; intentionally lane-neutral, so not the bug — but worth stating |

**One-line root cause:** the stage tools consume `MARIN_*` / `SF_*` constants instead of the active project's record, so the project's real building-type, jurisdiction, and budget never reach them. There **is** a real per-project substrate that is simply not read here: `command_center_projects` (DB), `project_budget_lines` via `src/lib/budget-spine.ts` (per-`project_id` budget), `getActiveProjectId()` (`budget-spine.ts:199`, `crm-spine.ts:138`), and the jurisdiction/intake record `size-up` already fetches.

## 3. Minimal wiring change

The smallest change that breaks "same everything" without re-architecting:

1. **Add a per-project loader** — generalize the Marin-only helper into `getProject(projectId): KacProject` (or `loadStageProject(id)`) that returns the normalized shape `{ id, name, jurisdiction, projectType, sqft, budget:{total,spent,…}, planPhases/costSplit }` from the per-project source (`command_center_projects` + `project_budget_lines`/`budget-spine`, with the existing `getCanonicalProject()` as the **fallback** when `id` is the canonical Marin id or no active project is set). Keeps the anti-drift guarantee the current helper documents.
2. **Make all 7 stage pages resolve the active project** the way `size-up`/`lock` already do (`readActiveProjectId() ?? MARIN_PROJECT_ID`) and feed `StageShell` + tools from the loader instead of `MARIN_*` — including `budgetSpent` (today hardcoded even in the two "wired" pages).
3. **Pass real jurisdiction + projectType into `CodeLookup`** (props), drive the badge/label and the specialist `jurisdiction` arg from the project, and make `code-data.ts` jurisdiction-keyed — minimally, fall back to a generic IRC/IBC topic set + the project's jurisdiction label when no curated rows exist for that jurisdiction (full curated sets per jurisdiction are a later follow-up).
4. **Source the cost-split from the project/building-type** rather than `MARIN_PLAN_PHASES` (e.g. a building-type default split, or the project's `project_budget_lines` roll-up).

## 4. Files involved

- `src/lib/projects/getCanonicalProject.ts` — generalize to `getProject(id)` + keep canonical fallback. **(core)**
- `src/lib/demo/marin-4000.ts` — keep as the fallback fixture; stop being the direct import target of the stage pages.
- `src/app/killerapp/stages/{size-up,lock,plan,build,adapt,collect,reflect}/page.tsx` — 7 pages: read active id + load via the new loader; remove direct `MARIN_*` (keep as fallback only). **(mechanical, 7×)**
- `src/components/stage-kit/CodeLookup.tsx` + `src/components/stage-kit/code-data.ts` — jurisdiction prop + jurisdiction-keyed topics/label. **(core)**
- `src/app/killerapp/stages/plan/page.tsx` (cost-split) + the phases source — per-project/building-type split.
- `src/components/stage-shell/StageShell.tsx` + `stage-chrome-context.tsx` — no change needed structurally (budget already flows page→chrome via `setBudget`); just feed per-project totals from the page.
- Supporting reads: `src/lib/budget-spine.ts` (`getActiveProjectId`, `project_budget_lines`), `command_center_projects` (DB) — already exist; just consumed.

## 5. Staged plan (no code in this doc)

- **Stage 0 — loader (additive, low risk).** Add `getProject(id)` returning the normalized shape with Marin fallback. Unit-test the fallback + a non-Marin id. Nothing else consumes it yet.
- **Stage 1 — migrate the 5 fully-hardcoded reads.** `adapt/collect/reflect/build` (+ tighten `size-up`/`lock` to stop hardcoding `budgetSpent`) to read active id + loader. Marin remains the no-active-project fallback. Visible win: budget figures vary by project.
- **Stage 2 — jurisdiction-aware codes.** Prop-drill `jurisdiction` (+ keep `projectType`) into `CodeLookup`; badge/label/specialist query use it; `code-data.ts` returns curated rows when present else a generic set. Visible win: codes/label match the project's jurisdiction.
- **Stage 3 — cost-split.** Replace `MARIN_PLAN_PHASES` with a per-project / building-type split. Visible win: split % varies.
- **Stage 4 — verify.** Drive 3 project types (SF ADU, Marin farmhouse, a commercial/multifamily) and assert numbers, codes, and split **differ**. The harness already exists: branch `test/e2e-consistency` + the "BKG Playwright consistency harness" session — extend it with a per-project-divergence assertion rather than the current single-canonical check.

**Guardrails for whoever implements:** keep Marin as the explicit fallback (don't break the canonical demo); preserve `getCanonicalProject`'s anti-drift contract (canonical budget constants, not line-item roll-ups); changes are additive prop-drilling + one loader — no schema changes required (the per-project tables already exist).
