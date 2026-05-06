/**
 * WorkflowRenderer Primitive — Type Definitions
 *
 * Consumes the shape exported by `docs/workflows.json` (camelCase)
 * and renders a sequence of StepCard instances.
 *
 * Kept deliberately close to the JSON shape so source fidelity with the
 * prototype is preserved. See tasks.lessons.md — "Verbatim phase vs rewrite
 * phase" for why this matters.
 */

import type { WorkflowStep, StepResult, StepStatus } from './StepCard.types';

/**
 * Workflow — matches one entry in workflows.json `workflows[]`.
 * Only `id`, `label`, and `steps` are required; everything else is optional
 * because the prototype sometimes omitted these fields.
 */
export interface Workflow {
  id: string;
  label: string;
  steps: WorkflowStep[];
  stageId?: number;
  totalXp?: number;
  trade?: string;
  description?: string;
}

/**
 * WorkflowContext — runtime context injected into specialist calls.
 *
 * Mirrors SpecialistContext but lives here because `src/lib/specialists.ts`
 * is server-only (imports fs/path). We don't want to import the type via
 * `import type` here because it leaks the server-only module graph; instead
 * we duplicate the shape and let specialists.client.ts bridge.
 */
export interface WorkflowContext {
  jurisdiction?: string;
  trade?: string;
  lane?: 'gc' | 'diy' | 'specialty' | 'worker' | 'supplier' | 'equipment' | 'service' | 'agent';
  projectPhase?: string;
  extra?: Record<string, unknown>;
}

/**
 * WorkflowRendererProps — component contract.
 *
 * Constitution bindings:
 * - Goal 5 (fearless navigation): onEvent emits every StepResult for Time Machine replay
 * - Goal 8 (machine-legible): hidden JSON script with the full workflow + progress
 * - Binding #1 (Pro Toggle visible): proMode is passed through to every StepCard
 */
export interface WorkflowRendererProps {
  workflow: Workflow;
  /** Runtime context injected into specialist calls for analysis_result steps */
  context?: WorkflowContext;
  /** Controlled status map (stepId → status). If omitted, renderer manages locally. */
  statusMap?: Record<string, StepStatus>;
  /** Controlled expansion map (stepId → expanded). If omitted, renderer manages locally. */
  expandedMap?: Record<string, boolean>;
  /** Emit every step lifecycle event (Time Machine integration) */
  onEvent?: (event: StepResult & { workflowId: string }) => void;
  /** Pro Toggle state — forwarded to every StepCard */
  proMode?: boolean;
  /** Optional header — if false, renderer skips the title block */
  showHeader?: boolean;
  /**
   * Hydrated payloads keyed by stepId (Project Spine v1, 2026-05-03).
   * Forwarded to each StepCard via `initialPayload` so saved values
   * pre-fill on rehydrate. Optional and additive.
   */
  hydratedPayloads?: Record<
    string,
    {
      value?: string;
      selected?: string[];
      checked?: Record<string, boolean>;
      input?: string;
    }
  >;
}
