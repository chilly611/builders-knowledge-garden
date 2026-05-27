'use client';

/**
 * StageChromeContext — shared state between a stage page and its chrome.
 *
 * The StageShell renders the chrome (JourneyRow, BudgetRibbon, ProToggle)
 * ABOVE the page content. The page is a child, so it can't pass props up to
 * the ribbon directly. This context is the channel: the page calls
 * `setBudget({ total, timelineWeeks })` on every sequencing drag and the
 * BudgetRibbon re-renders live. Pro mode lives here too so the toggle and
 * the page body stay in sync.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const PRO_MODE_KEY = 'bkg:pro-mode';

export interface StageBudgetInfo {
  total: number;
  timelineWeeks?: number | null;
}

interface StageChromeValue {
  proMode: boolean;
  setProMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  budgetTotal: number | null;
  timelineWeeks: number | null;
  /** Increments on each budget change so the ribbon can pulse. */
  budgetTick: number;
  /** Sign of the most recent change: -1 cheaper, +1 pricier, 0 none. */
  lastBudgetChange: number;
  setBudget: (info: StageBudgetInfo) => void;
}

const StageChromeContext = createContext<StageChromeValue | null>(null);

export function StageChromeProvider({ children }: { children: ReactNode }) {
  const [proMode, setProModeState] = useState(false);
  const [budgetTotal, setBudgetTotal] = useState<number | null>(null);
  const [timelineWeeks, setTimelineWeeks] = useState<number | null>(null);
  const [budgetTick, setBudgetTick] = useState(0);
  const [lastBudgetChange, setLastBudgetChange] = useState(0);
  const prevTotalRef = useRef<number | null>(null);

  // Hydrate pro mode from localStorage on mount (client only — avoids a
  // hydration mismatch by starting false on both server and first client paint).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(PRO_MODE_KEY) === '1') setProModeState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setProMode = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setProModeState((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      try {
        window.localStorage.setItem(PRO_MODE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const setBudget = useCallback((info: StageBudgetInfo) => {
    const prev = prevTotalRef.current;
    setLastBudgetChange(prev == null ? 0 : Math.sign(info.total - prev));
    prevTotalRef.current = info.total;
    setBudgetTotal(info.total);
    if (info.timelineWeeks !== undefined) setTimelineWeeks(info.timelineWeeks);
    setBudgetTick((t) => t + 1);
  }, []);

  return (
    <StageChromeContext.Provider
      value={{
        proMode,
        setProMode,
        budgetTotal,
        timelineWeeks,
        budgetTick,
        lastBudgetChange,
        setBudget,
      }}
    >
      {children}
    </StageChromeContext.Provider>
  );
}

export function useStageChrome(): StageChromeValue {
  const ctx = useContext(StageChromeContext);
  if (!ctx) {
    throw new Error('useStageChrome must be used inside <StageShell> / <StageChromeProvider>');
  }
  return ctx;
}
