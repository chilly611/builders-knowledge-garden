// Mock knowledge data — will be replaced by Supabase queries
// Demonstrates the knowledge engine powering every feature

export const BUILDING_TYPES = [
  { id: "sfr", name: "Single-Family Residence", icon: "🏠", category: "residential",
    description: "Detached home for one family", typical_sf: "1,200-5,000 sf",
    typical_cost: "$150-$400/sf", typical_duration: "6-14 months" },
  { id: "mfr", name: "Multi-Family Residential", icon: "🏢", category: "residential",
    description: "Apartments, condos, townhomes", typical_sf: "10,000-200,000 sf",
    typical_cost: "$200-$450/sf", typical_duration: "12-30 months" },
  { id: "office", name: "Commercial Office", icon: "🏛️", category: "commercial",
    description: "Office building, coworking, mixed-use", typical_sf: "5,000-500,000 sf",
    typical_cost: "$250-$600/sf", typical_duration: "12-36 months" },
  { id: "retail", name: "Retail / Restaurant", icon: "🏪", category: "commercial",
    description: "Shops, restaurants, malls", typical_sf: "1,000-100,000 sf",
    typical_cost: "$200-$500/sf", typical_duration: "6-18 months" },
  { id: "warehouse", name: "Industrial / Warehouse", icon: "🏭", category: "industrial",
    description: "Warehouse, factory, logistics center", typical_sf: "20,000-1,000,000 sf",
    typical_cost: "$80-$200/sf", typical_duration: "8-24 months" },
  { id: "datacenter", name: "Data Center", icon: "🖥️", category: "specialty",
    description: "Mission-critical computing facility", typical_sf: "10,000-500,000 sf",
    typical_cost: "$800-$2,000/sf", typical_duration: "12-36 months" },
  { id: "hospital", name: "Healthcare / Hospital", icon: "🏥", category: "institutional",
    description: "Hospital, clinic, medical office", typical_sf: "20,000-1,000,000 sf",
    typical_cost: "$400-$1,200/sf", typical_duration: "18-48 months" },
  { id: "school", name: "Educational", icon: "🎓", category: "institutional",
    description: "School, university, library", typical_sf: "10,000-300,000 sf",
    typical_cost: "$300-$600/sf", typical_duration: "12-30 months" },
  { id: "hotel", name: "Hospitality", icon: "🏨", category: "commercial",
    description: "Hotel, resort, convention center", typical_sf: "20,000-500,000 sf",
    typical_cost: "$300-$800/sf", typical_duration: "14-36 months" },
  { id: "solar", name: "Solar / Renewable Energy", icon: "☀️", category: "infrastructure",
    description: "Solar farm, wind farm, BESS", typical_sf: "Varies (MW-based)",
    typical_cost: "$1-$3/watt", typical_duration: "6-24 months" },
  { id: "bridge", name: "Infrastructure / Bridge", icon: "🌉", category: "infrastructure",
    description: "Bridge, tunnel, highway, rail", typical_sf: "Varies",
    typical_cost: "Varies by scope", typical_duration: "12-60 months" },
  { id: "adu", name: "ADU / Tiny Home", icon: "🏡", category: "residential",
    description: "Accessory dwelling unit, tiny house", typical_sf: "200-1,200 sf",
    typical_cost: "$200-$500/sf", typical_duration: "3-8 months" },
];

// Jurisdiction catalog.
//
// UI-first pass: entries include `state` and (for US cities) `county`,
// so the Code Compliance picker can render a hierarchical State → County
// → City view using optgroups. Real local amendment data still needs
// to be ingested (Week 3).
//
// Type is kept open so we can add new fields (metro area, ahj slug, etc.)
// without touching every importer.
export interface Jurisdiction {
  id: string;
  name: string;
  code: string;
  year: number;
  level: "international" | "country" | "state" | "county" | "city";
  state?: string;
  county?: string;
}

