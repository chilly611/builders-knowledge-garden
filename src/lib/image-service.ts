/**
 * Image Service — Curated architecture photography for every surface
 * 
 * Uses Unsplash for high-quality free images. Each entity type, architectural style,
 * building type, and material has curated image URLs. Falls back to gradient placeholders.
 * 
 * Usage:
 *   getImageForStyle('modern-farmhouse') → { url, alt, credit }
 *   getImageForEntityType('building_code') → { url, alt }
 *   getImageForBuildingType('data-center') → { url, alt }
 *   getImageForPhase('BUILD') → { url, alt }
 */

export interface CuratedImage {
  url: string;
  alt: string;
  credit?: string;
  blurDataUrl?: string;
}

// High-quality Unsplash photos — curated for architecture/construction
// Using Unsplash source URLs (no API key needed for direct image links)
// Format: https://images.unsplash.com/photo-{ID}?w={width}&q=80&fit=crop

const STYLE_IMAGES: Record<string, CuratedImage> = {
  'modern-farmhouse': {
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80&fit=crop',
    alt: 'Modern farmhouse with wraparound porch and metal roof'
  },
  'mid-century-modern': {
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80&fit=crop',
    alt: 'Mid-century modern home with clean lines and large windows'
  },
  'craftsman': {
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80&fit=crop',
    alt: 'Craftsman bungalow with covered front porch'
  },
  'contemporary': {
    url: 'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&q=80&fit=crop',
    alt: 'Contemporary architecture with geometric forms'
  },
  'mediterranean': {
    url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80&fit=crop',
    alt: 'Mediterranean villa with terracotta roof and arched windows'
  },
  'industrial': {
    url: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800&q=80&fit=crop',
    alt: 'Industrial loft interior with exposed brick and steel'
  },
  'minimalist': {
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80&fit=crop',
    alt: 'Minimalist white home with clean surfaces'
  },
  'colonial': {
    url: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80&fit=crop',
    alt: 'Colonial home with symmetrical facade and shutters'
  },
  'japandi': {
    url: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&q=80&fit=crop',
    alt: 'Japanese-Scandinavian interior with natural materials'
  },
  'art-deco': {
    url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80&fit=crop',
    alt: 'Art Deco building with geometric ornamental details'
  },
  'passive-house': {
    url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80&fit=crop',
    alt: 'Energy-efficient passive house with solar panels'
  },
  'brutalist': {
    url: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=800&q=80&fit=crop',
    alt: 'Brutalist concrete architecture'
  },
  'spanish-colonial': {
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80&fit=crop',
    alt: 'Spanish Colonial home with stucco and clay roof'
  },
  'prairie': {
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80&fit=crop',
    alt: 'Prairie-style home with horizontal lines'
  },
};

// Entity type → representative imagery
const ENTITY_TYPE_IMAGES: Record<string, CuratedImage> = {
  building_code: {
    url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80&fit=crop',
    alt: 'Building codes and regulations documents'
  },
  material: {
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80&fit=crop',
    alt: 'Construction materials stacked on site'
  },
  safety_regulation: {
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80&fit=crop',
    alt: 'Construction worker with safety equipment'
  },
  trade: {
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&fit=crop',
    alt: 'Skilled tradesperson at work'
  },
  method: {
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80&fit=crop',
    alt: 'Construction method being executed'
  },
  standard: {
    url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80&fit=crop',
    alt: 'Engineering standards and testing'
  },
  permit_requirement: {
    url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80&fit=crop',
    alt: 'Permit documents and approval stamps'
  },
  sequence_rule: {
    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80&fit=crop',
    alt: 'Construction sequencing and scheduling'
  },
  architectural_style: {
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80&fit=crop',
    alt: 'Architectural design showcase'
  },
  inspection_protocol: {
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80&fit=crop',
    alt: 'Building inspection in progress'
  },
  building_type: {
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80&fit=crop',
    alt: 'Modern building exterior'
  },
  climate_zone: {
    url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&q=80&fit=crop',
    alt: 'Weather and climate conditions'
  },
  zoning_district: {
    url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80&fit=crop',
    alt: 'Urban zoning and land use planning'
  },
};

// Building types → showcase photos
const BUILDING_TYPE_IMAGES: Record<string, CuratedImage> = {
  'single-family': {
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80&fit=crop',
    alt: 'Beautiful single-family home'
  },
  'multi-family': {
    url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80&fit=crop',
    alt: 'Modern apartment complex'
  },
  'commercial-office': {
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80&fit=crop',
    alt: 'Commercial office tower'
  },
  'data-center': {
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80&fit=crop',
    alt: 'Modern data center facility'
  },
  'warehouse': {
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80&fit=crop',
    alt: 'Industrial warehouse facility'
  },
  'hospital': {
    url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80&fit=crop',
    alt: 'Modern hospital building'
  },
  'restaurant': {
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80&fit=crop',
    alt: 'Restaurant interior design'
  },
};

// Lifecycle phases → action photography
const PHASE_IMAGES: Record<string, CuratedImage> = {
  DREAM: {
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80&fit=crop',
    alt: 'Dreaming of a new home — architectural vision'
  },
  DESIGN: {
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80&fit=crop',
    alt: 'Architect working on building design plans'
  },
  PLAN: {
    url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&fit=crop',
    alt: 'Project planning and scheduling'
  },
  BUILD: {
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80&fit=crop',
    alt: 'Active construction site with workers'
  },
  DELIVER: {
    url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80&fit=crop',
    alt: 'Handing over keys to completed building'
  },
  GROW: {
    url: 'https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=800&q=80&fit=crop',
    alt: 'Growing construction business and portfolio'
  },
};

