/**
 * floorplan — the Dream Machine's schematic-blueprint engine.
 * ===========================================================
 *
 * Turns a guided "dream profile" into (1) a sensible room program and (2) a
 * dimensioned, herbarium-register floor-plan SVG. This is the net-new piece of
 * the v2 flagship: the bridge from "imagine it" (renders) toward "build it"
 * (plans you port to the Killer App).
 *
 * HONEST SCOPE: this is a SCHEMATIC — a believable single-level partition with
 * room areas proportional to the program, dimensions, a title block, scale bar
 * and a north arrow. It is explicitly NOT engineered CAD/DWG/BIM (that is a
 * Phase-2 effort with a real geometry kernel). The SVG carries a
 * "SCHEMATIC — not for construction" stamp so it never overclaims.
 *
 * Pure + SSR-safe (no React, no `window`, no Date.now/Math.random — the layout
 * is a deterministic recursive slice, so the same profile always yields the
 * same plan). Tokens are inlined as hex here because an SVG string is rendered
 * standalone (and downloaded) outside the CSS cascade; the values mirror the
 * herbarium tokens (paper-cream ground, ink-graphite walls, teal/brass
 * annotations) — no #E8443A, no pure white.
 */

// Herbarium values mirrored for the standalone SVG (see note above).
const PAPER = '#F2E9D2'; // --paper-cream ground
const PAPER_RULE = 'rgba(60,122,138,0.10)'; // faint blueprint grid (teal at low alpha)
const WALL = '#2A2620'; // --ink-graphite outer wall
const ROOM_LINE = '#5A3B1F'; // --ink-sepia partitions
const ROOM_FILL = 'rgba(176,141,92,0.06)'; // brass at very low alpha
const LABEL = '#5A3B1F'; // --ink-sepia
const DIM = '#3C7A8A'; // --specimen-teal dimensions
const BRASS = '#7C6235'; // --specimen-brass-aged title block

export interface DreamProfile {
  /** Free-text building type, e.g. "modern farmhouse", "ADU", "kitchen remodel". */
  buildingType: string;
  location?: string | null;
  /** Short vibe phrase, e.g. "warm and minimal". */
  vibe?: string | null;
  /** Target gross area (sqft). */
  scaleSqft: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  /** Free-text wishes, e.g. ["open kitchen", "home office", "2-car garage"]. */
  mustHaves?: string[];
  /** Chosen architectural-direction slug (from the style picker). */
  style?: string | null;
}

export interface PlanRoom {
  name: string;
  sqft: number;
  /** Loose grouping for fill tint / ordering. */
  kind: 'living' | 'sleep' | 'service' | 'work' | 'outdoor';
}

export interface PlacedRoom extends PlanRoom {
  x: number;
  y: number;
  w: number;
  h: number;
}

const has = (hay: string[], ...needles: string[]) =>
  hay.some((h) => needles.some((n) => h.toLowerCase().includes(n)));

/**
 * Derive a believable room program from the profile, scaled so the areas sum to
 * ~scaleSqft. Handles the common residential archetypes well; everything else
 * falls back to a sensible single-volume program.
 */
