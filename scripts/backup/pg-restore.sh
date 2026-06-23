#!/usr/bin/env bash
#
# Restore a BKG logical backup INTO a target database.
#
# Required env:
#   BACKUP_SRC          s3://<bucket>/<prefix>  or  file:///abs/path   (where pg-backup.sh wrote dumps)
#   RESTORE_TARGET_URL  postgres connection string to restore INTO  (must NOT be a prod host)
# For an s3:// src also set: R2_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION=auto
# Arg 1: which dump  (default: "latest"; or an explicit  bkg-<label>-<UTC>.dump  filename)
#
# Safety: refuses to restore into a known production host unless ALLOW_PROD_RESTORE=1.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$HERE/_common.sh"

: "${BACKUP_SRC:?set BACKUP_SRC (s3://bucket/prefix or file:///path)}"
: "${RESTORE_TARGET_URL:?set RESTORE_TARGET_URL (DB to restore INTO — NOT prod)}"
WHICH="${1:-latest}"

ensure_pg_on_path
dest_kind "$BACKUP_SRC" >/dev/null

TH="$(db_host "$RESTORE_TARGET_URL")"
if is_prod_host "$TH" && [ "${ALLOW_PROD_RESTORE:-0}" != "1" ]; then
  die "refusing to restore INTO production host '$TH'. This DROPS+recreates objects. Set ALLOW_PROD_RESTORE=1 only for a deliberate, supervised prod recovery."
fi

if [ "$WHICH" = "latest" ]; then
  WHICH="$(storage_ls "$BACKUP_SRC" | grep -E '\.dump$' | sort | tail -1)"
  [ -n "$WHICH" ] || die "no .dump files found in $BACKUP_SRC"
fi
log "selected backup: $WHICH"

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
storage_get "$WHICH" "$BACKUP_SRC" "$WORK/$WHICH"

# Verify checksum against the manifest if one exists.
MAN="${WHICH%.dump}.manifest.json"
if storage_ls "$BACKUP_SRC" | grep -qx "$MAN"; then
  storage_get "$MAN" "$BACKUP_SRC" "$WORK/$MAN"
  want="$(sed -n 's/.*"sha256":[[:space:]]*"\([a-f0-9]*\)".*/\1/p' "$WORK/$MAN")"
  got="$(sha256_of "$WORK/$WHICH")"
  [ "$want" = "$got" ] || die "sha256 mismatch (manifest=$want actual=$got) — corrupt copy, aborting"
  log "integrity ok: sha256=$got"
else
  log "WARN: no manifest for $WHICH — skipping checksum verification"
fi

log "restoring $WHICH -> host=$TH"
pg_restore --no-owner --no-acl --clean --if-exists --exit-on-error \
  --dbname "$RESTORE_TARGET_URL" "$WORK/$WHICH"
log "restore complete into $TH"
