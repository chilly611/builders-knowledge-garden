/**
 * normalizeStoredLines — covers the AI-handoff bridge that previously
 * silently dropped data when EstimatingClient wrote `{ lines: [...] }`
 * and BudgetClient.readLines did `Array.isArray(parsed) ? parsed : []`.
 *
 * Regression guard for DATA+DEMO fix (2026-05-22).
 */

import { describe, expect, it } from 'vitest';
import { normalizeStoredLines } from '../budget-storage';

const makeLine = (overrides: Record<string, unknown> = {}) => ({
  id: 'est-marin-01',
  category: 'subcontractors',
  description: 'Plumbing',
  amount: 12500,
  state: 'estimated' as const,
  createdAt: '2026-05-22T00:00:00.000Z',
  updatedAt: '2026-05-22T00:00:00.000Z',
  ...overrides,
});

describe('normalizeStoredLines', () => {
  it('accepts the legacy bare-array shape', () => {
    const lines = [makeLine(), makeLine({ id: 'est-marin-02', amount: 9000 })];
    expect(normalizeStoredLines(lines)).toHaveLength(2);
  });

  it('accepts the EstimatingClient envelope shape `{ lines: [...] }`', () => {
    // Pre-fix this returned [] and the AI push silently disappeared.
    const envelope = { lines: [makeLine(), makeLine({ id: 'est-marin-02' })] };
    const out = normalizeStoredLines(envelope);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('est-marin-01');
  });

  it('returns [] for null / undefined / primitives', () => {
    expect(normalizeStoredLines(null)).toEqual([]);
    expect(normalizeStoredLines(undefined)).toEqual([]);
    expect(normalizeStoredLines('garbage')).toEqual([]);
    expect(normalizeStoredLines(42)).toEqual([]);
  });

  it('returns [] when `lines` is present but not an array', () => {
    expect(normalizeStoredLines({ lines: 'oops' })).toEqual([]);
    expect(normalizeStoredLines({ lines: null })).toEqual([]);
  });

  it('drops malformed line items but keeps valid ones', () => {
    const envelope = {
      lines: [
        makeLine(),
        { id: 1 }, // wrong type
        { id: 'x', category: 'labor', amount: Number.NaN, state: 'estimated' }, // bad amount
        { id: 'y', category: 'labor', amount: 100, state: 'martian' }, // bad state
        makeLine({ id: 'est-marin-keep', amount: 5000 }),
      ],
    };
    const out = normalizeStoredLines(envelope);
    expect(out.map((l) => l.id)).toEqual(['est-marin-01', 'est-marin-keep']);
  });

  it('round-trips through JSON.parse the way readLines does', () => {
    const envelope = { lines: [makeLine()] };
    const roundTripped = JSON.parse(JSON.stringify(envelope));
    expect(normalizeStoredLines(roundTripped)).toHaveLength(1);
  });
});
