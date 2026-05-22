-- 2026-05-22b — Round 3 schema for tonight's UI agents.
--
-- Creates: project_members (+ project_role enum), vendors, invoices,
-- invoice_line_items, invoice_payments, signed_documents,
-- signature_events, sub_bids, architect_requests, gc_match_requests.
-- Adds stage_id to project_budget_lines (with CSI->stage backfill).
-- Installs audit trigger on every mutating surface in scope:
--   project_budget_lines, project_rfis, project_change_orders,
--   project_punch_items, project_submittals, signed_documents,
--   signature_events, sub_bids, vendors, invoices.
-- Enables RLS + project-scoped policies on every new table using the
-- same owner | demo-allowlist | demo_project_id template established
-- by 20260522_secauth_rls_lockdown.sql. architect_requests +
-- gc_match_requests additionally permit anon INSERTs (public contact
-- forms) but SELECT is owner-scoped only.
--
-- Pre-flight findings (verified via list_tables / information_schema on 2026-05-22):
--   - audit_log.record_id is uuid NOT NULL. Trigger casts (NEW.id)::uuid.
--     audit_log also has a `source text DEFAULT 'api'` column; trigger
--     writes 'trigger' to distinguish from app-level writes.
--   - command_center_projects.user_id :: text  (confirmed).
--   - pgvector 0.8.0 already installed in `public` (good for
--     ICC-FETCHER agent later — no install needed here).
--   - project_budget_lines columns today: id, project_id, csi_division,
--     description, budgeted, committed, actual_spent, created_at,
--     updated_at. No stage_id — adding below.
--   - The existing /api/v1/invoices/route.ts uses an AIA G702/G703
--     shape (project_name, contractor_info jsonb, application_number,
--     period_from/to, original_contract_sum, net_change_by_orders,
--     total_completed_and_stored, retainage_percent, retainage_amount,
--     total_earned_less_retainage, previous_certificates,
--     current_payment_due, balance_to_finish, version, status with
--     mixed-case labels). The spec's invoices table uses a simpler
--     AR/AP shape. We create a UNION schema that includes BOTH sets of
--     columns so either UI can write; status CHECK accepts both lower
--     and Title case values. Line items + payments tables likewise carry
--     the union of columns used by the route AND the spec.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. project_role enum + project_members
-- ─────────────────────────────────────────────────────────────────────

-- schema-types: project_role enum
--   owner       project owner (commercial dev, homeowner-as-owner)
--   gc          general contractor
--   contractor  a contractor working under the GC
--   teammate    internal team (estimator, PM, foreman on GC payroll)
--   day_hire    1099 day labor
--   specialist  sub-contractor / specialty trade
--   diy         DIY homeowner doing their own work
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_role') THEN
    CREATE TYPE project_role AS ENUM (
      'owner',
      'gc',
      'contractor',
      'teammate',
      'day_hire',
      'specialist',
      'diy'
    );
  END IF;
END$$;

-- schema-types: project_members
--   id            uuid PK
--   project_id    text       — FK to command_center_projects.id (cast text)
--   user_id       uuid       — FK to auth.users.id, cascade on delete
--   project_role  project_role enum
--   invited_by    uuid       — FK to auth.users.id (nullable)
--   invited_at    timestamptz
--   accepted_at   timestamptz (nullable until invite accepted)
--   created_at    timestamptz
-- UNIQUE (project_id, user_id, project_role) — one user can hold the
-- same role on a project once. Different roles allowed (e.g. owner+gc
-- if you're a homeowner GC'ing your own project).
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_role project_role NOT NULL,
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id, project_role)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);

-- ─────────────────────────────────────────────────────────────────────
-- 2. vendors (subcontractor master)
-- ─────────────────────────────────────────────────────────────────────

