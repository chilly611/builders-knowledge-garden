'use client';

/**
 * GlobalBudgetWidget
 * ==================
 * Ever-present floating budget summary in the top-right corner of the
 * chrome. Renders across every route (mounted once in `src/app/layout.tsx`)
 * so the user can always see where they stand financially — the core of
 * the COO-for-construction value prop per W4 direction.
 *
 * Pipeline
 *   1. Resolve active project id from localStorage (`bkg-active-project`).
 *   2. Fetch `/api/v1/budget?project_id=X` with the Supabase session
 *      bearer token (same contract as legacy `BudgetWidget.tsx`).
 *   3. Collapsed: pill showing total budget + % used + over/under.
 *   4. Expanded (click pill): detail card with spent / remaining /
 *      burn rate / projected / top 3 over-budget categories.
 *   5. Refresh whenever the W3 spine dispatches `bkg:budget:changed`
 *      or the active project flips (storage event).
 *
 * Rendering contract
 *   - No active project → render nothing (don't pollute chrome).
 *   - Project but no budget → tiny "+ Set budget" link (only when
 *     user IS signed in — otherwise silent).
 *   - Unauthenticated OR on auth/landing route → silent.
 *
 * Per the W4 lesson ("Global chrome vs per-workflow chrome — be explicit"),
 * this is the ONE place where the budget lives outside workflow-local
 * widgets. `BudgetWidget.tsx` (the dark, compact project-card version)
 * stays as-is for the /expenses route & command-center usage.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useActiveProject } from '@/lib/hooks/use-active-project';

// ─── Types — mirror src/app/api/v1/budget/route.ts ────────────────────────
interface ScheduledPayment {
  id: string;
  description: string;
  amount: number;
  category: string;
  phase: string;
  date: string;
  vendor: string | null;
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalEstimated: number;
  remaining: number;
  burnRate: number;
  projectedTotal: number;
  overUnder: number;
  percentUsed: number;
  byPhase: Record<string, { spent: number; estimated: number; count: number }>;
  byCategory: Record<string, { spent: number; estimated: number; count: number }>;

  // W4.1e additions (optional so older deployments don't break the client)
  actualExpenses?: number;
  clientPaymentsReceived?: number;
  plAfterPayments?: number;
  next7DaysScheduled?: ScheduledPayment[];
}

// ─── Supabase browser client (shared pattern across the app) ──────────────
let browserClient: SupabaseClient | null = null;
function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes('placeholder')) {
    return createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
  }
  browserClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return browserClient;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** "Apr 24" style for scheduled-payment rows. Local-TZ — the contractor
 *  reads these next to a calendar, so locale matters more than ISO. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** Pathnames where the widget should stay silent. */
