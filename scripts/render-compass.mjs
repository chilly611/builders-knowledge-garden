// Standalone visual render of ProjectCompass for offline review.
// Doesn't import the TSX component — mirrors the layout math in plain JS
// so we can eyeball the SVG without a transpiler. If the component's
// layout constants change, update this file too (it exists only to help
// humans verify the SVG shape pre-commit).

import { writeFileSync } from 'node:fs';

const VB_W = 1100;
const VB_H = 200;
const RIVER_Y = 40;
const RIVER_H = 34;
const TIMELINE_Y = 130;
const STAGE_PAD_X = 90;
const STAGE_SPACING = (VB_W - STAGE_PAD_X * 2) / 6;

const STATUS_COLORS = {
  done: '#22C55E',
  partial: '#14B8A6',
  attention: '#EF4444',
  seen: '#9CA3AF',
  unseen: '#E5E7EB',
  current: '#2563EB',
  riverFill: '#BAE6FD',
  riverStroke: '#38BDF8',
  poolIn: '#2563EB',
  poolOut: '#F59E0B',
};

const STAGES = [
  { id: 1, name: 'Size Up', emoji: '🧭' },
  { id: 2, name: 'Lock', emoji: '🔒' },
  { id: 3, name: 'Plan', emoji: '📐' },
  { id: 4, name: 'Build', emoji: '🔨' },
  { id: 5, name: 'Adapt', emoji: '🔄' },
  { id: 6, name: 'Collect', emoji: '💰' },
  { id: 7, name: 'Reflect', emoji: '📖' },
];

const PROGRESS = {
  1: { worked: 3, done: 3, needsAttention: 0, total: 3 },
  2: { worked: 2, done: 2, needsAttention: 0, total: 2 },
  3: { worked: 5, done: 2, needsAttention: 1, total: 8 },
  4: { worked: 2, done: 0, needsAttention: 0, total: 6 },
  5: { worked: 0, done: 0, needsAttention: 0, total: 1 },
  6: { worked: 0, done: 0, needsAttention: 0, total: 4 },
  7: { worked: 0, done: 0, needsAttention: 0, total: 3 },
};

const VISITED = new Set([1, 2, 3, 4, 5]);
const CURRENT = 4;

const POOLS = {
  1: { amountIn: 5000, amountOut: 800, status: 'received' },
  2: { amountIn: 0, amountOut: 2400, status: 'scheduled' },
  3: { amountIn: 0, amountOut: 18500, status: 'scheduled' },
  4: { amountIn: 0, amountOut: 52000, status: 'scheduled' },
  6: { amountIn: 95000, amountOut: 0, status: 'scheduled' },
};

function stageX(id) {
  return STAGE_PAD_X + (id - 1) * STAGE_SPACING;
}

function statusOf(id) {
  const p = PROGRESS[id] ?? { worked: 0, done: 0, needsAttention: 0, total: 0 };
  if (p.needsAttention > 0) return 'attention';
  if (p.total > 0 && p.done === p.total) return 'done';
  if (p.worked > 0) return 'partial';
  if (VISITED.has(id) || id === CURRENT) return 'seen';
  return 'unseen';
}

function poolRadius(pool) {
  const amount = Math.max(pool.amountIn, pool.amountOut);
  if (amount === 0) return 0;
  const r = 6 + Math.log10(Math.max(amount, 100)) * 3.2;
  return Math.min(r, 18);
}

function riverPathD(w, y, h) {
  const top = y;
  const bottom = y + h;
  const step = w / 6;
  const amp = 5;
  let top_d = `M 0 ${top}`;
  for (let i = 0; i < 6; i++) {
    const x1 = step * i + step / 3;
    const x2 = step * i + (step * 2) / 3;
    const x3 = step * (i + 1);
    const dy = i % 2 === 0 ? -amp : amp;
    top_d += ` C ${x1} ${top + dy} ${x2} ${top - dy} ${x3} ${top}`;
  }
  let bottom_d = ` L ${w} ${bottom}`;
  for (let i = 6; i > 0; i--) {
    const x1 = step * i - step / 3;
    const x2 = step * i - (step * 2) / 3;
    const x3 = step * (i - 1);
    const dy = i % 2 === 0 ? amp : -amp;
    bottom_d += ` C ${x1} ${bottom + dy} ${x2} ${bottom - dy} ${x3} ${bottom}`;
  }
  return `${top_d}${bottom_d} Z`;
}

let svg = `<svg viewBox="0 0 ${VB_W} ${VB_H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
<defs>
  <linearGradient id="riverGradient" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0%" stop-color="${STATUS_COLORS.riverFill}" stop-opacity="0.4"/>
    <stop offset="60%" stop-color="${STATUS_COLORS.riverFill}" stop-opacity="0.9"/>
    <stop offset="100%" stop-color="${STATUS_COLORS.riverStroke}" stop-opacity="1"/>
  </linearGradient>
  <linearGradient id="waterfallGradient" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0%" stop-color="${STATUS_COLORS.riverStroke}"/>
    <stop offset="100%" stop-color="#22C55E"/>
  </linearGradient>
</defs>
<path d="${riverPathD(VB_W, RIVER_Y, RIVER_H)}" fill="url(#riverGradient)" stroke="${STATUS_COLORS.riverStroke}" stroke-opacity="0.4"/>
`;