-- schema-types: vendors
--   id                       uuid PK
--   project_id               text NULLABLE — vendors can be cross-project
--   user_id                  uuid NULLABLE — FK auth.users (when vendor has logged in)
--   legal_name               text NOT NULL
--   dba                      text
--   ein                      text
--   w9_on_file_at            timestamptz — when current W-9 was collected
--   cslb_number              text — CA contractor's license #
--   cslb_classification      text — e.g. 'C-10 Electrical'
--   cslb_expiry              date
--   bond_number              text
--   bond_amount              numeric(12,2)
--   insurance_gl_expiry      date — General Liability cert expiry
--   insurance_wc_expiry      date — Workers Comp cert expiry
--   insurance_auto_expiry    date — Auto policy expiry
--   address_street/city/state/zip
--   phone, email
--   payment_terms            text DEFAULT 'net-30'
--   is_1099_eligible         boolean DEFAULT true
--   created_by               uuid — auth.uid() of whoever onboarded
--   created_at / updated_at  timestamptz
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  legal_name text NOT NULL,
  dba text,
  ein text,
  w9_on_file_at timestamptz,
  cslb_number text,
  cslb_classification text,
  cslb_expiry date,
  bond_number text,
  bond_amount numeric(12,2),
  insurance_gl_expiry date,
  insurance_wc_expiry date,
  insurance_auto_expiry date,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  phone text,
  email text,
  payment_terms text DEFAULT 'net-30',
  is_1099_eligible boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_project ON public.vendors(project_id);
CREATE INDEX IF NOT EXISTS idx_vendors_user ON public.vendors(user_id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. invoices + invoice_line_items + invoice_payments
--
-- UNION schema: contains BOTH the spec's simpler AR/AP shape AND the
-- AIA G702/G703 shape currently used by /api/v1/invoices/route.ts.
-- This lets the existing route keep working and lets new UI agents
-- target a simpler API. status CHECK accepts both lowercase
-- ('draft','sent','partial','paid','void') and titlecase
-- ('Draft','Submitted','Approved','Paid','Disputed') values.
-- ─────────────────────────────────────────────────────────────────────

-- schema-types: invoices
--   id, project_id (text), vendor_id (uuid->vendors), user_id (uuid->auth.users)
--   invoice_number, application_number — text identifiers
--   direction CHECK AR|AP — billed to client vs billed by sub
--   status CHECK across both casings (see above)
--   invoice_date, due_date, period_from, period_to — dates
--   subtotal/tax_amount/total_amount/amount_paid/retainage_amount — simple totals
--   original_contract_sum, net_change_by_orders, total_completed_and_stored,
--     retainage_percent, total_earned_less_retainage, previous_certificates,
--     current_payment_due, balance_to_finish — AIA G702 fields
--   project_name text, contractor_info jsonb — denormalized for PDFs
--   version int — optimistic concurrency for the AIA UI
--   notes text
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id),
  user_id uuid REFERENCES auth.users(id),
  invoice_number text,
  application_number text,
  direction text DEFAULT 'AR' CHECK (direction IN ('AR','AP')),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      -- simple lifecycle
      'draft','sent','partial','paid','void',
      -- AIA G702 lifecycle (what /api/v1/invoices/route.ts emits)
      'Draft','Submitted','Approved','Paid','Disputed'
    )
  ),
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  period_from date,
  period_to date,
  subtotal numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  amount_paid numeric(12,2) DEFAULT 0,
  retainage_amount numeric(12,2) DEFAULT 0,
  -- AIA G702 columns (mirror /api/v1/invoices/route.ts)
  project_name text,
  contractor_info jsonb,
  original_contract_sum numeric(12,2) DEFAULT 0,
  net_change_by_orders numeric(12,2) DEFAULT 0,
  total_completed_and_stored numeric(12,2) DEFAULT 0,
  retainage_percent numeric(6,4) DEFAULT 0.10,
  total_earned_less_retainage numeric(12,2) DEFAULT 0,
  previous_certificates numeric(12,2) DEFAULT 0,
  current_payment_due numeric(12,2) DEFAULT 0,
  balance_to_finish numeric(12,2) DEFAULT 0,
  version int DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_project ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON public.invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- schema-types: invoice_line_items
