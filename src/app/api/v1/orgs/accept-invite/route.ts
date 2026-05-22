/**
 * /api/v1/orgs/accept-invite — claim a pending_invites token.
 *
 * Called from /accept-invite/[token] after the invitee is signed in.
 * The server enforces:
 *   - caller is authenticated
 *   - the token resolves to a `pending_invites` row with status='pending'
 *     and expires_at > now()
 *   - the caller's email matches the invite's email (case-insensitive)
 *
 * On success:
 *   - inserts into org_members IF the caller isn't already a member of
 *     the org. The unique constraint (org_id, user_id) on org_members
 *     means a duplicate row would 23505; we explicitly check first so
 *     we can preserve the *existing* role (insert-if-not-exists rather
 *     than UPDATE — never silently change someone's role on accept).
 *   - updates pending_invites: status='accepted', accepted_by=user.id,
 *     accepted_at=now()
 *   - returns { ok: true, org_id, role: <role-they-now-have> }
 *
 * Both the org_members insert AND the pending_invites update use the
 * service-role client because they straddle a permission boundary: the
 * invitee doesn't have RLS-level rights on either table until the
 * org_members row exists. We trust the token + email check above.
 *
 * Status codes:
 *   401 — not signed in
 *   400 — token missing / invalid JSON
 *   403 — email mismatch (caller's email != invite.email)
 *   404 — token not found
 *   409 — invite already accepted, revoked, or caller already a member
 *   410 — invite expired
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';

interface AcceptBody {
  token?: unknown;
}

/**
 * GET /api/v1/orgs/accept-invite?token=… — read-only preview used by
 * the /accept-invite/[token] page to render "Accept invitation to
 * [org] as [role]" before the user clicks the button.
 *
 * No auth required: the token itself is the credential. We return
 * MINIMAL information so a leaked URL doesn't double as a directory
 * lookup — only the org's display name, role, expiry, and the email
 * that was invited. (We DO need to return the email so the page can
 * tell the visitor "this invite was sent to alice@..., sign in as
 * her" — alternatives like "fetch the email and only show match"
 * leak presence-of-account info too.)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const token = (url.searchParams.get('token') || '').trim();
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) {
    return NextResponse.json({ error: 'token_required' }, { status: 400 });
  }

  const sb = getServiceClient();
  const { data: invite } = await sb
    .from('pending_invites')
    .select('email, org_id, role, status, expires_at')
    .eq('token', token)
    .maybeSingle();
  if (!invite) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const inv = invite as {
    email: string;
    org_id: string;
    role: string;
    status: string;
    expires_at: string;
  };

  let orgName = 'a team';
  try {
    const { data: org } = await sb
      .from('organizations')
      .select('legal_name, dba')
      .eq('id', inv.org_id)
      .maybeSingle();
    const o = org as { legal_name?: string; dba?: string | null } | null;
    if (o) orgName = (o.dba || o.legal_name || 'a team').trim() || 'a team';
  } catch {
    // Fall back to "a team".
  }

  return NextResponse.json({
    email: inv.email,
    role: inv.role,
    status: inv.status,
    expires_at: inv.expires_at,
    org_name: orgName,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  let body: AcceptBody = {};
  try {
    body = (await request.json()) as AcceptBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  // Tokens are 64 hex chars (32 bytes encoded). A length+charset check
  // here is purely defense-in-depth — the DB lookup will fail for
  // anything that doesn't match anyway. Cheap to short-circuit.
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) {
    return NextResponse.json({ error: 'token_required' }, { status: 400 });
  }

  const sb = getServiceClient();

  // 1) Look up the invite.
  const { data: invite, error: lookupErr } = await sb
    .from('pending_invites')
    .select('id, email, org_id, role, status, expires_at, accepted_by')
    .eq('token', token)
    .maybeSingle();
  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!invite) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const inv = invite as {
    id: string;
    email: string;
    org_id: string;
    role: string;
    status: string;
    expires_at: string;
    accepted_by: string | null;
  };

  // 2) Status / expiry gates.
  if (inv.status === 'accepted') {
    return NextResponse.json({ error: 'already_accepted' }, { status: 409 });
  }
  if (inv.status === 'revoked') {
    return NextResponse.json({ error: 'revoked' }, { status: 409 });
  }
  if (inv.status === 'expired' || new Date(inv.expires_at).getTime() < Date.now()) {
    // Self-heal: if the cron hasn't run yet but expiry has passed,
    // mark the row expired now so retries return 410 consistently.
    if (inv.status === 'pending') {
      await sb
        .from('pending_invites')
        .update({ status: 'expired' })
        .eq('id', inv.id)
        .eq('status', 'pending');
    }
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }
  if (inv.status !== 'pending') {
    // Defense in depth — unknown statuses shouldn't be acceptable.
    return NextResponse.json({ error: 'invalid_state' }, { status: 409 });
  }

  // 3) Email match. Case-insensitive.
  const callerEmail = (user.email || '').trim().toLowerCase();
  if (!callerEmail || callerEmail !== inv.email.trim().toLowerCase()) {
    return NextResponse.json({ error: 'email_mismatch' }, { status: 403 });
  }

  // 4) Insert membership if not already present. Never overwrite an
  //    existing role — that would be a privilege-change side effect of
  //    "accepting an invite" which is not in the contract.
  const { data: existingMembership } = await sb
    .from('org_members')
    .select('role')
    .eq('org_id', inv.org_id)
    .eq('user_id', user.id)
    .maybeSingle();

  let effectiveRole = inv.role;
  if (existingMembership) {
    effectiveRole = (existingMembership as { role: string }).role;
  } else {
    const { error: insertErr } = await sb
      .from('org_members')
      .insert([
        {
          org_id: inv.org_id,
          user_id: user.id,
          role: inv.role,
          invited_by: inv.accepted_by ?? null,
        },
      ]);
    if (insertErr) {
      // Race: another tab accepted at the same time and slipped a row
      // in between our SELECT and INSERT. Treat the unique-violation as
      // "great, you're already in" and continue to mark the invite
      // accepted.
      if (!/duplicate|unique/i.test(insertErr.message)) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }
  }

  // 5) Mark the invite accepted. Guarded by status='pending' so two
  //    simultaneous accept calls don't both succeed at the DB level —
  //    only the first will see a row update.
  const { data: updated, error: updateErr } = await sb
    .from('pending_invites')
    .update({
      status: 'accepted',
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', inv.id)
    .eq('status', 'pending')
    .select('id');
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    // Someone else's accept call beat us to it. The org_members row is
    // safe (insert was idempotent) — just report the success state.
    return NextResponse.json(
      { ok: true, org_id: inv.org_id, role: effectiveRole, raced: true },
    );
  }

  return NextResponse.json({
    ok: true,
    org_id: inv.org_id,
    role: effectiveRole,
  });
}
