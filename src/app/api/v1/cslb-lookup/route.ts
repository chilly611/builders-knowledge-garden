/**
 * /api/v1/cslb-lookup (GET ?license=NNNNN)
 * =========================================
 * Server-side scrape of the CA Contractors State License Board
 * (CSLB) public license lookup, with a 3-day cache in Supabase.
 *
 * Flow:
 *   1. Auth-gate (any signed-in user can look up — the source page is
 *      public, this is just to keep our scraper credentials sensible).
 *   2. Validate license input (4–8 digits — CSLB licenses are 6–7
 *      digits today, we accept a small range for future growth).
 *   3. Hit the cslb_lookup_cache. If the row exists and `fetched_at`
 *      is within TTL, return cached.
 *   4. Otherwise call the scraper, write the cache, return fresh.
 *   5. On scrape failure return a deep-link to CSLB so the caller can
 *      fall through to a manual verification.
 *
 * Response shape (success):
 *   {
 *     ok: true,
 *     cached: boolean,
 *     license_number: "1029384",
 *     name: "JIM BULLINGTON CONSTRUCTION",
 *     classification: "B - GENERAL BUILDING",
 *     status: "...",
 *     expiry: "2029-07-31",
 *     bond_number: "100742793",
 *     bond_amount: 25000,
 *     lookup_url: "https://www.cslb.ca.gov/.../LicenseDetail.aspx?LicNum=1029384",
 *     fetched_at: "..."
 *   }
 *
 * On failure:
 *   { ok: false, reason: "...", lookup_url: "..." }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { lookupCslbLicense } from '@/lib/cslb-scraper';

const CACHE_TTL_DAYS = 3;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

function deepLink(license: string): string {
  return `https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=${encodeURIComponent(license)}`;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get('license') || '').trim();
  const license = raw.replace(/[^0-9]/g, '');
  const skipCache = searchParams.get('fresh') === '1';

  if (!license || license.length < 4 || license.length > 8) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'invalid_format',
        lookup_url: 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/',
      },
      { status: 400 }
    );
  }

  const sb = getServiceClient();

  // 1. Check cache
  if (!skipCache) {
    const { data: cached, error: cacheErr } = await sb
      .from('cslb_lookup_cache')
      .select('*')
      .eq('license_number', license)
      .maybeSingle();
    if (cacheErr) {
      // Don't fail the request on cache errors; fall through to a fresh scrape.
      console.warn('[cslb-lookup] cache read failed', cacheErr.message);
    }
    if (cached && cached.fetched_at) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_TTL_MS && cached.name) {
        return NextResponse.json({
          ok: true,
          cached: true,
          license_number: cached.license_number,
          name: cached.name,
          classification: cached.classification,
          status: cached.status,
          expiry: cached.expiry,
          bond_number: cached.bond_number,
          bond_amount: cached.bond_amount,
          lookup_url: deepLink(cached.license_number),
          fetched_at: cached.fetched_at,
        });
      }
    }
  }

  // 2. Fresh scrape
  let result;
  try {
    result = await lookupCslbLicense(license, { includeRawHtml: true });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        reason: e instanceof Error ? e.message : 'CSLB scrape failed',
        lookup_url: deepLink(license),
      },
      { status: 502 }
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason || 'CSLB lookup failed',
        lookup_url: deepLink(license),
      },
      { status: 404 }
    );
  }

  // 3. Write cache (best-effort — don't fail the user request if cache write fails)
  const cacheRow = {
    license_number: result.licenseNumber,
    name: result.name ?? null,
    classification: result.classification ?? null,
    status: result.status ?? null,
    expiry: result.expiry ?? null,
    bond_number: result.bondNumber ?? null,
    bond_amount: result.bondAmount ?? null,
    fetched_at: new Date().toISOString(),
    raw_html: result.rawHtml ?? null,
  };
  const { error: upsertErr } = await sb
    .from('cslb_lookup_cache')
    .upsert(cacheRow, { onConflict: 'license_number' });
  if (upsertErr) {
    console.warn('[cslb-lookup] cache write failed', upsertErr.message);
  }

  return NextResponse.json({
    ok: true,
    cached: false,
    license_number: result.licenseNumber,
    name: result.name,
    classification: result.classification,
    status: result.status,
    expiry: result.expiry,
    bond_number: result.bondNumber,
    bond_amount: result.bondAmount,
    lookup_url: deepLink(result.licenseNumber),
    fetched_at: cacheRow.fetched_at,
  });
}
