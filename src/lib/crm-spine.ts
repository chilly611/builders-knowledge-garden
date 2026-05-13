'use client';

/**
 * CRM Spine
 * =========
 *
 * Single client-side entry point for every workflow that writes a contact.
 *
 * Mirrors `src/lib/budget-spine.ts` exactly — discriminated `{ok: true} | {ok: false, reason}`
 * result, never throws on expected failure modes, emits a `bkg:crm:changed` CustomEvent on
 * success, and resolves the active project id from localStorage `bkg-active-project`.
 *
 * Per the Brief 1 spec (docs/research/crm/stream-e-strategy.md §7):
 *   - POSTs voice / manual capture to `/api/v1/crm/capture`
 *   - POSTs photo capture to `/api/v1/crm/photo`
 *   - On success: emits journey `step_completed` (workflowId='who-is-asking') and `bkg:crm:changed`.
 *
 * Brief 2 additions (this file) layer on the Quick Reply inbox primitives:
 *   - listInboxMessages, draftReply, sendReply, undoSendReply
 *   - All four mirror recordContact's shape: discriminated results, never throw,
 *     emit `bkg:crm:message:*` CustomEvents on success.
 *
 * Time Machine: every successful write returns a `time_machine_handle` so the caller
 * can render a 30-second (or 90-second for outbound SMS) undo bar. The handle is
 * stored on the row server-side so a future `crm_undo(handle)` MCP tool can reverse
 * the create.
 */

import { emitJourneyEvent, resolveProjectId } from './journey-progress';

// ─── Types ────────────────────────────────────────────────────────────────

export type ContactWriteReason =
  | 'no-active-project'
  | 'not-authenticated'
  | 'validation'
  | 'storage-upload-failed'
  | 'extraction-failed'
  | 'item-create-failed'
  | 'network';

export interface ContactWriteOkResult {
  ok: true;
  contactId: string;
  timeMachineHandle: string;
  jsonld?: BkgContactJsonLD;
  runId?: string | null;
}

export interface ContactWriteFailResult {
  ok: false;
  reason: ContactWriteReason;
  detail?: string;
}

export type ContactWriteResult = ContactWriteOkResult | ContactWriteFailResult;

export type CaptureSource = 'voice' | 'photo' | 'manual';

export interface CaptureManualFields {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  company?: string;
}

export interface CapturePhotoExif {
  gps?: [number, number]; // [lat, lon]
  timestamp?: string;     // ISO 8601
}

export interface CaptureContactInput {
  source: CaptureSource;
  audioBase64?: string;
  audioDurationMs?: number;
  audioMimeType?: string;
  photoBase64?: string;
  photoMimeType?: string;
  photoExif?: CapturePhotoExif;
  /**
   * Brief 2: when the photo path is actually carrying a short video, this
   * is the video duration in seconds. The route enforces a 60-second cap
   * client-side; this field is metadata only.
   */
  mediaDurationSeconds?: number;
  transcript?: string;
  manualFields?: CaptureManualFields;
  projectId?: string;
}

// ─── JSON-LD: the canonical bkg_contact record ────────────────────────────

export interface BkgContactJsonLDAddress {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

export interface BkgContactJsonLDWorksFor {
  '@type': 'Organization';
  name: string;
}

export interface BkgContactJsonLD {
  '@context': 'https://schema.org';
  '@type': 'Person' | 'Organization';
  '@id': string;
  name: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  telephone?: string;
  worksFor?: BkgContactJsonLDWorksFor;
  address?: BkgContactJsonLDAddress;
  image?: string;
  description?: string;
  additionalType: 'https://builders.theknowledgegardens.com/schemas/bkg_contact';
  'bkg:lane'?: string;
  'bkg:lifecycle_stage'?: string;
  'bkg:source'?: CaptureSource;
  'bkg:confidence'?: number;
  'bkg:last_touch'?: string;
  'bkg:time_machine_handle'?: string;
}

// ─── Active project id ────────────────────────────────────────────────────

const ACTIVE_PROJECT_KEY = 'bkg-active-project';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getActiveProjectId(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

// ─── Event helpers ────────────────────────────────────────────────────────

export interface CrmChangedDetail {
  contactId: string;
  source: CaptureSource;
  timeMachineHandle?: string;
  projectId?: string;
}

export function dispatchCrmChanged(detail: CrmChangedDetail): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(
      new CustomEvent<CrmChangedDetail>('bkg:crm:changed', { detail })
    );
  } catch {
    // swallow — listeners are best-effort
  }
}

// ─── Validation ───────────────────────────────────────────────────────────

