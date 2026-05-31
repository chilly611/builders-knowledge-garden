/**
 * App Shell config helpers — the DEFAULT lane/project config and the
 * formatters that drive the budget + journey strips. The Owner Lane builds
 * its own config from lens-gated /api/owner-home data; everything else falls
 * back to the canonical Marin project via `buildDefaultConfig`.
 */

import { KAC_STAGES } from '@/components/killerapp-chrome/types';
import type { KacProject } from '@/components/killerapp-chrome/types';
import type { ProjectRole } from '@/lib/use-user-lane';
import type { ShellConfig, ShellNavItem, ShellBudgetCell } from './types';

/**
 * Canonical animated seal — the umbrella "tree" mark from the public
 * `brand-assets` bucket (brand_assets.slug = tree-umbrella-mark-motion-a).
 * The DB stores `storage_path` relative to an `assets/` root, so the public
 * object lives under `…/brand-assets/assets/umbrella/…`. Derived from the
 * configured Supabase URL with a prod fallback so the seal resolves even
 * when the public env var is absent at build time.
 */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vlezoyalutexenbnzzui.supabase.co';
export const SEAL_SRC = `${SUPABASE_URL}/storage/v1/object/public/brand-assets/assets/umbrella/tree-umbrella-mark-motion-a.mp4`;

/** Plain-language subtitle under each journey stage (owner-facing voice). */
export const STAGE_PLAIN: Record<string, string> = {
  'size-up': 'Scoping',
  lock: 'Scope & budget set',
  plan: 'Planning',
  build: 'Building',
  adapt: 'Changes',
  collect: 'Payments & closeout',
  reflect: 'Wrap-up',
};

const LANE_LABELS: Record<string, string> = {
  owner: 'Owner',
  gc: 'Builder',
  contractor: 'Contractor',
  specialist: 'Specialist',
  teammate: 'Teammate',
  day_hire: 'Day hire',
  diy: 'DIY Builder',
};

export function laneLabel(slug: string | null | undefined): string {
  if (!slug) return 'Builder';
  return LANE_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** Compact money — "$1.65M", "$312K", "$840". Used by the budget strip. */
export function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1_000) return '$' + Math.round(n / 1_000) + 'K';
  return '$' + Math.round(n).toLocaleString('en-US');
}

/**
 * Build the default shell config from the canonical KacProject + the user's
 * effective lane. Used on every non-owner surface (the owner surface pushes
 * its own lens-gated config).
 */
export function buildDefaultConfig(opts: {
  project: KacProject;
  lane: ProjectRole | string | null;
  projectId: string | null;
  projectName?: string | null;
}): ShellConfig {
  const { project, lane, projectId } = opts;
  const stages = project.stages;

  // Active stage = first in-progress (0 < completion < 100); else the cell
  // right after the last fully-complete stage; else the first.
  let activeIdx = stages.findIndex((s) => s.completion > 0 && s.completion < 100);
  if (activeIdx < 0) {
    let lastDone = -1;
    stages.forEach((s, i) => { if (s.completion >= 100) lastDone = i; });
    activeIdx = lastDone >= 0 ? Math.min(lastDone + 1, stages.length - 1) : 0;
  }
  const activeStage = stages[activeIdx]?.slug ?? 'build';
  const pct = Math.round(stages[activeIdx]?.completion ?? 0);

  const cells: ShellBudgetCell[] = stages.map((s, i) => ({
    stage: s.slug,
    state: s.completion >= 100 ? 'paid' : i === activeIdx ? 'now' : 'soon',
    amountLabel: s.completion >= 100 ? 'Paid' : i === activeIdx ? 'Now' : 'Soon',
  }));

  // Weeks from the schedule span; week-of from overall fraction across stages.
  const start = Date.parse(project.schedule.startDate);
  const end = Date.parse(project.schedule.substantialCompletionDate);
  const weeksTotal = end > start ? Math.round((end - start) / (7 * 86_400_000)) : 37;
  const overall = (activeIdx + pct / 100) / Math.max(1, stages.length);
  const weekOf = Math.max(1, Math.round(weeksTotal * overall));

  const label = laneLabel(lane as string);
  const nav: ShellNavItem[] = [
    { id: 'picker', label: 'Pick a workflow', sub: 'Your projects & tools', href: '/killerapp' },
    { id: 'budget', label: 'Budget', sub: 'Money & estimating', href: '/killerapp/budget', group: 'Money' },
    ...KAC_STAGES.map((s) => ({
      id: s.slug,
      label: s.short,
      sub: STAGE_PLAIN[s.slug],
      href: `/killerapp/stages/${s.slug}`,
      group: 'Journey · time machine',
      flag: s.slug === activeStage,
    })),
  ];

  return {
    laneSlug: (lane as string) || 'gc',
    laneLabel: label,
    kicker: `Builder's Knowledge Garden · ${label}`,
    projectId,
    projectName: opts.projectName || project.name,
    sealSrc: SEAL_SRC,
    budget: {
      show: true,
      cells,
      activeStage,
      endBig: fmtMoney(project.budget.remaining),
      endSub: `left of ${fmtMoney(project.budget.total)}`,
    },
    journey: { show: true, activeStage, pct, weekOf, weeksTotal },
    nav,
    ready: true,
  };
}