function isSuppressedRoute(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return true;
  const suppressPrefixes = ['/auth', '/login', '/signin', '/signup'];
  return suppressPrefixes.some((p) => pathname.startsWith(p));
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function GlobalBudgetWidget() {
  const pathname = usePathname() ?? '';
  const [projectId] = useActiveProject();
  const [hasSession, setHasSession] = useState(false);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [budgetExists, setBudgetExists] = useState<boolean | null>(null); // null = unknown
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const cancelRef = useRef<AbortController | null>(null);

  // Cheap auth-presence check — we only need to know whether a bearer token
  // is available before calling the authenticated budget endpoint.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getSupabaseBrowser().auth.getSession();
        if (!cancelled) setHasSession(Boolean(data.session));
      } catch {
        if (!cancelled) setHasSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch summary whenever dependencies change or spine events fire.
  const fetchBudget = useCallback(async () => {
    if (!projectId || !hasSession) return;
    cancelRef.current?.abort();
    const ctrl = new AbortController();
    cancelRef.current = ctrl;

    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setHasSession(false);
        return;
      }
      const res = await fetch(`/api/v1/budget?project_id=${projectId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: ctrl.signal,
      });
      if (res.status === 404) {
        setBudgetExists(false);
        setSummary(null);
        return;
      }
      if (!res.ok) {
        // Swallow — widget is best-effort and shouldn't break chrome.
        setBudgetExists(null);
        return;
      }
      const data = (await res.json()) as { summary?: BudgetSummary };
      if (data.summary) {
        setSummary(data.summary);
        setBudgetExists(true);
      }
    } catch (err) {
      if ((err as { name?: string }).name !== 'AbortError') {
        setBudgetExists(null);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, hasSession]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  // Refresh on spine writes (recordMaterialCost / LaborCost / ... all
  // dispatch `bkg:budget:changed`).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      fetchBudget();
    };
    window.addEventListener('bkg:budget:changed', handler as EventListener);
    return () =>
      window.removeEventListener('bkg:budget:changed', handler as EventListener);
  }, [fetchBudget]);

  // Top 3 categories by over-budget amount (spent - estimated). Only
  // categories with non-zero estimates; sort descending.
  const overBudgetCategories = useMemo(() => {
    if (!summary) return [] as Array<{ name: string; over: number }>;
    return Object.entries(summary.byCategory)
      .map(([name, d]) => ({ name, over: d.spent - d.estimated }))
      .filter((c) => c.over > 0)
      .sort((a, b) => b.over - a.over)
      .slice(0, 3);
  }, [summary]);

  // ─── Render guards ──────────────────────────────────────────────────────
  if (isSuppressedRoute(pathname)) return null;

  // Not signed in → silent. Don't nag on every page.
  if (!hasSession) return null;

  // No active project → silent.
  if (!projectId) return null;

  // Project but no budget → tiny "+ Set budget" CTA.
  if (budgetExists === false) {
    return (
      <a
        href={`/budget?project=${projectId}`}
        style={STYLES.pillCta}
        aria-label="Set up budget for this project"
      >
        <span style={STYLES.pillDot} aria-hidden="true" />
        + Set budget
      </a>
    );
  }

  // Still determining or fetch error → silent to avoid flashing broken UI.
  if (!summary) return null;

  const overUnder = summary.overUnder;
  const isOver = overUnder < 0;
  const statusColor = isOver ? '#D85A30' : '#1D9E75'; // BKG trade-alert / BKG plan-green
  const pctCapped = Math.min(summary.percentUsed, 999);

  return (
    <div style={STYLES.anchor}>
      {/* Collapsed pill */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label="Show budget details"
        style={{
          ...STYLES.pill,
          borderColor: isOver ? '#F4B7A3' : '#CDE8DC',
        }}
      >
        <span
          style={{ ...STYLES.pillDot, backgroundColor: statusColor }}
          aria-hidden="true"
        />
        <span style={STYLES.pillLabel}>Budget</span>
        <span style={STYLES.pillValue}>
          {formatCurrency(summary.totalBudget)}
        </span>
        <span style={{ ...STYLES.pillPct, color: statusColor }}>
          {pctCapped.toFixed(0)}%
        </span>
        <span style={{ ...STYLES.pillDelta, color: statusColor }}>
          {isOver ? '-' : '+'}
          {formatCurrency(Math.abs(overUnder))}
        </span>
        <span aria-hidden="true" style={STYLES.pillCaret}>
          {expanded ? '▴' : '▾'}
        </span>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div role="dialog" aria-label="Budget detail" style={STYLES.panel}>
          <div style={STYLES.panelHeader}>
            <strong style={STYLES.panelTitle}>Budget — this project</strong>
            <a
              href={`/budget?project=${projectId}`}
              style={STYLES.panelFullLink}
            >
              Full view →
            </a>
          </div>

          {/* Progress bar */}
          <div style={STYLES.barTrack}>
            <div
              style={{
                ...STYLES.barFill,
                width: `${Math.min(summary.percentUsed, 100)}%`,
                background: isOver ? '#D85A30' : '#1D9E75',
              }}
            />
          </div>

          {/* Metric grid */}
          <div style={STYLES.metricGrid}>
            <Metric label="Budget" value={formatCurrency(summary.totalBudget)} />
            <Metric label="Spent" value={formatCurrency(summary.totalSpent)} />
            <Metric
              label="Remaining"
              value={formatCurrency(summary.remaining)}
              color={summary.remaining < 0 ? '#D85A30' : '#1D9E75'}
            />
            <Metric
              label="Burn / day"
              value={formatCurrency(summary.burnRate)}
            />
            <Metric
              label="Projected"
              value={formatCurrency(summary.projectedTotal)}
            />
            <Metric
              label="Over / under"
              value={`${isOver ? '-' : '+'}${formatCurrency(Math.abs(overUnder))}`}
              color={statusColor}
            />
          </div>

          {/* Cash flow strip — P&L after client payments. Only render when
              something has actually moved (either side non-zero) so the panel
              doesn't show a noisy "$0 / $0 / $0" row for fresh projects. */}
          {(() => {
            const actual = summary.actualExpenses ?? 0;
            const received = summary.clientPaymentsReceived ?? 0;
            const pl = summary.plAfterPayments ?? 0;
            if (actual === 0 && received === 0) return null;
            const plColor = pl < 0 ? '#D85A30' : '#1D9E75';
            return (
              <div style={STYLES.cashSection}>
                <span style={STYLES.sectionLabel}>Cash flow</span>
                <div style={STYLES.cashRow}>
                  <Metric label="In" value={formatCurrency(received)} />
                  <Metric label="Out" value={formatCurrency(actual)} />
                  <Metric
                    label="Net"
                    value={`${pl < 0 ? '-' : '+'}${formatCurrency(Math.abs(pl))}`}
                    color={plColor}
                  />
                </div>
              </div>
            );
          })()}

          {/* Next 7 days scheduled (estimates dated within the upcoming week) */}
          {summary.next7DaysScheduled && summary.next7DaysScheduled.length > 0 && (
            <div style={STYLES.overSection}>
              <span style={STYLES.sectionLabel}>Next 7 days</span>
              <ul style={STYLES.overList}>
                {summary.next7DaysScheduled.slice(0, 5).map((p) => (
                  <li key={p.id} style={STYLES.overItem}>
                    <span style={STYLES.overCat}>
                      {shortDate(p.date)} · {p.description}
                    </span>
                    <span style={STYLES.scheduledAmt}>
                      {formatCurrency(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Categories running over */}
          {overBudgetCategories.length > 0 && (
            <div style={STYLES.overSection}>
              <span style={STYLES.overLabel}>Running over</span>
              <ul style={STYLES.overList}>
                {overBudgetCategories.map((c) => (
                  <li key={c.name} style={STYLES.overItem}>
                    <span style={STYLES.overCat}>{c.name}</span>
                    <span style={STYLES.overAmt}>
                      -{formatCurrency(c.over)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loading && <div style={STYLES.panelRefreshing}>refreshing…</div>}
        </div>
      )}
    </div>
  );
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={STYLES.metricCell}>
      <span style={STYLES.metricLabel}>{label}</span>
      <span style={{ ...STYLES.metricValue, color: color ?? '#1a1a1a' }}>
        {value}
      </span>
    </div>
  );
}

// ─── Styles — literals (avoids pulling the token module into this file) ───
const STYLES = {
  anchor: {
    position: 'fixed' as const,
    top: 60, // clears 48px KillerAppNav on /killerapp; sensible elsewhere
    right: 16,
    zIndex: 80,
    fontFamily:
      "var(--font-archivo), 'Helvetica Neue', Helvetica, Arial, sans-serif",
    color: '#1a1a1a',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    background: '#FFFFFF',
    border: '1px solid #CDE8DC',
    borderRadius: 999,
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    letterSpacing: '0.1px',
  },
  pillCta: {
    position: 'fixed' as const,
    top: 60,
    right: 16,
    zIndex: 80,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    background: '#FFFFFF',
    border: '1px dashed #C8C8C2',
    borderRadius: 999,
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    fontSize: 12,
    color: '#555',
    textDecoration: 'none',
    fontFamily:
      "var(--font-archivo), 'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C0C0BC',
    display: 'inline-block',
    flexShrink: 0,
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    color: '#777',
  },
  pillValue: {
    fontWeight: 700 as const,
  },
  pillPct: {
    fontSize: 11,
    fontWeight: 700 as const,
  },
  pillDelta: {
    fontSize: 11,
    fontWeight: 600 as const,
  },
  pillCaret: {
    fontSize: 10,
    color: '#999',
    marginLeft: 2,
  },
  panel: {
    marginTop: 8,
    width: 320,
    padding: 14,
    background: '#FFFFFF',
    border: '1px solid #E3E3DF',
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: 800 as const,
    letterSpacing: '-0.2px',
  },
  panelFullLink: {
    fontSize: 11,
    fontWeight: 600 as const,
    color: '#378ADD',
    textDecoration: 'none',
  },
  barTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: '#F1F1ED',
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 200ms ease',
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 10,
    marginBottom: 10,
  },
  metricCell: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.6px',
    color: '#888',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 700 as const,
    letterSpacing: '-0.2px',
  },
  cashSection: {
    borderTop: '1px solid #F0F0EC',
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  cashRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 10,
  },
  sectionLabel: {
    display: 'block',
    fontSize: 9,
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.6px',
    color: '#777',
    marginBottom: 6,
  },
  overSection: {
    borderTop: '1px solid #F0F0EC',
    paddingTop: 10,
    marginTop: 4,
  },
  overLabel: {
    display: 'block',
    fontSize: 9,
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.6px',
    color: '#D85A30',
    marginBottom: 6,
  },
  scheduledAmt: { color: '#333', fontWeight: 600 as const },
  overList: {
    listStyle: 'none' as const,
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  overItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
  },
  overCat: { color: '#333' },
  overAmt: { color: '#D85A30', fontWeight: 700 as const },
  panelRefreshing: {
    marginTop: 10,
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
  },
};
