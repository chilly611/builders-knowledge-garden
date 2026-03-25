// Builder's Knowledge Garden — Dream Parser
// Extracts structured project parameters from natural language input
// "I want to build a modern farmhouse in Asheville with 3 bedrooms under $500K"
// → { buildingType: "sfr", location: "nc-ash", sqft: 2500, budget: 500000, style: "modern farmhouse", features: ["3 bedrooms"] }

import { BUILDING_TYPES, JURISDICTIONS, generateEstimate, getCodeRequirements, getPermitRequirements, getTeamNeeds } from "./knowledge-data";

export interface DreamInput {
  raw: string;
  buildingType: string | null;
  buildingTypeMatch: { id: string; name: string; icon: string } | null;
  location: string | null;
  locationMatch: { id: string; name: string; code: string } | null;
  sqft: number | null;
  budget: number | null;
  style: string | null;
  features: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  stories: number | null;
}

export interface DreamPlan {
  input: DreamInput;
  estimate: { division: string; pct: number; amount: number }[];
  totalCost: number;
  costPerSf: number;
  sqft: number;
  quality: string;
  codes: ReturnType<typeof getCodeRequirements>;
  permits: ReturnType<typeof getPermitRequirements>;
  team: ReturnType<typeof getTeamNeeds>;
  timeline: string;
  challenges: string[];
  nextSteps: string[];
  confidence: number;
}

// ─── BUILDING TYPE DETECTION ───
const TYPE_KEYWORDS: Record<string, string[]> = {
  sfr: ["house", "home", "farmhouse", "cottage", "cabin", "ranch", "colonial", "bungalow", "villa", "single family", "single-family", "residence", "dwelling"],
  mfr: ["apartment", "condo", "townhouse", "townhome", "duplex", "triplex", "multi-family", "multi family", "fourplex"],
  office: ["office", "coworking", "co-working", "commercial office"],
  retail: ["retail", "restaurant", "shop", "store", "cafe", "bar", "mall", "shopping"],
  warehouse: ["warehouse", "factory", "industrial", "logistics", "distribution", "manufacturing"],
  datacenter: ["data center", "datacenter", "server farm", "colocation", "colo"],
  hospital: ["hospital", "clinic", "medical", "healthcare", "health care", "urgent care"],
  school: ["school", "university", "college", "library", "classroom", "educational"],
  hotel: ["hotel", "resort", "motel", "inn", "lodge", "hospitality"],
  solar: ["solar", "wind farm", "renewable", "battery storage", "ev charging"],
  bridge: ["bridge", "tunnel", "highway", "road", "infrastructure"],
  adu: ["adu", "accessory dwelling", "tiny home", "tiny house", "granny flat", "in-law suite", "backyard cottage"],
};

// ─── LOCATION DETECTION ───
const LOCATION_KEYWORDS: Record<string, string[]> = {
  "ca-la": ["los angeles", "la", "hollywood", "beverly hills"],
  "ca-sf": ["san francisco", "sf", "bay area"],
  "ca-sd": ["san diego"],
  "ny-nyc": ["new york", "nyc", "manhattan", "brooklyn", "queens"],
  "tx-aus": ["austin", "austin tx"],
  "tx-hou": ["houston"],
  "nc-ash": ["asheville", "asheville nc", "western nc"],
  "fl-mia": ["miami", "south florida", "miami-dade"],
  "co-den": ["denver", "colorado"],
  "wa-sea": ["seattle", "washington state"],
  "il-chi": ["chicago"],
  "az-phx": ["phoenix", "arizona"],
  "uk-london": ["london", "uk", "england"],
  "eu-berlin": ["berlin", "germany"],
  "jp-tokyo": ["tokyo", "japan"],
  "au-sydney": ["sydney", "australia"],
  "ae-dubai": ["dubai", "uae", "abu dhabi"],
};

