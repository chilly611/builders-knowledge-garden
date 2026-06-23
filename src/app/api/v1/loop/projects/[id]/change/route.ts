// Change a variable (write side of the One Loop).
//
// One endpoint, four moves — each writes the model, lets the DB triggers cascade
// every dependent total, persists an immutable attributed event, asserts
// reconciliation, and returns the fresh project totals:
//   post_expense        — money spent (actual ↑, draws a commitment if linked)
//   approve_change_order — moves revised budget
//   set_etc             — estimate-to-complete override
//   reverse_entry        — "undo that" (a new balancing entry, never a delete)
// Write-access reuses the shared project grants (owner | demo | collaborator).
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { assertProjectWriteAccess } from '@/lib/auth/projectOwnership';

type ChangeBody =
  | { kind: 'post_expense'; code: string; amount: number; commitment_id?: string; memo?: string; source?: string }
  | { kind: 'approve_change_order'; change_order_id: string }
  | { kind: 'set_etc'; code: string; amount: number }
  | { kind: 'reverse_entry'; entry_id: string };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id: projectId } = await params;
  const access = await assertProjectWriteAccess(request, projectId, user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: ChangeBody;
  try {
    body = (await request.json()) as ChangeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let rpc: string;
  let args: Record<string, unknown>;
  switch (body?.kind) {
    case 'post_expense':
      if (!body.code || typeof body.amount !== 'number' || body.amount <= 0) {
        return NextResponse.json({ error: 'code and a positive amount are required' }, { status: 400 });
      }
      rpc = 'oneloop_post_expense';
      args = {
        p_project: projectId, p_code: body.code, p_amount: body.amount,
        p_commitment: body.commitment_id ?? null, p_actor: user.id,
        p_memo: body.memo ?? null, p_source: body.source ?? 'api',
      };
      break;
    case 'approve_change_order':
      if (!body.change_order_id) return NextResponse.json({ error: 'change_order_id required' }, { status: 400 });
      rpc = 'oneloop_approve_change_order';
      args = { p_co: body.change_order_id, p_actor: user.id };
      break;
    case 'set_etc':
      if (!body.code || typeof body.amount !== 'number') {
        return NextResponse.json({ error: 'code and amount required' }, { status: 400 });
      }
      rpc = 'oneloop_set_etc';
      args = { p_project: projectId, p_code: body.code, p_amount: body.amount, p_actor: user.id };
      break;
    case 'reverse_entry':
      if (!body.entry_id) return NextResponse.json({ error: 'entry_id required' }, { status: 400 });
      rpc = 'oneloop_reverse_entry';
      args = { p_entry: body.entry_id, p_actor: user.id };
      break;
    default:
      return NextResponse.json({ error: 'unknown change kind' }, { status: 400 });
  }

  const { data, error } = await getServiceClient().rpc(rpc, args);
  if (error) {
    // The RPC reconciles before returning; a raise here means the change was
    // rejected (unbalanced / unknown code / wouldn't reconcile) — surface it.
    return NextResponse.json({ error: 'Change rejected', detail: error.message }, { status: 422 });
  }
  return NextResponse.json({ ok: true, financials: data });
}
