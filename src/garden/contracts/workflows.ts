/**
 * L2 contract — Workflow registry
 * ===============================
 *
 * Workflow METADATA is data-driven today (`docs/workflows.json`, 244 step
 * entries) and rendered by the engine's `WorkflowRenderer`. Workflow UX is
 * per-garden: BKG hand-codes 41 `*Client.tsx` screens. This contract models
 * both: pure-`steps` workflows render generically; rich ones supply `Component`.
 *
 * See `docs/garden-engine/02-REPO-LAYOUT.md §2`.
 */

import type { ComponentType } from 'react';

/**
 * A single step in a workflow. Kept structurally loose on purpose — the step
 * `type` set is owned by the engine's renderer (text_input, voice_input,
 * analysis_result, …); a garden may add custom step types alongside a custom
 * `Component`. Mirrors the shape in `docs/workflows.json`.
 */
export interface WorkflowStep {
  id: string;
  type: string;
  label?: string;
  [key: string]: unknown;
}

export interface WorkflowDefinition {
  /** Stable id (matches the `q-id` in workflows.json + registry keys). */
  id: string;
  label: string;
  blurb?: string;
  /** Lifecycle stage this workflow belongs to (LifecycleStageDef.id). */
  stageId: number;
  /**
   * Roles allowed to see/run this workflow. Empty array = nobody; omitted =
   * everyone (matches BKG's default-open `workflow-roles.ts` contract).
   */
  allowedRoles?: string[];
  /** Total XP awarded (gamification; optional). */
  totalXp?: number;
  /** Declarative steps rendered by the engine WorkflowRenderer. */
  steps: WorkflowStep[];
  /** Optional bespoke client component for rich UX (BKG's *Client.tsx). */
  Component?: ComponentType;
}

export type WorkflowRegistry = Record<string, WorkflowDefinition>;
