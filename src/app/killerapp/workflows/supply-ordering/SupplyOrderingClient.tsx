'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordMaterialCost } from '@/lib/budget-spine';
import { resolveProjectId } from '@/lib/journey-progress';
import { search, type ResourceResponse } from '@/lib/resource-broker';
import { useProjectWorkflowState } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';
import ResourceCardGrid from './ResourceCardGrid';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

/**
 * Supply Ordering Workflow Client
 *
 * Rewritten against design-moodboard-v1 and resource-broker contract.
 * Integrates live resource search with heritage-grounded UI.
 * Top-level state management for broker interactions across workflow steps.
 */
export default function SupplyOrderingClient({ workflow, stages }: Props) {
  // Project Spine v1 (Wave 2, 2026-05-06): hydrate + autosave supply_ordering_state.
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'supply_ordering_state',
    workflowId: workflow.id,
  });

  // Broker search state — shared across the workflow steps
  const [brokerResponse, setBrokerResponse] = useState<ResourceResponse | null>(null);
  const [brokerLoading, setBrokerLoading] = useState(false);
  const [brokerError, setBrokerError] = useState<string | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());

  // Track step status locally; seed from hydrated.
  const [stepStatusMap, setStepStatusMap] = useState<
    Record<string, 'pending' | 'in_progress' | 'complete'>
  >({});

  useEffect(() => {
    if (Object.keys(hydratedPayloads).length === 0) return;
    setStepStatusMap((prev) => {
      const next = { ...prev };
      for (const stepId of Object.keys(hydratedPayloads)) {
        if (!next[stepId]) next[stepId] = 'complete';
      }
      return next;
    });
  }, [hydratedPayloads]);

  // Pre-fill unsaved text/voice/analysis steps with raw_input.
  const seededPayloads = useMemo(() => {
    const out = { ...hydratedPayloads };
    const raw = project?.raw_input?.trim();
    if (!raw) return out;
    for (const step of workflow.steps) {
      if (out[step.id]) continue;
      if (step.type === 'text_input' || step.type === 'voice_input') {
        out[step.id] = { value: raw };
      } else if (step.type === 'analysis_result') {
        out[step.id] = { input: raw };
      }
    }
    return out;
  }, [hydratedPayloads, project, workflow.steps]);

  /**
   * Broker search handler, fired when user completes a step that triggers a search.
   * Maps step context to ResourceQuery and calls the broker.
   *
   * q11 Supply Ordering steps:
   * - s11-1: Material list extraction (analysis) — context for broker
   * - s11-2: Find suppliers (analysis) — triggers broker search
   * - s11-3: Compare pricing (analysis) — post-search step, records to budget
   * - s11-4: Lead time alert (analysis)
   * - s11-5: Place orders (checklist) — ritual crown completion
   */
  const handleBrokerSearch = useCallback(
    async (stepId: string, query: string, _stepInput?: unknown) => {
      setBrokerLoading(true);
      setBrokerError(null);
      setBrokerResponse(null);

      try {
        // Resource kind depends on step type
        const kinds: Array<'tool' | 'equipment' | 'supply' | 'subcontractor' | 'laborer' | 'service'> = ['supply'];

        const projectId = resolveProjectId();
        const response = await search({
          query,
          kinds,
          context: {
            workflowId: workflow.id,
            stepId,
            projectId,
          },
          limit: 12,
        });

        setBrokerResponse(response);
        setSelectedResourceIds(new Set());
      } catch (err) {
        setBrokerError(err instanceof Error ? err.message : 'That search didn\'t connect. Check your network or rephrase the scope.');
        setBrokerResponse(null);
      } finally {
        setBrokerLoading(false);
      }
    },
    [workflow.id]
  );

  /**
   * Step completion handler — wired to WorkflowShell.
   * Orchestrates broker search, budget recording, and workflow state.
   *
   * Event shape per StepCard.types.ts:
   *   { type: 'step_opened' | 'step_saved' | 'step_skipped' | 'step_completed',
   *     stepId, payload?, timestamp }
   */
  const handleStepComplete = async (stepResult: StepResult & { workflowId: string }) => {
    // Project Spine v1: persist this step's payload into supply_ordering_state.
    recordStepEvent(stepResult);

    // Bump local statusMap so counter updates in-session.
    if (stepResult.type === 'step_completed') {
      setStepStatusMap((prev) => ({ ...prev, [stepResult.stepId]: 'complete' }));
    } else if (stepResult.type === 'step_saved') {
      setStepStatusMap((prev) => ({
        ...prev,
        [stepResult.stepId]: prev[stepResult.stepId] ?? 'in_progress',
      }));
    }

    // s11-2 (Find suppliers): trigger broker search with material list context
    if (stepResult.stepId === 's11-2' && stepResult.type === 'step_completed') {
      const inputText = (stepResult.payload as { input?: string } | undefined)?.input ?? '';
      if (inputText.trim()) {
        await handleBrokerSearch('s11-2', inputText);
      }
    }

    // s11-3 (Compare pricing): extract total and record to budget spine
    if (stepResult.stepId === 's11-3' && stepResult.type === 'step_completed') {
      const inputText = (stepResult.payload as { input?: string } | undefined)?.input ?? '';
      // Extract estimated total from comparison (e.g., "Scenario B (mixed): $29.8k")
      const match = inputText.match(/\$[\d,]+\.?\d*k?/);
      if (match) {
        const priceStr = match[0].replace(/k$/i, '000').replace(/[$,]/g, '');
        const amount = parseFloat(priceStr);
        if (!isNaN(amount) && amount > 0) {
          // Prefer URL-bound project id over localStorage for budget writes.
          const budgetProjectId = spineProjectId ?? resolveProjectId();
          await recordMaterialCost({
            description: 'Supply list — Plan',
            amount,
            lifecycleStageId: 3,
            isEstimate: true,
            projectId: budgetProjectId,
          });
        }
      }
    }

    // s11-5 (Place orders): ritual crown completion — clear state
    if (stepResult.stepId === 's11-5' && stepResult.type === 'step_completed') {
      setBrokerResponse(null);
      setSelectedResourceIds(new Set());
    }
  };

  /**
   * Enhanced WorkflowShell with broker search integration.
   * Steps s11-1 through s11-5 are rendered by WorkflowRenderer.
   * After s11-2, broker results appear in a card grid if a search completed.
   *
   * Broker integration pattern:
   * 1. Step s11-2 (Find suppliers) calls handleBrokerSearch on completion
   * 2. ResourceCardGrid renders results with design-system tokens
   * 3. Robin's egg ring on verified vendors (future: saved vendor check)
   * 4. Deep orange CTA only on final s11-5 completion (ritual crown)
   */
  return (
    <>
      <ProjectContextBanner project={project} selfWorkflow="supply-ordering" />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Supply Ordering"
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={stepStatusMap}
        sidePanel={
          // Broker results sidebar — only shown after s11-2 search
          brokerResponse && brokerResponse.results.length > 0 ? (
            <ResourceCardGrid
              results={brokerResponse.results}
              loading={brokerLoading}
              error={brokerError}
              selectedIds={selectedResourceIds}
              onSelectionChange={setSelectedResourceIds}
              onSearch={handleBrokerSearch}
            />
          ) : null
        }
      />
    </>
  );
}
