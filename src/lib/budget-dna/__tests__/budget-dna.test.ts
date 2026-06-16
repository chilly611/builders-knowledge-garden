import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

import {
  CATEGORIES,
  CATEGORY_BY_ID,
  lineToCategory,
  lensSeesProfit,
  type CategoryId,
} from '../categories';
import { schedulePhases, totalScheduleWeeks } from '../schedule';
import { deriveBudgetDna } from '../derive';
import {
  MARIN_BUDGET_LINES,
  MARIN_PLAN_PHASES,
  MARIN_BUDGET_TOTAL,
  MARIN_BUDGET_SPENT,
  MARIN_BUDGET_COMMITTED,
  MARIN_BUDGET_REMAINING,
} from '../../seed-data/marin-farmhouse';

// Stage-accent hexes the category palette must never collide with.
const STAGE_ACCENT_HEXES = ['#B6873A', '#C9913F', '#3E3A6E', '#2E9E9A', '#E05E4B', '#B23A7F', '#5E4B7C'];

const MARIN_TOTALS = {
  total: MARIN_BUDGET_TOTAL,
  spent: MARIN_BUDGET_SPENT,
  committed: MARIN_BUDGET_COMMITTED,
  remaining: MARIN_BUDGET_REMAINING,
};

describe('categories palette', () => {
  it('has eight categories with unique ids, orders 0..7, and unique hexes', () => {
    expect(CATEGORIES).toHaveLength(8);
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(8);
    expect(CATEGORIES.map((c) => c.order).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(CATEGORIES.map((c) => c.hex.toUpperCase())).size).toBe(8);
    expect(new Set(CATEGORIES.map((c) => c.pattern)).size).toBe(8);
  });

  it('is distinct from every stage-accent hex (categories never recolor stages)', () => {
    for (const c of CATEGORIES) {
      expect(STAGE_ACCENT_HEXES.map((h) => h.toUpperCase())).not.toContain(c.hex.toUpperCase());
    }
  });

  it('mirrors the --cat-* tokens in tokens.css (no silent drift)', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');
    // Build a simple `--name -> #hex` map for one-level var() resolution.
    const hexOf: Record<string, string> = {};
    for (const m of css.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) hexOf[m[1]] = m[2].toUpperCase();
    const resolve = (raw: string): string | null => {
      const v = raw.trim().replace(/;$/, '');
      if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toUpperCase();
      const ref = v.match(/^var\((--[\w-]+)\)$/);
      return ref ? hexOf[ref[1]] ?? null : null;
    };
    const catDecl: Record<string, string> = {};
    for (const m of css.matchAll(/(--cat-[\w-]+):\s*([^;]+);/g)) catDecl[m[1]] = m[2];

    for (const c of CATEGORIES) {
      const token = c.cssVar.match(/var\((--[\w-]+)\)/)![1];
      const resolved = resolve(catDecl[token]);
      expect(resolved, `${token} resolves to a hex`).toBeTruthy();
      expect(resolved, `${token} matches CATEGORIES['${c.id}'].hex`).toBe(c.hex.toUpperCase());
    }
  });
});

describe('lineToCategory — Marin', () => {
  const expected: Record<string, CategoryId> = {
    'marin-permits': 'softcosts',
    'marin-arch': 'softcosts',
    'marin-gc': 'softcosts',
    'marin-foundation': 'foundation',
    'marin-framing-labor': 'framing',
    'marin-framing-mat': 'framing',
    'marin-roofing': 'envelope',
    'marin-electrical': 'systems',
    'marin-plumbing': 'systems',
    'marin-hvac': 'systems',
    'marin-windows': 'envelope',
    'marin-drywall': 'finishes',
    'marin-finishes': 'finishes',
    'marin-siding': 'envelope',
    'marin-equipment': 'site',
    'marin-landscape': 'site-improv',
  };

  for (const line of MARIN_BUDGET_LINES) {
    it(`maps ${line.id} (${line.description}) → ${expected[line.id]}`, () => {
      expect(lineToCategory(line)).toBe(expected[line.id]);
    });
  }
});

