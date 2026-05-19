// Beta signup endpoint — bypasses SMTP/email-confirmation so testers can
// land on /killerapp immediately. Uses Supabase service role to create the
// user with email_confirm: true, then the client calls signInWithPassword
// to obtain a session.
//
// 2026-05-20 — built for the SF investor demo. Existing /signup page was
// blocked because Supabase email confirmation was required but SMTP isn't
// configured in this project, so testers got stuck on "Check your inbox"
// and could never sign in.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function admin() {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isEmail(v: unknown): v is string {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = admin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Auth service is not configured on this deployment.' },
      { status: 500 },
    );
  }

  let body: { email?: unknown; password?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { email, password, name } = body;
  if (!isEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters.' },
      { status: 400 },
    );
  }

  const display = typeof name === 'string' && name.trim().length > 0
    ? name.trim()
    : email.split('@')[0];

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: display, full_name: display },
  });

  if (error) {
    const msg = error.message || 'Signup failed.';
    const alreadyExists = /already (registered|exists)/i.test(msg);
    return NextResponse.json(
      { error: alreadyExists ? 'That email is already registered. Try signing in.' : msg },
      { status: alreadyExists ? 409 : 400 },
    );
  }

  // Best-effort CRM log. Failure here must not block the signup.
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || null;
    const userAgent = request.headers.get('user-agent');
    const referrer = request.headers.get('referer');
    await supabaseAdmin.from('crm_signins').insert({
      user_id: data.user?.id ?? null,
      email,
      event_type: 'signup',
      ip,
      user_agent: userAgent,
      referrer,
    });
  } catch {
    // Silent — instrumentation, not load-bearing.
  }

  return NextResponse.json({ ok: true, userId: data.user?.id ?? null });
}