--   id, invoice_id (cascade)
--   Spec/simple fields:
--     csi_division, description, quantity, unit_price, amount, sort_order, gl_account
--   AIA G703 fields (mirror route.ts):
--     item_number int, scheduled_value, completed_previous,
--     completed_this_period, materials_stored, total_completed,
--     percent_complete, balance_to_finish, retainage_amount
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  csi_division text,
  description text NOT NULL,
  quantity numeric(12,4) DEFAULT 1,
  unit_price numeric(12,2) DEFAULT 0,
  amount numeric(12,2) DEFAULT 0,
  sort_order int DEFAULT 0,
  gl_account text,
  -- AIA G703 columns
  item_number int,
  scheduled_value numeric(12,2) DEFAULT 0,
  completed_previous numeric(12,2) DEFAULT 0,
  completed_this_period numeric(12,2) DEFAULT 0,
  materials_stored numeric(12,2) DEFAULT 0,
  total_completed numeric(12,2) DEFAULT 0,
  percent_complete numeric(6,4) DEFAULT 0,
  balance_to_finish numeric(12,2) DEFAULT 0,
  retainage_amount numeric(12,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON public.invoice_line_items(invoice_id);

-- schema-types: invoice_payments
--   id, invoice_id (cascade)
--   payment_date, amount/amount_paid (alias), method/payment_method, reference_number,
--   notes, recorded_by (auth.uid()), created_at
-- Both `amount` and `amount_paid` exist for the simple+AIA UIs. App code
-- should write to whichever it owns; the other stays NULL.
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(12,2),
  amount_paid numeric(12,2),
  method text,
  payment_method text,
  reference_number text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);

-- ─────────────────────────────────────────────────────────────────────
-- 4. signed_documents + signature_events
-- ─────────────────────────────────────────────────────────────────────

-- schema-types: signed_documents
--   id, project_id (text)
--   document_type text   — 'contract','change_order','lien_waiver_progress_unconditional','sub_bid',...
--   document_id uuid     — id of the underlying record (project_change_orders.id, sub_bids.id, ...)
--   document_hash text   — SHA-256 of the rendered PDF; immutable provenance
--   pdf_url text         — Supabase Storage URL
--   title text
--   status               — pending|signed|rejected|expired|void
--   required_signers jsonb — [{user_id, role, name, email}]
--   created_by uuid      — auth.uid() of the issuer
--   created_at, finalized_at
CREATE TABLE IF NOT EXISTS public.signed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  document_type text NOT NULL,
  document_id uuid,
  document_hash text NOT NULL,
  pdf_url text,
  title text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','signed','rejected','expired','void')),
  required_signers jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  finalized_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_signed_documents_project ON public.signed_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_signed_documents_type ON public.signed_documents(document_type);

-- schema-types: signature_events
--   id, signed_document_id (cascade)
--   signer_user_id uuid    — nullable for outside-the-app signers
--   signer_role text       — 'owner','gc','sub','witness'
--   signer_name text       — display name as captured at signing time
--   signer_email text
--   signature_method       — typed|drawn|docusign|dropbox_sign|documenso
--   signature_data text    — typed name OR base64 drawing OR external service ref
--   ip_address text, user_agent text — non-repudiation envelope
--   signed_at timestamptz
CREATE TABLE IF NOT EXISTS public.signature_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signed_document_id uuid NOT NULL REFERENCES public.signed_documents(id) ON DELETE CASCADE,
  signer_user_id uuid REFERENCES auth.users(id),
  signer_role text NOT NULL,
  signer_name text NOT NULL,
  signer_email text,
  signature_method text NOT NULL DEFAULT 'typed' CHECK (
    signature_method IN ('typed','drawn','docusign','dropbox_sign','documenso')
  ),
  signature_data text,
  ip_address text,
  user_agent text,
  signed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signature_events_doc ON public.signature_events(signed_document_id);

-- ─────────────────────────────────────────────────────────────────────
-- 5. sub_bids
-- ─────────────────────────────────────────────────────────────────────

-- schema-types: sub_bids
--   id, project_id (text)
--   sub_user_id uuid     — the subcontractor who submitted (auth.users)
--   sub_vendor_id uuid   — link to vendors master (nullable)
--   csi_division text, trade_label text
--   scope_of_work text
--   line_items jsonb     — [{description, quantity, unit, unit_price, amount}]
--   subtotal/tax/total numeric(12,2)
--   validity_days int DEFAULT 30
--   cslb_number text     — captured at bid time
--   insurance_certs_attached jsonb — [{type:'GL'|'WC'|'auto', expiry, file_url}]
--   status               — draft|submitted|reviewed|accepted|rejected|withdrawn
--   submitted_at, reviewed_at
--   reviewer_user_id uuid — the GC/PM who reviewed
--   notes text
CREATE TABLE IF NOT EXISTS public.sub_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  sub_user_id uuid NOT NULL REFERENCES auth.users(id),
  sub_vendor_id uuid REFERENCES public.vendors(id),
  csi_division text,
  trade_label text,
  scope_of_work text,
  line_items jsonb,
  subtotal numeric(12,2),
  tax numeric(12,2),
  total numeric(12,2),
  validity_days int DEFAULT 30,
  cslb_number text,
  insurance_certs_attached jsonb,
  status text NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('draft','submitted','reviewed','accepted','rejected','withdrawn')
  ),
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_user_id uuid REFERENCES auth.users(id),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_sub_bids_project ON public.sub_bids(project_id);
CREATE INDEX IF NOT EXISTS idx_sub_bids_sub ON public.sub_bids(sub_user_id);

