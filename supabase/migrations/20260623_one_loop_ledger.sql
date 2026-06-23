-- ============================================================================
-- The One Loop — reconciling double-entry money model (slice 1)
-- Spec: BKG-One-Loop-Schema-and-Acceptance.md  (§1 model, §2 schema, §3 cascade)
--
-- Idempotent + founder-gated apply on shared prod (vlezoyalutexenbnzzui hosts 6
-- gardens). Isolated in schema "oneloop" so it can never collide with another
-- garden's public tables and is trivially droppable. App reads via the public
-- view + RPCs at the bottom (no Supabase exposed-schema change needed).
--
-- Truth is the VIEW (v_*); the cache tables (cost_code_rollup, project_financials)
-- must always equal it — enforced by triggers + assert_reconcile(). The cache
-- exists only because Supabase Realtime broadcasts table changes, not view reads.
-- ============================================================================

create schema if not exists oneloop;

-- ---------------------------------------------------------------- taxonomy ---
create table if not exists oneloop.taxonomy_code (
  id        uuid primary key default gen_random_uuid(),
  system    text not null check (system in ('masterformat','uniformat')),
  code      text not null,
  title     text not null,
  parent_id uuid references oneloop.taxonomy_code(id),
  unique (system, code)
);

-- ----------------------------------------------------------------- project ---
-- id may equal command_center_projects.id so the loop layers onto an existing
-- project without creating a second identity.
create table if not exists oneloop.project (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid,
  name             text not null,
  status           text not null default 'active',
  stage            text not null default 'size_up'
                     check (stage in ('size_up','lock','plan','build','adapt','collect','reflect')),
  contract_revenue numeric(14,2),                 -- owner/contract value
  cost_budget      numeric(14,2),                 -- separate from contract (spec §1 note)
  start_date       date,
  target_end_date  date,
  created_by       uuid,
  created_at       timestamptz not null default now()
);

create table if not exists oneloop.budget_line (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references oneloop.project(id) on delete cascade,
  masterformat_id uuid not null references oneloop.taxonomy_code(id),
  original_amount numeric(14,2) not null default 0,   -- immutable once baselined
  baselined_at    timestamptz,
  unique (project_id, masterformat_id)
);

-- ------------------------------------------------------------ change orders ---
create table if not exists oneloop.change_order (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references oneloop.project(id) on delete cascade,
  number      int  not null,
  status      text not null default 'draft' check (status in ('draft','pending','approved','void')),
  description text,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  unique (project_id, number)
);
create table if not exists oneloop.change_order_line (
  id              uuid primary key default gen_random_uuid(),
  change_order_id uuid not null references oneloop.change_order(id) on delete cascade,
  masterformat_id uuid not null references oneloop.taxonomy_code(id),
  budget_delta    numeric(14,2) not null
);

-- ----------------------------------------------------- double-entry ledger ---
create table if not exists oneloop.account (
  id     uuid primary key default gen_random_uuid(),
  org_id uuid,
  code   text not null,
  name   text not null,
  type   text not null check (type in ('asset','liability','equity','revenue','expense','contra')),
  unique (org_id, code)
);

create table if not exists oneloop.commitment (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references oneloop.project(id) on delete cascade,
  masterformat_id uuid not null references oneloop.taxonomy_code(id),
  vendor_name     text not null,
  kind            text not null check (kind in ('subcontract','po')),
  original_amount numeric(14,2) not null,
  status          text not null default 'open' check (status in ('open','partially_invoiced','closed','void')),
  created_at      timestamptz not null default now()
);
create table if not exists oneloop.commitment_change (
  id            uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references oneloop.commitment(id) on delete cascade,
  delta         numeric(14,2) not null,
  reason        text,
  created_at    timestamptz not null default now()
);

create table if not exists oneloop.journal_entry (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references oneloop.project(id) on delete cascade,
  entry_date    date not null default current_date,
  source_type   text not null check (source_type in ('invoice','payment','payroll','adjustment','opening')),
  source_ref    text,
  commitment_id uuid references oneloop.commitment(id),   -- set when invoicing a PO/sub
  memo          text,
  created_by    uuid,
  created_at    timestamptz not null default now()
);
create table if not exists oneloop.journal_line (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references oneloop.journal_entry(id) on delete restrict,
  account_id      uuid not null references oneloop.account(id),
  masterformat_id uuid references oneloop.taxonomy_code(id),
  debit           numeric(14,2) not null default 0 check (debit  >= 0),
  credit          numeric(14,2) not null default 0 check (credit >= 0),
  amount_signed   numeric(14,2) generated always as (debit - credit) stored,
  check (not (debit > 0 and credit > 0))
);

