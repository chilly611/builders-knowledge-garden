/**
 * Folsom Street Fourplex — Second Demo Seed
 * =========================================
 *
 * The SINGLE source of truth for the Folsom Street Fourplex demo project —
 * a 4-unit ground-up infill multifamily build in San Francisco. It is a
 * SECOND selectable demo alongside the canonical Modern Farmhouse in Marin
 * (`marin-farmhouse.ts`); it does NOT replace Marin. Every surface that
 * shows this project's numbers MUST read them from here (directly or via
 * the demo-fixture registry in `@/lib/projects/getCanonicalProject`).
 *
 * Why a second seed: the SF fidelity mockups and the portal imagery
 * (`hero-sf-fourplex-golden-*`, `study-sf-*`, `thumb-sf-*`) are authored
 * for a multifamily project. This module gives those visuals a real,
 * data-driven home so `?project=<id>` flips identity + budget + portal
 * imagery the same way Marin does, with no bleed between the two.
 *
 * Numbers below are FOUNDER-LOCKED (2026-06-15) — they are canon. Spec:
 * `docs/design/sf-fourplex-seed-spec.md`. Like Marin, this module carries
 * a load-time invariant check (see bottom) so the sums can never drift.
 *
 * Editing rules:
 *   - Treat the constants below as the contract. Do not mirror them elsewhere.
 *   - If a page needs a derived shape, build it from these primitives.
 *   - This is a CODE fixture, not a DB row — it is served client-side via the
 *     demo-fixture registry, so it needs no `command_center_projects` row and
 *     never mutates shared production.
 */

import type { BudgetLine } from '@/app/killerapp/budget/budget-storage';
import type { CastMember, Lane } from '@/lib/seed-data/marin-farmhouse';

// ─── Identity ───────────────────────────────────────────────────────────────

/**
 * Stable demo project id. A real hex UUID (not a `proj-` slug) so it satisfies
 * the `ProjectContext` id validator (UUID-or-`demo-` prefix) the same way the
 * other demo UUIDs do and resolves through every project hook WITHOUT widening
 * that security-relevant validator. Distinct from Marin's `55730cd3-…`.
 */
export const FOLSOM_PROJECT_ID = 'f0150f0e-4d78-4f0c-9aaa-bbccdd015000';

/** Display name — every page MUST use this exact string. */
export const FOLSOM_PROJECT_NAME = 'Folsom Street Fourplex';

/** Developer entity / client. */
export const FOLSOM_CLIENT_NAME = 'Dolores Built LLC';

/** Marketing-jurisdiction string (what the chrome shows). */
export const FOLSOM_LOCATION = 'San Francisco, CA';

/** Neighborhood (optional flavor; the Mission). */
export const FOLSOM_NEIGHBORHOOD = 'Mission, San Francisco';

/** Live code-lookup jurisdiction wired into the demo. */
export const FOLSOM_CODE_JURISDICTION = 'San Francisco, CA';

/** Architectural-program description used on cards and headers. */
export const FOLSOM_STYLE =
  '4-unit ground-up infill multifamily, 4 stories';

/** Unit mix — 2× (2BR/2BA) + 2× (1BR/1BA). */
export const FOLSOM_UNIT_MIX = '2× 2BR/2BA + 2× 1BR/1BA';
export const FOLSOM_UNITS = 4;
export const FOLSOM_STORIES = 4; // 3 residential over a ground-floor garage

// ─── Geometry ───────────────────────────────────────────────────────────────

/** Gross square footage — the number every page must display. */
export const FOLSOM_SQFT = 5_200;
export const FOLSOM_SQFT_DISPLAY = '5,200';

// ─── Budget (the load-bearing numbers — must reconcile) ──────────────────────

/** Contract total. */
export const FOLSOM_BUDGET_TOTAL = 3_200_000;

/** Spent to date — cash already out the door (= 41.9% ≈ 42%). */
export const FOLSOM_BUDGET_SPENT = 1_340_000;