-- ─────────────────────────────────────────────────────────────────────
-- 6. architect_requests + gc_match_requests
-- ─────────────────────────────────────────────────────────────────────

-- schema-types: architect_requests
--   id, user_id (nullable — anon can submit)
--   project_id text (nullable)
--   contact_name/email/phone — required name+email
--   project_address text
--   project_type — sfr|adu|commercial-ti|remodel  (free text in column)
--   scope_description text
--   jurisdiction text
--   budget_range text, timeline text
--   status — open|in_progress|matched|closed
--   notes text
--   created_at, notified_at
CREATE TABLE IF NOT EXISTS public.architect_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  project_id text,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  project_address text,
  project_type text,
  scope_description text,
  jurisdiction text,
  budget_range text,
  timeline text,
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','matched','closed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  notified_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_architect_requests_user ON public.architect_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_architect_requests_status ON public.architect_requests(status);

-- schema-types: gc_match_requests
--   Same shape as architect_requests but for matching homeowners/owners
--   to GCs. No jurisdiction column (architects care about jurisdiction
--   for permitting; GC match is more about budget/timeline fit).
CREATE TABLE IF NOT EXISTS public.gc_match_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  project_id text,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  project_address text,
  project_type text,
  scope_description text,
  budget_range text,
  timeline text,
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','matched','closed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  notified_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_gc_match_requests_user ON public.gc_match_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gc_match_requests_status ON public.gc_match_requests(status);

-- ─────────────────────────────────────────────────────────────────────
-- 7. Add stage_id to project_budget_lines + CSI->stage backfill
--
-- Stages (existing convention in the app):
--   1 size-up      4 build
--   2 design       5 close
--   3 plan/site
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.project_budget_lines ADD COLUMN IF NOT EXISTS stage_id smallint;

-- Heuristic backfill: every line gets a stage based on its CSI division.
-- Default = 4 (build) for everything not otherwise mapped, including
-- divisions 01-28 (general requirements through electronic safety).
-- Divisions 31-33 (earthwork, exterior improvements, utilities) are
-- typically sitework that lives in stage 3 (plan/site). Contingency
-- and overhead rows (no CSI division or description starts with those
-- words) map to stage 1 (size-up).
UPDATE public.project_budget_lines
SET stage_id = CASE
  WHEN csi_division IS NULL AND (
    description ILIKE '%contingenc%' OR
    description ILIKE '%overhead%'
  ) THEN 1
  WHEN csi_division ~ '^3[1-3]' THEN 3  -- 31xx, 32xx, 33xx — sitework family
  ELSE 4
END
WHERE stage_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_budget_lines_stage ON public.project_budget_lines(stage_id);

-- ─────────────────────────────────────────────────────────────────────
-- 8. Audit trigger
--
-- audit_log shape (verified 2026-05-22):
--   id uuid PK
--   table_name text NOT NULL
--   record_id uuid NOT NULL          ← cast (NEW.id)::uuid carefully
--   action text NOT NULL             ← TG_OP
--   old_data jsonb, new_data jsonb
--   changed_by uuid                  ← auth.uid()
--   changed_at timestamptz DEFAULT now()
--   source text DEFAULT 'api'        ← we write 'trigger' from here
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id uuid;
BEGIN
  -- Every table the trigger is attached to uses `id uuid` as PK, so this
  -- cast is safe. If a future table without a uuid `id` is added, the
  -- INSERT will fail loudly — that's intentional.
  IF TG_OP = 'DELETE' THEN
    v_record_id := (OLD.id)::uuid;
  ELSE
    v_record_id := (NEW.id)::uuid;
  END IF;

  INSERT INTO public.audit_log (
    table_name, record_id, action, old_data, new_data, changed_by, changed_at, source
  )
  VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),                            -- NULL when service_role; OK
    now(),
    'trigger'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to every mutating surface in scope. Each trigger is created
