-- crm_signins — every signup + signin event for the beta cohort
-- Created 2026-05-20 to support the SF demo + early-tester tracking.
-- Companion to crm_contacts (20260512). Service-role inserts only;
-- users can read their own rows for "your activity" surfaces.

CREATE TABLE IF NOT EXISTS public.crm_signins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email       TEXT NOT NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN ('signup', 'signin', 'signout')),
  ip          TEXT,
  user_agent  TEXT,
  referrer    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_signins_user_id  ON public.crm_signins(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_signins_email    ON public.crm_signins(email);
CREATE INDEX IF NOT EXISTS idx_crm_signins_created  ON public.crm_signins(created_at DESC);

ALTER TABLE public.crm_signins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own signin events"
  ON public.crm_signins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on signins"
  ON public.crm_signins FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
