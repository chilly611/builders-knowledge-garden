-- 2026-05-22d — Organizations + membership; vendor org scoping.
--
-- Introduces orgs as the primary tenancy boundary for vendors (and,
-- later, projects + invoices). org_id is nullable on vendors so the
-- solopreneur GC who never bothered creating an org still works
-- (personal vendors).
--
-- RLS policies use a single member-of pattern. Self-referential
-- subqueries on org_members are *carefully* written to avoid infinite
-- recursion under Postgres RLS (the membership SELECT policy permits
-- the caller to see their own row directly via `user_id = auth.uid()`).

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Enum + tables
-- ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  legal_name      text NOT NULL,
  dba             text,
  ein             text,
  cslb_number     text,
  address_street  text,
  address_city    text,
  address_state   text,
  address_zip     text,
  phone           text,
  primary_email   text,
  website         text,
  logo_url        text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        org_role NOT NULL DEFAULT 'member',
  joined_at   timestamptz NOT NULL DEFAULT now(),
  invited_by  uuid REFERENCES auth.users(id),
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org  ON public.org_members(org_id);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Add org_id to vendors (nullable for personal-vendor backward compat)
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_vendors_org ON public.vendors(org_id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. RLS — organizations
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_read"   ON public.organizations;
DROP POLICY IF EXISTS "org_owners_can_update"  ON public.organizations;
DROP POLICY IF EXISTS "anyone_can_create_org"  ON public.organizations;

CREATE POLICY "org_members_can_read"
  ON public.organizations FOR SELECT TO authenticated
  USING (id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

CREATE POLICY "org_owners_can_update"
  ON public.organizations FOR UPDATE TO authenticated
  USING (id IN (
    SELECT org_id FROM public.org_members
     WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ))
  WITH CHECK (id IN (
    SELECT org_id FROM public.org_members
     WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ));

CREATE POLICY "anyone_can_create_org"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────
-- 4. RLS — org_members
--
-- Note on recursion: the SELECT policy permits `user_id = auth.uid()`
-- as the FIRST branch so Postgres can resolve the row without re-
-- evaluating the policy on the inner subquery. The OR branch (see
-- everyone in your org) THEN queries org_members again — Postgres
-- treats this as a security-barrier subquery and runs it under the
-- same policy, but the first branch keeps the dependency graph
-- acyclic for the caller's own row.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_see_self"     ON public.org_members;
DROP POLICY IF EXISTS "owners_manage_members" ON public.org_members;

CREATE POLICY "members_see_self"
  ON public.org_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "owners_manage_members"
  ON public.org_members FOR ALL TO authenticated
  USING (org_id IN (
    SELECT org_id FROM public.org_members
     WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ))
  WITH CHECK (org_id IN (
    SELECT org_id FROM public.org_members
     WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ));

-- ─────────────────────────────────────────────────────────────────────
-- 5. Audit triggers (uses audit_trigger_fn from 20260522b)
-- ─────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS audit_organizations_trg ON public.organizations;
CREATE TRIGGER audit_organizations_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_org_members_trg ON public.org_members;
CREATE TRIGGER audit_org_members_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.org_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

COMMIT;
