-- 2026-05-22c — CSLB lookup cache
--
-- Cache of CSLB public license lookups. The CSLB site has no clean API,
-- so the app scrapes the public CheckLicenseII form (ASPX with
-- VIEWSTATE). To respect their server we cache results for 3 days (TTL
-- enforced in the API route, not the table; we keep raw_html for
-- forensic re-parsing if the layout changes).
--
-- This table is *not* RLS-protected on read: any authenticated user can
-- look up any contractor (the CSLB form is public). Writes only happen
-- via the service-role API route.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cslb_lookup_cache (
  license_number  text PRIMARY KEY,
  name            text,
  classification  text,
  status          text,
  expiry          date,
  bond_number     text,
  bond_amount     numeric(12,2),
  fetched_at      timestamptz NOT NULL DEFAULT now(),
  raw_html        text
);

CREATE INDEX IF NOT EXISTS idx_cslb_cache_fetched_at
  ON public.cslb_lookup_cache(fetched_at);

ALTER TABLE public.cslb_lookup_cache ENABLE ROW LEVEL SECURITY;

-- Any authed user can read the cache. Writes are service-role only
-- (no policy => denied to authenticated for INSERT/UPDATE/DELETE).
DROP POLICY IF EXISTS "cslb_cache_authed_read" ON public.cslb_lookup_cache;
CREATE POLICY "cslb_cache_authed_read"
  ON public.cslb_lookup_cache FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
