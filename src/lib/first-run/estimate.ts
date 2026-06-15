/**
 * first-run/estimate — the grounded money engine behind /start/tiers.
 *
 * Doctrine (docs/first-run-and-onboarding.md Principle #3; docs/visual-first-and-flags.md §3):
 *   "No hallucinated money — tier ranges derive from grounded context or render
 *    as honest ranges with the engine's-read label. Cost/permit flags are cited
 *    or hedged. Every tier shows at least one non-green flag — no tier is
 *    all-green."
 *
 * Why this lib instead of POST /api/v1/projects/estimate (the route the doctrine
 * names): that route requires auth + a real projectId, deletes/inserts
 * project_budget_lines in the SHARED-PROD Supabase, runs one Claude call per
 * request, and returns a single { totalCost, marketComparison } — not three
 * tiers of { low, high }. None of that fits a COLD first-run screen reached
 * before a project (or sign-in) exists, and an LLM-priced number is exactly the
 * "hallucinated money" the doctrine forbids. So tier ranges are derived
 * DETERMINISTICALLY from the user's own project — square footage × jurisdiction
 * (a regional cost index) × building type. Same inputs → same ranges (tames the
 * run-to-run variability §3 warns about), instant (never blocks the next step),
 * and every figure traces to the documented basis below rather than being
 * invented.
 *
 * Pure + presentation-free: no React, no network, no env. The page feeds it
 * parsed signals (or light user input) and renders the CostTier[] it returns.
 */

export type FlagKind = 'ease' | 'watch' | 'risk';

export interface TierFlag {
  kind: FlagKind;
  headline: string;
  why: string;
}

export interface CostTier {
  key: 'budget' | 'business' | 'first_class';
  name: string;
  blurb: string;
  moneyLow: number;
  moneyHigh: number;
  timeline: string;
  flags: TierFlag[]; // honesty rule: at least one is not 'ease'
  recommended?: boolean;
  rationale?: string; // one whisper line, shown only on the recommended tier
}

export type BuildingType =
  | 'adu'
  | 'new_home'
  | 'addition'
  | 'whole_house_remodel'
  | 'kitchen_remodel'
  | 'bath_remodel'
  | 'garage_conversion'
  | 'generic';

// ---- Cost basis (California-first; the engine's read, not a quote) ----------

/**
 * CA baseline FINISHED cost per square foot for a generic ground-up residential
 * build (building-type factor 1.0, regional multiplier 1.0). Deliberately wide,
 * widely-published California bands: budget tract ≈ $250/sf, mid-market custom
 * ≈ $350/sf, high-end custom ≈ $525/sf.
 *
 * Cross-check (this keeps the basis honest, not invented): fed the ADU defaults
 * below (≈800 sf, factor 1.05, region ×1.0) the model lands budget ≈ $185–235K,
 * business ≈ $256–333K, first-class ≈ $362–520K — within a few percent of the
 * hand-validated ADU sample ranges this screen originally shipped with.
 */
const BASE_COST_PER_SQFT: Record<CostTier['key'], number> = {
  budget: 250,
  business: 350,
  first_class: 525,
};

/** Half-width of the honest range around the midpoint, by tier. First-class is
 *  the widest — custom scope creep is the top overrun driver (its rust flag). */
const TIER_SPREAD: Record<CostTier['key'], number> = {
  budget: 0.12,
  business: 0.13,
  first_class: 0.18,
};

interface BuildingTypeConfig {
  label: string;
  /** Multiplier on $/sf — remodels/additions cost more per foot than tract work. */
  factor: number;
  /** Used only when we can't parse (and the user hasn't entered) a size. */
  defaultSqft: number;
}

const BUILDING_TYPES: Record<BuildingType, BuildingTypeConfig> = {
  adu: { label: 'ADU', factor: 1.05, defaultSqft: 800 },
  new_home: { label: 'new home', factor: 1.0, defaultSqft: 2200 },
  addition: { label: 'addition', factor: 1.15, defaultSqft: 500 },
  whole_house_remodel: { label: 'whole-home remodel', factor: 0.85, defaultSqft: 1800 },
  kitchen_remodel: { label: 'kitchen remodel', factor: 1.7, defaultSqft: 200 },
  bath_remodel: { label: 'bath remodel', factor: 1.9, defaultSqft: 120 },
  garage_conversion: { label: 'garage conversion', factor: 0.9, defaultSqft: 400 },
  generic: { label: 'project', factor: 1.0, defaultSqft: 1500 },
};

