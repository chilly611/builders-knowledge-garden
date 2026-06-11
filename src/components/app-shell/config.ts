/**
 * App Shell config helpers — build the lane/project config from the project's
 * REAL ledger numbers (via useProjectLedger), not a hardcoded fixture. The
 * Owner Lane pushes its own lens-gated config; every other surface reads the
 * default built here.
 */

import { KAC_STAGES } from '@/components/killerapp-chrome/types';
import { WORKFLOWS } from '@/components/CompassWorkflowNav';
import { isWorkflowAllowedForLane } from '@/lib/workflow-roles';
import type { ProjectRole } from '@/lib/use-user-lane';
import type { ShellConfig, ShellNavItem, ShellBudgetCell, MoneyState } from './types';
import type { LedgerResult } from './useProjectLedger';

/**
 * Canonical animated seal — the BKG "Viver" mark from the public `brand-assets`
 * bucket: a hammer whose handle becomes roots (herbarium plate, self-animating).
 * DB `storage_path` is relative to an `assets/` root, so the public object lives
 * under `…/brand-assets/assets/bkg/…` (the `assets/` prefix quirk).
 */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vlezoyalutexenbnzzui.supabase.co';
const BRAND_ASSETS = `${SUPABASE_URL}/storage/v1/object/public/brand-assets/assets`;

/** Animated BKG seal (brand_assets garden_scope='bkg', asset_type='motion'). */
export const BKG_SEAL_SRC = `${BRAND_ASSETS}/bkg/hammer-roots-mark-motion.mp4`;
/** Static herbarium emblem — video poster + prefers-reduced-motion fallback. */
export const BKG_SEAL_POSTER = `${BRAND_ASSETS}/bkg/hammer-roots-emblem.png`;

/**
 * Parent Knowledge Gardens mark — the umbrella "tree" motion. Retained for the
 * cross-garden switcher (the level ABOVE BKG); no longer the BKG shell seal.
 */
export const UMBRELLA_SEAL_SRC = `${BRAND_ASSETS}/umbrella/tree-umbrella-mark-motion-a.mp4`;

/** @deprecated Back-compat alias — the shell seal is now {@link BKG_SEAL_SRC}. */
export const SEAL_SRC = BKG_SEAL_SRC;

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

/** Group headings for the restored workflow catalog (matches the old panel). */
const CATALOG_GROUPS: Record<number, string> = {
  1: 'Size up',
  2: 'Lock it in',
  3: 'Plan it out',
};

/**
 * The go-anywhere catalog (restored 2026-06-10): every live workflow the old
 * CompassWorkflowNav panel offered, lane-gated by the same central
 * WORKFLOW_ROLES map. The app-shell promotion (2026-05-31) shipped ShellNav
 * with only picker + budget + stages, dropping this list — that was the
 * "compass bloom degraded" regression. Stage-0 (Budget) is skipped here
 * because it's already the Money group entry above.
 */
const CATALOG_NAV = (lane: ProjectRole): ShellNavItem[] =>
  WORKFLOWS
    .filter((w) => w.stage !== 0 && isWorkflowAllowedForLane(w.id, lane))
    .map((w) => ({
      id: w.id,
      label: w.label,
      sub: w.sublabel,
      href: w.href,
      group: CATALOG_GROUPS[w.stage],
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

  // Universal journey nav + the full workflow catalog only once the lane is
  // known; neutral state keeps it to the essentials (no lane-specific tool
  // firehose for an unresolved visitor).
  const nav: ShellNavItem[] = [
    { id: 'picker', label: 'Pick a project', sub: 'Your projects & tools', href: '/killerapp' },
    { id: 'budget', label: 'Budget', sub: 'Money & estimating', href: '/killerapp/budget', group: 'Money' },
    ...(laneKnown && lane ? [...STAGE_NAV(activeSlug), ...CATALOG_NAV(lane)] : []),
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
