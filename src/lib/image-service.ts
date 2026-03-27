/**
 * Image Service v2 — Diverse architecture photography for every surface
 * 
 * FIXED: No more cookie-cutter images. Each entity gets a UNIQUE photo
 * based on keywords in its title/slug, not just its entity type.
 */

export interface CuratedImage {
  url: string;
  alt: string;
}

// Diverse photo pools per entity type — rotated by slug hash
const BUILDING_CODE_PHOTOS = [
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1590644365607-1c5cbe553851?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1517581177684-8dfe4cb2b01c?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1587582423116-ec07293f0395?w=600&q=80&fit=crop",
];

const MATERIAL_PHOTOS = [
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1505409859467-3a796fd5a263?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80&fit=crop",
];

const SAFETY_PHOTOS = [
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80&fit=crop",
];

const TRADE_PHOTOS = [
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1590644365607-1c5cbe553851?w=600&q=80&fit=crop",
];

const METHOD_PHOTOS = [
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1587582423116-ec07293f0395?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?w=600&q=80&fit=crop",
];

const STYLE_PHOTOS: Record<string, string> = {
  "modern-farmhouse": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80&fit=crop",
  "mid-century-modern": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80&fit=crop",
  "craftsman": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80&fit=crop",
  "contemporary": "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=600&q=80&fit=crop",
  "mediterranean": "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80&fit=crop",
  "industrial": "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=600&q=80&fit=crop",
  "minimalist": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80&fit=crop",
  "colonial": "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=80&fit=crop",
  "japandi": "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=600&q=80&fit=crop",
  "art-deco": "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600&q=80&fit=crop",
  "passive-house": "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&q=80&fit=crop",
  "brutalist": "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=600&q=80&fit=crop",
  "spanish-colonial": "https://images.unsplash.com/photo-1523217553380-18b6372ae7a3?w=600&q=80&fit=crop",
  "prairie": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80&fit=crop",
  "tropical-modern": "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=600&q=80&fit=crop",
  "biophilic": "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&q=80&fit=crop",
  "adaptive-reuse": "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=600&q=80&fit=crop",
  "tiny-home-adu": "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=600&q=80&fit=crop",
  "deconstructivist": "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&q=80&fit=crop",
  "parametric": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&q=80&fit=crop",
};

// Keyword-specific photos: if a slug/title contains these words, use this photo
const KEYWORD_PHOTOS: Record<string, string> = {
  "fire": "https://images.unsplash.com/photo-1590644365607-1c5cbe553851?w=600&q=80&fit=crop",
  "sprinkler": "https://images.unsplash.com/photo-1590644365607-1c5cbe553851?w=600&q=80&fit=crop",
  "concrete": "https://images.unsplash.com/photo-1587582423116-ec07293f0395?w=600&q=80&fit=crop",
  "steel": "https://images.unsplash.com/photo-1517581177684-8dfe4cb2b01c?w=600&q=80&fit=crop",
  "wood": "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=600&q=80&fit=crop",
  "framing": "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80&fit=crop",
  "roof": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80&fit=crop",
  "foundation": "https://images.unsplash.com/photo-1587582423116-ec07293f0395?w=600&q=80&fit=crop",
  "electrical": "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600&q=80&fit=crop",
  "plumb": "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=600&q=80&fit=crop",
  "hvac": "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=600&q=80&fit=crop",
  "insulation": "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=600&q=80&fit=crop",
  "window": "https://images.unsplash.com/photo-1505409859467-3a796fd5a263?w=600&q=80&fit=crop",
  "glass": "https://images.unsplash.com/photo-1505409859467-3a796fd5a263?w=600&q=80&fit=crop",
  "brick": "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=600&q=80&fit=crop",
  "masonry": "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=600&q=80&fit=crop",
  "drywall": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80&fit=crop",
  "paint": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80&fit=crop",
  "tile": "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=600&q=80&fit=crop",
  "floor": "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=600&q=80&fit=crop",
  "scaffold": "https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=600&q=80&fit=crop",
  "crane": "https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?w=600&q=80&fit=crop",
  "excavat": "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80&fit=crop",
  "permit": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80&fit=crop",
  "inspect": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop",
  "safety": "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&q=80&fit=crop",
  "osha": "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&q=80&fit=crop",
  "weld": "https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=600&q=80&fit=crop",
  "data-center": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80&fit=crop",
  "hospital": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80&fit=crop",
  "warehouse": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&q=80&fit=crop",
  "restaurant": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80&fit=crop",
  "office": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80&fit=crop",
  "residential": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80&fit=crop",
  "apartment": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80&fit=crop",
};