/** Committed — locked-in subs and POs, not yet billed. */
export const FOLSOM_BUDGET_COMMITTED = 410_000;

/** Remaining — pending lines that are still floating. */
export const FOLSOM_BUDGET_REMAINING = 1_450_000;

// ─── Schedule ───────────────────────────────────────────────────────────────

/** Build progress (schedule node) — Build · 42%. */
export const FOLSOM_BUILD_PROGRESS = 42;

/** Where the build sits in its calendar: week 6 of 14. */
export const FOLSOM_WEEK = 6;
export const FOLSOM_WEEKS_TOTAL = 14;

/** Per-stage completion percentage (Size Up → Reflect). Mirrors Marin's shape. */
export const FOLSOM_STAGE_COMPLETION: Record<number, number> = {
  1: 100, // Size Up
  2: 100, // Lock
  3: 90,  // Plan
  4: 42,  // Build (active)
  5: 0,   // Adapt
  6: 0,   // Collect
  7: 0,   // Reflect
};

// ─── Project record (matches the legacy MarinProjectRecord shape) ───────────

export interface FolsomProjectRecord {
  id: string;
  name: string;
  client_name: string;
  jurisdiction: string;
  code_jurisdiction: string;
  sqft: string;
  project_type: string;
  estimated_cost_low: number;
  estimated_cost_high: number;
}

export const FOLSOM_PROJECT: FolsomProjectRecord = {
  id: FOLSOM_PROJECT_ID,
  name: FOLSOM_PROJECT_NAME,
  client_name: FOLSOM_CLIENT_NAME,
  jurisdiction: FOLSOM_LOCATION,
  code_jurisdiction: FOLSOM_CODE_JURISDICTION,
  sqft: FOLSOM_SQFT_DISPLAY,
  // project_type carries the multifamily language the portal archetype keys
  // off — "infill multifamily" + "4-unit" → the sf-fourplex seed set.
  project_type: `4-unit ground-up infill multifamily — 4 stories, ${FOLSOM_SQFT_DISPLAY} sqft`,
  estimated_cost_low: 3_050_000,
  estimated_cost_high: 3_400_000,
};

// ─── Cockpit narrative (canonical deep-link) ─────────────────────────────────

/** The developer's original ask — shown as the project query on the cockpit. */
export const FOLSOM_RAW_INPUT =
  '5,200 sqft ground-up 4-unit infill multifamily in San Francisco (Mission). ' +
  'Four stories — three residential floors over a ground-floor garage. Unit mix ' +
  '2× 2BR/2BA + 2× 1BR/1BA. New construction on an infill lot for Dolores Built LLC. ' +
  'Budget around $3.2M, currently in the Build phase (week 6 of 14).';

/** One-line canonical summary (used as ProjectRecord.ai_summary). */
export const FOLSOM_AI_SUMMARY =
  'A 5,200 sq ft ground-up 4-unit infill multifamily in San Francisco for Dolores ' +
  'Built LLC — $3.2M contract, currently in the Build phase (~42%), framing the ' +
  'three residential floors over the garage podium.';

/**
 * Canonical, investor-clean AI take rendered on the cockpit deep-link. A stable
 * fixture, in the copilot's voice. No trailing "**What next?**" block — the
 * static CTA row renders the next steps below this text.
 */
export const FOLSOM_AI_TAKE =
  "Here's how I read it: the Folsom Street Fourplex is a 5,200 sq ft, 4-unit " +
  "ground-up infill multifamily for Dolores Built LLC on a $3.2M contract — three " +
  "residential floors over a ground-floor garage. You're in the Build phase, about " +
  "42% complete and in week 6 of 14: the podium and lower framing are up, with the " +
  "upper floors staged next. Roughly $1.34M is spent against the $3.2M budget, with " +
  "$410K committed and about $1.45M still remaining — the numbers are holding.\n\n" +
  "Two things I'd watch this week: keep the framing and envelope packages sequenced " +
  "so the stacked units stay on the critical path, and stay ahead of San Francisco's " +
  "inspection cadence — DBI sign-offs between floors are the usual schedule gate on " +
  "an infill stack. Hold the line on change orders against the $160K contingency and " +
  "this one stays clean.";

