/**
 * GET /api/v1/email/healthcheck (EMAIL-VERIFICATION, 2026-05-22)
 * ==============================================================
 * Reports the verification status of the FROM domain on Resend so the
 * admin status page (`/admin/email-status`) and any monitoring script
 * can answer "are we actually sending email right now, or are messages
 * silently bouncing?"
 *
 * Response shape:
 *   - RESEND_API_KEY unset: `{ configured: false, reason: 'no_api_key' }`
 *   - Key set, domain not added in Resend: `{ status: 'not_added', ... }`
 *   - Key set, domain found: `{ status: 'verified' | 'pending' | 'failed',
 *       records: [...] }`
 *
 * Auth gate: requires an authenticated user in production. In non-prod
 * (NODE_ENV !== 'production') we allow anon so the wizard works during
 * local dev / preview environments where signing in is annoying.
 *
 * Query params:
 *   - `?bypassCache=1` — re-fetch from Resend instead of returning the
 *     memoized snapshot. The admin "Re-check now" button calls this.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { checkDomainVerification } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Auth: any signed-in user in prod, anon allowed in dev/preview.
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const user = await getAuthUser(request).catch(() => null);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      );
    }
  }

  const url = new URL(request.url);
  const bypassCache = ['1', 'true', 'yes'].includes(
    (url.searchParams.get('bypassCache') || '').toLowerCase(),
  );

  const status = await checkDomainVerification({ bypassCache });
  return NextResponse.json(status, {
    headers: {
      // Don't let Vercel/CDN cache this — we have our own 5-min memo.
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
