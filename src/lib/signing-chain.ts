/**
 * Tamper-evident signing chain — STAGE 5 (2026-06-01).
 * =====================================================
 *
 * The engineering half of the contracts legal gate. This module turns the
 * existing `signed_documents` / `signature_events` tables into a
 * tamper-EVIDENT record: every signature is hashed over its own stored
 * fields AND the hash of the signature before it, forming a linked chain
 * anchored to the SHA-256 of the exact document bytes. Altering one byte of
 * the document, mutating any event field, or reordering the events all break
 * the chain and are caught by `verifySigningPacket`.
 *
 * It does NOT replace the lawyer's review of the contract templates, and it
 * does NOT issue a cryptographic identity (no signing key / PKI). The
 * guarantee is integrity + ordering of a self-contained record built ONLY
 * from data already stored in Postgres — never fabricated.
 *
 * Design (all derivable from stored columns, so verification is reproducible):
 *
 *   document anchor   = signed_documents.document_hash
 *                     = SHA-256(exact document bytes)         ← genesis prev
 *   event[0].prev     = document anchor
 *   event[i].prev     = event[i-1].event_hash                 (i > 0)
 *   event[i].hash     = SHA-256( canonical(event[i] content) || event[i].prev )
 *   event[i].sequence = i                                     (0-based, contiguous)
 *
 * To verify: re-hash the document bytes (must equal document_hash), then walk
 * the events in order recomputing each hash and confirming each prev-link and
 * sequence number. Any single tamper produces a mismatch.
 *
 * SCHEMA: this is the one schema change the gate allows — three columns on
 * `signature_events` (sequence_number, prev_event_hash, event_hash) plus a
 * fork-guard unique index. See supabase/migrations/20260601_signature_event_chain.sql.
 * The tables are otherwise reused as-is.
 *
 * ACTIVATION: this module is the engine. The live writers
 * (`/api/v1/signatures/[id]/sign`, `.../reject`, `lib/documenso-sync.ts`)
 * currently insert UNchained rows. Founder gate #11 owns when the production
 * signing path is routed through `appendSignatureEvent` — until then this is
 * new, isolated code with its own export/verify endpoints and full tests.
 */

import { createHash } from 'crypto';

// ───────────────────────────────────────────────────────────────────────────
// Versioned tags. Bumping either invalidates previously-stored hashes, so
// treat these as frozen once any real document has been signed through here.
// ───────────────────────────────────────────────────────────────────────────

export const EVENT_HASH_VERSION = 'bkg-sigchain-event-v1';
export const CANONICAL_DOC_VERSION = 'bkg-sigchain-doc-v1';
export const PACKET_VERSION = 'bkg-signing-packet-v1';

// ───────────────────────────────────────────────────────────────────────────
// Row shapes. Index signatures tolerate the documenso_* columns and any future
// additions without coupling this module to a generated Database type — the
// repo's Supabase client is untyped, matching this loose style.
// ───────────────────────────────────────────────────────────────────────────

export interface SignedDocumentRow {
  id: string;
  project_id: string;
  document_type: string;
  document_id: string | null;
  document_hash: string;
  pdf_url: string | null;
  title: string | null;
  status: string;
  required_signers: unknown;
  created_by: string | null;
  created_at: string | null;
  finalized_at: string | null;
  [key: string]: unknown;
}

export interface SignatureEventRow {
  id: string;
  signed_document_id: string;
  signer_user_id: string | null;
  signer_role: string;
  signer_name: string;
  signer_email: string | null;
  signature_method: string;
  signature_data: string | null;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string | null;
  // Chain columns (20260601 migration). Null on legacy/unchained rows.
  sequence_number: number | null;
  prev_event_hash: string | null;
  event_hash: string | null;
  [key: string]: unknown;
}

/** The exact subset of event fields that participate in the event hash. */
export interface EventHashContent {
  signed_document_id: string;
  sequence_number: number;
  signer_user_id: string | null;
  signer_role: string;
  signer_name: string;
  signer_email: string | null;
  signature_method: string;
  signature_data: string | null;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string;
}

export type DocumentByteSource = 'pdf' | 'canonical';

export interface ResolvedDocumentBytes {
  bytes: Uint8Array;
  source: DocumentByteSource;
}

/**
 * Resolves the canonical bytes that a document's hash is taken over. Injected
 * in tests to avoid network. Returning null means "could not resolve" and the
 * caller decides how to fail.
 */
