#!/usr/bin/env node
// Builder's Knowledge Garden — Code Entity Seed
// ==============================================
// Loads real building-code section entities for CA / AZ / NV into
// Supabase `knowledge_entities`. Powers the compliance-structural and
// compliance-electrical specialists for the Week 1 Code Compliance Lookup.
//
// USAGE:
//   export SUPABASE_URL=https://<project>.supabase.co
//   export SUPABASE_SERVICE_KEY=<service_role_key>
//   node scripts/seed-code-entities.mjs
//
// SECURITY: this script reads the service role key from env. Never commit it.
// The older batch-entities.mjs files at repo root have a hardcoded key —
// tasks.lessons.md #6 tracks that leak for rotation.
//
// CONTENT: sections are paraphrased summaries with an explicit source URL to
// the authoritative publisher. This is citation-for-navigation, not code reproduction.
// Contractors must still consult the adopted edition at their AHJ.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Export both before running this script."
  );
  process.exit(1);
}

async function post(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=slug`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal,resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`  ERROR ${res.status}: ${t.slice(0, 400)}`);
    return false;
  }
  return true;
}

function entity(slug, title, summary, type, tags, metadata = {}, body = "") {
  return {
    slug,
    title: { en: title },
    summary: { en: summary },
    body: { en: body },
    entity_type: type,
    domain: "construction",
    status: "published",
    tags,
    metadata: {
      ...metadata,
      confidence_tier: metadata.confidence_tier || "summary",
    },
    source_urls: metadata.source_url ? [metadata.source_url] : [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL — IBC / IRC / CBC sections cited by compliance-structural specialist
// ─────────────────────────────────────────────────────────────────────────────

const STRUCTURAL = [
  entity(
    "ibc-2021-section-1607",
    "IBC 2021 Section 1607 — Live Loads",
    "Minimum uniformly distributed live loads and concentrated live loads per occupancy. Residential: 40 psf for living areas, 30 psf for sleeping, 10 psf for attics without storage.",
    "building_code",
    ["structural", "ibc-2021", "live-loads", "residential"],
    {
      code_body: "IBC",
      code_year: 2021,
      section: "1607",
      category: "Structural — Live Loads",
      adopted_by: ["az-phx", "az-tuc", "az-flag", "tx-hou"],
      source_url: "https://codes.iccsafe.org/content/IBC2021P1/chapter-16-structural-design",
    },
    "Applicability: residential, commercial, and institutional occupancies. Concentrated loads apply at worst-case location on any 2.5 sq ft area. Reduction factors per 1607.11 for large tributary areas."
  ),
  entity(
    "ibc-2021-section-1609",
    "IBC 2021 Section 1609 — Wind Loads",
    "Basic wind speed maps and load calculation method. ASCE 7-16 is referenced standard. Risk categories I–IV drive the base wind speed. Wind-borne debris regions require impact-rated glazing.",
    "building_code",
    ["structural", "ibc-2021", "wind-loads", "asce-7"],
    {
      code_body: "IBC",
      code_year: 2021,
      section: "1609",
      category: "Structural — Wind",
      adopted_by: ["az-phx", "az-tuc", "fl-mia"],
      source_url: "https://codes.iccsafe.org/content/IBC2021P1/chapter-16-structural-design",
    },
    "Flagstaff and Reno require cold-region considerations (snow + wind combo). Phoenix and Tucson use Risk Category II default wind speed 115 mph."
  ),
  entity(
    "ibc-2021-section-1613",
    "IBC 2021 Section 1613 — Earthquake Loads",
    "Seismic design categories A–F derived from site class and mapped spectral response acceleration. SDC D, E, F trigger additional detailing and special inspection.",
    "building_code",
    ["structural", "ibc-2021", "seismic", "earthquake", "sdc"],
    {
      code_body: "IBC",
      code_year: 2021,
      section: "1613",
      category: "Structural — Seismic",
      adopted_by: ["az-phx", "az-tuc", "nv-lv", "nv-ro"],
      source_url: "https://codes.iccsafe.org/content/IBC2021P1/chapter-16-structural-design",
    },
    "Las Vegas and Reno: typically SDC D for most residential. Phoenix: SDC B/C. Special seismic detailing required for SDC D+ per ACI 318 / AISC 341."
  ),
  entity(
    "irc-2021-section-r602-3",
    "IRC 2021 Section R602.3 — Wall Construction / Framing",
    "Wood stud wall framing spacing, height limits, and fastener schedule. Standard 2x4 at 16 inches on center supports single-story with 10-ft plate height. Double top plate required unless engineered strap.",
    "building_code",
    ["structural", "irc-2021", "framing", "wood", "residential"],
    {
      code_body: "IRC",
      code_year: 2021,
      section: "R602.3",
      category: "Structural — Wood Framing",
      adopted_by: ["az-phx", "az-tuc", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IRC2021P1/chapter-6-wall-construction",
    },
    "Table R602.3(5) sets stud sizing by height and load. Fastener schedule Table R602.3(1) — one nail per 6 inches edge, 12 inches field for wall sheathing."
  ),
  entity(
    "irc-2021-section-r301",
    "IRC 2021 Section R301 — Design Criteria",
    "Residential design loads: roof live 20 psf, floor live 30–40 psf by room, ground snow by climate zone. Climate zone 5 (Flagstaff AZ, Reno NV) requires ground snow load per Figure R301.2(3).",
    "building_code",
    ["structural", "irc-2021", "design-criteria", "snow-load", "climate-zone"],
    {
      code_body: "IRC",
      code_year: 2021,
      section: "R301",
      category: "Structural — Design Criteria",
      adopted_by: ["az-flag", "nv-ro"],
      source_url: "https://codes.iccsafe.org/content/IRC2021P1/chapter-3-building-planning",
    },
    "Flagstaff ground snow: ~40 psf typical. Reno: 30 psf typical. Phoenix/Vegas/Tucson: 0 psf design snow."
  ),
  entity(
    "cbc-2022-section-1604",
    "CBC 2022 Section 1604 — General Design Requirements",
    "California Building Code general structural design requirements. Amends IBC 2021 Section 1604 with state-specific load combinations and Section 1604.5 Risk Category assignments for CA essential facilities.",
    "building_code",
    ["structural", "cbc-2022", "california", "risk-category"],
    {
      code_body: "CBC",
      code_year: 2022,
      section: "1604",
      category: "Structural — CA Amendments",
      adopted_by: ["ca-la", "ca-sf", "ca-sd"],
      source_url: "https://up.codes/viewer/california/ca-building-code-2022",
    },
    "California Essential Services Building Act triggers Risk Category IV for hospitals, fire stations, emergency operations centers. Strict 72-hour continuous operation requirement."
  ),
  entity(
    "cbc-2022-section-1613",
    "CBC 2022 Section 1613 — Seismic Design (CA)",
    "California seismic amendments to IBC 2021 Section 1613. CA is SDC D, E, F statewide with rare exceptions. ASCE 41 retrofit triggers for existing buildings undergoing substantial alteration.",
    "building_code",
    ["structural", "cbc-2022", "california", "seismic", "retrofit"],
    {
      code_body: "CBC",
      code_year: 2022,
      section: "1613",
      category: "Structural — CA Seismic",
      adopted_by: ["ca-la", "ca-sf", "ca-sd"],
      source_url: "https://up.codes/viewer/california/ca-building-code-2022",
    },
    "Los Angeles: Mandatory soft-story retrofit ordinance applies to pre-1978 wood-frame multi-family. San Francisco: similar ordinance with expanded scope."
  ),
  entity(
    "snv-amendments-2018-structural",
    "Southern Nevada Amendments 2018 — Structural Chapters",
    "Clark County + Las Vegas + Henderson amendments to IBC 2018. Still the adopted edition as of 2026. Includes caliche soil bearing tables, engineered shear wall requirements for 3+ story, and special swimming-pool structural requirements.",
    "building_code",
    ["structural", "snv-2018", "nevada", "las-vegas", "clark-county"],
    {
      code_body: "Southern Nevada Amendments to IBC 2018",
      code_year: 2018,
      section: "Chapters 16–23",
      category: "Structural — NV Amendments",
      adopted_by: ["nv-lv", "nv-hen"],
      source_url: "https://www.clarkcountynv.gov/government/departments/building_fire_prevention/",
    },
    "Designers should always verify the current amendment cycle with Clark County Building Department — Southern Nevada runs on a 3-year cycle offset from IBC."
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// ELECTRICAL — NEC sections cited by compliance-electrical specialist
// ─────────────────────────────────────────────────────────────────────────────

const ELECTRICAL = [
  entity(
    "nec-2023-article-210",
    "NEC 2023 Article 210 — Branch Circuits",
    "Branch circuit ratings, required outlets, and GFCI/AFCI protection. 210.8 mandates GFCI in kitchens, bathrooms, garages, outdoor, and unfinished basements. 210.12 mandates AFCI in bedrooms and living areas.",
    "building_code",
    ["electrical", "nec-2023", "branch-circuits", "gfci", "afci"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "Article 210",
      category: "Electrical — Branch Circuits",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Kitchen: minimum 2 × 20A small-appliance circuits plus dedicated circuits for dishwasher, disposal, fridge. Laundry: dedicated 20A circuit. Bathroom: dedicated 20A circuit."
  ),
  entity(
    "nec-2023-210-8",
    "NEC 2023 Section 210.8 — Ground-Fault Circuit-Interpreter (GFCI) Protection",
    "GFCI protection required for personnel in kitchens, bathrooms, garages, outdoors, crawl spaces, basements, bathtubs, showers, near sinks, and laundry areas. Dwelling: all 125V 15A and 20A receptacles in these locations. Protection via GFCI receptacle or breaker.",
    "building_code",
    ["electrical", "nec-2023", "gfci", "personnel-protection", "kitchen", "bathroom"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.8",
      category: "Electrical — GFCI Protection",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "210.8(A) applies to dwelling-unit bathrooms, kitchens, and kitchen countertops. 210.8(B) applies to other than dwelling units (commercial kitchens, break rooms). 210.8(D) unfinished basements require GFCI on all outlets."
  ),
  entity(
    "nec-2023-210-12",
    "NEC 2023 Section 210.12 — Arc-Fault Circuit-Interpreter (AFCI) Protection",
    "AFCI protection required for dwelling-unit branch circuits serving bedroom outlets, family rooms, dining rooms, living rooms, sunrooms, recreation rooms, and similar areas. Protects against arcing faults that can cause fire.",
    "building_code",
    ["electrical", "nec-2023", "afci", "bedroom", "fire-protection", "dwelling"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.12",
      category: "Electrical — AFCI Protection",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Protection via AFCI breaker (preferred) or combination AFCI outlet with downstream protection. Kitchen countertops: combination AFCI outlet (receptacle type) within 6 inches of countertop."
  ),
  entity(
    "nec-2023-210-11c2",
    "NEC 2023 Section 210.11(C)(2) — Laundry Branch Circuit",
    "At least one separate 20A branch circuit in each dwelling unit for laundry receptacle(s). Dedicated to laundry equipment only. Located at or near intended location of laundry equipment.",
    "building_code",
    ["electrical", "nec-2023", "laundry", "dedicated-circuit", "20a"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.11(C)(2)",
      category: "Electrical — Laundry Circuit",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Circuit must be 20A minimum. Single or multiple receptacles permitted on one circuit as long as they are in the laundry area. GFCI protection required if receptacle is within 6 feet of a sink."
  ),
  entity(
    "nec-2023-210-25",
    "NEC 2023 Section 210.25 — Branch Circuits (Dwelling Units)",
    "Minimum branch-circuit requirements: small appliance circuits (kitchen, dining, breakfast room), laundry branch circuit, bathroom branch circuit. Each has minimum amperage and location rules.",
    "building_code",
    ["electrical", "nec-2023", "dwelling", "branch-circuits", "receptacles"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.25",
      category: "Electrical — Dwelling Branch Circuits",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Small-appliance circuits: minimum two 20A circuits for refrigerator, dishwasher, disposal, range (or wall oven). Each must be wired independently from other circuits and protected by GFCI."
  ),
  entity(
    "nec-2023-210-52a",
    "NEC 2023 Section 210.52(A) — Receptacles in Dwelling Units (General)",
    "General requirement: receptacle within 6 feet of any point along a wall. Receptacles measured from outlet center along the surface to corner at countertop height on all accessible walls.",
    "building_code",
    ["electrical", "nec-2023", "receptacles", "dwelling", "spacing"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.52(A)",
      category: "Electrical — Dwelling Receptacles",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Living rooms, family rooms, bedrooms, dens, recreation rooms: receptacle required at least every 6 feet. Hallways: receptacle at least every 10 feet."
  ),
  entity(
    "nec-2023-210-52b",
    "NEC 2023 Section 210.52(B) — Small-Appliance Branch Circuits",
    "Minimum two 20A small-appliance circuits for all countertop surfaces, refrigerator, etc. All countertop receptacles require these circuits; at least one outlet every 4 feet of countertop.",
    "building_code",
    ["electrical", "nec-2023", "small-appliance", "kitchen", "countertop"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.52(B)",
      category: "Electrical — Small-Appliance Circuits",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Required for kitchen, pantry, breakfast room, dining room. Cannot feed outlets outside these areas. Receptacles on countertops must be protected by GFCI."
  ),
  entity(
    "nec-2023-210-52c",
    "NEC 2023 Section 210.52(C) — Countertops and Island/Peninsula Receptacles",
    "Kitchen and dining countertops: receptacle within 24 inches of end of countertop, and within 24 inches of a point above where appliances will be plugged in. Island and peninsula surfaces: same spacing, typically in the surface itself.",
    "building_code",
    ["electrical", "nec-2023", "kitchen", "countertop", "island", "peninsula"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.52(C)",
      category: "Electrical — Countertop Receptacles",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "No point on countertop may be more than 24 inches from a receptacle measured horizontally. Island and peninsula spacing: at least one receptacle for every 12 linear feet of surface."
  ),
  entity(
    "nec-2023-210-52c1",
    "NEC 2023 Section 210.52(C)(1) — Receptacles for Kitchen Countertop Surfaces",
    "Receptacles within 24 inches (measured horizontally) from any point along the countertop surface to the nearest receptacle outlet. Island and peninsula counters: same 24-inch rule.",
    "building_code",
    ["electrical", "nec-2023", "kitchen", "countertop", "24-inch-rule"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.52(C)(1)",
      category: "Electrical — Countertop Spacing",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Measurement starts at the outlet center. Island/peninsula: receptacle must be mounted in or directly above the surface (not the side). Split counters (with range/sink) count as separate sections."
  ),
  entity(
    "nec-2023-210-52c2",
    "NEC 2023 Section 210.52(C)(2) — Island and Peninsula Countertop Spaces",
    "Island and peninsula countertops must have at least one receptacle. If island is longer than 12 feet, at least one receptacle for each 12 linear feet. Receptacle must be mounted in or directly above the surface.",
    "building_code",
    ["electrical", "nec-2023", "island", "peninsula", "12-foot-spacing"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.52(C)(2)",
      category: "Electrical — Island Spacing",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Island receptacles must be in the countertop surface or directly above it. Receptacles on side of island (e.g., lower cabinet face) do NOT satisfy this requirement."
  ),
  entity(
    "nec-2023-210-52c5-eliminated",
    "NEC 2020 Section 210.52(C)(5) — Kitchen Island Receptacle Rule (ELIMINATED IN NEC 2023)",
    "HISTORICAL: NEC 2020 required at least one receptacle be installed in an island or peninsula countertop for every 12 linear feet. THIS RULE WAS ELIMINATED IN NEC 2023. See 210.52(C)(2) for current requirements.",
    "building_code",
    ["electrical", "nec-2020", "island", "receptacle", "superseded", "eliminated"],
    {
      code_body: "NEC",
      code_year: 2020,
      section: "210.52(C)(5)",
      category: "Electrical — Island Receptacles (Superseded)",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "historical",
      superseded_by: "nec-2023-210-52c2",
    },
    "Many older installations and some AHJs still reference the 2020 rule. For new work in 2023+ adoption, always use 210.52(C)(2). Verify adopted edition with your AHJ before design."
  ),
  entity(
    "nec-2023-210-52c3-c4",
    "NEC 2023 Section 210.52(C)(3)–(C)(4) — Wall Countertop and Countertop Surfaces",
    "Wall countertops: receptacle within 24 inches from where countertop ends at range/sink. Receptacles required for all countertop surfaces including bar counters and serving counters. GFCI protection required.",
    "building_code",
    ["electrical", "nec-2023", "countertop", "wall-spacing", "gfci"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.52(C)(3)–(4)",
      category: "Electrical — Wall Countertops",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Bar counters and serving counters: receptacle on each side of counter if used for food preparation or serving. Countertops with no receptacles: measurement continues around corners and obstructions."
  ),
  entity(
    "nec-2023-210-52d",
    "NEC 2023 Section 210.52(D) — Bathroom Receptacles",
    "At least one receptacle in each dwelling-unit bathroom within 36 inches of each sink. Separate 20A circuit(s) required. All receptacles within 6 feet of sink/tub/shower require GFCI protection.",
    "building_code",
    ["electrical", "nec-2023", "bathroom", "receptacle", "gfci", "sink"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.52(D)",
      category: "Electrical — Bathroom Receptacles",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Multiple sinks: receptacle required for each sink. Cannot be on small-appliance circuit. GFCI can be via receptacle or breaker."
  ),
  entity(
    "nec-2023-210-52e",
    "NEC 2023 Section 210.52(E) — Outdoor Receptacles",
    "Outdoor receptacles: minimum one in front and one in back of dwelling. All outdoor 125V 15A and 20A receptacles require GFCI protection. Ground-level outlets recommended.",
    "building_code",
    ["electrical", "nec-2023", "outdoor", "gfci", "dwelling"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.52(E)",
      category: "Electrical — Outdoor Receptacles",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Decks, patios, balconies: receptacle within 6.5 feet of any point. Ground-level: accessible at height not to exceed 18 inches. GFCI protection via breaker or GFCI receptacle."
  ),
  entity(
    "nec-2023-210-52f",
    "NEC 2023 Section 210.52(F) — Laundry Area Receptacles",
    "At least one 20A receptacle in laundry area, within 6 feet of intended location of washing machine. Must be on dedicated laundry circuit (210.11(C)(2)). GFCI protection required if within 6 feet of sink.",
    "building_code",
    ["electrical", "nec-2023", "laundry", "20a-circuit", "receptacle"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.52(F)",
      category: "Electrical — Laundry Receptacles",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Laundry room receptacle cannot serve other areas. If no laundry room or area designated, receptacle must still be provided in the dwelling."
  ),
  entity(
    "nec-2023-210-52g",
    "NEC 2023 Section 210.52(G) — Basement and Garage Receptacles",
    "Finished basement: receptacle within 6 feet of any point on wall surface (same as living areas). Unfinished basement: all receptacles require GFCI protection. Garage: all 125V 15A and 20A receptacles require GFCI.",
    "building_code",
    ["electrical", "nec-2023", "basement", "garage", "gfci"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.52(G)",
      category: "Electrical — Basement/Garage Receptacles",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Attached and detached garages: GFCI required. Unfinished basements: apply same spacing rule as living areas, all protected by GFCI."
  ),
  entity(
    "nec-2023-210-52h",
    "NEC 2023 Section 210.52(H) — Hallway Receptacles",
    "Hallways: receptacle within 10 feet of any point along the hallway (wider spacing than living areas). Applied to finished hallways 10 feet or longer.",
    "building_code",
    ["electrical", "nec-2023", "hallway", "receptacle", "10-foot"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "210.52(H)",
      category: "Electrical — Hallway Receptacles",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Hallways shorter than 10 feet do not require a dedicated receptacle, but one at the entry/exit is recommended. No specific GFCI requirement unless hallway also serves wet areas."
  ),
  entity(
    "nec-2023-article-230",
    "NEC 2023 Article 230 — Services",
    "Service-entrance conductors, service disconnect, service equipment. Dwelling: maximum six service disconnects at one location. Service entrance must be readily accessible. Overcurrent protection required at service entrance.",
    "building_code",
    ["electrical", "nec-2023", "service", "disconnect", "dwelling"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "Article 230",
      category: "Electrical — Services",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Service mast: must be as short as practicable. Underground service: minimum 24-30 inches depth depending on location (residential, commercial, agricultural). Nevada amendments require greater clearance near property lines."
  ),
  entity(
    "nec-2023-230-71",
    "NEC 2023 Section 230.71 — Service Disconnect — Location and Accessibility",
    "Service disconnect must be installed at a location readily accessible. Single service switch or multiple switches (max 6 for dwelling) at one location. Location must allow person to safely operate. If service is split, sign required.",
    "building_code",
    ["electrical", "nec-2023", "service-disconnect", "dwelling", "six-disconnect-rule"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "230.71",
      category: "Electrical — Service Disconnect",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "NEC 2020 vs 2023: changes to emergency disconnect rules for critical loads (solar, battery). NEC 2023 tightens accessibility and labeling. Verify adopted edition with AHJ."
  ),
  entity(
    "nec-2023-article-240",
    "NEC 2023 Article 240 — Overcurrent Protection",
    "Overcurrent device ratings, fuse/breaker sizing, and panel overcurrent protection. 240.4(D) small-conductor rule: 14 AWG → 15A max, 12 AWG → 20A, 10 AWG → 30A.",
    "building_code",
    ["electrical", "nec-2023", "overcurrent", "breakers", "fuses"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "Article 240",
      category: "Electrical — Overcurrent",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "summary",
    },
    "Conductor ampacity determines breaker/fuse size. Table 310.16 ampacity must account for temperature and ambient conditions. Breaker must protect at wire ampacity, not higher."
  ),
  entity(
    "nec-2023-article-250",
    "NEC 2023 Article 250 — Grounding and Bonding",
    "System and equipment grounding. Main bonding jumper in service panel. Separately derived systems need grounding electrode. Grounding electrode conductor sized per Table 250.66.",
    "building_code",
    ["electrical", "nec-2023", "grounding", "bonding"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "Article 250",
      category: "Electrical — Grounding",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Common residential mistake: neutral-ground bond on subpanel. Must be bonded only at service equipment per 250.142."
  ),
  entity(
    "nec-2023-250-52",
    "NEC 2023 Section 250.52 — Grounding Electrode System",
    "Grounding electrode must be installed at service location. Preferred electrodes: underground metal water pipe, metal frame of building, concrete-encased electrode, ground ring. Single electrode if resistance to ground is ≤25 ohms; otherwise two electrodes required.",
    "building_code",
    ["electrical", "nec-2023", "grounding-electrode", "water-pipe", "resistance"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "250.52",
      category: "Electrical — Grounding Electrodes",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Water pipe must be continuous from meter to service. If continuity is broken, pipe cannot be sole electrode. Copper clad rods: minimum 8 feet driven depth (unless rock is encountered)."
  ),
  entity(
    "nec-2023-article-406",
    "NEC 2023 Article 406 — Receptacles, Cord Connectors, and Attachment Plugs",
    "Receptacle types: standard 15A, 20A, duplex, GFCI, AFCI, tamper-resistant. Tamper-resistant receptacles required in all dwelling-unit kitchen, bathroom, and accessible ground-level spaces.",
    "building_code",
    ["electrical", "nec-2023", "receptacle", "tamper-resistant", "dwelling"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "Article 406",
      category: "Electrical — Receptacles",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Tamper-resistant: shutter mechanism closes when outlet is not in use (prevents foreign objects). Required since 2008 NEC; all modern installations use TR outlets."
  ),
  entity(
    "nec-2023-406-12",
    "NEC 2023 Section 406.12 — Tamper-Resistant Receptacles",
    "All receptacles in dwelling units (kitchen, bathroom, bedroom, outdoor, garage) must be tamper-resistant type. TR receptacle has built-in shutters that prevent direct contact with live terminals.",
    "building_code",
    ["electrical", "nec-2023", "tamper-resistant", "dwelling", "safety"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "406.12",
      category: "Electrical — Tamper-Resistant",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "All 15A and 20A receptacles in dwelling units must be TR. Single TR outlet cannot protect downstream standard outlets; all must be TR or protected by GFCI."
  ),
  entity(
    "nec-2023-article-680",
    "NEC 2023 Article 680 — Swimming Pools, Hot Tubs, and Fountains",
    "Bonding of all metallic parts within 5 feet of pool edge. GFCI protection for all receptacles within 20 feet of pool. Underwater lighting, equipment grounding, separation distances.",
    "building_code",
    ["electrical", "nec-2023", "pool", "bonding", "gfci", "underwater-lighting"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "Article 680",
      category: "Electrical — Pools/Spas",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Pool pump circuit: dedicated branch circuit, typically 20-30A for residential. No outlets within 5 feet of pool edge (except for equipment). Underwater lighting: 12V max or GFCI protected."
  ),
  entity(
    "nec-2023-680-22",
    "NEC 2023 Section 680.22 — Bonding",
    "All metallic parts of pool structure (rebar, reinforcing steel, ladder, rails) must be bonded together with 8 AWG copper conductor. Equipment grounding conductor must be run with circuit. Bonding extends to any metal within 5 feet of pool edge.",
    "building_code",
    ["electrical", "nec-2023", "pool", "bonding", "metallic", "5-foot-zone"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "680.22",
      category: "Electrical — Pool Bonding",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "az-tuc", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "Bonding conductor must be connected to main grounding electrode at service. Southern Nevada amendments add additional pool bonding requirements per Amendment 680-1."
  ),
  entity(
    "nec-2023-article-690",
    "NEC 2023 Article 690 — Solar Photovoltaic Systems",
    "PV system wiring, disconnects, rapid shutdown, and grounding. 690.12 rapid shutdown within 1 ft of array required. 690.56(C) labeling required on service panel for interconnected PV.",
    "building_code",
    ["electrical", "nec-2023", "solar", "pv", "rapid-shutdown"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "Article 690",
      category: "Electrical — Solar PV",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "California Title 24 requires PV on most new residential. Combined with NEC 690.12 rapid shutdown, every new CA SFR inspection checks rapid-shutdown labeling and accessible initiator."
  ),
  entity(
    "nec-2023-690-12",
    "NEC 2023 Section 690.12 — Rapid Shutdown of PV Systems",
    "Rapid shutdown of inverter and equipment within 1 second of de-energization. Manual switch/breaker in accessible location within 10 feet of inverter/combiner. Emergency responder initiator required (easily identified by label and color).",
    "building_code",
    ["electrical", "nec-2023", "solar", "rapid-shutdown", "inverter", "emergency"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "690.12",
      category: "Electrical — Rapid Shutdown",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
      confidence_tier: "primary",
    },
    "California Title 24 Part 6 requires rapid shutdown on all new residential PV installations. Label must state: 'PV Rapid Shutdown Switch — De-energizes Array Within 1 Second.'"
  ),
  entity(
    "nec-2023-article-310",
    "NEC 2023 Article 310 — Conductors for General Wiring",
    "Conductor ampacity, insulation, and conditions of use. Table 310.16 is the primary ampacity table. Temperature correction and ambient derating per 310.15.",
    "building_code",
    ["electrical", "nec-2023", "conductors", "ampacity", "wire-sizing"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "Article 310",
      category: "Electrical — Conductors",
      adopted_by: ["ca-la", "ca-sf", "az-phx", "az-tuc", "az-flag", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
    },
    "Phoenix high-ambient consideration: use 40°C or 45°C column, not 30°C, for attic/exterior runs — temperature correction factors from Table 310.15(B)(1) can cut 12 AWG from 20A to 16A ampacity."
  ),
  entity(
    "nec-2023-article-690",
    "NEC 2023 Article 690 — Solar Photovoltaic Systems",
    "PV system wiring, disconnects, rapid shutdown, and grounding. 690.12 rapid shutdown within 1 ft of array required. 690.56(C) labeling required on service panel for interconnected PV.",
    "building_code",
    ["electrical", "nec-2023", "solar", "pv", "rapid-shutdown"],
    {
      code_body: "NEC",
      code_year: 2023,
      section: "Article 690",
      category: "Electrical — Solar PV",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
      source_url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70",
    },
    "California Title 24 requires PV on most new residential. Combined with NEC 690.12 rapid shutdown, every new CA SFR inspection checks rapid-shutdown labeling and accessible initiator."
  ),
  entity(
    "cec-2022-article-210",
    "California Electrical Code 2022 Article 210 — CA Amendments to NEC",
    "CA Title 24 Part 3 amends NEC 2020 with stricter residential requirements. All new residential must be EV-capable (dedicated 40A circuit conduit to main panel). Branch-circuit LED load limits modified.",
    "building_code",
    ["electrical", "cec-2022", "california", "title-24", "ev-capable"],
    {
      code_body: "CEC",
      code_year: 2022,
      section: "Article 210",
      category: "Electrical — CA Amendments",
      adopted_by: ["ca-la", "ca-sf", "ca-sd"],
      source_url: "https://up.codes/viewer/california/ca-electrical-code-2022",
      confidence_tier: "primary",
    },
    "CA Title 24 Part 6 also requires high-efficacy lighting (99% of new installations) and occupancy sensors in non-habitable rooms. Compliance documentation via CF1R/CF2R/CF3R forms at inspection."
  ),
  entity(
    "ca-title24-part3-ev-charging",
    "California Title 24 Part 3 (2022) — EV Charging Readiness",
    "All new residential dwellings must have 40A dedicated branch circuit with conduit to main service panel for future EV charging installation. Outlet installation not required but infrastructure must be ready.",
    "building_code",
    ["electrical", "california", "title-24", "ev-charging", "residential"],
    {
      code_body: "California Electrical Code",
      code_year: 2022,
      section: "Title 24 Part 3",
      category: "Electrical — CA EV Readiness",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "ca-oak"],
      source_url: "https://up.codes/viewer/california/ca-electrical-code-2022",
      confidence_tier: "primary",
    },
    "Conduit must terminate at main panel in designated space. Homeowner may opt out with signed waiver. Both single-family and multi-family (one circuit per unit) required."
  ),
  entity(
    "ca-title24-part6-solar-mandate",
    "California Title 24 Part 6 (2022) — Solar PV Mandate for New Dwellings",
    "All new residential must have rooftop solar PV system unless exempted (poor orientation, shading, cost). Minimum: system must offset projected electricity consumption. Rapid shutdown (NEC 690.12) required.",
    "building_code",
    ["electrical", "california", "title-24-part-6", "solar", "pv-mandate"],
    {
      code_body: "California Energy Commission",
      code_year: 2022,
      section: "Title 24 Part 6",
      category: "Electrical — CA Solar Mandate",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "ca-oak", "ca-sj"],
      source_url: "https://www.energy.ca.gov/programs-and-topics/programs/building-energy-efficiency-standards",
      confidence_tier: "primary",
    },
    "PV system sizing: minimum offset 100% of annual electricity consumption (residential). Exceptions: permanent shading, cost >$15k, wrong orientation. Compliance via CECS or simplified calculator."
  ),
  entity(
    "ca-title24-part11-water-fixtures",
    "California Title 24 Part 11 (CALGreen) — Water Fixture Flow Limits",
    "Maximum water flow rates: kitchen faucet 1.8 gpm, bathroom faucet 0.5 gpm, showerheads 2.0 gpm, toilets 1.28 gpf. Applies to all new and renovation work.",
    "building_code",
    ["plumbing", "california", "title-24", "water-conservation", "gpm"],
    {
      code_body: "California Code of Regulations",
      code_year: 2022,
      section: "Title 24 Part 11",
      category: "Plumbing — CA Water Conservation",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "ca-oak"],
      source_url: "https://www.dgs.ca.gov/BSC/CALGreen",
      confidence_tier: "primary",
    },
    "Flow rate tested per ASME A112.18.1. Kitchen faucet includes spray; bathroom faucet is aerated type. Retrofit of water-efficient fixtures required on renovation."
  ),
  entity(
    "ca-title24-part2-seismic-wildfire",
    "California Building Code 2022 (Title 24 Part 2) — Seismic + Wildfire (WUI)",
    "Seismic design per CBC 2022 Section 1613. Wildfire Urban Interface (WUI) Chapter 7A: ignition-resistant materials, deck construction, roof coverings, defensible space, ember intrusion protection.",
    "building_code",
    ["structural", "california", "title-24-part-2", "seismic", "wildfire-wui"],
    {
      code_body: "California Building Code",
      code_year: 2022,
      section: "Chapter 7A (WUI), Sections 1613 (Seismic)",
      category: "Structural — CA Seismic/Wildfire",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "ca-oak"],
      source_url: "https://up.codes/viewer/california/ca-building-code-2022",
      confidence_tier: "primary",
    },
    "WUI applies to properties within state Responsibility Areas (SRA) or Local Responsibility Areas (LRA) in high-fire-hazard zones. Materials: Class A roof, 1-hour fire-rated soffits, 5/8-inch drywall under decks."
  ),
  entity(
    "snv-amendments-2017-electrical",
    "Southern Nevada Amendments 2017 — NEC Electrical",
    "Clark County + Las Vegas + Henderson amendments to NEC 2017. Still the adopted edition for most of Southern Nevada as of 2026. Includes desert-ambient derating guidance, pool/spa bonding amplifications, and service upgrade requirements.",
    "building_code",
    ["electrical", "snv-2017", "nevada", "clark-county", "pool-bonding"],
    {
      code_body: "Southern Nevada Amendments to NEC 2017",
      code_year: 2017,
      section: "Articles 200–700",
      category: "Electrical — NV Amendments",
      adopted_by: ["nv-lv", "nv-hen"],
      source_url: "https://www.clarkcountynv.gov/government/departments/building_fire_prevention/",
      confidence_tier: "primary",
    },
    "Verify current code adoption — Southern Nevada occasionally lags NEC cycle by one edition. NV State Contractors Board licensing board is the authoritative reference."
  ),
  entity(
    "snv-amendments-service-mast-clearance",
    "Southern Nevada Amendments — Service Mast Clearance and Underground Service Depth",
    "Service mast minimum clearance from property lines, utility lines, and vegetation. Underground service minimum burial depth 24 inches (residential), 18 inches (under driveway), 6 inches minimum under sidewalk/patio.",
    "building_code",
    ["electrical", "nevada", "service-mast", "underground-service"],
    {
      code_body: "Southern Nevada Amendments to Article 230",
      code_year: 2017,
      section: "Article 230 (Amended)",
      category: "Electrical — NV Service Requirements",
      adopted_by: ["nv-lv", "nv-hen", "nv-nlas"],
      source_url: "https://www.clarkcountynv.gov/government/departments/building_fire_prevention/",
      confidence_tier: "primary",
    },
    "Service mast: keep clear of property line by 3 feet minimum. Service entrance: accessible from grade; not permitted in attic or crawlspace. Underground service may be shallower in caliche/rock. Verify with Clark County Building Department."
  ),
  entity(
    "northern-nevada-ibc-nec-unamended",
    "Northern Nevada (Washoe/Reno) — IBC + NEC Largely Unamended",
    "Washoe County and City of Reno predominantly adopt IBC and NEC with minimal local amendments. Use current IBC 2021 and NEC 2023 (or adopted edition per jurisdiction) directly. Check Washoe County Building Department for current adoption cycle.",
    "building_code",
    ["structural", "electrical", "nevada", "washoe-county", "reno"],
    {
      code_body: "Washoe County / Reno Municipal Code",
      code_year: 2021,
      section: "Building Code Adoption",
      category: "Building Codes — NV Northern",
      adopted_by: ["nv-reno", "nv-washoe"],
      source_url: "https://www.washoecountynv.gov/",
      confidence_tier: "summary",
    },
    "Northern Nevada does not have the extensive amendments of Southern Nevada. Always verify the current adoption status with the local jurisdiction AHJ."
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// PLUMBING — IPC / UPC / IRC P sections
// ─────────────────────────────────────────────────────────────────────────────

const PLUMBING = [
  entity(
    "ipc-2021-section-406",
    "IPC 2021 Section 406 — Water Supply and Distribution",
    "Water service line sizing, meter installation, and backflow prevention. Service line minimum 3/4 inch for single-family dwelling. Backflow preventer required at service entrance (REDUCED PRESSURE or DOUBLE CHECK valve).",
    "building_code",
    ["plumbing", "ipc-2021", "water-supply", "backflow", "meter"],
    {
      code_body: "IPC",
      code_year: 2021,
      section: "406",
      category: "Plumbing — Water Supply",
      adopted_by: ["ca-la", "ca-sf", "az-phx", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IPC2021P1/chapter-4-water-supply-and-distribution",
      confidence_tier: "primary",
    },
    "Backflow prevention: reduced pressure principle backflow preventer (RP) for protection of potable water. Location: immediately downstream of water meter, accessible for testing."
  ),
  entity(
    "ipc-2021-section-802",
    "IPC 2021 Section 802 — Water Heaters",
    "Water heater installation: venting, clearances, temperature and pressure relief, seismic bracing. Gas water heater: Type B or Type L vent, 3 inches minimum diameter, 1/4 inch rise per foot slope.",
    "building_code",
    ["plumbing", "ipc-2021", "water-heater", "venting", "seismic-bracing"],
    {
      code_body: "IPC",
      code_year: 2021,
      section: "802",
      category: "Plumbing — Water Heaters",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IPC2021P1/chapter-8-water-heaters",
      confidence_tier: "primary",
    },
    "Temperature/pressure relief valve: TPRV required, discharge line to safe location (floor drain, exterior). Seismic bracing: horizontal and vertical restraint required in Seismic Design Category D, E, F."
  ),
  entity(
    "irc-2021-section-p2603",
    "IRC 2021 Section P2603 — Water Heater Installation",
    "Residential water heater venting and clearances. Gas heater minimum 1/4 inch rise per 12 inches horizontal run. Clearances: 3 inches from combustibles (or per manufacturer). Seismic bracing required per CBC/IBC.",
    "building_code",
    ["plumbing", "irc-2021", "water-heater", "venting", "residential"],
    {
      code_body: "IRC",
      code_year: 2021,
      section: "P2603",
      category: "Plumbing — Residential Water Heater",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IRC2021P1/chapter-24-water-heating",
      confidence_tier: "primary",
    },
    "Gas supply line: 3/8 inch minimum for residential. Seismic strapping: California and Nevada high-seismic zones require lateral and overhead bracing."
  ),
  entity(
    "ipc-2021-section-608",
    "IPC 2021 Section 608 — Indirect Waste Pipes",
    "Indirect waste: floor drains, sink overflow, water heater TPRV discharge. Must discharge to proper drain/sump with visible break (no direct connection to DWV). Minimum 1 inch above rim of receiving fixture.",
    "building_code",
    ["plumbing", "ipc-2021", "indirect-waste", "floor-drain", "overflow"],
    {
      code_body: "IPC",
      code_year: 2021,
      section: "608",
      category: "Plumbing — Indirect Waste",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IPC2021P1/chapter-6-water-supply-and-distribution",
      confidence_tier: "primary",
    },
    "Air gap: 1 inch minimum above flood rim of receiving fixture (e.g., floor drain receiving water heater TPRV overflow). Prevents siphon back to potable water."
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// MECHANICAL — IMC / IBC M sections
// ─────────────────────────────────────────────────────────────────────────────

const MECHANICAL = [
  entity(
    "ibc-2021-m1601",
    "IBC 2021 Section M1601 — General Requirements for HVAC",
    "HVAC system: sized per ASHRAE 62.1 / 62.2 for ventilation and indoor air quality. Ductwork: sealed, insulated. Thermostats: at least one per zone. Minimum outdoor air per occupancy type.",
    "building_code",
    ["mechanical", "ibc-2021", "hvac", "ventilation", "ashrae"],
    {
      code_body: "IBC",
      code_year: 2021,
      section: "M1601",
      category: "Mechanical — HVAC General",
      adopted_by: ["ca-la", "ca-sf", "az-phx", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IBC2021P1/chapter-16-electrical",
      confidence_tier: "primary",
    },
    "Residential: ASHRAE 62.2 applies (natural ventilation or mechanical). Continuous exhaust fans in kitchens, bathrooms. HVAC equipment seismic bracing per IBC 1613."
  ),
  entity(
    "ibc-2021-m1602",
    "IBC 2021 Section M1602 — HVAC Duct Sealing and Insulation",
    "All ductwork sealing: metal duct tape or mastic per UL 181. Flexible duct: minimum R-4.2 insulation (residential). Rigid ductwork: minimum R-6 in unconditioned spaces.",
    "building_code",
    ["mechanical", "ibc-2021", "ductwork", "insulation", "sealing"],
    {
      code_body: "IBC",
      code_year: 2021,
      section: "M1602",
      category: "Mechanical — Ductwork",
      adopted_by: ["ca-la", "ca-sf", "az-phx", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IBC2021P1/chapter-16-electrical",
      confidence_tier: "primary",
    },
    "Flex duct: seal with mastic, not duct tape (tape fails over time). Metal duct: UL 181 aluminum tape or mastic sealant. Seismic bracing: support every 4 feet in high-seismic zones."
  ),
  entity(
    "ibc-2021-m1705",
    "IBC 2021 Section M1705 — Kitchen Hoods",
    "Kitchen hood: ducted to exterior or recirculating (if grease filtration). Duct size per manufacturer; minimum 6 inches or per local adoption. Clearance from combustibles: 0 inches (if hood rated as zero-clearance).",
    "building_code",
    ["mechanical", "ibc-2021", "kitchen-hood", "exhaust", "ductwork"],
    {
      code_body: "IBC",
      code_year: 2021,
      section: "M1705",
      category: "Mechanical — Kitchen Hoods",
      adopted_by: ["ca-la", "ca-sf", "az-phx", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IBC2021P1/chapter-17-mechanical-systems-and-equipment",
      confidence_tier: "primary",
    },
    "Commercial kitchen: Type I hood (with grease filtration) for cooking with grease/smoke; Type II hood (filters steam/moisture) for cooking without heavy grease. Make-up air required."
  ),
  entity(
    "cbc-2022-m1602-wildfire-wui",
    "California Building Code 2022 (WUI) — Mechanical Equipment Clearance",
    "Rooftop HVAC equipment: minimum 5-foot clearance from roofline edge in Wildfire Urban Interface (WUI) zones. Ductwork termination: flame-resistant screen, spark arrestor.",
    "building_code",
    ["mechanical", "california", "wildfire-wui", "hvac", "ember-protection"],
    {
      code_body: "CBC",
      code_year: 2022,
      section: "Chapter 7A (WUI)",
      category: "Mechanical — CA WUI Equipment",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "ca-oak"],
      source_url: "https://up.codes/viewer/california/ca-building-code-2022",
      confidence_tier: "primary",
    },
    "Rooftop equipment in WUI: setback from edge, clearance of dead vegetation/needles, 1/8 inch screen on all openings (ember intrusion protection)."
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL / FIRE — IBC sections for shear walls, fire rating, penetrations
// ─────────────────────────────────────────────────────────────────────────────

const STRUCTURAL_FIRE = [
  entity(
    "ibc-2021-2308-shear-wall-nailing",
    "IBC 2021 Section 2308 — Wood Construction, Shear Walls",
    "Shear wall nailing: 8d common nails at 4 inches on center edges, 12 inches field for 1/2 inch sheathing. APA-rated sheathing (OSB or plywood) with proper panel fastening. Blocking at panel joints.",
    "building_code",
    ["structural", "ibc-2021", "shear-wall", "nailing-schedule", "wood-frame"],
    {
      code_body: "IBC",
      code_year: 2021,
      section: "2308",
      category: "Structural — Shear Walls",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IBC2021P1/chapter-23-wood",
      confidence_tier: "primary",
    },
    "Shear wall length: minimum 2:1 height-to-length ratio for single-story; 1.5:1 for multi-story. Hold-down anchors at end studs (typically Simpson LUS210 or equivalent)."
  ),
  entity(
    "ibc-2021-section-714",
    "IBC 2021 Section 714 — Fire-Resistance-Rated Penetrations",
    "Fire-rated assemblies: 1-hour, 2-hour, or 3-hour per occupancy. Penetrations (electrical, mechanical, plumbing) must be sealed with approved fire-stopping material. Tested assemblies per ASTM E814.",
    "building_code",
    ["structural", "ibc-2021", "fire-rated-assembly", "penetrations", "fire-stopping"],
    {
      code_body: "IBC",
      code_year: 2021,
      section: "714",
      category: "Structural — Fire Penetrations",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IBC2021P1/chapter-7-fire-and-smoke-protection-features",
      confidence_tier: "primary",
    },
    "Electrical penetration seal: UL 1479 rated for the wall rating. Conduit/cable fill maximum 40% of area. Flexible conduit: not permitted through fire-rated assemblies."
  ),
  entity(
    "irc-2021-r602-seismic-bracing",
    "IRC 2021 Section R602 — Seismic Bracing and Detailing",
    "SDC D/E/F: cripple wall bracing, foundation bolting, lateral bracing of plumbing/HVAC. Seismic strapping: every 4 feet for equipment, water heater, HVAC. Hold-down anchors at shear-wall ends.",
    "building_code",
    ["structural", "irc-2021", "seismic-bracing", "cripple-wall", "foundation-bolting"],
    {
      code_body: "IRC",
      code_year: 2021,
      section: "R602",
      category: "Structural — Seismic Bracing",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IRC2021P1/chapter-6-wall-construction",
      confidence_tier: "primary",
    },
    "Foundation bolting: 5/8 inch anchor bolts every 6 feet maximum. Cripple walls (under first floor): diagonal bracing or steel moment frames. California SDC D/E/F: mandatory on all existing and new."
  ),
  entity(
    "cbc-2022-wui-chapter-7a-exterior",
    "California Building Code 2022 Chapter 7A — Wildfire Urban Interface (WUI) Exterior",
    "WUI materials: Class A roof assembly, ignition-resistant exterior walls, 5/8 inch Type X drywall on soffits, boxed-in eaves, 1/2 inch mesh for vents, Class A decking. 5-foot defensible space minimum.",
    "building_code",
    ["structural", "california", "wildfire-wui", "exterior-materials", "defensible-space"],
    {
      code_body: "CBC",
      code_year: 2022,
      section: "Chapter 7A",
      category: "Structural — CA WUI Exterior",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "ca-oak"],
      source_url: "https://up.codes/viewer/california/ca-building-code-2022",
      confidence_tier: "primary",
    },
    "Class A deck: metal or masonry, treated wood (2000-hour rating), or composite/plastic lumber. Gable vents, soffit vents, under-deck areas: 1/8 inch mesh. Gutters: cleared of debris, non-combustible covers recommended."
  ),
  entity(
    "ibc-2021-section-1926-rebar-spacing",
    "IBC 2021 Section 1926 — Reinforced Concrete, Rebar Spacing and Cover",
    "Concrete cover: 1.5 inches for rebar in interior exposure, 2 inches for exterior/weather exposure. Rebar spacing: minimum 1 inch clear space between bars (or bar diameter + 1/4 inch). Stirrup spacing: per design.",
    "building_code",
    ["structural", "ibc-2021", "reinforced-concrete", "rebar", "cover"],
    {
      code_body: "IBC",
      code_year: 2021,
      section: "1926",
      category: "Structural — Concrete",
      adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
      source_url: "https://codes.iccsafe.org/content/IBC2021P1/chapter-19-concrete",
      confidence_tier: "primary",
    },
    "Footings: 3 inches concrete cover typical. Slabs on grade: 1.5 inches minimum. Exposure: weather (outdoor) = 2 inches, interior = 1.5 inches."
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const all = [...STRUCTURAL, ...ELECTRICAL, ...PLUMBING, ...MECHANICAL, ...STRUCTURAL_FIRE];
  console.log(`Seeding ${all.length} code entities (${STRUCTURAL.length} structural, ${ELECTRICAL.length} electrical, ${PLUMBING.length} plumbing, ${MECHANICAL.length} mechanical, ${STRUCTURAL_FIRE.length} fire/structural)…`);

  // Batch in chunks of 10 to avoid payload limits
  const CHUNK = 10;
  let ok = 0;
  for (let i = 0; i < all.length; i += CHUNK) {
    const chunk = all.slice(i, i + CHUNK);
    const success = await post("knowledge_entities", chunk);
    if (success) {
      ok += chunk.length;
      console.log(`  ✔ ${ok}/${all.length}`);
    } else {
      console.error(`  ✗ chunk starting at ${i}`);
    }
  }

  console.log(`\nDone. ${ok} of ${all.length} entities upserted.`);
  console.log(
    `Next: cross-check by running \`select count(*) from knowledge_entities where entity_type = 'building_code' and (metadata->>'adopted_by')::jsonb ?| array['ca-la','ca-sf','az-phx','nv-lv']\` in Supabase.`
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
