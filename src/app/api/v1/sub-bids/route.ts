/**
 * /api/v1/sub-bids — SUBBID-FLOW (2026-05-22)
 *
 * Lets a sub (specialist / contractor) submit a bid on a GC's project, and
 * lets the GC (owner / gc / teammate) see and respond to bids on their
 * projects. Backed by SCHEMA-ALPHA's `sub_bids` table.
 *
 * Auth model:
 *   - All endpoints require Bearer auth via getAuthUser.
 *   - Lane is resolved per-bid at request time (a user might be a GC on
 *     one project and a sub on another). For GET we union both sides:
 *     bids submitted by the caller AND bids on projects the caller owns
 *     or is a 'gc'/'teammate' member of.
 *   - POST: anyone with project access can submit a bid; the row stamps
 *     sub_user_id = caller.id and status = 'submitted'. We deliberately
 *     do NOT block by legacy lane — a "contractor" user could absolutely
 *     bid a plumbing sub-trade on someone else's project.
 *   - PATCH: a sub can withdraw their own bid; a project gc/owner can
 *     mark reviewed / accepted / rejected. Everyone else gets 403.
 *
 * Demo accommodations (mirrors /api/v1/rfis):
 *   - DEMO_PROJECT_IDS are readable by any authed user.
 *   - user_metadata.demo_project_id grants project access to trial
 *     accounts that aren't formally rostered yet.
 *
 * Email notification (best-effort):
 *   - On successful POST with status='submitted', fire-and-forget an
 *     email to the project's GC (project_members.project_role='gc')
 *     OR the project owner (command_center_projects.user_id). Routed
 *     through src/lib/email.ts so it no-ops if RESEND_API_KEY is unset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { sendEmail, escapeHtml } from '@/lib/email';

const DEMO_PROJECT_IDS = new Set<string>([
  '55730cd3-5225-493d-8b5c-49086d942565', // Marin farmhouse
  'aa11b22c-1111-4d78-aaaa-bbccdd112233', // ADU in Sausalito
  'bb22c33d-2222-4d78-bbbb-ccddee223344', // Commercial TI in SoMa
]);

const VALID_TRADE_LABELS = new Set<string>([
  'Electrical',
  'Plumbing',
  'HVAC',
  'Framing',
  'Concrete',
  'Drywall',
  'Paint',
  'Roofing',
  'Tile',
  'Other',
]);

const VALID_STATUSES = new Set<string>([
  'submitted',
  'reviewed',
  'accepted',
  'rejected',
  'withdrawn',
]);

async function getCallerMetadata(
  request: NextRequest,
): Promise<{ demoProjectId: string | null; name: string | null; email: string | null }> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return { demoProjectId: null, name: null, email: null };
    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return { demoProjectId: null, name: null, email: null };
    const sb = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return { demoProjectId: null, name: null, email: null };
    const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
    const demoProjectId = typeof meta.demo_project_id === 'string' ? meta.demo_project_id : null;
    const name = typeof meta.name === 'string' ? meta.name : null;
    const email = data.user.email ?? null;
    return { demoProjectId, name, email };
  } catch {
    return { demoProjectId: null, name: null, email: null };
  }
}

async function verifyProjectAccess(
  request: NextRequest,
  projectId: string,
  userId: string,
): Promise<{ allowed: boolean; isGc: boolean }> {
  if (!projectId) return { allowed: false, isGc: false };
  const sb = getServiceClient();

  // 1. Project owner (command_center_projects.user_id) — full access.
  const { data: project } = await sb
    .from('command_center_projects')
    .select('user_id')
    .eq('id', projectId)
    .maybeSingle();
  if (project && String(project.user_id) === String(userId)) {
    return { allowed: true, isGc: true };
  }

  // 2. Roster row in project_members — role determines GC powers.
  const { data: member } = await sb
    .from('project_members')
    .select('project_role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (member?.project_role) {
    const role = String(member.project_role);
    const isGc = role === 'gc' || role === 'owner' || role === 'teammate';
    return { allowed: true, isGc };
  }

  // 3. Demo-project allowlist + caller's pinned demo_project_id.
  if (DEMO_PROJECT_IDS.has(projectId)) {
    const meta = await getCallerMetadata(request);
    const callerDemo = meta.demoProjectId;
    // Trial GCs land on a demo project as the "owner" lane.
    return { allowed: true, isGc: callerDemo === projectId || !callerDemo };
  }

  return { allowed: false, isGc: false };
}

async function getProjectsOwnedByCaller(userId: string): Promise<string[]> {
  const sb = getServiceClient();
  const ids = new Set<string>();
  const { data: owned } = await sb
    .from('command_center_projects')
    .select('id')
    .eq('user_id', userId);
  for (const row of owned ?? []) ids.add(String(row.id));
  const { data: rostered } = await sb
    .from('project_members')
    .select('project_id, project_role')
    .eq('user_id', userId)
    .in('project_role', ['gc', 'owner', 'teammate']);
  for (const row of rostered ?? []) ids.add(String(row.project_id));
  return Array.from(ids);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — list bids visible to caller (union of "I submitted" + "on my project")
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const scope = (searchParams.get('scope') || '').toLowerCase(); // 'mine' | 'inbox' | ''
    const sb = getServiceClient();

    // Filter by specific project if given (and caller has access).
    if (projectId) {
      const { allowed } = await verifyProjectAccess(request, projectId, user.id);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Project not found or unauthorized' },
          { status: 403 },
        );
      }
      const { data, error } = await sb
        .from('sub_bids')
        .select('*')
        .eq('project_id', projectId)
        .order('submitted_at', { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ bids: data ?? [] });
    }

    // No projectId: caller scope.
    if (scope === 'mine') {
      const { data, error } = await sb
        .from('sub_bids')
        .select('*')
        .eq('sub_user_id', user.id)
        .order('submitted_at', { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ bids: data ?? [] });
    }

    // Default: union of submitted-by-me + on-projects-I-own.
    const ownedProjects = await getProjectsOwnedByCaller(user.id);
    const meta = await getCallerMetadata(request);
    // Trial GC users get their pinned demo project too.
    if (meta.demoProjectId && !ownedProjects.includes(meta.demoProjectId)) {
      ownedProjects.push(meta.demoProjectId);
    }

    const [mineRes, inboxRes] = await Promise.all([
      sb
        .from('sub_bids')
        .select('*')
        .eq('sub_user_id', user.id)
        .order('submitted_at', { ascending: false }),
      ownedProjects.length > 0
        ? sb
            .from('sub_bids')
            .select('*')
            .in('project_id', ownedProjects)
            .order('submitted_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (mineRes.error) return NextResponse.json({ error: mineRes.error.message }, { status: 500 });
    if (inboxRes.error) return NextResponse.json({ error: inboxRes.error.message }, { status: 500 });

    const seen = new Set<string>();
    const merged: Record<string, unknown>[] = [];
    for (const row of [...(mineRes.data ?? []), ...(inboxRes.data ?? [])]) {
      const id = String((row as { id: unknown }).id);
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(row as Record<string, unknown>);
    }
    return NextResponse.json({
      bids: merged,
      mine: mineRes.data ?? [],
      inbox: inboxRes.data ?? [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — create a new bid as the calling sub.
// ─────────────────────────────────────────────────────────────────────────────

interface LineItemInput {
  description?: string;
  qty?: number;
  unit?: string;
  unit_price?: number;
  amount?: number;
}

function sanitizeLineItems(raw: unknown): LineItemInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const description = typeof r.description === 'string' ? r.description.slice(0, 500) : '';
      const qty = Number(r.qty);
      const unit = typeof r.unit === 'string' ? r.unit.slice(0, 40) : '';
      const unit_price = Number(r.unit_price);
      const amount = Number(r.amount);
      return {
        description,
        qty: Number.isFinite(qty) ? qty : 0,
        unit,
        unit_price: Number.isFinite(unit_price) ? unit_price : 0,
        amount: Number.isFinite(amount) ? amount : 0,
      } as LineItemInput;
    })
    .filter((x): x is LineItemInput => x !== null)
    .slice(0, 100);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const projectId = typeof body.project_id === 'string' ? body.project_id : null;
    const tradeLabel = typeof body.trade_label === 'string' ? body.trade_label : null;
    const csiDivision = typeof body.csi_division === 'string' ? body.csi_division.slice(0, 16) : null;
    const scopeOfWork = typeof body.scope_of_work === 'string' ? body.scope_of_work.slice(0, 8000) : null;
    const cslbNumber = typeof body.cslb_number === 'string' ? body.cslb_number.slice(0, 40) : null;
    const subVendorId = typeof body.sub_vendor_id === 'string' ? body.sub_vendor_id : null;
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 4000) : null;
    const validityDaysRaw = Number(body.validity_days);
    const validityDays = Number.isFinite(validityDaysRaw) && validityDaysRaw > 0 ? Math.floor(validityDaysRaw) : 30;

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }
    if (tradeLabel && !VALID_TRADE_LABELS.has(tradeLabel)) {
      return NextResponse.json({ error: 'invalid trade_label' }, { status: 400 });
    }

    const { allowed } = await verifyProjectAccess(request, projectId, user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 403 },
      );
    }

    const lineItems = sanitizeLineItems(body.line_items);
    const computedSubtotal = lineItems.reduce((acc, li) => acc + (Number(li.amount) || 0), 0);
    const subtotal = Number.isFinite(Number(body.subtotal)) ? Number(body.subtotal) : computedSubtotal;
    const tax = Number.isFinite(Number(body.tax)) ? Number(body.tax) : 0;
    const total = Number.isFinite(Number(body.total)) ? Number(body.total) : subtotal + tax;

    const insurance = body.insurance_certs_attached && typeof body.insurance_certs_attached === 'object'
      ? body.insurance_certs_attached
      : null;

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('sub_bids')
      .insert([
        {
          project_id: projectId,
          sub_user_id: user.id,
          sub_vendor_id: subVendorId,
          csi_division: csiDivision,
          trade_label: tradeLabel,
          scope_of_work: scopeOfWork,
          line_items: lineItems,
          subtotal,
          tax,
          total,
          validity_days: validityDays,
          cslb_number: cslbNumber,
          insurance_certs_attached: insurance,
          status: 'submitted',
          notes,
        },
      ])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Best-effort GC notification — never block the response on this.
    void notifyGcOfNewBid(sb, data, user).catch((err) => {
      console.warn('[sub-bids] notifyGcOfNewBid failed:', err);
    });

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — update bid status (withdraw / review / accept / reject) + notes.
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const nextStatus = typeof body.status === 'string' ? body.status : null;
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 4000) : undefined;

    if (nextStatus && !VALID_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }

    const sb = getServiceClient();
    const { data: bid, error: fetchErr } = await sb
      .from('sub_bids')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!bid) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const isSubAuthor = String(bid.sub_user_id) === String(user.id);
    const { allowed, isGc } = await verifyProjectAccess(request, String(bid.project_id), user.id);

    // Permission matrix:
    //   - withdrawn → only the sub who submitted may do this
    //   - reviewed | accepted | rejected → only a GC/owner of the project
    //   - notes-only change → either side (sub on their own bid, GC on inbox)
    if (nextStatus === 'withdrawn' && !isSubAuthor) {
      return NextResponse.json({ error: 'only the bidder may withdraw' }, { status: 403 });
    }
    if (
      nextStatus &&
      ['reviewed', 'accepted', 'rejected'].includes(nextStatus) &&
      !(allowed && isGc)
    ) {
      return NextResponse.json({ error: 'only the GC may change this status' }, { status: 403 });
    }
    if (!nextStatus && !(isSubAuthor || (allowed && isGc))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const patch: Record<string, unknown> = {};
    if (nextStatus) {
      patch.status = nextStatus;
      if (['reviewed', 'accepted', 'rejected'].includes(nextStatus)) {
        patch.reviewed_at = new Date().toISOString();
        patch.reviewer_user_id = user.id;
      }
    }
    if (notes !== undefined) patch.notes = notes;

    const { data, error } = await sb
      .from('sub_bids')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email helper — fire-and-forget.
// ─────────────────────────────────────────────────────────────────────────────

interface BidRow {
  id: string;
  project_id: string;
  trade_label: string | null;
  total: number | string | null;
}

async function notifyGcOfNewBid(
  sb: ReturnType<typeof getServiceClient>,
  bid: BidRow,
  sender: { id: string; email: string; name: string },
): Promise<void> {
  if (!bid?.project_id) return;

  // Resolve project + GC.
  const { data: project } = await sb
    .from('command_center_projects')
    .select('id, name, user_id')
    .eq('id', bid.project_id)
    .maybeSingle();

  const recipients: string[] = [];

  if (project?.user_id) {
    // Look up owner's email from auth.users via admin API.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const admin = createClient(supabaseUrl, serviceKey);
        const ownerId = String(project.user_id);
        // Best-effort: admin.getUserById is the official path.
        const { data: ownerUser } = await admin.auth.admin.getUserById(ownerId);
        const email = ownerUser?.user?.email;
        if (email) recipients.push(email);
      } catch {
        /* best-effort */
      }
    }
  }

  // Also check project_members for any 'gc' role users (in case owner ≠ gc).
  const { data: gcMembers } = await sb
    .from('project_members')
    .select('user_id')
    .eq('project_id', bid.project_id)
    .eq('project_role', 'gc');

  if (gcMembers && gcMembers.length > 0) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey);
      for (const m of gcMembers) {
        try {
          const { data } = await admin.auth.admin.getUserById(String(m.user_id));
          const e = data?.user?.email;
          if (e && !recipients.includes(e)) recipients.push(e);
        } catch {
          /* best-effort */
        }
      }
    }
  }

  if (recipients.length === 0) return;

  const projectName = project?.name || 'your project';
  const total = Number(bid.total) || 0;
  const totalFormatted = total.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  const trade = bid.trade_label || 'a trade';
  const senderLabel = sender.name || sender.email || 'A subcontractor';
  const linkBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://builders.theknowledgegardens.com';
  const link = `${linkBase}/killerapp/workflows/sub-bid-inbox`;

  await sendEmail({
    to: recipients,
    subject: `New ${trade} bid (${totalFormatted}) on ${projectName}`,
    replyTo: sender.email || undefined,
    html: `
      <p>${escapeHtml(senderLabel)} submitted a <strong>${escapeHtml(totalFormatted)}</strong> bid for
      <strong>${escapeHtml(trade)}</strong> on <strong>${escapeHtml(projectName)}</strong>.</p>
      <p><a href="${escapeHtml(link)}">Review it here</a>.</p>
      <p style="color:#888;font-size:12px;">Builder's Knowledge Garden — sub-bid inbox.</p>
    `,
  });
}
