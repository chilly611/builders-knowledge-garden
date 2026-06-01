/**
 * Contract tests for the verify endpoint (STAGE 5).
 *   GET  → verify the stored document (auth-gated)
 *   POST → verify an uploaded packet (offline)
 * The chain engine itself is unit-tested in signing-chain.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  class MockSigningChainError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'SigningChainError';
    }
  }
  const result = {
    valid: true,
    summary: 'ok',
    signed_document_id: 'doc-1',
    events_verified: 0,
    checks: [],
    failures: [] as string[],
  };
  return {
    SigningChainError: MockSigningChainError,
    state: {
      user: { id: 'u-creator', email: 'creator@example.test' } as { id: string; email?: string } | null,
      packet: { signed_document_id: 'doc-1', document: { id: 'doc-1' }, events: [] } as Record<string, unknown>,
      result,
      buildError: null as Error | null,
      access: true,
    },
  };
});

vi.mock('@/lib/auth-server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    getAuthUser: vi.fn(async () => mocks.state.user),
    getServiceClient: vi.fn(() => ({ from: () => ({}) })),
    unauthorizedResponse: (message = 'Authentication required') =>
      NextResponse.json({ error: message }, { status: 401 }),
  };
});

vi.mock('@/lib/signing-chain', () => ({
  SigningChainError: mocks.SigningChainError,
  verifyStoredDocument: vi.fn(async () => {
    if (mocks.state.buildError) throw mocks.state.buildError;
    return { result: mocks.state.result, packet: mocks.state.packet };
  }),
  verifySigningPacket: vi.fn((p: { signed_document_id: string; events: unknown[] }) => ({
    ...mocks.state.result,
    signed_document_id: p.signed_document_id,
    events_verified: (p.events ?? []).length,
  })),
}));

vi.mock('@/lib/signing-access', () => ({
  callerCanAccessDocument: vi.fn(async () => mocks.state.access),
}));

import { GET, POST } from '../route';

const params = Promise.resolve({ id: 'doc-1' });
const getReq = () => new NextRequest('https://x.test/api/v1/signatures/doc-1/verify');
function postReq(body: unknown) {
  return new NextRequest('https://x.test/api/v1/signatures/doc-1/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/v1/signatures/:id/verify', () => {
  beforeEach(() => {
    mocks.state.user = { id: 'u-creator', email: 'creator@example.test' };
    mocks.state.buildError = null;
    mocks.state.access = true;
  });

  it('401 without authentication', async () => {
    mocks.state.user = null;
    const res = await GET(getReq(), { params });
    expect(res.status).toBe(401);
  });

  it('404 when the document is not found', async () => {
    mocks.state.buildError = new mocks.SigningChainError('signed_document_not_found', 'nope');
    const res = await GET(getReq(), { params });
    expect(res.status).toBe(404);
  });

  it('403 when the caller lacks access', async () => {
    mocks.state.access = false;
    const res = await GET(getReq(), { params });
    expect(res.status).toBe(403);
  });

  it('200 returns the verification result', async () => {
    const res = await GET(getReq(), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
  });
});

describe('POST /api/v1/signatures/:id/verify', () => {
  beforeEach(() => {
    mocks.state.user = { id: 'u-creator', email: 'creator@example.test' };
  });

  it('401 without authentication', async () => {
    mocks.state.user = null;
    const res = await POST(postReq({ packet: { signed_document_id: 'doc-1', events: [] } }), { params });
    expect(res.status).toBe(401);
  });

  it('400 when the body is not a packet', async () => {
    const res = await POST(postReq({ nonsense: true }), { params });
    expect(res.status).toBe(400);
  });

  it('400 when the packet is for a different document', async () => {
    const res = await POST(postReq({ packet: { signed_document_id: 'other-doc', events: [] } }), { params });
    expect(res.status).toBe(400);
  });

  it('200 verifies a well-formed uploaded packet', async () => {
    const res = await POST(postReq({ packet: { signed_document_id: 'doc-1', events: [] } }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
  });
});