// Hero images for major pages
export const HERO_IMAGES = {
  landing: {
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400&q=85&fit=crop',
    alt: 'Stunning modern architecture — the future of building',
    credit: 'Unsplash'
  },
  dream: {
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400&q=85&fit=crop',
    alt: 'Dream home with warm golden hour lighting',
  },
  knowledge: {
    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1400&q=85&fit=crop',
    alt: 'Construction knowledge — the foundation of building',
  },
  launch: {
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&q=85&fit=crop',
    alt: 'Active construction site — turning plans into reality',
  },
  marketplace: {
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1400&q=85&fit=crop',
    alt: 'Construction materials marketplace',
  },
};

// Dream path cards — each path gets a stunning photo
export const DREAM_PATH_IMAGES: Record<string, CuratedImage> = {
  describe: {
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80&fit=crop',
    alt: 'Describe your dream — a beautiful home waiting to be imagined'
  },
  inspire: {
    url: 'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=600&q=80&fit=crop',
    alt: 'Get inspired — stunning architecture to reference'
  },
  sketch: {
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80&fit=crop',
    alt: 'Sketch your vision — from hand-drawn to digital'
  },
  explore: {
    url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80&fit=crop',
    alt: 'Explore surprises — AI-curated dream concepts'
  },
  browse: {
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80&fit=crop',
    alt: 'Browse and discover — infinite architectural inspiration'
  },
  plans: {
    url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80&fit=crop',
    alt: 'Upload your plans — we add intelligence'
  },
};

// Product cards — each of the 7 magnetic products
export const PRODUCT_IMAGES: Record<string, CuratedImage> = {
  'smart-project-launcher': {
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80&fit=crop',
    alt: 'Smart Project Launcher — your AI COO'
  },
  'dream-builder': {
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80&fit=crop',
    alt: 'Dream Builder — imagine anything'
  },
  'knowledge-garden': {
    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80&fit=crop',
    alt: 'Knowledge Garden — 500+ entities of construction wisdom'
  },
  'ai-copilot': {
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop',
    alt: 'AI Construction Copilot — any question, cited answer'
  },
  'aec-crm': {
    url: 'https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=600&q=80&fit=crop',
    alt: 'AEC CRM — pipeline from conversation to warranty'
  },
  'marketplace': {
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80&fit=crop',
    alt: 'Supply Chain Marketplace — every material connects'
  },
};

// Fallback gradient for when no image is available
const FALLBACK_GRADIENTS: Record<string, string> = {
  building_code: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
  material: 'linear-gradient(135deg, #BA7517 0%, #8B5A12 100%)',
  safety_regulation: 'linear-gradient(135deg, #E8443A 0%, #B33530 100%)',
  trade: 'linear-gradient(135deg, #378ADD 0%, #2568A8 100%)',
  method: 'linear-gradient(135deg, #7F77DD 0%, #5C54B0 100%)',
  standard: 'linear-gradient(135deg, #639922 0%, #4A7318 100%)',
  architectural_style: 'linear-gradient(135deg, #D85A30 0%, #A84525 100%)',
  default: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
};

/** Get curated image for an architectural style slug */
export function getImageForStyle(slug: string): CuratedImage | null {
  // Normalize slug (remove spaces, lowercase)
  const normalized = slug.toLowerCase().replace(/\s+/g, '-');
  return STYLE_IMAGES[normalized] || null;
}

/** Get representative image for an entity type */
export function getImageForEntityType(entityType: string): CuratedImage {
  return ENTITY_TYPE_IMAGES[entityType] || ENTITY_TYPE_IMAGES.building_type;
}

/** Get image for a building type */
export function getImageForBuildingType(type: string): CuratedImage | null {
  const normalized = type.toLowerCase().replace(/\s+/g, '-');
  return BUILDING_TYPE_IMAGES[normalized] || null;
}

/** Get image for a lifecycle phase */
export function getImageForPhase(phase: string): CuratedImage {
  return PHASE_IMAGES[phase.toUpperCase()] || PHASE_IMAGES.BUILD;
}

/** Get fallback gradient for an entity type */
export function getFallbackGradient(entityType: string): string {
  return FALLBACK_GRADIENTS[entityType] || FALLBACK_GRADIENTS.default;
}

/** Get the best image for any knowledge entity */
export function getImageForEntity(entity: {
  entity_type: string;
  slug?: string;
  domain?: string;
}): CuratedImage {
  // Architectural styles get their specific photo
  if (entity.entity_type === 'architectural_style' && entity.slug) {
    const styleImg = getImageForStyle(entity.slug);
    if (styleImg) return styleImg;
  }
  
  // Building types get their specific photo
  if (entity.entity_type === 'building_type' && entity.slug) {
    const btImg = getImageForBuildingType(entity.slug);
    if (btImg) return btImg;
  }
  
  // Everything else gets the entity type representative image
  return getImageForEntityType(entity.entity_type);
}

/** Get Unsplash image URL with custom dimensions */
export function unsplashUrl(photoId: string, width = 800, height?: number): string {
  const h = height ? `&h=${height}` : '';
  return `https://images.unsplash.com/photo-${photoId}?w=${width}${h}&q=80&fit=crop`;
}