export const JURISDICTIONS: Jurisdiction[] = [
  // International / fallback
  { id: "ibc-2024", name: "IBC 2024 (International)", code: "IBC", year: 2024, level: "international" },

  // ── California ────────────────────────────────────────────────────────
  // State baseline
  { id: "ca-state", name: "California (statewide)", code: "CBC", year: 2022, level: "state", state: "California" },

  // Los Angeles County
  { id: "ca-la-county", name: "Los Angeles County", code: "CBC + LA County amendments", year: 2022, level: "county", state: "California", county: "Los Angeles" },
  { id: "ca-la", name: "Los Angeles, CA", code: "LAMC + CBC", year: 2022, level: "city", state: "California", county: "Los Angeles" },
  { id: "ca-long-beach", name: "Long Beach, CA", code: "LBMC + CBC", year: 2022, level: "city", state: "California", county: "Los Angeles" },
  { id: "ca-pasadena", name: "Pasadena, CA", code: "CBC + Pasadena amendments", year: 2022, level: "city", state: "California", county: "Los Angeles" },
  { id: "ca-santa-monica", name: "Santa Monica, CA", code: "CBC + Santa Monica amendments", year: 2022, level: "city", state: "California", county: "Los Angeles" },
  { id: "ca-burbank", name: "Burbank, CA", code: "CBC + Burbank amendments", year: 2022, level: "city", state: "California", county: "Los Angeles" },

  // San Francisco (city-county)
  { id: "ca-sf", name: "San Francisco, CA", code: "SFBC", year: 2022, level: "city", state: "California", county: "San Francisco" },

  // San Diego County
  { id: "ca-sd-county", name: "San Diego County", code: "CBC + SD County amendments", year: 2022, level: "county", state: "California", county: "San Diego" },
  { id: "ca-sd", name: "San Diego, CA", code: "CBC + SD amendments", year: 2022, level: "city", state: "California", county: "San Diego" },
  { id: "ca-chula-vista", name: "Chula Vista, CA", code: "CBC + Chula Vista amendments", year: 2022, level: "city", state: "California", county: "San Diego" },
  { id: "ca-oceanside", name: "Oceanside, CA", code: "CBC + Oceanside amendments", year: 2022, level: "city", state: "California", county: "San Diego" },
  { id: "ca-carlsbad", name: "Carlsbad, CA", code: "CBC + Carlsbad amendments", year: 2022, level: "city", state: "California", county: "San Diego" },
  { id: "ca-encinitas", name: "Encinitas, CA", code: "CBC + Encinitas amendments", year: 2022, level: "city", state: "California", county: "San Diego" },

  // Ventura County
  { id: "ca-ventura-county", name: "Ventura County", code: "CBC + Ventura County amendments", year: 2022, level: "county", state: "California", county: "Ventura" },
  { id: "ca-ventura", name: "Ventura, CA", code: "CBC + Ventura amendments", year: 2022, level: "city", state: "California", county: "Ventura" },
  { id: "ca-oxnard", name: "Oxnard, CA", code: "CBC + Oxnard amendments", year: 2022, level: "city", state: "California", county: "Ventura" },
  { id: "ca-thousand-oaks", name: "Thousand Oaks, CA", code: "CBC + Thousand Oaks amendments", year: 2022, level: "city", state: "California", county: "Ventura" },
  { id: "ca-simi-valley", name: "Simi Valley, CA", code: "CBC + Simi Valley amendments", year: 2022, level: "city", state: "California", county: "Ventura" },
  { id: "ca-camarillo", name: "Camarillo, CA", code: "CBC + Camarillo amendments", year: 2022, level: "city", state: "California", county: "Ventura" },

  // Riverside County
  { id: "ca-riverside-county", name: "Riverside County", code: "CBC + Riverside County amendments", year: 2022, level: "county", state: "California", county: "Riverside" },
  { id: "ca-riverside", name: "Riverside, CA", code: "CBC + Riverside amendments", year: 2022, level: "city", state: "California", county: "Riverside" },
  { id: "ca-temecula", name: "Temecula, CA", code: "CBC + Temecula amendments", year: 2022, level: "city", state: "California", county: "Riverside" },
  { id: "ca-palm-springs", name: "Palm Springs, CA", code: "CBC + Palm Springs amendments", year: 2022, level: "city", state: "California", county: "Riverside" },
  { id: "ca-palm-desert", name: "Palm Desert, CA", code: "CBC + Palm Desert amendments", year: 2022, level: "city", state: "California", county: "Riverside" },
  { id: "ca-moreno-valley", name: "Moreno Valley, CA", code: "CBC + Moreno Valley amendments", year: 2022, level: "city", state: "California", county: "Riverside" },
  { id: "ca-corona", name: "Corona, CA", code: "CBC + Corona amendments", year: 2022, level: "city", state: "California", county: "Riverside" },

  // Santa Barbara County
  { id: "ca-sb-county", name: "Santa Barbara County", code: "CBC + SB County amendments", year: 2022, level: "county", state: "California", county: "Santa Barbara" },
  { id: "ca-santa-barbara", name: "Santa Barbara, CA", code: "CBC + Santa Barbara amendments", year: 2022, level: "city", state: "California", county: "Santa Barbara" },
  { id: "ca-santa-maria", name: "Santa Maria, CA", code: "CBC + Santa Maria amendments", year: 2022, level: "city", state: "California", county: "Santa Barbara" },
  { id: "ca-goleta", name: "Goleta, CA", code: "CBC + Goleta amendments", year: 2022, level: "city", state: "California", county: "Santa Barbara" },

  // Orange County
  { id: "ca-oc-county", name: "Orange County", code: "CBC + OC amendments", year: 2022, level: "county", state: "California", county: "Orange" },
  { id: "ca-anaheim", name: "Anaheim, CA", code: "CBC + Anaheim amendments", year: 2022, level: "city", state: "California", county: "Orange" },
  { id: "ca-santa-ana", name: "Santa Ana, CA", code: "CBC + Santa Ana amendments", year: 2022, level: "city", state: "California", county: "Orange" },
  { id: "ca-irvine", name: "Irvine, CA", code: "CBC + Irvine amendments", year: 2022, level: "city", state: "California", county: "Orange" },
  { id: "ca-huntington-beach", name: "Huntington Beach, CA", code: "CBC + HB amendments", year: 2022, level: "city", state: "California", county: "Orange" },
  { id: "ca-newport-beach", name: "Newport Beach, CA", code: "CBC + Newport Beach amendments", year: 2022, level: "city", state: "California", county: "Orange" },
  { id: "ca-costa-mesa", name: "Costa Mesa, CA", code: "CBC + Costa Mesa amendments", year: 2022, level: "city", state: "California", county: "Orange" },

  // San Bernardino County
  { id: "ca-sbd-county", name: "San Bernardino County", code: "CBC + San Bernardino County amendments", year: 2022, level: "county", state: "California", county: "San Bernardino" },
  { id: "ca-san-bernardino", name: "San Bernardino, CA", code: "CBC + San Bernardino amendments", year: 2022, level: "city", state: "California", county: "San Bernardino" },
  { id: "ca-fontana", name: "Fontana, CA", code: "CBC + Fontana amendments", year: 2022, level: "city", state: "California", county: "San Bernardino" },
  { id: "ca-ontario", name: "Ontario, CA", code: "CBC + Ontario amendments", year: 2022, level: "city", state: "California", county: "San Bernardino" },

  // Bay Area overflow (Alameda, Santa Clara, Contra Costa)
  { id: "ca-alameda-county", name: "Alameda County", code: "CBC + Alameda County amendments", year: 2022, level: "county", state: "California", county: "Alameda" },
  { id: "ca-oakland", name: "Oakland, CA", code: "CBC + Oakland amendments", year: 2022, level: "city", state: "California", county: "Alameda" },
  { id: "ca-berkeley", name: "Berkeley, CA", code: "CBC + Berkeley amendments", year: 2022, level: "city", state: "California", county: "Alameda" },
  { id: "ca-santa-clara-county", name: "Santa Clara County", code: "CBC + SC County amendments", year: 2022, level: "county", state: "California", county: "Santa Clara" },
  { id: "ca-san-jose", name: "San Jose, CA", code: "CBC + San Jose amendments", year: 2022, level: "city", state: "California", county: "Santa Clara" },
  { id: "ca-contra-costa-county", name: "Contra Costa County", code: "CBC + CC County amendments", year: 2022, level: "county", state: "California", county: "Contra Costa" },

  // Sacramento
  { id: "ca-sacramento-county", name: "Sacramento County", code: "CBC + Sacramento County amendments", year: 2022, level: "county", state: "California", county: "Sacramento" },
  { id: "ca-sacramento", name: "Sacramento, CA", code: "CBC + Sacramento amendments", year: 2022, level: "city", state: "California", county: "Sacramento" },

  // ── Arizona ───────────────────────────────────────────────────────────
  { id: "az-state", name: "Arizona (statewide)", code: "IBC + state amendments", year: 2021, level: "state", state: "Arizona" },
  { id: "az-phx", name: "Phoenix, AZ", code: "IBC + local", year: 2021, level: "city", state: "Arizona", county: "Maricopa" },
  { id: "az-tuc", name: "Tucson, AZ", code: "IBC + local", year: 2021, level: "city", state: "Arizona", county: "Pima" },
  { id: "az-flag", name: "Flagstaff, AZ", code: "IBC + local (climate zone 5)", year: 2021, level: "city", state: "Arizona", county: "Coconino" },

  // ── Nevada ────────────────────────────────────────────────────────────
  { id: "nv-state", name: "Nevada (statewide)", code: "IBC + state amendments", year: 2018, level: "state", state: "Nevada" },
  { id: "nv-clark-county", name: "Clark County, NV", code: "Southern Nevada Amendments to IBC", year: 2018, level: "county", state: "Nevada", county: "Clark" },
  { id: "nv-lv", name: "Las Vegas, NV", code: "Southern Nevada Amendments to IBC", year: 2018, level: "city", state: "Nevada", county: "Clark" },
  { id: "nv-hen", name: "Henderson, NV", code: "Southern Nevada Amendments to IBC", year: 2018, level: "city", state: "Nevada", county: "Clark" },
  { id: "nv-washoe-county", name: "Washoe County, NV", code: "IBC + Washoe County amendments", year: 2018, level: "county", state: "Nevada", county: "Washoe" },
  { id: "nv-ro", name: "Reno, NV", code: "IBC + Washoe County amendments", year: 2018, level: "city", state: "Nevada", county: "Washoe" },

  // ── Other US (kept from prior list) ───────────────────────────────────
  { id: "ny-nyc", name: "New York City, NY", code: "NYC BC", year: 2022, level: "city", state: "New York" },
  { id: "tx-aus", name: "Austin, TX", code: "IBC + local", year: 2021, level: "city", state: "Texas" },
  { id: "tx-hou", name: "Houston, TX", code: "IBC 2021", year: 2021, level: "city", state: "Texas" },
  { id: "nc-ash", name: "Asheville, NC", code: "NC State BC", year: 2024, level: "city", state: "North Carolina" },
  { id: "fl-mia", name: "Miami, FL", code: "FBC", year: 2023, level: "city", state: "Florida" },
  { id: "co-den", name: "Denver, CO", code: "DBC", year: 2021, level: "city", state: "Colorado" },
  { id: "wa-sea", name: "Seattle, WA", code: "SBC", year: 2021, level: "city", state: "Washington" },
  { id: "il-chi", name: "Chicago, IL", code: "MBC", year: 2022, level: "city", state: "Illinois" },

  // ── International ─────────────────────────────────────────────────────
  { id: "uk-london", name: "London, UK", code: "UK Building Regs", year: 2024, level: "city", state: "England" },
  { id: "eu-berlin", name: "Berlin, Germany", code: "Eurocodes + BauO", year: 2024, level: "city", state: "Germany" },
  { id: "jp-tokyo", name: "Tokyo, Japan", code: "BSL Japan", year: 2024, level: "city", state: "Japan" },
  { id: "au-sydney", name: "Sydney, Australia", code: "NCC 2024", year: 2024, level: "city", state: "NSW" },
  { id: "ae-dubai", name: "Dubai, UAE", code: "DM Code", year: 2023, level: "city", state: "UAE" },
];