// ─── Multi-Lane Cast (scaled for a 4-unit developer project) ────────────────
//
// Mirrors Marin's `MARIN_CAST` shape (reuses the `CastMember`/`Lane` model).
// Order roughly follows onboarding: owner first, then GC, subs in trade
// sequence, service providers, suppliers, workers. The `invited_by` graph
// closes — every ref resolves to another cast id or `'founder'`.

export const FOLSOM_CAST: CastMember[] = [
  // ── OWNER lane ────────────────────────────────────────────────────────────
  {
    id: 'folsom-owner-dolores',
    name: 'Dolores Built LLC',
    role: 'Developer / project owner',
    contact: 'dev@doloresbuilt.example.com',
    lane: 'OWNER',
    laneSubtype: null,
    joined_at: '2025-07-15',
    invited_by: 'founder',
    personalizing_detail:
      'Small SF infill developer, principal Marisol Vega. Third small-lot multifamily in the Mission. Wants a tight pro forma and weekly draw visibility.',
    status: 'active',
  },

  // ── GC lane ───────────────────────────────────────────────────────────────
  {
    id: 'folsom-gc',
    name: 'Castro Ridge Builders',
    role: 'General Contractor',
    contact: 'build@castroridge.example.com',
    company: 'Castro Ridge Builders Inc.',
    lane: 'GC',
    laneSubtype: null,
    joined_at: '2025-08-20',
    invited_by: 'folsom-owner-dolores',
    personalizing_detail:
      'SF infill specialist, principal Tony Alvarez. Crew of nine. Built five small-lot multifamily projects in the city. Runs a single weekly OAC.',
    status: 'active',
  },

  // ── SUB lane ──────────────────────────────────────────────────────────────
  {
    id: 'folsom-sub-foundation',
    name: 'Bay Cut Concrete & Shoring',
    role: 'Foundation, shoring & podium slab',
    contact: 'estimates@baycutconcrete.example.com',
    lane: 'SUB',
    laneSubtype: 'Foundation',
    joined_at: '2025-10-02',
    invited_by: 'folsom-gc',
    personalizing_detail:
      'Poured the garage podium slab and grade beams. Specializes in tight downtown lots with shoring against the property line.',
    status: 'active',
  },
  {
    id: 'folsom-sub-framing',
    name: 'Twin Peaks Framing',
    role: 'Framing — rough carpentry',
    contact: 'ops@twinpeaksframing.example.com',
    lane: 'SUB',
    laneSubtype: 'Framing',
    joined_at: '2025-10-02',
    invited_by: 'folsom-gc',
    personalizing_detail:
      'Type-V-over-podium specialists. Currently framing the three residential floors; sequencing the stair and elevator cores first.',
    status: 'active',
  },
  {
    id: 'folsom-sub-roofing',
    name: 'Ocean Beach Roofing',
    role: 'Roofing & weatherproofing',
    contact: 'jobs@oceanbeachroof.example.com',
    lane: 'SUB',
    laneSubtype: 'Roofing',
    joined_at: '2025-11-18',
    invited_by: 'folsom-gc',
    personalizing_detail:
      'Low-slope membrane + roof-deck details for the top-floor units. Sequenced behind framing top-out.',
    status: 'active',
  },
  {
    id: 'folsom-sub-plumbing',
    name: 'Mission Mechanical & Plumbing',
    role: 'Plumbing — rough + finish (×4 units)',
    contact: 'bids@missionmech.example.com',
    lane: 'SUB',
    laneSubtype: 'Plumbing',
    joined_at: '2026-01-12',
    invited_by: 'folsom-gc',
    personalizing_detail:
      'Stacks four-unit DWV and supply risers efficiently. Has run two prior stacked-flat jobs with Castro Ridge.',
    status: 'active',
  },
  {
    id: 'folsom-sub-electrical',
    name: 'Potrero Electric',
    role: 'Electrical — rough + finish (×4 units)',
    contact: 'service@potreroelectric.example.com',
    lane: 'SUB',
    laneSubtype: 'Electrical',
    joined_at: '2026-01-12',
    invited_by: 'folsom-gc',
    personalizing_detail:
      'C-10 contractor. House meters + four unit panels, EV-ready garage rough-in standard. Lead estimator: Renee Cho.',
    status: 'active',
  },
  {
    id: 'folsom-sub-drywall',
    name: 'Sunset Drywall & Finish',
    role: 'Insulation, drywall & interior finish',
    contact: 'office@sunsetdrywall.example.com',
    lane: 'SUB',
    laneSubtype: null,
    joined_at: '2026-02-09',
    invited_by: 'folsom-gc',
    personalizing_detail:
      'Handles party-wall acoustic assemblies between units. Sequenced after MEP rough-in and inspection.',
    status: 'active',
  },

  // ── SERVICE-PROVIDER lane ─────────────────────────────────────────────────
  {
    id: 'folsom-architect',
    name: 'Dogpatch Design Studio',
    role: 'Design architect',
    contact: 'studio@dogpatchdesign.example.com',
    lane: 'SERVICE-PROVIDER',
    laneSubtype: 'Architect',
    joined_at: '2025-06-30',
    invited_by: 'folsom-owner-dolores',
    personalizing_detail:
      'SF firm, principal Priya Anand, AIA. Drew the massing options and light-well section. Comes to weekly OAC; flags finish drift early.',
    status: 'active',
  },
  {
    id: 'folsom-structural',
    name: 'Embarcadero Structural',
    role: 'Structural engineer of record',
    contact: 'pe@embarcaderostructural.example.com',
    lane: 'SERVICE-PROVIDER',
    laneSubtype: 'Engineer',
    joined_at: '2025-07-28',
    invited_by: 'folsom-architect',
    personalizing_detail:
      'PE Daniel Wong stamped the podium + shear-wall package. Specializes in Type-V-over-concrete-podium and SF seismic detailing.',
    status: 'active',
  },

  // ── SUPPLIER lane ─────────────────────────────────────────────────────────
  {
    id: 'folsom-supplier-lumber',
    name: 'Bayview Lumber & Building Supply',
    role: 'Lumber & sheathing supplier',
    contact: 'orders@bayviewlumber.example.com',
    lane: 'SUPPLIER',
    laneSubtype: 'Lumber',
    joined_at: '2025-09-15',
    invited_by: 'folsom-gc',
    personalizing_detail:
      'SF yard. Doug fir + LVL stock for the multi-story spans. Quoting steady lead times on the framing package.',
    status: 'active',
  },
  {
    id: 'folsom-supplier-windows',
    name: 'Pacifica Glazing',
    role: 'Window & storefront supplier',
    contact: 'quote@pacificaglazing.example.com',
    lane: 'SUPPLIER',
    laneSubtype: 'Windows',
    joined_at: '2025-09-15',
    invited_by: 'folsom-architect',
    personalizing_detail:
      'Acoustic-rated units for the street elevation + ground-floor storefront glazing at the garage. 8–10 week lead.',
    status: 'active',
  },

  // ── WORKER lane ───────────────────────────────────────────────────────────
  {
    id: 'folsom-worker-lead',
    name: 'Hector Ramos',
    role: 'Lead carpenter',
    contact: 'h.ramos@castroridge.example.com',
    company: 'Castro Ridge Builders Inc.',
    lane: 'WORKER',
    laneSubtype: 'Laborer',
    joined_at: '2025-10-02',
    invited_by: 'folsom-gc',
    personalizing_detail:
      'Twelve years with Castro Ridge. Runs the framing crew day-to-day. Bilingual; lives in the Excelsior.',
    status: 'active',
  },
  {
    id: 'folsom-worker-apprentice',
    name: 'Aisha Khan',
    role: 'Apprentice carpenter',
    contact: 'a.khan@castroridge.example.com',
    company: 'Castro Ridge Builders Inc.',
    lane: 'WORKER',
    laneSubtype: 'Apprentice',
    joined_at: '2026-03-02',
    invited_by: 'folsom-gc',
    personalizing_detail:
      'Year-2 apprentice via the SF Building Trades program. Layout + pickup carpentry. Aims to test for journeyman by 2027.',
    status: 'active',
  },
];

