/* Design Studio – Shared constants, types, utilities
 *
 * 2026-06-14: Re-themed from the old cyan-on-dark "holographic" palette to the
 * herbarium LIGHT palette (constitution lock: light backgrounds only, no dark,
 * no pure white, no red #E8443A). Token NAMES are kept so the sub-components
 * (DesignBrief, StyleControls, GenerationGrid, DesignBoard, RefinementTools)
 * keep importing the same symbols — only the VALUES changed. Scrims drawn over
 * generated photos (OVERLAY) intentionally stay dark for text legibility; that
 * is not a page background, so it does not violate the light-only lock.
 */

// Herbarium light palette
export const ACCENT = '#D85A30';                 // warm (primary)
export const ACCENT_DIM = 'rgba(216,90,48,0.12)';
export const ACCENT_GLOW = 'rgba(216,90,48,0.28)';
export const GOLD = '#C4A44A';
export const GREEN = '#1D9E75';
export const BG_DARK = '#FBF6EC';                // page background (paper cream) — name kept for back-compat
export const BG_PANEL = '#FFFDF8';               // panel surface (warm off-white, NOT pure white)
export const GRID_LINE = 'rgba(216,90,48,0.05)'; // faint blueprint grid
export const BORDER = 'rgba(44,24,16,0.12)';     // ink at low alpha
export const TEXT_PRIMARY = '#2C1810';           // ink
export const TEXT_DIM = '#8B7355';               // muted clay
export const ON_ACCENT = '#FFFBF5';              // text/icon on the warm accent (reads as white, not pure #fff)
export const OVERLAY = 'rgba(28,16,10,0.78)';    // scrim over photos (legibility) — drawn on images, not backgrounds
export const INPUT_BG = '#FBF7F0';               // input field fill on light surfaces

export type Phase = 'brief' | 'generating' | 'results' | 'board' | 'specs';

export interface StyleControlValues {
  architecturalStyle: number; colorWarmth: number;
  materialPreference: number; budgetLevel: number; eraInfluence: number;
}

export interface GeneratedImage {
  id: string; prompt: string; imageUrl: string;
  timestamp: string; refinements: string[]; saved: boolean;
  /** 'render' = real photoreal output from the render API; 'concept' = local fallback sketch. */
  kind?: 'render' | 'concept';
  /** true while a real render is being fetched to upgrade a concept placeholder. */
  pending?: boolean;
}

export interface BoardItem {
  id: string; generationId: string; imageUrl: string; room: string; label: string;
}

export interface DesignToken {
  id: string; label: string; category: string;
  color: string; sourceGenerationId: string; description: string;
}

export const ROOMS = ['Kitchen','Living Room','Bedroom','Bathroom','Exterior','Landscape','Office','Other'];

export const STYLE_SLIDERS: { key: keyof StyleControlValues; label: string; low: string; high: string }[] = [
  { key: 'architecturalStyle', label: 'Architectural Style', low: 'Traditional', high: 'Avant-Garde' },
  { key: 'colorWarmth', label: 'Color Warmth', low: 'Cool', high: 'Warm' },
  { key: 'materialPreference', label: 'Material Feel', low: 'Natural', high: 'Synthetic' },
  { key: 'budgetLevel', label: 'Budget Level', low: 'Economy', high: 'Luxury' },
  { key: 'eraInfluence', label: 'Era Influence', low: 'Classic', high: 'Futuristic' },
];

export const EXAMPLE_PROMPTS = [
  'A modern kitchen with white oak cabinets, quartz countertops, and a large island with seating for 4',
  'Open-concept living room with floor-to-ceiling windows, concrete floors, and a floating staircase',
  'Mediterranean courtyard with terracotta tiles, a central fountain, and arched walkways',
  'Minimalist Japanese bathroom with soaking tub, natural stone, and bamboo accents',
  'Industrial loft bedroom with exposed brick, steel beams, and oversized factory windows',
];

export const DEFAULT_CONTROLS: StyleControlValues = {
  architecturalStyle: 50, colorWarmth: 50, materialPreference: 50, budgetLevel: 50, eraInfluence: 50,
};

/**
 * Turn the free-text brief + the five style sliders into a single descriptive
 * prompt for the render API. This is what makes the sliders actually affect the
 * generated images (previously they were decorative).
 */
