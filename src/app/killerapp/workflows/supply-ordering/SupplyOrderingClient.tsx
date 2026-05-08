'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { recordMaterialCost } from '@/lib/budget-spine';
import { resolveProjectId } from '@/lib/journey-progress';
import { search, type ResourceResponse } from '@/lib/resource-broker';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';
import AttachmentSection from '@/components/AttachmentSection';
import { extractReceipt, type ReceiptExtraction } from '@/lib/receipt-extract';
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

  // Receipt extraction state (Phase 3, 2026-05-07): when a user uploads
  // an image to the q11 receipts panel, we auto-call /extract-receipt
  // and surface the structured data inline. The user reviews + edits +
  // explicitly clicks "Save to budget" — we never auto-write money.
  const [pendingExtractions, setPendingExtractions] = useState<
    Record<string, {
      attachmentId: string;
      filename?: string | null;
      vendor: string;
      total: string;
      category: 'materials' | 'labor' | 'equipment' | 'overhead';
      confidence: number;
      notes?: string | null;
      lineItems?: Array<{ description: string; quantity?: number; unitPrice?: number; amount: number }>;
      saving: boolean;
      saved: boolean;
      error?: string | null;
    }>
  >({});
  const [extractingIds, setExtractingIds] = useState<Set<string>>(new Set());

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

  // Pre-fill text/voice/analysis + location + sqft from raw_input.
  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

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
      <AttachmentSection
        projectId={spineProjectId}
        workflowId="q11"
        stepId="upload-material-receipts"
        title="Upload material receipts"
        subtitle="Snap receipts as they come in. We'll read the vendor and total and pre-fill the budget — review and click Save."
        onUploaded={(uploaded) => {
          recordStepEvent({
            type: 'step_completed',
            workflowId: 'q11',
            stepId: 'upload-material-receipts',
            payload: {
              value: `${uploaded.length} file${uploaded.length === 1 ? '' : 's'} uploaded`,
            },
            timestamp: Date.now(),
          });
          // Phase 3: kick off receipt OCR for each uploaded image. PDFs
          // and videos pass through (manual entry is fine for those).
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
                // low confidence — surface a soft note, but skip the
                // editable card. User can record manually.
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
                  category: 'materials',
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
      {/* Receipt extraction cards — one per pending receipt OCR. User
          reviews + edits + clicks Save to write recordMaterialCost. */}
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
                  {p.vendor ? ` from ${p.vendor}` : ''} to the materials budget.
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
                    {p.confidence >= 0.85 ? 'High confidence' : p.confidence >= 0.7 ? 'Medium confidence — please verify' : 'Low confidence — please verify'}
                  </div>
                </div>
                {p.filename && (
                  <div style={{ fontSize: 12, color: 'var(--graphite)', opacity: 0.6 }}>{p.filename}</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
                      placeholder="e.g. Home Depot"
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
                        await recordMaterialCost({
                          description: p.vendor
                            ? `Receipt — ${p.vendor}`
                            : 'Receipt (vendor unspecified)',
                          amount,
                          lifecycleStageId: 4, // BUILD stage — materials flow during build
                          isEstimate: false, // money actually moved
                          vendor: p.vendor || undefined,
                          projectId: spineProjectId ?? resolveProjectId(),
                          receiptUrl: undefined, // signed URL is short-lived; we keep the attachment row instead
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
        breadcrumbLabel="Supply Ordering"
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
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
