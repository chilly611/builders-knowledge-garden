'use client';

/**
 * BudgetClient — Ship 22 (BKG demo prep, investor demo 2026-05-20).
 * ========================================================================
 *
 * Standalone budget + estimating interface that a non-tech-savvy contractor
 * can run after seeing it once. Replaces the "QuickBooks + Excel + scraps
 * of paper" workflow with a hand-holding category-grid + cash-flow strip.
 *
 * STRUCTURE (top → bottom):
 *   1. Hero strip (sticky)      — huge total, range, state legend
 *   2. Stacked horizontal bar   — single 24px bar, one segment per category
 *   3. Category grid            — 10 category cards (expandable accordions)
 *   4. Line-item inline sheet   — table inside the expanded card
 *   5. Cash flow strip          — Lock / Build / Adapt / Collect lane
 *   6. Help strip               — three quick-start links
 *
 * STATE MODEL (per Chilly's brief):
 *   pending   = "I haven't figured this out yet"
 *   estimated = "I have a working number, but it's not locked"
 *   locked-in = "Vendor confirmed the number"
 *   paid      = "Money has actually moved"
 *
 * PERSISTENCE (demo build):
 *   localStorage key: `bkg-budget-{projectId}` (or `bkg-budget-anonymous`
 *   when no project is active). JSON-encoded BudgetLine[]. The shape
 *   matches the eventual JSONB column on command_center_projects.
 *   Autosave fires on every mutation via 500ms debounce.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import Link from 'next/link';
import { useProject } from '@/lib/hooks/useProject';
import { supabase } from '@/lib/supabase';
import { useRealtimeChannel } from '@/lib/use-realtime-channel';
import { normalizeStoredLines } from './budget-storage';
import CostPerSquareFootBadge from '@/design-system/components/CostPerSquareFootBadge';
import { colors } from '@/design-system/tokens/colors';
import {
  fonts,
  fontWeights,
  letterSpacing,
} from '@/design-system/tokens/typography';
import {
  radii,
  shadows,
  transitions,
} from '@/design-system/tokens';

// ─── Types ────────────────────────────────────────────────────────────────

type BudgetState = 'pending' | 'estimated' | 'locked-in' | 'paid';

interface BudgetLine {
  id: string;
  category: string;
  description: string;
  amount: number;
  state: BudgetState;
  vendor?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // BUDGET-WRITE round-3 (2026-05-22): natural upsert key for
  // project_budget_lines. Populated from the API on read; falls back to
  // `id` on write so locally-created lines still round-trip cleanly.
  csi_division?: string;
}

interface CategoryDef {
  id: string;
  label: string;
  emoji: string;
  hex: string;
  hint: string; // empty-state example
  missingHint: string; // "what's missing" copy when zero lines
}

// ─── Category palette (locked per Ship 22 brief) ─────────────────────────

const CATEGORIES: CategoryDef[] = [
  {
    id: 'materials',
    label: 'Materials',
    emoji: '\u{1F3D7}\u{FE0F}', // construction
    hex: '#C9913F',
    hint: 'Lumber, drywall, paint, hardware, fixtures, fasteners…',
    missingHint:
      'Most projects this size need at least 3 material line items. Want a template?',
  },
  {
    id: 'raw-supplies',
    label: 'Raw materials & supplies',
    emoji: '\u{1F9F1}',
    hex: '#B6873A',
    hint: 'Concrete, sand, gravel, rebar, lumber stock…',
    missingHint:
      'No raw materials yet — concrete, gravel and rebar usually live here.',
  },
  {
    id: 'labor',
    label: 'Labor (W-2)',
    emoji: '\u{1F477}\u{200D}\u{2642}\u{FE0F}',
    hex: '#E05E4B',
    hint: 'Crew wages, foreman, helper hours, overtime…',
    missingHint:
      'Add the crew you’re paying weekly — even a rough hourly × hours is a real start.',
  },
  {
    id: 'subcontractors',
    label: 'Subcontractors',
    emoji: '\u{1F91D}',
    hex: '#B23A7F',
    hint: 'Electrician, plumber, HVAC, roofer, drywaller…',
    missingHint:
      'Sub bids belong here — drop the amounts even before contracts are signed.',
  },
  {
    id: 'equipment',
    label: 'Equipment',
    emoji: '\u{1F69C}',
    hex: '#2E9E9A',
    hint: 'Rentals, lifts, scaffold, tools, generator, fuel…',
    missingHint:
      'Track rentals and big tool buys here so they don’t surprise you later.',
  },
  {
    id: 'permits',
    label: 'Permits & fees',
    emoji: '\u{1F4DC}',
    hex: '#3E3A6E',
    hint: 'Building permit, plan check, inspection fees, impact fees…',
    missingHint:
      'Pull a number from your jurisdiction — even an estimate keeps the budget honest.',
  },
  {
    id: 'admin',
    label: 'Admin & office',
    emoji: '\u{1F4BC}',
    hex: '#5E4B7C',
    hint: 'Office rent, software, phone, printing, mileage…',
    missingHint:
      'Don’t forget your phone, software, and the truck — they all add up.',
  },
  {
    id: 'insurance',
    label: 'Insurance & bonds',
    emoji: '\u{1F6E1}\u{FE0F}',
    hex: '#7FCFCB',
    hint: 'GL, workers comp, builder’s risk, performance bond…',
    missingHint:
      'Insurance and bonds are usually a % of contract — drop a placeholder now.',
  },
  {
    id: 'contingency',
    label: 'Contingency',
    emoji: '\u{1F9F0}',
    hex: '#6F6F73',
    hint: '5–10% buffer for the unknown unknowns…',
    missingHint:
      'Every project needs a buffer. 10% of your current total is a safe starting point.',
  },
  {
    id: 'profit',
    label: 'Profit margin',
    emoji: '\u{1F4B5}',
    hex: '#1D9E75',
    hint: 'What you actually take home after costs…',
    missingHint:
      'You’re running a business — bake in 10–20% profit on top of all costs.',
  },
];

// ─── State pill palette ───────────────────────────────────────────────────

const STATE_META: Record<
  BudgetState,
  { label: string; emoji: string; bg: string; fg: string; border: string }
> = {
  pending: {
    label: 'Pending',
    emoji: '\u{23F3}',
    bg: '#F4F0E6',
    fg: '#6F6F73',
    border: '#C9C3B3',
  },
  estimated: {
    label: 'Estimated',
    emoji: '\u{1F4DD}',
    bg: '#FFF3E0',
    fg: '#E65100',
    border: '#FFD3A8',
  },
  'locked-in': {
    label: 'Locked-in',
    emoji: '\u{1F512}',
    bg: '#E8F5E9',
    fg: '#1D9E75',
    border: '#9FD9BB',
  },
  paid: {
    label: 'Paid',
    emoji: '\u{1F4B8}',
    bg: '#E3F2FD',
    fg: '#1565C0',
    border: '#A5C9EC',
  },
};

const STATE_ORDER: BudgetState[] = ['pending', 'estimated', 'locked-in', 'paid'];

// ─── Demo palette (W8 lock — matches CompassWorkflowNav) ─────────────────

const PAL = {
  navy: colors.navy,
  navyDeep: colors.navyDeep,
  trace: colors.trace,
  brass: colors.brass,
  fadedRule: colors.fadedRule,
  graphite: colors.graphite,
  white: colors.paper.white,
  cream: colors.paper.cream,
  warm: colors.paper.warm,
  orange: colors.orange,
  redline: colors.redline,
  green: '#1D9E75',
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatUSD(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '$0';
  const rounded = Math.round(n);
  if (Math.abs(rounded) >= 1_000_000) {
    return `$${(rounded / 1_000_000).toFixed(rounded % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  return `$${rounded.toLocaleString('en-US')}`;
}

function nextState(s: BudgetState): BudgetState {
  const idx = STATE_ORDER.indexOf(s);
  return STATE_ORDER[(idx + 1) % STATE_ORDER.length];
}

function nowIso(): string {
  return new Date().toISOString();
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Cheap fallback so we don't blow up under jsdom or older runtimes.
  return `bgt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function storageKeyFor(projectId: string | null): string {
  return `bkg-budget-${projectId ?? 'anonymous'}`;
}

// 2026-05-22 (DATA+DEMO fix): readLines now delegates to
// `normalizeStoredLines` in ./budget-storage, which accepts BOTH the legacy
// bare-`BudgetLine[]` shape AND the `{ lines: BudgetLine[] }` envelope that
// EstimatingClient writes during the AI-handoff push. Previously the
// envelope path silently dropped to `[]`. Helper is split out so the unit
// test (./__tests__/normalizeStoredLines.test.ts) doesn't drag in the full
// BudgetClient module graph.
function readLines(projectId: string | null): BudgetLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKeyFor(projectId));
    if (!raw) return [];
    return normalizeStoredLines(JSON.parse(raw)) as BudgetLine[];
  } catch {
    return [];
  }
}

function writeLines(projectId: string | null, lines: BudgetLine[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      storageKeyFor(projectId),
      JSON.stringify(lines),
    );
  } catch {
    // Quota exceeded or storage disabled — silently no-op for the demo.
  }
}

// ─── DB persistence (Ship 25) ────────────────────────────────────────────
// Ship 25 (2026-05-19): project_budgets JSONB column on command_center_projects
// is now the source of truth for /killerapp/budget. localStorage stays as the
// offline / anonymous fallback. Same authedFetch pattern as
// useProjectWorkflowState — bearer token from the supabase session.

async function authedFetchJSON(input: RequestInfo, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers });
}

/**
 * Fetch the persisted budget lines for a project. Returns:
 *   - { lines: BudgetLine[] } when the project has budget rows
 *   - { lines: [] }           when no rows exist (NEW project, needs seed)
 *   - null                    on auth/network failure (caller falls back to localStorage)
 *
 * 2026-05-22 (BUDGET+SEC2 fix): switched from
 *   GET /api/v1/projects?id=…  (reads command_center_projects.project_budgets JSONB,
 *                               empty for all 3 demo projects — HeroStrip showed $0)
 * to
 *   GET /api/v1/budget?project_id=…  (synthesizes {summary, items} from the
 *                                     project_budget_lines source of truth that
 *                                     the cockpit BudgetSnapshot already reads).
 * The endpoint emits BudgetItem rows, not BudgetLine rows — we map each
 * `is_estimate: true` item to a BudgetLine so the rest of the UI stays
 * backward-compatible. Items without an `is_estimate` flag are treated as
 * estimated. Actual-spend items (`is_estimate: false`) are skipped because
 * BudgetLine has a single amount field; their value is already rolled into
 * `summary.totalSpent` and surfaced via the HeroStrip.
 */
