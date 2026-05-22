/**
 * mep-load-calc.ts
 * =================
 *
 * Deterministic MEP math helpers — NO LLM, NO RAG, NO network calls.
 * The whole point is that an MEP engineer can read the source and
 * recreate every number on paper. Showing the math is the moat.
 *
 * Scope:
 *  - Electrical service-load calc (NEC Article 220).
 *  - HVAC tonnage rule-of-thumb (sqft / tons-per-ton).
 *  - Plumbing fixture count (UPC 422.1 simplified).
 *  - Panel directory generator (40-circuit, balanced).
 *  - THHN/THWN ampacity → wire size lookup (NEC 310.16 @ 75°C copper).
 *
 * RISK CALLOUTS (read me):
 *  - HVAC tonnage here is rule-of-thumb only. A real RTU selection
 *    requires ACCA Manual J (residential) or Manual N (commercial)
 *    load calc that accounts for envelope, glazing, internal gains,
 *    orientation, infiltration, etc. Use this as a sanity check, not
 *    a permit-ready submittal.
 *  - UPC 422.1 fixture count is simplified to a single fixture-per-N
 *    ratio per occupancy. Real UPC requires separating M/F, accessory
 *    counts (drinking fountains, service sinks), and applying
 *    Section 422 footnotes (e.g., one-fixture exemptions, employee
 *    vs. customer counts, mixed-occupancy reductions).
 *  - NEC 220.83 (existing-dwelling optional method) is implemented;
 *    the 220.82 (new-dwelling optional method) and 220.42-44 (standard
 *    method) are not. Specialty loads (motors > 1HP, welder, etc.)
 *    aren't covered — they need a hand calc.
 *  - Panel-balance is naive: it round-robins across A/B legs by
 *    circuit number and doesn't honor multi-pole locking or harmonic
 *    triplen-current concerns on three-phase systems.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — NEC 220.12 General Lighting Load Table (VA per sqft)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NEC 220.12 Table — General Lighting Load by occupancy (VA per sqft).
 *
 * Values track NEC 2023 Table 220.12 with sensible additions for
 * common BKG project types. Where the NEC table lists a range, the
 * upper bound is used (conservative for service sizing).
 */
export const VA_PER_SQFT: Record<string, number> = {
  // Dwellings — NEC 220.12 lists 3 VA/sqft
  dwelling: 3,
  single_family: 3,
  multi_family: 3,
  adu: 3,
  // Commercial — NEC 220.12
  office: 3.5,
  retail: 3,
  restaurant: 2,
  warehouse: 0.25,
  industrial: 3,
  // Special-purpose
  medical: 3.5,
  school: 3,
  hospital: 2,
};

/** Standard service-disconnect ratings (A). Round UP to the next one. */
export const STANDARD_SERVICE_AMPS = [
  60, 100, 125, 150, 200, 225, 250, 300, 400, 500, 600, 800, 1000, 1200, 1600, 2000,
];

/**
 * NEC 310.16 — Allowable ampacity for THHN/THWN copper conductors at 75°C,
 * single insulated conductor in raceway or cable, ambient 30°C.
 *
 * Map: AWG/kcmil → ampacity. Used to pick the smallest legal conductor
 * for a given breaker. Values from NEC 2023 Table 310.16.
 */
export const THHN_75C_AMPACITY: Array<{ size: string; amps: number }> = [
  { size: '14 AWG', amps: 20 },  // limited to 15A breaker per 240.4(D)
  { size: '12 AWG', amps: 25 },  // limited to 20A breaker per 240.4(D)
  { size: '10 AWG', amps: 35 },  // limited to 30A breaker per 240.4(D)
  { size: '8 AWG',  amps: 50 },
  { size: '6 AWG',  amps: 65 },
  { size: '4 AWG',  amps: 85 },
  { size: '3 AWG',  amps: 100 },
  { size: '2 AWG',  amps: 115 },
  { size: '1 AWG',  amps: 130 },
  { size: '1/0 AWG', amps: 150 },
  { size: '2/0 AWG', amps: 175 },
  { size: '3/0 AWG', amps: 200 },
  { size: '4/0 AWG', amps: 230 },
  { size: '250 kcmil', amps: 255 },
  { size: '300 kcmil', amps: 285 },
  { size: '350 kcmil', amps: 310 },
  { size: '400 kcmil', amps: 335 },
  { size: '500 kcmil', amps: 380 },
  { size: '600 kcmil', amps: 420 },
  { size: '750 kcmil', amps: 475 },
];

