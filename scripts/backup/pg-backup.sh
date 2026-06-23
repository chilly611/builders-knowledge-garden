#!/usr/bin/env bash
#
# Nightly logical backup of a Postgres / Supabase database -> off-box object storage (Cloudflare R2).
#
# Required env:
#   SUPABASE_DB_URL   postgres connection string of the DB to back up (use the DIRECT 5432 connection,
#                     not the transaction pooler, so pg_dump can hold a consistent snapshot)
#   BACKUP_DEST       s3://<bucket>/<prefix>   (R2)   or   file:///abs/path   (local test)
# For an s3:// dest also set: R2_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION=auto
# Optional env:
#   BACKUP_LABEL=prod            filename label
#   BACKUP_RETENTION_DAYS=30     prune older dumps in the dest (0 = keep everything)
#
# Produces, per run:  bkg-<label>-<UTC>.dump  (+ .manifest.json with size + sha256)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$HERE/_common.sh"

: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL (connection string of the DB to back up)}"
: "${BACKUP_DEST:?set BACKUP_DEST (s3://bucket/prefix or file:///path)}"
LABEL="${BACKUP_LABEL:-prod}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

ensure_pg_on_path
dest_kind "$BACKUP_DEST" >/dev/null   # validate scheme early

TS="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
BASE="bkg-${LABEL}-${TS}"
DUMP="$WORK/${BASE}.dump"
MAN="$WORK/${BASE}.manifest.json"

log "dumping host=$(db_host "$SUPABASE_DB_URL") label=$LABEL -> $BASE.dump"
# -Fc = compressed custom format (restore selectively with pg_restore).
# Exclude Supabase-managed internal schemas a non-superuser cannot recreate on restore.
pg_dump "$SUPABASE_DB_URL" \
  --format=custom --compress=6 --no-password --verbose \
  --exclude-schema='pgbouncer'  --exclude-schema='cron'      --exclude-schema='net' \
  --exclude-schema='realtime'   --exclude-schema='_realtime' --exclude-schema='supabase_functions' \
  --exclude-schema='pgsodium'   --exclude-schema='pgsodium_masks' --exclude-schema='vault' \
  --file="$DUMP" 2> "$WORK/dump.log" || { sed -n '$p' "$WORK/dump.log" >&2; die "pg_dump failed (see log above)"; }

# Integrity: the dump must be readable by pg_restore --list.
pg_restore --list "$DUMP" >/dev/null 2>&1 || die "dump is not readable by pg_restore --list — aborting"

SIZE=$(wc -c < "$DUMP" | tr -d ' ')
SHA=$(sha256_of "$DUMP")
cat > "$MAN" <<JSON
{
  "label": "$LABEL",
  "created_utc": "$TS",
  "source_host": "$(db_host "$SUPABASE_DB_URL")",
  "file": "${BASE}.dump",
  "bytes": $SIZE,
  "sha256": "$SHA",
  "format": "pg_dump custom (-Fc)",
  "tool": "scripts/backup/pg-backup.sh"
}
JSON
log "dump ok: ${SIZE} bytes  sha256=${SHA}"

storage_put "$DUMP" "$BACKUP_DEST"
storage_put "$MAN"  "$BACKUP_DEST"
log "uploaded ${BASE}.{dump,manifest.json} -> $BACKUP_DEST"

# Retention prune — timestamp in the filename is lexicographically sortable (UTC).
if [ "${RETENTION_DAYS}" -gt 0 ]; then
  cutoff="$(date -u -v-"${RETENTION_DAYS}"d +%Y%m%dT%H%M%SZ 2>/dev/null || date -u -d "-${RETENTION_DAYS} days" +%Y%m%dT%H%M%SZ)"
  storage_ls "$BACKUP_DEST" | grep -E "^bkg-${LABEL}-.*\.(dump|manifest\.json)$" | while read -r f; do
    fts="$(printf '%s' "$f" | sed -E "s/^bkg-${LABEL}-([0-9TZ]+)\..*/\1/")"
    if [ -n "$fts" ] && [ "$fts" \< "$cutoff" ]; then log "prune (older than ${RETENTION_DAYS}d): $f"; storage_rm "$f" "$BACKUP_DEST"; fi
  done
fi
log "backup complete: $BASE"
