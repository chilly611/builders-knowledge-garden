-- 2026-05-24 — pending_invites: proper invite flow for org membership.
--
-- ORG-INVITES rewrite. The previous /api/v1/orgs/invite implementation
-- (round 5 ONBOARDING) wrote `org_members` rows with `user_id = caller`
-- as a placeholder — wrong on two counts:
--   1. It silently grants the caller a second membership row for the
--      target org (the caller is already a member!) and never tracks
--      the invitee at all.
--   2. The invitee, after signing up, has no way to discover the
--      invite — no email→user_id link exists until they sign up, and
--      the email never carried a server-checkable token.
--
-- This migration introduces `pending_invites` with a 256-bit hex
-- token (gen_random_bytes(32) = 64 hex chars), a 14-day expiry, and
-- an `expire_old_invites()` maintenance routine wired to pg_cron.
--
-- UNIQUENESS: at most one *pending* invite per (email, org_id).
-- Implemented as a partial unique index — a plain
-- UNIQUE (email, org_id, status) would block a second `accepted`
-- row, but the same user might be (e.g.) invited → accepted →
-- removed → invited again, which is legitimate. The partial index
-- only fires on status='pending'.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Table
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pending_invites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role          org_role NOT NULL DEFAULT 'member',
  token         text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by    uuid REFERENCES auth.users(id),
  invited_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at   timestamptz,
  accepted_by   uuid REFERENCES auth.users(id),
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','expired','revoked'))
);

-- Normalize email storage to lower-case so the lookup at /accept-invite
-- can compare case-insensitively without juggling collations.
ALTER TABLE public.pending_invites
  ADD CONSTRAINT pending_invites_email_lowercase
  CHECK (email = lower(email));

CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON public.pending_invites(email);
CREATE INDEX IF NOT EXISTS idx_pending_invites_token ON public.pending_invites(token);
CREATE INDEX IF NOT EXISTS idx_pending_invites_org   ON public.pending_invites(org_id);

-- One *pending* invite per (email, org_id). Partial — does NOT block
-- accepted/expired/revoked rows with the same pair.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_invite_email_org
  ON public.pending_invites(email, org_id)
  WHERE status = 'pending';

-- ─────────────────────────────────────────────────────────────────────
-- 2. RLS
--    Org admins can read+write invites for their org.
--    Token-lookup happens via the service-role client (the
--    /accept-invite page calls the API; the page itself never queries
--    the table directly with the anon key), so we deliberately do NOT
--    add a public "anyone with the token" policy — that would enable
--    enumeration via a leaked browser history dump.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_admins_manage_invites" ON public.pending_invites;

CREATE POLICY "org_admins_manage_invites"
  ON public.pending_invites
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
       WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
       WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 3. Audit trigger
-- ─────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS audit_pending_invites_trg ON public.pending_invites;
CREATE TRIGGER audit_pending_invites_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.pending_invites
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- ─────────────────────────────────────────────────────────────────────
-- 4. Maintenance: expire old invites
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.expire_old_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE public.pending_invites
     SET status = 'expired'
   WHERE status = 'pending'
     AND expires_at < now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Schedule daily at 11am UTC. Re-schedule idempotently — un-schedule
-- any prior copy of the job by name before creating fresh.
DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jobid INTO existing_job_id
      FROM cron.job
     WHERE jobname = 'expire-old-invites';
    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
    END IF;
    PERFORM cron.schedule(
      'expire-old-invites',
      '0 11 * * *',
      'SELECT public.expire_old_invites();'
    );
  END IF;
END $$;

COMMIT;
