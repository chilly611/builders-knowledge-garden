/**
 * /api/v1/sub-bids/cslb-lookup (GET ?license=XXXXX)
 * =================================================
 * Legacy endpoint kept for backward compat with the sub-bid UI.
 * Forwards to the canonical /api/v1/cslb-lookup implementation
 * (server-side CSLB form scrape with 3-day cache).
 *
 * Response shape preserved from the original stub:
 *   { ok, license, note?, lookup_url, ...extracted fields }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { lookupCslbLicense } from '@/lib/cslb-scraper';

const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

function deepLink(license: string): string {
  return `https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=${encodeURIComponent(license)}`;
}

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

  const sb = getServiceClient();

  // Cache lookup
  const { data: cached } = await sb
    .from('cslb_lookup_cache')
    .select('*')
    .eq('license_number', license)
    .maybeSingle();
  if (cached && cached.fetched_at && cached.name) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < CACHE_TTL_MS) {
      return NextResponse.json({
        ok: true,
        cached: true,
        license,
        name: cached.name,
        classification: cached.classification,
        status: cached.status,
        expiry: cached.expiry,
        bond_number: cached.bond_number,
        bond_amount: cached.bond_amount,
        lookup_url: deepLink(license),
      });
    }
  }

  try {
    const result = await lookupCslbLicense(license, { includeRawHtml: true });
    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        license,
        reason: result.reason,
        lookup_url: deepLink(license),
      });
    }

    // Best-effort cache write
    await sb.from('cslb_lookup_cache').upsert(
      {
        license_number: result.licenseNumber,
        name: result.name ?? null,
        classification: result.classification ?? null,
        status: result.status ?? null,
        expiry: result.expiry ?? null,
        bond_number: result.bondNumber ?? null,
        bond_amount: result.bondAmount ?? null,
        fetched_at: new Date().toISOString(),
        raw_html: result.rawHtml ?? null,
      },
      { onConflict: 'license_number' }
    );

    return NextResponse.json({
      ok: true,
      cached: false,
      license,
      name: result.name,
      classification: result.classification,
      status: result.status,
      expiry: result.expiry,
      bond_number: result.bondNumber,
      bond_amount: result.bondAmount,
      lookup_url: deepLink(license),
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      license,
      reason: e instanceof Error ? e.message : 'scrape_failed',
      lookup_url: deepLink(license),
    });
  }
}
