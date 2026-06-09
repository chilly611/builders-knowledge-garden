/**
 * Tests for the tamper-evident signing chain (STAGE 5).
 * =====================================================
 * Covers the full acceptance path with an in-memory fake Supabase so the real
 * append → build → verify flow runs against actual stored data:
 *   - a document signs → hashed, chained, timestamped event
 *   - export packet contains the document + the full chain
 *   - verify PASSES on an untampered packet
 *   - verify FAILS when a byte is altered or an event is reordered — and still
 *     fails even when the attacker re-stamps the packet wrapper hash, proving
 *     the cryptographic chain (not just the wrapper) is what protects it.
 */

import { describe, it, expect } from 'vitest';
import {
  appendSignatureEvent,
  buildSigningPacket,
  verifySigningPacket,
  verifyStoredDocument,
  computeEventHash,
  computePacketHash,
  canonicalizeEvent,
  canonicalDocumentBytes,
  eventContentFromRow,
  normalizeTimestamp,
  sha256Hex,
  SigningChainError,
  PACKET_VERSION,
  type SignedDocumentRow,
  type SignatureEventRow,
  type DocumentByteResolver,
  type SigningPacket,
} from '../signing-chain';

// ───────────────────────────────────────────────────────────────────────────
// In-memory fake Supabase — supports the exact call chains this module uses:
//   .from(t).select('*').eq(c,v).single()
//   .from(t).select('*').eq(c,v).order(c,{ascending}).limit(n)        (awaited)
//   .from(t).select('*').eq(c,v).order(c,{ascending})                 (awaited)
//   .from(t).insert(obj).select().single()
//   .from(t).update(obj).eq(c,v)                                      (awaited)
// ───────────────────────────────────────────────────────────────────────────

interface FakeStore {
  signed_documents: Record<string, unknown>[];
  signature_events: Record<string, unknown>[];
}

function makeFakeSupabase(seed: Partial<FakeStore> = {}) {
  const store: FakeStore = {
    signed_documents: (seed.signed_documents ?? []).map((r) => ({ ...r })),
    signature_events: (seed.signature_events ?? []).map((r) => ({ ...r })),
  };
  let counter = 0;

  function builder(table: keyof FakeStore) {
    const filters: Array<{ col: string; val: unknown }> = [];
    let op: 'select' | 'insert' | 'update' = 'select';
    let payload: Record<string, unknown> | null = null;
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitN: number | null = null;

    const match = () =>
      store[table].filter((row) => filters.every((f) => row[f.col] === f.val));

    function resolve(): { data: unknown; error: { message: string } | null } {
      if (op === 'insert') {
        const row = { id: payload?.id ?? `row-${table}-${++counter}`, ...payload };
        store[table].push(row);
        return { data: [row], error: null };
      }
      if (op === 'update') {
        const rows = match();
        rows.forEach((row) => Object.assign(row, payload));
        return { data: rows, error: null };
      }
      let rows = match();
      if (orderCol) {
        const col = orderCol;
        rows = [...rows].sort((a, b) => {
          const av = (a[col] as number) ?? -Infinity;
          const bv = (b[col] as number) ?? -Infinity;
          return orderAsc ? av - bv : bv - av;
        });
      }
      if (limitN != null) rows = rows.slice(0, limitN);
      return { data: rows, error: null };
    }

    const api = {
      select: () => api,
      insert: (p: Record<string, unknown>) => {
        op = 'insert';
        payload = p;
        return api;
      },
      update: (p: Record<string, unknown>) => {
        op = 'update';
        payload = p;
        return api;
      },
      eq: (col: string, val: unknown) => {
        filters.push({ col, val });
        return api;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        orderCol = col;
        orderAsc = opts?.ascending !== false;
        return api;
      },
      limit: (n: number) => {
        limitN = n;
        return api;
      },
      single: () => {
        const res = resolve();
        const arr = (res.data ?? []) as unknown[];
        if (op === 'select' && arr.length === 0) {
          return Promise.resolve({ data: null, error: { message: 'no rows' } });
        }
        return Promise.resolve({ data: arr[0] ?? null, error: res.error });
      },
      then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve(resolve()).then(onF, onR),
    };
    return api;
  }

  return { from: (t: string) => builder(t as keyof FakeStore), _store: store };
}