/**
 * Group jurisdictions hierarchically by state and (where present) county.
 * Used by the Code Compliance picker to render optgroups.
 *
 * Entries with no county are returned under a "(statewide)" synthetic bucket
 * so they still appear in the grouped picker.
 */
export function groupJurisdictions(
  entries: Jurisdiction[] = JURISDICTIONS
): Array<{
  state: string;
  counties: Array<{ county: string; jurisdictions: Jurisdiction[] }>;
}> {
  const states = new Map<string, Map<string, Jurisdiction[]>>();
  for (const j of entries) {
    const stateKey = j.state ?? "Other";
    const countyKey = j.county ?? "(statewide)";
    if (!states.has(stateKey)) states.set(stateKey, new Map());
    const countyMap = states.get(stateKey)!;
    if (!countyMap.has(countyKey)) countyMap.set(countyKey, []);
    countyMap.get(countyKey)!.push(j);
  }
  return Array.from(states.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([state, countyMap]) => ({
      state,
      counties: Array.from(countyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([county, jurisdictions]) => ({
          county,
          jurisdictions: [...jurisdictions].sort((a, b) => a.name.localeCompare(b.name)),
        })),
    }));
}

export const PROJECT_PHASES = [
  { id: "precon", name: "Pre-Construction", color: "#7F77DD", icon: "📐",
    tasks: ["Site survey & geotechnical", "Architectural design", "Engineering review", "Permit applications", "Contractor bidding", "Material procurement planning"] },
  { id: "sitework", name: "Site Work", color: "#D85A30", icon: "🚜",
    tasks: ["Clearing & grading", "Excavation", "Utilities rough-in", "Foundation preparation", "Erosion control", "Temporary facilities"] },
  { id: "foundation", name: "Foundation", color: "#1D9E75", icon: "🧱",
    tasks: ["Footings", "Foundation walls", "Waterproofing", "Backfill", "Foundation inspection", "Slab on grade"] },
  { id: "structure", name: "Structure", color: "#378ADD", icon: "🏗️",
    tasks: ["Framing / structural steel", "Sheathing", "Roof structure", "Structural inspection", "Fire stopping", "Stairs & elevators"] },
  { id: "envelope", name: "Building Envelope", color: "#BA7517", icon: "🪟",
    tasks: ["Exterior walls", "Windows & doors", "Roofing", "Insulation", "Air barrier", "Flashing & waterproofing"] },
  { id: "mep_rough", name: "MEP Rough-In", color: "#EC4899", icon: "⚡",
    tasks: ["Electrical rough-in", "Plumbing rough-in", "HVAC ductwork", "Fire sprinkler", "Low voltage / data", "MEP inspection"] },
  { id: "interior", name: "Interior Finishes", color: "#639922", icon: "🎨",
    tasks: ["Drywall", "Taping & mudding", "Painting", "Flooring", "Cabinetry & millwork", "Tile work"] },
  { id: "mep_finish", name: "MEP Finish", color: "#8B5CF6", icon: "💡",
    tasks: ["Electrical trim", "Plumbing fixtures", "HVAC equipment", "Controls & BMS", "Testing & balancing", "Final MEP inspection"] },
  { id: "closeout", name: "Closeout & Delivery", color: "#06B6D4", icon: "🔑",
    tasks: ["Punch list", "Final inspections", "Certificate of occupancy", "Commissioning", "As-built documentation", "Owner training & handoff"] },
];

