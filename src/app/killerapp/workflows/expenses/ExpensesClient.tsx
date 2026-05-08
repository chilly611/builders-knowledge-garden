'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import BudgetWidget from '@/components/BudgetWidget';
import { recordExpense, getProjectBudget } from '@/lib/budget-spine';
import { resolveProjectId, emitJourneyEvent } from '@/lib/journey-progress';
import { spacing } from '@/design-system/tokens';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';
import AttachmentSection from '@/components/AttachmentSection';
import { extractReceipt, type ReceiptExtraction } from '@/lib/receipt-extract';

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
  // Project Spine v1 (Wave 3): hydrate + autosave expenses_state.
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'expenses_state',
    workflowId: workflow.id,
  });

  const [projectId, setProjectId] = useState<string>('default');
  // Receipt extraction state (Phase 3, mirroring q11): when user uploads
  // an image to the q17 receipts panel, auto-call /extract-receipt and
  // surface an editable card. User clicks "Save to budget" to write
  // recordExpense — never auto-write money without explicit confirmation.
  const [extractingIds, setExtractingIds] = useState<Set<string>>(new Set());
  const [pendingExtractions, setPendingExtractions] = useState<
    Record<string, {
      attachmentId: string;
      filename?: string | null;
      vendor: string;
      total: string;
      category: 'materials' | 'labor' | 'permits' | 'equipment' | 'subcontractor' | 'overhead' | 'other';
      confidence: number;
      notes?: string | null;
      lineItems?: Array<{ description: string; quantity?: number; unitPrice?: number; amount: number }>;
      saving: boolean;
      saved: boolean;
      error?: string | null;
    }>
  >({});
  const [analysisData, setAnalysisData] = useState<ExpenseCategorization | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');

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

  useEffect(() => {
    setProjectId(spineProjectId ?? resolveProjectId());
  }, [spineProjectId]);

  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

  const handleStepComplete = useCallback(
    async (result: StepResult & { workflowId: string }) => {
      // Project Spine v1: persist this step's payload into expenses_state.
      recordStepEvent(result);

      // Bump local statusMap so counter updates in-session.
      if (result.type === 'step_completed') {
        setStepStatusMap((prev) => ({ ...prev, [result.stepId]: 'complete' }));
      } else if (result.type === 'step_saved') {
        setStepStatusMap((prev) => ({
          ...prev,
          [result.stepId]: prev[result.stepId] ?? 'in_progress',
        }));
      }

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
          const budgetProjectId = spineProjectId ?? projectId;
          await recordExpense({
            description: `${merchant} — ${summary}`,
            amount,
            lifecycleStageId: 4,
            isEstimate: false,
            vendor: merchant,
            receiptUrl: uploadedImageUrl || undefined,
            category: 'other',
            projectId: budgetProjectId,
          });
        }
      }

      if (result.stepId === 's17-5' && result.type === 'step_completed') {
        const budgetProjectId = spineProjectId ?? projectId;
        emitJourneyEvent({
          type: 'completed',
          workflowId: 'q17',
          projectId: budgetProjectId,
        });
      }
    },
    [projectId, uploadedImageUrl, spineProjectId, recordStepEvent]
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
    <>
      <ProjectContextBanner project={project} selfWorkflow="expenses" />
      <AttachmentSection
        projectId={spineProjectId}
        workflowId="q17"
        stepId="upload-expense-receipts"
        title="Upload expense receipts"
        subtitle="Snap any receipt — fuel, materials, labor, equipment rental. We'll read the vendor and total and pre-fill an expense — review and click Save."
        onUploaded={(uploaded) => {
          recordStepEvent({
            type: 'step_completed',
            workflowId: 'q17',
            stepId: 'upload-expense-receipts',
            payload: {
              value: `${uploaded.length} ${uploaded.length === 1 ? 'file' : 'files'} uploaded`,
            },
            timestamp: Date.now(),
          });
          if (!spineProjectId) return;
          for (const a of uploaded) {
            if (!a.mime_type?.startsWith?.('image/') && a.mime_type !== 'application/pdf') continue;
            const id = a.id;
            setExtractingIds((s) => new Set(s).add(id));
            (async () => {
              const result = await extractReceipt(spineProjectId, id);
              setExtractingIds((s) => {
                const n = new Set(s); n.delete(id); return n;
              });
              if (!result) return;
              const ex: ReceiptExtraction = result.extraction;
              if (!ex || ex.confidence < 0.4 || !ex.total) {
                console.info('Receipt extraction skipped (low confidence)', ex);
                return;
              }
              setPendingExtractions((prev) => ({
                ...prev,
                [id]: {
                  attachmentId: id,
                  filename: a.original_filename ?? null,
                  vendor: ex.vendor ?? '',
                  total: String(ex.total ?? ''),
                  category: 'other',
                  confidence: ex.confidence,
                  notes: ex.notes ?? null,
                  lineItems: Array.isArray(ex.lineItems) ? ex.lineItems : undefined,
                  saving: false,
                  saved: false,
                },
              }));
            })();
          }
        }}
      />
      {(extractingIds.size > 0 || Object.keys(pendingExtractions).length > 0) && (
        <section
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 960,
            margin: '0 auto',
            padding: '4px 28px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
          data-testid="receipt-extraction-cards"
        >
          {[...extractingIds].map((id) => (
            <div
              key={`extracting-${id}`}
              style={{
                border: '1px dashed var(--faded-rule, #C9C3B3)',
                borderRadius: 12,
                padding: 12,
                background: 'var(--trace, #F4F0E6)',
                fontSize: 13,
                color: 'var(--graphite)',
                opacity: 0.75,
              }}
              aria-live="polite"
            >
              Reading the receipt…
            </div>
          ))}
          {Object.values(pendingExtractions).map((p) => {
            if (p.saved) {
              return (
                <div
                  key={`saved-${p.attachmentId}`}
                  style={{
                    border: '1px solid var(--robins-egg, #7FCFCB)',
                    borderRadius: 12,
                    padding: 12,
                    background: 'rgba(127, 207, 203, 0.10)',
                    fontSize: 13,
                    color: 'var(--graphite)',
                  }}
                >
                  ✓ Recorded ${Number(p.total).toLocaleString()}
                  {p.vendor ? ` from ${p.vendor}` : ''} as a {p.category} expense.
                </div>
              );
            }
            return (
              <div
                key={p.attachmentId}
                style={{
                  border: '1px solid var(--faded-rule, #C9C3B3)',
                  borderRadius: 12,
                  padding: 16,
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
                data-testid="receipt-extraction-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: 'var(--brass, #B6873A)',
                    }}
                  >
                    Receipt read
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--graphite)',
                      opacity: 0.6,
                    }}
                  >
                    {p.confidence >= 0.85 ? 'High confidence' : p.confidence >= 0.7 ? 'Medium — please verify' : 'Low — please verify'}
                  </div>
                </div>
                {p.filename && (
                  <div style={{ fontSize: 12, color: 'var(--graphite)', opacity: 0.6 }}>{p.filename}</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--graphite)', opacity: 0.6 }}>Vendor</span>
                    <input
                      type="text"
                      value={p.vendor}
                      onChange={(e) =>
                        setPendingExtractions((prev) => ({
                          ...prev,
                          [p.attachmentId]: { ...prev[p.attachmentId], vendor: e.target.value },
                        }))
                      }
                      placeholder="e.g. Shell"
                      style={{
                        padding: 8,
                        fontSize: 13,
                        border: '1px solid var(--faded-rule, #C9C3B3)',
                        borderRadius: 6,
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--graphite)', opacity: 0.6 }}>Total ($)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={p.total}
                      onChange={(e) =>
                        setPendingExtractions((prev) => ({
                          ...prev,
                          [p.attachmentId]: { ...prev[p.attachmentId], total: e.target.value },
                        }))
                      }
                      placeholder="0.00"
                      style={{
                        padding: 8,
                        fontSize: 13,
                        border: '1px solid var(--faded-rule, #C9C3B3)',
                        borderRadius: 6,
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--graphite)', opacity: 0.6 }}>Category</span>
                    <select
                      value={p.category}
                      onChange={(e) =>
                        setPendingExtractions((prev) => ({
                          ...prev,
                          [p.attachmentId]: { ...prev[p.attachmentId], category: e.target.value as typeof p.category },
                        }))
                      }
                      style={{
                        padding: 8,
                        fontSize: 13,
                        border: '1px solid var(--faded-rule, #C9C3B3)',
                        borderRadius: 6,
                        fontFamily: 'inherit',
                        background: '#fff',
                      }}
                    >
                      <option value="materials">Materials</option>
                      <option value="labor">Labor</option>
                      <option value="permits">Permits</option>
                      <option value="equipment">Equipment</option>
                      <option value="subcontractor">Subcontractor</option>
                      <option value="overhead">Overhead</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>
                {p.lineItems && p.lineItems.length > 0 && (
                  <details
                    style={{
                      fontSize: 12,
                      background: 'var(--trace, #F4F0E6)',
                      border: '1px solid var(--faded-rule, #C9C3B3)',
                      borderRadius: 6,
                      padding: '6px 10px',
                    }}
                  >
                    <summary
                      style={{
                        cursor: 'pointer',
                        fontWeight: 500,
                        color: 'var(--graphite)',
                        userSelect: 'none',
                      }}
                    >
                      Line items ({p.lineItems.length})
                    </summary>
                    <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'var(--graphite)', opacity: 0.85 }}>
                      {p.lineItems.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: 4, lineHeight: 1.4 }}>
                          {item.description}
                          {item.quantity != null && item.quantity > 0 && ` × ${item.quantity}`}
                          {item.unitPrice != null && ` @ $${Number(item.unitPrice).toLocaleString()}`}
                          {' — '}
                          <strong>${Number(item.amount).toLocaleString()}</strong>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {p.notes && (
                  <div style={{ fontSize: 11, color: 'var(--graphite)', opacity: 0.7 }}>
                    Note: {p.notes}
                  </div>
                )}
                {p.error && (
                  <div style={{ fontSize: 12, color: '#A1473A' }}>
                    {p.error}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingExtractions((prev) => {
                        const n = { ...prev };
                        delete n[p.attachmentId];
                        return n;
                      })
                    }
                    style={{
                      padding: '8px 12px',
                      background: 'transparent',
                      border: '1px solid var(--faded-rule, #C9C3B3)',
                      borderRadius: 6,
                      fontSize: 12,
                      color: 'var(--graphite)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    disabled={p.saving || !Number(p.total) || Number(p.total) <= 0}
                    onClick={async () => {
                      const amount = Number(p.total);
                      if (!Number.isFinite(amount) || amount <= 0) return;
                      setPendingExtractions((prev) => ({
                        ...prev,
                        [p.attachmentId]: { ...prev[p.attachmentId], saving: true, error: null },
                      }));
                      try {
                        await recordExpense({
                          description: p.vendor
                            ? `${p.vendor} — receipt`
                            : 'Receipt (vendor unspecified)',
                          amount,
                          lifecycleStageId: 4, // BUILD stage default for q17
                          isEstimate: false,
                          vendor: p.vendor || undefined,
                          category: p.category,
                          projectId: spineProjectId ?? resolveProjectId(),
                        });
                        setPendingExtractions((prev) => ({
                          ...prev,
                          [p.attachmentId]: { ...prev[p.attachmentId], saving: false, saved: true },
                        }));
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : 'Save failed';
                        setPendingExtractions((prev) => ({
                          ...prev,
                          [p.attachmentId]: { ...prev[p.attachmentId], saving: false, error: msg },
                        }));
                      }
                    }}
                    style={{
                      padding: '8px 14px',
                      background: 'var(--robins-egg, #7FCFCB)',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#1a1a1a',
                      cursor: p.saving ? 'wait' : 'pointer',
                      fontFamily: 'inherit',
                      opacity: p.saving || !Number(p.total) || Number(p.total) <= 0 ? 0.6 : 1,
                    }}
                  >
                    {p.saving ? 'Saving…' : 'Save to budget'}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Expense Tracking"
        topPanel={<TopPanel />}
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