for (const s of STAGES) {
  const p = POOLS[s.id];
  if (!p) continue;
  const r = poolRadius(p);
  if (r === 0) continue;
  const cx = stageX(s.id);
  const cy = RIVER_Y + RIVER_H / 2;
  const received = p.status === 'received';
  svg += `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${received ? STATUS_COLORS.poolIn : '#FFF'}" stroke="${STATUS_COLORS.poolIn}" stroke-width="${received ? 1 : 2}"/>`;
  if (p.amountOut > 0) {
    svg += `<circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="none" stroke="${STATUS_COLORS.poolOut}" stroke-width="1.5" stroke-dasharray="3 2"/>`;
  }
  svg += `</g>`;
}

// Waterfall
svg += `<rect x="${VB_W - STAGE_PAD_X + STAGE_SPACING / 4}" y="${RIVER_Y + RIVER_H / 2 - 4}" width="18" height="60" fill="url(#waterfallGradient)" opacity="0.85"/>
<ellipse cx="${VB_W - STAGE_PAD_X + STAGE_SPACING / 4 + 9}" cy="${RIVER_Y + RIVER_H / 2 + 62}" rx="16" ry="4" fill="#22C55E" opacity="0.6"/>`;

// Timeline connector
svg += `<line x1="${STAGE_PAD_X - 30}" y1="${TIMELINE_Y}" x2="${VB_W - STAGE_PAD_X + 30}" y2="${TIMELINE_Y}" stroke="#D1D5DB" stroke-width="2" stroke-dasharray="1 4"/>`;

// Dream cloud
svg += `<g transform="translate(${STAGE_PAD_X - 60}, ${TIMELINE_Y - 22})">
  <ellipse cx="8" cy="14" rx="14" ry="8" fill="#F3F4F6" stroke="#D1D5DB"/>
  <ellipse cx="22" cy="12" rx="18" ry="10" fill="#F3F4F6" stroke="#D1D5DB"/>
  <ellipse cx="38" cy="15" rx="14" ry="8" fill="#F3F4F6" stroke="#D1D5DB"/>
  <text x="23" y="17" text-anchor="middle" font-size="14" fill="#6B7280">☁︎</text>
</g>`;

// Stage milestones
for (const s of STAGES) {
  const cx = stageX(s.id);
  const cy = TIMELINE_Y;
  const status = statusOf(s.id);
  const fill = STATUS_COLORS[status];
  const isCurrent = s.id === CURRENT;
  const isUnseen = status === 'unseen';
  if (isCurrent) {
    svg += `<circle cx="${cx}" cy="${cy}" r="22" fill="none" stroke="${STATUS_COLORS.current}" stroke-width="2"/>`;
  }
  svg += `<circle cx="${cx}" cy="${cy}" r="17" fill="${fill}" stroke="${isUnseen ? '#D1D5DB' : '#FFFFFF'}" stroke-width="2" ${isUnseen ? 'stroke-dasharray="3 3"' : ''}/>`;
  svg += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14" fill="${isUnseen ? '#9CA3AF' : '#FFFFFF'}">${s.emoji}</text>`;
  svg += `<text x="${cx}" y="${cy + 38}" text-anchor="middle" font-size="10" fill="${isCurrent ? STATUS_COLORS.current : '#6B7280'}" font-weight="${isCurrent ? 700 : 500}" letter-spacing="0.3">${s.name.toUpperCase()}</text>`;
  const p = PROGRESS[s.id];
  if (p && p.total > 0 && p.worked > 0) {
    svg += `<text x="${cx}" y="${cy - 24}" text-anchor="middle" font-size="9" fill="#6B7280" font-weight="600">${p.done}/${p.total}</text>`;
  }
}

// Finished building
svg += `<g transform="translate(${VB_W - STAGE_PAD_X + 20}, ${TIMELINE_Y - 28})">
  <polygon points="0,14 20,0 40,14" fill="#D97706" stroke="#92400E"/>
  <rect x="5" y="14" width="30" height="22" fill="#FCD34D" stroke="#92400E"/>
  <rect x="11" y="20" width="6" height="6" fill="#FEF3C7" stroke="#92400E"/>
  <rect x="23" y="20" width="6" height="6" fill="#FEF3C7" stroke="#92400E"/>
  <rect x="17" y="28" width="6" height="8" fill="#92400E"/>
</g>`;

svg += `</svg>`;

const fullHtml = `<!doctype html>
<html><head><meta charset="utf-8"><title>ProjectCompass preview</title>
<style>
body{font-family:system-ui;background:#0b1220;color:#eee;margin:0;padding:20px}
h1{font-size:13px;letter-spacing:0.5px;color:#9ca3af;text-transform:uppercase;margin:0 0 10px}
.card{background:#fafaf8;border-radius:14px;padding:16px 8px;max-width:1100px;margin:0 auto 16px;box-shadow:0 10px 40px rgba(0,0,0,0.3)}
.legend{max-width:1100px;margin:0 auto;font-size:12px;color:#9ca3af;line-height:1.8}
.legend span{display:inline-block;width:12px;height:12px;border-radius:6px;margin:0 4px 0 10px;vertical-align:middle}
</style></head>
<body>
<h1>ProjectCompass — W4.4 Preview · demo data · stage 4 active</h1>
<div class="card">${svg}</div>
<div class="legend">
  Status colors:
  <span style="background:#22C55E"></span>done
  <span style="background:#14B8A6"></span>teal / partial
  <span style="background:#EF4444"></span>needs attention
  <span style="background:#9CA3AF"></span>seen, untouched
  <span style="background:#E5E7EB;border:1px dashed #999"></span>never visited
  <span style="background:#2563EB"></span>current stage ring
</div>
</body></html>`;

writeFileSync('/tmp/compass-preview.html', fullHtml);
writeFileSync('/tmp/compass-preview.svg', svg);
console.log('wrote /tmp/compass-preview.html + /tmp/compass-preview.svg');