/** Filter helper: Folsom cast members in a given lane. */
export function folsomCastInLane(lane: Lane): CastMember[] {
  return FOLSOM_CAST.filter((m) => m.lane === lane);
}

// ─── Budget lines (BudgetClient spine shape; Σ = FOLSOM_BUDGET_TOTAL) ────────
//
// CSI-ish divisions from the locked spec. The `state` mix (paid / locked-in /
// estimated / pending) is illustrative; the load-bearing invariant is that the
// AMOUNTS sum to the contract total — see the module-load check below.

const NOW = '2026-06-08T17:00:00.000Z';

function line(
  id: string,
  category: BudgetLine['category'],
  description: string,
  amount: number,
  state: BudgetLine['state'],
  vendor?: string,
): BudgetLine {
  return { id, category, description, amount, state, vendor, createdAt: NOW, updatedAt: NOW };
}

export const FOLSOM_BUDGET_LINES: BudgetLine[] = [
  line('folsom-gc', 'labor', 'General conditions & supervision', 224_000, 'locked-in', 'Castro Ridge Builders'),
  line('folsom-site-foundation', 'subcontractors', 'Site & foundation (podium slab + shoring)', 320_000, 'paid', 'Bay Cut Concrete & Shoring'),
  line('folsom-structure', 'subcontractors', 'Structure & framing', 512_000, 'locked-in', 'Twin Peaks Framing'),
  line('folsom-envelope', 'materials', 'Envelope — roof, windows, cladding', 384_000, 'estimated'),
  line('folsom-mep', 'subcontractors', 'MEP — mechanical, electrical, plumbing', 480_000, 'estimated'),
  line('folsom-interiors', 'materials', 'Interiors & finishes', 576_000, 'pending'),
  line('folsom-kitchens-baths', 'materials', 'Kitchens & baths (×4 units)', 320_000, 'pending'),
  line('folsom-soft-costs', 'admin', 'Permits, fees & soft costs', 224_000, 'paid', 'San Francisco DBI'),
  line('folsom-contingency', 'other', 'Contingency', 160_000, 'pending'),
];

