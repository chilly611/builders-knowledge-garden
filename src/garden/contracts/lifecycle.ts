/**
 * L2 contract — Lifecycle
 * =======================
 *
 * Part of the garden-engine extraction seam (CODE-2). See
 * `docs/garden-engine/01-DEPENDENCY-GRAPH.md` and `02-REPO-LAYOUT.md`.
 *
 * The "7-stage lifecycle" is the single hottest coupling node in the codebase:
 * `src/lib/lifecycle-stages.ts` (a BUILDERS-specific module) is imported by 20
 * files, including four `design-system` components that are supposed to be the
 * generic engine. This contract is the data shape the engine consumes so those
 * components can read stages from context/props instead of importing the
 * construction array directly.
 *
 * A garden supplies a `Lifecycle` (any number of stages, any names). BKG's
 * 7 construction stages become `gardens/builders` data — see
 * `src/garden/builders/lifecycle.ts`.
 *
 * Type-only module (no runtime, no 'use client') so server and client bundles
 * can both import it. The React provider lives in
 * `src/garden/runtime/LifecycleProvider.tsx`.
 */

export interface LifecycleStageDef {
  /** 1-based position in the journey. Stable across a garden's life. */
  id: number;
  /** URL/route slug for the stage (e.g. 'size-up'). */
  slug: string;
  /** Human label shown in chrome (e.g. 'Size up'). */
  name: string;
  /** Optional glyph — emoji today in BKG; an icon name in a themed garden. */
  icon?: string;
  /**
   * Index into `ThemeTokens.stageAccents` for this stage's accent colour.
   * Decouples stage→colour from any hardcoded palette (see theme.ts).
   */
  accentIndex: number;
  /** Workflow ids that live in this stage (ids match the WorkflowRegistry). */
  workflowIds: string[];
  /** Optional welcome copy + the workflows to surface as entry CTAs. */
  welcome?: {
    headline: string;
    body: string;
    ctaWorkflowIds: string[];
  };
}

/** An ordered, immutable set of lifecycle stages for one garden. */
export type Lifecycle = ReadonlyArray<LifecycleStageDef>;

/**
 * Resolves a pathname to a stage id (0 = none / landing / picker). The
 * route→stage mapping is garden-specific data, so the garden supplies this
 * function; the engine consumes it via `useStageResolver()`. BKG wires
 * `src/lib/stage-from-pathname.ts` here.
 */
export type StageFromPath = (pathname: string) => number;

/** Resolve the stage that owns a given workflow id, or null. */
export function stageForWorkflow(
  lifecycle: Lifecycle,
  workflowId: string,
): LifecycleStageDef | null {
  return lifecycle.find((s) => s.workflowIds.includes(workflowId)) ?? null;
}
