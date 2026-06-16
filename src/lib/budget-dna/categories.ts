/**
 * Budget-DNA — the canonical eight cost categories.
 * ==================================================
 *
 * The Budget-DNA ribbon, the budget line-item table, and the burn gauge all
 * speak ONE category vocabulary: these eight buckets. Raw budget lines carry a
 * free-text accounting `category` (permits / labor / subcontractors / …) and a
 * description; `lineToCategory()` resolves either of those — or a future CSI
 * MasterFormat code — into one of the eight. The colors live in
 * `src/styles/tokens.css` (`--cat-*`); the hexes mirrored here are for SVG
 * `<pattern>` stops and canvas, and are kept in sync with the tokens by the
 * unit test.
 *
 * Ordering = where the money lands across a build (early → late), which is
 * also the canonical streamgraph stacking order (index 0 = bottom band) and
 * the legend order. Every category pairs a fill with a texture (`pattern`) and
 * a text label so it never relies on hue alone (colorblind-safe + the locked
 * "never hue-alone" rule).
 */

export type CategoryId =
  | 'softcosts'
  | 'site'
  | 'foundation'
  | 'framing'
  | 'envelope'
  | 'systems'
  | 'finishes'
  | 'site-improv';

export type PatternId =
  | 'stipple'
  | 'crosshatch'
  | 'diagonal'
  | 'vertical'
  | 'brick'
  | 'dashes'
  | 'chevron'
  | 'leaf';

export interface CategoryMeta {
  id: CategoryId;
  /** Full legend label. */
  label: string;
  /** Compact label for tight chips. */
  short: string;
  /** CSS custom property to use as the fill in the DOM. */
  cssVar: string;
  /** Mirror of the token hex — for SVG pattern stops / canvas. Kept in sync by the test. */
  hex: string;
  /** Texture key (never hue-alone). */
  pattern: PatternId;
  /** CSI MasterFormat divisions that roll up into this category. */
  csi: string[];
  /** Canonical stacking + legend order (0 = bottom of the streamgraph). */
  order: number;
}

/**
 * The eight categories, in canonical (early → late) order. Hexes mirror the
 * `--cat-*` tokens in tokens.css; `categories.test.ts` asserts they match so a
 * token edit can't silently drift the SVG stops.
 */
export const CATEGORIES: CategoryMeta[] = [
  { id: 'softcosts',   label: 'Soft costs & GC',     short: 'Soft costs',  cssVar: 'var(--cat-softcosts)',   hex: '#5A3B1F', pattern: 'stipple',    csi: ['00', '01'],             order: 0 },
  { id: 'foundation',  label: 'Foundation & concrete', short: 'Foundation', cssVar: 'var(--cat-foundation)',  hex: '#5C6660', pattern: 'crosshatch', csi: ['03'],                   order: 1 },
  { id: 'site',        label: 'Site & earthwork',    short: 'Site',        cssVar: 'var(--cat-site)',        hex: '#7C6235', pattern: 'diagonal',   csi: ['02', '31'],             order: 2 },
  { id: 'framing',     label: 'Framing & structure', short: 'Framing',     cssVar: 'var(--cat-framing)',     hex: '#A9743C', pattern: 'vertical',   csi: ['05', '06'],             order: 3 },
  { id: 'envelope',    label: 'Envelope',            short: 'Envelope',    cssVar: 'var(--cat-envelope)',    hex: '#3C7A8A', pattern: 'brick',      csi: ['07', '08'],             order: 4 },
  { id: 'systems',     label: 'Systems (MEP)',       short: 'Systems',     cssVar: 'var(--cat-systems)',     hex: '#8C5E22', pattern: 'dashes',     csi: ['21', '22', '23', '26', '27', '28'], order: 5 },
  { id: 'finishes',    label: 'Interior finishes',   short: 'Finishes',    cssVar: 'var(--cat-finishes)',    hex: '#8A5670', pattern: 'chevron',    csi: ['09', '10', '11', '12'], order: 6 },
  { id: 'site-improv', label: 'Site improvements',   short: 'Landscape',   cssVar: 'var(--cat-site-improv)', hex: '#5E7A56', pattern: 'leaf',       csi: ['32', '33'],             order: 7 },
];

/** O(1) lookup by id. */
export const CATEGORY_BY_ID: Record<CategoryId, CategoryMeta> = CATEGORIES.reduce(
  (acc, c) => { acc[c.id] = c; return acc; },
  {} as Record<CategoryId, CategoryMeta>,
);

