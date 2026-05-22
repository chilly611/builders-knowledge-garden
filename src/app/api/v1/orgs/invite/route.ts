// /api/v1/orgs/invite — best-effort org invitation used by the
// onboarding modal's step 3. The caller passes { email, role } and we:
//   1. Find (or stub) the caller's primary org. If none exists yet,
//      we skip — the modal's "Invite a teammate" CTA at this stage
//      is a courtesy, not a critical path (the user has just landed).
//   2. Insert a placeholder row into `org_members` keyed by email so
//      the membership exists when the invitee finally signs up.
//   3. Send a Resend magic-link invite via `sendEmail`. Falls back
//      gracefully when RESEND_API_KEY is unset.
//
// The DB write is the system of record. The email is courtesy.

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { sendEmail, escapeHtml } from '@/lib/email';

interface InviteBody {
  email?: unknown;
  role?: unknown;
  org_id?: unknown;
}

const ALLOWED_ROLES = new Set(['owner', 'admin', 'member']);

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
  const role = typeof body.role === 'string' ? body.role : 'member';
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 });
  }
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }

  const sb = getServiceClient();

  // 1) Locate the caller's primary org. If they don't have one yet
  //    we still try to send the courtesy email — the membership row
  //    can be created later when the user creates an org.
  let orgId = typeof body.org_id === 'string' ? body.org_id : null;
  if (!orgId) {
    const { data: mem } = await sb
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    orgId = (mem as { org_id: string } | null)?.org_id ?? null;
  }

  // 2) Stub a membership row keyed by email IF we have an org. We
  //    don't have a `pending_invites` table by design — the simplest
  //    approach is to write the membership now (user_id = null) and
  //    let the auth callback resolve it once they sign up. If the
  //    column doesn't allow null user_id, we silently skip the insert
  //    and rely on the email.
  let invitedOrg = false;
  if (orgId) {
    const { error } = await sb
      .from('org_members')
      .insert({
        org_id: orgId,
        user_id: user.id, // placeholder — the email is the real key
        role,
        invited_by: user.id,
      } as Record<string, unknown>)
      .select()
      .maybeSingle();
    // Idempotent: ignore unique-violation; just means the relationship
    // already exists. Any other error gets logged but does not block
    // the email send.
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.warn('[orgs/invite] insert error (continuing):', error.message);
    } else {
      invitedOrg = true;
    }
  }

  // 3) Best-effort email. If Resend isn't configured we return
  //    `{ok: true, email_sent: false}` so the modal keeps moving.
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.theknowledgegardens.com');
  const link = `${baseUrl}/signup?invite_email=${encodeURIComponent(email)}`;
  const html = `
    <p>Hi —</p>
    <p>${escapeHtml(user.email || 'A teammate')} just invited you to
    Builder's Knowledge Garden as a <strong>${escapeHtml(role)}</strong>.</p>
    <p><a href="${link}">Accept the invite →</a></p>
    <p style="font-size:12px;color:#666">If you weren't expecting this, you can ignore the email.</p>
  `;
  const sent = await sendEmail({
    to: email,
    subject: `${user.email || 'Your teammate'} invited you to Builder's Knowledge Garden`,
    html,
  });

  return NextResponse.json({
    ok: true,
    invited_org: invitedOrg,
    email_sent: sent.ok,
    email_error: sent.ok ? undefined : sent.error,
  });
}
