import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';

/**
 * /api/v1/vendors — CRUD for the vendor master.
 *
 * Auth pattern mirrors /api/v1/rfis/route.ts (2026-05-22 BUDGET+SEC2):
 *   1. Bearer-token auth via getAuthUser.
 *   2. When a project_id is supplied, verify access against the demo
 *      allowlist OR the caller's command_center_projects.user_id row
 *      OR the trial-contractor demo_project_id in user_metadata.
 *   3. Service-role queries only after access is verified.
 *
 * The vendors table has no soft-delete column — DELETE is hard delete
 * (audit_log trigger preserves the deletion record).
 */

const DEMO_PROJECT_IDS = new Set<string>([
  '55730cd3-5225-493d-8b5c-49086d942565',
  'aa11b22c-1111-4d78-aaaa-bbccdd112233',
  'bb22c33d-2222-4d78-bbbb-ccddee223344',
]);

async function getCallerDemoProjectId(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    const sb = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return null;
    const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
    const v = meta.demo_project_id;
    return typeof v === 'string' && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

async function verifyProjectAccess(
  request: NextRequest,
  projectId: string,
  userId: string
): Promise<boolean> {
  if (DEMO_PROJECT_IDS.has(projectId)) return true;
  const callerDemo = await getCallerDemoProjectId(request);
  if (callerDemo && callerDemo === projectId) return true;
  const { data, error } = await getServiceClient()
    .from('command_center_projects')
    .select('id, user_id')
    .eq('id', projectId)
    .maybeSingle();
  if (error || !data) return false;
  return String(data.user_id) === String(userId);
}

const VENDOR_FIELDS = [
  'legal_name',
  'dba',
  'ein',
  'w9_on_file_at',
  'cslb_number',
  'cslb_classification',
  'cslb_expiry',
  'bond_number',
  'bond_amount',
  'insurance_gl_expiry',
  'insurance_wc_expiry',
  'insurance_auto_expiry',
  'address_street',
  'address_city',
  'address_state',
  'address_zip',
  'phone',
  'email',
  'payment_terms',
  'is_1099_eligible',
  'project_id',
  'org_id',
] as const;

/**
 * List org ids the caller is a member of.
 */
async function getCallerOrgIds(userId: string): Promise<string[]> {
  const { data, error } = await getServiceClient()
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId);
  if (error || !data) return [];
  return data.map((r: { org_id: string }) => r.org_id);
}

type VendorRecord = Record<(typeof VENDOR_FIELDS)[number], unknown>;