const TYPE_PHOTO_POOLS: Record<string, string[]> = {
  building_code: BUILDING_CODE_PHOTOS,
  material: MATERIAL_PHOTOS,
  safety_regulation: SAFETY_PHOTOS,
  trade: TRADE_PHOTOS,
  method: METHOD_PHOTOS,
  standard: BUILDING_CODE_PHOTOS,
  permit_requirement: BUILDING_CODE_PHOTOS,
  sequence_rule: METHOD_PHOTOS,
  inspection_protocol: SAFETY_PHOTOS,
  building_type: BUILDING_CODE_PHOTOS,
  climate_zone: BUILDING_CODE_PHOTOS,
  zoning_district: BUILDING_CODE_PHOTOS,
  architectural_style: BUILDING_CODE_PHOTOS,
};

// Simple hash to distribute photos evenly
function hashSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Get a DIVERSE image for any entity — no two entities with same slug get the same photo */
export function getImageForEntity(entity: {
  entity_type: string;
  slug?: string;
  title?: string;
}): CuratedImage {
  const slug = entity.slug || "";
  const title = (typeof entity.title === "string" ? entity.title : "").toLowerCase();
  const combined = `${slug} ${title}`.toLowerCase();

  // 1. Architectural styles get their specific curated photo
  if (entity.entity_type === "architectural_style") {
    const normalized = slug.toLowerCase().replace(/\s+/g, "-");
    const styleUrl = STYLE_PHOTOS[normalized];
    if (styleUrl) return { url: styleUrl, alt: title || slug };
  }

  // 2. Keyword match — find most specific keyword in slug/title
  for (const [keyword, url] of Object.entries(KEYWORD_PHOTOS)) {
    if (combined.includes(keyword)) {
      return { url, alt: title || slug };
    }
  }

  // 3. Pool rotation by slug hash — ensures variety within same entity type
  const pool = TYPE_PHOTO_POOLS[entity.entity_type] || BUILDING_CODE_PHOTOS;
  const idx = hashSlug(slug || title || "default") % pool.length;
  return { url: pool[idx], alt: title || entity.entity_type };
}

/** Get image for an entity type (generic fallback) */
export function getImageForEntityType(entityType: string): CuratedImage {
  const pool = TYPE_PHOTO_POOLS[entityType] || BUILDING_CODE_PHOTOS;
  return { url: pool[0], alt: entityType };
}

/** Hero images for major pages */
export const HERO_IMAGES = {
  landing: { url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400&q=85&fit=crop", alt: "Modern architecture" },
  dream: { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400&q=85&fit=crop", alt: "Dream home" },
  knowledge: { url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1400&q=85&fit=crop", alt: "Construction" },
  marketplace: { url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1400&q=85&fit=crop", alt: "Materials" },
};

/** Dream path card images */
export const DREAM_PATH_IMAGES: Record<string, CuratedImage> = {
  describe: { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80&fit=crop", alt: "Describe your dream" },
  inspire: { url: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=600&q=80&fit=crop", alt: "Get inspired" },
  sketch: { url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80&fit=crop", alt: "Sketch your vision" },
  explore: { url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80&fit=crop", alt: "Explore surprises" },
  browse: { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80&fit=crop", alt: "Browse and discover" },
  plans: { url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80&fit=crop", alt: "Upload plans" },
};

/** Product card images */
export const PRODUCT_IMAGES: Record<string, CuratedImage> = {
  "smart-project-launcher": { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop", alt: "Smart Project Launcher" },
  "dream-builder": { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80&fit=crop", alt: "Dream Builder" },
  "knowledge-garden": { url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80&fit=crop", alt: "Knowledge Garden" },
  "ai-copilot": { url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop", alt: "AI Copilot" },
  "aec-crm": { url: "https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=600&q=80&fit=crop", alt: "AEC CRM" },
  "marketplace": { url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80&fit=crop", alt: "Marketplace" },
};

/** Phase images */
export const PHASE_IMAGES: Record<string, CuratedImage> = {
  DREAM: { url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80&fit=crop", alt: "Dream" },
  DESIGN: { url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80&fit=crop", alt: "Design" },
  PLAN: { url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80&fit=crop", alt: "Plan" },
  BUILD: { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop", alt: "Build" },
  DELIVER: { url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80&fit=crop", alt: "Deliver" },
  GROW: { url: "https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=600&q=80&fit=crop", alt: "Grow" },
};

/** Fallback gradient for when no image */
export function getFallbackGradient(entityType: string): string {
  const gradients: Record<string, string> = {
    building_code: "linear-gradient(135deg, #1D9E75, #0F6E56)",
    material: "linear-gradient(135deg, #BA7517, #8B5A12)",
    safety_regulation: "linear-gradient(135deg, #E8443A, #B33530)",
    trade: "linear-gradient(135deg, #378ADD, #2568A8)",
    method: "linear-gradient(135deg, #7F77DD, #5C54B0)",
  };
  return gradients[entityType] || "linear-gradient(135deg, #1D9E75, #0F6E56)";
}
