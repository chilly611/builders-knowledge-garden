/**
 * One-Loop endpoint tests — auth gating, change dispatch, honest failure.
 * The ledger/cascade/reconciliation correctness is proven separately against real
 * Postgres in scripts/oneloop/selftest.sh; here we pin the HTTP contract: who may
 * act, which RPC each change maps to, and that a non-reconciling change surfaces
 * (never a fake 200).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const PROJECT = '55730cd3-5225-493d-8b5c-49086d942565';
const OWNER = '11111111-1111-4111-8111-111111111111';

const state = {
  user: null as null | { id: string; email: string; name: string },
  access: { ok: true } as { ok: true } | { ok: false; status: number; error: string },
  rpcError: null as null | { message: string },
  rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
};

vi.mock('@/lib/auth-server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    getAuthUser: async () => state.user,
    unauthorizedResponse: (m = 'Authentication required') => NextResponse.json({ error: m }, { status: 401 }),
    getServiceClient: () => ({
      rpc: async (name: string, args: Record<string, unknown>) => {
        state.rpcCalls.push({ name, args });
        if (state.rpcError) return { data: null, error: state.rpcError };
        return { data: { project_id: PROJECT, remaining: 1140000, headroom: 335000 }, error: null };
      },
    }),
  };
});

vi.mock('@/lib/auth/projectOwnership', () => ({
  assertProjectReadAccess: async () => state.access,
  assertProjectWriteAccess: async () => state.access,
}));

import { GET } from '../financials/route';
import { POST } from '../change/route';

const ctx = { params: Promise.resolve({ id: PROJECT }) };
const changeReq = (body: unknown) =>
  new NextRequest('http://localhost/api/v1/loop/projects/x/change', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });
const getReq = () => new NextRequest('http://localhost/api/v1/loop/projects/x/financials');

beforeEach(() => {
  state.user = { id: OWNER, email: 'o@x.com', name: 'Owner' };
  state.access = { ok: true };
  state.rpcError = null;
  state.rpcCalls = [];
});

describe('GET financials (the live picture)', () => {
  it('401 without a user', async () => {
    state.user = null;
    expect((await GET(getReq(), ctx)).status).toBe(401);
  });
  it('403 when the caller lacks read access', async () => {
    state.access = { ok: false, status: 403, error: 'nope' };
    expect((await GET(getReq(), ctx)).status).toBe(403);
  });
  it('200 returns the reconciliation-checked picture', async () => {
    const res = await GET(getReq(), ctx);
    expect(res.status).toBe(200);
    expect(state.rpcCalls[0]).toEqual({ name: 'oneloop_picture', args: { p_project: PROJECT } });
  });
  it('503 (not a fake number) when the RPC fails to reconcile', async () => {
    state.rpcError = { message: 'reconcile[..]: cache != view' };
    expect((await GET(getReq(), ctx)).status).toBe(503);
  });
});

describe('POST change (change a variable)', () => {
  it('401 without a user', async () => {
    state.user = null;
    expect((await POST(changeReq({ kind: 'set_etc', code: '03 30 00', amount: 1 }), ctx)).status).toBe(401);
  });
  it('403 for a non-member', async () => {
    state.access = { ok: false, status: 403, error: 'nope' };
    expect((await POST(changeReq({ kind: 'post_expense', code: '03 30 00', amount: 100 }), ctx)).status).toBe(403);
  });
  it('400 on unknown kind / bad input', async () => {
    expect((await POST(changeReq({ kind: 'nope' }), ctx)).status).toBe(400);
    expect((await POST(changeReq({ kind: 'post_expense', code: '03 30 00', amount: -5 }), ctx)).status).toBe(400);
  });
  it('post_expense maps to oneloop_post_expense with the right args + actor', async () => {
    const res = await POST(changeReq({ kind: 'post_expense', code: '03 30 00', amount: 12000, memo: 'beam' }), ctx);
    expect(res.status).toBe(200);
    expect(state.rpcCalls[0].name).toBe('oneloop_post_expense');
    expect(state.rpcCalls[0].args).toMatchObject({ p_project: PROJECT, p_code: '03 30 00', p_amount: 12000, p_actor: OWNER, p_memo: 'beam' });
    const body = (await res.json()) as { ok: boolean; financials: { headroom: number } };
    expect(body.ok).toBe(true);
    expect(body.financials.headroom).toBe(335000);
  });
  it('reverse_entry maps to oneloop_reverse_entry (the undo)', async () => {
    await POST(changeReq({ kind: 'reverse_entry', entry_id: 'e1' }), ctx);
    expect(state.rpcCalls[0]).toEqual({ name: 'oneloop_reverse_entry', args: { p_entry: 'e1', p_actor: OWNER } });
  });
  it('approve_change_order + set_etc map correctly', async () => {
    await POST(changeReq({ kind: 'approve_change_order', change_order_id: 'co1' }), ctx);
    expect(state.rpcCalls[0]).toEqual({ name: 'oneloop_approve_change_order', args: { p_co: 'co1', p_actor: OWNER } });
    state.rpcCalls = [];
    await POST(changeReq({ kind: 'set_etc', code: '06 10 00', amount: 350000 }), ctx);
    expect(state.rpcCalls[0].name).toBe('oneloop_set_etc');
  });
  it('422 (not a fake success) when the change is rejected / would not reconcile', async () => {
    state.rpcError = { message: 'journal entry unbalanced' };
    const res = await POST(changeReq({ kind: 'post_expense', code: '03 30 00', amount: 100 }), ctx);
    expect(res.status).toBe(422);
  });
});
