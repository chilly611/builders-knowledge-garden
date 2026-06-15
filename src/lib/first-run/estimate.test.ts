import { describe, it, expect } from 'vitest';
import {
  parseSqft,
  parseBuildingType,
  resolveRegion,
  parseProjectSignals,
  estimateTiers,
} from './estimate';

describe('parseSqft', () => {
  it('reads common phrasings', () => {
    expect(parseSqft('a 1,800 sq ft home')).toBe(1800);
    expect(parseSqft('2000 sqft adu')).toBe(2000);
    expect(parseSqft('about 2k sf')).toBe(2000);
    expect(parseSqft('1500 square feet')).toBe(1500);
  });
  it('ignores no-size text and out-of-range values', () => {
    expect(parseSqft('build me a house')).toBeUndefined();
    expect(parseSqft('5 sq ft')).toBeUndefined(); // below floor
  });
});

describe('parseBuildingType', () => {
  it('classifies by the user words', () => {
    expect(parseBuildingType('a backyard ADU for my mom')).toBe('adu');
    expect(parseBuildingType('remodel our kitchen')).toBe('kitchen_remodel');
    expect(parseBuildingType('build a new custom home')).toBe('new_home');
    expect(parseBuildingType('convert the garage to a studio')).toBe('garage_conversion');
  });
  it('returns undefined when nothing matches', () => {
    expect(parseBuildingType('help me think about a project')).toBeUndefined();
  });
});

describe('resolveRegion', () => {
  it('maps known CA regions to a cost index', () => {
    expect(resolveRegion('in Marin County').multiplier).toBe(1.3);
    expect(resolveRegion('Fresno').multiplier).toBe(0.92);
  });
  it('falls back to the CA baseline for anything unrecognized', () => {
    const r = resolveRegion('Tokyo');
    expect(r.matched).toBe(false);
    expect(r.multiplier).toBe(1.0);
  });
});

describe('estimateTiers — honesty invariants', () => {
  const cases = [
    'build a backyard ADU in Marin',
    'new 2,500 sq ft custom home in San Diego',
    '', // cold: no words at all
  ];
  for (const intent of cases) {
    it(`every tier stays honest for "${intent || '(empty)'}"`, () => {
      const { tiers } = estimateTiers({ intent });
      expect(tiers).toHaveLength(3);
      for (const t of tiers) {
        // grounded range, low < high, no fabricated single-point precision
        expect(t.moneyLow).toBeGreaterThan(0);
        expect(t.moneyHigh).toBeGreaterThan(t.moneyLow);
        // no tier is all-green
        expect(t.flags.some((f) => f.kind !== 'ease')).toBe(true);
        // a verify-with-your-AHJ hedge survives on every tier
        expect(t.flags.some((f) => /AHJ/.test(f.why))).toBe(true);
      }
      // exactly one recommended default, and it's Business Class
      expect(tiers.filter((t) => t.recommended)).toHaveLength(1);
      expect(tiers.find((t) => t.recommended)?.key).toBe('business');
    });
  }
});

describe('estimateTiers — grounding', () => {
  it('scales with size and jurisdiction (not static)', () => {
    const small = estimateTiers({ intent: 'an 800 sq ft ADU in Fresno' });
    const big = estimateTiers({ intent: 'a 3,000 sq ft new home in Marin' });
    const mid = (t: { moneyLow: number; moneyHigh: number }) => (t.moneyLow + t.moneyHigh) / 2;
    expect(mid(big.tiers[1])).toBeGreaterThan(mid(small.tiers[1]) * 2);
    expect(big.basis.regionMultiplier).toBeGreaterThan(small.basis.regionMultiplier);
  });

  it('flags assumptions when nothing is known, and clears them when refined', () => {
    const cold = estimateTiers({});
    expect(cold.basis.assumedSqft).toBe(true);
    expect(cold.basis.assumedLocation).toBe(true);
    expect(cold.tiers[0].flags.some((f) => /assumed/i.test(f.headline))).toBe(true);

    const refined = estimateTiers({ intent: 'an ADU', sqft: 1200, location: 'Oakland' });
    expect(refined.basis.assumedSqft).toBe(false);
    expect(refined.basis.assumedLocation).toBe(false);
    expect(refined.basis.sqft).toBe(1200);
    expect(refined.basis.regionMultiplier).toBe(1.3); // Oakland → Bay Area index
    expect(refined.tiers.every((t) => !t.flags.some((f) => /assumed/i.test(f.headline)))).toBe(true);
  });

  it('light input wins over words parsed from intent', () => {
    const r = estimateTiers({ intent: 'a 900 sq ft ADU in Fresno', sqft: 2400, location: 'Palo Alto' });
    expect(r.basis.sqft).toBe(2400);
    expect(r.basis.regionMultiplier).toBe(1.3);
  });
});