export function parseDream(input: string): DreamInput {
  const raw = input;
  const lower = input.toLowerCase();

  // Detect building type
  let buildingType: string | null = null;
  let buildingTypeMatch = null;
  for (const [typeId, keywords] of Object.entries(TYPE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        buildingType = typeId;
        buildingTypeMatch = BUILDING_TYPES.find(b => b.id === typeId) || null;
        break;
      }
    }
    if (buildingType) break;
  }

  // Detect location
  let location: string | null = null;
  let locationMatch = null;
  for (const [locId, keywords] of Object.entries(LOCATION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        location = locId;
        const jd = JURISDICTIONS.find(j => j.id === locId);
        locationMatch = jd ? { id: jd.id, name: jd.name, code: jd.code } : null;
        break;
      }
    }
    if (location) break;
  }

  // Detect square footage
  let sqft: number | null = null;
  const sqftMatch = lower.match(/(\d[\d,]*)\s*(?:sq\.?\s*ft|square\s*feet|sf|sqft)/);
  if (sqftMatch) sqft = parseInt(sqftMatch[1].replace(/,/g, ""), 10);

  // Detect budget
  let budget: number | null = null;
  const budgetMatch = lower.match(/\$\s*([\d,.]+)\s*(k|m|million|thousand)?/i);
  if (budgetMatch) {
    let val = parseFloat(budgetMatch[1].replace(/,/g, ""));
    const mult = budgetMatch[2]?.toLowerCase();
    if (mult === "k" || mult === "thousand") val *= 1000;
    if (mult === "m" || mult === "million") val *= 1000000;
    budget = val;
  }
  // Also detect "under 500K" etc without $
  if (!budget) {
    const budgetAlt = lower.match(/(?:under|budget|around|about|max)\s*\$?\s*([\d,.]+)\s*(k|m)?/i);
    if (budgetAlt) {
      let val = parseFloat(budgetAlt[1].replace(/,/g, ""));
      const mult = budgetAlt[2]?.toLowerCase();
      if (mult === "k") val *= 1000;
      if (mult === "m") val *= 1000000;
      budget = val;
    }
  }

  // Detect style
  const styles = ["modern", "contemporary", "traditional", "rustic", "minimalist", "craftsman",
    "mid-century", "farmhouse", "colonial", "mediterranean", "industrial", "scandinavian",
    "art deco", "victorian", "prairie", "zen", "tropical", "mountain"];
  const detectedStyles = styles.filter(s => lower.includes(s));
  const style = detectedStyles.length > 0 ? detectedStyles.join(" ") : null;

  // Detect bedrooms/bathrooms/stories
  const bedroomMatch = lower.match(/(\d+)\s*(?:bed(?:room)?s?|br)/);
  const bathroomMatch = lower.match(/(\d+)\s*(?:bath(?:room)?s?|ba)/);
  const storyMatch = lower.match(/(\d+)\s*(?:stor(?:y|ies)|floor|level)/);

  // Extract features (anything in quotes or after "with")
  const features: string[] = [];
  if (bedroomMatch) features.push(`${bedroomMatch[1]} bedrooms`);
  if (bathroomMatch) features.push(`${bathroomMatch[1]} bathrooms`);
  if (storyMatch) features.push(`${storyMatch[1]} stories`);

  const withMatch = input.match(/with\s+(.+?)(?:\.|,\s*(?:under|budget|in\s)|$)/i);
  if (withMatch) {
    const withParts = withMatch[1].split(/,\s*| and /i).map(s => s.trim()).filter(Boolean);
    for (const p of withParts) {
      if (!features.some(f => f.includes(p.toLowerCase()))) features.push(p);
    }
  }

  // Energy/sustainability keywords
  for (const kw of ["energy-efficient", "energy efficient", "net zero", "net-zero", "passive house",
    "solar panels", "green building", "sustainable", "leed", "eco-friendly"]) {
    if (lower.includes(kw) && !features.includes(kw)) features.push(kw);
  }

  return {
    raw, buildingType, buildingTypeMatch, location, locationMatch,
    sqft, budget, style, features,
    bedrooms: bedroomMatch ? parseInt(bedroomMatch[1], 10) : null,
    bathrooms: bathroomMatch ? parseInt(bathroomMatch[1], 10) : null,
    stories: storyMatch ? parseInt(storyMatch[1], 10) : null,
  };
}