interface BudgetApiItem {
  id: string;
  category?: string;
  description?: string;
  amount: number;
  vendor?: string;
  date?: string;
  created_at?: string;
  is_estimate?: boolean;
  // BUDGET-WRITE round-3 (2026-05-22): the read route now echoes the
  // source csi_division so we can use it as the upsert key on save.
  csi_division?: string;
}

function mapApiItemToLine(item: BudgetApiItem): BudgetLine | null {
  if (!item || typeof item.amount !== 'number' || !Number.isFinite(item.amount)) {
    return null;
  }
  const created = item.created_at || item.date || nowIso();
  return {
    id: item.id,
    category: item.category || 'materials',
    description: item.description || '',
    amount: item.amount,
    // Source rows don't carry the 4-state lifecycle yet — treat estimates as
    // 'estimated' and actuals as 'paid'. Matches what the user would set
    // manually for a row that's already booked spend.
    state: item.is_estimate === false ? 'paid' : 'estimated',
    vendor: item.vendor,
    createdAt: created,
    updatedAt: created,
    csi_division: item.csi_division,
  };
}

async function fetchProjectBudgets(
  projectId: string,
): Promise<{ lines: BudgetLine[] } | null> {
  try {
    const res = await authedFetchJSON(
      `/api/v1/budget?project_id=${encodeURIComponent(projectId)}`,
    );
    // 404 = no budget lines yet (route's "empty budget" contract). Surface as
    // an empty list so the caller can fall back to localStorage / show the
    // empty-state UI instead of treating it as a network failure.
    if (res.status === 404) return { lines: [] };
    if (!res.ok) return null;
    const json = (await res.json()) as { items?: unknown };
    const raw = json.items;
    if (!Array.isArray(raw)) return { lines: [] };

    // Prefer is_estimate rows (they map 1:1 to BudgetLine). If a project
    // somehow has only actual-spend rows, fall through to those so the
    // HeroStrip still shows real numbers instead of $0.
    const estimateItems = raw.filter(
      (l): l is BudgetApiItem =>
        l != null && typeof l === 'object' && (l as BudgetApiItem).is_estimate === true,
    );
    const source = estimateItems.length > 0 ? estimateItems : (raw as BudgetApiItem[]);
    const lines = source
      .map(mapApiItemToLine)
      .filter((l): l is BudgetLine => l !== null);
    return { lines };
  } catch {
    return null;
  }
}

/**
 * Derive the (project_id, csi_division) upsert key for a BudgetLine. Real
 * seed rows carry a numeric CSI MasterFormat division (e.g. "03"); rows
 * the user creates locally fall back to their stable `id` (a uuid) which
 * is unique within the project so it round-trips as its own division.
 *
 * The synthetic-id case (`<uuid>:estimate`) drops the suffix so the same
 * BudgetLine that came in from a GET maps back to the same DB row on
 * save — otherwise we'd duplicate every seed row on first edit.
 */
function csiKeyFor(line: BudgetLine): string {
  if (line.csi_division && line.csi_division.length > 0) return line.csi_division;
  const id = line.id || '';
  const colonAt = id.indexOf(':');
  return colonAt > 0 ? id.slice(0, colonAt) : id;
}

/**
 * BUDGET-WRITE round-3 (2026-05-22): the JSONB write path
 * (`/api/v1/projects` PATCH with `{ project_budgets: { lines } }`) wrote
 * to a column we already deprecated — user edits never reached the
 * canonical `project_budget_lines` store. This now talks to the unified
 * `/api/v1/budget` PATCH endpoint, which upserts by
 * (project_id, csi_division) and returns a fresh summary.
 *
 * NB: we send the BudgetLine.amount as `budgeted` (the column the read
 * path totals) and keep `committed`/`actual_spent` at 0 because
 * BudgetClient doesn't model those distinctions yet — the row's
 * lifecycle state ('pending'/'estimated'/'locked-in'/'paid') stays
 * client-side. A future "promote to actual" UX would move amount into
 * actual_spent on the 'paid' transition; out of scope here.
 */
