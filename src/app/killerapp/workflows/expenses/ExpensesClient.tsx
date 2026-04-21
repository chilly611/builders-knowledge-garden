'use client';

import { useCallback, useState, useEffect } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import BudgetWidget from '@/components/BudgetWidget';
import { recordExpense, getProjectBudget } from '@/lib/budget-spine';
import { resolveProjectId, emitJourneyEvent } from '@/lib/journey-progress';
import { spacing } from '@/design-system/tokens';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

interface ExpenseCategorization {
  merchant?: string;
  summary?: string;
  category?: 'materials' | 'labor' | 'permits' | 'equipment' | 'subcontractor' | 'overhead' | 'other';
  amount?: number;
}

export default function ExpensesClient({ workflow, stages }: Props) {
  const [projectId, setProjectId] = useState<string>('default');
  const [analysisData, setAnalysisData] = useState<ExpenseCategorization | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');

  useEffect(() => {
    setProjectId(resolveProjectId());
  }, []);

  const handleStepComplete = useCallback(
    async (result: StepResult & { workflowId: string }) => {
      // StepCard emits only 'step_completed' for analysis_result steps — the AI
      // analysis output is not piped through the event bus (only the user's
      // `input` text is in payload). For the expense workflow we parse amount
      // + merchant hints out of that input text as a best-effort fallback.
      if (result.stepId === 's17-2' && result.type === 'step_completed') {
        const inputPayload = result.payload as { input?: string } | undefined;
        const inputText = inputPayload?.input ?? '';
        const amountMatch = inputText.match(/\$?([\d,]+(?:\.\d+)?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
        const merchantMatch = inputText.match(/(?:from|at|vendor:?)\s*([A-Z][\w &]+)/i);
        const merchant = merchantMatch?.[1]?.trim() || 'Unknown merchant';
        const summary = inputText.slice(0, 80);

        const analysis: ExpenseCategorization = { merchant, summary, amount, category: 'other' };
        setAnalysisData(analysis);

        if (amount > 0) {
          await recordExpense({
            description: `${merchant} — ${summary}`,
            amount,
            lifecycleStageId: 4,
            isEstimate: false,
            vendor: merchant,
            receiptUrl: uploadedImageUrl || undefined,
            category: 'other',
            projectId,
          });
        }
      }

      if (result.stepId === 's17-5' && result.type === 'step_completed') {
        emitJourneyEvent({
          type: 'completed',
          workflowId: 'q17',
          projectId,
        });
      }
    },
    [projectId, uploadedImageUrl]
  );

  const TopPanel = () => (
    <div
      style={{
        padding: spacing[4],
        marginBottom: spacing[6],
        backgroundColor: 'var(--trace)',
        borderRadius: '6px',
        border: '1px solid var(--faded-rule)',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--graphite)', marginBottom: spacing[3] }}>
        BUDGET OVERVIEW
      </div>
      <BudgetWidget projectId={projectId} compact={true} />
    </div>
  );

  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Expense Tracking"
      topPanel={<TopPanel />}
      onStepComplete={handleStepComplete}
      projectId={projectId}
    />
  );
}
