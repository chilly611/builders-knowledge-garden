-- contractor_feedback - collected from the public /feedback form.
-- Created 2026-05-20 to support the SF investor demo + early-tester loop.
-- Public-insert (anyone can submit, even unauthenticated); authenticated
-- users can read their own rows; service role sees all (Chilly's admin view).
--
-- Note: welcomed_at flag for first-session redirect lives in
-- auth.users.raw_user_meta_data (no user_profiles table exists in this
-- project) - written via supabase.auth.updateUser({ data: { welcomed_at } }).
--
-- Already applied to prod via Supabase MCP on 2026-05-20 - this file is for
-- git history.

CREATE TABLE IF NOT EXISTS public.contractor_feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name          TEXT,
  trade               TEXT
                      CHECK (trade IS NULL OR trade IN ('gc','specialty','diy','architect','other')),
  project_description TEXT,
  what_worked         TEXT,
  what_didnt          TEXT,
  what_missing        TEXT,
  email               TEXT,
  follow_up_ok        BOOLEAN NOT NULL DEFAULT false,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent          TEXT,
  source_path         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_feedback_created_at
  ON public.contractor_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contractor_feedback_user_id
  ON public.contractor_feedback(user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contractor_feedback_email
  ON public.contractor_feedback(email)
  WHERE email IS NOT NULL;

ALTER TABLE public.contractor_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contractor_feedback' AND policyname = 'anyone_insert_feedback'
  ) THEN
    CREATE POLICY anyone_insert_feedback ON public.contractor_feedback
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contractor_feedback' AND policyname = 'authenticated_select_own_feedback'
  ) THEN
    CREATE POLICY authenticated_select_own_feedback ON public.contractor_feedback
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contractor_feedback' AND policyname = 'service_role_all_feedback'
  ) THEN
    CREATE POLICY service_role_all_feedback ON public.contractor_feedback
      FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;
