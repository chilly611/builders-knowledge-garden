/**
 * /api/v1/sub-bids/cslb-lookup (GET ?license=XXXXX)
 * =================================================
 * Thin proxy / stub for the CSLB license-lookup service. The real CSLB
 * public site (https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/)
 * doesn't currently expose a stable JSON API, so this endpoint:
 *
 *   - validates the input is a plausible 4–8 digit license number,
 *   - returns a static "we couldn't verify automatically — open the
 *     CSLB lookup page" response with a deep-link URL,
 *   - shape is deliberately stable so the UI can swap in a real
 *     scrape / official API later without changes on the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get('license') || '').trim();
  const license = raw.replace(/[^0-9]/g, '');

  if (!license || license.length < 4 || license.length > 8) {
    return NextResponse.json({
      ok: false,
      reason: 'invalid_format',
      lookup_url: 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/',
    });
  }

  // Real lookup would slot in here. For now: route the user to CSLB's
  // public page. We pre-fill the license in the URL hash.
  return NextResponse.json({
    ok: true,
    license,
    note:
      'Automated CSLB lookup is not wired yet. Click the link to verify the license on CSLB.',
    lookup_url: `https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=${encodeURIComponent(license)}`,
  });
}
