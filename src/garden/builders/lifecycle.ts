/**
 * Builders garden — lifecycle adapter
 * ===================================
 *
 * Satisfies the L2 `Lifecycle` contract by mapping BKG's existing construction
 * constants onto it. This is the L3 side of the seam: the engine reads
 * `Lifecycle`; here we build it from the canonical `src/lib/lifecycle-stages.ts`
 * so there is exactly ONE source of truth during the migration.
 *
 * Importing the builders module here is correct — this file IS builders garden
 * code. The architecture lint only forbids the GENERIC layers (design-system,
 * app-shell) from importing it.
 *
 * Phase 2 mounts `buildersLifecycle` via <LifecycleProvider> and removes the
 * direct `lifecycle-stages` imports from the generic components.
 */

import {
  LIFECYCLE_STAGES,
  STAGE_WORKFLOWS,
} from '@/lib/lifecycle-stages';
import { stageFromPathname } from '@/lib/stage-from-pathname';
import type {
  Lifecycle,
  LifecycleStageDef,
  StageFromPath,
} from '@/garden/contracts/lifecycle';

/** Stable slugs per stage id — mirror `/killerapp/stages/<slug>` routes. */
const STAGE_SLUGS: Record<number, string> = {
  1: 'size-up',
  2: 'lock',
  3: 'plan',
  4: 'build',
  5: 'adapt',
  6: 'collect',
  7: 'reflect',
};

/**
 * BKG's 7 construction stages as a `Lifecycle`. accentIndex maps 1:1 to the
 * stage id for now (the engine's ThemeTokens.stageAccents is indexed the same
 * way the legacy STAGE_ACCENTS were — see design-system/tokens/stage-accents).
 */
export const buildersLifecycle: Lifecycle = LIFECYCLE_STAGES.map(
  (stage): LifecycleStageDef => ({
    id: stage.id,
    slug: STAGE_SLUGS[stage.id] ?? `stage-${stage.id}`,
    name: stage.name,
    icon: stage.emoji,
    accentIndex: stage.id,
    workflowIds: STAGE_WORKFLOWS[stage.id] ?? [],
  }),
);

/**
 * The garden's pathname→stage-id resolver. Wraps the canonical BKG
 * `stageFromPathname` (route map lives in `src/lib/stage-from-pathname.ts`) so
 * the engine can resolve the current stage without importing it directly.
 */
export const buildersStageFromPath: StageFromPath = (pathname) =>
  stageFromPathname(pathname);