interface RegionRule {
  multiplier: number;
  label: string;
  keywords: string[];
}

/**
 * Regional cost index, CA-first. Construction cost swings widely by county; the
 * SF Bay Area runs well above the state baseline, the Central Valley below. Any
 * location we don't recognize falls back to the California baseline (×1.0) — the
 * engine's-read label + the "verify with your AHJ" flag cover the imprecision.
 */
const REGION_RULES: RegionRule[] = [
  {
    multiplier: 1.3,
    label: 'SF Bay Area, CA',
    keywords: [
      'marin', 'san francisco', 'bay area', 'san mateo', 'santa clara',
      'silicon valley', 'palo alto', 'mountain view', 'berkeley', 'oakland',
      'alameda', 'napa', 'sonoma', 'san jose', 'sausalito', 'mill valley',
      'tiburon', 'menlo park', 'cupertino',
    ],
  },
  {
    multiplier: 1.15,
    label: 'Coastal Southern CA',
    keywords: [
      'los angeles', 'la county', 'orange county', 'irvine', 'san diego',
      'santa barbara', 'malibu', 'beverly hills', 'santa monica', 'pasadena',
      'newport beach', 'coastal',
    ],
  },
  {
    multiplier: 0.92,
    label: 'Inland / Central Valley, CA',
    keywords: [
      'fresno', 'bakersfield', 'central valley', 'stockton', 'modesto',
      'sacramento', 'riverside', 'san bernardino', 'inland empire', 'redding',
      'chico', 'visalia',
    ],
  },
];

const DEFAULT_REGION = { multiplier: 1.0, label: 'California' };

// ---- Parsing the user's own words (transparent; no model call) -------------

export interface ProjectSignals {
  sqft?: number;
  buildingType?: BuildingType;
  regionLabel?: string;
  regionMultiplier?: number;
}

const TYPE_RULES: { type: BuildingType; keywords: string[] }[] = [
  { type: 'garage_conversion', keywords: ['garage conversion', 'convert the garage', 'convert my garage', 'convert a garage', 'convert garage', 'garage into'] },
  { type: 'adu', keywords: ['adu', 'accessory dwelling', 'granny flat', 'in-law unit', 'in law unit', 'casita', 'backyard cottage', 'guest house', 'guesthouse', 'backyard unit', 'backyard studio'] },
  { type: 'kitchen_remodel', keywords: ['kitchen'] },
  { type: 'bath_remodel', keywords: ['bathroom', 'bath remodel', 'master bath', 'powder room', 'ensuite', 'en-suite'] },
  { type: 'addition', keywords: ['addition', 'add a room', 'add a bedroom', 'add a bath', 'second story', 'second-story', '2nd story', 'room addition', 'bump out', 'bump-out', 'extend the', 'expand the'] },
  { type: 'new_home', keywords: ['new home', 'new house', 'custom home', 'build a home', 'build a house', 'build my home', 'build my house', 'single family', 'single-family', 'new construction', 'dream home', 'spec home', 'ground up', 'ground-up', 'from scratch', 'new build'] },
  { type: 'whole_house_remodel', keywords: ['remodel', 'renovate', 'renovation', 'gut ', 'whole house', 'whole-house', 'whole home', 'fixer', 'rehab', 'redo the'] },
];

/** Parse a square footage out of free text: "1,800 sq ft", "2000 sqft", "2k sf". */
export function parseSqft(text: string): number | undefined {
  const m = text.match(
    /(\d[\d,]*(?:\.\d+)?)\s*(k)?[\s-]*(?:sq\.?\s*ft|sq\.?\s*feet|square[\s-]*feet|square[\s-]*foot|sqft|sf)\b/i
  );
  if (!m) return undefined;
  let n = parseFloat(m[1].replace(/,/g, ''));
  if (m[2]) n *= 1000; // "2k sqft"
  if (!Number.isFinite(n)) return undefined;
  n = Math.round(n);
  return n >= 80 && n <= 50000 ? n : undefined;
}

