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
    metadata,
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
    },
    "Kitchen: minimum 2 × 20A small-appliance circuits plus dedicated circuits for dishwasher, disposal, fridge. Laundry: dedicated 20A circuit. Bathroom: dedicated 20A circuit."
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
    },
    ""
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
    },
    "Common residential mistake: neutral-ground bond on subpanel. Must be bonded only at service equipment per 250.142."
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
    },
    "CA Title 24 Part 6 also requires high-efficacy lighting (99% of new installations) and occupancy sensors in non-habitable rooms. Compliance documentation via CF1R/CF2R/CF3R forms at inspection."
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
    },
    "Verify current code adoption — Southern Nevada occasionally lags NEC cycle by one edition. NV State Contractors Board licensing board is the authoritative reference."
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const all = [...STRUCTURAL, ...ELECTRICAL];
  console.log(`Seeding ${all.length} code entities (${STRUCTURAL.length} structural, ${ELECTRICAL.length} electrical)…`);

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
