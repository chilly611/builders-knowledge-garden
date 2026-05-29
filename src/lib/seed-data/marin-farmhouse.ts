/**
 * Marin Farmhouse — Canonical Demo Seed
 * =====================================
 *
 * The SINGLE source of truth for the Marin Farmhouse demo project. Every
 * page in the app reads these values (directly or via the
 * `getCanonicalProject()` helper at `@/lib/projects/getCanonicalProject`).
 * If a number on screen mentions this project, it MUST come from here.
 *
 * History — 2026-05-28: this file was reinstated as canonical after a
 * brief stint where `src/lib/demo/marin-4000.ts` held the source of
 * truth. Today `marin-4000.ts` is a thin re-export shim that points at
 * this module; older imports continue to work. Pages that need the
 * structured `KacProject` shape used by the chrome should call
 * `getCanonicalProject()` rather than reach in here directly.
 *
 * Editing rules:
 *   - Treat values below as the contract. Do not introduce mirror
 *     constants in other files.
 *   - If a page needs a derived shape, build it from these primitives
 *     (see `getCanonicalProject`).
 *   - Keep the DB row at `command_center_projects[55730cd3-…]` aligned
 *     when these numbers change (migration:
 *     `supabase/migrations/20260528_marin_demo_canonical.sql`).
 */

import type { BudgetLine } from '@/app/killerapp/budget/budget-storage';

// ─── Identity ───────────────────────────────────────────────────────────────

/** Allowlisted demo project UUID. Mirrors DEMO_PROJECT_IDS in the projects route. */
export const MARIN_PROJECT_ID = '55730cd3-5225-493d-8b5c-49086d942565';

/** Display name — every page MUST use this exact string. */
export const MARIN_PROJECT_NAME = 'Modern Farmhouse in Marin';

/** Client family. */
export const MARIN_CLIENT_NAME = 'The Harwell Family';

/** Marketing-jurisdiction string (what the chrome shows). */
export const MARIN_LOCATION = 'Marin County, CA';

/** Live code-lookup jurisdiction wired into the demo. */
export const MARIN_CODE_JURISDICTION = 'San Francisco, CA';

/** Architectural style description used on cards and headers. */
export const MARIN_STYLE = 'Custom farmhouse, 2 story';

// ─── Geometry ───────────────────────────────────────────────────────────────

/** Square footage — the number every page must display. */
export const MARIN_SQFT = 4_000;
export const MARIN_SQFT_DISPLAY = '4,000';

export const MARIN_BEDROOMS = 4;
export const MARIN_BATHROOMS = 3;

// ─── Budget ─────────────────────────────────────────────────────────────────

/** Contract total. */
export const MARIN_BUDGET_TOTAL = 1_650_000;

/** Spent to date — cash already out the door. */
export const MARIN_BUDGET_SPENT = 312_400;

/** Committed — locked-in subs and POs, not yet billed. */
export const MARIN_BUDGET_COMMITTED = 186_200;

/** Remaining — pending lines that are still floating. */
export const MARIN_BUDGET_REMAINING = MARIN_BUDGET_TOTAL - MARIN_BUDGET_SPENT - MARIN_BUDGET_COMMITTED;

/**
 * Headroom — the founder-locked projected favorable variance against the
 * $1.65M contract. Sits inside `MARIN_BUDGET_REMAINING` as the cushion the
 * Harwells should still have at substantial completion if the team holds
 * the line on change orders. Distinct from `MARIN_BUDGET_REMAINING` —
 * remaining is "what hasn't been spent or committed yet"; headroom is
 * "what we expect to walk away with under the locked contract." Drift
 * here = bug.
 */
export const MARIN_BUDGET_HEADROOM = 347_000;

// ─── Income (draws) ─────────────────────────────────────────────────────────

/** Projected total over 16 scheduled draws. */
export const MARIN_INCOME_PROJECTED = 1_485_000;

/** Actual income received across the 5 closed draws. */
export const MARIN_INCOME_RECEIVED = 495_000;

/** Total scheduled draws across the build. */
export const MARIN_DRAWS_TOTAL = 16;

/** Draws closed (paid) to date. */
export const MARIN_DRAWS_CLOSED = 5;

// ─── Schedule ───────────────────────────────────────────────────────────────