// Auto-populated based on building type + jurisdiction
export function getCodeRequirements(buildingType: string, jurisdiction: string) {
  // In production: query knowledge_entities WHERE type='code_section' AND jurisdiction=X AND building_type=Y
  return [
    { code: "IBC Chapter 3", title: "Use & Occupancy Classification", status: "applicable", priority: "high" },
    { code: "IBC Chapter 5", title: "General Building Heights & Areas", status: "applicable", priority: "high" },
    { code: "IBC Chapter 7", title: "Fire & Smoke Protection", status: "applicable", priority: "critical" },
    { code: "IBC Chapter 9", title: "Fire Protection & Life Safety Systems", status: "applicable", priority: "critical" },
    { code: "IBC Chapter 10", title: "Means of Egress", status: "applicable", priority: "critical" },
    { code: "IBC Chapter 16", title: "Structural Design", status: "applicable", priority: "high" },
    { code: "NFPA 13", title: "Standard for Installation of Sprinkler Systems", status: "review needed", priority: "high" },
    { code: "ASHRAE 90.1", title: "Energy Standard for Buildings", status: "applicable", priority: "medium" },
    { code: "ADA / ICC A117.1", title: "Accessible Design", status: "applicable", priority: "high" },
    { code: "NEC Article 210", title: "Branch Circuits", status: "applicable", priority: "medium" },
  ];
}