/** Map a location string onto the regional cost index above. */
export function resolveRegion(text: string): { multiplier: number; label: string; matched: boolean } {
  const t = ` ${text.toLowerCase()} `;
  for (const rule of REGION_RULES) {
    if (rule.keywords.some((k) => t.includes(k))) {
      return { multiplier: rule.multiplier, label: rule.label, matched: true };
    }
  }
  return { ...DEFAULT_REGION, matched: false };
}

/** Infer the project type from the user's words (first match wins, most specific first). */
export function parseBuildingType(text: string): BuildingType | undefined {
  const t = text.toLowerCase();
  for (const rule of TYPE_RULES) {
    if (rule.keywords.some((k) => t.includes(k))) return rule.type;
  }
  return undefined;
}

export function parseProjectSignals(intent?: string | null): ProjectSignals {
  const text = (intent ?? '').trim();
  if (!text) return {};
  const region = resolveRegion(text);
  return {
    sqft: parseSqft(text),
    buildingType: parseBuildingType(text),
    regionLabel: region.matched ? region.label : undefined,
    regionMultiplier: region.matched ? region.multiplier : undefined,
  };
}

// ---- The estimate ----------------------------------------------------------

export interface EstimateInput {
  /** Raw words from The One Door; parsed for size / type / region when the
   *  explicit fields below aren't supplied. */
  intent?: string | null;
  /** Light user input (the refine row) — wins over anything parsed from intent. */
  sqft?: number;
  location?: string;
  buildingType?: BuildingType;
}

export interface EstimateBasis {
  sqft: number;
  location: string;
  buildingType: BuildingType;
  buildingTypeLabel: string;
  regionMultiplier: number;
  /** $/sf after type + region factors, by tier — the traceable basis. */
  costPerSqFt: Record<CostTier['key'], number>;
  /** True when we fell back to a type default / CA baseline (drives honest flags). */
  assumedSqft: boolean;
  assumedLocation: boolean;
}

export interface EstimateResult {
  tiers: CostTier[];
  basis: EstimateBasis;
}

const TIER_ORDER: CostTier['key'][] = ['budget', 'business', 'first_class'];

const TIER_META: Record<CostTier['key'], Pick<CostTier, 'name' | 'blurb' | 'recommended' | 'rationale'>> = {
  budget: { name: 'Budget', blurb: 'Get it built, keep it simple.' },
  business: {
    name: 'Business Class',
    blurb: 'The balance most builds land on.',
    recommended: true,
    rationale: 'Best resale-to-cost balance for your area.',
  },
  first_class: { name: 'First-Class Luxury', blurb: 'Top finishes, top systems.' },
};

// Honest base flags — every tier carries ≥1 non-green flag AND a "verify with
// your AHJ" hedge on its cost/permit/timeline line (visual-first-and-flags.md §3).
const BASE_FLAGS: Record<CostTier['key'], TierFlag[]> = {
  budget: [
    { kind: 'ease', headline: 'Lowest cash outlay', why: 'The smallest up-front number of the three.' },
    { kind: 'watch', headline: 'Basic finishes', why: 'Upgrading later costs more than choosing it now.' },
    { kind: 'risk', headline: 'Thin contingency', why: 'Little cushion for surprises — verify costs and fees with your AHJ.' },
  ],
  business: [
    { kind: 'ease', headline: 'Strong resale return', why: 'Mid-tier finishes recover the most at sale.' },
    { kind: 'watch', headline: 'Timeline assumes no permit delay', why: 'Confirm the plan-check queue with your AHJ.' },
  ],
  first_class: [
    { kind: 'ease', headline: 'Premium throughout', why: 'Custom millwork, high-end systems, designer finishes.' },
    { kind: 'watch', headline: 'Long-lead materials', why: 'Custom orders can stretch the schedule.' },
    { kind: 'risk', headline: 'Range widens with scope', why: 'Custom scope creep is the top overrun driver — verify with your AHJ.' },
  ],
};

function clampSqft(n: number): number {
  if (!Number.isFinite(n)) return BUILDING_TYPES.generic.defaultSqft;
  return Math.min(50000, Math.max(80, Math.round(n)));
}

