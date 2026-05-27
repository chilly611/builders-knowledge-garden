'use server';

/**
 * Lock specialist (lifecycle stage 2).
 * ===================================
 *
 * Answers the plain question: "Lock in the scope so the rest of the journey
 * can run." Backs the three Invitation Cards the contractor sees:
 *
 *   1. Pick the materials you know you want
 *   2. Lock the budget number
 *   3. Sign the client agreement
 *
 * `runLockReview` checks readiness across the three cards and writes a
 * `specialist_runs` telemetry row (RSI Loop 2). `requestClientAgreement` wires
 * the Documenso client that's already in the repo — it generates a one-page
 * agreement PDF and sends it for e-signature when DOCUMENSO_API_KEY is set, and
 * degrades to a safe "prepared" state when it isn't (the demo box has no key,
 * and a missing integration must never break the lock flow).
 *
 * `'use server'` module — every export is an async server action; types erase.
 */

import { logSpecialistRunStart, logSpecialistRunComplete } from '@/lib/rsi-instrumentation';
import { eventBus } from '@/lib/events';
import { isDocumensoConfigured, createSignatureRequest } from '@/lib/documenso';
import type { SpecialistResult } from '@/lib/specialists';

// ─── Public types ───────────────────────────────────────────────────────────

export type LockCardId = 'materials' | 'budget' | 'agreement';

export interface LockInput {
  projectId?: string;
  projectName?: string;
  clientName?: string;
  scopeText?: string;
  lockedBudget: number;
  materials: string[];
  signerName?: string;
  signerEmail?: string;
}

export interface LockCardStatus {
  id: LockCardId;
  label: string;
  done: boolean;
  detail: string;
}

export interface LockReviewResult {
  /** True once the hard requirements to lock scope (materials + budget) are met. */
  ready: boolean;
  cards: LockCardStatus[];
  agreementSummary: string;
  confidence: 'low' | 'medium' | 'high';
  runId: string | null;
}

export interface AgreementInput {
  projectId?: string;
  projectName: string;
  clientName: string;
  signerName: string;
  signerEmail: string;
  scopeText: string;
  lockedBudget: number;
  materials: string[];
}

export interface AgreementResult {
  status: 'sent' | 'prepared' | 'error';
  configured: boolean;
  message: string;
  signingUrl?: string;
  documentId?: number;
}

// ─── Helpers (internal) ────────────────────────────────────────────────────

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function buildAgreementSummary(input: LockInput): string {
  const client = input.clientName?.trim() || 'the client';
  const project = input.projectName?.trim() || 'this project';
  const scope = input.scopeText?.trim() || 'the agreed scope of work';
  const materials =
    input.materials.length > 0
      ? ` Selected materials include ${input.materials.slice(0, 6).join(', ')}${input.materials.length > 6 ? ', and more' : ''}.`
      : '';
  const budget = input.lockedBudget > 0 ? ` The locked budget is ${money(input.lockedBudget)}.` : '';
  return (
    `Plain-language scope agreement between you and ${client} for ${project}. ` +
    `Work covers ${scope}.${budget}${materials} ` +
    `Either party can adjust before signing; signing locks the scope so the rest of the build can run.`
  );
}

/** Minimal one-page agreement PDF. Loaded lazily so jsPDF only bundles when sent. */
async function buildAgreementPdf(input: AgreementInput): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const left = 56;
  let y = 72;
  const line = (text: string, size = 11, gap = 18) => {
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text, 500) as string[];
    for (const w of wrapped) {
      doc.text(w, left, y);
      y += gap;
    }
  };
  doc.setFont('helvetica', 'bold');
  line('CLIENT SCOPE AGREEMENT (DRAFT)', 18, 28);
  doc.setFont('helvetica', 'normal');
  line(`Project: ${input.projectName}`, 12, 20);
  line(`Client: ${input.clientName}`, 12, 20);
  line(`Locked budget: ${money(input.lockedBudget)}`, 12, 24);
  doc.setFont('helvetica', 'bold');
  line('Scope of work', 13, 20);
  doc.setFont('helvetica', 'normal');
  line(input.scopeText || 'As discussed and agreed by both parties.', 11, 16);
  if (input.materials.length > 0) {
    doc.setFont('helvetica', 'bold');
    line('Selected materials', 13, 20);
    doc.setFont('helvetica', 'normal');
    line(input.materials.join(', '), 11, 16);
  }
  y += 16;
  doc.setFont('helvetica', 'normal');
  line('Signature: ____________________________   Date: ____________', 11, 24);
  line(
    'DRAFT — for review only. Not legal advice; have construction counsel review before execution.',
    9,
    14
  );
  const ab = doc.output('arraybuffer') as ArrayBuffer;
  return new Uint8Array(ab);
}

// ─── Server actions ───────────────────────────────────────────────────────────

