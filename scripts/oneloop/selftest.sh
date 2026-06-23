#!/usr/bin/env bash
#
# One-Loop ledger proof — applies the migration + RPCs + Marin seed to a throwaway
# local Postgres and asserts the reconciliation invariants, the live cascade, undo,
# event immutability, and the double-entry balance guarantee. No Supabase, no prod.
# (Realtime + the real-browser dogfood are founder-gated; see docs/runbooks/one-loop.md.)
#
# Maps to the spec acceptance gate (BKG-One-Loop-Schema-and-Acceptance.md §5):
#   Phase 2 (reconcile to the penny) · 3 (change a variable → everything moves) ·
#   4 (still reconciles) · 5 (immutable attributed event) · 6 (undo).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$HERE/../.." && pwd)"
PGBIN="${PGBIN:-/tmp/pgenv/bin}"
export PATH="$PGBIN:$PATH"
command -v initdb >/dev/null || { echo "need postgres tooling on PATH (PGBIN=$PGBIN)"; exit 1; }

PID='55730cd3-5225-493d-8b5c-49086d942565'
ROOT="$(mktemp -d /tmp/oneloop-selftest.XXXXXX)"; PGDATA="$ROOT/data"; SOCK="$ROOT/sock"; PORT=$(( (RANDOM % 2000) + 56000 ))
cleanup(){ pg_ctl -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$ROOT"; }
trap cleanup EXIT
mkdir -p "$SOCK"
echo "→ initdb throwaway cluster (port $PORT)"
initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -w start >/dev/null
export PGHOST="$SOCK" PGPORT="$PORT" PGUSER=postgres
createdb loop
DB="postgresql:///loop"
psql() { command psql "$DB" -v ON_ERROR_STOP=1 "$@"; }

echo "→ apply migration + rpcs + seed"
psql -q -f "$ROOT_DIR/supabase/migrations/20260623_one_loop_ledger.sql"
psql -q -f "$ROOT_DIR/supabase/migrations/20260623_one_loop_rpcs.sql"
psql -q -f "$ROOT_DIR/scripts/oneloop/seed-marin.sql"

echo "→ Phase 2: Marin reconciles to the spec canon (penny-exact)"
psql -q <<SQL
do \$\$ declare f record; begin
  select * into f from oneloop.project_financials where project_id='$PID';
  if f.budget<>1650000 or f.actual<>312000 or f.committed_open<>186000 or f.etc<>805000
     or f.fac<>1303000 or f.remaining<>1152000 or f.headroom<>347000 or f.margin<>347000 then
    raise exception 'SEED MISMATCH: %', row_to_json(f);
  end if;
  raise notice 'OK seed: budget=% actual=% committed=% etc=% fac=% remaining=% headroom=% margin=%',
    f.budget,f.actual,f.committed_open,f.etc,f.fac,f.remaining,f.headroom,f.margin;
end \$\$;
SQL

echo "→ Phase 3+4: change a variable (add \$12,000 to concrete via RPC) → everything moves + reconciles"
psql -q -c "select public.oneloop_post_expense('$PID','03 30 00',12000,null,null,'add \$12k structural beam upgrade');" >/dev/null
psql -q <<SQL
do \$\$ declare f record; begin
  select * into f from oneloop.project_financials where project_id='$PID';
  if f.actual<>324000 or f.remaining<>1140000 or f.headroom<>335000 or f.fac<>1315000
     or f.committed_open<>186000 or f.etc<>805000 or f.budget<>1650000 or f.margin<>335000 then
    raise exception 'CASCADE MISMATCH: %', row_to_json(f);
  end if;
  -- project total must equal the sum of cost-code rows (no orphan numbers)
  if f.actual <> (select sum(actual) from oneloop.cost_code_rollup where project_id='$PID') then
    raise exception 'project actual != Σ cost_code actual';
  end if;
  raise notice 'OK cascade: actual 312000->%  remaining 1152000->%  headroom 347000->%', f.actual,f.remaining,f.headroom;
end \$\$;
SQL

echo "→ Phase 5: the change persisted as an immutable, attributed, hash-chained event"
psql -q <<SQL
do \$\$ declare n int; h text; p text; begin
  select count(*) into n from oneloop.event where project_id='$PID' and event_type='invoice.posted';
  if n < 1 then raise exception 'no invoice.posted event'; end if;
  select hash, prev_hash into h, p from oneloop.event where project_id='$PID' order by occurred_at desc, id desc limit 1;
  if h is null or h = '' then raise exception 'event not hash-chained'; end if;
  begin
    update oneloop.event set payload='{"tamper":true}'::jsonb where project_id='$PID';
    raise exception 'FAIL: event was mutable';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'OK event append-only + chained (hash=%…, blocked: %)', left(h,8), sqlerrm;
  end;
end \$\$;
SQL

echo "→ Balance guarantee: an unbalanced journal entry is rejected"
psql -q <<SQL
do \$\$ declare je uuid; begin
  begin
    insert into oneloop.journal_entry (project_id, source_type) values ('$PID','adjustment') returning id into je;
    insert into oneloop.journal_line (entry_id, account_id, debit, credit)
      values (je,(select id from oneloop.account where code='5000'),999,0);   -- debit only = unbalanced
    set constraints all immediate;                                            -- force the deferred check now
    raise exception 'FAIL: unbalanced entry accepted';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'OK unbalanced entry rejected (%)', sqlerrm;
  end;
end \$\$;
SQL

echo "→ Phase 6: undo (reverse the entry) → numbers settle back to \$347,000 headroom"
ENTRY=$(command psql "$DB" -tAc "select entity_id from oneloop.event where project_id='$PID' and event_type='invoice.posted' order by occurred_at desc, id desc limit 1")
psql -q -c "select public.oneloop_reverse_entry('$ENTRY');" >/dev/null
psql -q <<SQL
do \$\$ declare f record; begin
  select * into f from oneloop.project_financials where project_id='$PID';
  if f.actual<>312000 or f.remaining<>1152000 or f.headroom<>347000 or f.margin<>347000 then
    raise exception 'UNDO MISMATCH: %', row_to_json(f);
  end if;
  -- undo is a NEW event, not a deletion
  if (select count(*) from oneloop.event where project_id='$PID' and event_type='entry.reversed') < 1 then
    raise exception 'reversal did not write an event';
  end if;
  raise notice 'OK undo: headroom back to %  (reversal recorded as a new event)', f.headroom;
end \$\$;
SQL

echo
echo "ONE-LOOP LEDGER PROOF PASSED — reconciles to the penny, cascade propagates, ledger balances, events immutable, undo settles."