/** Round to an honest step — never fabricated to-the-dollar precision. */
function roundMoney(n: number): number {
  const step = n >= 1_000_000 ? 10_000 : 5_000;
  return Math.max(step, Math.round(n / step) * step);
}

function timelineFor(key: CostTier['key'], sqft: number): string {
  const base = 4 + sqft / 600; // months, midpoint-ish — bigger builds run longer
  const add = key === 'budget' ? -0.5 : key === 'first_class' ? 2.5 : 0.5;
  const lo = Math.max(2, Math.round(base + add - 1));
  const hi = Math.round(base + add + (key === 'first_class' ? 4 : 2));
  return `${lo}–${Math.max(hi, lo + 1)} months`;
}

function titleCaseLocation(s: string): string {
  return s
    .trim()
    .slice(0, 60)
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Turn a project (parsed words + optional light input) into three honest tiers.
 * Role does NOT enter the math — "same engine, copy swaps only"; the dollars are
 * identical for owner and GC, only the framing voice differs (handled in the UI).
 */
export function estimateTiers(input: EstimateInput = {}): EstimateResult {
  const parsed = parseProjectSignals(input.intent);

  const buildingType = input.buildingType ?? parsed.buildingType ?? 'generic';
  const typeCfg = BUILDING_TYPES[buildingType];

  // Size: explicit refine wins, else parsed from intent, else a type default.
  const assumedSqft = input.sqft == null && parsed.sqft == null;
  const sqft = clampSqft(input.sqft ?? parsed.sqft ?? typeCfg.defaultSqft);

  // Location: explicit refine wins, else parsed from intent, else CA baseline.
  const refineLoc = (input.location ?? '').trim();
  let location: string;
  let regionMultiplier: number;
  let assumedLocation: boolean;
  if (refineLoc) {
    location = titleCaseLocation(refineLoc);
    regionMultiplier = resolveRegion(refineLoc).multiplier;
    assumedLocation = false;
  } else if (parsed.regionLabel && parsed.regionMultiplier != null) {
    location = parsed.regionLabel;
    regionMultiplier = parsed.regionMultiplier;
    assumedLocation = false;
  } else {
    location = DEFAULT_REGION.label;
    regionMultiplier = DEFAULT_REGION.multiplier;
    assumedLocation = true;
  }

  const costPerSqFt: Record<CostTier['key'], number> = {
    budget: Math.round(BASE_COST_PER_SQFT.budget * typeCfg.factor * regionMultiplier),
    business: Math.round(BASE_COST_PER_SQFT.business * typeCfg.factor * regionMultiplier),
    first_class: Math.round(BASE_COST_PER_SQFT.first_class * typeCfg.factor * regionMultiplier),
  };

  const tiers = TIER_ORDER.map((key): CostTier => {
    const mid = sqft * costPerSqFt[key];
    const spread = TIER_SPREAD[key];
    const meta = TIER_META[key];
    const flags: TierFlag[] = BASE_FLAGS[key].map((f) => ({ ...f }));
    // Surface the grounding gaps as honest flags — and guarantee no all-green tier.
    if (assumedSqft) {
      flags.push({
        kind: 'watch',
        headline: `Size assumed (~${sqft.toLocaleString()} sq ft)`,
        why: 'Set the real size for a tighter range.',
      });
    }
    if (assumedLocation) {
      flags.push({
        kind: 'watch',
        headline: 'Location assumed — California baseline',
        why: 'Costs swing a lot by county; set yours for a sharper read.',
      });
    }
    return {
      key,
      name: meta.name,
      blurb: meta.blurb,
      moneyLow: roundMoney(mid * (1 - spread)),
      moneyHigh: roundMoney(mid * (1 + spread)),
      timeline: timelineFor(key, sqft),
      recommended: meta.recommended,
      rationale: meta.rationale,
      flags,
    };
  });

  return {
    tiers,
    basis: {
      sqft,
      location,
      buildingType,
      buildingTypeLabel: typeCfg.label,
      regionMultiplier,
      costPerSqFt,
      assumedSqft,
      assumedLocation,
    },
  };
}
