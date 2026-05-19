// Sign-in tracker — fire-and-forget endpoint the login page hits after a
// successful signInWithPassword (or OAuth callback) to record an event in
// crm_signins. Authed via the user's Bearer token so we know who it is.

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  let event_type: 'signin' | 'signout' = 'signin';
  try {
    const body = await request.json();
    if (body?.event_type === 'signout') event_type = 'signout';
  } catch {
    // Empty body is fine — default to "signin".
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || null;
  const userAgent = request.headers.get('user-agent');
  const referrer = request.headers.get('referer');

  try {
    await getServiceClient().from('crm_signins').insert({
      user_id: user.id,
      email: user.email,
      event_type,
      ip,
      user_agent: userAgent,
      referrer,
    });
  } catch {
    // Best-effort.
  }

  return NextResponse.json({ ok: true });
}
