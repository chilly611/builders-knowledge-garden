-- Marin Farmhouse demo seed for the One Loop — reconciles to the spec's canon:
--   Budget $1,650,000 · Actual $312,000 · Committed $186,000 · ETC $805,000
--   → FAC $1,303,000 · Remaining $1,152,000 · Headroom/Margin $347,000
-- (CLAUDE.md project id 55730cd3-…; idempotent-ish — run on a fresh DB.)
begin;

insert into oneloop.project (id, org_id, name, stage, contract_revenue, cost_budget)
values ('55730cd3-5225-493d-8b5c-49086d942565', null, 'Modern Farmhouse Marin', 'build', 1650000.00, 1650000.00)
on conflict (id) do nothing;

-- chart of accounts (org-null for the demo)
insert into oneloop.account (code, name, type) values
  ('5000','Construction Costs','expense'),
  ('2000','Accounts Payable','liability'),
  ('1000','Cash','asset'),
  ('4000','Contract Revenue','revenue')
on conflict do nothing;

-- cost codes (MasterFormat)
insert into oneloop.taxonomy_code (system, code, title) values
  ('masterformat','03 30 00','Cast-in-Place Concrete'),
  ('masterformat','06 10 00','Rough Carpentry'),
  ('masterformat','09 00 00','Finishes')
on conflict (system, code) do nothing;

do $$
declare
  pid uuid := '55730cd3-5225-493d-8b5c-49086d942565';
  c_concrete uuid; c_framing uuid; c_finish uuid;
  exp uuid; ap uuid; cm uuid; je uuid;
begin
  select id into c_concrete from oneloop.taxonomy_code where code='03 30 00';
  select id into c_framing  from oneloop.taxonomy_code where code='06 10 00';
  select id into c_finish   from oneloop.taxonomy_code where code='09 00 00';
  select id into exp from oneloop.account where code='5000';
  select id into ap  from oneloop.account where code='2000';

  -- Budget (revised = original; no approved COs yet). Σ = 1,650,000
  insert into oneloop.budget_line (project_id, masterformat_id, original_amount, baselined_at) values
    (pid, c_concrete, 650000, now()), (pid, c_framing, 600000, now()), (pid, c_finish, 400000, now());

  -- Commitments (open, not yet invoiced). Σ committed_open = 186,000
  insert into oneloop.commitment (project_id, masterformat_id, vendor_name, kind, original_amount) values
    (pid, c_concrete,'Bay Concrete Co','subcontract',100000),
    (pid, c_framing, 'Marin Framing',  'subcontract', 60000),
    (pid, c_finish,  'North Bay Finish','po',          26000);

  -- Actuals (expense debit / AP credit). Σ actual = 312,000
  insert into oneloop.journal_entry (project_id, source_type, memo) values (pid,'invoice','Concrete pours to date') returning id into je;
  insert into oneloop.journal_line (entry_id, account_id, masterformat_id, debit, credit) values (je,exp,c_concrete,200000,0),(je,ap,null,0,200000);
  insert into oneloop.journal_entry (project_id, source_type, memo) values (pid,'invoice','Framing labor + lumber') returning id into je;
  insert into oneloop.journal_line (entry_id, account_id, masterformat_id, debit, credit) values (je,exp,c_framing,100000,0),(je,ap,null,0,100000);
  insert into oneloop.journal_entry (project_id, source_type, memo) values (pid,'invoice','Finish deposit') returning id into je;
  insert into oneloop.journal_line (entry_id, account_id, masterformat_id, debit, credit) values (je,exp,c_finish,12000,0),(je,ap,null,0,12000);

  -- ETC overrides (the one inferred input). Σ etc = 805,000
  insert into oneloop.etc_override (project_id, masterformat_id, amount) values
    (pid, c_concrete, 300000), (pid, c_framing, 350000), (pid, c_finish, 155000);

  -- opening event + cache
  insert into oneloop.event (project_id, event_type, entity_type, entity_id, payload, source)
    values (pid,'project.seeded','project',pid, jsonb_build_object('demo','marin'),'system');
  perform oneloop.recompute_financials(pid);
  perform oneloop.assert_reconcile(pid);
end $$;

commit;