-- idempotently: drop existing, create fresh.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'project_budget_lines',
    'project_rfis',
    'project_change_orders',
    'project_punch_items',
    'project_submittals',
    'signed_documents',
    'signature_events',
    'sub_bids',
    'vendors',
    'invoices'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I_trg ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%I_trg
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn()',
      t, t
    );
  END LOOP;
END$$;

-- ─────────────────────────────────────────────────────────────────────
-- 9. RLS policies on every new table
--
-- Template (matches 20260522_secauth_rls_lockdown.sql):
--   project_id IN (SELECT id::text FROM command_center_projects WHERE user_id = auth.uid()::text)
--   OR project_id IN (<3 demo project uuids>)
--   OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
--
-- Tables without project_id (vendors when project_id IS NULL) get an
-- owner-only fallback via created_by/user_id.
-- ─────────────────────────────────────────────────────────────────────

-- project_members --------------------------------------------------------
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm_scoped_all" ON public.project_members;
CREATE POLICY "pm_scoped_all"
  ON public.project_members
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  );

-- vendors ----------------------------------------------------------------
-- vendors.project_id is nullable (cross-project subs). NULL project_id
-- rows are visible to the creator (created_by = auth.uid()) or the vendor
-- themselves (user_id = auth.uid()).
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_scoped_all" ON public.vendors;
CREATE POLICY "vendors_scoped_all"
  ON public.vendors
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR (project_id IS NOT NULL AND (
      project_id IN (
        SELECT id::text FROM public.command_center_projects
        WHERE user_id = (auth.uid())::text
      )
      OR project_id IN (
        '55730cd3-5225-493d-8b5c-49086d942565',
        'aa11b22c-1111-4d78-aaaa-bbccdd112233',
        'bb22c33d-2222-4d78-bbbb-ccddee223344'
      )
      OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
    ))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR user_id = auth.uid()
    OR (project_id IS NOT NULL AND (
      project_id IN (
        SELECT id::text FROM public.command_center_projects
        WHERE user_id = (auth.uid())::text
      )
      OR project_id IN (
        '55730cd3-5225-493d-8b5c-49086d942565',
        'aa11b22c-1111-4d78-aaaa-bbccdd112233',
        'bb22c33d-2222-4d78-bbbb-ccddee223344'
      )
      OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
    ))
  );

-- invoices ---------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_scoped_all" ON public.invoices;
CREATE POLICY "invoices_scoped_all"
  ON public.invoices
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  )
  WITH CHECK (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  );

-- invoice_line_items -----------------------------------------------------
-- Scoped via parent invoice. EXISTS lookup against invoices honors that
-- table's own policy automatically.
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_line_items_scoped_all" ON public.invoice_line_items;
CREATE POLICY "invoice_line_items_scoped_all"
  ON public.invoice_line_items
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND (
          i.project_id IN (
            SELECT id::text FROM public.command_center_projects
            WHERE user_id = (auth.uid())::text
          )
          OR i.project_id IN (
            '55730cd3-5225-493d-8b5c-49086d942565',
            'aa11b22c-1111-4d78-aaaa-bbccdd112233',
            'bb22c33d-2222-4d78-bbbb-ccddee223344'
          )
          OR i.project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND (
          i.project_id IN (
            SELECT id::text FROM public.command_center_projects
            WHERE user_id = (auth.uid())::text
          )
          OR i.project_id IN (
            '55730cd3-5225-493d-8b5c-49086d942565',
            'aa11b22c-1111-4d78-aaaa-bbccdd112233',
            'bb22c33d-2222-4d78-bbbb-ccddee223344'
          )
          OR i.project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
        )
    )
  );

