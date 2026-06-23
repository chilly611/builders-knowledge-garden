-- ============================================================================
-- The One Loop — change-a-variable RPCs (the API-first mutation surface)
-- Each mutation: writes to the model → triggers cascade the caches → writes an
-- immutable event → asserts reconciliation → returns the fresh project totals.
-- security definer (writes the isolated oneloop schema) with a pinned empty
-- search_path; every object is fully qualified. Callable via supabase-js .rpc().
-- ============================================================================

-- Post an expense (invoice/payroll). Debits a cost-coded expense account, credits
-- AP — balanced double entry. If p_commitment is set, it draws down that PO.
create or replace function public.oneloop_post_expense(
  p_project    uuid,
  p_code       text,
  p_amount     numeric,
  p_commitment uuid default null,
  p_actor      uuid default null,
  p_memo       text default null,
  p_source     text default 'api'
) returns jsonb
  language plpgsql security definer set search_path = '' as $$
declare v_entry uuid; v_code uuid; v_exp uuid; v_ap uuid; v_org uuid; v_out jsonb;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be > 0'; end if;
  select org_id into v_org from oneloop.project where id = p_project;
  select id into v_code from oneloop.taxonomy_code where system='masterformat' and code = p_code;
  if v_code is null then raise exception 'unknown masterformat code %', p_code; end if;
  select id into v_exp from oneloop.account where type='expense'   and org_id is not distinct from v_org order by code limit 1;
  select id into v_ap  from oneloop.account where type='liability' and org_id is not distinct from v_org order by code limit 1;
  if v_exp is null or v_ap is null then raise exception 'chart of accounts missing expense/liability account'; end if;

  insert into oneloop.journal_entry (project_id, source_type, commitment_id, memo, created_by)
    values (p_project, 'invoice', p_commitment, p_memo, p_actor) returning id into v_entry;
  insert into oneloop.journal_line (entry_id, account_id, masterformat_id, debit, credit) values
    (v_entry, v_exp, v_code, p_amount, 0),
    (v_entry, v_ap,  null,   0,        p_amount);

  insert into oneloop.event (project_id, actor_id, event_type, entity_type, entity_id, payload, source)
    values (p_project, p_actor, 'invoice.posted', 'journal_entry', v_entry,
            jsonb_build_object('code', p_code, 'amount', p_amount, 'commitment_id', p_commitment, 'memo', p_memo),
            p_source);

  perform oneloop.assert_reconcile(p_project);
  select to_jsonb(f.*) into v_out from oneloop.v_project_financials f where f.project_id = p_project;
  return v_out;
end $$;

-- Reverse an entry (the "undo that" beat) — a new balancing entry, never a delete.
create or replace function public.oneloop_reverse_entry(p_entry uuid, p_actor uuid default null)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_new uuid; v_proj uuid; v_out jsonb;
begin
  select project_id into v_proj from oneloop.journal_entry where id = p_entry;
  if v_proj is null then raise exception 'journal entry % not found', p_entry; end if;
  insert into oneloop.journal_entry (project_id, source_type, memo, created_by)
    values (v_proj, 'adjustment', 'reversal of ' || p_entry::text, p_actor) returning id into v_new;
  insert into oneloop.journal_line (entry_id, account_id, masterformat_id, debit, credit)
    select v_new, account_id, masterformat_id, credit, debit   -- swap = reversal
    from oneloop.journal_line where entry_id = p_entry;
  insert into oneloop.event (project_id, actor_id, event_type, entity_type, entity_id, payload, source)
    values (v_proj, p_actor, 'entry.reversed', 'journal_entry', v_new,
            jsonb_build_object('reversed_entry', p_entry), 'api');
  perform oneloop.assert_reconcile(v_proj);
  select to_jsonb(f.*) into v_out from oneloop.v_project_financials f where f.project_id = v_proj;
  return v_out;
end $$;

-- Approve a change order (the only thing that moves revised budget).
create or replace function public.oneloop_approve_change_order(p_co uuid, p_actor uuid default null)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_proj uuid; v_out jsonb;
begin
  update oneloop.change_order set status='approved', approved_by=p_actor, approved_at=now()
    where id = p_co returning project_id into v_proj;
  if v_proj is null then raise exception 'change order % not found', p_co; end if;
  insert into oneloop.event (project_id, actor_id, event_type, entity_type, entity_id, payload, source)
    values (v_proj, p_actor, 'co.approved', 'change_order', p_co, '{}'::jsonb, 'api');
  perform oneloop.assert_reconcile(v_proj);
  select to_jsonb(f.*) into v_out from oneloop.v_project_financials f where f.project_id = v_proj;
  return v_out;
end $$;

-- Set an estimate-to-complete override for a cost code.
create or replace function public.oneloop_set_etc(p_project uuid, p_code text, p_amount numeric, p_actor uuid default null)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_code uuid; v_out jsonb;
begin
  select id into v_code from oneloop.taxonomy_code where system='masterformat' and code = p_code;
  if v_code is null then raise exception 'unknown masterformat code %', p_code; end if;
  insert into oneloop.etc_override (project_id, masterformat_id, amount, created_by)
    values (p_project, v_code, p_amount, p_actor);
  insert into oneloop.event (project_id, actor_id, event_type, entity_type, entity_id, payload, source)
    values (p_project, p_actor, 'etc.set', 'etc_override', null,
            jsonb_build_object('code', p_code, 'amount', p_amount), 'api');
  perform oneloop.assert_reconcile(p_project);
  select to_jsonb(f.*) into v_out from oneloop.v_project_financials f where f.project_id = p_project;
  return v_out;
end $$;

-- The live picture (read), reconciliation-checked. Returns project totals + per-code rows.
create or replace function public.oneloop_picture(p_project uuid)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_out jsonb;
begin
  perform oneloop.assert_reconcile(p_project);
  select jsonb_build_object(
    'project',    (select to_jsonb(f.*) from oneloop.v_project_financials f where f.project_id = p_project),
    'cost_codes', (select coalesce(jsonb_agg(to_jsonb(c.*) order by c.masterformat_id), '[]'::jsonb)
                     from oneloop.v_cost_code_financials c where c.project_id = p_project)
  ) into v_out;
  return v_out;
end $$;

-- Grants (guarded — these roles only exist on Supabase, not local Postgres).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema oneloop to service_role;
    grant execute on function
      public.oneloop_post_expense(uuid,text,numeric,uuid,uuid,text,text),
      public.oneloop_reverse_entry(uuid,uuid),
      public.oneloop_approve_change_order(uuid,uuid),
      public.oneloop_set_etc(uuid,text,numeric,uuid),
      public.oneloop_picture(uuid)
    to service_role;
    grant select on public.v_oneloop_project_financials to service_role;
  end if;
end $$;
