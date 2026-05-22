import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';

/**
 * /api/v1/audit-log — read-only audit trail viewer for the bookkeeper.
 *
 * Triggers on vendors / invoices / invoice_payments / invoice_line_items
 * write rows to audit_log on every insert / update / delete (action is
 * lowercase as of today's audit_trail_action fix).
 *
 * Scope: today returns all rows the user can see. We intentionally don't
 * filter by user_id at the audit row level — the audit log captures who
 * did what across the whole org, and bookkeepers need that visibility.
 * Once the org-membership model lands we'll re-scope by tenant.
 */

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const action = searchParams.get('action');
    const userIdFilter = searchParams.get('user_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = Math.min(Number(searchParams.get('limit') || 200), 1000);

    let q = getServiceClient()
      .from('audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);
    if (table) q = q.eq('table_name', table);
    if (action) q = q.eq('action', action.toLowerCase());
    if (userIdFilter) q = q.eq('changed_by', userIdFilter);
    if (from) q = q.gte('changed_at', from);
    if (to) q = q.lte('changed_at', to);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data || [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
