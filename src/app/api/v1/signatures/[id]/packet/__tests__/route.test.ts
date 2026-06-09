/**
 * Contract tests for GET /api/v1/signatures/:id/packet (STAGE 5).
 * The chain engine is unit-tested in signing-chain.test.ts; here we isolate
 * the route's auth gating, error mapping, and response shape.
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
  return {
    SigningChainError: MockSigningChainError,
    state: {
      user: { id: 'u-creator', email: 'creator@example.test' } as { id: string; email?: string } | null,
      packet: {
        signed_document_id: 'doc-1',
        document: { id: 'doc-1', created_by: 'u-creator' },
        events: [],
        document_bytes_base64: '',
      } as Record<string, unknown>,
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
  buildSigningPacket: vi.fn(async () => {
    if (mocks.state.buildError) throw mocks.state.buildError;
    return mocks.state.packet;
  }),
}));

vi.mock('@/lib/signing-access', () => ({
  callerCanAccessDocument: vi.fn(async () => mocks.state.access),
}));

import { GET } from '../route';

const params = Promise.resolve({ id: 'doc-1' });
function req(url = 'https://x.test/api/v1/signatures/doc-1/packet') {
  return new NextRequest(url);
}

describe('GET /api/v1/signatures/:id/packet', () => {
  beforeEach(() => {
    mocks.state.user = { id: 'u-creator', email: 'creator@example.test' };
    mocks.state.buildError = null;
    mocks.state.access = true;
  });

  it('401 without authentication', async () => {
    mocks.state.user = null;
    const res = await GET(req(), { params });
    expect(res.status).toBe(401);
  });

  it('404 when the signed document is not found', async () => {
    mocks.state.buildError = new mocks.SigningChainError('signed_document_not_found', 'nope');
    const res = await GET(req(), { params });
    expect(res.status).toBe(404);
  });

  it('403 when the caller lacks access', async () => {
    mocks.state.access = false;
    const res = await GET(req(), { params });
    expect(res.status).toBe(403);
  });

  it('200 returns the packet for an authorized caller', async () => {
    const res = await GET(req(), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.packet.signed_document_id).toBe('doc-1');
  });

  it('sets a download filename with ?download=1', async () => {
    const res = await GET(req('https://x.test/api/v1/signatures/doc-1/packet?download=1'), { params });
    expect(res.headers.get('content-disposition')).toContain('signing-packet-doc-1.json');
  });
});