function hasMeaningfulInput(input: CaptureContactInput): boolean {
  if (input.source === 'voice') {
    return Boolean(input.transcript && input.transcript.trim().length > 0) ||
           Boolean(input.audioBase64 && input.audioBase64.length > 0);
  }
  if (input.source === 'photo') {
    return Boolean(input.photoBase64 && input.photoBase64.length > 0);
  }
  // manual
  if (!input.manualFields) return false;
  const f = input.manualFields;
  return Boolean(
    (f.firstName && f.firstName.trim().length > 0) ||
    (f.lastName && f.lastName.trim().length > 0) ||
    (f.email && f.email.trim().length > 0) ||
    (f.phone && f.phone.trim().length > 0) ||
    (f.company && f.company.trim().length > 0)
  );
}

// ─── Core write ───────────────────────────────────────────────────────────

interface CaptureApiResponse {
  ok?: boolean;
  contactId?: string;
  timeMachineHandle?: string;
  jsonld?: BkgContactJsonLD;
  _run_id?: string | null;
  error?: string;
  detail?: string;
}

/**
 * Record a contact from voice, photo, or manual capture. Mirrors
 * `recordMaterialCost` in shape and contract. Returns a discriminated result
 * and never throws.
 */
export async function recordContact(
  input: CaptureContactInput
): Promise<ContactWriteResult> {
  // 1. Validation — empty input fails fast.
  if (!input || !input.source) {
    return { ok: false, reason: 'validation', detail: 'source is required' };
  }
  if (!hasMeaningfulInput(input)) {
    return { ok: false, reason: 'validation', detail: 'transcript, photo, or manual fields required' };
  }

  // 2. Resolve project id.
  const projectId = input.projectId ?? getActiveProjectId();
  if (!projectId) {
    return { ok: false, reason: 'no-active-project' };
  }

  // 3. Pick the endpoint based on source.
  const endpoint =
    input.source === 'photo' ? '/api/v1/crm/photo' : '/api/v1/crm/capture';

  const body =
    input.source === 'photo'
      ? {
          photoBase64: input.photoBase64,
          photoMimeType: input.photoMimeType ?? 'image/jpeg',
          photoExif: input.photoExif,
          mediaDurationSeconds: input.mediaDurationSeconds,
          projectId,
        }
      : {
          source: input.source, // 'voice' | 'manual'
          transcript: input.transcript,
          audioBase64: input.audioBase64,
          audioDurationMs: input.audioDurationMs,
          audioMimeType: input.audioMimeType,
          manualFields: input.manualFields,
          projectId,
        };

  // 4. POST.
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }

  // 5. Parse + dispatch.
  if (!res.ok) {
    let errDetail: string | undefined;
    try {
      const j = (await res.json()) as CaptureApiResponse;
      errDetail = j.detail ?? j.error;
    } catch {
      errDetail = `HTTP ${res.status}`;
    }
    const reason: ContactWriteReason =
      res.status >= 500 ? 'network' : 'item-create-failed';
    return { ok: false, reason, detail: errDetail };
  }

  let data: CaptureApiResponse;
  try {
    data = (await res.json()) as CaptureApiResponse;
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      detail: err instanceof Error ? err.message : 'malformed JSON',
    };
  }

  if (!data.contactId || !data.timeMachineHandle) {
    return {
      ok: false,
      reason: 'item-create-failed',
      detail: 'response missing contactId / timeMachineHandle',
    };
  }

  // 6. Emit events.
  try {
    emitJourneyEvent({
      type: 'step_completed',
      workflowId: 'who-is-asking',
      projectId: projectId === 'default' ? resolveProjectId() : projectId,
      stepId: input.source,
      stepIndex: input.source === 'voice' ? 0 : input.source === 'photo' ? 1 : 0,
      totalSteps: 2,
    });
  } catch {
    // best-effort
  }

  dispatchCrmChanged({
    contactId: data.contactId,
    source: input.source,
    timeMachineHandle: data.timeMachineHandle,
    projectId,
  });

  return {
    ok: true,
    contactId: data.contactId,
    timeMachineHandle: data.timeMachineHandle,
    jsonld: data.jsonld,
    runId: data._run_id ?? null,
  };
}

// ════════════════════════════════════════════════════════════════════════
// ─── Brief 2: Message types ─────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════

export type MessageDirection = 'inbound' | 'outbound';
export type MessageChannel =
  | 'sms'
  | 'voicemail'
  | 'email'
  | 'call_transcript'
  | 'manual';
export type MessageStatus =
  | 'received'
  | 'drafted'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'undone'
  | 'read';
export type MessageTone = 'warm' | 'professional' | 'brief' | 'custom';