export function deriveRoomProgram(p: DreamProfile): PlanRoom[] {
  const t = (p.buildingType || '').toLowerCase();
  const wishes = (p.mustHaves ?? []).map((m) => m || '');
  const rooms: PlanRoom[] = [];
  const add = (name: string, weight: number, kind: PlanRoom['kind']) =>
    rooms.push({ name, sqft: weight, kind });

  const isKitchenOnly = /kitchen|bath(room)?\s*remodel|remodel/.test(t) && !/home|house|adu|addition/.test(t);
  const isADU = /\badu\b|granny|casita|accessory/.test(t);
  const isCommercial = /office|retail|shop|restaurant|tenant|warehouse|commercial/.test(t);
  const isMulti = /fourplex|duplex|triplex|multifamily|units?\b|apartment/.test(t);

  if (isKitchenOnly) {
    add('Kitchen', 5, 'living');
    add('Pantry', 1, 'service');
    add('Dining', 3, 'living');
    if (has(wishes, 'island', 'bar')) add('Island', 1, 'living');
  } else if (isCommercial) {
    add('Open floor', 6, 'work');
    add('Meeting', 2, 'work');
    add('Reception', 2, 'living');
    add('Restroom', 1, 'service');
    add('Back of house', 2, 'service');
  } else if (isMulti) {
    add('Unit A', 4, 'living');
    add('Unit B', 4, 'living');
    add('Lobby', 1, 'living');
    add('Stair / core', 1, 'service');
    add('Utility', 1, 'service');
  } else {
    // Residential house / ADU / addition.
    const beds = Math.max(1, p.bedrooms ?? (isADU ? 1 : p.scaleSqft > 2600 ? 4 : p.scaleSqft > 1500 ? 3 : 2));
    const baths = Math.max(1, p.bathrooms ?? (isADU ? 1 : Math.max(2, Math.round(beds * 0.75))));
    add('Living', isADU ? 4 : 5, 'living');
    add('Kitchen', 4, 'living');
    if (!isADU) add('Dining', 3, 'living');
    add('Primary suite', isADU ? 3 : 5, 'sleep');
    for (let i = 1; i < beds; i++) add(`Bedroom ${i + 1}`, 3, 'sleep');
    for (let i = 0; i < baths; i++) add(i === 0 ? 'Bath' : `Bath ${i + 1}`, 1.4, 'service');
    add('Entry', 1, 'living');
    if (!isADU) add('Laundry', 1, 'service');
    if (has(wishes, 'office', 'study', 'work')) add('Home office', 2.4, 'work');
    if (has(wishes, 'garage', 'car')) add(has(wishes, '3', 'three') ? '3-car garage' : '2-car garage', has(wishes, '3', 'three') ? 4 : 3.2, 'service');
    if (has(wishes, 'deck', 'patio', 'porch', 'outdoor')) add('Covered deck', 2, 'outdoor');
    if (has(wishes, 'gym', 'studio', 'flex')) add('Flex room', 2.2, 'work');
  }

  // Scale weights so the program sums to the target gross area.
  const totalW = rooms.reduce((s, r) => s + r.sqft, 0) || 1;
  const target = Math.max(200, Math.round(p.scaleSqft || 1200));
  return rooms.map((r) => ({ ...r, sqft: Math.round((r.sqft / totalW) * target) }));
}

/**
 * Deterministic recursive-slice layout: partitions the rect into one cell per
 * room, each cell's AREA proportional to the room's sqft. Splits along the
 * longer side and balances cumulative weight, so the result reads like a plan
 * (no fixed grid, no overlaps, fills the envelope).
 */