-- Balance guarantee: Σdebit = Σcredit per entry, checked at COMMIT (deferrable).
create or replace function oneloop.assert_entry_balanced() returns trigger
  language plpgsql as $$
declare d numeric(14,2); c numeric(14,2); eid uuid;
begin
  eid := coalesce(new.entry_id, old.entry_id);
  select coalesce(sum(debit),0), coalesce(sum(credit),0) into d, c
    from oneloop.journal_line where entry_id = eid;
  if d <> c then
    raise exception 'journal entry % is unbalanced: debit=% credit=%', eid, d, c;
  end if;
  return null;
end $$;
drop trigger if exists trg_journal_line_balance on oneloop.journal_line;
create constraint trigger trg_journal_line_balance
  after insert or update or delete on oneloop.journal_line
  deferrable initially deferred
  for each row execute function oneloop.assert_entry_balanced();

create table if not exists oneloop.etc_override (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references oneloop.project(id) on delete cascade,
  masterformat_id uuid not null references oneloop.taxonomy_code(id),
  amount          numeric(14,2) not null,
  as_of           timestamptz not null default now(),
  created_by      uuid
);

-- ----------------------------------------- event log (append-only, chained) ---
create table if not exists oneloop.event (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references oneloop.project(id) on delete cascade,
  actor_id    uuid,
  actor_role  text,
  event_type  text not null,
  entity_type text not null,
  entity_id   uuid,
  payload     jsonb not null default '{}'::jsonb,
  source      text not null default 'api' check (source in ('voice','photo','web','api','agent','system')),
  occurred_at timestamptz not null default now(),
  prev_hash   text,
  hash        text not null default ''
);
-- Append-only: no UPDATE/DELETE for anyone (corrections are new events).
create or replace function oneloop.block_event_mutation() returns trigger
  language plpgsql as $$
begin raise exception 'oneloop.event is append-only (no UPDATE/DELETE)'; end $$;
drop trigger if exists trg_event_no_mutation on oneloop.event;
create trigger trg_event_no_mutation before update or delete on oneloop.event
  for each row execute function oneloop.block_event_mutation();
-- Hash chain (md5 is built-in + portable; swap to pgcrypto sha256 if desired).
create or replace function oneloop.event_chain() returns trigger
  language plpgsql as $$
declare prev text;
begin
  select hash into prev from oneloop.event
    where project_id = new.project_id order by occurred_at desc, id desc limit 1;
  new.prev_hash := prev;
  new.hash := md5(coalesce(prev,'') || new.event_type || new.entity_type ||
                  coalesce(new.entity_id::text,'') || new.payload::text || new.occurred_at::text);
  return new;
end $$;
drop trigger if exists trg_event_chain on oneloop.event;
create trigger trg_event_chain before insert on oneloop.event
  for each row execute function oneloop.event_chain();

-- ---------------------------------------------- derived caches (broadcast) ---
create table if not exists oneloop.cost_code_rollup (
  project_id      uuid not null references oneloop.project(id) on delete cascade,
  masterformat_id uuid not null references oneloop.taxonomy_code(id),
  original_budget numeric(14,2) not null default 0,
  revised_budget  numeric(14,2) not null default 0,
  committed_open  numeric(14,2) not null default 0,
  actual          numeric(14,2) not null default 0,
  etc             numeric(14,2) not null default 0,
  fac             numeric(14,2) not null default 0,
  remaining       numeric(14,2) not null default 0,
  headroom        numeric(14,2) not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (project_id, masterformat_id)
);
create table if not exists oneloop.project_financials (
  project_id     uuid primary key references oneloop.project(id) on delete cascade,
  budget         numeric(14,2) not null default 0,
  committed_open numeric(14,2) not null default 0,
  actual         numeric(14,2) not null default 0,
  etc            numeric(14,2) not null default 0,
  fac            numeric(14,2) not null default 0,
  remaining      numeric(14,2) not null default 0,
  headroom       numeric(14,2) not null default 0,
  margin         numeric(14,2) not null default 0,
  updated_at     timestamptz not null default now()
);

-- --------------------------------------------- canonical views (the truth) ---
create or replace view oneloop.v_cost_code_financials as
select
  base.*,
  base.actual + base.committed_open + base.etc                       as fac,
  base.revised_budget - base.actual - base.committed_open            as remaining,
  base.revised_budget - (base.actual + base.committed_open + base.etc) as headroom
