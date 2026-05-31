/**
 * App Shell config helpers — build the lane/project config from the project's
 * REAL ledger numbers (via useProjectLedger), not a hardcoded fixture. The
 * Owner Lane pushes its own lens-gated config; every other surface reads the
 * default built here.
 */

import { KAC_STAGES } from '@/components/killerapp-chrome/types';
import type { ProjectRole } from '@/lib/use-user-lane';
import type { ShellConfig, ShellNavItem, ShellBudgetCell, MoneyState } from './types';
import type { LedgerResult } from './useProjectLedger';

/**
 * Canonical animated seal — the umbrella "tree" mark from the public
 * `brand-assets` bucket. DB `storage_path` is relative to an `assets/` root,
 * so the public object lives under `…/brand-assets/assets/umbrella/…`.
 */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vlezoyalutexenbnzzui.supabase.co';
export const SEAL_SRC = `${SUPABASE_URL}/storage/v1/object/public/brand-assets/assets/umbrella/tree-umbrella-mark-motion-a.mp4`;

/** Plain-language subtitle under each journey stage. */
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

/** Compact money — "$1.65M", "$312K", "$840". */
export function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1_000) return '$' + Math.round(n / 1_000) + 'K';
  return '$' + Math.round(n).toLocaleString('en-US');
}

const STAGE_NAV = (activeSlug: string): ShellNavItem[] =>
  KAC_STAGES.map((s) => ({
    id: s.slug,
    label: s.short,
    sub: STAGE_PLAIN[s.slug],
    href: `/killerapp/stages/${s.slug}`,
    group: 'Journey · time machine',
    flag: s.slug === activeSlug,
  }));

/**
 * Build the default shell config from the project's real ledger + the user's
 * RESOLVED lane. Lane is never silently defaulted to GC: when unknown the
 * shell shows a neutral "Preview" state with a minimal nav (no GC firehose).
 */
export function buildDefaultConfig(opts: {
  ledger: LedgerResult;
  /** Resolved real role, or null when unknown. */
  lane: ProjectRole | null;
  laneKnown: boolean;
  projectId: string | null;
  projectName?: string | null;
}): ShellConfig {
  const { ledger, lane, laneKnown, projectId } = opts;

  const label = laneKnown && lane ? laneLabel(lane) : 'Preview';
  const slug = laneKnown && lane ? lane : 'guest';
  const kicker = laneKnown && lane
    ? `Builder's Knowledge Garden · ${label}`
    : "Builder's Knowledge Garden";

  const name = ledger.name || opts.projectName || (projectId ? 'Your build' : 'Pick a project');

  const b = ledger.budget;
  const j = ledger.journey;
  const currentStage = j?.currentStage ?? 0;
  const activeSlug = currentStage >= 1 && currentStage <= 7 ? KAC_STAGES[currentStage - 1].slug : '';

  const cells: ShellBudgetCell[] = KAC_STAGES.map((s) => {
    const state: MoneyState = !currentStage
      ? 'soon'
      : s.id < currentStage ? 'paid' : s.id === currentStage ? 'now' : 'soon';
    return { stage: s.slug, state, amountLabel: state === 'paid' ? 'Paid' : state === 'now' ? 'Now' : 'Soon' };
  });

  const pct = j ? (j.stageProgress[currentStage] ?? 0) : 0;

  // Universal journey nav only once the lane is known; neutral state keeps it
  // to the essentials (no lane-specific tool firehose).
  const nav: ShellNavItem[] = [
    { id: 'picker', label: 'Pick a project', sub: 'Your projects & tools', href: '/killerapp' },
    { id: 'budget', label: 'Budget', sub: 'Money & estimating', href: '/killerapp/budget', group: 'Money' },
    ...(laneKnown ? STAGE_NAV(activeSlug) : []),
  ];

  return {
    laneSlug: slug,
    laneLabel: label,
    kicker,
    projectId,
    projectName: name,
    sealSrc: SEAL_SRC,
    budget: {
      show: !!b && ledger.hasData,
      cells,
      activeStage: activeSlug,
      endBig: b ? fmtMoney(b.remaining) : '—',
      endSub: b ? `left of ${fmtMoney(b.total)}` : '',
    },
    journey: {
      show: !!j && ledger.hasData,
      activeStage: activeSlug,
      pct,
      weekOf: 0,
      weeksTotal: 0,
    },
    nav,
    ready: ledger.ready,
  };
}
