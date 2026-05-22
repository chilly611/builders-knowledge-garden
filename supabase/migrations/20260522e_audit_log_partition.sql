-- AUDIT-RETENTION: partition audit_log by month + 7-year retention.
--
-- Why: audit_log is unbounded. Budget autosave alone projects 300–1500
-- rows/min during active editing (12 trigger-attached tables today,
-- more coming). Native PG declarative range partitioning on
-- changed_at gives us:
--   * O(1) drop of an entire month's rows for retention
--   * Partition pruning on changed_at range queries
--   * No app-side changes — table name is still `public.audit_log`
--
-- Strategy:
--   1. Rename current audit_log -> audit_log_legacy
--   2. Recreate audit_log as PARTITIONED BY RANGE (changed_at)
--   3. Create partitions for 6 months back + current + 12 months forward
--   4. Re-attach RLS policy + grants
--   5. Copy legacy rows -> new partitioned table
--   6. Drop audit_log_legacy
--   7. Add helper functions for monthly maintenance + 7-year retention drop
--   8. Try to schedule via pg_cron (best-effort; falls back to external cron)
--
-- IRS retention: 7 years (drop_old_audit_log_partitions cutoff).
--
-- Risks:
--   * The whole migration runs as one transaction; while it's open,
--     INSERTs from audit triggers on 12 source tables will block waiting
--     on AccessExclusiveLock against audit_log. With ~22 existing rows
--     the data move is sub-second, so the lock window is small (single-
--     digit seconds at worst). Schedule during a quiet window if writes
--     are heavy.
--   * PRIMARY KEY changes from (id) to (id, changed_at) — required
--     because partition key must be in PK. Application code references
--     audit_log by `id` selectively (if at all) and won't notice.
--   * Indexes on the parent become "partitioned indexes" — they only
--     apply to children created after the index. Our partitions are
--     created after the indexes in this migration, so they inherit
--     them. Future partitions created via maintain_audit_log_partitions
--     also inherit (Postgres does this automatically for partitioned
--     indexes).

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Rename existing audit_log to _legacy. Triggers on other tables
--    write to `public.audit_log` BY NAME, so during this transaction
--    those writes will block on the lock until COMMIT — at which point
--    the new partitioned table is in place under the same name and
--    they resume against it transparently.
-- ---------------------------------------------------------------------

ALTER TABLE public.audit_log RENAME TO audit_log_legacy;
ALTER INDEX public.audit_log_pkey RENAME TO audit_log_legacy_pkey;
ALTER INDEX public.idx_audit_table RENAME TO idx_audit_legacy_table;
ALTER INDEX public.idx_audit_time RENAME TO idx_audit_legacy_time;

-- ---------------------------------------------------------------------
-- 2. Recreate audit_log as a partitioned table with the same schema.
--    Preserved from original:
--      - record_id NOT NULL (current production constraint)
--      - action CHECK
--      - source default 'api'
--    Changed (required for partitioning):
--      - PRIMARY KEY now (id, changed_at) instead of (id)
--      - changed_at is NOT NULL (was nullable-with-default; partition
--        key MUST be NOT NULL)
--    The uuid default uses gen_random_uuid() (pgcrypto, always available
--    on Supabase) instead of uuid_generate_v4() to drop the uuid-ossp
--    dependency on the new table. Both produce v4 UUIDs.
-- ---------------------------------------------------------------------

CREATE TABLE public.audit_log (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  table_name  text        NOT NULL,
  record_id   uuid        NOT NULL,
  action      text        NOT NULL CHECK (action IN ('insert','update','delete')),
  old_data    jsonb,
  new_data    jsonb,
  changed_by  uuid,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  source      text                 DEFAULT 'api',
  PRIMARY KEY (id, changed_at)
) PARTITION BY RANGE (changed_at);

-- Indexes on the partitioned parent (will be inherited by all current
-- and future partitions).
CREATE INDEX audit_log_changed_at_idx
  ON public.audit_log (changed_at);
CREATE INDEX audit_log_table_record_idx
  ON public.audit_log (table_name, record_id);
CREATE INDEX audit_log_changed_by_idx
  ON public.audit_log (changed_by) WHERE changed_by IS NOT NULL;

COMMENT ON TABLE public.audit_log IS
  'Monthly-partitioned audit trail (range on changed_at). 7-year IRS retention enforced by drop_old_audit_log_partitions(). Future partitions provisioned by maintain_audit_log_partitions().';

-- ---------------------------------------------------------------------
-- 3. Helper to create a monthly partition idempotently.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_audit_log_partition(start_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  partition_name text;
  start_str      text;
  end_str        text;
BEGIN
  -- Normalize to first day of month so the math is unambiguous.
  start_date := date_trunc('month', start_date)::date;

  partition_name := 'audit_log_y' || to_char(start_date, 'YYYY')
                                  || 'm' || to_char(start_date, 'MM');
  start_str := to_char(start_date, 'YYYY-MM-DD');
  end_str   := to_char((start_date + interval '1 month')::date, 'YYYY-MM-DD');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.audit_log FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_str, end_str
  );
END;
$fn$;

COMMENT ON FUNCTION public.create_audit_log_partition(date) IS
  'Idempotently create the monthly audit_log partition that contains start_date.';

-- ---------------------------------------------------------------------
-- 4. Provision partitions: 6 months back (covers any legacy rows) +
--    current month + 12 months forward.
-- ---------------------------------------------------------------------

DO $$
DECLARE
  i int;
