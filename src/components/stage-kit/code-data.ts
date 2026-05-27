/**
 * Curated San Francisco / California residential code topics.
 *
 * The brief's "UpCodes 200 rows already pulled" power the live lookup via the
 * compliance specialist (server-side `queryAllSources` → UpCodes adapter +
 * LLM plain-language rewrite). These curated rows are the demo's quick-picks
 * AND an instant, never-empty fallback when the LLM call is slow or offline —
 * each carries a hand-written plain-language summary plus the formal citation
 * shown in Pro mode.
 *
 * These are plain-language guidance for orientation, not legal authority.
 * The UI always points the user to verify with UpCodes / the AHJ.
 */

export interface CodeTopic {
  id: string;
  label: string;
  discipline: 'structural' | 'electrical' | 'plumbing' | 'mechanical' | 'fire';
  /** Formal citation, shown in Pro mode. */
  section: string;
  /** Which lifecycle phase this is most relevant to. */
  phase: 'plan' | 'build' | 'both';
  /** Foreman-vernacular plain-language summary (instant fallback). */
  plain: string;
}

export const SF_JURISDICTION_LABEL = 'San Francisco, CA';

export const SF_CODE_TOPICS: CodeTopic[] = [
  {
    id: 'egress-window',
    label: 'Bedroom egress windows',
    discipline: 'fire',
    section: 'CRC R310 — Emergency escape & rescue openings',
    phase: 'plan',
    plain:
      'Every sleeping room needs an escape window someone can climb out of in a fire: at least 5.7 sq ft of clear opening (5.0 sq ft at grade floor), min 24" high and 20" wide, with the sill no higher than 44" off the floor. Plan window sizes for the bedrooms before you frame.',
  },
  {
    id: 'ceiling-height',
    label: 'Minimum ceiling height',
    discipline: 'structural',
    section: 'CRC R305 — Ceiling height',
    phase: 'plan',
    plain:
      'Habitable rooms, halls, and bathrooms need at least 7‑0" of ceiling height. Beams and ducts can drop to 6‑8" in spots. Worth confirming on the farmhouse’s vaulted areas and any dropped soffits during design.',
  },
  {
    id: 'stairs',
    label: 'Stairway riser / run',
    discipline: 'structural',
    section: 'CRC R311.7 — Stairways',
    phase: 'plan',
    plain:
      'Stairs: max 7¾" riser, min 10" tread run, min 36" width, and at least 6‑8" of headroom. Risers and treads have to stay uniform within 3/8". Lock these into the stair shop drawings before fabrication.',
  },
  {
    id: 'title24-envelope',
    label: 'Title 24 envelope / insulation',
    discipline: 'mechanical',
    section: 'CA Energy Code (Title 24, Part 6)',
    phase: 'plan',
    plain:
      'California Energy Code sets minimum insulation and window performance for Climate Zone 3 (Bay Area): roughly R‑38 roof, R‑15+ walls, and low‑U / low‑SHGC windows. Confirm the assembly R‑values with the Title 24 report before ordering windows and insulation.',
  },
  {
    id: 'calgreen-waste',
    label: 'CALGreen construction waste',
    discipline: 'structural',
    section: 'CALGreen 4.408 — Construction waste reduction',
    phase: 'plan',
    plain:
      'CALGreen requires diverting at least 65% of construction & demolition debris from landfill, with a waste-management plan and tracking. SF enforces this hard — line up a debris-box hauler that gives you diversion receipts before demo starts.',
  },
  {
    id: 'garage-separation',
    label: 'House–garage fire separation',
    discipline: 'fire',
    section: 'CRC R302.6 — Dwelling/garage separation',
    phase: 'build',
    plain:
      'The wall between the garage and the house needs ½" gypsum on the garage side (⅝" Type X if there’s living space above), and the connecting door must be solid wood 1⅜" thick, 20‑minute rated, or steel — self-closing. Inspectors check this at drywall.',
  },
  {
    id: 'smoke-alarms',
    label: 'Smoke alarm placement',
    discipline: 'electrical',
    section: 'CRC R314 — Smoke alarms',
    phase: 'build',
    plain:
      'Smoke alarms go in every bedroom, outside each sleeping area, and on every level including basements. They must be hard-wired with battery backup and interconnected so they all sound together. Rough this in with the electrical so it passes the rough inspection.',
  },
  {
    id: 'co-alarms',
    label: 'Carbon monoxide alarms',
    discipline: 'electrical',
    section: 'CRC R315 — Carbon monoxide alarms',
    phase: 'build',
    plain:
      'CO alarms are required outside each sleeping area and on every level when the home has fuel-burning appliances or an attached garage — which this farmhouse does. Hard-wire with battery backup, same as smoke alarms.',
  },
  {
    id: 'guards-handrails',
    label: 'Guards & handrails',
    discipline: 'structural',
    section: 'CRC R312 / R311.7.8 — Guards & handrails',
    phase: 'build',
    plain:
      'Guards are required where a walking surface is more than 30" above grade: 42" high, with openings that won’t pass a 4" sphere. Stair handrails sit 34‑38" above the nosings. Check decks and the open stair before the final.',
  },
  {
    id: 'footing-depth',
    label: 'Footing depth & frost',
    discipline: 'structural',
    section: 'CRC R403 — Foundations',
    phase: 'both',
    plain:
      'Footings bear on undisturbed soil at least 12" below grade (Bay Area has minimal frost). Marin’s expansive clays often push you to a deeper or engineered foundation — follow the soils report and the structural drawings, and get the footing/setback inspection before you pour.',
  },
];

export function topicsForPhase(phase: 'plan' | 'build'): CodeTopic[] {
  return SF_CODE_TOPICS.filter((t) => t.phase === phase || t.phase === 'both');
}

export function findTopic(query: string, phase: 'plan' | 'build'): CodeTopic | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const pool = topicsForPhase(phase);
  const scored = pool
    .map((t) => {
      const hay = `${t.label} ${t.section} ${t.plain}`.toLowerCase();
      let score = 0;
      for (const word of q.split(/\s+/)) {
        if (word.length > 2 && hay.includes(word)) score += 1;
      }
      if (t.label.toLowerCase().includes(q)) score += 3;
      return { t, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.t ?? null;
}