export type DocumentByteResolver = (
  doc: SignedDocumentRow,
) => Promise<ResolvedDocumentBytes | null>;

/** Minimal structural view of the supabase-js client — intentionally loose. */
export interface SupabaseLike {
  // The query builder is chainable and untyped in supabase-js; the repo
  // already treats it as `any`. We do the same to stay decoupled.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
}

export class SigningChainError extends Error {
  constructor(
    public readonly code:
      | 'signed_document_not_found'
      | 'document_bytes_unresolved'
      | 'unchained_predecessor'
      | 'insert_failed'
      | 'update_failed'
      | 'read_failed',
    message: string,
  ) {
    super(message);
    this.name = 'SigningChainError';
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Primitives
// ───────────────────────────────────────────────────────────────────────────

export function sha256Hex(input: string | Uint8Array): string {
  return createHash('sha256')
    .update(input instanceof Uint8Array ? Buffer.from(input) : input)
    .digest('hex');
}

function s(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  return String(v);
}

/**
 * Normalize a timestamp to a canonical instant string so that a value written
 * by the app (millisecond ISO, "…Z") and the same value read back from
 * Postgres (which may render "+00:00" or drop trailing zeros) hash identically.
 * Unparseable values pass through verbatim rather than throwing.
 */
export function normalizeTimestamp(ts: unknown): string {
  if (ts === undefined || ts === null) return '';
  const d = new Date(String(ts));
  return Number.isNaN(d.getTime()) ? String(ts) : d.toISOString();
}

/** Deterministic JSON: object keys sorted recursively. Arrays keep order. */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

// ───────────────────────────────────────────────────────────────────────────
// Document bytes + hash
// ───────────────────────────────────────────────────────────────────────────

/**
 * Canonical byte representation of a document that has no retrievable PDF
 * (e.g. an in-app typed signature on a generated record). Deterministic over
 * the binding fields so the same row always hashes to the same value.
 */
export function canonicalDocumentBytes(doc: SignedDocumentRow): Uint8Array {
  const canonical = JSON.stringify([
    CANONICAL_DOC_VERSION,
    s(doc.id),
    s(doc.project_id),
    s(doc.document_type),
    s(doc.document_id),
    s(doc.title),
    stableStringify(doc.required_signers ?? null),
  ]);
  return new TextEncoder().encode(canonical);
}

/**
 * Default resolver: fetch the PDF bytes when a pdf_url exists, otherwise fall
 * back to the canonical-JSON representation. A failed/!ok fetch falls through
 * to canonical so a document is always hashable; verification still catches a
 * mismatch because the byte source is recorded in the packet.
 */
export function makeDefaultByteResolver(
  fetchImpl: typeof fetch = fetch,
): DocumentByteResolver {
  return async (doc) => {
    if (doc.pdf_url) {
      try {
        const res = await fetchImpl(doc.pdf_url);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          return { bytes: new Uint8Array(ab), source: 'pdf' };
        }
      } catch {
        // fall through to canonical
      }
    }
    return { bytes: canonicalDocumentBytes(doc), source: 'canonical' };
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Event hashing
// ───────────────────────────────────────────────────────────────────────────

/**
 * Canonical serialization of an event's hashable content plus the prev hash.
 * FIXED ORDER — do not reorder or insert fields; doing so invalidates every
 * stored event_hash. Timestamps are normalized so app-written and DB-read
 * values agree.
 */
export function canonicalizeEvent(content: EventHashContent, prevHash: string): string {
  return JSON.stringify([
    EVENT_HASH_VERSION,
    s(content.signed_document_id),
    content.sequence_number,
    s(content.signer_user_id),
    s(content.signer_role),
    s(content.signer_name),
    s(content.signer_email),
    s(content.signature_method),
    s(content.signature_data),
    s(content.ip_address),
    s(content.user_agent),
    normalizeTimestamp(content.signed_at),
    s(prevHash),
  ]);
}

export function computeEventHash(content: EventHashContent, prevHash: string): string {
  return sha256Hex(canonicalizeEvent(content, prevHash));
}

/** Extract the hashable content from a stored event row. */
export function eventContentFromRow(row: SignatureEventRow): EventHashContent {
  return {
    signed_document_id: row.signed_document_id,
    sequence_number: row.sequence_number ?? -1,
    signer_user_id: row.signer_user_id ?? null,
    signer_role: row.signer_role,
    signer_name: row.signer_name,
    signer_email: row.signer_email ?? null,
    signature_method: row.signature_method,
    signature_data: row.signature_data ?? null,
    ip_address: row.ip_address ?? null,
    user_agent: row.user_agent ?? null,
    signed_at: row.signed_at ?? '',
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Append — "on signing, capture a tamper-evident, chained event"
// ───────────────────────────────────────────────────────────────────────────

export interface AppendSignatureInput {
  signedDocumentId: string;
  signer: {
    user_id?: string | null;
    role: string;
    name: string;
    email?: string | null;
  };
  method: string;
  signatureData: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AppendDeps {
  client: SupabaseLike;
  /** Resolver for the document bytes (genesis anchor). Defaults to PDF-or-canonical. */
  resolveBytes?: DocumentByteResolver;
  /** Injectable clock (ISO string) for deterministic tests. */
  now?: () => string;
}

/**
 * Append a signature to the chain for a document. This is the function the
 * production sign path should call instead of a raw insert. It:
 *
 *   1. loads the signed_document,
 *   2. (re)derives the SHA-256 of the exact document bytes and stores it as the
 *      authoritative `document_hash` anchor if it differs,
 *   3. finds the current chain tip,
 *   4. computes prev_event_hash, sequence_number, and event_hash,
 *   5. inserts ONE event row with the captured signer identity, timestamp, IP,
 *      and user agent plus the chain fields.
 *
 * Returns the inserted row. Throws SigningChainError on any failure. The
 * (signed_document_id, sequence_number) unique index is the fork guard: a
 * concurrent second signer racing the same sequence number fails the insert
 * and should retry (surfaced as `insert_failed`).
 */
export async function appendSignatureEvent(
  input: AppendSignatureInput,
  deps: AppendDeps,
): Promise<SignatureEventRow> {
  const { client } = deps;
  const resolveBytes = deps.resolveBytes ?? makeDefaultByteResolver();
  const nowIso = (deps.now ?? (() => new Date().toISOString()))();

  // 1. Load the document.
  const { data: doc, error: docErr } = await client
    .from('signed_documents')
    .select('*')
    .eq('id', input.signedDocumentId)
    .single();
  if (docErr || !doc) {
    throw new SigningChainError(
      'signed_document_not_found',
      `signed_document ${input.signedDocumentId} not found`,
    );
  }
  const document = doc as SignedDocumentRow;

  // 2. Establish the byte-hash anchor.
  const resolved = await resolveBytes(document);
  if (!resolved) {
    throw new SigningChainError(
      'document_bytes_unresolved',
      `could not resolve document bytes for ${document.id}`,
    );
  }
  const byteHash = sha256Hex(resolved.bytes);
  if (document.document_hash !== byteHash) {
    const { error: upErr } = await client
      .from('signed_documents')
      .update({ document_hash: byteHash })
      .eq('id', document.id);
    if (upErr) {
      throw new SigningChainError(
        'update_failed',
        `failed to anchor document_hash: ${upErr.message}`,
      );
    }
    document.document_hash = byteHash;
  }

  // 3. Find the chain tip (highest sequence_number).
  const { data: tipRows, error: tipErr } = await client
    .from('signature_events')
    .select('*')
    .eq('signed_document_id', input.signedDocumentId)
    .order('sequence_number', { ascending: false })
    .limit(1);
  if (tipErr) {
    throw new SigningChainError('read_failed', `failed to read chain tip: ${tipErr.message}`);
  }
  const tip = (tipRows ?? [])[0] as SignatureEventRow | undefined;

  let sequence_number: number;
  let prev_event_hash: string;
  if (!tip) {
    // Genesis: anchor to the document byte hash.
    sequence_number = 0;
    prev_event_hash = document.document_hash;
  } else if (tip.event_hash == null || tip.sequence_number == null) {
    // A prior event exists but isn't part of the chain — refuse to silently
    // fork a broken chain.
    throw new SigningChainError(
      'unchained_predecessor',
      `document ${document.id} has an unchained signature_event; cannot extend chain`,
    );
  } else {
    sequence_number = tip.sequence_number + 1;
    prev_event_hash = tip.event_hash;
  }

  // 4. Compute the event hash over the captured content.
  const content: EventHashContent = {
    signed_document_id: input.signedDocumentId,
    sequence_number,
    signer_user_id: input.signer.user_id ?? null,
    signer_role: input.signer.role,
    signer_name: input.signer.name,
    signer_email: input.signer.email ?? null,
    signature_method: input.method,
    signature_data: input.signatureData,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    signed_at: nowIso,
  };
  const event_hash = computeEventHash(content, prev_event_hash);

  // 5. Insert the chained event atomically (all chain fields set at once).
  const { data: inserted, error: insErr } = await client
    .from('signature_events')
    .insert({
      signed_document_id: content.signed_document_id,
      signer_user_id: content.signer_user_id,
      signer_role: content.signer_role,
      signer_name: content.signer_name,
      signer_email: content.signer_email,
      signature_method: content.signature_method,
      signature_data: content.signature_data,
      ip_address: content.ip_address,
      user_agent: content.user_agent,
      signed_at: content.signed_at,
      sequence_number,
      prev_event_hash,
      event_hash,
    })
    .select()
    .single();
  if (insErr || !inserted) {
    throw new SigningChainError(
      'insert_failed',
      `failed to insert signature_event: ${insErr?.message ?? 'no row returned'}`,
    );
  }
  return inserted as SignatureEventRow;
}

// ───────────────────────────────────────────────────────────────────────────
// Export — the signing packet (document + full verifiable chain), stored data only
// ───────────────────────────────────────────────────────────────────────────

export interface SigningPacket {
  packet_version: string;
  generated_at: string;
  signed_document_id: string;
  /** The stored signed_documents row, verbatim. */
  document: SignedDocumentRow;
  /** Base64 of the exact bytes whose SHA-256 is document.document_hash. */
  document_bytes_base64: string;
  document_bytes_source: DocumentByteSource;
  /** Stored signature_events, ordered by sequence_number ascending, verbatim. */
  events: SignatureEventRow[];
  /** The genesis prev for events[0] — equals document.document_hash. */
  chain_anchor: string;
  /** SHA-256 over the immutable record content of this packet (see computePacketHash). */
  packet_hash: string;
}

export interface BuildPacketDeps {
  client: SupabaseLike;
  resolveBytes?: DocumentByteResolver;
  now?: () => string;
}

/**
 * Hash over the parts of the packet that must not change between export and
 * verification: the document anchor, the document bytes, and each event's
 * stored chain fields + content. Deliberately EXCLUDES generated_at and
 * packet_hash itself so it is reproducible. This is packet-file integrity; the
 * authoritative guarantees are the document hash + event chain.
 */
export function computePacketHash(
  packet: Pick<
    SigningPacket,
    'signed_document_id' | 'document' | 'document_bytes_base64' | 'document_bytes_source' | 'events' | 'chain_anchor'
  >,
): string {
  const body = JSON.stringify([
    PACKET_VERSION,
    packet.signed_document_id,
    packet.chain_anchor,
    packet.document.document_hash,
    packet.document_bytes_source,
    packet.document_bytes_base64,
    packet.events.map((e) => [
      e.sequence_number,
      e.prev_event_hash,
      e.event_hash,
      canonicalizeEvent(eventContentFromRow(e), e.prev_event_hash ?? ''),
    ]),
  ]);
  return sha256Hex(body);
}

/**
 * Build a self-contained signing packet from STORED data only. Fetches the
 * document and its events, resolves + embeds the document bytes, and stamps a
 * packet hash. Nothing here is fabricated — every field comes from the row.
 */
export async function buildSigningPacket(
  signedDocumentId: string,
  deps: BuildPacketDeps,
): Promise<SigningPacket> {
  const { client } = deps;
  const resolveBytes = deps.resolveBytes ?? makeDefaultByteResolver();
  const generated_at = (deps.now ?? (() => new Date().toISOString()))();

  const { data: doc, error: docErr } = await client
    .from('signed_documents')
    .select('*')
    .eq('id', signedDocumentId)
    .single();
  if (docErr || !doc) {
    throw new SigningChainError(
      'signed_document_not_found',
      `signed_document ${signedDocumentId} not found`,
    );
  }
  const document = doc as SignedDocumentRow;

  const { data: eventRows, error: evErr } = await client
    .from('signature_events')
    .select('*')
    .eq('signed_document_id', signedDocumentId)
    .order('sequence_number', { ascending: true });
  if (evErr) {
    throw new SigningChainError('read_failed', `failed to read events: ${evErr.message}`);
  }
  const events = (eventRows ?? []) as SignatureEventRow[];

  const resolved = await resolveBytes(document);
  if (!resolved) {
    throw new SigningChainError(
      'document_bytes_unresolved',
      `could not resolve document bytes for ${document.id}`,
    );
  }
  const document_bytes_base64 = Buffer.from(resolved.bytes).toString('base64');

  const core = {
    signed_document_id: signedDocumentId,
    document,
    document_bytes_base64,
    document_bytes_source: resolved.source,
    events,
    chain_anchor: document.document_hash,
  };

  return {
    packet_version: PACKET_VERSION,
    generated_at,
    ...core,
    packet_hash: computePacketHash(core),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Verify — re-hash the document, walk the chain, fail on any tamper
// ───────────────────────────────────────────────────────────────────────────

export interface VerifyCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface VerifyResult {
  valid: boolean;
  summary: string;
  signed_document_id: string;
  events_verified: number;
  checks: VerifyCheck[];
  failures: string[];
}

function b64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/**
 * Verify a signing packet purely from its own contents (offline — no DB, no
 * network). Returns a structured result; `valid` is true only when every check
 * passes. Each of these breaks `valid`:
 *   - a byte of the document altered  → document_hash_matches fails
 *   - any event field mutated         → that event's event_hash_recomputes fails
 *   - an event reordered/removed/added → sequence or prev_link fails
 *   - the packet body edited          → packet_hash_intact fails
 */
export function verifySigningPacket(packet: SigningPacket): VerifyResult {
  const checks: VerifyCheck[] = [];

  // 1. Document byte integrity: re-hash the embedded bytes.
  const bytes = b64ToBytes(packet.document_bytes_base64 ?? '');
  const reHash = sha256Hex(bytes);
  checks.push({
    name: 'document_hash_matches',
    ok: reHash === packet.document?.document_hash,
    detail:
      reHash === packet.document?.document_hash
        ? undefined
        : `recomputed ${reHash} != stored ${packet.document?.document_hash}`,
  });

  // 2. Genesis anchor equals the document hash.
  checks.push({
    name: 'chain_anchor_matches_document',
    ok: packet.chain_anchor === packet.document?.document_hash,
    detail:
      packet.chain_anchor === packet.document?.document_hash
        ? undefined
        : `anchor ${packet.chain_anchor} != document_hash ${packet.document?.document_hash}`,
  });

  // 3. Walk the chain in the packet's event order.
  let expectedPrev = packet.chain_anchor;
  const events = packet.events ?? [];
  events.forEach((ev, i) => {
    checks.push({
      name: `event[${i}].sequence`,
      ok: ev.sequence_number === i,
      detail: ev.sequence_number === i ? undefined : `expected ${i}, stored ${ev.sequence_number}`,
    });
    checks.push({
      name: `event[${i}].prev_link`,
      ok: ev.prev_event_hash === expectedPrev,
      detail:
        ev.prev_event_hash === expectedPrev
          ? undefined
          : `expected prev ${expectedPrev}, stored ${ev.prev_event_hash}`,
    });
    const recomputed = computeEventHash(eventContentFromRow(ev), ev.prev_event_hash ?? '');
    checks.push({
      name: `event[${i}].event_hash_recomputes`,
      ok: recomputed === ev.event_hash,
      detail: recomputed === ev.event_hash ? undefined : `recomputed ${recomputed} != stored ${ev.event_hash}`,
    });
    expectedPrev = ev.event_hash ?? '';
  });

  // 4. Packet-file integrity.
  checks.push({
    name: 'packet_hash_intact',
    ok: computePacketHash(packet) === packet.packet_hash,
  });

  const failures = checks.filter((c) => !c.ok).map((c) => c.name);
  const valid = failures.length === 0;
  return {
    valid,
    summary: valid
      ? `Verified: document intact and ${events.length} signature event(s) form an unbroken chain.`
      : `TAMPER DETECTED: ${failures.length} check(s) failed — ${failures.join(', ')}.`,
    signed_document_id: packet.signed_document_id,
    events_verified: events.length,
    checks,
    failures,
  };
}

/**
 * Build the packet from stored data and verify it in one step — the "re-hash a
 * stored document and confirm the chain is intact" path used by the API.
 */
export async function verifyStoredDocument(
  signedDocumentId: string,
  deps: BuildPacketDeps,
): Promise<{ result: VerifyResult; packet: SigningPacket }> {
  const packet = await buildSigningPacket(signedDocumentId, deps);
  return { result: verifySigningPacket(packet), packet };
}
