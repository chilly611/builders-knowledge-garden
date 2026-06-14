import { describe, it, expect } from 'vitest';
import { inferRole, ROLE_OPTIONS } from './InferRole';

describe('inferRole — the one-tap role read (first-run Principle #4)', () => {
  it('reads bidding / estimating / for-a-client language as GC', () => {
    for (const intent of [
      'Bid the Twin Peaks remodel',
      'Price a new custom home',
      'Estimate a kitchen for a client',
      'Put together a proposal for the Henderson job',
      'Win the bid on the downtown build',
      'Scope of work for the ADU job',
    ]) {
      expect(inferRole(intent)).toBe('gc');
    }
  });

  it('reads owner / dreamer voice as owner', () => {
    for (const intent of [
      'Add an ADU in the backyard',
      'Plan a kitchen remodel',
      'A treehouse for my kids',
      'I want to finish my basement',
      'Build my dream home',
    ]) {
      expect(inferRole(intent)).toBe('owner');
    }
  });

  it('defaults empty / missing intent to owner (the cold-start majority)', () => {
    expect(inferRole('')).toBe('owner');
    expect(inferRole('   ')).toBe('owner');
    expect(inferRole(undefined)).toBe('owner');
    expect(inferRole(null)).toBe('owner');
  });

  it('is case-insensitive', () => {
    expect(inferRole('BID THE TWIN PEAKS REMODEL')).toBe('gc');
  });

  it('exposes exactly the two v1 beachhead roles with plain-language labels', () => {
    expect(Object.keys(ROLE_OPTIONS).sort()).toEqual(['gc', 'owner']);
    expect(ROLE_OPTIONS.owner.label.length).toBeGreaterThan(0);
    expect(ROLE_OPTIONS.gc.label.length).toBeGreaterThan(0);
  });
});
