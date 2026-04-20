'use client';

import { useState, useCallback } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordEquipmentCost } from '@/lib/budget-spine';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

/**
 * Parse a rent/buy decision dollar figure from the AI specialist's analysis text.
 * Follows the same pattern as EstimatingClient.parseRoughTotal:
 * prefer "Rough total:" anchor, fall back to the LAST $XX,XXX in the text,
 * handle k suffix via detect-and-multiply (not naive string replace).
 */
function parseRoughTotal(text: string): number | null {
  // Prefer explicit "Rough total:" anchor if the specialist kept format.
  const anchored = text.match(/Rough total:\s*(\$[\d,]+\.?\d*k?)/i);
  // Fall back to the LAST dollar figure in the text so itemized-line values
  // don't capture the handler if the anchor is missing.
  const candidate = anchored?.[1] ?? text.match(/\$[\d,]+\.?\d*k?[^$]*$/)?.[0];
  if (!candidate) return null;
  const raw = candidate.match(/\$[\d,]+\.?\d*k?/i)?.[0];
  if (!raw) return null;
  // $48.2k means 48,200 — not 48.2 with trailing zeros. Handle k suffix
  // by detect-and-multiply, not blind string replace.
  const hasK = /k$/i.test(raw);
  const numeric = parseFloat(raw.replace(/k$/i, '').replace(/[$,]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return hasK ? numeric * 1000 : numeric;
}

export default function EquipmentClient({ workflow, stages }: Props) {
  const projectId = resolveProjectId();

  const handleStepComplete = useCallback(
    async (stepResult: StepResult & { workflowId: string }) => {
      if (stepResult.type !== 'step_completed') return;

      // When analysis in s10-3 completes, parse and record the equipment cost
      if (stepResult.stepId === 's10-3') {
        const payload = stepResult.payload as { input?: string } | undefined;
        const finalText = payload?.input ?? '';
        const amount = parseRoughTotal(finalText);
        if (amount !== null) {
          await recordEquipmentCost({
            description: 'Equipment — rent/buy decision',
            amount,
            lifecycleStageId: 3,
            isEstimate: true,
            projectId,
          });
        }
      }

      // When all equipment steps are complete
      if (stepResult.stepId === 's10-5') {
        emitJourneyEvent({
          type: 'completed',
          workflowId: workflow.id,
          projectId,
        });
      }
    },
    [workflow.id, projectId]
  );

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Equipment Management"
      contextFields={['trade', 'lane']}
      onStepComplete={handleStepComplete}
      projectId={projectId}
    />
  );
}
