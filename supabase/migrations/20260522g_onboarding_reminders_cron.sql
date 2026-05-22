-- 2026-05-22g — ONBOARDING-V1 reminder cron (pg_cron alternative).
--
-- The primary scheduling path for onboarding reminders is Vercel cron
-- (see vercel.json — `/api/v1/cron/onboarding-reminders` at 0 10 * * *).
-- This migration is the **fallback** for environments where Vercel cron
-- isn't available (e.g. self-hosted Supabase + non-Vercel frontend).
--
-- It uses the pg_net (http) + pg_cron extensions to POST to the same
-- endpoint with the CRON_SECRET bearer. SAFE to install alongside the
-- Vercel cron — duplicate sends are blocked by the `reminders_sent`
-- check inside the endpoint, but you SHOULD pick one or the other for
-- clean ops.
--
-- Pre-reqs:
--   1. pg_cron + pg_net extensions enabled in the Supabase project.
--   2. A vault secret named `cron_secret` matching the CRON_SECRET env
--      var configured on the API host.
--   3. A vault secret named `cron_endpoint` set to the absolute URL,
--      e.g. https://app.theknowledgegardens.com/api/v1/cron/onboarding-reminders
--
-- To remove: `SELECT cron.unschedule('onboarding-reminders');`

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  endpoint text;
  secret   text;
BEGIN
  -- Read from Supabase Vault; bail quietly if not configured so the
  -- migration is idempotent on fresh projects.
  SELECT decrypted_secret INTO endpoint FROM vault.decrypted_secrets WHERE name = 'cron_endpoint';
  SELECT decrypted_secret INTO secret   FROM vault.decrypted_secrets WHERE name = 'cron_secret';

  IF endpoint IS NULL OR secret IS NULL THEN
    RAISE NOTICE 'skipping pg_cron schedule — vault secrets cron_endpoint / cron_secret not set';
    RETURN;
  END IF;

  PERFORM cron.unschedule('onboarding-reminders') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'onboarding-reminders'
  );

  PERFORM cron.schedule(
    'onboarding-reminders',
    '0 10 * * *',
    format(
      $cron$
        SELECT net.http_get(
          url := %L,
          headers := jsonb_build_object('Authorization', %L)
        );
      $cron$,
      endpoint,
      'Bearer ' || secret
    )
  );
END $$;

COMMIT;
