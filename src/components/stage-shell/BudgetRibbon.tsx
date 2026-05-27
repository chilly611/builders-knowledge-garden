'use client';

/**
 * BudgetRibbon — always-visible live budget + timeline.
 *
 * Reads the page-authoritative total from StageChromeContext (the Plan stage
 * pushes a new total on every sequencing drag). Falls back to the BudgetClient
 * localStorage spine for the active project so the ribbon is never empty —
 * e.g. on the Build stage, which doesn't drive the number itself.
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
}: {
  projectId: string | null;
  initialBudget?: number;
}) {
  const { budgetTotal, timelineWeeks, budgetTick, lastBudgetChange } = useStageChrome();
  const [baseTotal, setBaseTotal] = useState<number | null>(initialBudget ?? null);
  const [flash, setFlash] = useState(false);
  const firstTick = useRef(true);

  useEffect(() => {
    const t = readBaseTotal(projectId);
    if (t != null) setBaseTotal(t);
  }, [projectId]);

  // Pulse on every budget change after the first paint.
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
  // 2026-05-28: herbarium merge — was '#14B8A6' (bright teal), now sage
  // (positive budget movement). Orange/brass paths already migrated by
  // the colors.ts alias step.
  const changeColor =
    lastBudgetChange < 0
      ? colors.status.success
      : lastBudgetChange > 0
        ? colors.orange
        : colors.brass;

  return (
    <div
      role="status"
      aria-live="polite"
      title={total != null ? formatExact(total) : 'Budget pending'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '6px 14px',
        borderRadius: 999,
        background: colors.paper.cream,
        border: `1.5px solid ${flash ? changeColor : colors.paper.border}`,
        boxShadow: flash ? `0 0 0 3px ${changeColor}22` : 'none',
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
        fontFamily: fonts.body,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.brass, fontWeight: 700 }}>
          Budget
        </span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 16,
            fontWeight: 700,
            color: flash ? changeColor : colors.navy,
            transition: 'color 200ms ease',
          }}
        >
          {total != null ? formatBig(total) : '—'}
        </span>
      </span>

      {timelineWeeks != null && (
        <>
          <span aria-hidden style={{ width: 1, height: 22, background: colors.paper.border }} />
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.brass, fontWeight: 700 }}>
              Timeline
            </span>
            <span style={{ fontFamily: fonts.mono, fontSize: 16, fontWeight: 700, color: colors.navy }}>
              {timelineWeeks} wk
            </span>
          </span>
        </>
      )}
    </div>
  );
}
