/**
 * Documenso v1 API adapter (2026-05-24).
 * =======================================
 *
 * Wraps app.documenso.com/api/v1 in a small, fetch-only client. No SDK,
 * no extra deps. Used by /api/v1/signatures when SIGNATURE_PROVIDER is
 * set to 'documenso'.
 *
 * Three-step envelope creation (the Documenso happy path):
 *
 *   1. POST /documents
 *        body: { title, recipients: [{ name, email, role }] }
 *        → { documentId, uploadUrl, recipients: [...with signingUrl] }
 *
 *   2. PUT  <uploadUrl>          (pre-signed S3 URL)
 *        header: Content-Type: application/pdf
 *        body: raw PDF bytes
 *
 *   3. POST /documents/{id}/send
 *        body: { sendEmail: true }
 *        → 200 OK; Documenso emails the recipients.
 *
 * `createSignatureRequest()` does all three back-to-back and is the
 * function callers should reach for in normal flows.
 *
 * AUTH HEADER GOTCHA: Documenso v1 wants the API key passed RAW —
 *   Authorization: api_qxg33yaoattv9492
 * NOT
 *   Authorization: Bearer api_qxg33yaoattv9492
 * (most REST APIs use Bearer; this one does not. Confirmed live
 * 2026-05-24, see docs/SIGNATURE-SERVICES.md "Documenso wiring".)
 */

const DEFAULT_BASE_URL = 'https://app.documenso.com/api/v1';
const FETCH_TIMEOUT_MS = 2000;
const RETRY_COUNT = 1;

export interface DocumensoRecipient {
  name: string;
  email: string;
  role?: 'SIGNER' | 'CC' | 'VIEWER';
  signingOrder?: number | null;
}

export interface DocumensoCreatedRecipient extends DocumensoRecipient {
  recipientId: number;
  token: string;
  signingUrl: string;
}

export interface DocumensoCreateResult {
  documentId: number;
  uploadUrl: string;
  recipients: DocumensoCreatedRecipient[];
}

export type DocumensoDocStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type DocumensoRecipientSigningStatus =
  | 'NOT_SIGNED'
  | 'SIGNED'
  | 'REJECTED'
  | 'EXPIRED';

export interface DocumensoStatus {
  documentId: number;
  status: DocumensoDocStatus;
  recipients: Array<{
    recipientId: number;
    name: string;
    email: string;
    signingStatus: DocumensoRecipientSigningStatus;
    signedAt?: string;
  }>;
}

export class DocumensoError extends Error {
  public readonly status: number;
  public readonly body: string;
  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'DocumensoError';
    this.status = status;
    this.body = body;
  }
}

export function isDocumensoConfigured(): boolean {
  return Boolean(process.env.DOCUMENSO_API_KEY);
}

function getBaseUrl(): string {
  return process.env.DOCUMENSO_API_BASE_URL || DEFAULT_BASE_URL;
}

function getApiKey(): string {
  const key = process.env.DOCUMENSO_API_KEY;
  if (!key) {
    throw new DocumensoError(
      'DOCUMENSO_API_KEY env var is not set',
      0,
      ''
    );
  }
  return key;
}

/**
 * fetch with timeout + single retry on network errors / 5xx.
 * Returns the Response — caller decides how to parse.
 */
