'use client';

import { useState, useCallback } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordSubcontractorCost } from '@/lib/budget-spine';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

interface SelectedBid {
  trade: string;
  subName: string;
  amount: number;
}

/**
 * Parse a rough-total dollar figure out of the AI bid analysis text.
 * Matches the prompt contract for the sub-bid-analysis specialist: emit a
 * dollar amount that survives downstream parsing.
 *
 * We scan the text and prefer the value after "Winning bid:" anchor if present;
 * otherwise fall back to the LAST `$XX,XXX` in the text so itemized-line dollar
 * amounts don't capture the handler. Handles `k` suffix via detect-and-multiply
 * (not naive `.replace('k','000')`).
 */
function parseRoughTotal(text: string): number | null {
  // Prefer explicit "Winning bid:" anchor if the specialist kept format.
  const anchored = text.match(/Winning bid:\s*(\$[\d,]+\.?\d*k?)/i);
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

export default function SubManagementClient({ workflow, stages }: Props) {
  const [selectedBids, setSelectedBids] = useState<SelectedBid[]>([]);
  const projectId = resolveProjectId();

  const handleStepComplete = useCallback(
    async (stepResult: StepResult & { workflowId: string }) => {
      if (stepResult.type !== 'step_completed') {
        return;
      }

      // s9-3: AI bid analysis step — record the winning bid cost
      if (stepResult.stepId === 's9-3') {
        const payload = stepResult.payload as { input?: string } | undefined;
        const finalText = payload?.input ?? '';
        const amount = parseRoughTotal(finalText);
        if (amount !== null) {
          await recordSubcontractorCost({
            description: 'Selected sub bid',
            amount,
            lifecycleStageId: 3,
            isEstimate: true,
            projectId,
          });
        }
        return;
      }

      // s9-4: multi_select where user picks winning bids — emit journey event
      if (stepResult.stepId === 's9-4') {
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
      breadcrumbLabel="Sub Management"
      contextFields={['trade', 'lane']}
      onStepComplete={handleStepComplete}
      projectId={projectId}
    />
  );
}
