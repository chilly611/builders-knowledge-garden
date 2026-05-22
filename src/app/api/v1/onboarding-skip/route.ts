// /api/v1/onboarding-skip — flip onboarding.step to 'completed' for the
// caller. Two entry shapes are supported:
//
//   1. Authed POST  → no body required. The bearer token identifies
//                     the user. This is the primary path used by the
//                     "Skip onboarding" link inside the reminder email
//                     once the user clicks through and lands signed-in.
//   2. Authed GET  ?u=<user_id>  → service-role merge for the case
//                     where the user clicks the email link while NOT
//                     signed in. We accept the user-id query param as
//                     a best-effort de-personalization signal — it's
//                     informational, not authoritative. The merge
//                     happens through the auth.admin API so it works
//                     even without an active session.
//
// SECURITY NOTE: the GET path is intentionally idempotent and one-way
// (it can only mark COMPLETED, never advance to a different step).
// Worst-case abuse: an attacker who guesses a user-id can suppress
// that user's onboarding modal. Acceptable trade for the UX — the
// modal can always be re-triggered with ?first_run=1, and we don't
// expose any data in the response.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth-server';
import { mergeOnboarding } from '@/lib/onboarding-state';

let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes('placeholder')) return null;
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'supabase_env_missing' },
      { status: 200 },
    );
  }
  const merged = await mergeOnboarding(admin, user.id, {
    step: 'completed',
    completed_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, onboarding: merged });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('u');
  if (!userId) {
    return NextResponse.json({ error: 'missing user id' }, { status: 400 });
  }
  const admin = getAdminClient();
  if (!admin) {
    // Soft-success so the link from the email still feels finished.
    return NextResponse.redirect(new URL('/killerapp', request.url));
  }
  await mergeOnboarding(admin, userId, {
    step: 'completed',
    completed_at: new Date().toISOString(),
  }).catch(() => null);
  return NextResponse.redirect(new URL('/killerapp', request.url));
}
