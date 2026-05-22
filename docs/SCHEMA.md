# Schema notes

A short, high-signal index of the places where the same concept lives in
more than one column. If you're new here and editing a write path, read the
section that matches the table.

## Budget — canonical store is `project_budget_lines`

**Canonical:** `public.project_budget_lines`

| column         | type         | notes                                                                 |
| -------------- | ------------ | --------------------------------------------------------------------- |
| `id`           | uuid PK      |                                                                       |
| `project_id`   | text         | references `command_center_projects.id` (text on both sides)          |
| `csi_division` | text         | upsert key; real seed rows use MasterFormat codes ("01"…"99"), client-created lines use a stable client ID |
| `description`  | text         |                                                                       |
| `budgeted`     | numeric      | the source-of-truth total per line; what the summary aggregates       |
| `committed`    | numeric      | optional — populated when lifecycle state is `locked-in` or `paid`    |
| `actual_spent` | numeric      | optional — populated when lifecycle state is `paid`                   |
| `stage_id`     | smallint     | 1..7 → cockpit phase; nullable, falls back to CSI-inferred bucket     |

**Unique index:** `project_budget_lines_proj_div_idx (project_id, csi_division) WHERE csi_division IS NOT NULL`
— added in `supabase/migrations/20260522c_budget_lines_unique_proj_div.sql`.
This is what makes the `/api/v1/budget` PATCH upsert idempotent.

**Audit:** every INSERT / UPDATE / DELETE writes to `audit_log` via the
`audit_project_budget_lines_trg` trigger (SCHEMA-ALPHA, 2026-05-22). The
write rate is autosave-driven (500 ms debounce per user, per project), so
expect ~1–5 rows/min per active editor — keep an eye on `audit_log` volume
once writes start landing for real users.

**Reads:** `GET /api/v1/budget?project_id=…` synthesizes the legacy
`{ budget, items, summary }` payload from the lines table.
**Writes:** `PATCH /api/v1/budget` with `{ project_id, lines: [...], replace? }`.
Both BudgetClient autosave and EstimatingClient's "Push to budget" go
through the same route.

### DEPRECATED: `command_center_projects.project_budgets` (jsonb)

Ship 25 (2026-05-19) added this column as the source of truth, but the
read path was never moved off the lines table. As of BUDGET-WRITE
round-3 (2026-05-22) the column is **read-only legacy**:

- The route at `/api/v1/projects` no longer feeds the budget UI; nothing
  in `/killerapp/budget` or `/killerapp/workflows/estimating` should
  PATCH it.
- ~34 prod rows still carry pre-consolidation user edits. A backfill
  job into `project_budget_lines` should land before the column is
  dropped.
- The column has a `COMMENT ON COLUMN` documenting the deprecation
  (see `20260522c_budget_lines_unique_proj_div.sql`).

**Do not** add new writers to `project_budgets`. If you find yourself
reaching for it, the canonical store is `project_budget_lines` and the
write path is `PATCH /api/v1/budget`.

## Other consolidation notes (TODO)

- `command_center_projects.user_id` is `text`; the auth `user.id` is a
  uuid. Always coerce both sides to `String(...)` before comparing.
- `saved_projects` (referenced in some legacy routes) does not exist in
  prod — ignore any code path that selects from it.

## `audit_log` — partitioned, 7-year retention

**Canonical:** `public.audit_log` — declarative RANGE partitioning on
`changed_at`, one partition per month (`audit_log_yYYYYmMM`). Added in
`supabase/migrations/20260522e_audit_log_partition.sql`
(AUDIT-RETENTION, 2026-05-22).

### Why we partitioned

`audit_log` is the sink for the `audit_trigger_fn` SECURITY DEFINER
trigger attached to 12 source tables today (`project_budget_lines`,
`invoices`, `project_change_orders`, `project_rfis`, `project_submittals`,
`project_punch_items`, `sub_bids`, `vendors`, `signed_documents`,
`signature_events`, `organizations`, `org_members`). Budget autosave
alone projects 300–1500 rows/min during active editing. Monthly
partitions keep planner cost flat and let us drop expired months in
O(1) for IRS 7-year retention.

### Schema change vs. pre-partition

| field        | before                    | after                                            |
| ------------ | ------------------------- | ------------------------------------------------ |
| PRIMARY KEY  | `(id)`                    | `(id, changed_at)` (partition key must be in PK) |
| `changed_at` | nullable, default `now()` | `NOT NULL`, default `now()` (partition key)      |
| `id` default | `uuid_generate_v4()`      | `gen_random_uuid()`                              |

Application code did not reference `audit_log.id` as a foreign key from
anywhere in prod, so the composite PK is invisible to the app. The
`audit_trigger_fn` write shape did not change.

### Indexes (on the partitioned parent — inherited by all partitions)

- `audit_log_changed_at_idx (changed_at)` — retention queries + range scans
- `audit_log_table_record_idx (table_name, record_id)` — replay/inspect a single record
- `audit_log_changed_by_idx (changed_by) WHERE changed_by IS NOT NULL` — user history

### RLS

Same as before: RLS enabled, one INSERT policy `"Service insert audit"`
with `WITH CHECK true`. Reads still gated by the absence of any SELECT
policy (only the `postgres` / `service_role` bypass RLS).

### Maintenance functions

- `public.create_audit_log_partition(start_date date)` — idempotent
  create for one month. Internal helper.
- `public.maintain_audit_log_partitions()` — ensures the next 12 months
  of partitions exist. Idempotent. Run monthly.
- `public.drop_old_audit_log_partitions()` — drops every partition that
  starts before `now() - interval '7 years'`. Returns count. Run
  monthly. IRS-driven retention; coordinate with legal before changing
  the 7-year interval.

All three are `SECURITY DEFINER` with `search_path = public, pg_temp`
and `EXECUTE` granted only to `service_role`.

### Scheduling

**Primary path (live in prod):** `pg_cron` is installed on this
project. The migration registered two jobs:

| jobname                         | schedule (UTC) | command                                          |
| ------------------------------- | -------------- | ------------------------------------------------ |
| `maintain-audit-log-partitions` | `0 0 1 * *`    | `SELECT public.maintain_audit_log_partitions();` |
| `drop-old-audit-log-partitions` | `0 1 1 * *`    | `SELECT public.drop_old_audit_log_partitions();` |

Inspect with `SELECT * FROM cron.job;` and recent runs with
`SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;`.

**Fallback path (if pg_cron is ever disabled):** wire a Supabase Edge
Function on a monthly cron (Vercel cron / GitHub Actions / Supabase
scheduled function — anything that can hit Postgres on a monthly
trigger). It must call:

```sql
SELECT public.maintain_audit_log_partitions();
SELECT public.drop_old_audit_log_partitions();
```

Idempotent — safe to run more often than monthly if the external
scheduler is uncertain. Failure to run for any single month is
recoverable as long as it happens before the 13th month ahead is
needed (we always have 12 months of headroom).

### Initial provisioning

The migration created 19 partitions: 2025-11 through 2027-05 (6 months
back for any backdated entries, current month, and 12 months forward).
22 legacy rows were copied 1:1 and verified by a row-count assertion
inside the migration transaction; `audit_log_legacy` was dropped only
after the assertion passed.