/** Check readiness across the three Lock cards and log the run. */
export async function runLockReview(input: LockInput): Promise<LockReviewResult> {
  const start = Date.now();

  const runId = await logSpecialistRunStart({
    workflow_id: 'q4',
    step_id: 'lock-review',
    specialist_id: 'lock',
    prompt_version: 'deterministic-v1',
    input_json: input,
  });

  const materialsDone = input.materials.length > 0;
  const budgetDone = input.lockedBudget > 0;
  const agreementDone = !!(input.signerName?.trim() && input.signerEmail?.trim());

  const cards: LockCardStatus[] = [
    {
      id: 'materials',
      label: 'Pick the materials you know you want',
      done: materialsDone,
      detail: materialsDone
        ? `${input.materials.length} selected`
        : 'Tap a few from your knowledge garden — you can add the rest later.',
    },
    {
      id: 'budget',
      label: 'Lock the budget number',
      done: budgetDone,
      detail: budgetDone ? money(input.lockedBudget) : 'Confirm or adjust the Size Up ballpark.',
    },
    {
      id: 'agreement',
      label: 'Sign the client agreement',
      done: agreementDone,
      detail: agreementDone
        ? `Ready to send to ${input.signerName}`
        : 'Add who signs — name and email — when you are ready.',
    },
  ];

  // Hard requirements to lock scope: materials + budget. The signature is
  // encouraged but the journey can advance with it queued.
  const ready = materialsDone && budgetDone;
  const doneCount = cards.filter((c) => c.done).length;
  const confidence: LockReviewResult['confidence'] = doneCount === 3 ? 'high' : doneCount === 2 ? 'medium' : 'low';
  const agreementSummary = buildAgreementSummary(input);

  if (runId) {
    const asSpecialistResult: SpecialistResult = {
      narrative: ready
        ? 'Scope is ready to lock: materials and budget confirmed.'
        : 'Scope not yet ready — confirm materials and the budget number.',
      structured: { cards, ready, agreementSummary },
      citations: [],
      confidence,
      raw_response: '',
      model: 'lock/deterministic-v1',
      latency_ms: Date.now() - start,
      promptVersion: 'v1',
    };
    await logSpecialistRunComplete(runId, asSpecialistResult, Date.now() - start);
  }

  await eventBus.emit(
    'specialist.lock_review',
    {
      projectId: input.projectId ?? null,
      ready,
      materials: input.materials.length,
      lockedBudget: input.lockedBudget,
      runId,
    },
    { source: 'lock-specialist' }
  );

  return { ready, cards, agreementSummary, confidence, runId };
}

/**
 * Send the client agreement for e-signature through Documenso, or prepare it
 * safely when Documenso isn't configured (the demo case).
 */
export async function requestClientAgreement(input: AgreementInput): Promise<AgreementResult> {
  const start = Date.now();
  const configured = isDocumensoConfigured();

  const runId = await logSpecialistRunStart({
    workflow_id: 'q4',
    step_id: 'client-agreement',
    specialist_id: 'lock',
    prompt_version: 'documenso-v1',
    input_json: { ...input, configured },
  });

  const finish = async (result: AgreementResult) => {
    if (runId) {
      const asSpecialistResult: SpecialistResult = {
        narrative: result.message,
        structured: { ...result },
        citations: [],
        confidence: result.status === 'error' ? 'low' : 'high',
        raw_response: '',
        model: 'lock/documenso-v1',
        latency_ms: Date.now() - start,
        promptVersion: 'v1',
      };
      await logSpecialistRunComplete(runId, asSpecialistResult, Date.now() - start, result.status === 'error' ? result.message : undefined);
    }
    await eventBus.emit(
      'specialist.client_agreement',
      { projectId: input.projectId ?? null, status: result.status, configured, runId },
      { source: 'lock-specialist' }
    );
    return result;
  };

  if (!configured) {
    return finish({
      status: 'prepared',
      configured: false,
      message:
        'Agreement drafted and ready. Connect Documenso (set DOCUMENSO_API_KEY) to send it for e-signature.',
    });
  }

  try {
    const pdfBytes = await buildAgreementPdf(input);
    const created = await createSignatureRequest({
      title: `Client Scope Agreement — ${input.projectName}`,
      pdfBytes,
      recipients: [{ name: input.signerName, email: input.signerEmail, role: 'SIGNER' }],
    });
    const signingUrl = created.recipients[0]?.signingUrl;
    return finish({
      status: 'sent',
      configured: true,
      message: `Sent to ${input.signerName} for signature.`,
      signingUrl,
      documentId: created.documentId,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown error';
    return finish({
      status: 'error',
      configured: true,
      message: `Could not send for signature (${detail}). The draft is saved — try again or send manually.`,
    });
  }
}

/**
 * Constitution-mandated write event, emitted after the page persists the
 * locked scope to the project record (phase/progress) via PATCH.
 */
export async function emitLockWrite(payload: {
  projectId: string;
  lockedBudget: number;
  materials: number;
  agreementStatus: AgreementResult['status'] | 'none';
}): Promise<void> {
  await eventBus.emit('project.scope_locked', { ...payload }, { source: 'lock-stage' });
}
