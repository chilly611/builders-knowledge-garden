# BKG backup / restore tooling

Logical (`pg_dump`) backups of the BKG database shipped off-box to Cloudflare R2, plus a verified
restore path. The authoritative procedures live in [`docs/runbooks/restore.md`](../../docs/runbooks/restore.md).

| Script | Purpose |
|---|---|
| `pg-backup.sh`  | `pg_dump -Fc` a database → upload `*.dump` + `*.manifest.json` (sha256) to R2; prune old. |
| `pg-restore.sh` | Download a dump from R2, verify its checksum, `pg_restore` into a target DB (refuses prod). |
| `selftest.sh`   | Spin a throwaway local Postgres and prove the backup→restore round-trip preserves data. |
| `_common.sh`    | Shared helpers (storage put/get/ls/rm for `s3://` and `file://`, prod-host guard, checksums). |

## Quick start

```bash
# Local round-trip test — needs postgresql client+server on PATH, no prod, no R2:
bash scripts/backup/selftest.sh
# => RESTORE SELF-TEST PASSED ...

# Real backup to R2:
export SUPABASE_DB_URL='postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres'
export BACKUP_DEST='s3://bkg-backups/prod' R2_ENDPOINT='https://<acct>.r2.cloudflarestorage.com'
export AWS_ACCESS_KEY_ID='<r2-key>' AWS_SECRET_ACCESS_KEY='<r2-secret>' AWS_DEFAULT_REGION=auto
bash scripts/backup/pg-backup.sh

# Restore the latest backup into a NON-prod database:
export BACKUP_SRC='s3://bkg-backups/prod' RESTORE_TARGET_URL='postgresql://...dev...'
bash scripts/backup/pg-restore.sh latest
```

## Notes
- Use the **direct** connection (port 5432), not the transaction pooler, so `pg_dump` gets a consistent snapshot.
- Client major version must be **≥** the server's (prod is PG 17 → use `postgresql-client-17`).
- `pg-restore.sh` refuses to write a production host unless `ALLOW_PROD_RESTORE=1` (deliberate recovery only).
- Supabase-managed schemas (`realtime`, `vault`, `pgsodium`, `cron`, …) are excluded from the dump — they
  belong to the platform and are recreated by Supabase on the target project.
- Both the nightly cron and the every-night restore verification run in `.github/workflows/nightly-backup.yml`.
