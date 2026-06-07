/**
 * projectToolData — per-project data for the stage tools that take a data
 * prop (TeamRoster, PermitsList, MaterialsCSI), keyed off useStageProject().
 *
 * fix/context-routing (2026-06-07). These tools previously rendered generic
 * John-Doe / zero-cost defaults regardless of the open project, contradicting
 * the stage header. Now:
 *   - Canonical Marin demo → its REAL cast / permits / material costs (the
 *     seed data that existed but was never wired). Numbers derive from the
 *     canonical seed (MARIN_TEAM / MARIN_BUDGET_LINES) — no mirror constants.
 *   - Any other project    → `undefined`, so the component falls back to its
 *     own generic default. Crucially, a second project NEVER shows Marin's
 *     cast/permits/materials — which is what proves the routing.
 *
 * Component prop shapes are imported type-only (erased at build) so this
 * stays a dependency-light data module.
 */

import type { TeamMember } from '@/components/TeamRoster';
import type { Permit } from '@/components/PermitsList';
import type { CSIDivision } from '@/components/MaterialsCSI';
import type { StageProject } from '@/lib/hooks/useStageProject';
import { MARIN_TEAM, MARIN_BUDGET_LINES } from '@/lib/seed-data/marin-farmhouse';

// ── Marin cast (strip the optional `company` field down to TeamMember) ──
const MARIN_TEAM_ROSTER: TeamMember[] = MARIN_TEAM.map(
  ({ id, name, trade, status, contact }) => ({ id, name, trade, status, contact }),
);

// ── Marin permits — Marin County AHJ track, aligned with the attention items ──
const MARIN_PERMITS: Permit[] = [
  { id: 'marin-building', name: 'Marin County building permit', status: 'approved', deadline: '2026-03-18' },
  { id: 'marin-foundation-insp', name: 'Foundation / setback inspection', status: 'approved', deadline: '2026-05-15' },
  { id: 'marin-framing-insp', name: 'Framing inspection', status: 'in_progress', deadline: '2026-07-08' },
  { id: 'marin-title24', name: 'Title 24 energy compliance', status: 'not_started', deadline: '2026-08-01' },
];

// ── Marin CSI divisions — real costs pulled from the canonical budget lines ──
const lineAmount = (id: string): number =>
  MARIN_BUDGET_LINES.find((l) => l.id === id)?.amount ?? 0;

const MARIN_CSI_DIVISIONS: CSIDivision[] = [
  { code: '03', name: 'Concrete', estimated_qty: 1, unit: 'lot', cost: lineAmount('marin-foundation') },
  { code: '06', name: 'Wood & Framing', estimated_qty: 1, unit: 'lot', cost: lineAmount('marin-framing-labor') + lineAmount('marin-framing-mat') },
  { code: '07', name: 'Thermal & Moisture (roofing/siding)', estimated_qty: 1, unit: 'lot', cost: lineAmount('marin-roofing') + lineAmount('marin-siding') },
  { code: '08', name: 'Openings (windows & doors)', estimated_qty: 1, unit: 'lot', cost: lineAmount('marin-windows') },
  { code: '09', name: 'Finishes (interior + drywall)', estimated_qty: 1, unit: 'lot', cost: lineAmount('marin-finishes') + lineAmount('marin-drywall') },
  { code: '22', name: 'Plumbing', estimated_qty: 1, unit: 'lot', cost: lineAmount('marin-plumbing') },
  { code: '23', name: 'HVAC', estimated_qty: 1, unit: 'lot', cost: lineAmount('marin-hvac') },
  { code: '26', name: 'Electrical', estimated_qty: 1, unit: 'lot', cost: lineAmount('marin-electrical') },
];

/** Team roster for the active project (Marin cast, else generic default). */
export function teamForProject(sp: StageProject): TeamMember[] | undefined {
  return sp.isCanonicalDemo ? MARIN_TEAM_ROSTER : undefined;
}

/** Required permits for the active project (Marin AHJ set, else generic default). */
export function permitsForProject(sp: StageProject): Permit[] | undefined {
  return sp.isCanonicalDemo ? MARIN_PERMITS : undefined;
}

/** CSI material breakdown for the active project (real Marin costs, else generic). */
export function materialsForProject(sp: StageProject): CSIDivision[] | undefined {
  return sp.isCanonicalDemo ? MARIN_CSI_DIVISIONS : undefined;
}
