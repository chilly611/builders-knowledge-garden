/**
 * /api/v1/orgs/invite — proper invitation flow (2026-05-24, ORG-INVITES).
 *
 * REPLACES the earlier placeholder implementation which wrote a row to
 * `org_members` keyed by `user_id = caller` and called it "an invite".
 * That was wrong on two counts: (1) it never tracked the invitee, only
 * gave the caller a phantom membership, and (2) the email link landed
 * the invitee on /signup with no server-checkable token, so anyone who
 * intercepted the email URL got the same access as the legit invitee.
 *
 * The new flow:
 *   1. Caller must already be a member of the target org with role
 *      'owner' or 'admin'. We check via the service client (RLS would
 *      also enforce this, but we want a clean 403 instead of a silent
 *      empty result on permission denial).
 *   2. If the invited email is already an active org_member of the
 *      target org → 409 (already a member).
 *   3. If a pending invite already exists for (email, org_id) we mark
 *      the old one 'revoked' and create a fresh one. (The partial
 *      unique index `uniq_pending_invite_email_org` only fires on
 *      status='pending', so the revoke + insert pair is collision-free.)
 *   4. We insert into `pending_invites` — the DB generates the
 *      256-bit hex token via `encode(gen_random_bytes(32), 'hex')` so
 *      the server never gets to choose a weak token.
 *   5. Resend email with the magic link
 *      `${baseUrl}/accept-invite/${token}`. The email is best-effort —
 *      the DB row is the system of record. If `RESEND_API_KEY` is
 *      unset, the route still returns 201 and `email_sent: false`.
 *
 * DELETE revokes an invite by id (only org admins, via RLS-equivalent
 * caller-role check).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { sendEmail, escapeHtml } from '@/lib/email';

interface InviteBody {
  email?: unknown;
  org_id?: unknown;
  role?: unknown;
}

interface DeleteBody {
  id?: unknown;
}

const ALLOWED_INVITE_ROLES = new Set(['member', 'admin']);
const ALLOWED_ADMIN_ROLES = new Set(['owner', 'admin']);

function baseAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.theknowledgegardens.com')
  );
}

// ---------------------------------------------------------------------------
// POST — create an invite
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  let body: InviteBody = {};
  try {
    body = (await request.json()) as InviteBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const orgId = typeof body.org_id === 'string' ? body.org_id.trim() : '';
  const role = typeof body.role === 'string' ? body.role : 'member';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 });
  }
  if (!orgId) {
    return NextResponse.json({ error: 'org_id_required' }, { status: 400 });
  }
  if (!ALLOWED_INVITE_ROLES.has(role)) {
    // Inviting someone as 'owner' isn't something we expose through
    // the invite flow — ownership transfer is a separate path. Keep
    // this surface tight so a compromised admin token can't bootstrap
    // a new owner.
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }

  const sb = getServiceClient();

  // 1) Caller must be owner/admin of the target org.
  const { data: callerMembership, error: cmErr } = await sb
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (cmErr) {
    return NextResponse.json({ error: cmErr.message }, { status: 500 });
  }
  const callerRole = (callerMembership as { role?: string } | null)?.role ?? '';
  if (!ALLOWED_ADMIN_ROLES.has(callerRole)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // 2) Is the email already an active member of this org?
  //    We need to map email → auth.users.id first, then check
  //    org_members. The Supabase admin API supports listing users by
  //    email filter; we use the service client's admin surface. This
  //    is best-effort — if the SDK shape changes we fall through and
  //    rely on the accept-invite route's idempotent insert.
  try {
    const adminApi = (sb as unknown as {
      auth: {
        admin: {
          getUserByEmail?: (e: string) => Promise<{ data: { user: { id: string } | null } | null }>;
        };
      };
    }).auth.admin;
    if (typeof adminApi?.getUserByEmail === 'function') {
      const existingUserResp = await adminApi.getUserByEmail(email);
      const existingUserId = existingUserResp?.data?.user?.id ?? null;
      if (existingUserId) {
        const { data: existingMembership } = await sb
          .from('org_members')
          .select('user_id')
          .eq('org_id', orgId)
          .eq('user_id', existingUserId)
          .maybeSingle();
        if (existingMembership) {
          return NextResponse.json(
            { error: 'already_member' },
            { status: 409 },
          );
        }
      }
    }
  } catch {
    // Non-fatal.
  }

  // 3) Revoke any prior pending invite for the same (email, org_id) so
  //    the new token supersedes. The partial unique index
  //    `uniq_pending_invite_email_org` would otherwise reject the
  //    second insert.
  await sb
    .from('pending_invites')
    .update({ status: 'revoked' })
    .eq('email', email)
    .eq('org_id', orgId)
    .eq('status', 'pending');

  // 4) Insert. Let the DB generate the token (256 bits via
  //    gen_random_bytes(32)) and the expiry (14d).
  const { data: invite, error: insertErr } = await sb
    .from('pending_invites')
    .insert([
      {
        email,
        org_id: orgId,
        role,
        invited_by: user.id,
      },
    ])
    .select('id, token, expires_at, email, org_id, role')
    .single();
  if (insertErr || !invite) {
    return NextResponse.json(
      { error: insertErr?.message || 'insert_failed' },
      { status: 500 },
    );
  }

  // 5) Look up the org's display name so the email reads nicely.
  let orgName = 'your team';
  try {
    const { data: org } = await sb
      .from('organizations')
      .select('legal_name, dba')
      .eq('id', orgId)
      .maybeSingle();
    const o = org as { legal_name?: string; dba?: string | null } | null;
    if (o) orgName = (o.dba || o.legal_name || 'your team').trim() || 'your team';
  } catch {
    // Non-fatal.
  }

  // 6) Email. Best-effort.
  const acceptUrl = `${baseAppUrl()}/accept-invite/${encodeURIComponent(invite.token)}`;
  const inviterName = user.name || user.email || 'Your teammate';
  const inviterEmail = user.email || '';
  const expiresHuman = new Date(invite.expires_at).toUTCString();
  const inviteeFirstName = email.split('@')[0]?.split('.')[0] || 'there';

  const html = `
    <p>Hey ${escapeHtml(inviteeFirstName)},</p>
    <p><strong>${escapeHtml(inviterName)}</strong>${
      inviterEmail ? ` (${escapeHtml(inviterEmail)})` : ''
    } just invited you to join
    <strong>${escapeHtml(orgName)}</strong> on Builder's Knowledge Garden as a
    <strong>${escapeHtml(role)}</strong>.</p>
    <p>Builder's Knowledge Garden is a workspace for residential GC's &mdash; shared budgets,
    a code-aware copilot, and the audit trail every job needs.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${acceptUrl}" style="background:#1D9E75;color:white;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">
        Accept invitation &rarr;
      </a>
    </p>
    <p style="font-size:13px;color:#555;">This link expires on <strong>${escapeHtml(expiresHuman)}</strong>.
    If it expires, ask ${escapeHtml(inviterName)} to send a fresh one.</p>
    <p style="font-size:11px;color:#888;">Not expecting this? Just ignore it &mdash; we won't add you to anything
    unless you click the button above.</p>
  `;

  const sent = await sendEmail({
    to: email,
    subject: `${inviterName} invited you to ${orgName} on Builder's Knowledge Garden`,
    html,
    // Reply-to the inviter so the invitee can ask "is this real?"
    // straight back at the person they recognize.
    replyTo: inviterEmail || undefined,
  });

  return NextResponse.json(
    {
      id: invite.id,
      token: invite.token,
      accept_url: acceptUrl,
      expires_at: invite.expires_at,
      email_sent: sent.ok,
      email_error: sent.ok ? undefined : sent.error,
    },
    { status: 201 },
  );
}

// ---------------------------------------------------------------------------
// DELETE — revoke an invite by id
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  let body: DeleteBody = {};
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }

  const sb = getServiceClient();

  // Look up the invite so we know which org to permission-check
  // against. RLS would also enforce, but we want a 403 vs 404 to
  // distinguish "you can't see it" from "it doesn't exist".
  const { data: invite, error: lookupErr } = await sb
    .from('pending_invites')
    .select('id, org_id, status')
    .eq('id', id)
    .maybeSingle();
  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!invite) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { data: callerMembership } = await sb
    .from('org_members')
    .select('role')
    .eq('org_id', (invite as { org_id: string }).org_id)
    .eq('user_id', user.id)
    .maybeSingle();
  const callerRole = (callerMembership as { role?: string } | null)?.role ?? '';
  if (!ALLOWED_ADMIN_ROLES.has(callerRole)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error: updateErr } = await sb
    .from('pending_invites')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('status', 'pending');
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
