'use client';

/**
 * BudgetRibbon — always-visible budget + live timeline.
 *
 * Headline reads "<spent> / <total>" from the canonical project record
 * (stable — never two different totals on one screen). The TIMELINE is the
 * live value: the Plan stage pushes a new week count on every sequencing
 * drag, and that number pulses. The dollar impact of a drag is surfaced in
 * the stage insight card, not the headline (the contract total doesn't swing
 * with your schedule — your overhead does).
 *
 * Falls back to the BudgetClient localStorage spine for the total so the
 * ribbon is never empty on stages that don't push a budget.
 */

import { useEffect, useRef, useState } from 'react';
import {
  normalizeStoredLines,
  storageKeyFor,
} from '@/app/killerapp/budget/budget-storage';
import { useStageChrome } from './stage-chrome-context';
import { colors, fonts } from '@/design-system/tokens';

function formatBig(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

function formatExact(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function readBaseTotal(projectId: string | null): number | null {
  if (typeof window === 'undefined' || !projectId) return null;
  try {
    const raw = window.localStorage.getItem(storageKeyFor(projectId));
    if (!raw) return null;
    const lines = normalizeStoredLines(JSON.parse(raw));
    if (lines.length === 0) return null;
    return lines.reduce((s, l) => s + l.amount, 0);
  } catch {
    return null;
  }
}

export default function BudgetRibbon({
  projectId,
  initialBudget,
  spent,
}: {
  projectId: string | null;
  initialBudget?: number;
  /** Spent-to-date from the project record. When set, headline is "spent / total". */
  spent?: number;
}) {
  const { budgetTotal, timelineWeeks, budgetTick } = useStageChrome();
  const [baseTotal, setBaseTotal] = useState<number | null>(initialBudget ?? null);
  const [flash, setFlash] = useState(false);
  const firstTick = useRef(true);

  useEffect(() => {
    const t = readBaseTotal(projectId);
    if (t != null) setBaseTotal(t);
  }, [projectId]);

  // Pulse the TIMELINE on every live update after the first paint.
  useEffect(() => {
    if (firstTick.current) {
      firstTick.current = false;
      return;
    }
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 650);
    return () => clearTimeout(id);
  }, [budgetTick]);

  const total = budgetTotal ?? baseTotal ?? initialBudget ?? null;
  const accent = colors.robin;

  return (
    <div
      role="status"
      aria-live="polite"
      title={total != null ? `Budget ${formatExact(total)}${spent != null ? ` · ${formatExact(spent)} spent` : ''}` : 'Budget pending'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '6px 14px',
        borderRadius: 999,
        background: colors.paper.cream,
        border: `1.5px solid ${colors.paper.border}`,
        fontFamily: fonts.body,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.brass, fontWeight: 700 }}>
          Budget
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 16, fontWeight: 700, color: colors.navy }}>
          {total != null ? (
            spent != null ? (
              <>
                {formatBig(spent)} <span style={{ color: colors.brass, fontWeight: 500 }}>/ {formatBig(total)}</span>
              </>
            ) : (
              formatBig(total)
            )
          ) : (
            '—'
          )}
        </span>
      </span>

      {timelineWeeks != null && (
        <>
          <span aria-hidden style={{ width: 1, height: 22, background: colors.paper.border }} />
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              lineHeight: 1.1,
              padding: '2px 6px',
              margin: '-2px -2px',
              borderRadius: 7,
              background: flash ? `${accent}26` : 'transparent',
              transition: 'background 200ms ease',
            }}
          >
            <span style={{ fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.brass, fontWeight: 700 }}>
              Timeline
            </span>
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: 16,
                fontWeight: 700,
                color: flash ? colors.robin : colors.navy,
                transition: 'color 200ms ease',
              }}
            >
              {timelineWeeks} wk
            </span>
          </span>
        </>
      )}
    </div>
  );
}