export function getPermitRequirements(buildingType: string, jurisdiction: string) {
  return [
    { type: "Building Permit", authority: "Dept. of Building Safety", timeline: "4-8 weeks", fee: "$2,500-$15,000", status: "required" },
    { type: "Grading Permit", authority: "Public Works", timeline: "2-4 weeks", fee: "$500-$3,000", status: "required" },
    { type: "Electrical Permit", authority: "Dept. of Building Safety", timeline: "1-2 weeks", fee: "$200-$1,500", status: "required" },
    { type: "Plumbing Permit", authority: "Dept. of Building Safety", timeline: "1-2 weeks", fee: "$200-$1,000", status: "required" },
    { type: "Mechanical Permit", authority: "Dept. of Building Safety", timeline: "1-2 weeks", fee: "$200-$1,000", status: "required" },
    { type: "Fire Department Review", authority: "Fire Marshal", timeline: "2-6 weeks", fee: "$500-$5,000", status: "required" },
    { type: "Environmental Review", authority: "Planning Dept.", timeline: "4-12 weeks", fee: "$1,000-$10,000", status: "may be required" },
  ];
}

export function getTeamNeeds(buildingType: string) {
  return [
    { role: "Architect", required: true, typical_fee: "8-12% of construction cost", phase: "Design" },
    { role: "Structural Engineer", required: true, typical_fee: "1-3% of construction cost", phase: "Design" },
    { role: "MEP Engineer", required: true, typical_fee: "2-4% of construction cost", phase: "Design" },
    { role: "General Contractor", required: true, typical_fee: "10-20% markup", phase: "Construction" },
    { role: "Civil Engineer", required: true, typical_fee: "1-2% of construction cost", phase: "Site Work" },
    { role: "Geotechnical Engineer", required: true, typical_fee: "$3,000-$15,000", phase: "Pre-Construction" },
    { role: "Surveyor", required: true, typical_fee: "$2,000-$8,000", phase: "Pre-Construction" },
    { role: "Interior Designer", required: false, typical_fee: "5-15% of interior budget", phase: "Design" },
    { role: "Landscape Architect", required: false, typical_fee: "5-10% of landscape budget", phase: "Design" },
    { role: "Permit Expediter", required: false, typical_fee: "$2,000-$10,000", phase: "Pre-Construction" },
  ];
}

