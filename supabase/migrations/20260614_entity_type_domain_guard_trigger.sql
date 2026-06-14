-- ============================================================================
-- 20260614_entity_type_domain_guard_trigger — DB backstop for the domain↔entity_type
-- invariant. LOOP 2 / Slice B "B4", the §4 "defense in depth" guard (the second
-- half of §8 step 4; the first half is the application guard in
-- src/lib/knowledge/entity-domain.mjs, shipped in this same lane).
--
-- ‼️  NOT APPLIED BY THE AGENT.  Drafted for FOUNDER review, applied by the
--     founder in a supervised window against shared prod (knowledge-gardens-prod
--     / vlezoyalutexenbnzzui) — same posture as the other Slice B migrations.
--
-- ORDER DEPENDENCY: apply this AFTER 20260613_rebucket_domain_entity_type.sql.
--     The re-bucket migration captures each row's prior domain and updates in
--     place; running the coercing trigger first would interfere with that
--     capture/update. Once the corpus is already canonical, this trigger is a
--     no-op on existing rows and only constrains FUTURE writes.
--
-- WHY: the application guard derives `domain` from `entity_type` for the one
--     live write path (the seed script). This trigger is the backstop for any
--     path that bypasses the application — a manual SQL fix, a future ingestion
--     pipeline, an admin tool — so the compliance buckets (codes / permits)
--     cannot silently drift again. §4: "A pure CHECK can't reference another
--     table, so this is a trigger."
--
-- SEMANTICS — COERCE, not reject (founder may flip to reject). For an
--     entity_type listed in entity_type_domain_map, a write whose `domain`
--     disagrees is silently corrected to the canonical value (and a NOTICE is
--     raised for visibility). Coercing keeps the data correct without blocking a
--     legitimate write; the map mirrors src/lib/knowledge/entity-domain.mjs.
--     entity_types NOT in the map are unconstrained (default 'construction'
--     domain stands) — matching the deliberately narrow compliance scope.
-- ============================================================================

BEGIN;

-- 1 · The canonical map as data (mirrors entity-domain.mjs). Owner-managed
--     (§6 "Manage the entity_type → domain map" is an admin capability).
CREATE TABLE IF NOT EXISTS public.entity_type_domain_map (
  entity_type      text PRIMARY KEY,
  canonical_domain text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.entity_type_domain_map (entity_type, canonical_domain) VALUES
  ('building_code',      'codes'),
  ('code',               'codes'),
  ('code_section',       'codes'),
  ('permit_requirement', 'permits')
ON CONFLICT (entity_type) DO UPDATE SET canonical_domain = EXCLUDED.canonical_domain;

-- 2 · The trigger function: coerce a mapped entity_type's domain to canonical.
CREATE OR REPLACE FUNCTION public.enforce_entity_type_domain()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  canonical text;
BEGIN
  SELECT canonical_domain INTO canonical
  FROM public.entity_type_domain_map
  WHERE entity_type = NEW.entity_type;

  IF canonical IS NOT NULL AND NEW.domain IS DISTINCT FROM canonical THEN
    RAISE NOTICE 'entity_type=% requires domain=% (was %); coercing (HITL spec §4 backstop).',
      NEW.entity_type, canonical, NEW.domain;
    NEW.domain := canonical;
  END IF;
  RETURN NEW;
END;
$$;

-- 3 · Fire on every write to knowledge_entities.
DROP TRIGGER IF EXISTS trg_enforce_entity_type_domain ON public.knowledge_entities;
CREATE TRIGGER trg_enforce_entity_type_domain
  BEFORE INSERT OR UPDATE ON public.knowledge_entities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_entity_type_domain();

COMMENT ON TABLE public.entity_type_domain_map IS
  'Canonical entity_type → domain map enforced by trg_enforce_entity_type_domain (HITL spec §4). Mirrors src/lib/knowledge/entity-domain.mjs; owner-managed.';

COMMIT;

-- ── DOWN (manual, founder-run if reverting) ────────────────────────────────
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_enforce_entity_type_domain ON public.knowledge_entities;
-- DROP FUNCTION IF EXISTS public.enforce_entity_type_domain();
-- DROP TABLE IF EXISTS public.entity_type_domain_map;
-- COMMIT;
