import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient } from '@/lib/auth-server';

/**
 * POST /api/v1/feedback (2026-05-20)
 *
 * Public endpoint for the /feedback contractor-handover form. Anyone can
 * submit (auth optional). If the user is signed in, we capture their
 * auth.users id alongside the row so Chilly can correlate feedback to
 * accounts. Service-role insert bypasses RLS cleanly; the table also has
 * a public-insert policy as belt-and-suspenders.
 */

const ALLOWED_TRADES = ['gc', 'specialty', 'diy', 'architect', 'other'] as const;
type Trade = (typeof ALLOWED_TRADES)[number];

function clean(v: unknown, max = 2000): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const trade = typeof body.trade === 'string' && (ALLOWED_TRADES as readonly string[]).includes(body.trade)
      ? (body.trade as Trade)
      : null;

    const first_name = clean(body.first_name, 80);
    const project_description = clean(body.project_description, 500);
    const what_worked = clean(body.what_worked);
    const what_didnt = clean(body.what_didnt);
    const what_missing = clean(body.what_missing);
    const email = clean(body.email, 200);
    const follow_up_ok = body.follow_up_ok === true;
    const source_path = clean(body.source_path, 500);

    // Require at least one substantive field so the form can't be spammed
    // with empty submissions.
    const hasContent =
      !!(first_name || project_description || what_worked || what_didnt || what_missing || email);
    if (!hasContent) {
      return NextResponse.json(
        { error: 'Please fill in at least one field before submitting.' },
        { status: 400 }
      );
    }

    // Optional auth — feedback is public.
    const user = await getAuthUser(request).catch(() => null);

    const user_agent = request.headers.get('user-agent')?.slice(0, 500) || null;

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('contractor_feedback')
      .insert({
        first_name,
        trade,
        project_description,
        what_worked,
        what_didnt,
        what_missing,
        email,
        follow_up_ok,
        user_id: user?.id ?? null,
        user_agent,
        source_path,
      })
      .select()
      .single();

    if (error) {
      console.error('[feedback] insert error:', error);
      return NextResponse.json({ error: 'Could not save feedback.' }, { status: 500 });
    }

    return NextResponse.json({ feedback: data }, { status: 201 });
  } catch (e) {
    console.error('[feedback] POST error:', e);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