/** Sum of all budget lines — invariant must equal FOLSOM_BUDGET_TOTAL. */
export const FOLSOM_BUDGET_BASE_TOTAL = FOLSOM_BUDGET_LINES.reduce((s, l) => s + l.amount, 0);

// ─── Owner-lens content (mirrors MARIN_OWNER_LENS, light first pass) ─────────
//
// Reuses the OwnerLens shapes from the Marin module so any Owner Lens surface
// can read either project the same way. Amounts fit inside the budget lines
// above (a framing pay-app and a change order, both within scope).

export interface FolsomOwnerContribution {
  id: string;
  kind: 'photo' | 'sketch' | 'receipt' | 'note';
  title: string;
  description: string;
  asset_path: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface FolsomOwnerApproval {
  id: string;
  title: string;
  description: string;
  amount?: number;
  routes_to: string;
  kind: 'pay_app' | 'change_order' | 'selection' | 'rfi';
  submitted_at: string;
  age_days: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface FolsomOwnerLens {
  cast_ids: string[];
  welcome_message: string;
  contributions: FolsomOwnerContribution[];
  pending_approvals: FolsomOwnerApproval[];
}

export const FOLSOM_OWNER_LENS: FolsomOwnerLens = {
  cast_ids: ['folsom-owner-dolores'],
  welcome_message:
    "Dolores Built here. This is our third small-lot infill in the Mission and we run lean — keep the draws clean, flag schedule risk on the stacked units early, and tell us about a change order before it shows up in the pay app. Appreciate the team's work getting the podium in.",
  contributions: [
    {
      id: 'folsom-contrib-massing',
      kind: 'sketch',
      title: 'Preferred massing option — street elevation',
      description:
        'The massing option Dolores Built signed off on: four stories, recessed top floor, ground-floor garage with storefront glazing. Confirming before the envelope package locks.',
      asset_path: '/uploads/folsom/folsom-massing-option.png',
      uploaded_by: 'folsom-owner-dolores',
      uploaded_at: '2026-05-30T18:00:00.000Z',
    },
    {
      id: 'folsom-contrib-light-well',
      kind: 'note',
      title: 'Light-well daylight — keep the mid-unit windows',
      description:
        'Note from the developer: protect the light well that brings daylight to the interior bedrooms of the mid units. Do not value-engineer it out of the envelope line.',
      asset_path: '/uploads/folsom/folsom-light-well-note.txt',
      uploaded_by: 'folsom-owner-dolores',
      uploaded_at: '2026-05-22T16:30:00.000Z',
    },
  ],
  pending_approvals: [
    {
      id: 'folsom-approval-payapp-framing',
      title: 'Pay Application #3 — Framing (residential floors)',
      description:
        'Twin Peaks Framing pay app for the residential-floor framing draw. Routes back to Castro Ridge once signed and triggers the lender draw package.',
      amount: 96_000,
      routes_to: 'folsom-sub-framing',
      kind: 'pay_app',
      submitted_at: '2026-06-02T16:00:00.000Z',
      age_days: 6,
      status: 'pending',
    },
    {
      id: 'folsom-approval-co-roofdeck',
      title: 'Change Order #001 — Top-floor roof decks',
      description:
        'Adds private roof decks to the two top-floor units (membrane, pavers, guardrail). Dogpatch Design has signed; awaiting owner sign-off before issuing to Ocean Beach Roofing. Priced against the envelope line.',
      amount: 38_500,
      routes_to: 'folsom-gc',
      kind: 'change_order',
      submitted_at: '2026-06-04T19:30:00.000Z',
      age_days: 4,
      status: 'pending',
    },
  ],
};

// ─── Load-time invariants (throw-free; warn on drift, like Marin) ────────────
//
// "Demo data must reconcile everywhere" is a locked rule. These checks surface
// in tsc/dev if the locked numbers ever drift. They mirror the Marin cast-count
// guard and add the budget reconciliation the spec calls the load-bearing one.

const _FOLSOM_SUM_PARTS = FOLSOM_BUDGET_SPENT + FOLSOM_BUDGET_COMMITTED + FOLSOM_BUDGET_REMAINING;
const _folsomOwnerCount = FOLSOM_CAST.filter((m) => m.lane === 'OWNER').length;
const _folsomGcCount = FOLSOM_CAST.filter((m) => m.lane === 'GC').length;

if (process.env.NODE_ENV !== 'production') {
  // INVARIANT: SPENT + COMMITTED + REMAINING = TOTAL = Σ(budget lines) = 3,200,000.
  if (_FOLSOM_SUM_PARTS !== FOLSOM_BUDGET_TOTAL) {
    console.warn(
      `[sf-fourplex] budget split drift: spent+committed+remaining=${_FOLSOM_SUM_PARTS} ` +
        `(expect TOTAL=${FOLSOM_BUDGET_TOTAL})`,
    );
  }
  if (FOLSOM_BUDGET_BASE_TOTAL !== FOLSOM_BUDGET_TOTAL) {
    console.warn(
      `[sf-fourplex] budget lines drift: Σ(lines)=${FOLSOM_BUDGET_BASE_TOTAL} ` +
        `(expect TOTAL=${FOLSOM_BUDGET_TOTAL})`,
    );
  }
  // One developer entity, one GC — matches the spec cast.
  if (_folsomOwnerCount !== 1 || _folsomGcCount !== 1) {
    console.warn(
      `[sf-fourplex] cast lane counts drift: OWNER=${_folsomOwnerCount} (expect 1), GC=${_folsomGcCount} (expect 1)`,
    );
  }
}
