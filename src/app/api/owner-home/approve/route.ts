/**
 * POST /api/owner-home/approve
 *
 * The Owner Lane's REAL approval path for the framing pay-app shown in
 * "Needs you". Persists the owner's decision so it survives leave → return —
 * this is the shipping gate for the lane.
 *
 * Body: { projectId: string, approve?: boolean }  (approve defaults to true;
 *        approve:false is the Undo path and reverts the row to 'proposed').
 *
 * Gating: the authenticated user must hold the `change_orders`/`approve` Lens
 * cell (the Owner lane does — see 20260528_lanes_lens_permission_matrix.sql).
 * Fail-closed 403 otherwise, even if the client somehow enabled the button.
 * The owner never approves anything margin-related — this is a budget-total /
 * change-order surface only.
 *
 * Persistence: reuses the existing `project_change_orders` table — NO schema
 * change. See ../approval-store.ts for the marker-row contract.
 *
 * Dev preview: `?preview=1` bypasses auth + Lens AND the DB write in
 * non-production builds only, returning ok so the design can be exercised
 * without a seeded membership or a live database. Compiled-out of meaning in
 * production via the NODE_ENV guard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient } from '@/lib/auth-server';
import { checkLensPermission } from '@/lib/lens/check-permission';
import { setFramingApprovalStatus } from '../approval-store';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const preview =
    process.env.NODE_ENV !== 'production' && url.searchParams.get('preview') === '1';

  let body: { projectId?: string; approve?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projectId } = body;
  const approve = body.approve !== false; // default to approving
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Preview: no auth, no Lens, no DB — acknowledge so design QA can flip the
  // card. Real persistence only happens on the authenticated path below.
  if (preview) {
    return NextResponse.json({ ok: true, status: approve ? 'approved' : 'pending', preview: true });
  }

  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const decision = await checkLensPermission({
    userId: user.id,
    projectId,
    dataCategory: 'change_orders',
    action: 'approve',
  });
  if (decision !== 'permitted') {
    return NextResponse.json(
      { error: 'Your Lens does not permit approving this payment' },
      { status: 403 },
    );
  }

  const result = await setFramingApprovalStatus(getServiceClient(), projectId, approve);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: result.status });
}
