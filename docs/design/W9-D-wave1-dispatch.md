# W9.D Wave 1 Dispatch — Visual Transformation Primitives

**Date:** 2026-04-23
**Pattern:** W9.C disjoint-scope parallel-lane (6 agents, Wave 1 = primitives; Wave 1.5 = chrome integrator).
**Collision rule:** `src/app/killerapp/layout.tsx` is OWNED by Wave 1.5. No Wave 1 lane touches it.

## Canonical references (inline, do not re-derive)

**Palette (W8 lock):**
- Navy `#1B3B5E` · Navy Deep `#0E2A47`
- Trace `#F4F0E6` · Graphite `#2E2E30` · Faded Rule `#C9C3B3`
- Brass `#B6873A` · Redline `#A1473A`
- Robin's Egg `#7FCFCB` (peak; never adjacent to Brass) · Deep Orange `#D9642E` (peak; never adjacent to Brass)

**Stage IDs:** `1 Size up 🧭 / 2 Lock it in 🔒 / 3 Plan it out 📐 / 4 Build 🔨 / 5 Adapt 🔄 / 6 Collect 💰 / 7 Reflect 📖`
**Source of truth:** `src/lib/lifecycle-stages.ts` (READ-ONLY this wave).

**Spacing tokens:** `src/design-system/tokens/spacing.ts` — xs 4 / sm 8 / md 12 / lg 16 / xl 24 / 2xl 32 / 3xl 48.

**Stack:** Next.js 15 App Router, TypeScript strict, Vitest, Tailwind v4, framer-motion 12.38 (already installed — use, don't reinstall).

## Global DO NOT TOUCH

- `src/app/killerapp/layout.tsx`
- `src/app/killerapp/page.tsx`
- `src/app/killerapp/workflows/**` (all 17 route clients)
- `src/design-system/tokens/**` (canonical)
- `src/lib/lifecycle-stages.ts` (canonical)
- `docs/workflows.json`
- `package.json` (no new deps)
- `src/components/IntegratedNavigator.tsx` and `src/components/navigator/**` (except L1)
- `src/components/CompassBloom.tsx` (except L1)

Each lane ships **exports only** — no wiring into chrome this wave. Wave 1.5 integrator mounts everything.

## Lane briefs

### L1 — Compass reskin (architect-dividers aesthetic)
Owner: `src/components/CompassBloom.tsx`. Rework visuals per `docs/design/W9-compass-navigator-spec.md`. Keep filename to avoid import churn. Do not touch navigator/ subtree.

### L2 — Stage Backdrop primitive
New `src/design-system/components/StageBackdrop.tsx` (~150 LOC) + new `src/design-system/components/stage-backdrops/index.ts` (~180 LOC, 7 stage SVG textures, drafting-paper aesthetic, Trace ground + Faded Rule rules + Brass watermark). Exports only.

### L3 — Scroll Stage transitions
New `src/design-system/components/ScrollStage.tsx` (~140 LOC) + new `src/design-system/animations/scroll-timeline.css` (~140 LOC). CSS scroll-timeline with Intersection Observer fallback. Motion-reduce respecting. Exports only.

### L4 — Voice Command Nav
New `src/design-system/components/VoiceCommandNav.tsx` + new `src/lib/voice-commands.ts` (14 intents, trigram fuzzy + regex fallback) + new `src/lib/hooks/useSpeechRecognition.ts`. Feature flag `NEXT_PUBLIC_VOICE_NAV=enabled`. Exports only.

### L5 — Stage Welcome onboarding
New `src/design-system/components/StageWelcome.tsx` + new `src/lib/stage-welcome-copy.ts`. localStorage-persisted dismiss per `(stage, projectId)`. Exports only.

### L6 — Blueprint animation primitives
New `src/design-system/animations/blueprint-draw.tsx` + new `src/design-system/animations/compass-trace.tsx` + new `src/design-system/animations/hammer-tap.tsx` + new `src/design-system/animations/blueprint-keyframes.css`. Use framer-motion (already installed). Motion-reduce aware. Exports only.

## Wave 1.5 — Chrome integrator (runs after all 6 return green)

Single lane edits `src/app/killerapp/layout.tsx` and `src/app/killerapp/page.tsx` to mount the six primitives. No other files.

## Acceptance gate per lane

- `npx tsc --noEmit` exit 0
- `npx vitest run` green (215 baseline must not regress)
- No edits outside scope
- Deliverable: one-line file-change summary with LOC counts