/** Build start. */
export const MARIN_START_DATE = '2026-03-18';

/** Substantial completion target. */
export const MARIN_SUBSTANTIAL_COMPLETION = '2026-12-04';

/** Per-stage completion percentage (Size Up → Reflect). */
export const MARIN_STAGE_COMPLETION: Record<number, number> = {
  1: 100, // Size Up
  2: 100, // Lock
  3: 85,  // Plan
  4: 42,  // Build
  5: 0,   // Adapt
  6: 0,   // Collect
  7: 0,   // Reflect
};

// ─── Materials lockset ──────────────────────────────────────────────────────

export const MARIN_MATERIALS: ReadonlyArray<string> = [
  'Standing seam metal roof',
  'Engineered hardwood',
  'Engineered quartz counters',
  'Spray foam insulation',
  'Black-frame windows',
  'Fiber cement siding',
  'Shiplap interior',
  'Slab-on-grade foundation',
  'Heat pump HVAC',
  'Tankless water heater',
];

// ─── Project record (matches the legacy MarinProjectRecord shape) ───────────

export interface MarinProjectRecord {
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

export const MARIN_PROJECT: MarinProjectRecord = {
  id: MARIN_PROJECT_ID,
  name: MARIN_PROJECT_NAME,
  client_name: MARIN_CLIENT_NAME,
  jurisdiction: MARIN_LOCATION,
  code_jurisdiction: MARIN_CODE_JURISDICTION,
  sqft: MARIN_SQFT_DISPLAY,
  project_type: `Custom farmhouse — 2 story, ${MARIN_SQFT_DISPLAY} sqft`,
  estimated_cost_low: 1_550_000,
  estimated_cost_high: 1_780_000,
};

// ─── Team (replaces the John Doe / Jane Smith mocks elsewhere) ──────────────

export interface MarinTeamMember {
  id: string;
  name: string;
  trade: string;
  status: 'active' | 'inactive';
  contact: string;
  company?: string;
}

export const MARIN_TEAM: MarinTeamMember[] = [
  { id: 't-builder', name: 'Marcus Rivera', trade: 'General Contractor', status: 'active', contact: 'marcus@riveraconstruction.com', company: 'Rivera Construction LLC' },
  { id: 't-framing', name: 'Ridgeline Framing', trade: 'Framing', status: 'active', contact: 'ops@ridgelineframing.com' },
  { id: 't-concrete', name: 'Tamalpais Concrete', trade: 'Foundation & Concrete', status: 'active', contact: 'estimates@tamalpaisconcrete.com' },
  { id: 't-roofing', name: 'Bay Roofing Co.', trade: 'Roofing', status: 'active', contact: 'jobs@bayroofing.com' },
  { id: 't-architect', name: 'Field Studio Architects', trade: 'Architecture & Structural', status: 'active', contact: 'studio@fieldstudio.co' },
  { id: 't-client', name: 'The Harwell Family', trade: 'Client', status: 'active', contact: 'harwell.family@example.com' },
];

// ─── Multi-Lane Cast (project-role lanes for Lane Lens views) ────────────────
//
// `MARIN_CAST` is the full project cast keyed by the six BKG project-role
// lanes: OWNER, GC, SUB, SERVICE-PROVIDER, SUPPLIER, WORKER. These are
// distinct from the platform's four business-model lanes (Admin / Pro /
// Public / Machine) — they describe who someone IS on this specific build.
//
// `MARIN_TEAM` above stays as the work-relevant 6-row team list every page
// already consumes (the Harwells appear as a single family entry there).
// `MARIN_CAST` is the richer source-of-truth for new Lane Lens surfaces
// (Owner Lens, Sub Lens, etc.) and reuses the same team IDs where they
// align — so a future "this person on every page" reconciliation can
// collapse the two without ID churn.

/** The six BKG project-role lanes. NOT the platform's business lanes. */
export type Lane =
  | 'OWNER'
  | 'GC'
  | 'SUB'
  | 'SERVICE-PROVIDER'
  | 'SUPPLIER'
  | 'WORKER';

/**
 * Lane subtype narrows a generic lane to a specific role. Examples:
 *   - SUB → Framing | Foundation | Roofing | Plumbing | Electrical
 *   - SERVICE-PROVIDER → Architect | Engineer
 *   - SUPPLIER → Lumber | Windows
 *   - WORKER → Laborer | Apprentice
 *
 * `null` for lanes where the lane name is the whole story (OWNER, GC).
 */
export type LaneSubtype =
  | 'Architect'
  | 'Engineer'
  | 'Framing'
  | 'Foundation'
  | 'Roofing'
  | 'Plumbing'
  | 'Electrical'
  | 'Lumber'
  | 'Windows'
  | 'Laborer'
  | 'Apprentice'
  | null;

export interface CastMember {
  /** Stable ID. Matches `MARIN_TEAM[].id` where the cast member also appears there. */
  id: string;
  /** Person or company name as it should display. */
  name: string;
  /** Plain-English role description (e.g., "Plumbing — rough + finish"). */
  role: string;
  /** Primary contact (email by convention; fake but plausible domain). */
  contact: string;
  /** Company affiliation if the row is a person; omit for company-as-cast. */
  company?: string;
  /** Project-role lane. */
  lane: Lane;
  /** Lane subtype, or `null` when the lane name is the whole story. */
  laneSubtype: LaneSubtype;
  /** ISO date the cast member joined the project. */
  joined_at: string;
  /**
   * Stable id of whoever invited them — another cast member's id, or
   * the string `'founder'` for the original project-team seeds.
   */
  invited_by: string;
  /** One short personalizing detail. Drives the "human" texture in cast cards. */
  personalizing_detail: string;
  /** Active on the build today? */
  status: 'active' | 'inactive';
}

/**
 * The full 14-member project cast. Order is roughly the order each lane
 * came on board: Owners first, then GC, then subs in trade sequence,
 * then service providers, suppliers, and workers.
 *
 * Invariant: every `id` here that matches an id in `MARIN_TEAM` must
 * agree on name + contact. Drift = bug.
 */
export const MARIN_CAST: CastMember[] = [
  // ── OWNER lane ────────────────────────────────────────────────────────────
  {
    id: 'owner-cody-harwell',
    name: 'Cody Harwell',
    role: 'Project owner',
    contact: 'cody.harwell@example.com',
    lane: 'OWNER',
    laneSubtype: null,
    joined_at: '2025-09-12',
    invited_by: 'founder',
    personalizing_detail:
      'Lives in Mill Valley, three kids, this is their first custom build. Runs a small UX studio in San Francisco. Wants weekly Saturday walk-throughs and a Slack-style daily log.',
    status: 'active',
  },
  {
    id: 'owner-sara-harwell',
    name: 'Sara Harwell',
    role: 'Project owner',
    contact: 'sara.harwell@example.com',
    lane: 'OWNER',
    laneSubtype: null,
    joined_at: '2025-09-12',
    invited_by: 'founder',
    personalizing_detail:
      'Pediatrician at Marin General. Cares most about natural light, kid-safe stairs, and a south-facing herb garden. Decision-maker on finishes and fixtures.',
    status: 'active',
  },

  // ── GC lane ───────────────────────────────────────────────────────────────
  {
    id: 't-builder',
    name: 'Marcus Rivera',
    role: 'General Contractor',
    contact: 'marcus@riveraconstruction.com',
    company: 'Rivera Construction LLC',
    lane: 'GC',
    laneSubtype: null,
    joined_at: '2025-10-04',
    invited_by: 'owner-cody-harwell',
    personalizing_detail:
      'Marin native, third-generation builder. Crew of seven. Has built four custom farmhouses in the county. Direct, no-drama communicator — prefers a single weekly client meeting over daily check-ins.',
    status: 'active',
  },

  // ── SUB lane ──────────────────────────────────────────────────────────────
  {
    id: 't-framing',
    name: 'Ridgeline Framing',
    role: 'Framing — rough carpentry',
    contact: 'ops@ridgelineframing.com',
    lane: 'SUB',
    laneSubtype: 'Framing',
    joined_at: '2025-11-22',
    invited_by: 't-builder',
    personalizing_detail:
      'Petaluma shop run by crew lead Diego Salas. Booked for the Jul 7 framing start; loses the slot if the lumber package isn\'t released this week.',
    status: 'active',
  },
  {
    id: 't-concrete',
    name: 'Tamalpais Concrete',
    role: 'Foundation & concrete',
    contact: 'estimates@tamalpaisconcrete.com',
    lane: 'SUB',
    laneSubtype: 'Foundation',
    joined_at: '2025-11-22',
    invited_by: 't-builder',
    personalizing_detail:
      'Wrapped the slab pour on May 14 — clean job, zero callbacks. Specializes in hillside slab + retaining-wall details across Marin and Sonoma.',
    status: 'active',
  },
  {
    id: 't-roofing',
    name: 'Bay Roofing Co.',
    role: 'Roofing & weatherproofing',
    contact: 'jobs@bayroofing.com',
    lane: 'SUB',
    laneSubtype: 'Roofing',
    joined_at: '2025-12-10',
    invited_by: 't-builder',
    personalizing_detail:
      'Specializes in standing-seam metal — the locked roofing spec. 12-week backlog; their slot is sequenced behind Ridgeline framing.',
    status: 'active',
  },
  {
    id: 't-plumbing',
    name: 'Larkspur Plumbing & Mechanical',
    role: 'Plumbing — rough + finish',
    contact: 'bids@larkspurpm.com',
    lane: 'SUB',
    laneSubtype: 'Plumbing',
    joined_at: '2026-02-18',
    invited_by: 't-builder',
    personalizing_detail:
      'Family shop in Larkspur. Known for tankless heat-pump combinations on Marin custom builds. Owner Tom Larkin has done three jobs with Rivera Construction.',
    status: 'active',
  },
  {
    id: 't-electrical',
    name: 'North Bay Electric Co.',
    role: 'Electrical — rough + finish',
    contact: 'service@northbayelectric.com',
    lane: 'SUB',
    laneSubtype: 'Electrical',
    joined_at: '2026-02-18',
    invited_by: 't-builder',
    personalizing_detail:
      'C-10 contractor based in San Rafael. EV-charger circuits and solar-ready rough-in are standard on every panel they install. Lead estimator: Priya Suresh.',
    status: 'active',
  },

  // ── SERVICE-PROVIDER lane ─────────────────────────────────────────────────
  {
    id: 't-architect',
    name: 'Field Studio Architects',
    role: 'Design architect',
    contact: 'studio@fieldstudio.co',
    lane: 'SERVICE-PROVIDER',
    laneSubtype: 'Architect',
    joined_at: '2025-08-06',
    invited_by: 'owner-cody-harwell',
    personalizing_detail:
      'Sausalito firm, principal Jordan Ng, AIA. Drew the four farmhouse iterations the Harwells loved. Comes to weekly OAC meetings; flags finish drift early.',
    status: 'active',
  },
  {
    id: 'svc-structural',
    name: 'Headlands Structural Engineering',
    role: 'Structural engineer of record',
    contact: 'pe@headlandsstructural.com',
    lane: 'SERVICE-PROVIDER',
    laneSubtype: 'Engineer',
    joined_at: '2025-09-29',
    invited_by: 't-architect',
    personalizing_detail:
      'PE Aileen Cortez stamped the framing package. Specializes in Marin hillside slab + shear-wall details and coastal wind-load calcs. Two-day turnaround on RFIs.',
    status: 'active',
  },

  // ── SUPPLIER lane ─────────────────────────────────────────────────────────
  {
    id: 'sup-lumber',
    name: 'Golden Gate Lumber & Building Supply',
    role: 'Lumber & sheathing supplier',
    contact: 'orders@goldengatelumber.com',
    lane: 'SUPPLIER',
    laneSubtype: 'Lumber',
    joined_at: '2026-03-04',
    invited_by: 't-builder',
    personalizing_detail:
      'San Rafael yard. Doug fir + LVL stock. Currently quoting 4–6 week lead time on the engineered framing members for the 2-story span — driving the framing-lumber attention item.',
    status: 'active',
  },
  {
    id: 'sup-windows',
    name: 'Marvin',
    role: 'Window & exterior-door supplier',
    contact: 'quote@marvin.com',
    lane: 'SUPPLIER',
    laneSubtype: 'Windows',
    joined_at: '2026-03-04',
    invited_by: 't-architect',
    personalizing_detail:
      'Coastal-spec Ultimate line specified for the black-frame elevations. 8–12 week lead time — needs release this week to hit weather-tight before the fall rains.',
    status: 'active',
  },

  // ── WORKER lane ───────────────────────────────────────────────────────────
  {
    id: 'wk-jose',
    name: 'José Hernández',
    role: 'Site laborer',
    contact: 'j.hernandez@riveraconstruction.com',
    company: 'Rivera Construction LLC',
    lane: 'WORKER',
    laneSubtype: 'Laborer',
    joined_at: '2026-03-18',
    invited_by: 't-builder',
    personalizing_detail:
      'Eight years on Rivera\'s crew. Site cleanup, small-format demo, material staging. Native Spanish speaker; bilingual. Lives in San Rafael, ten minutes from site.',
    status: 'active',
  },
  {
    id: 'wk-daniel',
    name: 'Daniel Park',
    role: 'Site laborer / apprentice carpenter',
    contact: 'd.park@riveraconstruction.com',
    company: 'Rivera Construction LLC',
    lane: 'WORKER',
    laneSubtype: 'Apprentice',
    joined_at: '2026-04-22',
    invited_by: 't-builder',
    personalizing_detail:
      'Year-1 apprentice via the Marin Builders Exchange program. Pre-framing prep + pickup carpentry. Aims to test for journeyman by 2028.',
    status: 'active',
  },
];

/** Filter helper: cast members in a given lane. */
export function castInLane(lane: Lane): CastMember[] {
  return MARIN_CAST.filter((m) => m.lane === lane);
}

/** Sanity invariants. Throws at module load if any drift; surfaces in tsc/dev. */
const _ownerCount = MARIN_CAST.filter((m) => m.lane === 'OWNER').length;
const _gcCount = MARIN_CAST.filter((m) => m.lane === 'GC').length;
const _workerCount = MARIN_CAST.filter((m) => m.lane === 'WORKER').length;
if (process.env.NODE_ENV !== 'production') {
  // Two Harwells, one Rivera, two laborers — matches the brief.
  if (_ownerCount !== 2 || _gcCount !== 1 || _workerCount !== 2) {
    // eslint-disable-next-line no-console
    console.warn(
      `[marin-farmhouse] cast lane counts drift: OWNER=${_ownerCount} (expect 2), GC=${_gcCount} (expect 1), WORKER=${_workerCount} (expect 2)`,
    );
  }
}

// ─── Owner Lens — per-Lane content for the Harwells ──────────────────────────
//
// First per-Lane data block. Read by the Owner Lens surface (planned) to
// render the homeowner's personalized view of the project: their welcome
// message, what they've uploaded to the build, and what's waiting on
// their approval.
//
// Each Sub / Service-Provider / Supplier lane will get a parallel block
// as those surfaces come online. Owner is shipping first because the
// dogfood demo walks an Owner Lens path.

export interface OwnerContribution {
  id: string;
  kind: 'photo' | 'sketch' | 'receipt' | 'note';
  title: string;
  description: string;
  /** Stub asset path under `/public/uploads/marin/`. File need not exist yet. */
  asset_path: string;
  uploaded_by: 'owner-cody-harwell' | 'owner-sara-harwell';
  uploaded_at: string;
}

export interface OwnerApproval {
  id: string;
  /** Plain-English headline shown in the approval card. */
  title: string;
  /** One-line context for what they're being asked to approve. */
  description: string;
  /** Dollar amount in scope, if any. */
  amount?: number;
  /** Who the approval will route to (cast member id) once signed. */
  routes_to: string;
  /** What kind of approval this is — drives the card icon and CTA. */
  kind: 'pay_app' | 'change_order' | 'selection' | 'rfi';
  submitted_at: string;
  /** Days the approval has been sitting; surfaces aging badges. */
  age_days: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface OwnerLens {
  /** Cast member ids whose welcome message + contributions render here. */
  cast_ids: string[];
  /** First-person welcome message written by the Harwells at kickoff. */
  welcome_message: string;
  /** Files / notes the Harwells have added to the build. */
  contributions: OwnerContribution[];
  /** Items waiting on owner signature / decision. */
  pending_approvals: OwnerApproval[];
}

export const MARIN_OWNER_LENS: OwnerLens = {
  cast_ids: ['owner-cody-harwell', 'owner-sara-harwell'],
  welcome_message:
    "We're Cody and Sara — and we're thrilled to finally build the place our three kids will grow up in. We picked this team because we trust them, and we want this to feel like a partnership, not a transaction. Keep us looped in on the calls we need to make, flag the trade-offs early, and don't be shy with bad news — we'd rather hear it on Tuesday than read it in a change order on Friday. Thank you for the work you're doing for our family.",
  contributions: [
    {
      id: 'owner-contrib-paint-chip',
      kind: 'photo',
      title: 'Farrow & Ball Pavilion Gray — exterior trim swatch',
      description:
        "Photo Sara took at the showroom. They're leaning toward Pavilion Gray for the exterior trim with a softer white on the siding. Wanted to confirm with the architect before locking the finish schedule.",
      asset_path: '/uploads/marin/harwell-paint-chip-pavilion-gray.jpg',
      uploaded_by: 'owner-sara-harwell',
      uploaded_at: '2026-05-12T18:22:00.000Z',
    },
    {
      id: 'owner-contrib-garden-sketch',
      kind: 'sketch',
      title: 'South-facing herb garden — freehand layout',
      description:
        'Sara\'s sketch of the herb garden she wants tucked against the south wall: raised cedar beds, drip irrigation tied into the rainwater cistern, room for the kids to pick basil from the kitchen door. Wants the landscape line item to leave room for this.',
      asset_path: '/uploads/marin/harwell-garden-sketch.png',
      uploaded_by: 'owner-sara-harwell',
      uploaded_at: '2026-05-04T20:15:00.000Z',
    },
    {
      id: 'owner-contrib-ferguson-receipt',
      kind: 'receipt',
      title: 'Ferguson showroom visit — fixture candidates',
      description:
        'Receipt from the Ferguson visit on Sat May 16. Pulled-down kitchen faucet candidates + a master-bath rain head they liked. Total tagged for selection cards: $1,247. Asking the team to price the finalists in the next finishes pass.',
      asset_path: '/uploads/marin/harwell-ferguson-receipt-2026-05-16.pdf',
      uploaded_by: 'owner-cody-harwell',
      uploaded_at: '2026-05-16T22:48:00.000Z',
    },
  ],
  pending_approvals: [
    {
      id: 'owner-approval-payapp-04-framing',
      title: 'Pay Application #4 — Framing milestone',
      description:
        'Ridgeline Framing pay app for the framing-start mobilization + first 30% draw. Routes back to Rivera Construction once signed and triggers the lender draw package.',
      amount: 48_200,
      routes_to: 't-framing',
      kind: 'pay_app',
      submitted_at: '2026-05-19T16:00:00.000Z',
      age_days: 9,
      status: 'pending',
    },
    {
      id: 'owner-approval-co-002-kitchen-island',
      title: 'Change Order #002 — Kitchen island expansion',
      description:
        'Enlarges the kitchen island from the locked 6ft to 9ft and adds a prep sink. Pricing includes plumbing rough-in re-run and a quartz upgrade to span the new length. Field Studio has signed; awaiting owner sign-off before issuing to subs.',
      amount: 14_800,
      routes_to: 't-builder',
      kind: 'change_order',
      submitted_at: '2026-05-22T19:30:00.000Z',
      age_days: 6,
      status: 'pending',
    },
  ],
};

// ─── AI Attention Items (curated AI COO surface) ────────────────────────────

export interface MarinAttentionItem {
  id: string;
  title: string;
  body: string;
  urgency: 'red' | 'yellow' | 'green';
}

export const MARIN_ATTENTION_ITEMS: MarinAttentionItem[] = [
  {
    id: 'marin-att-framing-lumber',
    title: 'Order Framing Lumber Now — Jul 7 Framing Milestone at Risk',
    urgency: 'red',
    body: "The $128K framing lumber & sheathing package is still only estimated, not ordered. North Bay yards are quoting 4-6 week lead times on the engineered members for a 2-story span — order this week or the Jul 7 framing start (and Ridgeline's crew slot) slips, burning ~$9.5K/week in general conditions.",
  },
  {
    id: 'marin-att-foundation-inspection',
    title: 'Schedule Marin County Foundation Inspection Before Framing',
    urgency: 'red',
    body: 'Foundation & concrete wrapped on the May 14 milestone, but framing cannot legally start until Marin County DPW signs off the foundation/setback inspection. Book it now — county inspection backlogs run 5-8 business days and a miss stalls Ridgeline Framing at the gate.',
  },
  {
    id: 'marin-att-windows-leadtime',
    title: 'Release the Marvin Window Order — 8-12 Week Lead',
    urgency: 'yellow',
    body: 'The $115K Marvin window & exterior-door package is still estimated. Coastal-spec units for a custom farmhouse run 8-12 weeks; if not released now they become the bottleneck at dry-in and push the weather-tight date into the fall rains.',
  },
  {
    id: 'marin-att-finishes-allowances',
    title: 'Lock Finish Allowances With the Harwells',
    urgency: 'yellow',
    body: 'Interior finishes ($268K) are pending and unselected — the single largest line and the usual source of overruns. With $1.15M of headroom on the $1.65M budget, confirm flooring/cabinet/counter allowances with the Harwell family before selections drift and eat the contingency.',
  },
  {
    id: 'marin-att-draw-foundation',
    title: 'Prep the Foundation-Milestone Draw',
    urgency: 'yellow',
    body: 'Foundation is complete and ~$312K is billed against the $1.65M contract. Assemble the foundation-milestone draw package now so it is ready the day the inspection passes — lenders typically need 5-7 business days plus a site inspection, and a lag stalls framing cash flow.',
  },
  {
    id: 'marin-att-on-budget',
    title: 'On Budget Through Foundation — $1.65M Holding',
    urgency: 'green',
    body: 'The Modern Farmhouse in Marin is tracking on budget at 19% spent, inside the $1.55M-$1.78M estimate, with foundation landing at the locked-in $165K. A clean signal entering the framing phase — hold the line on change orders to protect the $1.15M remaining.',
  },
];

// ─── Budget lines (BudgetClient spine shape) ────────────────────────────────

const NOW = '2026-05-20T17:00:00.000Z';

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

export const MARIN_BUDGET_LINES: BudgetLine[] = [
  line('marin-permits', 'permits', 'Marin County building permits + school fees', 38_000, 'paid', 'Marin County DPW'),
  line('marin-arch', 'admin', 'Architecture & structural engineering', 78_000, 'paid', 'Field Studio Architects'),
  line('marin-gc', 'labor', 'GC general conditions & supervision', 140_000, 'locked-in'),
  line('marin-foundation', 'subcontractors', 'Foundation & concrete', 165_000, 'locked-in', 'Tamalpais Concrete'),
  line('marin-framing-labor', 'subcontractors', 'Framing — rough carpentry', 175_000, 'locked-in', 'Ridgeline Framing'),
  line('marin-framing-mat', 'materials', 'Framing lumber & sheathing', 128_000, 'estimated'),
  line('marin-roofing', 'subcontractors', 'Roofing & weatherproofing', 72_000, 'estimated', 'Bay Roofing Co.'),
  line('marin-electrical', 'subcontractors', 'Electrical — rough + finish', 104_000, 'estimated'),
  line('marin-plumbing', 'subcontractors', 'Plumbing — rough + finish', 100_000, 'estimated'),
  line('marin-hvac', 'subcontractors', 'HVAC & ductwork', 64_000, 'estimated'),
  line('marin-windows', 'materials', 'Windows & exterior doors', 115_000, 'estimated', 'Marvin'),
  line('marin-drywall', 'subcontractors', 'Insulation & drywall', 66_000, 'estimated'),
  line('marin-finishes', 'materials', 'Interior finishes — flooring, cabinets, counters', 268_000, 'pending'),
  line('marin-siding', 'subcontractors', 'Exterior siding & stucco', 60_000, 'pending'),
  line('marin-equipment', 'equipment', 'Crane & equipment rental', 28_000, 'estimated'),
  line('marin-landscape', 'subcontractors', 'Landscape & hardscape', 49_000, 'pending'),
];

/** Sum of all budget lines — invariant must equal MARIN_BUDGET_TOTAL. */
export const MARIN_BUDGET_BASE_TOTAL = MARIN_BUDGET_LINES.reduce((s, l) => s + l.amount, 0);

// ─── Sequencing (Plan stage drag-drop) ──────────────────────────────────────

export interface PlanPhase {
  id: string;
  name: string;
  trade: string;
  /** Sequential duration in weeks if run on its own. */
  weeks: number;
  /**
   * Phases sharing a non-null parallelGroup AND ending up adjacent in the
   * order run concurrently — the run counts as max(weeks) once instead of
   * the sum. This is what makes reordering change the timeline (and budget).
   */
  parallelGroup: string | null;
  icon: string;
}

export const MARIN_PLAN_PHASES: PlanPhase[] = [
  { id: 'site-prep', name: 'Site prep & excavation', trade: 'Sitework', weeks: 3, parallelGroup: null, icon: '🚜' },
  { id: 'foundation', name: 'Foundation & concrete', trade: 'Concrete', weeks: 4, parallelGroup: null, icon: '🧱' },
  { id: 'framing', name: 'Framing', trade: 'Carpentry', weeks: 10, parallelGroup: null, icon: '🪚' },
  { id: 'dry-in', name: 'Roofing & dry-in', trade: 'Roofing', weeks: 3, parallelGroup: null, icon: '🏠' },
  { id: 'rough-elec', name: 'Rough electrical', trade: 'Electrical', weeks: 3, parallelGroup: 'mep', icon: '⚡' },
  { id: 'rough-plumb', name: 'Rough plumbing', trade: 'Plumbing', weeks: 3, parallelGroup: 'mep', icon: '🚿' },
  { id: 'rough-hvac', name: 'Rough HVAC', trade: 'Mechanical', weeks: 2, parallelGroup: 'mep', icon: '🌡️' },
  { id: 'insul-drywall', name: 'Insulation & drywall', trade: 'Drywall', weeks: 4, parallelGroup: null, icon: '🧰' },
  { id: 'finishes', name: 'Interior finishes', trade: 'Finish carpentry', weeks: 6, parallelGroup: null, icon: '🪟' },
  { id: 'exterior', name: 'Exterior siding & landscape', trade: 'Exterior', weeks: 4, parallelGroup: 'exterior', icon: '🌿' },
];

/** General-conditions burn per calendar week of schedule. */
export const WEEKLY_OVERHEAD = 9_500;

export interface ScheduleResult {
  totalWeeks: number;
  overheadCost: number;
  weeksSavedByParallel: number;
}

export function computeSchedule(phases: PlanPhase[]): ScheduleResult {
  let totalWeeks = 0;
  let i = 0;
  while (i < phases.length) {
    const group = phases[i].parallelGroup;
    if (group) {
      let runMax = phases[i].weeks;
      let j = i + 1;
      while (j < phases.length && phases[j].parallelGroup === group) {
        runMax = Math.max(runMax, phases[j].weeks);
        j++;
      }
      totalWeeks += runMax;
      i = j;
    } else {
      totalWeeks += phases[i].weeks;
      i++;
    }
  }
  const sequentialWeeks = phases.reduce((s, p) => s + p.weeks, 0);
  return {
    totalWeeks,
    overheadCost: totalWeeks * WEEKLY_OVERHEAD,
    weeksSavedByParallel: sequentialWeeks - totalWeeks,
  };
}

// ─── localStorage seeding ────────────────────────────────────────────────────

function storageKeyFor(projectId: string): string {
  return `bkg-budget-${projectId}`;
}

const ACTIVE_PROJECT_KEY = 'bkg-active-project';

/**
 * Write the Marin budget lines into the BudgetClient localStorage spine so
 * the BudgetRibbon (and the /killerapp/budget page) read the same numbers.
 * Idempotent: only writes if the key is absent.
 */
export function seedMarinBudget(): BudgetLine[] {
  if (typeof window === 'undefined') return MARIN_BUDGET_LINES;
  try {
    const key = storageKeyFor(MARIN_PROJECT_ID);
    const existing = window.localStorage.getItem(key);
    if (!existing) {
      window.localStorage.setItem(key, JSON.stringify(MARIN_BUDGET_LINES));
    }
  } catch {
    /* ignore */
  }
  return MARIN_BUDGET_LINES;
}

/** Point the active-project pointer at the Marin demo. */
export function ensureMarinActive(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, MARIN_PROJECT_ID);
  } catch {
    /* ignore */
  }
}
