#!/usr/bin/env bash
#
# Role-lens RLS proof — replicates Supabase's RLS runtime on a throwaway local Postgres
# (the `authenticated` role + an auth.uid() shim read from the JWT-claim GUC), applies the
# ledger + lens/RLS migrations, seeds a full multi-lane scenario, then runs the spec's
# leakage gate (BKG-Role-Lenses-and-Fact-Provenance-Security.md §6) AS EACH ROLE.
#
# Proves the three load-bearing denials + cross-tenant isolation + audit immutability:
#   Sub → margin/ledger/other-subs = ∅   ·   Architect → financials = ∅   ·   Owner → cost/margin = ∅
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT_DIR="$(cd "$HERE/../.." && pwd)"
export PATH="${PGBIN:-/tmp/pgenv/bin}:$PATH"
command -v initdb >/dev/null || { echo "need postgres tooling on PATH"; exit 1; }

ROOT="$(mktemp -d /tmp/rls-selftest.XXXXXX)"; PGDATA="$ROOT/data"; SOCK="$ROOT/sock"; PORT=$(( (RANDOM % 2000) + 57000 ))
cleanup(){ pg_ctl -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$ROOT"; }
trap cleanup EXIT
mkdir -p "$SOCK"
initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -w start >/dev/null
export PGHOST="$SOCK" PGPORT="$PORT" PGUSER=postgres
createdb loop
DB="postgresql:///loop"
SU(){ command psql "$DB" -v ON_ERROR_STOP=1 -q "$@"; }   # superuser

# scenario ids
ORG_GC=11111111-1111-4111-8111-111111111110; ORG_SA=11111111-1111-4111-8111-1111111111aa
ORG_SB=11111111-1111-4111-8111-1111111111bb; ORG_OW=11111111-1111-4111-8111-1111111110cc
ORG_OT=11111111-1111-4111-8111-1111111110ff
U_GC=22222222-2222-4222-8222-222222222201;  U_OW=22222222-2222-4222-8222-222222222202
U_SA=22222222-2222-4222-8222-2222222222aa;  U_SB=22222222-2222-4222-8222-2222222222bb
U_AR=22222222-2222-4222-8222-2222222222ac;  U_OT=22222222-2222-4222-8222-2222222222ff
P1=33333333-3333-4333-8333-333333333301;    P2=33333333-3333-4333-8333-333333333302
CMTA=44444444-4444-4444-8444-4444444444aa;  CMTB=44444444-4444-4444-8444-4444444444bb
PAA=55555555-5555-4555-8555-5555555555aa;   PAB=55555555-5555-4555-8555-5555555555bb

echo "→ create Supabase-like roles + auth.uid() shim"
SU <<SQL
do \$\$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end \$\$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as \$\$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid \$\$;
grant usage on schema auth to authenticated, anon, service_role;
grant execute on function auth.uid() to authenticated, anon, service_role;
SQL

echo "→ apply migrations (ledger + rpcs + lens/RLS)"
SU -f "$ROOT_DIR/supabase/migrations/20260623_one_loop_ledger.sql"
SU -f "$ROOT_DIR/supabase/migrations/20260623_one_loop_rpcs.sql"
SU -f "$ROOT_DIR/supabase/migrations/20260623_one_loop_lenses_rls.sql"

echo "→ seed multi-lane scenario (GC P1: owner, sub A, sub B, architect; + tenant P2)"
SU <<SQL
insert into oneloop.account (code,name,type) values ('5000','Construction Costs','expense'),('2000','Accounts Payable','liability');
insert into oneloop.taxonomy_code (system,code,title) values ('masterformat','03 30 00','Concrete');
insert into oneloop.project (id,org_id,name,stage) values ('$P1','$ORG_GC','GC Project One','build'),('$P2','$ORG_OT','Other Tenant Project','build');
insert into oneloop.project_contract (project_id,contract_revenue) values ('$P1',1000000);
insert into oneloop.project_member (project_id,user_id,lane,party_org_id) values
  ('$P1','$U_GC','gc','$ORG_GC'),('$P1','$U_OW','owner','$ORG_OW'),
  ('$P1','$U_SA','specialty','$ORG_SA'),('$P1','$U_SB','specialty','$ORG_SB'),
  ('$P1','$U_AR','architect','$ORG_OW'),('$P2','$U_OT','gc','$ORG_OT');
do \$\$ declare v_code uuid; exp uuid; ap uuid; je uuid; begin
  select id into v_code from oneloop.taxonomy_code where code='03 30 00';
  select id into exp from oneloop.account where code='5000'; select id into ap from oneloop.account where code='2000';
  insert into oneloop.budget_line (project_id,masterformat_id,original_amount) values ('$P1',v_code,650000);
  insert into oneloop.commitment (id,project_id,masterformat_id,vendor_name,kind,original_amount,vendor_org_id) values
    ('$CMTA','$P1',v_code,'Sub A Concrete','subcontract',100000,'$ORG_SA'),
    ('$CMTB','$P1',v_code,'Sub B Framing','subcontract',60000,'$ORG_SB');
  insert into oneloop.journal_entry (project_id,source_type,memo) values ('$P1','invoice','concrete') returning id into je;
  insert into oneloop.journal_line (entry_id,account_id,masterformat_id,debit,credit) values (je,exp,v_code,200000,0),(je,ap,null,0,200000);
  insert into oneloop.pay_application (id,project_id,commitment_id,amount,submitted_by) values
    ('$PAA','$P1','$CMTA',50000,'$U_SA'),('$PAB','$P1','$CMTB',40000,'$U_SB');
  insert into oneloop.draw (project_id,number,amount,status) values ('$P1',1,100000,'requested');
  insert into oneloop.event (project_id,event_type,entity_type,entity_id,source) values ('$P1','project.seeded','project','$P1','system');
  perform oneloop.recompute_financials('$P1');
end \$\$;
SQL

# ---- assertion helpers (each runs in a fresh connection AS authenticated, with auth.uid()=uid) ----
FAILED=0
run_as(){ command psql "$DB" -tA -c "set request.jwt.claim.sub='$1'; set role authenticated; $2" 2>&1; }
ct(){ # uid expected sql desc   (SELECT count assertion)
  local got; got=$(run_as "$1" "$3" | tail -1 | tr -d '[:space:]')
  if [ "$got" = "$2" ]; then printf '    ✓ %s (=%s)\n' "$4" "$got"; else printf '    ✗ FAIL %s: expected %s got [%s]\n' "$4" "$2" "$got"; FAILED=1; fi
}
blocked(){ # uid sql desc   (a write that MUST be denied)
  local out; out=$(run_as "$1" "$2")
  if echo "$out" | grep -qiE "row-level security|permission denied|append-only|violates"; then printf '    ✓ %s → blocked\n' "$3"
  else printf '    ✗ FAIL %s → NOT blocked: [%s]\n' "$3" "$out"; FAILED=1; fi
}
allowed(){ # uid sql desc   (a write that MUST succeed)
  local out; out=$(run_as "$1" "$2")
  if echo "$out" | grep -qiE "INSERT|UPDATE [0-9]"; then printf '    ✓ %s → allowed\n' "$3"
  else printf '    ✗ FAIL %s → unexpectedly denied: [%s]\n' "$3" "$out"; FAILED=1; fi
}

echo; echo "→ AS SUB A ($U_SA) — the most-constrained lane"
ct  "$U_SA" 0 "select count(*) from oneloop.project_financials"                 "margin/financials"
ct  "$U_SA" 0 "select count(*) from oneloop.cost_code_rollup"                   "cost-code rollup"
ct  "$U_SA" 0 "select count(*) from oneloop.budget_line"                        "budget lines"
ct  "$U_SA" 0 "select count(*) from oneloop.journal_entry"                      "ledger entries"
ct  "$U_SA" 0 "select count(*) from oneloop.journal_line"                       "ledger lines"
ct  "$U_SA" 0 "select count(*) from oneloop.project_contract"                   "owner contract value"
ct  "$U_SA" 0 "select count(*) from oneloop.draw"                               "owner draws"
ct  "$U_SA" 1 "select count(*) from oneloop.commitment"                         "own commitment only (1)"
ct  "$U_SA" 0 "select count(*) from oneloop.commitment where id='$CMTB'"        "another sub's commitment = ∅"
ct  "$U_SA" 1 "select count(*) from oneloop.pay_application"                    "own pay app only (1)"
ct  "$U_SA" 0 "select count(*) from oneloop.pay_application where id='$PAB'"    "another sub's pay app = ∅"
ct  "$U_SA" 1 "select count(*) from oneloop.project where id='$P1'"             "own project visible"
ct  "$U_SA" 0 "select count(*) from oneloop.project where id='$P2'"             "cross-tenant project = ∅"
allowed "$U_SA" "insert into oneloop.pay_application (project_id,commitment_id,amount,submitted_by) values ('$P1','$CMTA',1,'$U_SA')" "submit pay app on OWN commitment"
blocked "$U_SA" "insert into oneloop.pay_application (project_id,commitment_id,amount,submitted_by) values ('$P1','$CMTB',1,'$U_SA')" "submit pay app on ANOTHER sub's commitment"

echo "→ AS ARCHITECT ($U_AR) — design lane, zero financials"
ct  "$U_AR" 0 "select count(*) from oneloop.project_financials"                 "financials = ∅"
ct  "$U_AR" 0 "select count(*) from oneloop.journal_entry"                      "ledger = ∅"
ct  "$U_AR" 0 "select count(*) from oneloop.commitment"                         "commitments = ∅"
ct  "$U_AR" 0 "select count(*) from oneloop.pay_application"                    "pay apps = ∅"
ct  "$U_AR" 0 "select count(*) from oneloop.budget_line"                        "budget = ∅"
ct  "$U_AR" 1 "select count(*) from oneloop.project where id='$P1'"             "project metadata visible"

echo "→ AS OWNER ($U_OW) — sees their billing, NOT cost/margin"
ct  "$U_OW" 1 "select count(*) from oneloop.project_contract"                   "contract value visible"
ct  "$U_OW" 1 "select count(*) from oneloop.draw"                               "draws visible"
ct  "$U_OW" 1 "select count(*) from oneloop.v_owner_financials where project_id='$P1' and contract_value is not null" "owner view has contract"
ct  "$U_OW" 0 "select count(*) from oneloop.project_financials"                 "GC margin = ∅"
ct  "$U_OW" 0 "select count(*) from oneloop.cost_code_rollup"                   "cost basis = ∅"
ct  "$U_OW" 0 "select count(*) from oneloop.budget_line"                        "budget = ∅"
ct  "$U_OW" 0 "select count(*) from oneloop.journal_entry"                      "ledger = ∅"
ct  "$U_OW" 0 "select count(*) from oneloop.pay_application"                    "sub pay = ∅"

echo "→ AS GC ($U_GC) — full read on the project, nothing cross-tenant"
ct  "$U_GC" 1 "select count(*) from oneloop.project_financials"                 "financials full"
ct  "$U_GC" 2 "select count(*) from oneloop.commitment"                         "all commitments (2)"
ct  "$U_GC" 3 "select count(*) from oneloop.pay_application"                    "all pay apps incl the sub's new submission (3)"
ct  "$U_GC" 1 "select count(*) from oneloop.journal_entry"                      "ledger visible"
ct  "$U_GC" 1 "select count(*) from oneloop.project_contract"                   "contract visible"
ct  "$U_GC" 0 "select count(*) from oneloop.project where id='$P2'"             "cross-tenant project = ∅"
blocked "$U_GC" "update oneloop.event set payload='{\"x\":1}' where project_id='$P1'"  "audit event UPDATE (append-only)"

echo "→ AS OTHER-TENANT GC ($U_OT) — total isolation from P1"
ct  "$U_OT" 0 "select count(*) from oneloop.project_financials where project_id='$P1'" "P1 financials = ∅"
ct  "$U_OT" 0 "select count(*) from oneloop.project where id='$P1'"             "P1 project = ∅"

echo
if [ "$FAILED" = 0 ]; then
  echo "ROLE-LENS RLS PROOF PASSED — over-access is impossible: sub/architect/owner cannot reach margin,"
  echo "ledger, budget, or another party's data; cross-tenant reads return ∅; audit is append-only."
else
  echo "RLS PROOF FAILED — see ✗ lines above."; exit 1
fi