export function generateEstimate(buildingType: string, sf: number, quality: string) {
  const rates: Record<string, Record<string, number>> = {
    sfr: { economy: 180, standard: 280, premium: 420 },
    mfr: { economy: 220, standard: 320, premium: 480 },
    office: { economy: 280, standard: 400, premium: 650 },
    retail: { economy: 220, standard: 350, premium: 520 },
    warehouse: { economy: 90, standard: 140, premium: 210 },
    datacenter: { economy: 900, standard: 1200, premium: 1800 },
    hospital: { economy: 450, standard: 700, premium: 1100 },
    hotel: { economy: 320, standard: 500, premium: 800 },
  };
  const rate = rates[buildingType]?.[quality] || 300;
  const base = sf * rate;
  return [
    { division: "01 - General Requirements", pct: 0.08, amount: Math.round(base * 0.08) },
    { division: "02 - Existing Conditions", pct: 0.02, amount: Math.round(base * 0.02) },
    { division: "03 - Concrete", pct: 0.12, amount: Math.round(base * 0.12) },
    { division: "04 - Masonry", pct: 0.04, amount: Math.round(base * 0.04) },
    { division: "05 - Metals", pct: 0.08, amount: Math.round(base * 0.08) },
    { division: "06 - Wood & Plastics", pct: 0.10, amount: Math.round(base * 0.10) },
    { division: "07 - Thermal & Moisture", pct: 0.06, amount: Math.round(base * 0.06) },
    { division: "08 - Openings", pct: 0.05, amount: Math.round(base * 0.05) },
    { division: "09 - Finishes", pct: 0.10, amount: Math.round(base * 0.10) },
    { division: "21 - Fire Suppression", pct: 0.03, amount: Math.round(base * 0.03) },
    { division: "22 - Plumbing", pct: 0.06, amount: Math.round(base * 0.06) },
    { division: "23 - HVAC", pct: 0.10, amount: Math.round(base * 0.10) },
    { division: "26 - Electrical", pct: 0.10, amount: Math.round(base * 0.10) },
    { division: "31 - Earthwork", pct: 0.03, amount: Math.round(base * 0.03) },
    { division: "32 - Exterior Improvements", pct: 0.03, amount: Math.round(base * 0.03) },
  ];
}


// ─── MATERIAL SUGGESTIONS ───
// Auto-populated based on building type + jurisdiction + quality level
export interface MaterialSuggestion {
  name: string;
  category: string;
  spec: string;
  codeRef: string;
  compliance: "compliant" | "review_needed" | "not_applicable";
  costRange: string;
  leadTime: string;
  sustainability: "A" | "B" | "C" | "D";
}