async function documensoFetch(
  url: string,
  init: RequestInit,
  attempt = 0
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    // Retry on 5xx (treat as transient). 4xx is a real error — surface it.
    if (res.status >= 500 && attempt < RETRY_COUNT) {
      clearTimeout(timer);
      return documensoFetch(url, init, attempt + 1);
    }
    return res;
  } catch (e) {
    // AbortError or network error → retry once.
    if (attempt < RETRY_COUNT) {
      return documensoFetch(url, init, attempt + 1);
    }
    throw new DocumensoError(
      `Documenso request failed: ${e instanceof Error ? e.message : String(e)}`,
      0,
      ''
    );
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

async function assertOk(res: Response, what: string): Promise<void> {
  if (!res.ok) {
    const body = await readBody(res);
    throw new DocumensoError(
      `Documenso ${what} failed: ${res.status} ${res.statusText}`,
      res.status,
      body
    );
  }
}

/**
 * Step 1 — create a draft document with recipients.
 *
 * Response shape (verified live 2026-05-24):
 *   { documentId: number, uploadUrl: string,
 *     recipients: [{ recipientId, name, email, token, signingUrl,
 *                    signingOrder, role }] }
 */
export async function createDocumensoDocument(opts: {
  title: string;
  recipients: DocumensoRecipient[];
}): Promise<DocumensoCreateResult> {
  if (!opts.title || opts.title.trim().length === 0) {
    throw new DocumensoError('title is required', 0, '');
  }
  if (!opts.recipients || opts.recipients.length === 0) {
    throw new DocumensoError('at least one recipient is required', 0, '');
  }

  const url = `${getBaseUrl()}/documents`;
  const body = JSON.stringify({
    title: opts.title,
    recipients: opts.recipients.map((r) => ({
      name: r.name,
      email: r.email,
      role: r.role || 'SIGNER',
      ...(r.signingOrder != null ? { signingOrder: r.signingOrder } : {}),
    })),
  });

  const res = await documensoFetch(url, {
    method: 'POST',
    headers: {
      Authorization: getApiKey(),
      'Content-Type': 'application/json',
    },
    body,
  });
  await assertOk(res, 'create document');

  const json = (await res.json()) as DocumensoCreateResult;
  if (
    typeof json.documentId !== 'number' ||
    typeof json.uploadUrl !== 'string' ||
    !Array.isArray(json.recipients)
  ) {
    throw new DocumensoError(
      'Documenso create returned unexpected shape',
      res.status,
      JSON.stringify(json)
    );
  }
  return json;
}

/**
 * Step 2 — PUT the PDF bytes to the pre-signed S3 URL Documenso gave us.
 *
 * No auth header here — the signature is baked into the URL. Content-Type
 * must be application/pdf; some S3 buckets verify it against the
 * signature.
 */
export async function uploadDocumensoPdf(
  uploadUrl: string,
  pdfBytes: Uint8Array | Buffer | Blob
): Promise<void> {
  if (!uploadUrl) {
    throw new DocumensoError('uploadUrl is required', 0, '');
  }
  // BodyInit accepts BufferSource, Blob, FormData, string, etc. Both
  // Uint8Array and Buffer are BufferSource.
  const body = pdfBytes as BodyInit;
  const res = await documensoFetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body,
  });
  await assertOk(res, 'upload PDF');
}

/**
 * Step 2b — place a single SIGNATURE field for a recipient.
 *
 * Documenso refuses to send (`POST /send` returns 400) if any signer
 * has no field. We default-place a small signature box near the
 * bottom of page 1 for each signer. Production callers that need
 * tabbed multi-page placement should call this directly with their
 * own page/x/y coordinates.
 *
 * Coordinates are in PDF "percentage of page" units (the wire format
 * Documenso v1 uses — pageX=50 means horizontally centered).
 */
export async function placeDocumensoSignatureField(opts: {
  documentId: number;
  recipientId: number;
  pageNumber?: number;
  pageX?: number;
  pageY?: number;
  pageWidth?: number;
  pageHeight?: number;
}): Promise<void> {
  const url = `${getBaseUrl()}/documents/${opts.documentId}/fields`;
  const res = await documensoFetch(url, {
    method: 'POST',
    headers: {
      Authorization: getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipientId: opts.recipientId,
      type: 'SIGNATURE',
      pageNumber: opts.pageNumber ?? 1,
      pageX: opts.pageX ?? 10,
      pageY: opts.pageY ?? 80,
      pageWidth: opts.pageWidth ?? 30,
      pageHeight: opts.pageHeight ?? 8,
    }),
  });
  await assertOk(res, 'place signature field');
}

/**
 * Step 3 — kick the envelope into PENDING and tell Documenso to email
 * the signers.
 */
