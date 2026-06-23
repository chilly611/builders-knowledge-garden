#!/usr/bin/env bash
#
# End-to-end self-test of pg-backup.sh + pg-restore.sh against a throwaway LOCAL Postgres cluster.
# Proves the dump -> store -> restore round-trip preserves data (incl. the Marin $1.65M reconciliation).
# Touches NO production database and NO remote storage. Requires postgresql@17 (initdb/pg_ctl/psql).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$HERE/_common.sh"
ensure_pg_on_path
command -v initdb >/dev/null || die "initdb not found (brew install postgresql@17)"
command -v pg_ctl >/dev/null || die "pg_ctl not found"
command -v psql   >/dev/null || die "psql not found"

# Keep ROOT short (/tmp) so the Unix-domain socket path stays under macOS's 104-char limit.
ROOT="$(mktemp -d "/tmp/bkg-selftest.XXXXXX")"; PGDATA="$ROOT/data"; SOCK="$ROOT/sock"; DEST="file://$ROOT/backups"
PORT=$(( (RANDOM % 2000) + 55000 ))
cleanup() { pg_ctl -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$ROOT"; }
trap cleanup EXIT

mkdir -p "$SOCK"
log "initdb throwaway cluster (port $PORT, socket-only)"
initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -w start >/dev/null
export PGHOST="$SOCK" PGPORT="$PORT" PGUSER=postgres
SRCDB="postgresql:///srcdb"; DSTDB="postgresql:///dstdb"
createdb srcdb; createdb dstdb

log "seeding BKG-shaped data into srcdb (Marin reconciliation)"
psql "$SRCDB" -v ON_ERROR_STOP=1 -q <<'SQL'
create table project (id uuid primary key, name text not null, contract_revenue numeric(14,2));
create table budget_line (id serial primary key, project_id uuid references project(id), code text, amount numeric(14,2) not null);
create table journal_line (id serial primary key, debit numeric(14,2) default 0, credit numeric(14,2) default 0);
insert into project values ('55730cd3-5225-493d-8b5c-49086d942565','Modern Farmhouse Marin',1650000.00);
insert into budget_line (project_id,code,amount)
  select '55730cd3-5225-493d-8b5c-49086d942565', lpad(g::text,2,'0'), 33000.00 from generate_series(1,50) g;
insert into journal_line (debit,credit) values (312000.00,0),(0,312000.00);
SQL

FP="select (select count(*) from project)||'|'||(select count(*) from budget_line)||'|'||(select round(sum(amount),2) from budget_line)||'|'||(select coalesce(sum(debit-credit),0) from journal_line)"
before="$(psql "$SRCDB" -tAc "$FP")"
log "src fingerprint: $before"

log "=> pg-backup.sh"
SUPABASE_DB_URL="$SRCDB" BACKUP_DEST="$DEST" BACKUP_LABEL="selftest" BACKUP_RETENTION_DAYS=0 "$HERE/pg-backup.sh"

log "=> pg-restore.sh latest"
BACKUP_SRC="$DEST" RESTORE_TARGET_URL="$DSTDB" "$HERE/pg-restore.sh" latest

after="$(psql "$DSTDB" -tAc "$FP")"
log "dst fingerprint: $after"
[ "$before" = "$after" ] || die "FINGERPRINT MISMATCH src=$before dst=$after"
recon="$(psql "$DSTDB" -tAc "select round(sum(amount),2) from budget_line")"
[ "$recon" = "1650000.00" ] || die "reconciliation failed: budget sum=$recon (expected 1650000.00)"

echo "RESTORE SELF-TEST PASSED — round-trip preserved [$before]; Marin budget reconciles to \$1,650,000.00"