// ─── PLAN GENERATOR ───
export function generateDreamPlan(input: DreamInput): DreamPlan {
  const bt = input.buildingType || "sfr";
  const loc = input.location || "ibc-2024";

  // Estimate sqft if not provided
  let sqft = input.sqft || 2500;
  if (input.bedrooms) sqft = Math.max(sqft, input.bedrooms * 600);

  // Determine quality from budget
  let quality = "standard";
  if (input.budget) {
    const budgetPerSf = input.budget / sqft;
    if (budgetPerSf < 200) quality = "economy";
    else if (budgetPerSf > 400) quality = "premium";
  }

  const estimate = generateEstimate(bt, sqft, quality);
  const totalCost = estimate.reduce((s, e) => s + e.amount, 0);
  const codes = getCodeRequirements(bt, loc);
  const permits = getPermitRequirements(bt, loc);
  const team = getTeamNeeds(bt);

  // Timeline estimation
  const timelines: Record<string, string> = {
    sfr: "8-14 months", mfr: "14-30 months", office: "12-36 months",
    retail: "6-18 months", warehouse: "8-24 months", datacenter: "12-36 months",
    hospital: "18-48 months", school: "12-30 months", hotel: "14-36 months",
    solar: "6-24 months", bridge: "12-60 months", adu: "3-8 months",
  };

  // Challenges (context-aware)
  const challenges: string[] = [];
  if (loc === "ca-la" || loc === "ca-sf") challenges.push("California seismic requirements add 5-10% to structural costs");
  if (loc === "fl-mia") challenges.push("Miami-Dade wind code is the strictest in the US — all products need NOA certification");
  if (loc === "nc-ash") challenges.push("Sloped mountain lots require engineered foundations — budget $15-30K extra");
  if (loc === "ny-nyc") challenges.push("NYC requires a Licensed Site Safety Manager for buildings over 15 stories");
  if (bt === "datacenter") challenges.push("Mission-critical facilities require N+1 or 2N redundancy — doubles MEP cost");
  if (bt === "hospital") challenges.push("ICRA requirements affect phasing and containment — add 10-15% to timeline");
  if (quality === "economy") challenges.push("Economy quality may not meet long-term durability expectations — consider standard");
  if (input.features.some(f => f.toLowerCase().includes("energy"))) {
    challenges.push("Net-zero/passive house standards add 10-20% upfront but reduce operating costs 60-80%");
  }
  if (challenges.length === 0) challenges.push("No unusual challenges identified for this project type and location");

  // Next steps
  const nextSteps = [
    "Find a licensed architect experienced with " + (input.buildingTypeMatch?.name || "this building type"),
    "Get a professional site survey and geotechnical report",
    "Start permit applications early — " + (permits[0]?.timeline || "4-8 weeks") + " processing time",
    "Request bids from 3+ general contractors",
    "Review material selections for code compliance",
  ];

  // Confidence based on how much we could parse
  let confidence = 30;
  if (input.buildingType) confidence += 20;
  if (input.location) confidence += 20;
  if (input.sqft || input.bedrooms) confidence += 10;
  if (input.budget) confidence += 10;
  if (input.features.length > 0) confidence += 10;

  return {
    input, estimate, totalCost, costPerSf: Math.round(totalCost / sqft),
    sqft, quality, codes, permits, team,
    timeline: timelines[bt] || "12-24 months",
    challenges, nextSteps, confidence: Math.min(confidence, 100),
  };
}