export function getMaterialSuggestions(buildingType: string, jurisdiction: string, quality: string): MaterialSuggestion[] {
  // In production: query knowledge_entities WHERE type IN ('material','product') AND jurisdiction=X AND building_type=Y
  const base: MaterialSuggestion[] = [
    { name: "Concrete — 4000 PSI Normal Weight", category: "Structural", spec: "ACI 318, CSI 03 31 00", codeRef: "IBC Ch.19", compliance: "compliant", costRange: "$130-$160/yd³", leadTime: "1-3 days", sustainability: "C" },
    { name: "Structural Steel — A992 W-shapes", category: "Structural", spec: "AISC 360, CSI 05 12 00", codeRef: "IBC Ch.22", compliance: "compliant", costRange: "$2,200-$3,500/ton", leadTime: "8-16 weeks", sustainability: "B" },
    { name: "Type X Gypsum Board — 5/8\"", category: "Fire Protection", spec: "ASTM C1396, CSI 09 29 00", codeRef: "IBC Table 601", compliance: "compliant", costRange: "$12-$18/sheet", leadTime: "1-2 weeks", sustainability: "B" },
    { name: "Fiberglass Batt Insulation — R-19", category: "Envelope", spec: "ASTM C665, CSI 07 21 00", codeRef: "ASHRAE 90.1 Sec.5", compliance: "review_needed", costRange: "$0.50-$0.85/sf", leadTime: "1 week", sustainability: "B" },
    { name: "Standing Seam Metal Roof — 24ga", category: "Envelope", spec: "ASTM A653, CSI 07 41 00", codeRef: "IBC Ch.15", compliance: "compliant", costRange: "$8-$14/sf", leadTime: "4-8 weeks", sustainability: "A" },
    { name: "Low-E Insulated Glass Unit", category: "Openings", spec: "ASTM E2190, CSI 08 80 00", codeRef: "ASHRAE 90.1 Table 5.5", compliance: "compliant", costRange: "$25-$55/sf", leadTime: "4-10 weeks", sustainability: "A" },
    { name: "CPVC Piping — Schedule 80", category: "Plumbing", spec: "ASTM F441, CSI 22 11 00", codeRef: "IPC Ch.6", compliance: "compliant", costRange: "$3-$8/lf", leadTime: "1-2 weeks", sustainability: "C" },
    { name: "THHN/THWN Copper Wire — 12 AWG", category: "Electrical", spec: "UL 83, CSI 26 05 19", codeRef: "NEC Art.310", compliance: "compliant", costRange: "$0.35-$0.65/lf", leadTime: "1 week", sustainability: "B" },
  ];

  // Add quality-specific materials
  if (quality === "premium") {
    base.push(
      { name: "Cross-Laminated Timber (CLT) Panels", category: "Structural", spec: "APA PRG 320, CSI 06 17 00", codeRef: "IBC Ch.23 Type IV", compliance: "review_needed", costRange: "$25-$45/sf", leadTime: "8-16 weeks", sustainability: "A" },
      { name: "Triple-Pane Argon-Filled Glass", category: "Openings", spec: "NFRC certified, CSI 08 80 00", codeRef: "ASHRAE 90.1", compliance: "compliant", costRange: "$45-$80/sf", leadTime: "6-12 weeks", sustainability: "A" },
    );
  }

  // Add building-type-specific materials
  if (buildingType === "datacenter") {
    base.push(
      { name: "Raised Access Floor — 24\" Pedestal", category: "Specialty", spec: "CISCA/PSA, CSI 09 69 00", codeRef: "ASHRAE TC 9.9", compliance: "compliant", costRange: "$14-$28/sf", leadTime: "6-10 weeks", sustainability: "B" },
      { name: "Clean Agent Fire Suppression (FM-200)", category: "Fire Protection", spec: "NFPA 2001, CSI 21 22 00", codeRef: "IBC 903.3", compliance: "compliant", costRange: "$6-$12/sf", leadTime: "4-8 weeks", sustainability: "C" },
    );
  }

  if (buildingType === "hospital") {
    base.push(
      { name: "Antimicrobial Vinyl Sheet Flooring", category: "Finishes", spec: "ASTM F1303, CSI 09 65 00", codeRef: "FGI Guidelines", compliance: "compliant", costRange: "$4-$9/sf", leadTime: "2-4 weeks", sustainability: "B" },
    );
  }

  return base;
}

// ─── CONSTRAINT-AWARE SCHEDULE GENERATION ───
export interface ScheduleTask {
  id: string;
  name: string;
  phase: string;
  phaseColor: string;
  duration: string;
  startWeek: number;
  endWeek: number;
  dependencies: string[];
  holdPoint: boolean;
  holdPointReason?: string;
  critical: boolean;
}

