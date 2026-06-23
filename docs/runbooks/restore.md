# Restore Runbook — BKG production database

**Owner:** founder · **Last verified:** 2026-06-23 (logical backup/restore self-test, see §6)

This is the procedure to recover the BKG database. There are **three independent recovery layers**; use
the one that fits the incident. When in doubt, start a restore into a *scratch* target and inspect before
touching prod — never restore straight over a live database under pressure.

| Layer | Granularity | Where | RPO (data loss window) | RTO (time to restore) |
|---|---|---|---|---|
| **A. R2 logical backup** (this repo) | nightly `pg_dump` | Cloudflare R2, off-box | ≤ 24 h | ~10–30 min into a fresh DB |
| **B. Supabase daily backup** | nightly physical | Supabase (Pro, 7-day) | ≤ 24 h | minutes (in-place project restore) |
| **C. Supabase PITR** | continuous WAL | Supabase add-on | ≤ ~2 min | minutes (restore to a timestamp) |

> A, B and C are deliberately redundant. R2 is the one that survives a Supabase account/project loss or a
> billing lapse, because it lives in a different vendor and a different blast radius.

---

## 0. Before you restore — decide the target

- **Accidental data change / bad migration, prod still up** → restore into a **scratch project** (or a
  Supabase branch) first, copy out the good rows, then fix prod. Do NOT clobber prod.
- **Prod corrupted / unrecoverable** → restore in place (Supabase B/C) or into a new project (R2 layer A).
- Identify the moment *just before* the damage (for PITR) or the last clean nightly (for A/B).

---

## 1. Layer A — restore the R2 logical backup  *(vendor-independent)*

Tooling: [`scripts/backup/pg-restore.sh`](../../scripts/backup/pg-restore.sh). Needs `postgresql-client-17`
(client major ≥ server 17) and the R2 credentials.

```bash
# 1. Credentials (read-only R2 token is enough for restore)
export BACKUP_SRC='s3://bkg-backups/prod'
export R2_ENDPOINT='https://<account-id>.r2.cloudflarestorage.com'
export AWS_ACCESS_KEY_ID='<r2-key>'  AWS_SECRET_ACCESS_KEY='<r2-secret>'  AWS_DEFAULT_REGION=auto

# 2. See what's available
aws s3 ls "$BACKUP_SRC/" --endpoint-url "$R2_ENDPOINT"

# 3. Restore the latest (or a specific bkg-prod-<UTC>.dump) into a NON-prod target.
#    The script verifies the sha256 against the manifest and refuses prod hosts by default.
export RESTORE_TARGET_URL='postgresql://postgres:<pw>@db.<scratch-ref>.supabase.co:5432/postgres'
bash scripts/backup/pg-restore.sh latest
#   …or a point-in-history dump:
bash scripts/backup/pg-restore.sh bkg-prod-20260622T090000Z.dump
```

**Restoring into prod itself** (deliberate disaster recovery only): set `ALLOW_PROD_RESTORE=1` and add the
prod host to `PROD_DB_HOSTS`. `pg_restore --clean --if-exists` will drop & recreate objects — be certain.

What the dump contains / excludes: full `public` (+ `auth`, `storage` metadata) in `pg_dump -Fc` custom
format. Supabase-managed schemas (`realtime`, `vault`, `pgsodium`, `cron`, `supabase_functions`, `net`) are
**excluded** — they belong to the platform and are recreated by Supabase on the target project. Storage
**objects** (files) are not in the SQL dump; see §4.

---

## 2. Layer B — Supabase daily backup (Pro, 7-day retention)

In-place, fastest for "prod itself is broken."

- **Dashboard:** Project → Database → Backups → pick a daily snapshot → **Restore**. (Requires dashboard
  access — resolve the 2FA lockout first, see [2fa-recovery.md](./2fa-recovery.md).)
- **Management API** (works without the dashboard, with a personal access token):
  ```bash
  curl -s https://api.supabase.com/v1/projects/<ref>/database/backups \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"          # list
  # restore is a privileged POST; confirm the exact endpoint in the API docs for your project tier
  ```
- ⚠️ A Supabase **physical** restore restores the *whole project* — on the shared `vlezoyalutexenbnzzui`
  that means Orchid + Toxicology data too. After the dedicated-prod cutover this is BKG-only and clean.

## 3. Layer C — Point-in-time recovery (PITR)

Once enabled ([pitr.md](./pitr.md)), restore to any moment within the retention window (default 7 days).
- Dashboard → Database → Backups → **Point in time** → choose the timestamp *just before* the damage.
- Same whole-project caveat as §2 until prod is isolated.
- PITR is the only layer that recovers data written **since** last night's backup.

---

## 4. Storage objects (bucket files)

The SQL dump restores bucket *metadata* (`storage.buckets`, `storage.objects` rows) but not the file
bytes. BKG buckets are small (~101 objects: `brand-assets` 87, `platform-context` 10, `crm-photos` 2,
`project-evidence` 2). Mirror them with `rclone`/`aws s3 sync` between projects' S3-compatible endpoints,
or re-run the asset-generation scripts. (Add bucket files to the nightly job once prod is isolated.)

## 5. Post-restore verification (always do this)

```bash
psql "$RESTORE_TARGET_URL" -c "select count(*) from auth.users;"        -- expect 16 (pre-migration)
psql "$RESTORE_TARGET_URL" -c "select count(*) from command_center_projects;"
# Marin demo must reconcile to canon:
psql "$RESTORE_TARGET_URL" -c "select id,name from command_center_projects where id='55730cd3-5225-493d-8b5c-49086d942565';"
```
Then a real-browser smoke test of the loop (sign in → open Marin → numbers read
$1.65M / $312K / $186K / $1.15M / $347K → leave → return). Smoke-green ≠ shipping-green.

## 6. Verify the tooling itself (self-test)

`scripts/backup/selftest.sh` spins a throwaway local Postgres and proves the dump→store→restore round-trip
preserves data (no prod, no R2):

```
$ bash scripts/backup/selftest.sh
RESTORE SELF-TEST PASSED — round-trip preserved [1|50|1650000.00|0.00]; Marin budget reconciles to $1,650,000.00
```

✅ **Last run 2026-06-23 on this branch: PASSED** (PostgreSQL 17.10, sha256 manifest verified). The same
restore path runs every night against the real R2 backup in `.github/workflows/nightly-backup.yml`
(`verify-restore` job) — a backup is only real once it has been restored.
