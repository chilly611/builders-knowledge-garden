/**
 * mep-calc-router.ts
 * ===================
 *
 * Deterministic keyword router. Suggests the MEP calc routes BEFORE
 * any LLM is invoked, so MEP queries don't get burned on a chat-tokens
 * answer when there's a precise calculator that beats it.
 *
 * Used by: the global search box, the AI fab, and any "where should
 * this query go?" surface that wants to short-circuit RAG when the
 * answer is a panel size or a fixture count.
 *
 * No LLM. Pure regex matching on a small keyword table.
 */

export interface MepCalcSuggestion {
  workflowId: 'q-panel-schedule' | 'q-equipment-schedule' | 'q-load-calc';
  href: string;
  label: string;
  reason: string;
}

const PANEL_KEYWORDS = [
  /\bpanel\s*(schedule|directory)?\b/i,
  /\bservice\s*(entrance|size|amps?)\b/i,
  /\bload\s*calc(ulation)?\b/i,
  /\bnec\s*220\b/i,
  /\bdemand\s*factor\b/i,
  /\b200\s*amp\b/i,
  /\bbreaker\s*size\b/i,
  /\bwire\s*siz(e|ing)\b/i,
  /\bcircuit\s*directory\b/i,
];

const EQUIPMENT_KEYWORDS = [
  /\bhvac\s*tonnage\b/i,
  /\btons?\s*(of\s*)?cool(ing|er)?\b/i,
  /\brtu\s*siz(e|ing)\b/i,
  /\brooftop\s*unit\b/i,
  /\bmanual\s*[jn]\b/i,
  /\bsqft\s*per\s*ton\b/i,
  /\bfixture\s*count\b/i,
  /\bplumbing\s*fixtures?\b/i,
  /\bupc\s*422\b/i,
  /\boccupant\s*load\b/i,
  /\bwater\s*closets?\b/i,
];

/**
 * Inspect a query string and return up to 2 MEP-calc suggestions.
 * Returns empty array if no MEP-related keywords matched.
 */
export function suggestMepCalcRoutes(query: string): MepCalcSuggestion[] {
  if (!query || query.trim().length < 3) return [];
  const out: MepCalcSuggestion[] = [];

  const panelHit = PANEL_KEYWORDS.find((re) => re.test(query));
  if (panelHit) {
    out.push({
      workflowId: 'q-panel-schedule',
      href: '/killerapp/workflows/panel-schedule',
      label: 'Run a panel schedule (NEC 220)',
      reason: `Matched "${query.match(panelHit)?.[0]}" — deterministic NEC math is more reliable than an LLM answer here.`,
    });
  }

  const equipHit = EQUIPMENT_KEYWORDS.find((re) => re.test(query));
  if (equipHit) {
    out.push({
      workflowId: 'q-equipment-schedule',
      href: '/killerapp/workflows/equipment-schedule',
      label: 'Generate equipment schedule (HVAC tonnage + fixtures)',
      reason: `Matched "${query.match(equipHit)?.[0]}" — sqft-based sizing + UPC 422.1 counts.`,
    });
  }

  return out;
}

/**
 * Cockpit surfacing: should we show the "Run MEP calcs" card on the
 * project cockpit? True when the project is commercial / TI based on
 * jurisdiction or project_type strings.
 */
export function shouldSurfaceMepCalcs(opts: {
  projectType?: string | null;
  jurisdiction?: string | null;
  scope?: string | null;
}): boolean {
  const hay = [opts.projectType, opts.jurisdiction, opts.scope]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!hay) return false;
  return /commercial|tenant\s*improvement|\bti\b|office|retail|restaurant|warehouse|medical|hospital|school/.test(hay);
}