// ───────────────────────────────────────────────────────────────────────────
// Fixtures
// ───────────────────────────────────────────────────────────────────────────

const DOC_BYTES = new TextEncoder().encode('%PDF-1.7 EXACT-BYTES contract body');
const BYTE_HASH = sha256Hex(DOC_BYTES);
const fixedResolver: DocumentByteResolver = async () => ({ bytes: DOC_BYTES, source: 'pdf' });

function seedDoc(overrides: Partial<SignedDocumentRow> = {}): SignedDocumentRow {
  return {
    id: 'doc-1',
    project_id: 'proj-1',
    document_type: 'contract',
    document_id: null,
    document_hash: 'METADATA_PLACEHOLDER_HASH', // pre-engine value; engine re-anchors to byte hash
    pdf_url: 'https://example.test/doc-1.pdf',
    title: 'Master Subcontract Agreement',
    status: 'pending',
    required_signers: [
      { role: 'owner', email: 'owner@example.test', user_id: 'u-owner', name: 'Olivia Owner' },
      { role: 'gc', email: 'gc@example.test', user_id: 'u-gc', name: 'Greg GC' },
    ],
    created_by: 'u-creator',
    created_at: '2026-06-01T00:00:00.000Z',
    finalized_at: null,
    ...overrides,
  };
}

const ISO1 = '2026-06-01T10:00:00.000Z';
const ISO2 = '2026-06-01T10:05:00.000Z';

/** Seed + sign two events through the engine; return the fake client. */
async function signedFixture() {
  const sb = makeFakeSupabase({ signed_documents: [seedDoc()] });
  const e0 = await appendSignatureEvent(
    {
      signedDocumentId: 'doc-1',
      signer: { user_id: 'u-owner', role: 'owner', name: 'Olivia Owner', email: 'owner@example.test' },
      method: 'typed',
      signatureData: 'Olivia Owner',
      ipAddress: '203.0.113.7',
      userAgent: 'Mozilla/5.0 test',
    },
    { client: sb, resolveBytes: fixedResolver, now: () => ISO1 },
  );
  const e1 = await appendSignatureEvent(
    {
      signedDocumentId: 'doc-1',
      signer: { user_id: 'u-gc', role: 'gc', name: 'Greg GC', email: 'gc@example.test' },
      method: 'drawn',
      signatureData: 'data:image/png;base64,iVBORw0KGgo=',
      ipAddress: '198.51.100.22',
      userAgent: 'Mozilla/5.0 test gc',
    },
    { client: sb, resolveBytes: fixedResolver, now: () => ISO2 },
  );
  return { sb, e0, e1 };
}

// deep clone a packet so tamper tests don't bleed into each other
const clone = (p: SigningPacket): SigningPacket => JSON.parse(JSON.stringify(p));

// ───────────────────────────────────────────────────────────────────────────
// Primitives
// ───────────────────────────────────────────────────────────────────────────

