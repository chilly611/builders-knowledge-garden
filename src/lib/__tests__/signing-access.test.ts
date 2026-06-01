/**
 * Tests for signing-packet access control (STAGE 5).
 */

import { describe, it, expect } from 'vitest';
import { callerCanAccessDocument } from '../signing-access';
import type { SignedDocumentRow, SignatureEventRow, SupabaseLike } from '../signing-chain';

function doc(overrides: Partial<SignedDocumentRow> = {}): SignedDocumentRow {
  return {
    id: 'doc-1',
    project_id: 'proj-1',
    document_type: 'contract',
    document_id: null,
    document_hash: 'h',
    pdf_url: null,
    title: 'T',
    status: 'pending',
    required_signers: [{ role: 'gc', email: 'gc@example.test', user_id: 'u-gc' }],
    created_by: 'u-creator',
    created_at: null,
    finalized_at: null,
    ...overrides,
  };
}

// Minimal client whose event query resolves to the given rows.
function clientWithEvents(events: Partial<SignatureEventRow>[]): SupabaseLike {
  return {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: events, error: null }),
      }),
    }),
  } as unknown as SupabaseLike;
}

const noClient = { from: () => ({}) } as unknown as SupabaseLike;

describe('callerCanAccessDocument', () => {
  it('allows the document creator', async () => {
    const ok = await callerCanAccessDocument(noClient, { id: 'u-creator' }, doc(), []);
    expect(ok).toBe(true);
  });

  it('allows a required signer matched by email (case-insensitive)', async () => {
    const ok = await callerCanAccessDocument(noClient, { id: 'u-x', email: 'GC@example.test' }, doc(), []);
    expect(ok).toBe(true);
  });

  it('allows a required signer matched by user_id', async () => {
    const ok = await callerCanAccessDocument(noClient, { id: 'u-gc' }, doc(), []);
    expect(ok).toBe(true);
  });

  it('allows someone with a recorded signature event (passed in)', async () => {
    const ok = await callerCanAccessDocument(
      noClient,
      { id: 'u-witness', email: 'w@example.test' },
      doc({ required_signers: [] }),
      [{ signer_user_id: 'u-witness', signer_email: 'w@example.test' } as SignatureEventRow],
    );
    expect(ok).toBe(true);
  });

  it('falls back to querying events when none are passed', async () => {
    const ok = await callerCanAccessDocument(
      clientWithEvents([{ signer_user_id: 'u-witness', signer_email: null }]),
      { id: 'u-witness' },
      doc({ required_signers: [] }),
    );
    expect(ok).toBe(true);
  });

  it('denies a stranger with no link to the document', async () => {
    const ok = await callerCanAccessDocument(
      clientWithEvents([]),
      { id: 'u-stranger', email: 'stranger@example.test' },
      doc({ required_signers: [] }),
    );
    expect(ok).toBe(false);
  });
});
