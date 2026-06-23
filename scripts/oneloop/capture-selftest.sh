#!/usr/bin/env bash
#
# Capture→ledger proof — applies the ledger + capture migrations to a throwaway Postgres,
# seeds Marin, and exercises oneloop_ingest_capture end-to-end: a voice EXPENSE posts to
# the double-entry ledger (money moves + reconciles), the capture is stored with its
# structured provenance, the event links back to the capture, a non-expense capture logs
# without moving money, and a re-sent capture (same client_ref) is idempotent.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT_DIR="$(cd "$HERE/../.." && pwd)"
export PATH="${PGBIN:-/tmp/pgenv/bin}:$PATH"
command -v initdb >/dev/null || { echo "need postgres tooling on PATH"; exit 1; }
PID='55730cd3-5225-493d-8b5c-49086d942565'
ROOT="$(mktemp -d /tmp/capture-selftest.XXXXXX)"; PGDATA="$ROOT/data"; SOCK="$ROOT/sock"; PORT=$(( (RANDOM % 2000) + 58000 ))
cleanup(){ pg_ctl -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$ROOT"; }
trap cleanup EXIT
mkdir -p "$SOCK"
initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -w start >/dev/null
export PGHOST="$SOCK" PGPORT="$PORT" PGUSER=postgres
createdb loop; DB="postgresql:///loop"
psql(){ command psql "$DB" -v ON_ERROR_STOP=1 -q "$@"; }

echo "→ apply migrations + seed Marin (headroom \$347,000)"
psql -f "$ROOT_DIR/supabase/migrations/20260623_one_loop_ledger.sql"
psql -f "$ROOT_DIR/supabase/migrations/20260623_one_loop_rpcs.sql"
psql -f "$ROOT_DIR/supabase/migrations/20260623_one_loop_capture.sql"
psql -f "$ROOT_DIR/scripts/oneloop/seed-marin.sql"

echo "→ ingest a VOICE expense capture (\$12k concrete) → posts to the ledger"
psql -c "select public.oneloop_ingest_capture('$PID','voice',null,'add \$12,000 to concrete for the beam upgrade','expense','03 30 00',12000,'Bay Concrete','beam upgrade','2026-06-23'::date,0.9,null,'cr-1','mock-claude');" >/dev/null
psql <<SQL
do \$\$ declare f record; cap record; ev record; begin
  select * into f from oneloop.project_financials where project_id='$PID';
  if f.headroom <> 335000 or f.actual <> 324000 then raise exception 'LEDGER NOT MOVED: %', row_to_json(f); end if;

  select * into cap from oneloop.capture where project_id='$PID' and kind='voice' order by created_at desc limit 1;
  if cap.status <> 'posted' then raise exception 'capture not posted: %', cap.status; end if;
  if cap.parsed_result->>'category' <> 'expense' or (cap.parsed_result->>'model') <> 'mock-claude' then
    raise exception 'capture provenance missing: %', cap.parsed_result; end if;
  if cap.created_at is null then raise exception 'capture has no timestamp'; end if;

  select * into ev from oneloop.event where capture_id = cap.id and event_type='invoice.posted';
  if ev.id is null then raise exception 'event not linked to capture'; end if;
  raise notice 'OK voice expense: headroom 347000->%  capture=%(posted)  event linked', f.headroom, left(cap.id::text,8);
end \$\$;
SQL

echo "→ ingest a PHOTO progress capture (no amount) → logged, money unchanged"
psql -c "select public.oneloop_ingest_capture('$PID','photo','http://img/rough-in.jpg',null,'progress',null,null,null,'rough-in complete','2026-06-23'::date,0.8,null,'cr-2','mock-claude');" >/dev/null
psql <<SQL
do \$\$ declare f record; n int; begin
  select * into f from oneloop.project_financials where project_id='$PID';
  if f.headroom <> 335000 then raise exception 'PROGRESS CAPTURE MOVED MONEY (should not): %', f.headroom; end if;
  select count(*) into n from oneloop.capture where project_id='$PID' and kind='photo' and status='structured';
  if n <> 1 then raise exception 'photo capture not stored as structured'; end if;
  raise notice 'OK photo progress: stored (structured), money unchanged at headroom %', f.headroom;
end \$\$;
SQL

echo "→ idempotent re-send (same client_ref cr-1) → no duplicate, no double-charge"
psql -c "select public.oneloop_ingest_capture('$PID','voice',null,'add \$12,000 to concrete for the beam upgrade','expense','03 30 00',12000,'Bay Concrete','beam upgrade','2026-06-23'::date,0.9,null,'cr-1','mock-claude');" >/dev/null
psql <<SQL
do \$\$ declare f record; n int; begin
  select count(*) into n from oneloop.capture where project_id='$PID' and client_ref='cr-1';
  if n <> 1 then raise exception 'IDEMPOTENCY BROKEN: % rows for client_ref cr-1', n; end if;
  select * into f from oneloop.project_financials where project_id='$PID';
  if f.headroom <> 335000 then raise exception 'RE-SEND DOUBLE-CHARGED: headroom %', f.headroom; end if;
  raise notice 'OK idempotent: client_ref cr-1 logged once, headroom still %', f.headroom;
end \$\$;
SQL

echo
echo "CAPTURE→LEDGER PROOF PASSED — voice expense posts + reconciles, capture stored with provenance,"
echo "event links to capture, non-expense logs without moving money, re-send is idempotent."