function pickVendorFields(body: Record<string, unknown>): Partial<VendorRecord> {
  const out: Partial<VendorRecord> = {};
  for (const key of VENDOR_FIELDS) {
    if (key in body) out[key] = body[key];
  }
  return out;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const orgIdFilter = searchParams.get('org_id');
    const sb = getServiceClient();

    if (projectId) {
      const allowed = await verifyProjectAccess(request, projectId, user.id);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Project not found or unauthorized' },
          { status: 403 }
        );
      }
      const { data, error } = await sb
        .from('vendors')
        .select('*')
        .eq('project_id', projectId)
        .order('legal_name', { ascending: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ vendors: data || [] });
    }

    // Resolve caller's orgs (used for org-scoped visibility + filter).
    const callerOrgIds = await getCallerOrgIds(user.id);

    // Optional explicit org filter — must be one the caller belongs to.
    if (orgIdFilter) {
      if (!callerOrgIds.includes(orgIdFilter)) {
        return NextResponse.json({ error: 'Not a member of that org' }, { status: 403 });
      }
      const { data, error } = await sb
        .from('vendors')
        .select('*')
        .eq('org_id', orgIdFilter)
        .order('legal_name', { ascending: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ vendors: data || [] });
    }

    // No project / org filter — union of:
    //   - vendors in any of caller's orgs        (org_id IN [...])
    //   - vendors created by caller personally  (user_id = caller)
    //   - vendors tagged to a demo project       (project_id IN demo allowlist)
    //
    // Supabase doesn't accept disparate OR conditions on different
    // columns in a single .or() string without ambiguity around quoting,
    // so we issue 3 queries in parallel and merge by id.
    const demoIds = Array.from(DEMO_PROJECT_IDS);

    const [orgRes, personalRes, demoRes] = await Promise.all([
      callerOrgIds.length
        ? sb.from('vendors').select('*').in('org_id', callerOrgIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
      sb.from('vendors').select('*').eq('user_id', user.id),
      sb.from('vendors').select('*').in('project_id', demoIds),
    ]);

    for (const r of [orgRes, personalRes, demoRes]) {
      if ('error' in r && r.error) {
        return NextResponse.json({ error: r.error.message }, { status: 500 });
      }
    }

    const merged = new Map<string, Record<string, unknown>>();
    for (const row of [
      ...(orgRes.data || []),
      ...(personalRes.data || []),
      ...(demoRes.data || []),
    ]) {
      const id = String((row as { id: string }).id);
      if (!merged.has(id)) merged.set(id, row);
    }
    const vendors = Array.from(merged.values()).sort((a, b) =>
      String(a.legal_name || '').localeCompare(String(b.legal_name || ''))
    );
    return NextResponse.json({ vendors });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.legal_name) {
      return NextResponse.json({ error: 'legal_name is required' }, { status: 400 });
    }

    const projectId = body.project_id ? String(body.project_id) : null;
    if (projectId) {
      const allowed = await verifyProjectAccess(request, projectId, user.id);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Project not found or unauthorized' },
          { status: 403 }
        );
      }
    }

    // org_id handling:
    //   - if body.org_id is set, verify the caller is a member;
    //   - else if the caller has exactly one org, default to it;
    //   - else leave null (personal-vendor backward compat).
    let orgId = body.org_id ? String(body.org_id) : null;
    const callerOrgIds = await getCallerOrgIds(user.id);
    if (orgId) {
      if (!callerOrgIds.includes(orgId)) {
        return NextResponse.json(
          { error: 'Not a member of that org' },
          { status: 403 }
        );
      }
    } else if (callerOrgIds.length === 1) {
      orgId = callerOrgIds[0];
    }

    const insertData = {
      ...pickVendorFields(body),
      org_id: orgId,
      user_id: user.id,
      created_by: user.id,
    };

    const { data, error } = await getServiceClient()
      .from('vendors')
      .insert([insertData])
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ vendor: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const vendorId = typeof body.id === 'string' ? body.id : null;
    if (!vendorId) {
      return NextResponse.json({ error: 'vendor id is required' }, { status: 400 });
    }

    const sb = getServiceClient();

    // Ownership check — owner | project access | org membership.
    const { data: existing, error: lookupErr } = await sb
      .from('vendors')
      .select('id, user_id, project_id, org_id')
      .eq('id', vendorId)
      .maybeSingle();
    if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'vendor not found' }, { status: 404 });

    const ownsRow = String(existing.user_id) === String(user.id);
    const projectAccess = existing.project_id
      ? await verifyProjectAccess(request, String(existing.project_id), user.id)
      : false;
    let orgAccess = false;
    if (existing.org_id) {
      const callerOrgIds = await getCallerOrgIds(user.id);
      orgAccess = callerOrgIds.includes(String(existing.org_id));
    }
    if (!ownsRow && !projectAccess && !orgAccess) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    const updateData = {
      ...pickVendorFields(body),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await sb
      .from('vendors')
      .update(updateData)
      .eq('id', vendorId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ vendor: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('id');
    if (!vendorId) {
      return NextResponse.json({ error: 'vendor id is required' }, { status: 400 });
    }

    const sb = getServiceClient();

    const { data: existing, error: lookupErr } = await sb
      .from('vendors')
      .select('id, user_id, project_id, org_id')
      .eq('id', vendorId)
      .maybeSingle();
    if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'vendor not found' }, { status: 404 });

    const ownsRow = String(existing.user_id) === String(user.id);
    const projectAccess = existing.project_id
      ? await verifyProjectAccess(request, String(existing.project_id), user.id)
      : false;
    let orgAccess = false;
    if (existing.org_id) {
      const callerOrgIds = await getCallerOrgIds(user.id);
      orgAccess = callerOrgIds.includes(String(existing.org_id));
    }
    if (!ownsRow && !projectAccess && !orgAccess) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    // No deleted_at column — hard delete. Audit trigger captures the row.
    const { error } = await sb.from('vendors').delete().eq('id', vendorId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