export function packRooms(rooms: PlanRoom[], x: number, y: number, w: number, h: number): PlacedRoom[] {
  if (rooms.length === 0) return [];
  if (rooms.length === 1) return [{ ...rooms[0], x, y, w, h }];

  const total = rooms.reduce((s, r) => s + r.sqft, 0) || 1;
  const half = total / 2;
  let acc = 0;
  let i = 0;
  while (i < rooms.length - 1 && acc + rooms[i].sqft <= half) {
    acc += rooms[i].sqft;
    i += 1;
  }
  if (i === 0) i = 1; // guarantee both groups non-empty
  const a = rooms.slice(0, i);
  const b = rooms.slice(i);
  const fracA = a.reduce((s, r) => s + r.sqft, 0) / total;

  if (w >= h) {
    const wA = w * fracA;
    return [...packRooms(a, x, y, wA, h), ...packRooms(b, x + wA, y, w - wA, h)];
  }
  const hA = h * fracA;
  return [...packRooms(a, x, y, w, hA), ...packRooms(b, x, y + hA, w, h - hA)];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Render the schematic floor plan as an SVG string (inline render + download).
 * Deterministic for a given profile.
 */
export function floorPlanSVG(p: DreamProfile, opts?: { width?: number }): string {
  const program = deriveRoomProgram(p);
  const sqft = program.reduce((s, r) => s + r.sqft, 0) || Math.round(p.scaleSqft) || 1200;

  // Plan envelope in feet (~1.3 aspect), then a px scale to fit the canvas.
  const wFt = Math.sqrt(sqft * 1.35);
  const hFt = sqft / wFt;
  const pad = 56; // margin for title block + dims
  const W = Math.round(opts?.width ?? 760);
  const planW = W - pad * 2;
  const pxPerFt = planW / wFt;
  const planH = Math.round(hFt * pxPerFt);
  const H = planH + pad * 2 + 56; // extra for the title block strip

  // Order rooms largest-first so the slice reads cleanly.
  const ordered = [...program].sort((a, b) => b.sqft - a.sqft);
  const placed = packRooms(ordered, pad, pad, planW, planH);

  const grid: string[] = [];
  for (let gx = pad; gx <= pad + planW; gx += Math.max(16, pxPerFt * 2))
    grid.push(`<line x1="${gx.toFixed(1)}" y1="${pad}" x2="${gx.toFixed(1)}" y2="${pad + planH}" stroke="${PAPER_RULE}" stroke-width="0.5"/>`);
  for (let gy = pad; gy <= pad + planH; gy += Math.max(16, pxPerFt * 2))
    grid.push(`<line x1="${pad}" y1="${gy.toFixed(1)}" x2="${pad + planW}" y2="${gy.toFixed(1)}" stroke="${PAPER_RULE}" stroke-width="0.5"/>`);

  const cells = placed
    .map((r) => {
      const wF = Math.max(1, Math.round(r.w / pxPerFt));
      const hF = Math.max(1, Math.round(r.h / pxPerFt));
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const small = r.w < 64 || r.h < 40;
      return `
    <g>
      <rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}" fill="${ROOM_FILL}" stroke="${ROOM_LINE}" stroke-width="1.25"/>
      <text x="${cx.toFixed(1)}" y="${(cy - (small ? 1 : 5)).toFixed(1)}" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-size="${small ? 9 : 12}" font-weight="700" fill="${LABEL}">${esc(r.name)}</text>
      ${small ? '' : `<text x="${cx.toFixed(1)}" y="${(cy + 11).toFixed(1)}" text-anchor="middle" font-family="'Space Mono', monospace" font-size="9" fill="${DIM}">${wF}'×${hF}' · ${r.sqft} sf</text>`}
    </g>`;
    })
    .join('');

  // Scale bar (10 ft) + north arrow + title block.
  const barFt = 10;
  const barPx = barFt * pxPerFt;
  const by = pad + planH + 22;
  const titleY = pad + planH + 40;
  const styleLabel = p.style ? p.style.replace(/-/g, ' ') : 'schematic';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Schematic floor plan">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  ${grid.join('')}
  <rect x="${pad}" y="${pad}" width="${planW}" height="${planH}" fill="none" stroke="${WALL}" stroke-width="3"/>
  ${cells}
  <g>
    <line x1="${pad}" y1="${by}" x2="${pad + barPx}" y2="${by}" stroke="${BRASS}" stroke-width="1.5"/>
    <line x1="${pad}" y1="${by - 4}" x2="${pad}" y2="${by + 4}" stroke="${BRASS}" stroke-width="1.5"/>
    <line x1="${pad + barPx}" y1="${by - 4}" x2="${pad + barPx}" y2="${by + 4}" stroke="${BRASS}" stroke-width="1.5"/>
    <text x="${pad}" y="${by + 16}" font-family="'Space Mono', monospace" font-size="9" fill="${BRASS}">0</text>
    <text x="${(pad + barPx).toFixed(1)}" y="${by + 16}" text-anchor="middle" font-family="'Space Mono', monospace" font-size="9" fill="${BRASS}">${barFt} FT</text>
  </g>
  <g transform="translate(${W - pad - 8}, ${by + 2})">
    <line x1="0" y1="8" x2="0" y2="-12" stroke="${WALL}" stroke-width="1.25"/>
    <path d="M0 -12 L3 -6 L-3 -6 Z" fill="${WALL}"/>
    <text x="0" y="20" text-anchor="middle" font-family="'Space Mono', monospace" font-size="9" fill="${WALL}">N</text>
  </g>
  <text x="${pad}" y="${titleY}" font-family="'Space Mono', monospace" font-size="11" letter-spacing="1.5" fill="${BRASS}">${esc((p.buildingType || 'BUILDING').toUpperCase())} · ${sqft.toLocaleString('en-US')} SF · ${esc(styleLabel.toUpperCase())}</text>
  <text x="${pad}" y="${titleY + 15}" font-family="'Space Mono', monospace" font-size="8.5" letter-spacing="1" fill="${ROOM_LINE}" opacity="0.7">SCHEMATIC — NOT FOR CONSTRUCTION${p.location ? ' · ' + esc(p.location) : ''}</text>
</svg>`;
}

/** Convenience: the SVG as a data URI (for an &lt;img src&gt; or a download href). */
export function floorPlanDataUri(p: DreamProfile, opts?: { width?: number }): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(floorPlanSVG(p, opts))}`;
}