export function buildStudioPrompt(brief: string, c: StyleControlValues): string {
  const parts: string[] = [];
  const base = brief.trim();
  if (base) parts.push(base);
  parts.push(c.architecturalStyle < 33 ? 'traditional architecture' : c.architecturalStyle > 66 ? 'bold avant-garde architecture' : 'contemporary architecture');
  parts.push(c.colorWarmth < 33 ? 'cool color palette' : c.colorWarmth > 66 ? 'warm color palette' : 'balanced color palette');
  parts.push(c.materialPreference < 33 ? 'natural materials such as wood and stone' : c.materialPreference > 66 ? 'modern materials such as steel and glass' : 'a mix of natural and modern materials');
  parts.push(c.budgetLevel < 33 ? 'budget-conscious finishes' : c.budgetLevel > 66 ? 'luxury high-end finishes' : 'mid-range finishes');
  parts.push(c.eraInfluence < 33 ? 'classic timeless design' : c.eraInfluence > 66 ? 'futuristic forward-looking design' : 'current-era design');
  return parts.join(', ');
}

/** Deterministic 32-bit-ish hash of a string → stable seed for concept fallbacks. */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % 100000;
}

/**
 * Light "blueprint sketch" SVG used as (a) the instant placeholder shown the
 * moment you hit Generate and (b) the durable fallback when a real render URL
 * is missing or has expired. Returns a data: URI so it persists forever in a
 * saved project (no network, never 404s).
 */
export function generateBlueprintSVG(seed: number, label: string): string {
  const s: string[] = [];
  const r = (i: number) => ((seed * 9301 + i * 49297) % 233280) / 233280;
  const line = (a: string) => `rgba(216,90,48,${a})`;
  s.push(`<rect width="400" height="300" fill="#F4EEE4"/>`);
  for (let x = 0; x <= 400; x += 20) s.push(`<line x1="${x}" y1="0" x2="${x}" y2="300" stroke="${line(x%80===0?'0.14':'0.06')}" stroke-width="${x%80===0?'0.8':'0.3'}"/>`);
  for (let y = 0; y <= 300; y += 20) s.push(`<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="${line(y%80===0?'0.14':'0.06')}" stroke-width="${y%80===0?'0.8':'0.3'}"/>`);
  for (let i = 0; i < 3 + Math.floor(r(1)*4); i++) {
    s.push(`<rect x="${40+r(i*10+2)*280}" y="${40+r(i*10+3)*180}" width="${30+r(i*10+4)*100}" height="${20+r(i*10+5)*80}" fill="rgba(196,164,74,0.06)" stroke="${line('0.5')}" stroke-width="1.5" rx="1"/>`);
  }
  for (let i = 0; i < 3; i++) {
    const cx = 60+r(30+i)*280, cy = 40+r(31+i)*200;
    s.push(`<circle cx="${cx}" cy="${cy}" r="${8+r(32+i)*18}" fill="none" stroke="rgba(196,164,74,0.4)" stroke-width="0.8" stroke-dasharray="2,3"/>`);
    s.push(`<circle cx="${cx}" cy="${cy}" r="2.5" fill="${ACCENT}" opacity="0.7"/>`);
  }
  s.push(`<text x="200" y="288" text-anchor="middle" font-size="10" fill="${line('0.7')}" font-family="monospace" letter-spacing="1">${label.toUpperCase()}</text>`);
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${s.join('')}</svg>`)}`;
}

/** Stable concept-sketch fallback for a given generation (used on <img> error). */
export function conceptFallbackFor(key: string, label = 'Concept'): string {
  return generateBlueprintSVG(seedFromString(key), label);
}

/** Mock element extraction */
export function mockExtractElements(genId: string, seed: number): DesignToken[] {
  const cats = ['Cabinet','Countertop','Flooring','Lighting','Hardware','Wall Finish','Fixture','Window'];
  const mats = ['White Oak','Quartz','Polished Concrete','Brushed Nickel','Matte Black Steel','Venetian Plaster','Terrazzo','Low-E Glass'];
  const cols = ['#C4A882','#E8E0D8','#9CA3AF','#B0B8C4','#2D2D2D','#EDE8E0','#D4A574','#7DD3FC'];
  const n = 3 + Math.floor(((seed*9301+49297)%233280)/233280*4);
  return Array.from({length:n},(_,i)=>{const idx=(seed+i)%cats.length;return{id:`tok-${genId}-${i}`,label:mats[idx],category:cats[idx],color:cols[idx],sourceGenerationId:genId,description:`${mats[idx]} ${cats[idx].toLowerCase()}`};});
}