export interface BkgMessage {
  id: string;
  contactId: string | null;
  direction: MessageDirection;
  channel: MessageChannel;
  body: string;
  aiDrafted: boolean;
  aiTone?: MessageTone;
  status: MessageStatus;
  queuedUntil?: string;        // ISO timestamp
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  timeMachineHandle: string;
  createdAt: string;
  // Derived
  contactName?: string;
  contactLifecycleStage?: string;
  reasoning?: string;
  containsCommitment?: boolean;
  containsPrice?: boolean;
  voiceMatchScore?: number;
  intentTags?: string[];
}

export type MessageWriteReason =
  | 'no-active-project'
  | 'not-authenticated'
  | 'validation'
  | 'contact-not-found'
  | 'draft-failed'
  | 'send-failed'
  | 'undo-window-expired'
  | 'item-create-failed'
  | 'network';

export interface MessageWriteOkResult {
  ok: true;
  messageId: string;
  timeMachineHandle: string;
}
export interface MessageWriteFailResult {
  ok: false;
  reason: MessageWriteReason;
  detail?: string;
}
export type MessageWriteResult = MessageWriteOkResult | MessageWriteFailResult;

export interface DraftReplyInput {
  contactId: string;
  inboundMessageId: string;
  tone?: MessageTone;
}

export interface DraftReplyOkResult {
  ok: true;
  draftMessageId: string;
  body: string;
  reasoning: string;
  toneUsed: MessageTone;
  voiceMatchScore: number;
  containsCommitment: boolean;
  containsPrice: boolean;
  suggestedSendDelayMs: number;
  intentTags: string[];
  timeMachineHandle: string;
}
export type DraftReplyResult = DraftReplyOkResult | MessageWriteFailResult;

export interface SendReplyInput {
  draftMessageId: string;
  // body override — if the contractor edited the draft before tapping send
  body?: string;
}

// ─── Message event detail types ───────────────────────────────────────────

export interface CrmMessageDraftedDetail {
  messageId: string;
  contactId: string;
  toneUsed: MessageTone;
}

export interface CrmMessageQueuedDetail {
  messageId: string;
  contactId: string;
  queuedUntil: string;
  expiresAt: number;
}

export interface CrmMessageUndoneDetail {
  messageId: string;
}

function dispatchMessageEvent<T>(name: string, detail: T): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new CustomEvent<T>(name, { detail }));
  } catch {
    // swallow
  }
}

// ─── Client-side message helpers ──────────────────────────────────────────

interface ListInboxApiResponse {
  ok?: boolean;
  messages?: BkgMessage[];
  error?: string;
}

/**
 * GET /api/v1/crm/messages?inbox=1 → unread inbound messages + their drafts.
 * Returns an empty array on any error (UI shows empty state, doesn't crash).
 */
export async function listInboxMessages(): Promise<BkgMessage[]> {
  if (!isBrowser()) return [];
  try {
    const res = await fetch('/api/v1/crm/messages?inbox=1', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ListInboxApiResponse;
    if (!data.messages || !Array.isArray(data.messages)) return [];
    return data.messages;
  } catch {
    return [];
  }
}

interface DraftReplyApiResponse {
  ok?: boolean;
  draftMessageId?: string;
  body?: string;
  reasoning?: string;
  toneUsed?: MessageTone;
  voiceMatchScore?: number;
  containsCommitment?: boolean;
  containsPrice?: boolean;
  suggestedSendDelayMs?: number;
  intentTags?: string[];
  timeMachineHandle?: string;
  error?: string;
  detail?: string;
}

/**
 * POST /api/v1/crm/messages/draft → run the draft-reply specialist + insert
 * a drafted message row. Emits `bkg:crm:message:drafted` on success.
 */
export async function draftReply(
  input: DraftReplyInput
): Promise<DraftReplyResult> {
  if (!input || !input.contactId || !input.inboundMessageId) {
    return {
      ok: false,
      reason: 'validation',
      detail: 'contactId and inboundMessageId are required',
    };
  }
  let res: Response;
  try {
    res = await fetch('/api/v1/crm/messages/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const j = (await res.json()) as DraftReplyApiResponse;
      detail = j.detail ?? j.error;
    } catch {
      detail = `HTTP ${res.status}`;
    }
    return {
      ok: false,
      reason: res.status >= 500 ? 'network' : 'draft-failed',
      detail,
    };
  }

  let data: DraftReplyApiResponse;
  try {
    data = (await res.json()) as DraftReplyApiResponse;
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      detail: err instanceof Error ? err.message : 'malformed JSON',
    };
  }

  if (!data.draftMessageId || !data.body || !data.timeMachineHandle) {
    return {
      ok: false,
      reason: 'draft-failed',
      detail: 'response missing draft fields',
    };
  }

  try {
    emitJourneyEvent({
      type: 'step_completed',
      workflowId: 'quick-reply',
      projectId: resolveProjectId(),
      stepId: 'draft',
      stepIndex: 0,
      totalSteps: 2,
    });
  } catch {
    // best-effort
  }

  dispatchMessageEvent<CrmMessageDraftedDetail>('bkg:crm:message:drafted', {
    messageId: data.draftMessageId,
    contactId: input.contactId,
    toneUsed: data.toneUsed ?? 'warm',
  });

  return {
    ok: true,
    draftMessageId: data.draftMessageId,
    body: data.body,
    reasoning: data.reasoning ?? '',
    toneUsed: data.toneUsed ?? 'warm',
    voiceMatchScore: data.voiceMatchScore ?? 0.5,
    containsCommitment: data.containsCommitment ?? false,
    containsPrice: data.containsPrice ?? false,
    suggestedSendDelayMs: data.suggestedSendDelayMs ?? 0,
    intentTags: data.intentTags ?? [],
    timeMachineHandle: data.timeMachineHandle,
  };
}

