// The live picture (read side of the One Loop).
//
// Returns project totals + per-cost-code rows from the canonical model, via the
// reconciliation-checked oneloop_picture() RPC. If the numbers don't reconcile,
// the RPC RAISES and we return 503 — honest-UI at the edge: never serve a figure
// that doesn't balance. Auth reuses the shared foundation (getAuthUser + the
// project read-access grants).
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { assertProjectReadAccess } from '@/lib/auth/projectOwnership';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id: projectId } = await params;
  const access = await assertProjectReadAccess(request, projectId, user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error } = await getServiceClient().rpc('oneloop_picture', { p_project: projectId });
  if (error) {
    return NextResponse.json(
      { error: 'Financials unavailable (failed to reconcile)', detail: error.message },
      { status: 503 },
    );
  }
  if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json(data);
}
