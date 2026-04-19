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
  duration?: number;
  estimatedLaborCost?: number;
}

export default function WorkerCountClient({ workflow, stages }: Props) {
  const [projectId, setProjectId] = useState<string>('default');
  const [crewAnalysisData, setCrewAnalysisData] = useState<CrewAnalysisData>({});

  useEffect(() => {
    setProjectId(resolveProjectId());
  }, []);

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
      const costMatch = analysisText.match(/\$[\d,]+k?/);
      if (costMatch) {
        const costStr = costMatch[0].replace('$', '').replace('k', '000').replace(/,/g, '');
        const cost = parseFloat(costStr);
        if (!isNaN(cost)) {
          setCrewAnalysisData((prev) => ({
            ...prev,
            estimatedLaborCost: cost,
          }));

          // Record the labor cost estimate
          if (crewAnalysisData.crewSize && crewAnalysisData.duration) {
            const result = await recordLaborCost({
              description: `Estimated labor — ${crewAnalysisData.crewSize} workers × ${crewAnalysisData.duration} weeks`,
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
