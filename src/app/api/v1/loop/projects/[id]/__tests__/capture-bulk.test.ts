/**
 * Bulk capture test — many voice + photo field reports in one request.
 *
 * Proves: the batch structures every item, each lands in the right CATEGORY, expenses
 * post to the LEDGER (the ingest RPC is called with amount + cost_code + kind + date +
 * actor), roadmap kinds (video) are stored-not-dropped, and a single structuring failure
 * is ISOLATED (the rest still land). The AI seam is mocked — which is the whole point of
 * isolating it: the pipeline runs deterministically with no Whisper/Claude call.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const PROJECT = '55730cd3-5225-493d-8b5c-49086d942565';
const USER = '11111111-1111-4111-8111-111111111111';

const state = {
  user: null as null | { id: string; email: string; name: string },
  access: { ok: true } as { ok: true } | { ok: false; status: number; error: string },
  rpcCalls: [] as Array<Record<string, unknown>>,
};

// AI seam — fully mocked (model-swap insurance + deterministic test). No vendor SDK touched.
vi.mock('@/lib/capture/structurer', () => {
  class CaptureError extends Error {}
  const rec = (category: string, cost_code: string | null, amount: number | null, model = 'mock-claude') => ({
    category, cost_code, amount, vendor: null, occurred_on: '2026-06-23',
    summary: `${category} item`, confidence: 0.9, model,
  });
  const fake = {
    transcribe: async ({ storageUrl }: { storageUrl?: string }) => ({ transcript: `transcribed(${storageUrl})`, model: 'mock-whisper' }),
    structure: async ({ kind, transcript }: { kind: string; transcript?: string }) => {
      const t = transcript ?? '';
      if (t.includes('BOOM')) throw new CaptureError('mock structuring failure');
      if (/12,?000/.test(t)) return rec('expense', '03 30 00', 12000);
      if (/5,?000/.test(t)) return rec('expense', '06 10 00', 5000);
      if (kind === 'photo') return rec('progress', null, null);
      return rec('safety', null, null);
    },
  };
  return {
    getStructurer: async () => fake,
    isSupportedKind: (k: string) => ['voice', 'photo'].includes(k),
    isRoadmapKind: (k: string) => ['sketch', 'cad', 'blueprint', 'video'].includes(k),
    CaptureError,
  };
});

vi.mock('@/lib/auth-server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    getAuthUser: async () => state.user,
    unauthorizedResponse: (m = 'Authentication required') => NextResponse.json({ error: m }, { status: 401 }),
    getServiceClient: () => ({
      rpc: async (_name: string, args: Record<string, unknown>) => {
        state.rpcCalls.push(args);
        const id = `cap-${state.rpcCalls.length}`;
        if (args.p_category === 'expense' && typeof args.p_amount === 'number' && (args.p_amount as number) > 0 && args.p_cost_code) {
          return { data: { capture_id: id, status: 'posted', category: 'expense', posted: true, financials: { project_id: PROJECT, headroom: 335000 } }, error: null };
        }
        const status = args.p_kind === 'voice' || args.p_kind === 'photo' ? 'structured' : 'unsupported';
        return { data: { capture_id: id, status, category: args.p_category, posted: false, financials: null }, error: null };
      },
    }),
  };
});

vi.mock('@/lib/auth/projectOwnership', () => ({
  assertProjectWriteAccess: async () => state.access,
  assertProjectReadAccess: async () => state.access,
}));

import { POST } from '../capture/route';

const ctx = { params: Promise.resolve({ id: PROJECT }) };
const req = (body: unknown) =>
  new NextRequest('http://localhost/api/v1/loop/projects/x/capture', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  state.user = { id: USER, email: 'gc@x.com', name: 'GC' };
  state.access = { ok: true };
  state.rpcCalls = [];
});

describe('POST capture (bulk)', () => {
  it('401 / 403 / 400 gating', async () => {
    state.user = null;
    expect((await POST(req({ captures: [{ kind: 'voice', transcript: 'x' }] }), ctx)).status).toBe(401);
    state.user = { id: USER, email: 'g', name: 'g' };
    state.access = { ok: false, status: 403, error: 'no' };
    expect((await POST(req({ captures: [{ kind: 'voice', transcript: 'x' }] }), ctx)).status).toBe(403);
    state.access = { ok: true };
    expect((await POST(req({ captures: [] }), ctx)).status).toBe(400);
  });

  it('processes a mixed bulk batch — categorizes, posts expenses, isolates a failure', async () => {
    const res = await POST(req({ captures: [
      { kind: 'voice', transcript: 'add $12,000 to concrete', client_ref: 'a' }, // expense → posted
      { kind: 'photo', storage_url: 'http://img/1.jpg', client_ref: 'b' },        // progress → structured
      { kind: 'voice', transcript: 'paid $5,000 to framing', client_ref: 'c' },   // expense → posted
      { kind: 'video', storage_url: 'http://v/1.mp4', client_ref: 'd' },          // roadmap → unsupported
      { kind: 'voice', storage_url: 'http://aud/5.m4a', client_ref: 'e' },        // no transcript → transcribed → safety → structured
      { kind: 'voice', transcript: 'BOOM', client_ref: 'f' },                     // structuring throws → failed
    ] }), ctx);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { summary: Record<string, number>; results: Array<Record<string, unknown>> };

    expect(body.summary).toEqual({ total: 6, posted: 2, structured: 2, unsupported: 1, failed: 1 });
    expect(body.results.map((r) => r.status)).toEqual(['posted', 'structured', 'posted', 'unsupported', 'structured', 'failed']);

    // The failed item never reached the ledger; the other five each got an ingest call.
    expect(state.rpcCalls).toHaveLength(5);

    // Expense (item a) posted with amount + cost code + kind (type) + date + actor.
    const a = state.rpcCalls.find((c) => c.p_client_ref === 'a')!;
    expect(a).toMatchObject({ p_category: 'expense', p_amount: 12000, p_cost_code: '03 30 00', p_kind: 'voice', p_occurred_on: '2026-06-23', p_actor: USER });
    expect((body.results[0] as { financials?: { headroom?: number } }).financials?.headroom).toBe(335000);

    // Voice with no transcript was transcribed first (the seam's transcribe ran).
    const e = state.rpcCalls.find((c) => c.p_client_ref === 'e')!;
    expect(String(e.p_transcript)).toContain('transcribed(http://aud/5.m4a)');

    // Roadmap kind: stored, not dropped — and clearly not auto-structured.
    const d = state.rpcCalls.find((c) => c.p_client_ref === 'd')!;
    expect(d).toMatchObject({ p_kind: 'video', p_model: 'none' });
    expect(body.results[3].status).toBe('unsupported');

    // Failure isolation: item f surfaced an error, didn't poison the batch.
    expect(body.results[5]).toMatchObject({ status: 'failed', client_ref: 'f' });
  });

  it('rejects an over-large batch (bulk guardrail)', async () => {
    const many = Array.from({ length: 101 }, (_, i) => ({ kind: 'voice', transcript: 'x', client_ref: String(i) }));
    expect((await POST(req({ captures: many }), ctx)).status).toBe(413);
  });
});
