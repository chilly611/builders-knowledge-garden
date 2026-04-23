/**
 * IntegratedNavigator smoke + contract tests
 *
 * Follows the pattern of other happy-path tests in this repo: pure vitest,
 * no React Testing Library, no DOM rendering. Value imports use relative
 * paths because vitest in this repo does not resolve the `@/` alias for
 * runtime imports (only `import type` is erased and safe).
 *
 * We verify:
 *   1. STAGE_REGISTRY has all 7 canonical stages in canonical order.
 *   2. formatCents() behaves across the thresholds the Navigator renders.
 *   3. stageById / stageBySlug round-trip.
 *   4. NAVIGATOR_EVENTS has the three event names subcomponents listen on.
 *   5. Navigator sub-component modules import cleanly — compile + link gate.
 */
import { describe, it, expect } from 'vitest';

import {
  STAGE_REGISTRY,
  formatCents,
  stageById,
  stageBySlug,
  NAVIGATOR_EVENTS,
} from '../types';
import { NavigatorProvider, useNavigator } from '../NavigatorContext';
import JourneyStrip from '../JourneyStrip';
import TimeMachineLever from '../TimeMachineLever';
import BudgetTimeline from '../BudgetTimeline';

// Note: IntegratedNavigator itself depends on `@/lib/budget-spine` and
// friends via the `@/` path alias. Vitest in this repo doesn't resolve `@/`
// for value imports, so we don't import the root component here — tsc
// already proves it compiles, and the sub-component surface is covered below.

describe('IntegratedNavigator — smoke + contract', () => {
  it('sub-components export functions', () => {
    expect(typeof JourneyStrip).toBe('function');
    expect(typeof TimeMachineLever).toBe('function');
    expect(typeof BudgetTimeline).toBe('function');
  });

  it('NavigatorContext exposes Provider + hook', () => {
    expect(typeof NavigatorProvider).toBe('function');
    expect(typeof useNavigator).toBe('function');
  });

  it('STAGE_REGISTRY has all 7 canonical stages in order', () => {
    expect(STAGE_REGISTRY.length).toBe(7);
    expect(STAGE_REGISTRY[0].slug).toBe('size-up');
    expect(STAGE_REGISTRY[6].slug).toBe('reflect');
    for (const s of STAGE_REGISTRY) {
      expect(typeof s.id).toBe('number');
      expect(typeof s.slug).toBe('string');
      expect(typeof s.label).toBe('string');
      expect(typeof s.description).toBe('string');
    }
  });

  it('formatCents handles thresholds the Navigator renders', () => {
    expect(formatCents(0)).toBe('$0');
    expect(formatCents(500)).toBe('$5');          // $5
    expect(formatCents(99999)).toBe('$1.0k');     // $1000 rounded
    expect(formatCents(250000)).toBe('$2.5k');    // $2500
    expect(formatCents(-500000)).toBe('$-5.0k');  // negative (overbudget)
  });

  it('stageById / stageBySlug round-trip', () => {
    for (const s of STAGE_REGISTRY) {
      expect(stageById(s.id)?.slug).toBe(s.slug);
      expect(stageBySlug(s.slug)?.id).toBe(s.id);
    }
    expect(stageBySlug('not-a-real-slug')).toBeUndefined();
  });

  it('NAVIGATOR_EVENTS exposes the three coordination events', () => {
    expect(NAVIGATOR_EVENTS.STAGE_CLICKED).toBe('bkg:navigator:stage-clicked');
    expect(NAVIGATOR_EVENTS.TIME_SCRUBBED).toBe('bkg:navigator:time-scrubbed');
    expect(NAVIGATOR_EVENTS.COLLAPSE_CHANGED).toBe(
      'bkg:navigator:collapse-changed'
    );
  });
});
