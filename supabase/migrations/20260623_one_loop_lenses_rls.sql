-- ============================================================================
-- Role Lenses — least-privilege RLS for the One Loop (Owner/GC/Sub/Architect/Lender…)
-- Spec: BKG-Role-Lenses-and-Fact-Provenance-Security.md (§1 deltas, §3 helpers, §4 policies)
-- Stacks on 20260623_one_loop_ledger.sql. Idempotent. Founder-gated apply.
--
-- The three load-bearing denials this enforces:
--   Sub → margin/ledger/other-subs = ∅   ·   Architect → financials = ∅   ·   Owner → cost basis/margin = ∅
-- Partition, don't column-hide: sensitive money lives in tables a lower lane has ZERO access to.
-- ============================================================================

-- ----------------------------------------------------- §1 schema deltas -----
-- project_member: the cross-org Lens binding. The GC's org owns the project;
-- everyone else (sub/architect/owner/lender) joins per project from their OWN org.
create table if not exists oneloop.project_member (
  project_id   uuid not null references oneloop.project(id) on delete cascade,
  user_id      uuid not null,
  lane         text not null check (lane in
                 ('owner','gc','specialty','architect','lender','supplier','equipment','worker','agent')),
  party_org_id uuid,                  -- the org this member represents (the sub/supplier firm)
  status       text not null default 'active' check (status in ('active','revoked')),
  invited_by   uuid,
  created_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists idx_project_member_user on oneloop.project_member(user_id);

alter table oneloop.commitment add column if not exists vendor_org_id uuid;  -- ties a PO/sub to a party org

create table if not exists oneloop.pay_application (   -- sub → GC billing (subs touch THIS, never the ledger)
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references oneloop.project(id) on delete cascade,
  commitment_id uuid not null references oneloop.commitment(id),
  period        daterange,
  amount        numeric(14,2) not null,
  retainage     numeric(14,2) not null default 0,
  status        text not null default 'draft' check (status in ('draft','submitted','approved','paid','rejected')),
  submitted_by  uuid,
  created_at    timestamptz not null default now()
);
create table if not exists oneloop.draw (             -- GC → owner/lender billing
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references oneloop.project(id) on delete cascade,
  number     int not null,
  amount     numeric(14,2) not null,
  status     text not null default 'requested' check (status in ('requested','funded','paid')),
  created_at timestamptz not null default now()
);

-- Relocate the owner's contract value OFF the member-readable project row into a
-- GC/owner-gated table (a sub reading oneloop.project must not learn the contract).
create table if not exists oneloop.project_contract (
  project_id       uuid primary key references oneloop.project(id) on delete cascade,
  contract_revenue numeric(14,2)
);
insert into oneloop.project_contract (project_id, contract_revenue)
  select id, contract_revenue from oneloop.project where contract_revenue is not null
  on conflict (project_id) do nothing;

-- Re-point the project financials view at the gated contract table, THEN drop the column.
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
  coalesce(pc.contract_revenue, coalesce(sum(f.revised_budget),0)) - coalesce(sum(f.fac),0) as margin
from oneloop.project p
left join oneloop.project_contract pc on pc.project_id = p.id
left join oneloop.v_cost_code_financials f on f.project_id = p.id
group by p.id, pc.contract_revenue;

alter table oneloop.project drop column if exists contract_revenue;

-- ------------------------------------------------- §3 RLS helpers (one place) ---
-- security definer + pinned search_path: lets them read project_member without
-- tripping the RLS recursion that a plain function would. auth.uid() is fully
-- qualified so it resolves regardless of search_path.
create schema if not exists app;

create or replace function app.lane(p uuid) returns text
  language sql stable security definer set search_path = oneloop, public as $$
  select lane from oneloop.project_member
  where project_id = p and user_id = auth.uid() and status = 'active' limit 1
$$;

create or replace function app.is_member(p uuid) returns boolean
  language sql stable security definer set search_path = oneloop, public as $$
  select exists (select 1 from oneloop.project_member
    where project_id = p and user_id = auth.uid() and status = 'active')
$$;

create or replace function app.my_commitments(p uuid) returns setof uuid
  language sql stable security definer set search_path = oneloop, public as $$
  select c.id from oneloop.commitment c
  join oneloop.project_member pm on pm.project_id = c.project_id and pm.party_org_id = c.vendor_org_id
  where c.project_id = p and pm.user_id = auth.uid() and pm.status = 'active'
$$;

-- ------------------------------------------------------- §4 the policies -----
alter table oneloop.project_member  enable row level security;
alter table oneloop.project_contract enable row level security;
alter table oneloop.pay_application enable row level security;
alter table oneloop.draw           enable row level security;
-- (the money tables already have RLS enabled by slice 1 with no policy = deny-all;
--  we now add the precise grants.)

-- PROJECT METADATA — members read; GC writes.
drop policy if exists project_sel on oneloop.project;
create policy project_sel on oneloop.project for select using ( app.is_member(id) );
drop policy if exists project_upd on oneloop.project;
create policy project_upd on oneloop.project for update using ( app.lane(id) = 'gc' );

-- CONTRACT VALUE (owner billing) — GC + owner read; GC write. (A sub reading the
-- project row can no longer learn the contract — the column is gone, the value is here.)
drop policy if exists pc_sel on oneloop.project_contract;
create policy pc_sel on oneloop.project_contract for select using ( app.lane(project_id) in ('gc','owner') );
drop policy if exists pc_wr on oneloop.project_contract;
create policy pc_wr  on oneloop.project_contract for all
  using ( app.lane(project_id) = 'gc' ) with check ( app.lane(project_id) = 'gc' );

-- ROSTER — self-visible; GC + owner see the roster; only GC manages.
drop policy if exists pm_sel on oneloop.project_member;
create policy pm_sel on oneloop.project_member for select
  using ( user_id = auth.uid() or app.lane(project_id) in ('gc','owner') );
drop policy if exists pm_ins on oneloop.project_member;
create policy pm_ins on oneloop.project_member for insert with check ( app.lane(project_id) = 'gc' );
drop policy if exists pm_upd on oneloop.project_member;
create policy pm_upd on oneloop.project_member for update using ( app.lane(project_id) = 'gc' );
drop policy if exists pm_del on oneloop.project_member;
create policy pm_del on oneloop.project_member for delete using ( app.lane(project_id) = 'gc' );

-- GC-INTERNAL FINANCIALS — GC ONLY (margin / cost basis / budget live here).
drop policy if exists pf_sel  on oneloop.project_financials;
create policy pf_sel  on oneloop.project_financials for select using ( app.lane(project_id) = 'gc' );
drop policy if exists ccr_sel on oneloop.cost_code_rollup;
create policy ccr_sel on oneloop.cost_code_rollup   for select using ( app.lane(project_id) = 'gc' );
drop policy if exists bl_sel  on oneloop.budget_line;
create policy bl_sel  on oneloop.budget_line        for select using ( app.lane(project_id) = 'gc' );
drop policy if exists co_sel  on oneloop.change_order;
create policy co_sel  on oneloop.change_order       for select using ( app.lane(project_id) = 'gc' );
drop policy if exists etc_sel on oneloop.etc_override;
create policy etc_sel on oneloop.etc_override       for select using ( app.lane(project_id) = 'gc' );
drop policy if exists col_sel on oneloop.change_order_line;
create policy col_sel on oneloop.change_order_line  for select
  using ( exists (select 1 from oneloop.change_order co where co.id = change_order_id and app.lane(co.project_id) = 'gc') );

-- THE LEDGER — GC ONLY. Subs use pay_application; owners use draw.
drop policy if exists je_sel on oneloop.journal_entry;
create policy je_sel on oneloop.journal_entry for select using ( app.lane(project_id) = 'gc' );
drop policy if exists jl_sel on oneloop.journal_line;
create policy jl_sel on oneloop.journal_line for select
  using ( exists (select 1 from oneloop.journal_entry e where e.id = entry_id and app.lane(e.project_id) = 'gc') );
drop policy if exists cc_sel on oneloop.commitment_change;
create policy cc_sel on oneloop.commitment_change for select
  using ( exists (select 1 from oneloop.commitment c where c.id = commitment_id and app.lane(c.project_id) = 'gc') );

-- COMMITMENTS — GC all; the owning sub/supplier sees ONLY their own.
drop policy if exists cmt_sel on oneloop.commitment;
create policy cmt_sel on oneloop.commitment for select
  using ( app.lane(project_id) = 'gc' or id in (select app.my_commitments(project_id)) );

-- PAY APPLICATIONS (sub→GC) — GC all; sub their own; a sub may submit only their own.
drop policy if exists pa_sel on oneloop.pay_application;
create policy pa_sel on oneloop.pay_application for select
  using ( app.lane(project_id) = 'gc' or commitment_id in (select app.my_commitments(project_id)) );
drop policy if exists pa_ins on oneloop.pay_application;
create policy pa_ins on oneloop.pay_application for insert
  with check ( commitment_id in (select app.my_commitments(project_id)) );

-- DRAWS (GC→owner/lender) — GC, owner, lender.
drop policy if exists draw_sel on oneloop.draw;
create policy draw_sel on oneloop.draw for select using ( app.lane(project_id) in ('gc','owner','lender') );

-- AUDIT — GC reads all; everyone else only events they actored. No user insert/update/delete
-- policy → append-only (the slice-1 trigger also hard-blocks UPDATE/DELETE).
drop policy if exists event_sel on oneloop.event;
create policy event_sel on oneloop.event for select using ( app.lane(project_id) = 'gc' or actor_id = auth.uid() );

-- Owner financial view: contract / funded / paid WITHOUT cost or margin.
-- security_invoker → underlying RLS applies (owner sees their project_contract + draws; a sub gets nulls).
create or replace view oneloop.v_owner_financials with (security_invoker = true) as
select p.id as project_id, p.name,
  pc.contract_revenue as contract_value,
  coalesce((select sum(amount) from oneloop.draw d where d.project_id = p.id and d.status in ('funded','paid')),0) as funded_to_date,
  coalesce((select sum(amount) from oneloop.draw d where d.project_id = p.id and d.status = 'paid'),0)             as paid_to_date
from oneloop.project p
left join oneloop.project_contract pc on pc.project_id = p.id;

-- ----------------------------------------------------------------- grants ----
-- Supabase model: grant table privileges to `authenticated`; RLS does the filtering.
-- Guarded so a plain local Postgres (no Supabase roles) doesn't error.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema app, oneloop to authenticated, anon;
    grant execute on function app.lane(uuid), app.is_member(uuid), app.my_commitments(uuid) to authenticated, anon;
    grant select on all tables in schema oneloop to authenticated;          -- RLS gates the ROWS
    grant insert on oneloop.pay_application to authenticated;                -- gated by pa_ins with-check
    grant select on oneloop.v_owner_financials, oneloop.v_project_financials, oneloop.v_cost_code_financials to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema app, oneloop to service_role;
    grant all on all tables in schema oneloop to service_role;
    grant execute on all functions in schema app to service_role;
  end if;
end $$;