export function generateSchedule(buildingType: string, sqft: number, jurisdiction: string): { tasks: ScheduleTask[]; totalWeeks: number; criticalPath: string[] } {
  // Scale factor based on size
  const scale = sqft < 3000 ? 0.7 : sqft < 10000 ? 1.0 : sqft < 50000 ? 1.3 : 1.6;

  const w = (base: number) => Math.max(1, Math.round(base * scale));

  let week = 0;
  const tasks: ScheduleTask[] = [];
  const add = (id: string, name: string, phase: string, color: string, dur: number, deps: string[], hold = false, holdReason?: string, critical = false) => {
    const startWeek = week;
    const endWeek = week + dur;
    tasks.push({ id, name, phase, phaseColor: color, duration: `${dur} wk`, startWeek, endWeek, dependencies: deps, holdPoint: hold, holdPointReason: holdReason, critical });
    return endWeek;
  };

  // ── PRE-CONSTRUCTION ──
  const perm = add("permits", "Permit Applications", "Pre-Construction", "#7F77DD", w(6), [], false, undefined, true);
  add("survey", "Site Survey + Geotech", "Pre-Construction", "#7F77DD", w(2), []);
  add("design", "Design Development", "Pre-Construction", "#7F77DD", w(4), []);
  week = perm; // permits are the bottleneck

  // ── SITE WORK ──
  week = add("clear", "Clearing & Grading", "Site Work", "#D85A30", w(2), ["permits"], false, undefined, true);
  week = add("excavate", "Excavation", "Site Work", "#D85A30", w(2), ["clear"], false, undefined, true);
  week = add("util_rough", "Utility Rough-in", "Site Work", "#D85A30", w(2), ["excavate"]);

  // ── FOUNDATION ──
  week = add("footing", "Footings + Foundation", "Foundation", "#1D9E75", w(3), ["excavate"], false, undefined, true);
  week = add("found_insp", "Foundation Inspection", "Foundation", "#1D9E75", 1, ["footing"], true, "AHJ inspection hold point — no work above grade until passed", true);
  week = add("slab", "Slab on Grade / Backfill", "Foundation", "#1D9E75", w(2), ["found_insp"]);

  // ── STRUCTURE ──
  week = add("framing", "Framing / Structural Steel", "Structure", "#378ADD", w(4), ["found_insp"], false, undefined, true);
  week = add("struct_insp", "Structural Inspection", "Structure", "#378ADD", 1, ["framing"], true, "Structural inspection — envelope cannot begin until passed", true);
  week = add("roof_struct", "Roof Structure", "Structure", "#378ADD", w(2), ["struct_insp"]);

  // ── ENVELOPE ──
  week = add("ext_walls", "Exterior Walls + Sheathing", "Envelope", "#BA7517", w(3), ["struct_insp"]);
  week = add("windows", "Windows + Doors", "Envelope", "#BA7517", w(2), ["ext_walls"]);
  week = add("roofing", "Roofing + Flashing", "Envelope", "#BA7517", w(2), ["roof_struct"]);
  week = add("insulation", "Insulation + Air Barrier", "Envelope", "#BA7517", w(2), ["windows"]);

  // ── MEP ROUGH-IN ──
  week = add("elec_rough", "Electrical Rough-in", "MEP Rough-In", "#EC4899", w(3), ["struct_insp"]);
  week = add("plmb_rough", "Plumbing Rough-in", "MEP Rough-In", "#EC4899", w(3), ["struct_insp"]);
  week = add("hvac_rough", "HVAC Ductwork", "MEP Rough-In", "#EC4899", w(3), ["struct_insp"]);
  week = add("mep_insp", "MEP Rough Inspection", "MEP Rough-In", "#EC4899", 1, ["elec_rough", "plmb_rough", "hvac_rough"], true, "MEP rough inspection — walls cannot close until passed", true);

  // ── INTERIOR FINISHES ──
  week = add("drywall", "Drywall + Tape", "Interior Finishes", "#639922", w(3), ["mep_insp", "insulation"], false, undefined, true);
  week = add("paint", "Paint + Prime", "Interior Finishes", "#639922", w(2), ["drywall"]);
  week = add("flooring", "Flooring", "Interior Finishes", "#639922", w(2), ["paint"]);
  week = add("cabinets", "Cabinetry + Millwork", "Interior Finishes", "#639922", w(2), ["drywall"]);

  // ── MEP FINISH ──
  week = add("elec_trim", "Electrical Trim", "MEP Finish", "#8B5CF6", w(2), ["drywall"]);
  week = add("plmb_fix", "Plumbing Fixtures", "MEP Finish", "#8B5CF6", w(2), ["cabinets"]);
  week = add("hvac_equip", "HVAC Equipment + TAB", "MEP Finish", "#8B5CF6", w(2), ["drywall"]);

  // ── CLOSEOUT ──
  week = add("punch", "Punch List", "Closeout", "#06B6D4", w(2), ["flooring", "elec_trim", "plmb_fix", "hvac_equip"], false, undefined, true);
  week = add("final_insp", "Final Inspections", "Closeout", "#06B6D4", 1, ["punch"], true, "Final building inspection + fire marshal — CO depends on this", true);
  week = add("co", "Certificate of Occupancy", "Closeout", "#06B6D4", 1, ["final_insp"], true, "AHJ issues CO — building cannot be occupied until granted", true);
  week = add("handoff", "Owner Training + Handoff", "Closeout", "#06B6D4", 1, ["co"]);

  const totalWeeks = Math.max(...tasks.map(t => t.endWeek));
  const criticalPath = tasks.filter(t => t.critical).map(t => t.id);

  return { tasks, totalWeeks, criticalPath };
}