BEGIN
  FOR i IN -6..12 LOOP
    PERFORM public.create_audit_log_partition(
      (date_trunc('month', now()) + (i || ' months')::interval)::date
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 5. RLS + grants — replicate what was on the legacy table.
--    Original had RLS enabled with ONE policy:
--      "Service insert audit" (INSERT, WITH CHECK true)
--    Plus standard PostgREST role grants (anon/authenticated/service_role).
-- ---------------------------------------------------------------------

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service insert audit"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.audit_log TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 6. Copy legacy rows into the new partitioned table. With 22 rows
--    today this is instant; if this migration is ever re-run on a
--    larger backlog, do this in chunks.
-- ---------------------------------------------------------------------

INSERT INTO public.audit_log
  (id, table_name, record_id, action, old_data, new_data, changed_by, changed_at, source)
SELECT
  id, table_name, record_id, action, old_data, new_data, changed_by,
  COALESCE(changed_at, now()),  -- legacy column was nullable
  source
FROM public.audit_log_legacy;

-- Sanity assertion — row counts must match before we drop legacy.
DO $$
DECLARE
  legacy_count bigint;
  new_count    bigint;
BEGIN
  SELECT count(*) INTO legacy_count FROM public.audit_log_legacy;
  SELECT count(*) INTO new_count    FROM public.audit_log;
  IF legacy_count <> new_count THEN
    RAISE EXCEPTION
      'audit_log row count mismatch after copy: legacy=% new=%',
      legacy_count, new_count;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 7. Drop the legacy table.
-- ---------------------------------------------------------------------

DROP TABLE public.audit_log_legacy;

-- ---------------------------------------------------------------------
-- 8. Retention: drop partitions whose data is entirely older than
--    7 years. IRS recommends 7 years for tax-related records; if
--    the legal team revises this, change the interval here.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.drop_old_audit_log_partitions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  partition_record record;
  partition_date   date;
  cutoff_date      date;
  dropped_count    int := 0;
  ym_match         text[];
BEGIN
  -- Cutoff = first day of the month 7 years ago. Anything whose
  -- partition END (= partition start + 1 month) is <= cutoff is fully
  -- expired. We compare partition START < cutoff_date as a conservative
  -- proxy: a partition starting in (cutoff - 1 month) still has data
  -- within the 7-year window, so we don't drop it.
  cutoff_date := date_trunc('month', (now() - interval '7 years'))::date;

  FOR partition_record IN
    SELECT n.nspname, c.relname
    FROM pg_inherits i
    JOIN pg_class     c ON c.oid = i.inhrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE i.inhparent = 'public.audit_log'::regclass
  LOOP
    BEGIN
      ym_match := regexp_match(partition_record.relname, 'y(\d{4})m(\d{2})');
      IF ym_match IS NULL THEN
        CONTINUE;
      END IF;
      partition_date := make_date(ym_match[1]::int, ym_match[2]::int, 1);

      IF partition_date < cutoff_date THEN
        EXECUTE format('DROP TABLE %I.%I',
                       partition_record.nspname,
                       partition_record.relname);
        dropped_count := dropped_count + 1;
        RAISE NOTICE 'Dropped expired audit_log partition: %.%',
                     partition_record.nspname, partition_record.relname;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to evaluate partition %: %',
                    partition_record.relname, SQLERRM;
      CONTINUE;
    END;
  END LOOP;

  RETURN dropped_count;
END;
$fn$;

COMMENT ON FUNCTION public.drop_old_audit_log_partitions() IS
  'IRS 7-year retention: drops every audit_log partition that starts before (now - 7 years). Returns number of partitions dropped.';

-- ---------------------------------------------------------------------
-- 9. Maintenance: ensure 12 future months of partitions exist.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.maintain_audit_log_partitions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  i int;
BEGIN
  FOR i IN 0..12 LOOP
    PERFORM public.create_audit_log_partition(
      (date_trunc('month', now()) + (i || ' months')::interval)::date
    );
  END LOOP;
END;
$fn$;

COMMENT ON FUNCTION public.maintain_audit_log_partitions() IS
  'Idempotently creates the next 12 monthly audit_log partitions. Call monthly via pg_cron or external scheduler.';

-- Lock down execution: only the postgres role / service_role should call
-- these. The functions are SECURITY DEFINER so they run as the migration
-- owner regardless.
REVOKE ALL ON FUNCTION public.create_audit_log_partition(date)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.maintain_audit_log_partitions()     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.drop_old_audit_log_partitions()     FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.maintain_audit_log_partitions()  TO service_role;
GRANT EXECUTE ON FUNCTION public.drop_old_audit_log_partitions()  TO service_role;

-- ---------------------------------------------------------------------
-- 10. Best-effort pg_cron scheduling. If the extension isn't installable
--     in this Supabase tier, the DO block reports a NOTICE and the
--     migration still succeeds — the orchestrator is expected to wire
--     up external scheduling per docs/SCHEMA.md.
-- ---------------------------------------------------------------------

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN insufficient_privilege OR feature_not_supported OR undefined_file THEN
  RAISE NOTICE 'pg_cron not enabled (%): schedule maintain_audit_log_partitions externally.', SQLERRM;
WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron CREATE EXTENSION failed (%): schedule externally.', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unschedule any prior jobs with the same names (idempotent re-runs).
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN ('maintain-audit-log-partitions',
                      'drop-old-audit-log-partitions');

    PERFORM cron.schedule(
      'maintain-audit-log-partitions',
      '0 0 1 * *',
      $cron$SELECT public.maintain_audit_log_partitions();$cron$
    );
    PERFORM cron.schedule(
      'drop-old-audit-log-partitions',
      '0 1 1 * *',
      $cron$SELECT public.drop_old_audit_log_partitions();$cron$
    );
    RAISE NOTICE 'pg_cron jobs scheduled.';
  ELSE
    RAISE NOTICE 'pg_cron unavailable — wire monthly cron externally to call public.maintain_audit_log_partitions() and public.drop_old_audit_log_partitions().';
  END IF;
END $$;

COMMIT;