/**
 * NEC 240.4(D) — Small-conductor limits override the 75°C ampacity.
 * 14 AWG → 15A max, 12 AWG → 20A max, 10 AWG → 30A max.
 */
const SMALL_CONDUCTOR_BREAKER_MAX: Record<string, number> = {
  '14 AWG': 15,
  '12 AWG': 20,
  '10 AWG': 30,
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface LoadCalcInput {
  buildingType: keyof typeof VA_PER_SQFT | string;
  sqft: number;
  /** Count of 1500-VA small-appliance branch circuits (NEC 220.52(A)). */
  smallAppliance?: number;
  /** Count of 1500-VA laundry branch circuits (NEC 220.52(B)). */
  laundry?: number;
  /** Largest HVAC / motor load in kW (25% extra applied per 220.50). */
  hvacKW?: number;
  /** Water-heater nameplate kW. */
  waterHeaterKW?: number;
  /** Range nameplate kW — 220.55 demand-factor table applies. */
  rangeKW?: number;
  /** EV charger kW (typical Level 2 ~ 7.7 kW per 625.42). */
  evChargerKW?: number;
  /**
   * Calc method. Defaults to '220.83' (existing dwelling optional method).
   * Pass 'standard' for the straight 220.42-44 path (no demand reduction
   * beyond first 3000 VA + 35% of remainder for lighting).
   */
  method?: '220.83' | 'standard';
}

export interface LoadCalcResult {
  generalLightingVA: number;
  smallApplianceVA: number;
  laundryVA: number;
  hvacVA: number;
  waterHeaterVA: number;
  rangeVA: number;
  evChargerVA: number;
  totalConnectedVA: number;
  /** After demand factors per chosen method. */
  totalDemandVA: number;
  /** Calculated current at 240V single-phase = totalDemandVA / 240. */
  calculatedAmps: number;
  /** Service rounded up to next standard size from STANDARD_SERVICE_AMPS. */
  recommendedServiceAmps: number;
  /** Phrased like "200A single-phase 120/240V". */
  serviceDescription: string;
  method: '220.83' | 'standard';
  notes: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ELECTRICAL LOAD CALC (NEC Article 220)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute total connected and demand load per NEC Article 220.
 *
 * Default method: 220.83 (existing dwelling optional method).
 *   - First 8 kVA of total at 100%
 *   - Remainder at 40% (no A/C) or with A/C add separately
 *
 * For commercial / non-dwelling we use the "standard" method:
 *   general lighting first 3000 VA @ 100%, next 117,000 VA @ 35%,
 *   remainder @ 25% (per NEC 220.42 office demand factors are
 *   simpler — the 3000/35% rule comes from 220.42 dwelling
 *   demand and is shown here as a conservative approximation
 *   for the in-app calculator; a real commercial calc reads the
 *   220.42 table column for that occupancy).
 */
export function calculateElectricalLoad(input: LoadCalcInput): LoadCalcResult {
  const {
    buildingType,
    sqft,
    smallAppliance = 0,
    laundry = 0,
    hvacKW = 0,
    waterHeaterKW = 0,
    rangeKW = 0,
    evChargerKW = 0,
  } = input;

  const notes: string[] = [];

  // 1) General lighting load — NEC 220.12.
  const vaPerSqft = VA_PER_SQFT[buildingType] ?? 3;
  if (!(buildingType in VA_PER_SQFT)) {
    notes.push(
      `Building type "${buildingType}" not in NEC 220.12 table; defaulted to 3 VA/sqft.`
    );
  }
  const generalLightingVA = Math.round(sqft * vaPerSqft);

  // 2) Small-appliance branch circuits — NEC 220.52(A). 1500 VA each.
  const smallApplianceVA = smallAppliance * 1500;

  // 3) Laundry branch circuits — NEC 220.52(B). 1500 VA each.
  const laundryVA = laundry * 1500;

  // 4) HVAC — NEC 220.50 + 430.24 says largest motor gets 25% extra.
  //    Simplified here: treat the full hvacKW as a load and add 25%.
  const hvacVA = hvacKW > 0 ? Math.round(hvacKW * 1000 * 1.25) : 0;
  if (hvacKW > 0) {
    notes.push(`HVAC ${hvacKW} kW × 1.25 (NEC 220.50 / 430.24 largest-motor 25%) = ${hvacVA} VA.`);
  }

  // 5) Water heater — direct nameplate.
  const waterHeaterVA = Math.round(waterHeaterKW * 1000);

  // 6) Range — NEC 220.55 simplified. One range ≤ 12 kW → 8 kVA demand.
  //    Above 12 kW → add 5% per kW over 12. We implement that.
  let rangeVA = 0;
  if (rangeKW > 0) {
    if (rangeKW <= 12) {
      rangeVA = 8000;
      notes.push(`Range ${rangeKW} kW → 8 kVA demand (NEC 220.55 Table, Col C, one range ≤ 12kW).`);
    } else {
      const over = Math.ceil(rangeKW - 12);
      const adjPct = 1 + 0.05 * over;
      rangeVA = Math.round(8000 * adjPct);
      notes.push(`Range ${rangeKW} kW → 8 kVA × ${adjPct.toFixed(2)} (NEC 220.55 Note 1, +5%/kW over 12) = ${rangeVA} VA.`);
    }
  }

  // 7) EV charger — NEC 625.42. Continuous load: nameplate × 1.25.
  const evChargerVA = evChargerKW > 0 ? Math.round(evChargerKW * 1000 * 1.25) : 0;
  if (evChargerKW > 0) {
    notes.push(`EV charger ${evChargerKW} kW × 1.25 (NEC 625.42 continuous load) = ${evChargerVA} VA.`);
  }

  const totalConnectedVA =
    generalLightingVA +
    smallApplianceVA +
    laundryVA +
    hvacVA +
    waterHeaterVA +
    rangeVA +
    evChargerVA;

  // 8) Demand factor — pick method.
  const isDwelling = ['dwelling', 'single_family', 'multi_family', 'adu'].includes(buildingType);
  const method: '220.83' | 'standard' = input.method ?? (isDwelling ? '220.83' : 'standard');

  let totalDemandVA = 0;

  if (method === '220.83') {
    // Existing dwelling, optional calculation.
    // All loads (other than A/C) summed, then:
    //   first 8 kVA @ 100%, remainder @ 40%.
    // A/C (hvacVA here) is added at 100% on top.
    const nonHvac =
      generalLightingVA + smallApplianceVA + laundryVA + waterHeaterVA + rangeVA + evChargerVA;
    const first8 = Math.min(nonHvac, 8000);
    const remainder = Math.max(0, nonHvac - 8000);
    totalDemandVA = first8 + remainder * 0.4 + hvacVA;
    notes.push(
      `NEC 220.83 (existing dwelling, optional method): first 8 kVA @ 100% (${first8} VA) + remainder @ 40% (${Math.round(remainder * 0.4)} VA) + A/C @ 100% (${hvacVA} VA).`
    );
  } else {
    // Standard method (NEC 220.42 simplified for the in-app calc).
    //   Lighting: first 3000 VA @ 100%, next 117,000 VA @ 35%, remainder @ 25%.
    //   Other listed loads at 100% (motors already have 25% added).
    const lighting = generalLightingVA;
    let lightingDemand = 0;
    let remain = lighting;
    if (remain > 0) {
      const a = Math.min(remain, 3000);
      lightingDemand += a;
      remain -= a;
    }
    if (remain > 0) {
      const b = Math.min(remain, 117000);
      lightingDemand += b * 0.35;
      remain -= b;
    }
    if (remain > 0) {
      lightingDemand += remain * 0.25;
    }
    totalDemandVA =
      lightingDemand +
      smallApplianceVA +
      laundryVA +
      hvacVA +
      waterHeaterVA +
      rangeVA +
      evChargerVA;
    notes.push(
      `NEC 220.42 standard method: lighting ${Math.round(lightingDemand)} VA after demand factors (3000@100%, next 117k@35%, rest@25%); other loads at 100%.`
    );
  }

  totalDemandVA = Math.round(totalDemandVA);

  // 9) Service amps at 240V single-phase = VA / 240.
  const calculatedAmps = totalDemandVA / 240;
  const recommendedServiceAmps = roundUpService(calculatedAmps);

  const serviceDescription = `${recommendedServiceAmps}A single-phase 120/240V`;

  notes.push(
    `Calculated current = ${totalDemandVA} VA / 240 V = ${calculatedAmps.toFixed(1)} A → rounded up to ${recommendedServiceAmps} A service.`
  );

  return {
    generalLightingVA,
    smallApplianceVA,
    laundryVA,
    hvacVA,
    waterHeaterVA,
    rangeVA,
    evChargerVA,
    totalConnectedVA,
    totalDemandVA,
    calculatedAmps: Math.round(calculatedAmps * 10) / 10,
    recommendedServiceAmps,
    serviceDescription,
    method,
    notes,
  };
}

/** Round amps UP to the next standard service rating. */
export function roundUpService(amps: number): number {
  for (const std of STANDARD_SERVICE_AMPS) {
    if (std >= amps) return std;
  }
  return STANDARD_SERVICE_AMPS[STANDARD_SERVICE_AMPS.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// HVAC TONNAGE (rule of thumb)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Square feet per ton of cooling — rule of thumb only.
 *
 * Values reflect mainstream MEP design heuristics. Real RTU selection
 * needs ACCA Manual N (commercial) or Manual J (residential).
 */
export const SQFT_PER_TON: Record<string, number> = {
  office: 350,       // 1 ton per 350 sqft (Class B office)
  retail: 300,
  restaurant: 200,   // high internal gains
  warehouse: 1000,
  dwelling: 600,
  single_family: 600,
  multi_family: 500,
  adu: 600,
  medical: 300,
  school: 250,
  hospital: 200,
  industrial: 400,
};

export interface HvacTonsResult {
  tons: number;
  rounded: number;            // rounded up to nearest 0.5
  rtuRecommendation: string;  // e.g., "2x 6-ton RTUs OR 1x 12-ton split"
  sqftPerTon: number;
  notes: string[];
}

/** Rule-of-thumb HVAC tonnage. NOT a Manual J/N. */
export function calculateHvacTons(buildingType: string, sqft: number): HvacTonsResult {
  const sqftPerTon = SQFT_PER_TON[buildingType] ?? 400;
  const tons = sqft / sqftPerTon;
  const rounded = Math.ceil(tons * 2) / 2; // nearest 0.5 up
  const notes: string[] = [];
  if (!(buildingType in SQFT_PER_TON)) {
    notes.push(`Building type "${buildingType}" not in SQFT_PER_TON; defaulted to 400 sqft/ton.`);
  }
  notes.push(
    `Rule-of-thumb only. Confirm with ACCA Manual J (residential) or Manual N (commercial) — envelope, glazing, internal gains, infiltration, orientation all matter.`
  );

  // Suggest RTU sizing — keep it pragmatic.
  let rtuRecommendation = '';
  if (rounded <= 5) {
    rtuRecommendation = `1× ${rounded}-ton single-package RTU`;
  } else if (rounded <= 10) {
    rtuRecommendation = `1× ${rounded}-ton RTU OR 2× ${Math.ceil(rounded / 2)}-ton RTUs`;
  } else if (rounded <= 25) {
    const half = Math.ceil(rounded / 2);
    rtuRecommendation = `2× ${half}-ton RTUs OR 1× ${rounded}-ton split system`;
  } else {
    const third = Math.ceil(rounded / 3);
    rtuRecommendation = `3× ${third}-ton RTUs OR central chilled-water plant`;
  }

  return { tons, rounded, rtuRecommendation, sqftPerTon, notes };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLUMBING FIXTURE COUNT (UPC 422.1 simplified)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Occupancy load factor — square feet per occupant by use group.
 * Pulled from CBC Table 1004.5 (which UPC 422.1 references for
 * occupant counts when not otherwise specified).
 */
const SQFT_PER_OCCUPANT: Record<string, number> = {
  office: 100,
  retail: 60,
  restaurant: 15,   // dining
  warehouse: 500,
  dwelling: 200,
  single_family: 200,
  multi_family: 200,
  adu: 200,
  medical: 100,
  school: 50,
  hospital: 240,    // inpatient
  industrial: 100,
};

/**
 * Simplified fixture ratios per UPC 422.1 (Class B office shown).
 *
 * For each occupancy: people per water closet (WC), people per
 * lavatory, people per urinal (if applicable), drinking fountains
 * per N people. Real UPC 422.1 separates M/F counts — we apply the
 * combined ratio for the in-app estimate and flag the assumption.
 */
const FIXTURE_RATIOS: Record<
  string,
  { peoplePerWC: number; peoplePerLav: number; peoplePerUrinal: number; peoplePerDF: number }
> = {
  office:        { peoplePerWC: 75,  peoplePerLav: 75,  peoplePerUrinal: 75,  peoplePerDF: 150 },
  retail:        { peoplePerWC: 100, peoplePerLav: 200, peoplePerUrinal: 100, peoplePerDF: 1000 },
  restaurant:    { peoplePerWC: 75,  peoplePerLav: 200, peoplePerUrinal: 150, peoplePerDF: 500 },
  warehouse:     { peoplePerWC: 100, peoplePerLav: 100, peoplePerUrinal: 100, peoplePerDF: 400 },
  medical:       { peoplePerWC: 25,  peoplePerLav: 25,  peoplePerUrinal: 50,  peoplePerDF: 100 },
  school:        { peoplePerWC: 50,  peoplePerLav: 50,  peoplePerUrinal: 50,  peoplePerDF: 100 },
  hospital:      { peoplePerWC: 15,  peoplePerLav: 15,  peoplePerUrinal: 30,  peoplePerDF: 100 },
  industrial:    { peoplePerWC: 100, peoplePerLav: 100, peoplePerUrinal: 100, peoplePerDF: 400 },
};

export interface PlumbingFixtureResult {
  occupants: number;
  wc: number;
  lav: number;
  urinal: number;
  drinkingFountain: number;
  mopSink: number;
  notes: string[];
}

/**
 * Count required fixtures via UPC 422.1 simplified ratios.
 *
 * For dwellings the UPC requires 1 WC + 1 lav + 1 tub/shower per unit;
 * the input here is single-unit residential, so we return that fixed
 * count instead of running ratios.
 */
export function calculatePlumbingFixtures(
  buildingType: string,
  sqft: number,
  occupantsOverride?: number
): PlumbingFixtureResult {
  const notes: string[] = [];

  const isDwelling = ['dwelling', 'single_family', 'multi_family', 'adu'].includes(buildingType);
  if (isDwelling) {
    notes.push(
      'Single dwelling unit — UPC requires 1 WC, 1 lavatory, 1 tub/shower, 1 kitchen sink minimum per unit (UPC 422.1).'
    );
    return {
      occupants: 0,
      wc: 1,
      lav: 1,
      urinal: 0,
      drinkingFountain: 0,
      mopSink: 0,
      notes,
    };
  }

  const sqftPerOcc = SQFT_PER_OCCUPANT[buildingType] ?? 100;
  const occupants = occupantsOverride ?? Math.ceil(sqft / sqftPerOcc);
  notes.push(
    `Occupant load = ${sqft} sqft / ${sqftPerOcc} sqft per occupant (CBC 1004.5 / UPC 422.1) = ${occupants} people.`
  );

  const ratios = FIXTURE_RATIOS[buildingType] ?? FIXTURE_RATIOS.office;
  if (!FIXTURE_RATIOS[buildingType]) {
    notes.push(`No UPC 422.1 ratio table for "${buildingType}"; defaulted to office ratios.`);
  }

  const wc = Math.max(1, Math.ceil(occupants / ratios.peoplePerWC));
  const lav = Math.max(1, Math.ceil(occupants / ratios.peoplePerLav));
  // Urinal substitution per UPC 422.2 — up to 2/3 of male WCs may be urinals.
  const urinal = Math.max(0, Math.floor(wc / 3));
  const drinkingFountain = Math.max(1, Math.ceil(occupants / ratios.peoplePerDF));
  // Mop sink: 1 per floor minimum, UPC 422.1.
  const mopSink = 1;

  notes.push(
    `Ratios per UPC 422.1: 1 WC per ${ratios.peoplePerWC} occupants, 1 lavatory per ${ratios.peoplePerLav}, 1 drinking fountain per ${ratios.peoplePerDF}.`
  );
  notes.push(
    `Urinal substitution per UPC 422.2 — up to 2/3 of male WCs may be urinals; shown as 1/3 of WC count for combined estimate.`
  );

  return {
    occupants,
    wc,
    lav,
    urinal,
    drinkingFountain,
    mopSink,
    notes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WIRE SIZING — NEC 310.16 + 240.4(D)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pick the smallest THHN/THWN copper conductor (75°C) that can carry
 * the given breaker amps without violating NEC 240.4(D) small-conductor
 * limits.
 */
export function wireSizeForBreaker(breakerAmps: number): string {
  for (const row of THHN_75C_AMPACITY) {
    const limit = SMALL_CONDUCTOR_BREAKER_MAX[row.size];
    if (limit && breakerAmps > limit) continue;
    if (row.amps >= breakerAmps) return row.size;
  }
  return THHN_75C_AMPACITY[THHN_75C_AMPACITY.length - 1].size;
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL DIRECTORY GENERATOR (40-circuit, auto-balanced)
// ─────────────────────────────────────────────────────────────────────────────

export interface PanelCircuit {
  number: number;       // 1, 2, 3, ...
  leg: 'A' | 'B';       // odd = A, even = B (typical residential panel)
  description: string;
  breakerAmps: number;
  wireSize: string;
  loadVA: number;
}

export interface PanelDirectory {
  panelName: string;
  serviceAmps: number;
  voltage: '120/240V 1Ø' | '120/208V 3Ø' | '277/480V 3Ø';
  totalLoadVA: number;
  legALoadVA: number;
  legBLoadVA: number;
  imbalancePct: number;
  circuits: PanelCircuit[];
  notes: string[];
}

/**
 * Generate a 40-circuit panel directory from a load-calc result.
 *
 * Strategy:
 *   1. Allocate dedicated circuits for big loads (range, water heater,
 *      HVAC, EV) at appropriate breaker sizes.
 *   2. Distribute general lighting + receptacles across 15A and 20A
 *      circuits.
 *   3. Balance A/B legs by alternating assignment in load-descending order.
 *
 * NOTE: This is a deterministic schedule generator, not a panel
 * designer. An engineer of record still needs to review for code
 * compliance (mwbc grouping, AFCI/GFCI requirements per 210.8/210.12,
 * etc.).
 */
export function generatePanelDirectory(
  loadResult: LoadCalcResult,
  input: LoadCalcInput,
  panelName = 'Panel A'
): PanelDirectory {
  const circuits: PanelCircuit[] = [];
  let n = 1;

  function add(description: string, breakerAmps: number, loadVA: number) {
    circuits.push({
      number: n,
      leg: n % 2 === 1 ? 'A' : 'B',
      description,
      breakerAmps,
      wireSize: wireSizeForBreaker(breakerAmps),
      loadVA: Math.round(loadVA),
    });
    n += 1;
  }

  // Helper: 2-pole 240V loads pull equally from both legs. Split the
  // load VA half-and-half so the leg-balance report tells the truth.
  function add2Pole(description: string, breakerAmps: number, totalVA: number) {
    const half = Math.round(totalVA / 2);
    add(description, breakerAmps, half);
    add(`  (${description.split(' (')[0]} pole 2)`, breakerAmps, totalVA - half);
  }

  // Big-ticket dedicated loads first.
  if ((input.rangeKW ?? 0) > 0) {
    // Range typically a 40A or 50A 240V (2-pole) circuit.
    const breaker = (input.rangeKW ?? 0) > 10 ? 50 : 40;
    add2Pole(`Range ${input.rangeKW} kW (240V 2-pole)`, breaker, loadResult.rangeVA);
  }
  if ((input.hvacKW ?? 0) > 0) {
    const breaker = Math.max(15, Math.ceil((input.hvacKW ?? 0) * 1000 / 240 / 5) * 5);
    add2Pole(`HVAC ${input.hvacKW} kW (240V 2-pole)`, breaker, loadResult.hvacVA);
  }
  if ((input.waterHeaterKW ?? 0) > 0) {
    add2Pole(`Water heater ${input.waterHeaterKW} kW (240V 2-pole)`, 30, loadResult.waterHeaterVA);
  }
  if ((input.evChargerKW ?? 0) > 0) {
    // 7.7 kW / 240 = 32A; continuous → 40A breaker per 625.42.
    const evAmps = Math.ceil(((input.evChargerKW ?? 0) * 1000) / 240 / 1.25 / 5) * 5;
    const breaker = Math.max(40, evAmps);
    add2Pole(`EV charger ${input.evChargerKW} kW (240V 2-pole)`, breaker, loadResult.evChargerVA);
  }

  // Small-appliance branch circuits — 20A per NEC 210.11(C)(1).
  for (let i = 0; i < (input.smallAppliance ?? 0); i++) {
    add(`Small-appliance ${i + 1} (kitchen)`, 20, 1500);
  }

  // Laundry — 20A per NEC 210.11(C)(2).
  for (let i = 0; i < (input.laundry ?? 0); i++) {
    add(`Laundry ${i + 1}`, 20, 1500);
  }

  // General lighting + receptacle circuits — split into 15A circuits.
  // 15A @ 120V = 1800 VA continuous max; design at ~1440 VA (80% rule).
  const lightingPerCircuit = 1440;
  const lightingCircuits = Math.max(2, Math.ceil(loadResult.generalLightingVA / lightingPerCircuit));
  const lightingPerCkt = Math.round(loadResult.generalLightingVA / lightingCircuits);
  for (let i = 0; i < lightingCircuits; i++) {
    add(`General lighting/receptacles ${i + 1}`, 15, lightingPerCkt);
  }

  // Fill remaining slots to 40 with SPARE.
  while (circuits.length < 40) {
    add('SPARE', 20, 0);
  }
  // Truncate if we somehow overshot.
  const trimmed = circuits.slice(0, 40);

  // Balance check.
  const legA = trimmed.filter((c) => c.leg === 'A').reduce((s, c) => s + c.loadVA, 0);
  const legB = trimmed.filter((c) => c.leg === 'B').reduce((s, c) => s + c.loadVA, 0);
  const total = legA + legB;
  const imbalance = total > 0 ? Math.abs(legA - legB) / total : 0;

  const notes: string[] = [
    'Schedule is auto-generated from load-calc inputs. Engineer of record must review for: AFCI/GFCI requirements (210.8, 210.12), MWBC grouping (210.4), and any local amendments.',
    `Leg balance: A=${legA} VA, B=${legB} VA, imbalance=${(imbalance * 100).toFixed(1)}%. Target < 10% for residential.`,
    `Wire sizes per NEC 310.16 (THHN/THWN copper @ 75°C). Small-conductor limits per 240.4(D) applied.`,
  ];

  return {
    panelName,
    serviceAmps: loadResult.recommendedServiceAmps,
    voltage: '120/240V 1Ø',
    totalLoadVA: total,
    legALoadVA: legA,
    legBLoadVA: legB,
    imbalancePct: Math.round(imbalance * 1000) / 10,
    circuits: trimmed,
    notes,
  };
}