export async function sendDocumensoForSignature(
  documentId: number
): Promise<void> {
  const url = `${getBaseUrl()}/documents/${documentId}/send`;
  const res = await documensoFetch(url, {
    method: 'POST',
    headers: {
      Authorization: getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sendEmail: true }),
  });
  await assertOk(res, 'send document');
}

/**
 * GET /documents/{id} — current status + per-recipient signing state.
 * Used by the lazy-sync helper and by the smoke test for visibility.
 */
export async function getDocumensoStatus(
  documentId: number
): Promise<DocumensoStatus> {
  const url = `${getBaseUrl()}/documents/${documentId}`;
  const res = await documensoFetch(url, {
    method: 'GET',
    headers: { Authorization: getApiKey() },
  });
  await assertOk(res, 'get status');

  const raw = (await res.json()) as Record<string, unknown>;
  // Documenso's GET shape returns more fields than we model; pick the
  // ones we need and normalize.
  const recipientsRaw = Array.isArray(raw.recipients) ? raw.recipients : [];
  const recipients = recipientsRaw.map((r) => {
    const rec = r as Record<string, unknown>;
    return {
      recipientId: Number(rec.recipientId ?? rec.id ?? 0),
      name: String(rec.name ?? ''),
      email: String(rec.email ?? ''),
      signingStatus: (rec.signingStatus ?? 'NOT_SIGNED') as DocumensoRecipientSigningStatus,
      signedAt: rec.signedAt ? String(rec.signedAt) : undefined,
    };
  });

  const status = (raw.status ?? 'DRAFT') as DocumensoDocStatus;

  return {
    documentId: Number(raw.documentId ?? raw.id ?? documentId),
    status,
    recipients,
  };
}

/**
 * Cancel/void a Documenso document. Used by the smoke test cleanup and
 * any future "abort this signature request" UX.
 *
 * Documenso accepts DELETE /documents/{id} for envelopes that are not
 * yet completed. Self-hosted versions also accept a `reason` query
 * param; cloud ignores it but accepts it.
 */
export async function cancelDocumensoDocument(
  documentId: number,
  reason?: string
): Promise<void> {
  const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  const url = `${getBaseUrl()}/documents/${documentId}${qs}`;
  const res = await documensoFetch(url, {
    method: 'DELETE',
    headers: { Authorization: getApiKey() },
  });
  // 200, 204, and 404 (already gone) are all acceptable terminal states
  // for the cancel-or-cleanup path.
  if (!res.ok && res.status !== 404) {
    const body = await readBody(res);
    throw new DocumensoError(
      `Documenso cancel failed: ${res.status} ${res.statusText}`,
      res.status,
      body
    );
  }
}

/**
 * End-to-end happy path. Returns the create result (which carries the
 * documentId + per-recipient signingUrls) so callers can persist them.
 *
 * Auto-places one SIGNATURE field per recipient (bottom of page 1) so
 * the subsequent /send call doesn't 400 with "Signers must have at
 * least one signature field." Callers who need precise field
 * placement should call the lower-level create/upload/field/send
 * functions directly.
 */
export async function createSignatureRequest(opts: {
  title: string;
  pdfBytes: Uint8Array | Buffer;
  recipients: DocumensoRecipient[];
}): Promise<DocumensoCreateResult> {
  const created = await createDocumensoDocument({
    title: opts.title,
    recipients: opts.recipients,
  });
  await uploadDocumensoPdf(created.uploadUrl, opts.pdfBytes);
  // Stagger fields vertically so multi-signer documents don't stack
  // every signature on the same coordinates.
  for (let i = 0; i < created.recipients.length; i++) {
    const r = created.recipients[i];
    await placeDocumensoSignatureField({
      documentId: created.documentId,
      recipientId: r.recipientId,
      pageNumber: 1,
      pageX: 10,
      pageY: 80 - i * 10,
      pageWidth: 30,
      pageHeight: 8,
    });
  }
  await sendDocumensoForSignature(created.documentId);
  return created;
}
