/**
 * Budget-DNA — turning a phase list into a week timeline.
 * =======================================================
 *
 * The ribbon's x-axis is project start → substantial completion, measured in
 * weeks. `schedulePhases()` walks a phase list and assigns each phase an
 * absolute [startWeek, endWeek), honoring `parallelGroup` exactly the way
 * `computeSchedule()` (the Plan-stage drag-drop) does — a run of phases that
 * share a group starts together and the group advances by max(weeks), not the
 * sum. `lineToTimeWindow()` then maps a budget line onto the week range where
 * that spend actually lands, so framing lumber piles up early-left and interior
 * finishes pile up late-right — the silhouette the ribbon is meant to show.
 *
 * Decoupled from the Marin seed on purpose: this module takes any
 * structurally-compatible phase list. The canonical Marin curve comes from
 * passing `MARIN_PLAN_PHASES`; a project with no schedule of its own falls back
 * to `DEFAULT_BUILD_PHASES` below (a generic residential sequence — no project
 * names baked in).
 */

export interface PhaseInput {
  id: string;
  name: string;
  trade: string;
  /** Sequential duration in weeks if run on its own. */
  weeks: number;
  /** Phases sharing a non-null group run concurrently (count once, as max). */
  parallelGroup: string | null;
}

export interface ScheduledPhase extends PhaseInput {
  startWeek: number;
  endWeek: number;
}

/** A week span [start, end) on the project timeline. */
export interface WeekWindow {
  start: number;
  end: number;
}

/**
 * Generic residential build sequence used when a project carries no phases of
 * its own. Mirrors the standard trade order; intentionally project-agnostic.
 */
export const DEFAULT_BUILD_PHASES: PhaseInput[] = [
  { id: 'site-prep', name: 'Site prep & excavation', trade: 'Sitework', weeks: 3, parallelGroup: null },
  { id: 'foundation', name: 'Foundation & concrete', trade: 'Concrete', weeks: 4, parallelGroup: null },
  { id: 'framing', name: 'Framing', trade: 'Carpentry', weeks: 10, parallelGroup: null },
  { id: 'dry-in', name: 'Roofing & dry-in', trade: 'Roofing', weeks: 3, parallelGroup: null },
  { id: 'rough-elec', name: 'Rough electrical', trade: 'Electrical', weeks: 3, parallelGroup: 'mep' },
  { id: 'rough-plumb', name: 'Rough plumbing', trade: 'Plumbing', weeks: 3, parallelGroup: 'mep' },
  { id: 'rough-hvac', name: 'Rough HVAC', trade: 'Mechanical', weeks: 2, parallelGroup: 'mep' },
  { id: 'insul-drywall', name: 'Insulation & drywall', trade: 'Drywall', weeks: 4, parallelGroup: null },
  { id: 'finishes', name: 'Interior finishes', trade: 'Finish carpentry', weeks: 6, parallelGroup: null },
  { id: 'exterior', name: 'Exterior siding & landscape', trade: 'Exterior', weeks: 4, parallelGroup: 'exterior' },
];

/**
 * Assign absolute week offsets to a phase list. A parallel group starts at the
 * group's common start and the timeline advances by the longest phase in it.
 */
export function schedulePhases(phases: PhaseInput[]): ScheduledPhase[] {
  const out: ScheduledPhase[] = [];
  let cursor = 0;
  let i = 0;
  while (i < phases.length) {
    const group = phases[i].parallelGroup;
    if (group) {
      let runMax = 0;
      let j = i;
      while (j < phases.length && phases[j].parallelGroup === group) {
        out.push({ ...phases[j], startWeek: cursor, endWeek: cursor + phases[j].weeks });
        runMax = Math.max(runMax, phases[j].weeks);
        j++;
      }
      cursor += runMax;
      i = j;
    } else {
      out.push({ ...phases[i], startWeek: cursor, endWeek: cursor + phases[i].weeks });
      cursor += phases[i].weeks;
      i++;
    }
  }
  return out;
}

/** Total schedule length in weeks (last phase end). Always ≥ 1. */
export function totalScheduleWeeks(scheduled: ScheduledPhase[]): number {
  return Math.max(1, ...scheduled.map((p) => p.endWeek));
}

/**
 * Per-line time placement. Keyword rules map a line onto the phase(s) where its
 * spend lands; two synthetic windows handle the money that doesn't sit on a
 * single phase:
 *   - preroll    → pre-construction soft costs (permits, design): weeks 0–2.
 *   - continuous → general conditions / supervision: the whole schedule.
 * First match wins; order matters (trade terms before generic "finish").
 */
const PHASE_RULES: ReadonlyArray<[RegExp, string[] | 'preroll' | 'continuous']> = [
  [/permit|impact fee|school fee|architect|engineer|design/i, 'preroll'],
  [/general conditions|supervision|overhead|\bgc\b/i, 'continuous'],
  [/excavat|grading|clearing|site prep|demolition|\bdemo\b|earthwork/i, ['site-prep']],
  [/crane|equipment rental|scaffold/i, ['site-prep', 'foundation']],
  [/foundation|concrete|slab|footing|rebar|stem ?wall/i, ['foundation']],
  [/framing|lumber|sheathing|carpentry|truss|joist|\bstud/i, ['framing']],
  [/roof|dry.?in|weatherproof/i, ['dry-in']],
  [/window|exterior door|glazing/i, ['dry-in']],
  [/siding|stucco|cladding|exterior siding/i, ['exterior']],
  [/electric/i, ['rough-elec']],
  [/\bplumb/i, ['rough-plumb']],
  [/hvac|mechanical|ductwork|\bduct\b/i, ['rough-hvac']],
  [/insulation|drywall/i, ['insul-drywall']],
  [/landscape|hardscape|driveway|\bfence\b|\bpatio\b|paving|irrigation/i, ['exterior']],
  [/floor|cabinet|counter|\bpaint|\btile|finish|interior|\btrim\b|millwork|appliance|fixture/i, ['finishes']],
];

export function lineToTimeWindow(
  line: { category?: string; description?: string },
  scheduled: ScheduledPhase[],
): WeekWindow {
  const totalWeeks = totalScheduleWeeks(scheduled);
  const byId = new Map(scheduled.map((p) => [p.id, p]));
  const hay = `${line.category ?? ''} ${line.description ?? ''}`;

  for (const [re, target] of PHASE_RULES) {
    if (!re.test(hay)) continue;
    if (target === 'preroll') return { start: 0, end: Math.min(2, totalWeeks) };
    if (target === 'continuous') return { start: 0, end: totalWeeks };
    const hits = target.map((id) => byId.get(id)).filter(Boolean) as ScheduledPhase[];
    if (hits.length) {
      return { start: Math.min(...hits.map((p) => p.startWeek)), end: Math.max(...hits.map((p) => p.endWeek)) };
    }
  }
  // No rule matched (or the named phase is absent in this schedule): spread the
  // line across the whole timeline rather than dropping it.
  return { start: 0, end: totalWeeks };
}
