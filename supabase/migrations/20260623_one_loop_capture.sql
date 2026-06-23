-- ============================================================================
-- Capture → ledger (One-Loop §2.10). Raw omni-modal field input + provenance, and
-- the atomic RPC that turns an (already AI-structured) capture into a persisted
-- record that — when it's an expense — posts to the double-entry ledger and links
-- the resulting event back to its capture. Stacks on 20260623_one_loop_ledger.sql.
-- The AI structuring itself lives in Node (src/lib/capture/*), NOT here, so models
-- swap without a migration.
-- ============================================================================

create table if not exists oneloop.capture (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references oneloop.project(id) on delete cascade,
  actor_id      uuid,
  kind          text not null check (kind in ('voice','photo','video','text','file','sketch','cad','blueprint')),
  storage_url   text,
  transcript    text,
  parsed_result jsonb,                         -- the structured record (provenance: model, confidence)
  status        text not null default 'received'
                  check (status in ('received','structured','posted','unsupported','failed')),
  mime_type     text,
  client_ref    text,                          -- client correlation + bulk-resend idempotency
  created_at    timestamptz not null default now()   -- auto date/time
);
-- A re-sent capture (offline queue flush) logs once.
create unique index if not exists uq_capture_client_ref on oneloop.capture(project_id, client_ref)
  where client_ref is not null;

alter table oneloop.capture enable row level security;   -- deny-by-default; lane×lens policy lands with the deferred tables

alter table oneloop.event add column if not exists capture_id uuid references oneloop.capture(id);

-- Internal: post an expense linked to a capture (no reconcile here; caller reconciles once).
create or replace function oneloop.post_expense_internal(
  p_project uuid, p_code text, p_amount numeric, p_actor uuid, p_memo text, p_source text, p_capture_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_entry uuid; v_code uuid; v_exp uuid; v_ap uuid; v_org uuid;
begin
  select org_id into v_org from oneloop.project where id = p_project;
  select id into v_code from oneloop.taxonomy_code where system='masterformat' and code = p_code;
  if v_code is null then raise exception 'unknown masterformat code %', p_code; end if;
  select id into v_exp from oneloop.account where type='expense'   and org_id is not distinct from v_org order by code limit 1;
  select id into v_ap  from oneloop.account where type='liability' and org_id is not distinct from v_org order by code limit 1;
  if v_exp is null or v_ap is null then raise exception 'chart of accounts missing expense/liability account'; end if;
  insert into oneloop.journal_entry (project_id, source_type, memo, created_by)
    values (p_project, 'invoice', p_memo, p_actor) returning id into v_entry;
  insert into oneloop.journal_line (entry_id, account_id, masterformat_id, debit, credit) values
    (v_entry, v_exp, v_code, p_amount, 0), (v_entry, v_ap, null, 0, p_amount);
  insert into oneloop.event (project_id, actor_id, event_type, entity_type, entity_id, payload, source, capture_id)
    values (p_project, p_actor, 'invoice.posted', 'journal_entry', v_entry,
            jsonb_build_object('code', p_code, 'amount', p_amount, 'from_capture', p_capture_id), p_source, p_capture_id);
  return v_entry;
end $$;

-- Public: ingest one structured capture. Persists it; if it's an expense, posts to the
-- ledger + reconciles; returns the capture id, status, and fresh project totals.
create or replace function public.oneloop_ingest_capture(
  p_project uuid, p_kind text, p_storage_url text, p_transcript text,
  p_category text, p_cost_code text, p_amount numeric, p_vendor text,
  p_summary text, p_occurred_on date, p_confidence numeric,
  p_actor uuid, p_client_ref text, p_model text, p_mime_type text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_status text; v_existing_status text; v_posted boolean := false; v_fin jsonb; v_parsed jsonb;
begin
  if p_project is null then raise exception 'project required'; end if;

  if p_client_ref is not null then
    select id, status into v_id, v_existing_status from oneloop.capture
      where project_id = p_project and client_ref = p_client_ref;
    if v_id is not null then
      return jsonb_build_object('capture_id', v_id, 'status', v_existing_status, 'idempotent', true);
    end if;
  end if;

  v_parsed := jsonb_build_object('category', p_category, 'cost_code', p_cost_code, 'amount', p_amount,
    'vendor', p_vendor, 'occurred_on', p_occurred_on, 'summary', p_summary, 'confidence', p_confidence, 'model', p_model);
  v_status := case when p_kind in ('voice','photo') then 'structured' else 'unsupported' end;

  insert into oneloop.capture (project_id, actor_id, kind, storage_url, transcript, parsed_result, status, mime_type, client_ref)
    values (p_project, p_actor, p_kind, p_storage_url, p_transcript, v_parsed, v_status, p_mime_type, p_client_ref)
    returning id into v_id;

  if v_status = 'structured' and p_category = 'expense' and p_amount is not null and p_amount > 0 and p_cost_code is not null then
    perform oneloop.post_expense_internal(p_project, p_cost_code, p_amount, p_actor, coalesce(p_summary,'field capture'), p_kind, v_id);
    v_posted := true; v_status := 'posted';
    update oneloop.capture set status = 'posted' where id = v_id;
    perform oneloop.assert_reconcile(p_project);
    select to_jsonb(f.*) into v_fin from oneloop.v_project_financials f where f.project_id = p_project;
  end if;

  return jsonb_build_object('capture_id', v_id, 'status', v_status, 'category', p_category, 'posted', v_posted, 'financials', v_fin);
end $$;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.oneloop_ingest_capture(uuid,text,text,text,text,text,numeric,text,text,date,numeric,uuid,text,text,text) to service_role;
    grant select, insert, update on oneloop.capture to service_role;
  end if;
end $$;
