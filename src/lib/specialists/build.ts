'use client';

/**
 * Build-stage specialist wrappers.
 *
 * Thin client helpers over the shared specialist runner. `runCodeLookup`
 * mirrors the Plan helper but pins the phase to "build" (inspection-time
 * framing). `structureFieldReport` turns a raw voice transcript into a
 * structured daily-log entry.
 */

import { runSpecialist } from '@/lib/specialists.client';
import type { SpecialistContext, SpecialistResult } from '@/lib/specialists';
import type { CodeTopic } from '@/components/stage-kit/code-data';

const COMPLIANCE_BY_DISCIPLINE: Record<CodeTopic['discipline'], string> = {
  structural: 'compliance-structural',
  electrical: 'compliance-electrical',
  plumbing: 'compliance-plumbing',
  fire: 'compliance-fire',
  mechanical: 'compliance-structural',
};

export interface CodeLookupInput {
  topicLabel: string;
  section: string;
  discipline: CodeTopic['discipline'];
  jurisdiction: string;
  query?: string;
  projectType?: string;
}

/** Build-phase plain-speak code lookup (framed for field execution + inspection). */
export async function runCodeLookup(input: CodeLookupInput): Promise<SpecialistResult> {
  const specialistId =
    COMPLIANCE_BY_DISCIPLINE[input.discipline] ?? 'compliance-structural';
  const ask = input.query?.trim() || input.topicLabel;
  const context: SpecialistContext = {
    scope_description:
      `On site during construction: explain in plain language what the crew needs to do to ` +
      `satisfy ${ask} (${input.section}) on a ${input.projectType ?? 'custom home'}, and ` +
      `exactly what the inspector checks at rough-in and final.`,
    jurisdiction: input.jurisdiction,
    trade: input.discipline,
    project_phase: 'build',
    extra: { workflow_id: 'stage-build', step_id: 'code-lookup' },
  };
  return runSpecialist(specialistId, context);
}

export interface FieldReportInput {
  transcript: string;
  projectType?: string;
  jurisdiction?: string;
}

/**
 * Structure a spoken field report into a daily-log entry. Returns the raw
 * SpecialistResult; `structured` is expected to hold work_completed / crew /
 * issues / weather fields when the LLM is live. Callers should keep a local
 * heuristic fallback for offline.
 */
export async function structureFieldReport(input: FieldReportInput): Promise<SpecialistResult> {
  const context: SpecialistContext = {
    scope_description:
      `Turn this spoken field report into a structured daily log entry with: work completed, ` +
      `crew on site, deliveries, issues/delays, and weather. Keep the contractor's own words. ` +
      `Report: "${input.transcript}"`,
    jurisdiction: input.jurisdiction,
    project_phase: 'build',
    extra: { workflow_id: 'stage-build', step_id: 'field-report' },
  };
  return runSpecialist('daily-log-categorize', context);
}