from (
  with codes as (
    select project_id, masterformat_id from oneloop.budget_line
    union select co.project_id, col.masterformat_id
      from oneloop.change_order_line col join oneloop.change_order co on co.id = col.change_order_id
    union select project_id, masterformat_id from oneloop.commitment
    union select je.project_id, jl.masterformat_id
      from oneloop.journal_line jl join oneloop.journal_entry je on je.id = jl.entry_id
      where jl.masterformat_id is not null
    union select project_id, masterformat_id from oneloop.etc_override
  ),
  orig as (
    select project_id, masterformat_id, sum(original_amount) amt
    from oneloop.budget_line group by 1,2
  ),
  co_delta as (
    select co.project_id, col.masterformat_id, sum(col.budget_delta) amt
    from oneloop.change_order_line col join oneloop.change_order co on co.id = col.change_order_id
    where co.status = 'approved' group by 1,2          -- ONLY approved COs move budget
  ),
  act as (
    select je.project_id, jl.masterformat_id, sum(jl.debit - jl.credit) amt
    from oneloop.journal_line jl
    join oneloop.journal_entry je on je.id = jl.entry_id
    join oneloop.account a on a.id = jl.account_id
    where a.type = 'expense' and jl.masterformat_id is not null
    group by 1,2
  ),
  comm as (   -- committed open = Σ over commitments of (revised − invoiced), clamped ≥0
    select c.project_id, c.masterformat_id,
           sum(greatest(c.revised - coalesce(inv.invoiced,0), 0)) amt
    from (
      select id, project_id, masterformat_id,
             original_amount + coalesce(
               (select sum(delta) from oneloop.commitment_change cc where cc.commitment_id = commitment.id), 0
             ) as revised
      from oneloop.commitment where status <> 'void'
    ) c
    left join (
      select je.commitment_id, sum(jl.debit - jl.credit) invoiced
      from oneloop.journal_line jl
      join oneloop.journal_entry je on je.id = jl.entry_id
      join oneloop.account a on a.id = jl.account_id
      where a.type = 'expense' and je.commitment_id is not null
      group by je.commitment_id
    ) inv on inv.commitment_id = c.id
    group by 1,2
  ),
  etc_o as (
    select distinct on (project_id, masterformat_id) project_id, masterformat_id, amount
    from oneloop.etc_override order by project_id, masterformat_id, as_of desc
  )
  select
    k.project_id, k.masterformat_id,
    coalesce(o.amt,0)                          as original_budget,
    coalesce(o.amt,0) + coalesce(cd.amt,0)     as revised_budget,
    coalesce(cm.amt,0)                         as committed_open,
    coalesce(ac.amt,0)                         as actual,
    coalesce(eo.amount,
      greatest(coalesce(o.amt,0) + coalesce(cd.amt,0) - coalesce(ac.amt,0) - coalesce(cm.amt,0), 0)
    )                                          as etc
  from codes k
  left join orig    o  on o.project_id=k.project_id  and o.masterformat_id=k.masterformat_id
  left join co_delta cd on cd.project_id=k.project_id and cd.masterformat_id=k.masterformat_id
  left join act     ac on ac.project_id=k.project_id and ac.masterformat_id=k.masterformat_id
  left join comm    cm on cm.project_id=k.project_id and cm.masterformat_id=k.masterformat_id
  left join etc_o   eo on eo.project_id=k.project_id and eo.masterformat_id=k.masterformat_id
) base;

create or replace view oneloop.v_project_financials as
select
  p.id as project_id,
  coalesce(sum(f.revised_budget),0)  as budget,
  coalesce(sum(f.committed_open),0)  as committed_open,
  coalesce(sum(f.actual),0)          as actual,
  coalesce(sum(f.etc),0)             as etc,
  coalesce(sum(f.fac),0)             as fac,
  coalesce(sum(f.remaining),0)       as remaining,
  coalesce(sum(f.headroom),0)        as headroom,
  coalesce(p.contract_revenue, coalesce(sum(f.revised_budget),0)) - coalesce(sum(f.fac),0) as margin
from oneloop.project p
left join oneloop.v_cost_code_financials f on f.project_id = p.id
group by p.id, p.contract_revenue;

-- ------------------------------- recompute the cache to equal the view ------
create or replace function oneloop.recompute_financials(p uuid) returns void
  language plpgsql as $$
begin
  delete from oneloop.cost_code_rollup where project_id = p;
  insert into oneloop.cost_code_rollup
    (project_id, masterformat_id, original_budget, revised_budget, committed_open,
     actual, etc, fac, remaining, headroom, updated_at)
  select project_id, masterformat_id, original_budget, revised_budget, committed_open,
         actual, etc, fac, remaining, headroom, now()
  from oneloop.v_cost_code_financials where project_id = p;

  insert into oneloop.project_financials
    (project_id, budget, committed_open, actual, etc, fac, remaining, headroom, margin, updated_at)
  select project_id, budget, committed_open, actual, etc, fac, remaining, headroom, margin, now()
  from oneloop.v_project_financials where project_id = p
  on conflict (project_id) do update set
    budget=excluded.budget, committed_open=excluded.committed_open, actual=excluded.actual,
    etc=excluded.etc, fac=excluded.fac, remaining=excluded.remaining, headroom=excluded.headroom,
    margin=excluded.margin, updated_at=now();
