'use client';
import { useEffect, useState } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordLaborCost } from '@/lib/budget-spine';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

interface CrewAnalysisData {
  crewSize?: number;
  estimatedLaborCost?: number;
}

export default function WorkerCountClient({ workflow, stages }: Props) {
  const [projectId, setProjectId] = useState<string>('default');
  const [crewAnalysisData, setCrewAnalysisData] = useState<CrewAnalysisData>({});

  useEffect(() => {
    setProjectId(resolveProjectId());
  }, []);

  /**
   * Parse labor cost from analysis text using detect-and-multiply for k-suffix.
   * Matches the pattern in EstimatingClient.parseRoughTotal but scoped to q7.
   * W4.1f follow-up: thread `date` arg when the step UX asks for scheduled start.
   */
  function parseLaborCost(text: string): number | null {
    const costMatch = text.match(/\$[\d,]+\.?\d*k?/);
    if (!costMatch) return null;
    const raw = costMatch[0];
    // $48.2k means 48,200 — not 48.2 with trailing zeros. Handle k suffix
    // by detect-and-multiply, not blind string replace.
    const hasK = /k$/i.test(raw);
    const numeric = parseFloat(raw.replace(/k$/i, '').replace(/[$,]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return hasK ? numeric * 1000 : numeric;
  }

  async function handleStepComplete(stepResult: StepResult & { workflowId: string }) {
    const valuePayload = stepResult.payload as { value?: string } | undefined;
    const analysisPayload = stepResult.payload as { input?: string } | undefined;

    // Capture crew size from s7-1 (number_input)
    if (stepResult.stepId === 's7-1' && valuePayload?.value) {
      setCrewAnalysisData((prev) => ({
        ...prev,
        crewSize: Number(valuePayload.value),
      }));
    }

    // After s7-2 (analysis_result) completes, extract cost from user's input text.
    // Note: AI analysis output is not piped through the event bus — only payload.input is.
    if (stepResult.stepId === 's7-2' && analysisPayload?.input) {
      const analysisText = String(analysisPayload.input);
      // Parse estimated labor cost from analysis output if available
      const cost = parseLaborCost(analysisText);
      if (cost !== null) {
        setCrewAnalysisData((prev) => ({
          ...prev,
          estimatedLaborCost: cost,
        }));

        // Record the labor cost estimate (guarded on crewSize only;
        // no duration is captured in q7 workflow steps).
        if (crewAnalysisData.crewSize) {
          const result = await recordLaborCost({
            description: `Estimated labor — ${crewAnalysisData.crewSize} workers`,
            amount: cost,
            lifecycleStageId: 3,
            isEstimate: true,
          });

          if (!result.ok && result.reason !== 'no-active-project') {
            console.error('Labor cost recording failed:', result);
          }
        }
      }
    }

    // Emit 'completed' event on last step (s7-5)
    const lastStepIndex = workflow.steps.length - 1;
    if (stepResult.stepId === workflow.steps[lastStepIndex]?.id) {
      emitJourneyEvent({
        type: 'completed',
        workflowId: 'q7',
        projectId,
      });
    }
  }

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Worker Count"
      onStepComplete={handleStepComplete}
    />
  );
}