-- invoice_payments -------------------------------------------------------
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_payments_scoped_all" ON public.invoice_payments;
CREATE POLICY "invoice_payments_scoped_all"
  ON public.invoice_payments
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND (
          i.project_id IN (
            SELECT id::text FROM public.command_center_projects
            WHERE user_id = (auth.uid())::text
          )
          OR i.project_id IN (
            '55730cd3-5225-493d-8b5c-49086d942565',
            'aa11b22c-1111-4d78-aaaa-bbccdd112233',
            'bb22c33d-2222-4d78-bbbb-ccddee223344'
          )
          OR i.project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND (
          i.project_id IN (
            SELECT id::text FROM public.command_center_projects
            WHERE user_id = (auth.uid())::text
          )
          OR i.project_id IN (
            '55730cd3-5225-493d-8b5c-49086d942565',
            'aa11b22c-1111-4d78-aaaa-bbccdd112233',
            'bb22c33d-2222-4d78-bbbb-ccddee223344'
          )
          OR i.project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
        )
    )
  );

-- signed_documents -------------------------------------------------------
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signed_documents_scoped_all" ON public.signed_documents;
CREATE POLICY "signed_documents_scoped_all"
  ON public.signed_documents
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  )
  WITH CHECK (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  );

-- signature_events -------------------------------------------------------
-- Scoped via parent signed_document, OR signer is the caller.
ALTER TABLE public.signature_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signature_events_scoped_all" ON public.signature_events;
CREATE POLICY "signature_events_scoped_all"
  ON public.signature_events
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    signer_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.signed_documents sd
      WHERE sd.id = signed_document_id
        AND (
          sd.project_id IN (
            SELECT id::text FROM public.command_center_projects
            WHERE user_id = (auth.uid())::text
          )
          OR sd.project_id IN (
            '55730cd3-5225-493d-8b5c-49086d942565',
            'aa11b22c-1111-4d78-aaaa-bbccdd112233',
            'bb22c33d-2222-4d78-bbbb-ccddee223344'
          )
          OR sd.project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
        )
    )
  )
  WITH CHECK (
    signer_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.signed_documents sd
      WHERE sd.id = signed_document_id
        AND (
          sd.project_id IN (
            SELECT id::text FROM public.command_center_projects
            WHERE user_id = (auth.uid())::text
          )
          OR sd.project_id IN (
            '55730cd3-5225-493d-8b5c-49086d942565',
            'aa11b22c-1111-4d78-aaaa-bbccdd112233',
            'bb22c33d-2222-4d78-bbbb-ccddee223344'
          )
          OR sd.project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
        )
    )
  );

-- sub_bids ---------------------------------------------------------------
-- A sub can see their OWN bid even if they're not in the GC's project
-- scope. The GC (project owner) sees all bids on their project. Demo
-- allowlist and JWT demo_project_id work the usual way.
ALTER TABLE public.sub_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_bids_scoped_all" ON public.sub_bids;
CREATE POLICY "sub_bids_scoped_all"
  ON public.sub_bids
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    sub_user_id = auth.uid()
    OR project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  )
  WITH CHECK (
    sub_user_id = auth.uid()
    OR project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  );

-- architect_requests -----------------------------------------------------
-- Exception: anon can INSERT (public contact form). SELECT/UPDATE/DELETE
-- restricted to the submitter (user_id = auth.uid()) when authed.
ALTER TABLE public.architect_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "architect_requests_anon_insert" ON public.architect_requests;
CREATE POLICY "architect_requests_anon_insert"
  ON public.architect_requests
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "architect_requests_owner_select" ON public.architect_requests;
CREATE POLICY "architect_requests_owner_select"
  ON public.architect_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "architect_requests_owner_update" ON public.architect_requests;
CREATE POLICY "architect_requests_owner_update"
  ON public.architect_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "architect_requests_owner_delete" ON public.architect_requests;
CREATE POLICY "architect_requests_owner_delete"
  ON public.architect_requests
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- gc_match_requests ------------------------------------------------------
ALTER TABLE public.gc_match_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gc_match_requests_anon_insert" ON public.gc_match_requests;
CREATE POLICY "gc_match_requests_anon_insert"
  ON public.gc_match_requests
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "gc_match_requests_owner_select" ON public.gc_match_requests;
CREATE POLICY "gc_match_requests_owner_select"
  ON public.gc_match_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "gc_match_requests_owner_update" ON public.gc_match_requests;
CREATE POLICY "gc_match_requests_owner_update"
  ON public.gc_match_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "gc_match_requests_owner_delete" ON public.gc_match_requests;
CREATE POLICY "gc_match_requests_owner_delete"
  ON public.gc_match_requests
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;
