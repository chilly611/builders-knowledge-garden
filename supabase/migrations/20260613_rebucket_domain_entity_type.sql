-- ============================================================================
-- 20260613_rebucket_domain_entity_type — the reversible 474-row domain re-bucket
-- LOOP 2 / Slice B "B4", per docs/code-ingestion-hitl.md §4 + §8 step 4.
--
-- ‼️  NOT APPLIED BY THE AGENT.  Drafted for FOUNDER review, applied by the
--     founder in a supervised window against shared prod (knowledge-gardens-prod
--     / vlezoyalutexenbnzzui) — same posture as 20260612_knowledge_review_events.
--
-- ORDER DEPENDENCY: apply 20260612_knowledge_review_events.sql FIRST. This
--     migration writes one event per touched row; if that table is absent the
--     INSERT (step 4) fails and the whole transaction rolls back (safe, but it
--     won't accomplish the re-bucket). Verified 2026-06-13: that table did not
--     yet exist in prod.
--
-- §9 Q2 — FOUNDER MUST CONFIRM BEFORE APPLYING. This file implements the
--     RECOMMENDED option: change `domain` IN PLACE and leave `status` and every
--     verification column untouched, because re-tagging a routing label is not a
--     substantive content change and must not spend scarce reviewer attention on
--     474 rows whose CONTENT did not change. Trust treatment is unaffected —
--     Option B (shipped, B3) already gates the verified badge on
--     manually_verified_at, so these published-but-unverified rows keep their
--     honest provisional treatment, now in the correct bucket. If instead you
--     want the 474 routed through `review`, do NOT apply this file — say so and
--     it will be re-cut.
--
-- WHAT IT DOES: re-tags the 474 compliance rows whose `domain` drifted, so
--     `domain` becomes a deterministic function of `entity_type`
--     (building_code / code / code_section → codes; permit_requirement →
--     permits), matching src/lib/knowledge/entity-domain.mjs (the same law the
--     ingestion guard now enforces for new rows).
--
-- REVERSIBLE: each row's prior `domain` is captured in
--     metadata.domain_premigration BEFORE the update; the DOWN block restores it.
-- ASSERTED: aborts unless EXACTLY 474 rows match — the live count verified on
--     2026-06-13 (457 building_code + 9 permit_requirement + 7 code_section + 1
--     code). A different count means the corpus drifted; re-verify before running.
-- ============================================================================

BEGIN;

-- 1 · Guard: the affected-row count must be exactly the verified number.
DO $$
DECLARE
  affected int;
BEGIN
  SELECT count(*) INTO affected
  FROM public.knowledge_entities
  WHERE (entity_type IN ('building_code','code','code_section') AND domain <> 'codes')
     OR (entity_type = 'permit_requirement'                    AND domain <> 'permits');
  IF affected <> 474 THEN
    RAISE EXCEPTION
      'B4 re-bucket aborted: expected 474 affected rows, found %. Re-verify the live distribution before running (docs/code-ingestion-hitl.md §4).',
      affected;
  END IF;
END $$;

-- 2 · Capture each affected row's current domain for reversibility. Idempotent:
--     only writes the key where it is not already present, so a re-run after a
--     partial failure never clobbers the original value.
UPDATE public.knowledge_entities
SET metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{domain_premigration}', to_jsonb(domain), true)
WHERE ((entity_type IN ('building_code','code','code_section') AND domain <> 'codes')
    OR (entity_type = 'permit_requirement'                     AND domain <> 'permits'))
  AND NOT (metadata ? 'domain_premigration');

-- 3 · Re-bucket IN PLACE (status + verification columns deliberately untouched),
--     and 4 · emit one append-only semantic event per touched entity (§3).
WITH moved AS (
  UPDATE public.knowledge_entities
  SET domain = CASE WHEN entity_type = 'permit_requirement' THEN 'permits' ELSE 'codes' END
  WHERE (entity_type IN ('building_code','code','code_section') AND domain <> 'codes')
     OR (entity_type = 'permit_requirement'                    AND domain <> 'permits')
  RETURNING id, entity_type, (metadata->>'domain_premigration') AS from_domain, domain AS to_domain
)
INSERT INTO public.knowledge_review_events
  (entity_id, action, actor_kind, actor_id, from_status, to_status, note, source)
SELECT
  m.id,
  'edit',
  'machine',
  NULL,
  NULL,
  NULL,
  format('domain re-bucketed %s → %s (entity_type=%s) by migration 20260613_rebucket_domain_entity_type; routing label only — content, status, and verification unchanged; confirm jurisdiction unchanged',
         m.from_domain, m.to_domain, m.entity_type),
  'migration:20260613_rebucket_domain_entity_type'
FROM moved m;

-- 5 · Post-condition: nothing in a compliance type should remain mis-bucketed.
DO $$
DECLARE
  leftover int;
BEGIN
  SELECT count(*) INTO leftover
  FROM public.knowledge_entities
  WHERE (entity_type IN ('building_code','code','code_section') AND domain <> 'codes')
     OR (entity_type = 'permit_requirement'                    AND domain <> 'permits');
  IF leftover <> 0 THEN
    RAISE EXCEPTION 'B4 re-bucket post-check failed: % compliance rows still mis-bucketed.', leftover;
  END IF;
END $$;

COMMIT;

-- ── DOWN (manual, founder-run if reverting) ────────────────────────────────
-- Restores the pre-migration domain from the captured value and clears the key.
-- The knowledge_review_events rows are append-only and are intentionally LEFT in
-- place as honest history; a revert is itself recorded by re-running step 4 with
-- a reversal note if desired.
--
-- BEGIN;
-- UPDATE public.knowledge_entities
-- SET domain   = metadata->>'domain_premigration',
--     metadata = metadata - 'domain_premigration'
-- WHERE metadata ? 'domain_premigration'
--   AND entity_type IN ('building_code','code','code_section','permit_requirement');
-- COMMIT;