describe('primitives', () => {
  it('sha256Hex matches a known vector', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('normalizeTimestamp collapses equivalent instants to one canonical string', () => {
    const z = normalizeTimestamp('2026-06-01T12:00:00.000Z');
    expect(normalizeTimestamp('2026-06-01T12:00:00Z')).toBe(z);
    expect(normalizeTimestamp('2026-06-01T12:00:00.000+00:00')).toBe(z);
    expect(normalizeTimestamp('2026-06-01T12:00:00+00:00')).toBe(z);
    expect(z).toBe('2026-06-01T12:00:00.000Z');
  });

  it('event hash is stable across Postgres timestamp reformatting (round-trip safety)', () => {
    const base = eventContentFromRow({
      signed_document_id: 'doc-1',
      sequence_number: 0,
      signer_user_id: 'u-1',
      signer_role: 'owner',
      signer_name: 'A',
      signer_email: 'a@x.test',
      signature_method: 'typed',
      signature_data: 'A',
      ip_address: null,
      user_agent: null,
      signed_at: '2026-06-01T12:00:00.000Z',
    } as SignatureEventRow);
    const asWritten = computeEventHash(base, 'anchor');
    const asReadBack = computeEventHash({ ...base, signed_at: '2026-06-01T12:00:00+00:00' }, 'anchor');
    expect(asReadBack).toBe(asWritten);
  });

  it('event hash changes when any hashed field changes', () => {
    const base = eventContentFromRow({
      signed_document_id: 'doc-1',
      sequence_number: 0,
      signer_user_id: 'u-1',
      signer_role: 'owner',
      signer_name: 'A',
      signer_email: 'a@x.test',
      signature_method: 'typed',
      signature_data: 'A',
      ip_address: '1.2.3.4',
      user_agent: 'ua',
      signed_at: ISO1,
    } as SignatureEventRow);
    const h = computeEventHash(base, 'anchor');
    expect(computeEventHash({ ...base, signer_name: 'B' }, 'anchor')).not.toBe(h);
    expect(computeEventHash({ ...base, ip_address: '5.6.7.8' }, 'anchor')).not.toBe(h);
    expect(computeEventHash(base, 'different-anchor')).not.toBe(h);
  });

  it('canonicalDocumentBytes is deterministic regardless of signer key order', () => {
    const a = canonicalDocumentBytes(seedDoc({ required_signers: [{ role: 'owner', email: 'o@x.test' }] }));
    const b = canonicalDocumentBytes(seedDoc({ required_signers: [{ email: 'o@x.test', role: 'owner' }] }));
    expect(Buffer.from(a).toString('hex')).toBe(Buffer.from(b).toString('hex'));
  });
});

// ───────────────────────────────────────────────────────────────────────────
// appendSignatureEvent — "on signing, capture a hashed, chained, timestamped event"
// ───────────────────────────────────────────────────────────────────────────

describe('appendSignatureEvent', () => {
  it('genesis event hashes, anchors to the document byte hash, and timestamps', async () => {
    const { sb, e0 } = await signedFixture();

    expect(e0.sequence_number).toBe(0);
    expect(e0.prev_event_hash).toBe(BYTE_HASH); // genesis anchors to byte hash
    expect(e0.signed_at).toBe(ISO1); // app-set timestamp captured
    expect(e0.ip_address).toBe('203.0.113.7'); // IP captured
    expect(e0.signer_role).toBe('owner');
    expect(e0.event_hash).toBe(computeEventHash(eventContentFromRow(e0), BYTE_HASH));

    // The engine re-anchored document_hash to the SHA-256 of the exact bytes.
    const stored = sb._store.signed_documents[0] as SignedDocumentRow;
    expect(stored.document_hash).toBe(BYTE_HASH);
  });

  it('second event chains to the first (prev = previous event_hash, sequence increments)', async () => {
    const { e0, e1 } = await signedFixture();
    expect(e1.sequence_number).toBe(1);
    expect(e1.prev_event_hash).toBe(e0.event_hash);
    expect(e1.event_hash).toBe(computeEventHash(eventContentFromRow(e1), e0.event_hash!));
    expect(e1.signed_at).toBe(ISO2);
  });

  it('throws when the signed_document does not exist', async () => {
    const sb = makeFakeSupabase({ signed_documents: [] });
    await expect(
      appendSignatureEvent(
        { signedDocumentId: 'missing', signer: { role: 'owner', name: 'X' }, method: 'typed', signatureData: 'X' },
        { client: sb, resolveBytes: fixedResolver, now: () => ISO1 },
      ),
    ).rejects.toMatchObject({ code: 'signed_document_not_found' });
  });

  it('refuses to extend a chain that has an unchained (legacy) predecessor', async () => {
    const sb = makeFakeSupabase({
      signed_documents: [seedDoc({ document_hash: BYTE_HASH })],
      signature_events: [
        {
          id: 'legacy-1',
          signed_document_id: 'doc-1',
          signer_role: 'owner',
          signer_name: 'Legacy',
          signature_method: 'typed',
          signed_at: '2026-05-01T00:00:00.000Z',
          sequence_number: null, // legacy row, never chained
          prev_event_hash: null,
          event_hash: null,
        },
      ],
    });
    await expect(
      appendSignatureEvent(
        { signedDocumentId: 'doc-1', signer: { role: 'gc', name: 'Greg' }, method: 'typed', signatureData: 'Greg' },
        { client: sb, resolveBytes: fixedResolver, now: () => ISO2 },
      ),
    ).rejects.toBeInstanceOf(SigningChainError);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// buildSigningPacket — export contains document + full chain, from stored data
// ───────────────────────────────────────────────────────────────────────────

describe('buildSigningPacket', () => {
  it('packages the document, exact bytes, and ordered chain', async () => {
    const { sb } = await signedFixture();
    const packet = await buildSigningPacket('doc-1', {
      client: sb,
      resolveBytes: fixedResolver,
      now: () => '2026-06-01T11:00:00.000Z',
    });

    expect(packet.packet_version).toBe(PACKET_VERSION);
    expect(packet.signed_document_id).toBe('doc-1');
    expect(packet.document.title).toBe('Master Subcontract Agreement');
    expect(packet.document.document_hash).toBe(BYTE_HASH);
    expect(packet.chain_anchor).toBe(BYTE_HASH);
    expect(packet.document_bytes_source).toBe('pdf');

    // Embedded bytes are the exact document bytes.
    expect(Buffer.from(packet.document_bytes_base64, 'base64').equals(Buffer.from(DOC_BYTES))).toBe(true);

    // Full chain, ordered.
    expect(packet.events).toHaveLength(2);
    expect(packet.events.map((e) => e.sequence_number)).toEqual([0, 1]);
    expect(packet.packet_hash).toBe(computePacketHash(packet));
  });

  it('throws 404-style error for a missing document', async () => {
    const sb = makeFakeSupabase({ signed_documents: [] });
    await expect(
      buildSigningPacket('nope', { client: sb, resolveBytes: fixedResolver }),
    ).rejects.toMatchObject({ code: 'signed_document_not_found' });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// verifySigningPacket — PASS untampered, FAIL on tamper
// ───────────────────────────────────────────────────────────────────────────

describe('verifySigningPacket', () => {
  async function freshPacket(): Promise<SigningPacket> {
    const { sb } = await signedFixture();
    return buildSigningPacket('doc-1', { client: sb, resolveBytes: fixedResolver, now: () => ISO2 });
  }

  it('PASSES on an untampered packet', async () => {
    const result = verifySigningPacket(await freshPacket());
    expect(result.valid).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.events_verified).toBe(2);
  });

  it('FAILS when a document byte is altered (naive)', async () => {
    const packet = clone(await freshPacket());
    const bytes = Buffer.from(packet.document_bytes_base64, 'base64');
    bytes[0] ^= 0xff; // flip a byte
    packet.document_bytes_base64 = bytes.toString('base64');

    const result = verifySigningPacket(packet);
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('document_hash_matches');
  });

  it('FAILS on byte alteration EVEN IF the wrapper packet_hash is re-stamped', async () => {
    const packet = clone(await freshPacket());
    const bytes = Buffer.from(packet.document_bytes_base64, 'base64');
    bytes[5] ^= 0xff;
    packet.document_bytes_base64 = bytes.toString('base64');
    packet.packet_hash = computePacketHash(packet); // attacker re-stamps the wrapper

    const result = verifySigningPacket(packet);
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('document_hash_matches');
    // The wrapper now matches, proving the document anchor — not the wrapper — caught it.
    expect(result.failures).not.toContain('packet_hash_intact');
  });

  it('FAILS when events are reordered (naive)', async () => {
    const packet = clone(await freshPacket());
    packet.events.reverse();
    const result = verifySigningPacket(packet);
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('event[0].sequence');
    expect(result.failures).toContain('event[0].prev_link');
  });

  it('FAILS on reorder EVEN IF the wrapper packet_hash is re-stamped', async () => {
    const packet = clone(await freshPacket());
    packet.events.reverse();
    packet.packet_hash = computePacketHash(packet); // attacker re-stamps the wrapper

    const result = verifySigningPacket(packet);
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('event[0].prev_link');
    expect(result.failures).not.toContain('packet_hash_intact');
  });

  it('FAILS when an earlier event is mutated, even with its own hash + wrapper re-stamped (cascade)', async () => {
    const packet = clone(await freshPacket());
    // Tamper event[0]'s captured name and recompute ONLY event[0]'s hash + the wrapper.
    packet.events[0].signer_name = 'IMPOSTER';
    packet.events[0].event_hash = computeEventHash(
      eventContentFromRow(packet.events[0]),
      packet.events[0].prev_event_hash ?? '',
    );
    packet.packet_hash = computePacketHash(packet);

    const result = verifySigningPacket(packet);
    expect(result.valid).toBe(false);
    // event[0] now self-consistent, but event[1] still links to the OLD event[0] hash.
    expect(result.failures).toContain('event[1].prev_link');
    expect(result.failures).not.toContain('event[0].event_hash_recomputes');
    expect(result.failures).not.toContain('packet_hash_intact');
  });

  it('FAILS when an event field is mutated without re-hashing', async () => {
    const packet = clone(await freshPacket());
    packet.events[1].signer_email = 'attacker@evil.test';
    const result = verifySigningPacket(packet);
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('event[1].event_hash_recomputes');
  });

  it('verifies a document with zero signatures (anchored, empty chain)', async () => {
    const sb = makeFakeSupabase({ signed_documents: [seedDoc({ document_hash: BYTE_HASH })] });
    const packet = await buildSigningPacket('doc-1', { client: sb, resolveBytes: fixedResolver });
    const result = verifySigningPacket(packet);
    expect(result.valid).toBe(true);
    expect(result.events_verified).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// verifyStoredDocument — re-hash a stored document live
// ───────────────────────────────────────────────────────────────────────────

describe('verifyStoredDocument', () => {
  it('end-to-end: a document signs, then verifies clean against stored data', async () => {
    const { sb } = await signedFixture();
    const { result } = await verifyStoredDocument('doc-1', { client: sb, resolveBytes: fixedResolver });
    expect(result.valid).toBe(true);
    expect(result.events_verified).toBe(2);
  });

  it('FAILS when the stored document bytes no longer hash to document_hash', async () => {
    const { sb } = await signedFixture();
    // Verify with a resolver that returns DIFFERENT bytes — simulating the
    // underlying document being altered after signing.
    const tamperedResolver: DocumentByteResolver = async () => ({
      bytes: new TextEncoder().encode('%PDF-1.7 ALTERED contract body'),
      source: 'pdf',
    });
    const { result } = await verifyStoredDocument('doc-1', { client: sb, resolveBytes: tamperedResolver });
    expect(result.valid).toBe(false);
    expect(result.failures).toContain('document_hash_matches');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// canonicalizeEvent guard — field order is part of the contract
// ───────────────────────────────────────────────────────────────────────────

describe('canonicalizeEvent', () => {
  it('encodes the version tag and prev hash so a serialization change is detectable', () => {
    const content = eventContentFromRow({
      signed_document_id: 'd',
      sequence_number: 0,
      signer_user_id: null,
      signer_role: 'owner',
      signer_name: 'N',
      signer_email: null,
      signature_method: 'typed',
      signature_data: 'N',
      ip_address: null,
      user_agent: null,
      signed_at: ISO1,
    } as SignatureEventRow);
    const str = canonicalizeEvent(content, 'PREV');
    expect(str).toContain('bkg-sigchain-event-v1');
    expect(str).toContain('PREV');
  });
});
