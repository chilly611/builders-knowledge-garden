# Prod Migration Runbook — carve BKG out of the shared project into a dedicated prod

**Decision (founder, 2026-06-23):** migrate prod to a dedicated, BKG-only Supabase project.

## ⚠️ Read this first — sequencing vs. the 06-27 pilot

The current prod (`vlezoyalutexenbnzzui`) is **not BKG-only**. It hosts at least three products in one
`public` schema sharing **one `auth.users`**:

| Product | Representative tables | Notable |
|---|---|---|
| **BKG** | `project_*` (11), `crm_*` (5), `command_center_*`, `brand_*`, `specialist_runs`, `lens_*`, `jurisdictions`, `signature*`, `subscriptions`, `vendors`, `dream_*`, `heartbeat_*`, `improvement_*` | the app |
| **Orchid** | `species_*`, `orchid_*`, `care_*`, `water_*`, `genera`, `classifications`, `synonyms` | buckets `species-photos` (404), `species-media` |
| **Toxicology / Health** | `substance_*` (**7,660 rows**), `substances`, `ewg_*`, `regulatory_*`, `exposure_*`, `case_*`, `source_*`, `health_*` | largest data |
| **Shared engine** | `kg_*`, `knowledge_*`, `entity_*`, `audit_*` (21 tables), `org*` | possibly FK'd by BKG |

**The 16 users are not product-attributable** (only standard `provider` metadata), so `auth.users` cannot
be cleanly split. That makes a pre-pilot big-bang cutover risky.

> **Therefore: pilot data-safety does NOT depend on this cutover.** It depends on backups + PITR +
> dev-isolation + deploy-gating, which are independent and faster. Do those first
> ([pilot-data-safety-checklist.md](./pilot-data-safety-checklist.md)). Run this migration as a
> **dry-run-gated, supervised** operation — ideally a maintenance window after the pilot, or before it
> **only if the dry-run (§4) reconciles perfectly.** Never cut over on an unverified dump.

---

## 1. Stand up the dedicated prod project ($10/mo)

Cost confirmed: **$10/mo** compute. Region: match prod read latency — `us-east-1` (current prod region).
Create via dashboard, or via MCP/Management API once cost is confirmed. Name: `bkg-prod`.

After creation, capture: project ref, DB password (direct 5432 conn string), anon + service_role keys,
S3-compatible storage endpoint.

## 2. Build the BKG table allowlist (FK-closed) — the critical step

A wrong allowlist = a broken app or orphaned rows. Compute the closure, don't eyeball it:

```sql
-- On the shared prod: start from the obvious BKG tables, then pull in everything they reference.
-- Review the output; if a BKG table FKs a shared-engine table (kg_*, org*, knowledge_*), that table
-- must come along too (or be replaced with a seed). Iterate until the set is FK-closed.
with seed(t) as (values
  ('command_center_projects'),('project_members'),('project_budget_lines'),('crm_contacts'),
  ('crm_messages'),('brand_assets'),('specialist_runs'),('subscriptions'),('signatures') /* …extend… */
)
select c.conrelid::regclass as bkg_table, c.confrelid::regclass as references
from pg_constraint c
where c.contype='f' and c.conrelid::regclass::text in (select t from seed)
order by 1;
```

Produce the final `-t` list in `scripts/backup/bkg-tables.txt` (one table per line) and keep it in the PR.

## 3. Dump the BKG slice + copy the rest

```bash
# 3a. BKG tables only (data + DDL), from the allowlist:
pg_dump "$SHARED_PROD_URL" --format=custom --no-owner --no-acl \
  $(sed 's/^/-t public./' scripts/backup/bkg-tables.txt | tr '\n' ' ') \
  -f /tmp/bkg-slice.dump
pg_restore --no-owner --no-acl --clean --if-exists -d "$NEW_PROD_URL" /tmp/bkg-slice.dump

# 3b. Auth — copy users. They are not product-attributable, so the pragmatic, safe choice for the pilot is
#     to copy ALL 16 (non-BKG users simply have no BKG rows in the new project). Use Supabase's auth
#     export/import or:  pg_dump -n auth ... | pg_restore -d "$NEW_PROD_URL"   (preserves password hashes).
#     Optional tighter variant: copy only users referenced by BKG tables (command_center_projects.user_id,
#     project_members.user_id, …). Document which you chose.

# 3c. Storage buckets (BKG only): brand-assets, platform-context, crm-photos, project-evidence (~101 files)
rclone copy shared:brand-assets newprod:brand-assets   # (configure rclone S3 remotes for both endpoints)
#   …repeat for the other three BKG buckets. Do NOT copy species-photos/species-media (Orchid).

# 3d. Edge functions: redeploy any BKG-owned ones (backfill-embeddings, mirror-context) to the new project.
# 3e. pg_cron: review the `cron` schema jobs on shared prod; recreate the BKG ones on the new project.
```

## 4. Dry-run gate (must pass before cutover)

Run §1–§3 into the new project and verify **without repointing the app yet**:
```bash
psql "$NEW_PROD_URL" -c "select count(*) from command_center_projects;"          -- matches BKG count
psql "$NEW_PROD_URL" -c "select id,name from command_center_projects where id='55730cd3-5225-493d-8b5c-49086d942565';"
psql "$NEW_PROD_URL" -c "select count(*) from auth.users;"                       -- expected user count
# No dangling FKs, no missing tables the app queries (grep API routes for table names):
psql "$NEW_PROD_URL" -c "select conrelid::regclass from pg_constraint where contype='f' and not convalidated;"
```
Point a **Preview** deploy (not prod) at `$NEW_PROD_URL` and run the full loop in a real browser. Only when
Marin reconciles to **$1.65M / $312K / $186K / $1.15M / $347K** and sign-in works → proceed.

## 5. Cutover (supervised, ~5 min, reversible)

1. Take a fresh backup of BOTH projects (`scripts/backup/pg-backup.sh`) — the rollback anchor.
2. Brief maintenance pause (optional): nothing else writes BKG during the final sync.
3. Re-sync any rows written since the dry-run dump (delta) — or accept the short freeze.
4. **Repoint Vercel _Production_ env** `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` / service-role / anon to
   the new project. Redeploy prod (via the gated pipeline).
5. Update `PROD_SUPABASE_PROJECT_REFS` to include **both** the new ref and `vlezoyalutexenbnzzui` (so dev
   is fenced from both), and `PROD_DB_HOSTS` in `scripts/backup/_common.sh`.
6. Move PITR + the nightly R2 backup secret (`PROD_SUPABASE_DB_URL`) to the new project.
7. Real-browser smoke test of the loop on `builders.theknowledgegardens.com`.

## 6. Rollback

If anything is wrong: repoint Vercel Production env back to `vlezoyalutexenbnzzui`, redeploy. The old data
was never deleted — the shared project is untouched by this migration (we only *read* from it). That is why
this is safe: **cutover is a config flip, not a destructive move.** Leave the old BKG tables in the shared
project until the new prod has been clean for at least a full backup+pilot cycle, then prune them there.
