/**
 * buildDefaultConfig — the restored go-anywhere catalog (2026-06-10).
 *
 * Repo testing pattern: vitest has no `@/` alias, so the `@/` deps are
 * mocked. Part 1 verifies the nav JOIN logic against a small fixture
 * catalog; Part 2 validates the REAL catalog data by reading
 * CompassWorkflowNav.tsx off disk and asserting every workflow href maps
 * to an existing app route (no dead panel entries).
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const STAGES = vi.hoisted(() => [
  { id: 1, slug: 'size-up', name: 'Size up', short: 'Size Up' },
  { id: 2, slug: 'lock', name: 'Lock it in', short: 'Lock' },
  { id: 3, slug: 'plan', name: 'Plan it out', short: 'Plan' },
  { id: 4, slug: 'build', name: 'Build', short: 'Build' },
  { id: 5, slug: 'adapt', name: 'Adapt', short: 'Adapt' },
  { id: 6, slug: 'collect', name: 'Collect', short: 'Collect' },
  { id: 7, slug: 'reflect', name: 'Reflect', short: 'Reflect' },
]);

vi.mock('@/components/killerapp-chrome/types', () => ({ KAC_STAGES: STAGES }));

vi.mock('@/components/CompassWorkflowNav', () => ({
  WORKFLOWS: [
    { id: 'budget', href: '/killerapp/budget', stage: 0, emoji: '', label: "What's the budget?", sublabel: 'Budget & estimating' },
    { id: 'q5', href: '/killerapp/workflows/code-compliance', stage: 2, emoji: '', label: 'Which codes apply here?', sublabel: 'Code compliance' },
    { id: 'q6', href: '/killerapp/workflows/job-sequencing', stage: 3, emoji: '', label: 'Who works when?', sublabel: 'Sequence the trades' },
    { id: 'gc-only', href: '/killerapp/workflows/sub-management', stage: 3, emoji: '', label: 'Compare sub bids.', sublabel: 'Bid analysis' },
  ],
}));

vi.mock('@/lib/workflow-roles', () => ({
  // 'gc-only' is restricted to gc; everything else unrestricted — lets the
  // test prove the central role map is consulted per entry.
  isWorkflowAllowedForLane: (id: string, lane: string) => (id === 'gc-only' ? lane === 'gc' : true),
}));

import { buildDefaultConfig } from '../config';

const LEDGER = {
  ready: true,
  hasData: true,
  name: 'Test build',
  budget: { total: 1_000_000, spent: 100_000, committed: 50_000, remaining: 850_000 },
  journey: { currentStage: 3, stageProgress: { 3: 40 } },
};

describe('buildDefaultConfig nav — restored catalog', () => {
  it('lane known: nav = picker + budget + 7 stages + lane-filtered catalog (stage-0 deduped)', () => {
    const cfg = buildDefaultConfig({ ledger: LEDGER, lane: 'gc', laneKnown: true, projectId: 'p1' });
    const ids = cfg.nav.map((n) => n.id);
    expect(ids[0]).toBe('picker');
    expect(ids[1]).toBe('budget');
    // 7 journey stages
    for (const s of STAGES) expect(ids).toContain(s.slug);
    // catalog entries present, grouped, with hrefs
    expect(ids).toContain('q5');
    expect(ids).toContain('q6');
    expect(ids).toContain('gc-only');
    const q5 = cfg.nav.find((n) => n.id === 'q5')!;
    expect(q5.group).toBe('Lock it in');
    expect(q5.href).toBe('/killerapp/workflows/code-compliance');
    // stage-0 catalog entry must NOT duplicate the Money group's Budget item
    expect(ids.filter((i) => i === 'budget')).toHaveLength(1);
    expect(cfg.nav).toHaveLength(2 + 7 + 3);
  });

  it('lane role-gating: a non-gc lane drops gc-restricted entries', () => {
    const cfg = buildDefaultConfig({ ledger: LEDGER, lane: 'owner', laneKnown: true, projectId: 'p1' });
    const ids = cfg.nav.map((n) => n.id);
    expect(ids).toContain('q5');
    expect(ids).not.toContain('gc-only');
  });

  it('lane unknown: neutral state keeps the minimal nav (no catalog firehose)', () => {
    const cfg = buildDefaultConfig({ ledger: LEDGER, lane: null, laneKnown: false, projectId: 'p1' });
    expect(cfg.nav.map((n) => n.id)).toEqual(['picker', 'budget']);
  });
});

describe('real catalog data — every panel entry is a live route', () => {
  it('all WORKFLOWS hrefs in CompassWorkflowNav.tsx resolve to existing app routes', () => {
    const src = readFileSync(join(__dirname, '../../CompassWorkflowNav.tsx'), 'utf8');
    expect(src).toMatch(/export const WORKFLOWS/);
    const hrefs = [...src.matchAll(/href:\s*'(\/killerapp[^']*)'/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThanOrEqual(19);
    const appDir = join(__dirname, '../../../app');
    for (const href of hrefs) {
      const routeDir = join(appDir, ...href.split('/').filter(Boolean));
      const ok = existsSync(join(routeDir, 'page.tsx')) || existsSync(join(routeDir, 'page.ts'));
      expect(ok, `route missing for ${href}`).toBe(true);
    }
  });
});
