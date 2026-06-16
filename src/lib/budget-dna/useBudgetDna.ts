'use client';

/**
 * useBudgetDna — bind the Budget-DNA derivation to the active project.
 * ===================================================================
 *
 * Data-driven, zero hardcoded project names: reads identity + lane + budget
 * from `useStageProject`, the canonical budget split from `useProjectLedger`
 * (the SAME source the shell strips read, so the ribbon never disagrees with
 * the chrome), the line items from the canonical Marin seed (or the
 * BudgetClient localStorage spine for any other project), and the schedule
 * from `MARIN_PLAN_PHASES` (or the generic `DEFAULT_BUILD_PHASES` fallback).
 */

import { useEffect, useMemo, useState } from 'react';
import { useStageProject } from '@/lib/hooks/useStageProject';
import { useProjectLedger } from '@/components/app-shell/useProjectLedger';
import { getDemoFixture } from '@/lib/projects/getCanonicalProject';
import {
  normalizeStoredLines,
  storageKeyFor,
  type BudgetLine,
} from '@/app/killerapp/budget/budget-storage';
import { deriveBudgetDna, type BudgetDna, type DnaLine } from './derive';
import { DEFAULT_BUILD_PHASES, type PhaseInput } from './schedule';

export interface UseBudgetDnaResult extends BudgetDna {
  /** False while the project ledger is still resolving. */
  ready: boolean;
  /** Resolved viewer lane (drives the profit cap). */
  lane: string | null;
}

export function useBudgetDna(): UseBudgetDnaResult {
  const sp = useStageProject();
  const ledger = useProjectLedger(sp.projectId);
  // Demo fixtures (Marin, Folsom, …) carry their own seed lines + phases via
  // the fixture registry; any other project reads the BudgetClient spine.
  const fixture = getDemoFixture(sp.projectId);
  const [storedLines, setStoredLines] = useState<BudgetLine[] | null>(null);

  useEffect(() => {
    if (getDemoFixture(sp.projectId)) { setStoredLines(null); return; }
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKeyFor(sp.projectId));
      setStoredLines(raw ? normalizeStoredLines(JSON.parse(raw)) : []);
    } catch {
      setStoredLines([]);
    }
  }, [sp.projectId]);

  return useMemo<UseBudgetDnaResult>(() => {
    const lines: DnaLine[] = fixture?.budgetLines ?? storedLines ?? [];
    const phases: PhaseInput[] = fixture?.phases ?? DEFAULT_BUILD_PHASES;
    const total = sp.budgetTotal ?? 0;
    const totals = ledger.budget ?? {
      total,
      spent: sp.budgetSpent ?? 0,
      committed: 0,
      remaining: Math.max(0, total - (sp.budgetSpent ?? 0)),
    };
    const dna = deriveBudgetDna({ lines, phases, totals, lane: sp.lane });
    return {
      ...dna,
      ready: ledger.ready && (!!fixture || storedLines !== null),
      lane: sp.lane,
    };
  }, [fixture, storedLines, ledger.budget, ledger.ready, sp.budgetTotal, sp.budgetSpent, sp.lane]);
}
