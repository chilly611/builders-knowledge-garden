BEGIN;

-- 1. pg_cron job count
-- Used by /api/v1/healthcheck to verify the audit_log partition cron is scheduled.
CREATE OR REPLACE FUNCTION public.healthcheck_cron_job_count()
RETURNS TABLE(
  job_count bigint,
  active_count bigint,
  jobnames text[]
)
SECURITY DEFINER
SET search_path = public, cron, pg_temp
LANGUAGE sql AS $$
  SELECT
    count(*)::bigint AS job_count,
    count(*) FILTER (WHERE active)::bigint AS active_count,
    array_agg(jobname ORDER BY jobname) AS jobnames
  FROM cron.job;
$$;

-- 2. RLS policy counts per table
-- Used to verify policies are in place on the critical tenancy tables.
CREATE OR REPLACE FUNCTION public.healthcheck_rls_policy_counts(
  table_names text[]
)
RETURNS TABLE(
  table_name text,
  policy_count bigint,
  rls_enabled boolean
)
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
LANGUAGE sql AS $$
  SELECT
    t.tablename::text AS table_name,
    coalesce(p.policy_count, 0)::bigint AS policy_count,
    c.relrowsecurity AS rls_enabled
  FROM unnest(table_names) AS t(tablename)
  LEFT JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = 'public'::regnamespace
  LEFT JOIN (
    SELECT tablename, count(*)::bigint AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ) p ON p.tablename = t.tablename;
$$;

-- 3. audit_log partition count (bonus)
-- Used to confirm pg_cron is rolling partitions forward correctly.
CREATE OR REPLACE FUNCTION public.healthcheck_audit_log_partition_count()
RETURNS TABLE(
  total_partitions bigint,
  earliest text,
  latest text
)
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
LANGUAGE sql AS $$
  SELECT
    count(*)::bigint AS total_partitions,
    min(c.relname) AS earliest,
    max(c.relname) AS latest
  FROM pg_inherits i
  JOIN pg_class c ON c.oid = i.inhrelid
  JOIN pg_class p ON p.oid = i.inhparent
  WHERE p.relname = 'audit_log';
$$;

-- Grants: service_role only — these reveal infrastructure state.
GRANT EXECUTE ON FUNCTION public.healthcheck_cron_job_count() TO service_role;
GRANT EXECUTE ON FUNCTION public.healthcheck_rls_policy_counts(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.healthcheck_audit_log_partition_count() TO service_role;

-- (Don't grant to anon or authenticated — healthcheck route uses service role.)

COMMIT;
