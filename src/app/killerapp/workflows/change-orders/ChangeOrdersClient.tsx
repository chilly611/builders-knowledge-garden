'use client';

/**
 * ChangeOrdersClient (q20, 2026-05-08 Wave 4 — final batch)
 * ====================================
 *
 * The Change Orders workflow. State persists in
 * command_center_projects.change_orders_state JSONB.
 *
 * Pattern parity with q3 + q21-q26: form/voice/checklist steps flow through
 * WorkflowShell; analysis_result steps use their docs/workflows.json
 * promptIds. All specialist prompts for this workflow are authored —
 * see docs/ai-prompts/ + src/lib/specialists.ts for the registry.
 */

import { useEffect, useMemo, useState } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';
import { supabase } from '@/lib/supabase';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

export default function ChangeOrdersClient({ workflow, stages }: Props) {
  const {
    projectId: spineProjectId,
    hydratedPayloads,
    recordStepEvent,
    project,
  } = useProjectWorkflowState({
    column: 'change_orders_state',
    workflowId: workflow.id,
  });

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

  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

  const handleStepComplete = (result: StepResult & { workflowId: string }) => {
    recordStepEvent(result);
    if (result.type === 'step_completed') {
      setStepStatusMap((prev) => ({ ...prev, [result.stepId]: 'complete' }));
    } else if (result.type === 'step_saved') {
      setStepStatusMap((prev) => ({
        ...prev,
        [result.stepId]: prev[result.stepId] ?? 'in_progress',
      }));
    }
  };

  // -------------------------------------------------------------------
  // OWNER-LANE (2026-05-22): "Send for owner signature" CTA.
  // After the GC fills out the CO steps, this button creates a
  // signed_documents row scoped to this project + a placeholder PDF URL
  // (the WorkflowShell PDF pipeline already produces one; we wire that
  // in a follow-up so the deep link shows the rendered CO). The button
  // is intentionally side-of-flow rather than a wf step so it doesn't
  // break the existing q20 step sequencing.
  // -------------------------------------------------------------------
  const [ownerEmail, setOwnerEmail] = useState('');
  const [signatureSendStatus, setSignatureSendStatus] = useState<
    null | { kind: 'ok'; signedDocId: string } | { kind: 'err'; error: string }
  >(null);
  const [sending, setSending] = useState(false);

  async function sendForOwnerSignature() {
    if (!spineProjectId) {
      setSignatureSendStatus({ kind: 'err', error: 'No active project — open a project to send.' });
      return;
    }
    if (!ownerEmail.trim()) {
      setSignatureSendStatus({ kind: 'err', error: 'Enter the owner email first.' });
      return;
    }
    setSending(true);
    setSignatureSendStatus(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const { data: userData } = await supabase.auth.getUser();
      const gcEmail = userData.user?.email ?? '';

      const res = await fetch('/api/v1/signatures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          projectId: spineProjectId,
          documentType: 'change_order',
          title: `Change order — ${project?.name ?? 'project'}`,
          requiredSigners: [
            { role: 'owner', email: ownerEmail.trim() },
            { role: 'gc', email: gcEmail },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSignatureSendStatus({ kind: 'err', error: json.error || 'Failed to send.' });
      } else {
        setSignatureSendStatus({ kind: 'ok', signedDocId: json.signature.id });
        // Best-effort email notification. Email sending lives in
        // /api/v1/signatures/notify which is a follow-up; for now we
        // expose the deep link inline so the GC can copy-paste while
        // the email plumbing is finalized.
      }
    } catch (e) {
      setSignatureSendStatus({
        kind: 'err',
        error: e instanceof Error ? e.message : 'Network error.',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <ProjectContextBanner project={project} selfWorkflow="change-orders" />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="Change Orders"
        contextFields={['lane']}
        onStepComplete={handleStepComplete}
        projectId={spineProjectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />

      <section
        style={{
          maxWidth: 720,
          margin: '24px auto',
          padding: 20,
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          background: '#ffffff',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
          Send change order for owner signature
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
          Once your CO is drafted above, send it to the owner for binding
          sign-off. Both you and the owner sign; status flips to <em>signed</em>
          {' '}only when both signatures land. The IP + hash + timestamp become
          part of the project's permanent record.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="owner@example.com"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            style={{
              flex: '1 1 240px',
              padding: '8px 10px',
              fontSize: 14,
              border: '1px solid #d1d5db',
              borderRadius: 6,
            }}
          />
          <button
            type="button"
            onClick={sendForOwnerSignature}
            disabled={sending}
            style={{
              padding: '8px 14px',
              fontSize: 14,
              fontWeight: 600,
              color: '#ffffff',
              background: sending ? '#6b7280' : '#0f766e',
              border: 'none',
              borderRadius: 6,
              cursor: sending ? 'wait' : 'pointer',
            }}
          >
            {sending ? 'Sending…' : 'Send for owner signature'}
          </button>
        </div>
        {signatureSendStatus?.kind === 'ok' && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: '#ecfdf5',
              borderRadius: 6,
              color: '#065f46',
              fontSize: 13,
            }}
          >
            Sent. Owner deep link:{' '}
            <a
              href={`/killerapp/sign/${signatureSendStatus.signedDocId}`}
              style={{ color: '#065f46', fontWeight: 600 }}
            >
              /killerapp/sign/{signatureSendStatus.signedDocId}
            </a>
          </div>
        )}
        {signatureSendStatus?.kind === 'err' && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: '#fef2f2',
              borderRadius: 6,
              color: '#b91c1c',
              fontSize: 13,
            }}
          >
            {signatureSendStatus.error}
          </div>
        )}
      </section>
    </>
  );
}