async function patchProjectBudgets(
  projectId: string,
  lines: BudgetLine[],
): Promise<boolean> {
  try {
    const payload = {
      project_id: projectId,
      lines: lines.map((l) => ({
        csi_division: csiKeyFor(l),
        description: l.description,
        // Always send the full amount as `budgeted` — that's the column
        // the read-path summary totals across every line. We mirror the
        // 4-state lifecycle into committed/actual_spent so dashboards
        // that read those columns directly see meaningful values, while
        // leaving `budgeted` as the stable baseline. Replace mode is OFF
        // by default so a save can't wipe rows another tab just added.
        budgeted: l.amount,
        committed: l.state === 'locked-in' || l.state === 'paid' ? l.amount : 0,
        actual_spent: l.state === 'paid' ? l.amount : 0,
      })),
    };
    const res = await authedFetchJSON('/api/v1/budget', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Small UI atoms ───────────────────────────────────────────────────────

function StateChip({
  state,
  onCycle,
  small = false,
}: {
  state: BudgetState;
  onCycle?: () => void;
  small?: boolean;
}) {
  const meta = STATE_META[state];
  const [snap, setSnap] = useState(false);
  const handleClick = () => {
    if (!onCycle) return;
    setSnap(true);
    onCycle();
    window.setTimeout(() => setSnap(false), 220);
  };
  return (
    <button
      type="button"
      onClick={onCycle ? handleClick : undefined}
      aria-label={`Status: ${meta.label}. Click to cycle.`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: small ? '2px 8px' : '4px 10px',
        fontSize: small ? 11 : 12,
        fontWeight: fontWeights.semibold,
        background: meta.bg,
        color: meta.fg,
        border: `1px solid ${meta.border}`,
        borderRadius: radii.full,
        cursor: onCycle ? 'pointer' : 'default',
        fontFamily: 'inherit',
        transform: snap ? 'scale(0.92)' : 'scale(1)',
        transition: `transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1), background ${transitions.fast}`,
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden style={{ fontSize: small ? 10 : 11 }}>{meta.emoji}</span>
      {meta.label}
    </button>
  );
}

function CategoryDot({ hex, size = 12 }: { hex: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: hex,
        boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.12)',
        flexShrink: 0,
      }}
    />
  );
}

function MiniProgress({
  locked,
  estimated,
  pending,
  hex,
}: {
  locked: number;
  estimated: number;
  pending: number;
  hex: string;
}) {
  const total = Math.max(1, locked + estimated + pending);
  const lockedPct = (locked / total) * 100;
  const estPct = (estimated / total) * 100;
  // pending fills the remainder of the bar visually (outlined empty cell).
  return (
    <div
      role="img"
      aria-label={`Locked-in ${formatUSD(locked)}, estimated ${formatUSD(estimated)}, pending ${formatUSD(pending)}`}
      style={{
        position: 'relative',
        width: '100%',
        height: 8,
        borderRadius: radii.full,
        border: `1px solid ${PAL.fadedRule}`,
        background: PAL.cream,
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      <div
        style={{
          width: `${lockedPct}%`,
          background: hex,
          height: '100%',
        }}
      />
      <div
        style={{
          width: `${estPct}%`,
          height: '100%',
          backgroundImage: `repeating-linear-gradient(45deg, ${hex} 0 4px, ${hex}55 4px 8px)`,
        }}
      />
    </div>
  );
}

// ─── Hero strip ───────────────────────────────────────────────────────────

interface HeroProps {
  projectName: string;
  jurisdiction: string | null;
  total: number;
  rangeLow: number | null;
  rangeHigh: number | null;
  // COCKPIT-FIXES Pain 1 (2026-05-22): pass-through so the HeroStrip can
  // render a live, derived $/sf next to the cost range. Authoritative
  // source for the badge is cost range ÷ sqft — keeps the AI summary,
  // banner, and HeroStrip all telling the same story.
  sqft: number | string | null;
  savedSecondsAgo: number;
}

function HeroStrip({
  projectName,
  jurisdiction,
  total,
  rangeLow,
  rangeHigh,
  sqft,
  savedSecondsAgo,
}: HeroProps) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 48,
        zIndex: 50,
        background: PAL.trace,
        borderBottom: `1px solid ${PAL.fadedRule}`,
        padding: '16px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Left: project + total */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: fontWeights.semibold,
              letterSpacing: letterSpacing.technical,
              textTransform: 'uppercase',
              color: PAL.brass,
            }}
          >
            Budget &amp; estimating
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 22,
                fontWeight: fontWeights.semibold,
                color: PAL.navy,
              }}
            >
              {projectName}
            </span>
            {jurisdiction && (
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: PAL.graphite,
                  opacity: 0.7,
                }}
              >
                {jurisdiction}
              </span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 14,
              marginTop: 4,
            }}
          >
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 40,
                fontWeight: fontWeights.bold,
                color: PAL.navyDeep,
                lineHeight: 1,
                letterSpacing: letterSpacing.tight,
              }}
            >
              {formatUSD(total)}
            </span>
            {rangeLow != null && rangeHigh != null && (rangeLow > 0 || rangeHigh > 0) && (
              <span
                style={{
                  fontSize: 13,
                  color: PAL.graphite,
                  opacity: 0.7,
                  fontFamily: fonts.mono,
                }}
                title="Estimate range from the AI project setup"
              >
                est. {formatUSD(rangeLow)}–{formatUSD(rangeHigh)}
              </span>
            )}
            {/* Derived $/sf — sourced from rangeLow/High ÷ sqft so the prose,
                cockpit, banner, and HeroStrip all agree. */}
            <CostPerSquareFootBadge
              costLow={rangeLow}
              costHigh={rangeHigh}
              sqft={sqft}
            />
          </div>
        </div>

        {/* Right: legend + saved */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            {STATE_ORDER.map((s) => (
              <StateChip key={s} state={s} small />
            ))}
          </div>
          <div
            style={{
              fontSize: 11,
              color: PAL.graphite,
              opacity: 0.65,
              fontFamily: fonts.mono,
            }}
          >
            Snapshot saved · {savedSecondsAgo < 5 ? 'just now' : `${savedSecondsAgo}s ago`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stacked horizontal bar (top of grid) ─────────────────────────────────

function StackedBar({
  totalsByCategory,
  grandTotal,
}: {
  totalsByCategory: Map<string, number>;
  grandTotal: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const segments = CATEGORIES.filter((c) => (totalsByCategory.get(c.id) ?? 0) > 0);

  if (segments.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: 24,
          background: PAL.cream,
          border: `1px dashed ${PAL.fadedRule}`,
          borderRadius: radii.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: PAL.graphite,
          opacity: 0.55,
          fontFamily: fonts.mono,
        }}
      >
        Your category breakdown will fill in here as you add line items.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: 24,
          borderRadius: radii.md,
          overflow: 'hidden',
          border: `1px solid ${PAL.fadedRule}`,
          background: PAL.cream,
        }}
      >
        {segments.map((cat) => {
          const amt = totalsByCategory.get(cat.id) ?? 0;
          const pct = (amt / grandTotal) * 100;
          const isHovered = hovered === cat.id;
          return (
            <div
              key={cat.id}
              onMouseEnter={() => setHovered(cat.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: `${pct}%`,
                background: cat.hex,
                cursor: 'pointer',
                position: 'relative',
                transition: `filter ${transitions.fast}`,
                filter: isHovered ? 'brightness(1.08)' : 'brightness(1)',
                borderRight: '1px solid rgba(255,255,255,0.18)',
              }}
              title={`${cat.label}: ${formatUSD(amt)} (${pct.toFixed(0)}%)`}
              aria-label={`${cat.label}: ${formatUSD(amt)}, ${pct.toFixed(0)} percent`}
            >
              {isHovered && (
                <div
                  role="tooltip"
                  style={{
                    position: 'absolute',
                    bottom: 30,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: PAL.navyDeep,
                    color: PAL.white,
                    padding: '6px 10px',
                    borderRadius: radii.md,
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 60,
                    fontFamily: fonts.mono,
                    boxShadow: shadows.md,
                  }}
                >
                  <strong>{cat.label}</strong> · {formatUSD(amt)} · {pct.toFixed(0)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Line-item table (inside expanded card) ───────────────────────────────

interface LineRowProps {
  line: BudgetLine;
  categoryHex: string;
  onUpdate: (patch: Partial<BudgetLine>) => void;
  onDelete: () => void;
  onCycleState: () => void;
}

function LineRow({ line, categoryHex, onUpdate, onDelete, onCycleState }: LineRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const inputStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '6px 8px',
    fontSize: 12,
    fontFamily: 'inherit',
    color: PAL.graphite,
    background: PAL.white,
    border: `1px solid ${PAL.fadedRule}`,
    borderRadius: radii.sm,
    outline: 'none',
  };

  return (
    <tr style={{ borderBottom: `1px solid ${PAL.fadedRule}` }}>
      <td style={{ padding: '8px 8px 8px 0', verticalAlign: 'top' }}>
        <input
          type="text"
          value={line.description}
          placeholder="e.g., 20 yards concrete for foundation"
          onChange={(e) => onUpdate({ description: e.target.value })}
          style={{ ...inputStyle, borderLeft: `3px solid ${categoryHex}` }}
        />
      </td>
      <td style={{ padding: '8px', verticalAlign: 'top', width: 110 }}>
        <input
          type="number"
          min={0}
          step={1}
          value={line.amount || ''}
          placeholder="0"
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onUpdate({ amount: Number.isFinite(v) && v >= 0 ? v : 0 });
          }}
          style={{ ...inputStyle, textAlign: 'right', fontFamily: fonts.mono }}
        />
      </td>
      <td style={{ padding: '8px', verticalAlign: 'top', width: 124 }}>
        <StateChip state={line.state} onCycle={onCycleState} small />
      </td>
      <td style={{ padding: '8px', verticalAlign: 'top', width: 150 }}>
        <input
          type="text"
          value={line.vendor ?? ''}
          placeholder="Vendor (optional)"
          onChange={(e) => onUpdate({ vendor: e.target.value })}
          style={inputStyle}
        />
      </td>
      <td style={{ padding: '8px', verticalAlign: 'top', width: 140 }}>
        <input
          type="date"
          value={line.dueDate ?? ''}
          onChange={(e) => onUpdate({ dueDate: e.target.value || undefined })}
          style={inputStyle}
        />
      </td>
      <td style={{ padding: '8px', verticalAlign: 'top' }}>
        <input
          type="text"
          value={line.notes ?? ''}
          placeholder="Notes"
          onChange={(e) => onUpdate({ notes: e.target.value })}
          style={inputStyle}
        />
      </td>
      <td style={{ padding: '8px 0 8px 8px', verticalAlign: 'top', width: 32 }}>
        <button
          type="button"
          aria-label={confirmDelete ? 'Confirm delete line' : 'Delete line'}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              window.setTimeout(() => setConfirmDelete(false), 2400);
              return;
            }
            onDelete();
          }}
          style={{
            background: confirmDelete ? PAL.redline : 'transparent',
            color: confirmDelete ? PAL.white : PAL.graphite,
            border: `1px solid ${confirmDelete ? PAL.redline : PAL.fadedRule}`,
            borderRadius: radii.sm,
            width: 28,
            height: 28,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: `background ${transitions.fast}`,
          }}
          title={confirmDelete ? 'Click again to confirm' : 'Delete'}
        >
          {confirmDelete ? '!' : '×'}
        </button>
      </td>
    </tr>
  );
}

// ─── Category card ────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: CategoryDef;
  lines: BudgetLine[];
  expanded: boolean;
  glow: boolean;
  onToggle: () => void;
  onAddLine: () => void;
  onUpdateLine: (id: string, patch: Partial<BudgetLine>) => void;
  onDeleteLine: (id: string) => void;
  onCycleState: (id: string) => void;
  savedSecondsAgo: number;
}

function CategoryCard({
  category,
  lines,
  expanded,
  glow,
  onToggle,
  onAddLine,
  onUpdateLine,
  onDeleteLine,
  onCycleState,
  savedSecondsAgo,
}: CategoryCardProps) {
  const [hover, setHover] = useState(false);
  const totals = useMemo(() => {
    let total = 0;
    let locked = 0;
    let estimated = 0;
    let pending = 0;
    for (const l of lines) {
      total += l.amount;
      if (l.state === 'locked-in' || l.state === 'paid') locked += l.amount;
      else if (l.state === 'estimated') estimated += l.amount;
      else pending += l.amount;
    }
    return { total, locked, estimated, pending };
  }, [lines]);

  const cardBorder = glow
    ? `2px solid ${PAL.green}`
    : `1px solid ${PAL.fadedRule}`;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: PAL.white,
        border: cardBorder,
        borderRadius: radii.lg,
        boxShadow: glow
          ? `0 0 0 4px ${PAL.green}22, ${shadows.md}`
          : hover && !expanded
            ? shadows.lg
            : shadows.sm,
        transform: hover && !expanded ? 'translateY(-2px)' : 'translateY(0)',
        transition: `transform ${transitions.base}, box-shadow ${transitions.base}, border ${transitions.slow}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Card header — clickable */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${category.label}`}
        style={{
          all: 'unset',
          cursor: 'pointer',
          padding: '14px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <CategoryDot hex={category.hex} size={14} />
            <span
              style={{
                fontSize: 13,
                fontWeight: fontWeights.semibold,
                color: PAL.navy,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {category.emoji} {category.label}
            </span>
          </div>
          <span
            aria-hidden
            style={{
              fontSize: 14,
              color: PAL.graphite,
              opacity: 0.5,
              transition: `transform ${transitions.base}`,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▾
          </span>
        </div>

        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 28,
            fontWeight: fontWeights.bold,
            color: PAL.navyDeep,
            lineHeight: 1.05,
          }}
        >
          {formatUSD(totals.total)}
        </div>

        <MiniProgress
          locked={totals.locked}
          estimated={totals.estimated}
          pending={totals.pending}
          hex={category.hex}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: PAL.graphite,
            opacity: 0.75,
            fontFamily: fonts.mono,
          }}
        >
          <span>
            {lines.length === 0
              ? 'No line items yet'
              : `${lines.length} line item${lines.length === 1 ? '' : 's'}`}
          </span>
          {totals.locked > 0 && (
            <span style={{ color: PAL.green, fontWeight: fontWeights.semibold }}>
              {formatUSD(totals.locked)} locked
            </span>
          )}
        </div>
      </button>

      {/* Empty-state hint OR "what's missing" prompt */}
      {lines.length === 0 && (
        <div
          style={{
            padding: '0 16px 12px',
            fontSize: 11,
            color: PAL.graphite,
            opacity: 0.7,
            fontFamily: fonts.mono,
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}
        >
          {expanded ? category.hint : category.missingHint}
        </div>
      )}

      {/* Expanded line-item sheet */}
      {expanded && (
        <div
          style={{
            background: PAL.trace,
            borderTop: `1px solid ${PAL.fadedRule}`,
            padding: '12px 16px 14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: letterSpacing.technical,
                textTransform: 'uppercase',
                fontWeight: fontWeights.semibold,
                color: PAL.brass,
              }}
            >
              Line items
            </div>
            <div
              style={{
                fontSize: 10,
                color: PAL.graphite,
                opacity: 0.65,
                fontFamily: fonts.mono,
              }}
            >
              Saved {savedSecondsAgo < 5 ? 'just now' : `${savedSecondsAgo}s ago`}
            </div>
          </div>

          {lines.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                  minWidth: 720,
                }}
              >
                <thead>
                  <tr
                    style={{
                      textAlign: 'left',
                      fontSize: 10,
                      letterSpacing: letterSpacing.wide,
                      textTransform: 'uppercase',
                      color: PAL.graphite,
                      opacity: 0.65,
                    }}
                  >
                    <th style={{ padding: '6px 8px 6px 0', fontWeight: fontWeights.semibold }}>Description</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: fontWeights.semibold }}>Amount</th>
                    <th style={{ padding: '6px 8px', fontWeight: fontWeights.semibold }}>Status</th>
                    <th style={{ padding: '6px 8px', fontWeight: fontWeights.semibold }}>Vendor</th>
                    <th style={{ padding: '6px 8px', fontWeight: fontWeights.semibold }}>Due</th>
                    <th style={{ padding: '6px 8px', fontWeight: fontWeights.semibold }}>Notes</th>
                    <th style={{ padding: '6px 0 6px 8px' }} />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <LineRow
                      key={line.id}
                      line={line}
                      categoryHex={category.hex}
                      onUpdate={(patch) => onUpdateLine(line.id, patch)}
                      onDelete={() => onDeleteLine(line.id)}
                      onCycleState={() => onCycleState(line.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddLine();
            }}
            style={{
              marginTop: 10,
              padding: '8px 14px',
              background: PAL.navyDeep,
              color: PAL.white,
              border: 'none',
              borderRadius: radii.md,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: fontWeights.semibold,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: `transform ${transitions.fast}, background ${transitions.fast}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.background = PAL.navy;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = PAL.navyDeep;
            }}
          >
            <span aria-hidden>+</span> Add a line
          </button>
        </div>
      )}

      {/* Sticky bottom "Add a line" button when collapsed (per spec: always present) */}
      {!expanded && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddLine();
          }}
          style={{
            margin: '0 16px 14px',
            padding: '8px 12px',
            background: 'transparent',
            color: category.hex,
            border: `1px dashed ${category.hex}`,
            borderRadius: radii.md,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: fontWeights.semibold,
            transition: `background ${transitions.fast}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${category.hex}10`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          + Add a line
        </button>
      )}
    </div>
  );
}

// ─── Cash flow strip ──────────────────────────────────────────────────────

// Ship 31: real date-axis cash flow strip.
// Project lifecycle fields (start_date / milestone_date / created_at) are not
// on the typed ProjectRecord today, so we read them defensively via a
// permissive shape rather than tightening the central type for the demo.
type ProjectLifecycleFields = {
  start_date?: string | null;
  milestone_date?: string | null;
  created_at?: string | null;
};

// Categories whose lines represent money coming IN (inbound payments).
// Per Ship 31 brief: profit margin + contingency tag as inbound; everything
// else with a due date — including client-payment lines — stays outbound for
// now since we don't have a dedicated client-payment category yet.
const INBOUND_CATEGORIES = new Set(['profit', 'contingency']);

// Stage fractions across project span (Ship 31): Lock=0.20, Build=0.45,
// Adapt=0.70, Collect=0.92.
const STAGE_FRACTIONS: { id: string; label: string; frac: number }[] = [
  { id: 'lock', label: 'Lock', frac: 0.2 },
  { id: 'build', label: 'Build', frac: 0.45 },
  { id: 'adapt', label: 'Adapt', frac: 0.7 },
  { id: 'collect', label: 'Collect', frac: 0.92 },
];

function parseDateMs(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function formatMonthShort(ms: number): string {
  const d = new Date(ms);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const yy = String(d.getFullYear()).slice(-2);
  return `${month} ${yy}`;
}

function formatDueShort(s: string): string {
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return s;
  const d = new Date(t);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

interface CashFlowStripProps {
  lines: BudgetLine[];
  project: (ProjectLifecycleFields & { id?: string }) | null;
}

function CashFlowStrip({ lines, project }: CashFlowStripProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 1. Compute date range with documented fallbacks.
  const nowMs = Date.now();
  const startMs =
    parseDateMs(project?.start_date) ??
    parseDateMs(project?.created_at) ??
    nowMs;
  const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;
  const endMsRaw =
    parseDateMs(project?.milestone_date) ?? startMs + TWELVE_MONTHS_MS;
  // Guard against degenerate or reversed ranges.
  const endMs = endMsRaw > startMs ? endMsRaw : startMs + TWELVE_MONTHS_MS;
  const span = endMs - startMs;

  const xPctForMs = (ms: number): number => {
    const raw = (ms - startMs) / span;
    return Math.max(0, Math.min(1, raw)) * 100;
  };

  // 2. Axis ticks — 4 evenly-spaced month markers across the strip.
  const monthTicks = [0.1, 0.37, 0.63, 0.9].map((frac) => {
    const ms = startMs + span * frac;
    return { pct: frac * 100, label: formatMonthShort(ms) };
  });

  // Stage markers anchored to estimated dates.
  const stageMarkers = STAGE_FRACTIONS.map((s) => ({
    id: s.id,
    label: s.label,
    pct: s.frac * 100,
  }));

  // "Now" marker — clipped if outside [start, end].
  const nowPct = xPctForMs(nowMs);
  const nowInRange = nowMs >= startMs && nowMs <= endMs;

  // 3. Bucket items: dated → date-axis lane, undated → "Unscheduled" lane.
  const datedLines = lines.filter((l) => {
    if (!l.dueDate || l.amount <= 0) return false;
    return parseDateMs(l.dueDate) != null;
  });
  const undatedLines = lines.filter(
    (l) => !l.dueDate && l.amount > 0,
  );

  // Pre-compute x positions and direction for each dated line, then cluster
  // items whose positions are within 2% of one another vertically.
  type Placed = {
    line: BudgetLine;
    pct: number;
    isOutbound: boolean;
    yOffsetPx: number;
  };
  const placedSorted = [...datedLines]
    .map<Omit<Placed, 'yOffsetPx'>>((l) => {
      const ms = parseDateMs(l.dueDate)!;
      const isOutbound = !INBOUND_CATEGORIES.has(l.category);
      return { line: l, pct: xPctForMs(ms), isOutbound };
    })
    .sort((a, b) => a.pct - b.pct);

  // Cluster logic: when two arrows fall within 2% of axis width on the same
  // side (outbound vs inbound), nudge each successive one down by 8px.
  const CLUSTER_THRESHOLD_PCT = 2;
  const CLUSTER_OFFSET_PX = 8;
  let lastOutPct = -Infinity;
  let lastInPct = -Infinity;
  let outRun = 0;
  let inRun = 0;
  const placed: Placed[] = placedSorted.map((p) => {
    if (p.isOutbound) {
      if (p.pct - lastOutPct < CLUSTER_THRESHOLD_PCT) {
        outRun += 1;
      } else {
        outRun = 0;
      }
      lastOutPct = p.pct;
      return { ...p, yOffsetPx: outRun * CLUSTER_OFFSET_PX };
    }
    if (p.pct - lastInPct < CLUSTER_THRESHOLD_PCT) {
      inRun += 1;
    } else {
      inRun = 0;
    }
    lastInPct = p.pct;
    return { ...p, yOffsetPx: inRun * CLUSTER_OFFSET_PX };
  });

  const totalItems = datedLines.length + undatedLines.length;

  return (
    <section
      style={{
        marginTop: 32,
        background: PAL.white,
        border: `1px solid ${PAL.fadedRule}`,
        borderRadius: radii.lg,
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: letterSpacing.technical,
              textTransform: 'uppercase',
              fontWeight: fontWeights.semibold,
              color: PAL.brass,
            }}
          >
            Cash flow
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 18,
              fontWeight: fontWeights.semibold,
              color: PAL.navy,
              marginTop: 2,
            }}
          >
            When bills go out, when payments come in
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 14,
            fontSize: 11,
            color: PAL.graphite,
            opacity: 0.75,
            fontFamily: fonts.mono,
          }}
        >
          <span>
            <span style={{ color: PAL.redline }}>↓</span> Bill out
          </span>
          <span>
            <span style={{ color: PAL.green }}>↑</span> Payment in
          </span>
        </div>
      </div>

      {/* The lane (date axis) */}
      <div
        style={{
          position: 'relative',
          height: 120,
          marginTop: 14,
          background: PAL.cream,
          borderRadius: radii.md,
          border: `1px dashed ${PAL.fadedRule}`,
          overflow: 'hidden',
        }}
      >
        {/* Center rule (the axis itself) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 2,
            background: PAL.brass,
            opacity: 0.6,
          }}
        />

        {/* Month ticks (Aug 26 / Nov 26 / Feb 27 / May 27 etc.) */}
        {monthTicks.map((t, i) => (
          <div
            key={`tick-${i}`}
            style={{
              position: 'absolute',
              bottom: 4,
              left: `${t.pct}%`,
              transform: 'translateX(-50%)',
              fontSize: 9,
              fontFamily: fonts.mono,
              color: PAL.graphite,
              opacity: 0.55,
              pointerEvents: 'none',
            }}
          >
            {t.label}
          </div>
        ))}

        {/* Stage markers */}
        {stageMarkers.map((s) => (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${s.pct}%`,
              width: 1,
              background: PAL.brass,
              opacity: 0.35,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: -2,
                left: -22,
                width: 44,
                textAlign: 'center',
                fontSize: 10,
                letterSpacing: letterSpacing.wide,
                textTransform: 'uppercase',
                fontWeight: fontWeights.semibold,
                color: PAL.brass,
              }}
            >
              {s.label}
            </span>
          </div>
        ))}

        {/* "Now" marker — 12px brass diamond on the center axis. */}
        {nowInRange && (
          <div
            aria-label="Today"
            title={`Today · ${formatDueShort(new Date(nowMs).toISOString())}`}
            style={{
              position: 'absolute',
              top: 'calc(50% - 6px)',
              left: `${nowPct}%`,
              width: 12,
              height: 12,
              background: PAL.brass,
              transform: 'translateX(-50%) rotate(45deg)',
              borderRadius: 2,
              boxShadow: '0 0 0 2px rgba(255,255,255,0.85)',
              zIndex: 2,
            }}
          />
        )}

        {/* Empty state — preserved copy. */}
        {totalItems === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: PAL.graphite,
              opacity: 0.6,
              textAlign: 'center',
              padding: '0 24px',
              fontStyle: 'italic',
            }}
          >
            Add a line item with a due date or expected payment to see your cash flow appear here.
          </div>
        )}

        {/* Arrows positioned on the real date axis. */}
        {placed.map(({ line: l, pct, isOutbound, yOffsetPx }) => {
          const color = isOutbound ? PAL.redline : PAL.green;
          const arrow = isOutbound ? '↓' : '↑';
          const cat = CATEGORIES.find((c) => c.id === l.category);
          const isHovered = hoveredId === l.id;
          const wrapperStyle: CSSProperties = isOutbound
            ? {
                position: 'absolute',
                bottom: 8 + yOffsetPx,
                left: `${pct}%`,
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                zIndex: isHovered ? 5 : 1,
              }
            : {
                position: 'absolute',
                top: 8 + yOffsetPx,
                left: `${pct}%`,
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                zIndex: isHovered ? 5 : 1,
              };
          return (
            <div
              key={l.id}
              onMouseEnter={() => setHoveredId(l.id)}
              onMouseLeave={() => setHoveredId((cur) => (cur === l.id ? null : cur))}
              style={wrapperStyle}
            >
              <span
                style={{
                  fontSize: 18,
                  color,
                  fontWeight: fontWeights.bold,
                  lineHeight: 1,
                }}
              >
                {arrow}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: PAL.graphite,
                  fontFamily: fonts.mono,
                  whiteSpace: 'nowrap',
                  background: PAL.white,
                  padding: '1px 5px',
                  borderRadius: radii.sm,
                  border: `1px solid ${PAL.fadedRule}`,
                }}
              >
                {formatUSD(l.amount)}
              </span>
              {isHovered && (
                <div
                  role="tooltip"
                  style={{
                    position: 'absolute',
                    [isOutbound ? 'bottom' : 'top']: 38,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: PAL.navyDeep,
                    color: PAL.white,
                    padding: '6px 10px',
                    borderRadius: radii.md,
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 60,
                    fontFamily: fonts.mono,
                    boxShadow: shadows.md,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {cat && <CategoryDot hex={cat.hex} size={8} />}
                  <span>
                    {l.description || 'Untitled'} · {formatUSD(l.amount)}
                    {l.dueDate ? ` · ${formatDueShort(l.dueDate)}` : ''}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unscheduled lane (Ship 31): items without a dueDate live here so users
          can see them and drag a date on later. */}
      {undatedLines.length > 0 && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            background: PAL.trace,
            border: `1px dashed ${PAL.fadedRule}`,
            borderRadius: radii.md,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: fonts.mono,
              color: PAL.graphite,
              opacity: 0.7,
              marginBottom: 6,
              letterSpacing: letterSpacing.wide,
              textTransform: 'uppercase',
            }}
          >
            Unscheduled — no date yet — drop one to place it on the timeline
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {undatedLines.map((l) => {
              const cat = CATEGORIES.find((c) => c.id === l.category);
              const isOutbound = !INBOUND_CATEGORIES.has(l.category);
              return (
                <span
                  key={l.id}
                  title={`${l.description || 'Untitled'} · ${formatUSD(l.amount)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 8px',
                    background: PAL.white,
                    border: `1px solid ${PAL.fadedRule}`,
                    borderRadius: radii.full,
                    fontSize: 11,
                    color: PAL.graphite,
                    fontFamily: fonts.mono,
                  }}
                >
                  {cat && <CategoryDot hex={cat.hex} size={8} />}
                  <span style={{ color: isOutbound ? PAL.redline : PAL.green }}>
                    {isOutbound ? '↓' : '↑'}
                  </span>
                  <span>{l.description || 'Untitled'}</span>
                  <span style={{ opacity: 0.7 }}>· {formatUSD(l.amount)}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Empty-state hero (no line items yet) ─────────────────────────────────

function EmptyHero({ onSeedCategory }: { onSeedCategory: (id: string) => void }) {
  const QUICK_STARTS = ['materials', 'labor', 'subcontractors'] as const;
  return (
    <div
      style={{
        background: PAL.white,
        border: `1px solid ${PAL.fadedRule}`,
        borderRadius: radii.lg,
        padding: '40px 28px',
        textAlign: 'center',
        boxShadow: shadows.sm,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: letterSpacing.technical,
          textTransform: 'uppercase',
          fontWeight: fontWeights.semibold,
          color: PAL.brass,
          marginBottom: 6,
        }}
      >
        Let’s build your budget
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 30,
          fontWeight: fontWeights.bold,
          color: PAL.navyDeep,
          marginBottom: 8,
          letterSpacing: letterSpacing.tight,
        }}
      >
        Start your first budget category
      </div>
      <div
        style={{
          fontSize: 14,
          color: PAL.graphite,
          opacity: 0.75,
          maxWidth: 540,
          margin: '0 auto 24px',
          lineHeight: 1.55,
        }}
      >
        Pick where your money usually goes first. We’ll open the card and let you
        drop in your first line item — even a rough number is better than no number.
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {QUICK_STARTS.map((id) => {
          const cat = CATEGORIES.find((c) => c.id === id);
          if (!cat) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSeedCategory(id)}
              style={{
                padding: '14px 22px',
                background: PAL.white,
                color: PAL.navy,
                border: `2px solid ${cat.hex}`,
                borderRadius: radii.lg,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: fontWeights.semibold,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 180,
                justifyContent: 'center',
                transition: `transform ${transitions.fast}, box-shadow ${transitions.fast}, background ${transitions.fast}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = `${cat.hex}10`;
                e.currentTarget.style.boxShadow = shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = PAL.white;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <CategoryDot hex={cat.hex} size={14} />
              {cat.emoji} {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tour cue (dismissable) ──────────────────────────────────────────────

const TOUR_DISMISS_KEY = 'bkg-budget-tour-dismissed';

function TourCue() {
  // Start hidden on first render to keep SSR/CSR markup identical, then
  // promote to visible in an effect after we read localStorage. This is
  // the same pattern used elsewhere in /killerapp (CompassWorkflowNav,
  // useSavedProjectName) and intentionally accepts the lint warning to
  // avoid a hydration mismatch on the demo build.
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage.getItem(TOUR_DISMISS_KEY) !== '1') {
        setShow(true);
      }
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  return (
    <div
      role="note"
      style={{
        background: '#FFF8E1',
        border: `1px solid #FFD54F`,
        borderRadius: radii.md,
        padding: '10px 14px',
        fontSize: 12,
        color: '#5D4037',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <span aria-hidden style={{ fontSize: 16, lineHeight: 1.2 }}>{'\u{1F4A1}'}</span>
      <div style={{ flex: 1, lineHeight: 1.5 }}>
        <strong>Tip:</strong> click any category card to add line items. Use the
        status chip to cycle a line through <em>Pending → Estimated → Locked-in → Paid</em>{' '}
        as you go.
      </div>
      <button
        type="button"
        onClick={() => {
          setShow(false);
          try {
            window.localStorage.setItem(TOUR_DISMISS_KEY, '1');
          } catch {
            // ignore
          }
        }}
        aria-label="Dismiss tip"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          color: '#5D4037',
          opacity: 0.6,
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Help strip ──────────────────────────────────────────────────────────

function HelpStrip({ projectId }: { projectId: string | null }) {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  const projectQuery = projectId ? `?project=${encodeURIComponent(projectId)}` : '';

  const openLastProjectBudget = () => {
    if (typeof window === 'undefined') return;
    try {
      const lastId = window.localStorage.getItem('bkg-active-project');
      if (lastId) {
        window.location.href = `/killerapp/budget?project=${encodeURIComponent(lastId)}`;
        return;
      }
    } catch {
      // fall through
    }
    showToast('No previous project budget found yet.');
  };

  return (
    <section
      style={{
        marginTop: 32,
        background: PAL.trace,
        border: `1px solid ${PAL.fadedRule}`,
        borderRadius: radii.lg,
        padding: 20,
        position: 'relative',
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 16,
          fontWeight: fontWeights.semibold,
          color: PAL.navy,
          marginBottom: 12,
        }}
      >
        Need help getting started?
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Link
          href={`/killerapp/workflows/estimating${projectQuery}`}
          style={{
            padding: '10px 14px',
            background: PAL.navyDeep,
            color: PAL.white,
            border: 'none',
            borderRadius: radii.md,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: fontWeights.semibold,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {'\u{2728}'} Let AI estimate this for me
        </Link>
        <button
          type="button"
          onClick={() => showToast('Templates coming soon — Single-family, ADU, Commercial.')}
          style={{
            padding: '10px 14px',
            background: PAL.white,
            color: PAL.navy,
            border: `1px solid ${PAL.fadedRule}`,
            borderRadius: radii.md,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: fontWeights.semibold,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {'\u{1F4CB}'} Copy a template
        </button>
        <button
          type="button"
          onClick={openLastProjectBudget}
          style={{
            padding: '10px 14px',
            background: PAL.white,
            color: PAL.navy,
            border: `1px solid ${PAL.fadedRule}`,
            borderRadius: radii.md,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: fontWeights.semibold,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {'\u{1F4C2}'} Open my last project’s budget
        </button>
      </div>

      {toast && (
        <div
          role="status"
          style={{
            position: 'absolute',
            bottom: -50,
            left: '50%',
            transform: 'translateX(-50%)',
            background: PAL.navyDeep,
            color: PAL.white,
            padding: '8px 14px',
            borderRadius: radii.md,
            fontSize: 12,
            boxShadow: shadows.md,
            animation: 'bkg-toast-in 200ms ease-out',
            zIndex: 80,
          }}
        >
          {toast}
        </div>
      )}
    </section>
  );
}

// ─── Main client component ───────────────────────────────────────────────

export default function BudgetClient() {
  const { project, projectId, loading } = useProject();

  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [glowCards, setGlowCards] = useState<Set<string>>(new Set());
  // savedSecondsAgo is a derived display value updated by an interval —
  // we never reach for Date.now() during render.
  const [savedSecondsAgo, setSavedSecondsAgo] = useState<number>(0);
  const savedAtRef = useRef<number>(0);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  // Ship 25: when DB is empty for a project but localStorage has lines, do a
  // one-shot migration on the FIRST save. Stays false otherwise so we never
  // clobber a real DB row with a stale offline cache.
  const needsLocalStorageMigrationRef = useRef(false);

  // Hydrate when the projectId changes.
  // BUDGET-WRITE round-3 (2026-05-22): prefer DB (project_budget_lines, via
  // GET /api/v1/budget) over localStorage. If DB is empty for this
  // project_id but localStorage has lines, hold them and flag for one-shot
  // migration on first save. Anon / fetch failures fall through to
  // localStorage so the offline demo path still works.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    // Always reset UI state immediately so the project switch feels snappy.
    setExpanded(new Set());
    hydratedRef.current = false;
    needsLocalStorageMigrationRef.current = false;

    const localLines = readLines(projectId);

    (async () => {
      // No projectId → anonymous / drafts path. localStorage only.
      if (!projectId) {
        if (cancelled) return;
        setLines(localLines);
        savedAtRef.current = Date.now();
        setSavedSecondsAgo(0);
        hydratedRef.current = true;
        return;
      }

      const dbResult = await fetchProjectBudgets(projectId);
      if (cancelled) return;

      if (dbResult === null) {
        // Auth/network failure — graceful fallback to localStorage.
        setLines(localLines);
      } else if (dbResult.lines.length > 0) {
        // DB has data — use it as the source of truth.
        setLines(dbResult.lines);
      } else if (localLines.length > 0) {
        // DB empty, localStorage has lines → seed UI from localStorage and
        // queue a one-shot migration on the next save.
        setLines(localLines);
        needsLocalStorageMigrationRef.current = true;
      } else {
        setLines([]);
      }
      savedAtRef.current = Date.now();
      setSavedSecondsAgo(0);
      hydratedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Autosave (debounced 500ms).
  // BUDGET-WRITE round-3 (2026-05-22): PATCH /api/v1/budget (upserts into
  // project_budget_lines, the canonical store) AND mirror to localStorage
  // so the offline / anon path still works. The Ship 25 JSONB path on
  // command_center_projects.project_budgets was a dead end — the column
  // is now soft-deprecated. The DB write is best-effort; failure leaves
  // localStorage as the fallback.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      writeLines(projectId, lines);
      if (projectId) {
        // Fire-and-forget. The migration flag is cleared after the first DB
        // write regardless of outcome so we don't loop on repeated failures.
        void patchProjectBudgets(projectId, lines);
        needsLocalStorageMigrationRef.current = false;
      }
      savedAtRef.current = Date.now();
      setSavedSecondsAgo(0);
    }, 500);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [lines, projectId]);

  // REALTIME (2026-05-22): teammates editing the same project in another tab
  // (or vendor invoice payments rolling the spend column) should propagate
  // into the HeroStrip without F5. Care taken to NOT echo our own autosave:
  // we skip the refetch if savedAtRef was bumped <1500ms ago (the autosave
  // round-trips through PATCH + the realtime fan-out arrives ~300-800ms
  // later — 1500ms is the empirical "safe" gap). Debounced 500ms for the
  // same autosave-burst reason as the cockpit.
  const budgetRtTimer = useRef<number | null>(null);
  const debouncedRehydrate = useCallback(() => {
    if (!projectId) return;
    if (budgetRtTimer.current) window.clearTimeout(budgetRtTimer.current);
    budgetRtTimer.current = window.setTimeout(async () => {
      // Echo-suppression: if we just saved, the row is already in our state.
      if (Date.now() - savedAtRef.current < 1500) return;
      const dbResult = await fetchProjectBudgets(projectId);
      if (dbResult && dbResult.lines.length > 0) {
        setLines(dbResult.lines);
      }
    }, 500);
  }, [projectId]);
  useRealtimeChannel(
    {
      table: 'project_budget_lines',
      filter: projectId ? `project_id=eq.${projectId}` : undefined,
      enabled: Boolean(projectId),
    },
    debouncedRehydrate,
  );
  useEffect(() => () => {
    if (budgetRtTimer.current) window.clearTimeout(budgetRtTimer.current);
  }, []);

  // Re-tick every 5s so "Xs ago" stays current. Pulls from the ref so we
  // never need to depend on a state-held timestamp.
  useEffect(() => {
    const id = window.setInterval(() => {
      const last = savedAtRef.current;
      if (!last) return;
      setSavedSecondsAgo(Math.max(0, Math.floor((Date.now() - last) / 1000)));
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  // Group lines by category.
  const linesByCategory = useMemo(() => {
    const map = new Map<string, BudgetLine[]>();
    for (const cat of CATEGORIES) map.set(cat.id, []);
    for (const l of lines) {
      const bucket = map.get(l.category) ?? [];
      bucket.push(l);
      map.set(l.category, bucket);
    }
    return map;
  }, [lines]);

  const totalsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of CATEGORIES) {
      const bucket = linesByCategory.get(cat.id) ?? [];
      map.set(
        cat.id,
        bucket.reduce((sum, l) => sum + (Number.isFinite(l.amount) ? l.amount : 0), 0),
      );
    }
    return map;
  }, [linesByCategory]);

  const grandTotal = useMemo(() => {
    let t = 0;
    for (const v of totalsByCategory.values()) t += v;
    return t;
  }, [totalsByCategory]);

  // ─── Mutations ──────────────────────────────────────────────────────────

  const addLine = useCallback(
    (categoryId: string, opts?: { autoExpand?: boolean }) => {
      const newLine: BudgetLine = {
        id: uuid(),
        category: categoryId,
        description: '',
        amount: 0,
        state: 'pending',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      setLines((prev) => [...prev, newLine]);
      if (opts?.autoExpand !== false) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.add(categoryId);
          return next;
        });
      }
    },
    [],
  );

  const updateLine = useCallback(
    (id: string, patch: Partial<BudgetLine>) => {
      setLines((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: nowIso() } : l)),
      );
    },
    [],
  );

  const deleteLine = useCallback(
    (id: string) => {
      setLines((prev) => prev.filter((l) => l.id !== id));
    },
    [],
  );

  const cycleState = useCallback(
    (id: string) => {
      let movedToLockedCategory: string | null = null;
      setLines((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const ns = nextState(l.state);
          if (ns === 'locked-in' && l.state !== 'locked-in') {
            movedToLockedCategory = l.category;
          }
          return { ...l, state: ns, updatedAt: nowIso() };
        }),
      );
      // Green glow for the card when a line just locked in.
      if (movedToLockedCategory) {
        const cat = movedToLockedCategory as string;
        setGlowCards((prev) => {
          const next = new Set(prev);
          next.add(cat);
          return next;
        });
        window.setTimeout(() => {
          setGlowCards((prev) => {
            const next = new Set(prev);
            next.delete(cat);
            return next;
          });
        }, 360);
      }
    },
    [],
  );

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  // Empty-state seeder for the giant hero.
  const seedCategory = useCallback(
    (categoryId: string) => {
      addLine(categoryId, { autoExpand: true });
    },
    [addLine],
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  const projectName = project?.name ?? 'Untitled project';
  const jurisdiction = project?.jurisdiction ?? null;
  const isEmpty = lines.length === 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: PAL.cream,
        color: PAL.graphite,
        fontFamily: fonts.body,
      }}
    >
      <HeroStrip
        projectName={projectName}
        jurisdiction={jurisdiction}
        total={grandTotal}
        rangeLow={project?.estimated_cost_low ?? null}
        rangeHigh={project?.estimated_cost_high ?? null}
        sqft={project?.sqft ?? null}
        savedSecondsAgo={savedSecondsAgo}
      />

      <main
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '20px 24px 64px',
        }}
      >
        {loading && (
          <div
            style={{
              padding: '8px 14px',
              fontSize: 12,
              color: PAL.graphite,
              opacity: 0.7,
              fontFamily: fonts.mono,
              marginBottom: 8,
            }}
          >
            Loading project…
          </div>
        )}

        <TourCue />

        {/* Stacked horizontal bar */}
        <div style={{ marginBottom: 24 }}>
          <StackedBar totalsByCategory={totalsByCategory} grandTotal={grandTotal} />
        </div>

        {/* Empty-state hero OR category grid */}
        {isEmpty ? (
          <EmptyHero onSeedCategory={seedCategory} />
        ) : (
          <div
            className="bkg-budget-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 16,
            }}
          >
            {CATEGORIES.map((cat) => {
              const catLines = linesByCategory.get(cat.id) ?? [];
              return (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  lines={catLines}
                  expanded={expanded.has(cat.id)}
                  glow={glowCards.has(cat.id)}
                  onToggle={() => toggleExpanded(cat.id)}
                  onAddLine={() => addLine(cat.id)}
                  onUpdateLine={updateLine}
                  onDeleteLine={deleteLine}
                  onCycleState={cycleState}
                  savedSecondsAgo={savedSecondsAgo}
                />
              );
            })}
          </div>
        )}

        {/* Cash flow strip */}
        <CashFlowStrip lines={lines} project={project} />

        {/* Help strip */}
        <HelpStrip projectId={projectId} />
      </main>

      <style>{`
        @keyframes bkg-toast-in {
          from { opacity: 0; transform: translate(-50%, 6px); }
          to   { opacity: 1; transform: translate(-50%, 0);   }
        }
        @media (max-width: 1024px) {
          .bkg-budget-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 640px) {
          .bkg-budget-grid { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bkg-budget-grid * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