end $$;

-- Generic cascade trigger: resolve the project from the changed row, recompute.
create or replace function oneloop.trg_recompute() returns trigger
  language plpgsql as $$
declare p uuid;
begin
  if tg_table_name = 'journal_line' then
    select je.project_id into p from oneloop.journal_entry je where je.id = coalesce(new.entry_id, old.entry_id);
  elsif tg_table_name = 'change_order_line' then
    select co.project_id into p from oneloop.change_order co where co.id = coalesce(new.change_order_id, old.change_order_id);
  elsif tg_table_name = 'commitment_change' then
    select c.project_id into p from oneloop.commitment c where c.id = coalesce(new.commitment_id, old.commitment_id);
  else
    p := coalesce(new.project_id, old.project_id);
  end if;
  if p is not null then perform oneloop.recompute_financials(p); end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['budget_line','change_order','change_order_line','commitment',
                           'commitment_change','journal_entry','journal_line','etc_override']
  loop
    execute format('drop trigger if exists trg_recompute on oneloop.%I', t);
    execute format('create trigger trg_recompute after insert or update or delete on oneloop.%I
                    for each row execute function oneloop.trg_recompute()', t);
  end loop;
end $$;

-- ------------------------------------------ reconciliation assertion --------
-- Honest-UI at the data layer: if anything is off, RAISE — never render a
-- number that doesn't reconcile. Run after each cascade + on a periodic job.
create or replace function oneloop.assert_reconcile(p uuid) returns void
  language plpgsql as $$
declare v record; c record; bad int; sum_cc numeric(14,2);
begin
  select count(*) into bad from (
    select jl.entry_id from oneloop.journal_line jl
    join oneloop.journal_entry je on je.id = jl.entry_id
    where je.project_id = p
    group by jl.entry_id having sum(jl.debit) <> sum(jl.credit)
  ) q;
  if bad > 0 then raise exception 'reconcile[%]: % unbalanced journal entries', p, bad; end if;

  select * into v from oneloop.v_project_financials where project_id = p;
  select * into c from oneloop.project_financials   where project_id = p;
  if c is null then raise exception 'reconcile[%]: no project_financials cache row', p; end if;
  if c.budget<>v.budget or c.actual<>v.actual or c.committed_open<>v.committed_open
     or c.etc<>v.etc or c.fac<>v.fac or c.remaining<>v.remaining or c.headroom<>v.headroom or c.margin<>v.margin then
    raise exception 'reconcile[%]: cache != view (cache rem=% view rem=%)', p, c.remaining, v.remaining;
  end if;

  select coalesce(sum(revised_budget),0) into sum_cc from oneloop.v_cost_code_financials where project_id=p;
  if v.budget <> sum_cc then raise exception 'reconcile[%]: project budget % <> Σcost_code %', p, v.budget, sum_cc; end if;

  if v.budget <> v.remaining + v.actual + v.committed_open then
    raise exception 'reconcile[%]: revised(%) <> remaining(%)+actual(%)+committed(%)',
      p, v.budget, v.remaining, v.actual, v.committed_open;
  end if;
end $$;

-- ------------------------------------------------------ RLS (deny-by-default) ---
-- Slice 1: RLS ON with no permissive policy = deny all; the app reads/writes via
-- the service role AFTER app-layer authz (assertProjectWriteAccess), matching the
-- existing pattern. Full lane×lens policies land in the Role-Lenses slice.
do $$
declare t text;
begin
  foreach t in array array['taxonomy_code','project','budget_line','change_order','change_order_line',
                           'account','commitment','commitment_change','journal_entry','journal_line',
                           'etc_override','event','cost_code_rollup','project_financials']
  loop
    execute format('alter table oneloop.%I enable row level security', t);
  end loop;
end $$;

-- ------------------------------------------------- Realtime publication -----
-- Broadcast the caches + event so every open surface updates live. Guarded:
-- the publication only exists on Supabase (skipped on a plain local Postgres).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table oneloop.project_financials; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table oneloop.cost_code_rollup;   exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table oneloop.event;              exception when duplicate_object then null; end;
  end if;
end $$;

-- ------------------------------------------------ app access (public layer) ---
-- PostgREST/supabase-js expose `public` by default; the loop tables stay isolated
-- in `oneloop`. Service-role server code reads this view; RLS on the base table
-- still applies to non-service callers (security_invoker).
create or replace view public.v_oneloop_project_financials with (security_invoker = true) as
  select * from oneloop.project_financials;