interface SendReplyApiResponse {
  ok?: boolean;
  messageId?: string;
  timeMachineHandle?: string;
  queuedUntil?: string;
  error?: string;
  detail?: string;
}

/**
 * POST /api/v1/crm/messages/send → flip the draft to `queued` with a
 * 90-second `queuedUntil`. The actual Twilio flush is a separate concern
 * (cron / webhook); the client only needs to know the window.
 * Emits `bkg:crm:message:queued` on success.
 */
export async function sendReply(
  input: SendReplyInput
): Promise<MessageWriteResult> {
  if (!input || !input.draftMessageId) {
    return { ok: false, reason: 'validation', detail: 'draftMessageId required' };
  }
  let res: Response;
  try {
    res = await fetch('/api/v1/crm/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const j = (await res.json()) as SendReplyApiResponse;
      detail = j.detail ?? j.error;
    } catch {
      detail = `HTTP ${res.status}`;
    }
    return {
      ok: false,
      reason: res.status >= 500 ? 'network' : 'send-failed',
      detail,
    };
  }

  let data: SendReplyApiResponse;
  try {
    data = (await res.json()) as SendReplyApiResponse;
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      detail: err instanceof Error ? err.message : 'malformed JSON',
    };
  }

  if (!data.messageId || !data.timeMachineHandle) {
    return {
      ok: false,
      reason: 'send-failed',
      detail: 'response missing messageId / timeMachineHandle',
    };
  }

  const queuedUntilIso = data.queuedUntil ?? new Date(Date.now() + 90_000).toISOString();
  const expiresAt = Date.parse(queuedUntilIso);

  dispatchMessageEvent<CrmMessageQueuedDetail>('bkg:crm:message:queued', {
    messageId: data.messageId,
    contactId: '', // server doesn't always know; UI fills if needed
    queuedUntil: queuedUntilIso,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 90_000,
  });

  return {
    ok: true,
    messageId: data.messageId,
    timeMachineHandle: data.timeMachineHandle,
  };
}

interface UndoApiResponse {
  ok?: boolean;
  messageId?: string;
  timeMachineHandle?: string;
  error?: string;
  reason?: MessageWriteReason;
  detail?: string;
}

/**
 * POST /api/v1/crm/messages/undo → if status='queued' AND queuedUntil > now,
 * set status='undone'. Else return { ok: false, reason: 'undo-window-expired' }.
 * Emits `bkg:crm:message:undone` on success.
 */
export async function undoSendReply(
  messageId: string
): Promise<MessageWriteResult> {
  if (!messageId) {
    return { ok: false, reason: 'validation', detail: 'messageId required' };
  }
  let res: Response;
  try {
    res = await fetch('/api/v1/crm/messages/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    });
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }

  let data: UndoApiResponse;
  try {
    data = (await res.json()) as UndoApiResponse;
  } catch {
    data = {};
  }

  if (!res.ok || data.ok === false) {
    const reason: MessageWriteReason =
      data.reason ?? (res.status === 409 ? 'undo-window-expired' : 'send-failed');
    return { ok: false, reason, detail: data.detail ?? data.error };
  }

  if (!data.messageId || !data.timeMachineHandle) {
    return {
      ok: false,
      reason: 'send-failed',
      detail: 'response missing messageId / timeMachineHandle',
    };
  }

  dispatchMessageEvent<CrmMessageUndoneDetail>('bkg:crm:message:undone', {
    messageId: data.messageId,
  });

  return {
    ok: true,
    messageId: data.messageId,
    timeMachineHandle: data.timeMachineHandle,
  };
}
