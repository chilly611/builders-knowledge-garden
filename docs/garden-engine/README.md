# Garden Engine Extraction (CODE-2)

Plan to separate the reusable **garden engine** from **builders-specific** modules,
so a new garden (killer app + dream machine) can be scaffolded in days and themed by
tokens — with zero regression risk to the live BKG demo.

Built from a full read of the BKG repo at `origin/main` (`55a50bd`). This is an
analysis + plan deliverable; **no application code is changed by this branch.**

| Doc | What it answers |
|---|---|
| [00-EXTRACTION-PLAN.md](00-EXTRACTION-PLAN.md) | The phased, zero-regression plan; principles; decisions to confirm; risk register. |
| [01-DEPENDENCY-GRAPH.md](01-DEPENDENCY-GRAPH.md) | The 4-layer model; generic-vs-specific classification of every module; the **coupling edges to cut**. |
| [02-REPO-LAYOUT.md](02-REPO-LAYOUT.md) | Recommended monorepo layout; the **config contracts** a garden supplies; the "scaffold in days" workflow. |

## TL;DR

BKG is ~70% a generic knowledge-garden platform in a construction costume. The
schema, verification pipeline, auth/tenancy, theming machinery, discovery surface,
and app shells are domain-neutral. The blocker isn't tangled logic — it's that a few
*generic* files **import** the construction modules (mostly `lib/lifecycle-stages.ts`,
hit by 20 files including 4 design-system components). Invert those into injected
config (one `useLifecycle()` context kills ~11 of 13 edges), refactor in place,
verify BKG, then physically lift the engine into `packages/garden-engine`.
