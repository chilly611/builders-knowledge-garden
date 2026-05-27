'use client';

/**
 * Plan-stage specialist wrappers.
 *
 * Thin client helpers over the shared specialist runner (POST
 * /api/v1/specialists/[id]). They keep the Plan page free of prompt-id and
 * context-shape details. The runner returns a graceful mock when no
 * ANTHROPIC_API_KEY is set, so these never hard-fail the demo; callers add a
 * curated fallback on top for full offline resilience.
 */

import { runSpecialist } from '@/lib/specialists.client';
import type { SpecialistContext, SpecialistResult } from '@/lib/specialists';
import type { CodeTopic } from '@/components/stage-kit/code-data';

const COMPLIANCE_BY_DISCIPLINE: Record<CodeTopic['discipline'], string> = {
  structural: 'compliance-structural',
  electrical: 'compliance-electrical',
  plumbing: 'compliance-plumbing',
  fire: 'compliance-fire',
  mechanical: 'compliance-structural', // no mechanical prompt — general compliance
};

export interface CodeLookupInput {
  topicLabel: string;
  section: string;
  discipline: CodeTopic['discipline'];
  jurisdiction: string;
  query?: string;
  projectType?: string;
  phase?: 'plan' | 'build';
}

/**
 * Plain-speak code lookup: ask the compliance specialist to rewrite the
 * relevant code in plain, field-ready language. The narrative IS the
 * plain-language rewrite; citations carry the verifiable source links.
 */
export async function runCodeLookup(input: CodeLookupInput): Promise<SpecialistResult> {
  const specialistId =
    COMPLIANCE_BY_DISCIPLINE[input.discipline] ?? 'compliance-structural';
  const ask = input.query?.trim() || input.topicLabel;
  const context: SpecialistContext = {
    scope_description:
      `Explain in plain, practical language what a builder needs to know about: ${ask} ` +
      `(${input.section}) for a ${input.projectType ?? 'custom home'} in the ` +
      `${input.phase ?? 'plan'} phase. Keep it field-ready — what to do, common ` +
      `mistakes, and what the inspector looks for.`,
    jurisdiction: input.jurisdiction,
    trade: input.discipline,
    project_phase: input.phase ?? 'plan',
    extra: { workflow_id: 'stage-plan', step_id: 'code-lookup' },
  };
  return runSpecialist(specialistId, context);
}

export interface SequencingCheckInput {
  phaseNames: string[];
  totalWeeks: number;
  projectType?: string;
  jurisdiction?: string;
}

/** Ask the sequencing specialist to sanity-check the current phase order. */
export async function runSequencingCheck(input: SequencingCheckInput): Promise<SpecialistResult> {
  const context: SpecialistContext = {
    scope_description:
      `Review this construction phase sequence for a ${input.projectType ?? 'custom home'} ` +
      `and flag dependency risks, bottlenecks, or trades that should run in parallel. ` +
      `Current order (${input.totalWeeks} weeks total): ${input.phaseNames.join(' → ')}.`,
    jurisdiction: input.jurisdiction,
    project_phase: 'plan',
    extra: { workflow_id: 'stage-plan', step_id: 'sequencing-check' },
  };
  return runSpecialist('sequencing-bottlenecks', context);
}