describe('schedulePhases — Marin', () => {
  it('lays out 37 weeks with MEP running in parallel', () => {
    const scheduled = schedulePhases(MARIN_PLAN_PHASES);
    expect(totalScheduleWeeks(scheduled)).toBe(37);
    const framing = scheduled.find((p) => p.id === 'framing')!;
    expect(framing.startWeek).toBe(7);
    expect(framing.endWeek).toBe(17);
    const mep = scheduled.filter((p) => p.parallelGroup === 'mep');
    expect(new Set(mep.map((p) => p.startWeek))).toEqual(new Set([20])); // all start together
  });
});

describe('deriveBudgetDna — Marin', () => {
  const dna = deriveBudgetDna({ lines: MARIN_BUDGET_LINES, phases: MARIN_PLAN_PHASES, totals: MARIN_TOTALS, lane: 'gc' });

  it('reconciles to the $1.65M contract across categories', () => {
    const sum = dna.series.reduce((s, c) => s + c.total, 0);
    expect(Math.round(sum)).toBe(MARIN_BUDGET_TOTAL);
  });

  it('series are in canonical bottom→top order', () => {
    expect(dna.series.map((s) => s.id)).toEqual(
      [...CATEGORIES].sort((a, b) => a.order - b.order).map((c) => c.id),
    );
  });

  it('reads materials-early / finishes-late (the silhouette)', () => {
    const centroid = (id: CategoryId) => {
      const s = dna.series.find((x) => x.id === id)!;
      const num = s.weekly.reduce((acc, v, w) => acc + v * w, 0);
      const den = s.weekly.reduce((acc, v) => acc + v, 0);
      return den ? num / den : 0;
    };
    // Foundation & framing land well before interior finishes.
    expect(centroid('foundation')).toBeLessThan(centroid('finishes'));
    expect(centroid('framing')).toBeLessThan(centroid('finishes'));
    expect(centroid('site-improv')).toBeGreaterThan(centroid('framing'));
  });

  it('places the playhead near end-of-foundation given $312.4K spent', () => {
    // $312K ≈ permits+arch+equipment+foundation+early GC → right after foundation (~wk 7).
    expect(dna.currentWeek).toBeGreaterThanOrEqual(5);
    expect(dna.currentWeek).toBeLessThanOrEqual(11);
  });

  it('passes the canonical totals through untouched', () => {
    expect(dna.totals).toEqual(MARIN_TOTALS);
  });
});

describe('lens gating', () => {
  it('shows projected profit to builder lanes, hides it from owner & others', () => {
    expect(lensSeesProfit('gc')).toBe(true);
    expect(lensSeesProfit('contractor')).toBe(true);
    expect(lensSeesProfit('owner')).toBe(false);
    expect(lensSeesProfit('specialist')).toBe(false);
    expect(lensSeesProfit(null)).toBe(false);

    const gc = deriveBudgetDna({ lines: MARIN_BUDGET_LINES, phases: MARIN_PLAN_PHASES, totals: MARIN_TOTALS, lane: 'gc' });
    const owner = deriveBudgetDna({ lines: MARIN_BUDGET_LINES, phases: MARIN_PLAN_PHASES, totals: MARIN_TOTALS, lane: 'owner' });
    expect(gc.profit).not.toBeNull();
    expect(gc.profit!.gross).toBeGreaterThan(0);
    expect(owner.profit).toBeNull();
  });
});

describe('deriveBudgetDna — empty', () => {
  it('is honest when there are no lines', () => {
    const dna = deriveBudgetDna({ lines: [], phases: MARIN_PLAN_PHASES, totals: { total: 0, spent: 0, committed: 0, remaining: 0 }, lane: 'gc' });
    expect(dna.empty).toBe(true);
    expect(dna.series.every((s) => s.total === 0)).toBe(true);
  });
});

// Keep CATEGORY_BY_ID honest.
describe('CATEGORY_BY_ID', () => {
  it('indexes every category', () => {
    for (const c of CATEGORIES) expect(CATEGORY_BY_ID[c.id]).toBe(c);
  });
});
