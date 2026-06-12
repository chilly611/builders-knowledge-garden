# `src/garden/` — the garden-engine seam (CODE-2, Phase 0–1)

This directory is the **L2 config-contract seam** from the garden-engine
extraction. Full design: [`docs/garden-engine/`](../../docs/garden-engine/).

```
src/garden/
├─ contracts/   L2 interfaces the engine reads (theme, lifecycle, workflows,
│               roles, knowledge sources, MCP tools, onboarding, GardenConfig)
├─ runtime/     engine-side injection machinery (LifecycleProvider/useLifecycle)
└─ builders/    BKG's implementation of the contracts (the L3 adapters)
```

## What this commit does (Phase 0–1)

- **Phase 0 — architecture lint.** `eslint.config.mjs` forbids the generic
  layers (`src/design-system/**`, `src/components/app-shell/**`) from importing
  builders-specific modules (`lib/lifecycle-stages`, `lib/specialists*`,
  `lib/code-sources`, `lib/knowledge-data`, `lib/stage-*`). Shipped as **`warn`**
  so it surfaces today's 13 violations as a worklist **without breaking the
  lint/push gate**. Flips to **`error`** after Phase 2 cuts the edges.
- **Phase 1 — contracts + the two hot adapters.** Defines every L2 contract and
  implements `buildersLifecycle` (the #1 coupling node — `lifecycle-stages.ts` is
  imported by 20 files) and `buildersRoles`, derived from the existing canonical
  constants so there's exactly one source of truth.

## What it deliberately does NOT do

Nothing consumes these contracts yet — **runtime behaviour is unchanged**, zero
regression risk to the live BKG demo. Phase 2 mounts `<LifecycleProvider>` and
flips the generic consumers onto `useLifecycle()`; Phase 2–3 assemble the rest of
`GardenConfig`. The lint warnings are the Phase 2 worklist.
