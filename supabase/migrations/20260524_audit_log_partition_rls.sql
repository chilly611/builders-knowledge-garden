-- 20260524_audit_log_partition_rls.sql
-- AUDIT-PARTITIONS-RLS (2026-05-22)
--
-- Postgres declarative partitioning does NOT propagate RLS from the parent
-- to leaf tables. With grants for anon/authenticated already present on every
-- leaf, anyone could `SELECT FROM audit_log_y2026m05` directly and bypass the
-- parent's RLS gate.
--
-- This migration:
--   1. Enables + FORCEs RLS on every existing partition leaf.
--   2. Patches public.create_audit_log_partition() so every future partition
--      (created via the monthly pg_cron job) inherits the same lockdown.
--   3. REVOKEs SELECT/INSERT/UPDATE/DELETE on every leaf from anon and
--      authenticated. service_role + postgres retain access (and bypass RLS),
--      and the audit_trigger_fn writes through the parent which still routes
--      INSERTs to the correct partition.
--   4. Verifies 0 leaves remain with RLS disabled.
--
-- Defense in depth: REVOKE blocks the leaf at the privilege layer, RLS blocks
-- it at the row layer. Either alone would be enough, both together is right.

BEGIN;

-- 1. Enable + FORCE RLS on all CURRENT partition leaves.
DO $$
DECLARE
  partition_rec record;
BEGIN
  FOR partition_rec IN
    SELECT c.relname
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'public.audit_log'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', partition_rec.relname);
    -- FORCE also gates the table owner. service_role still bypasses RLS
    -- because it has BYPASSRLS, so writes via audit_trigger_fn continue to
    -- work.
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', partition_rec.relname);
  END LOOP;
END $$;

-- 2. Patch create_audit_log_partition() so newly-created partitions inherit
-- RLS + FORCE at creation time. Preserves the existing SECURITY DEFINER +
-- search_path settings.
CREATE OR REPLACE FUNCTION public.create_audit_log_partition(start_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  partition_name text;
  start_str      text;
  end_str        text;
BEGIN
  start_date := date_trunc('month', start_date)::date;
  partition_name := 'audit_log_y' || to_char(start_date, 'YYYY')
                                  || 'm' || to_char(start_date, 'MM');
  start_str := to_char(start_date, 'YYYY-MM-DD');
  end_str   := to_char((start_date + interval '1 month')::date, 'YYYY-MM-DD');

  -- Create the partition.
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.audit_log FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_str, end_str
  );

  -- Lock it down at the row layer (RLS) and privilege layer (REVOKE).
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', partition_name);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', partition_name);
  EXECUTE format('REVOKE SELECT, INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated', partition_name);
END;
$function$;

-- 3. Revoke direct-leaf access from anon + authenticated on every existing
-- partition. They must go through the parent audit_log (which has RLS +
-- "Service insert audit" policy + no SELECT policy).
DO $$
DECLARE
  partition_rec record;
BEGIN
  FOR partition_rec IN
    SELECT c.relname
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'public.audit_log'::regclass
  LOOP
    EXECUTE format(
      'REVOKE SELECT, INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated',
      partition_rec.relname
    );
  END LOOP;
END $$;

-- 4. Verification — fail the migration if any leaf is still unprotected.
DO $$
DECLARE
  unprotected_count int;
  ungated_grant_count int;
BEGIN
  SELECT count(*) INTO unprotected_count
  FROM pg_inherits i
  JOIN pg_class c ON c.oid = i.inhrelid
  WHERE i.inhparent = 'public.audit_log'::regclass
    AND NOT c.relrowsecurity;

  IF unprotected_count > 0 THEN
    RAISE EXCEPTION 'audit_log has % partition leaves without RLS', unprotected_count;
  END IF;

  SELECT count(*) INTO ungated_grant_count
  FROM information_schema.role_table_grants g
  JOIN pg_inherits i
    ON i.inhrelid = (g.table_schema || '.' || g.table_name)::regclass
  WHERE i.inhparent = 'public.audit_log'::regclass
    AND g.grantee IN ('anon', 'authenticated')
    AND g.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

  IF ungated_grant_count > 0 THEN
    RAISE EXCEPTION
      'audit_log partition leaves still grant SELECT/INSERT/UPDATE/DELETE to anon/authenticated (% grant rows)',
      ungated_grant_count;
  END IF;

  RAISE NOTICE 'All audit_log partition leaves: RLS enabled + REVOKEd from anon/authenticated';
END $$;

COMMIT;
