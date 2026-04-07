/* Design Studio – Shared constants, types, utilities */

export const ACCENT = '#00D4FF';
export const ACCENT_DIM = 'rgba(0,212,255,0.15)';
export const ACCENT_GLOW = 'rgba(0,212,255,0.3)';
export const BG_DARK = '#0A0E17';
export const BG_PANEL = 'rgba(12,18,32,0.85)';
export const GRID_LINE = 'rgba(0,212,255,0.04)';
export const BORDER = 'rgba(0,212,255,0.12)';
export const TEXT_PRIMARY = 'rgba(255,255,255,0.92)';
export const TEXT_DIM = 'rgba(255,255,255,0.5)';

export type Phase = 'brief' | 'generating' | 'results' | 'board' | 'specs';

export interface StyleControlValues {
  architecturalStyle: number; colorWarmth: number;
  materialPreference: number; budgetLevel: number; eraInfluence: number;
}

export interface GeneratedImage {
  id: string; prompt: string; imageUrl: string;
  timestamp: string; refinements: string[]; saved: boolean;
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

/* Blueprint SVG with holographic grid */
export function generateBlueprintSVG(seed: number, label: string): string {
  const s: string[] = [];
  const r = (i: number) => ((seed * 9301 + i * 49297) % 233280) / 233280;
  s.push(`<defs><filter id="g${seed}"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`);
  s.push(`<rect width="400" height="300" fill="#0A1628"/>`);
  for (let x = 0; x <= 400; x += 20) s.push(`<line x1="${x}" y1="0" x2="${x}" y2="300" stroke="rgba(0,212,255,${x%80===0?'.1':'.04'})" stroke-width="${x%80===0?'.8':'.3'}"/>`);
  for (let y = 0; y <= 300; y += 20) s.push(`<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="rgba(0,212,255,${y%80===0?'.1':'.04'})" stroke-width="${y%80===0?'.8':'.3'}"/>`);
  for (let i = 0; i < 3 + Math.floor(r(1)*4); i++) {
    s.push(`<rect x="${40+r(i*10+2)*280}" y="${40+r(i*10+3)*180}" width="${30+r(i*10+4)*100}" height="${20+r(i*10+5)*80}" fill="rgba(0,212,255,0.02)" stroke="rgba(0,212,255,0.35)" stroke-width="1.5" rx="1" filter="url(#g${seed})"/>`);
  }
  for (let i = 0; i < 3; i++) {
    const cx = 60+r(30+i)*280, cy = 40+r(31+i)*200;
    s.push(`<circle cx="${cx}" cy="${cy}" r="${8+r(32+i)*18}" fill="none" stroke="rgba(0,212,255,0.15)" stroke-width=".8" stroke-dasharray="2,3"/>`);
    s.push(`<circle cx="${cx}" cy="${cy}" r="2.5" fill="${ACCENT}" opacity=".6" filter="url(#g${seed})"/>`);
  }
  s.push(`<text x="200" y="288" text-anchor="middle" font-size="10" fill="rgba(0,212,255,0.5)" font-family="monospace" letter-spacing="1">${label.toUpperCase()}</text>`);
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${s.join('')}</svg>`)}`;
}

/* Mock element extraction */
export function mockExtractElements(genId: string, seed: number): DesignToken[] {
  const cats = ['Cabinet','Countertop','Flooring','Lighting','Hardware','Wall Finish','Fixture','Window'];
  const mats = ['White Oak','Quartz','Polished Concrete','Brushed Nickel','Matte Black Steel','Venetian Plaster','Terrazzo','Low-E Glass'];
  const cols = ['#C4A882','#E8E0D8','#9CA3AF','#B0B8C4','#2D2D2D','#EDE8E0','#D4A574','#7DD3FC'];
  const n = 3 + Math.floor(((seed*9301+49297)%233280)/233280*4);
  return Array.from({length:n},(_,i)=>{const idx=(seed+i)%cats.length;return{id:`tok-${genId}-${i}`,label:mats[idx],category:cats[idx],color:cols[idx],sourceGenerationId:genId,description:`${mats[idx]} ${cats[idx].toLowerCase()}`};});
}
