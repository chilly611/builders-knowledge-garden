/**
 * buildingType — shared inference from a free-text `project_type` to the
 * three-way `BuildingType` enum the stage tools key off.
 *
 * Lifted out of `app/killerapp/stages/size-up/page.tsx` (2026-06-07,
 * fix/context-routing) so the new `useStageProject()` accessor and the
 * Size Up page share ONE copy instead of drifting. Pure + dependency-free
 * (type-only import of `BuildingType`, erased at build).
 */

import type { BuildingType } from '@/lib/specialists/size-up';

export type { BuildingType };

/**
 * Best-effort map of a project's free-text type/scope to a BuildingType.
 * Returns null when nothing matches so callers can fall back to their own
 * default rather than mislabel the project.
 */
export function inferBuildingType(s: string): BuildingType | null {
  const l = s.toLowerCase();
  if (/(office|retail|warehouse|commercial|\bti\b|tenant improvement|restaurant|shop)/.test(l)) return 'commercial';
  if (/(mixed[- ]?use|live[- ]?work)/.test(l)) return 'mixed';
  // Multifamily reads as residential here (the Size Up cost model is the same
  // residential band); the portal layer refines it to its own archetype via
  // `archetypeFor`, which keys off the same multifamily words.
  if (
    /(home|house|farmhouse|adu|residence|residential|dwelling|cabin|bedroom|bath|multi[- ]?family|multifamily|fourplex|four[- ]?plex|duplex|triplex|apartment|condo|townhouse|\d+\s*-?\s*unit)/.test(
      l,
    )
  )
    return 'residential';
  return null;
}