/** CSI division (two-digit string) → category. Built from CATEGORIES[].csi. */
export const CSI_TO_CATEGORY: Record<string, CategoryId> = CATEGORIES.reduce(
  (acc, c) => { for (const code of c.csi) acc[code] = c.id; return acc; },
  {} as Record<string, CategoryId>,
);

/**
 * Ordered keyword rules — FIRST match wins. Trade-specific terms come before
 * generic ones (e.g. "electrical — rough + finish" must resolve to systems,
 * not finishes, so the systems rule precedes the "finish" rule).
 */
const KEYWORD_RULES: ReadonlyArray<[RegExp, CategoryId]> = [
  [/permit|impact fee|school fee|\bfee\b|architect|engineer|design|general conditions|supervision|overhead|insurance|contingenc|bond|\bsoft\b/i, 'softcosts'],
  [/excavat|grading|clearing|site prep|demolition|\bdemo\b|earthwork|crane|equipment rental|scaffold/i, 'site'],
  [/foundation|concrete|slab|footing|rebar|stem ?wall|caisson|pier/i, 'foundation'],
  [/framing|lumber|sheathing|carpentry|truss|joist|\bsteel\b|structural|\bstud/i, 'framing'],
  [/roof|weatherproof|window|exterior door|siding|stucco|cladding|gutter|flashing/i, 'envelope'],
  [/electric|\bplumb|hvac|mechanical|ductwork|\bduct\b|wiring|\bmep\b|fire ?sprinkler|low.?voltage/i, 'systems'],
  [/landscape|hardscape|driveway|\bfence\b|\bpatio\b|paving|irrigation|exterior improvement/i, 'site-improv'],
  [/drywall|insulation|\bfloor|cabinet|counter|\bpaint|\btile|finish|interior|\btrim\b|millwork|appliance|fixture|kitchen|\bbath|vanity|specialt|furnish/i, 'finishes'],
];

/** Coarse fallback when neither CSI nor a keyword matched — the accounting bucket. */
const ACCOUNTING_FALLBACK: Record<string, CategoryId> = {
  permits: 'softcosts',
  admin: 'softcosts',
  labor: 'softcosts',
  insurance: 'softcosts',
  contingency: 'softcosts',
  profit: 'softcosts',
  equipment: 'site',
  materials: 'framing',
  'raw-supplies': 'framing',
  subcontractors: 'systems',
};

/** A budget line as far as categorization cares (a structural subset of BudgetLine). */
export interface CategorizableLine {
  category?: string;
  description?: string;
  /** Optional explicit CSI code (e.g. "06" or "06 10 00"); wins when present. */
  csiCode?: string;
}

/**
 * Resolve a budget line to one of the eight categories.
 * Precedence: explicit CSI code → description/category keyword → accounting
 * fallback → 'softcosts' (the safe catch-all bucket).
 */
export function lineToCategory(line: CategorizableLine): CategoryId {
  if (line.csiCode) {
    const div = line.csiCode.trim().slice(0, 2);
    if (CSI_TO_CATEGORY[div]) return CSI_TO_CATEGORY[div];
  }
  const hay = `${line.category ?? ''} ${line.description ?? ''}`;
  for (const [re, id] of KEYWORD_RULES) {
    if (re.test(hay)) return id;
  }
  const acct = (line.category ?? '').toLowerCase().trim();
  return ACCOUNTING_FALLBACK[acct] ?? 'softcosts';
}

// ─── Gross-profit projection (LENS-GATED) ────────────────────────────────────
//
// Marin's 16 lines sum to exactly the $1.65M contract, so cost == contract and
// no margin is separable from the seed. The ribbon's right cap therefore shows
// a clearly-labeled PROJECTED gross profit for builder lanes only, using these
// documented assumptions (tune here, never inline). The Owner lane never sees
// any of this — `deriveBudgetDna` returns `profit: null` for owner.

/** Assumed gross margin on contract value (industry-typical custom-residential GC). */
export const GROSS_MARGIN_PCT = 0.15;
/** Assumed markup carried on subcontractor + material cost. */
export const SUB_MARKUP_PCT = 0.1;

/** Project roles that may see the gross-profit cap. Owner + everyone else can't. */
export type BudgetLens = string | null;
export function lensSeesProfit(lane: BudgetLens): boolean {
  return lane === 'gc' || lane === 'contractor' || lane === 'diy';
}
