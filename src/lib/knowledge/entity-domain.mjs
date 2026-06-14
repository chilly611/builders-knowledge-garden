/**
 * Canonical `entity_type` → `domain` mapping (Builder's Knowledge Garden).
 *
 * `domain` is a routing label that should be a deterministic function of
 * `entity_type`, not a free-text value chosen per ingestion run. Historically the
 * ingestion path hardcoded `domain = "construction"` for every row, which is how
 * 457 `building_code` rows (among others) drifted into the generic `construction`
 * bucket — the default dumping ground. See docs/code-ingestion-hitl.md §4.
 *
 * Scope is deliberate. This map locks the four COMPLIANCE entity types whose
 * mis-bucketing is compliance-critical: a code in the wrong bucket is a
 * findability and trust failure on exactly the rows that matter most. Every other
 * entity_type defaults to `construction` (its current home). Extending the map to
 * the full taxonomy (material → materials, etc.) is a separate, founder-blessed
 * decision — §4 calls it out as "extended to cover every entity_type when
 * implemented" — and is intentionally NOT done here, so this change re-buckets
 * nothing outside the 474 compliance rows the controlled migration targets.
 *
 * Consumed by:
 *   - scripts/seed-code-entities.mjs — derives `domain` for NEWLY-ingested rows.
 *     Existing rows omit `domain` on re-seed (mirroring the status-preservation
 *     guard), so a re-seed never re-buckets the live corpus; correcting existing
 *     rows is the job of the one reversible migration, never a seed side-effect.
 *   - supabase/migrations/20260613_rebucket_domain_entity_type.sql — moves exactly
 *     the rows whose current `domain` disagrees with this map.
 */

/**
 * Compliance entity types with a locked canonical domain. Anything not listed
 * here resolves to {@link DEFAULT_DOMAIN}.
 * @type {Readonly<Record<string, string>>}
 */
export const CANONICAL_ENTITY_DOMAIN = Object.freeze({
  building_code: "codes",
  code: "codes",
  code_section: "codes",
  permit_requirement: "permits",
});

/** Domain assigned to any entity_type not explicitly locked above. */
export const DEFAULT_DOMAIN = "construction";

/**
 * The canonical `domain` for a given `entity_type`. Total function: unknown,
 * null, undefined, and empty all resolve to {@link DEFAULT_DOMAIN}, so a caller
 * can always assign a valid bucket.
 * @param {string | null | undefined} entityType
 * @returns {string}
 */
export function domainForEntityType(entityType) {
  if (!entityType) return DEFAULT_DOMAIN;
  return CANONICAL_ENTITY_DOMAIN[entityType] ?? DEFAULT_DOMAIN;
}
