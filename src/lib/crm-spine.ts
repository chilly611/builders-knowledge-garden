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
 * Time Machine: every successful write returns a `time_machine_handle` so the caller
 * can render a 30-second undo bar. The handle is stored on the row server-side so a
 * future `crm_undo(handle)` MCP tool can reverse the create.
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
  transcript?: string;
  manualFields?: CaptureManualFields;
  projectId?: string;
}

// ─── JSON-LD: the canonical bkg_contact record ────────────────────────────
//
// Schema.org Person/Organization + bkg: namespace fields. This shape is the
// constitution-binding output of the contact-extract specialist and the
// machine surface for every CRM consumer (MCP tools, JSON-LD script tags,
// external integrations).

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

  // 2. Resolve project id. Allow input override; else fall back to localStorage.
  //    Brief 1 spec: every CRM write is tied to a project (or 'default').
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

  // 6. Emit events. journey-progress first, then the cross-cutting changed event.
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
    // best-effort — never break the write because of an event-emit failure
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
