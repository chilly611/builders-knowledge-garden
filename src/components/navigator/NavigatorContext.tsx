'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { NavigatorState, NavigatorCollapseState, StageId } from './types';
import { NAVIGATOR_EVENTS } from './types';

// ─── Context ─────────────────────────────────────────────────────────────

interface NavigatorContextValue {
  state: NavigatorState;
  setCollapseState: (next: NavigatorCollapseState) => void;
  cycleCollapseState: () => void;
  setProjectId: (id: string | null) => void;
  setHoveredStageId: (id: StageId | null) => void;
  setFocusedStageId: (id: StageId | null) => void;
}

const NavigatorContext = createContext<NavigatorContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────

export function NavigatorProvider({
  children,
  initialProjectId = null,
  initialCollapseState = 'compact',
}: {
  children: React.ReactNode;
  initialProjectId?: string | null;
  initialCollapseState?: NavigatorCollapseState;
}) {
  const [state, setState] = useState<NavigatorState>({
    collapseState: initialCollapseState,
    projectId: initialProjectId,
    prefersReducedMotion: false,
    hoveredStageId: null,
    focusedStageId: null,
  });

  // Hydrate from localStorage on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load collapse state from localStorage
    try {
      const stored = window.localStorage.getItem('bkg:navigator:collapse-state');
      if (stored === 'hidden' || stored === 'compact' || stored === 'expanded') {
        setState((prev) => ({ ...prev, collapseState: stored }));
      }
    } catch {
      // localStorage unavailable; use initialCollapseState
    }

    // Load prefers-reduced-motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setState((prev) => ({ ...prev, prefersReducedMotion: mediaQuery.matches }));

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setState((prev) => ({ ...prev, prefersReducedMotion: e.matches }));
    };

    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  // Subscribe to storage events (cross-tab sync)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (evt: StorageEvent) => {
      if (evt.key === 'bkg:navigator:collapse-state' && evt.newValue) {
        const newValue = evt.newValue as NavigatorCollapseState;
        if (newValue === 'hidden' || newValue === 'compact' || newValue === 'expanded') {
          setState((prev) => ({ ...prev, collapseState: newValue }));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setCollapseState = useCallback((next: NavigatorCollapseState) => {
    setState((prev) => {
      if (prev.collapseState === next) return prev;

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('bkg:navigator:collapse-state', next);
        } catch {
          // localStorage quota exceeded or unavailable; continue anyway
        }
      }

      // Dispatch collapse-changed event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(NAVIGATOR_EVENTS.COLLAPSE_CHANGED, {
            detail: { from: prev.collapseState, to: next },
          })
        );
      }

      return { ...prev, collapseState: next };
    });
  }, []);

  const cycleCollapseState = useCallback(() => {
    const cycle: Record<NavigatorCollapseState, NavigatorCollapseState> = {
      hidden: 'compact',
      compact: 'expanded',
      expanded: 'hidden',
    };
    setCollapseState(cycle[state.collapseState]);
  }, [state.collapseState, setCollapseState]);

  const setProjectId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, projectId: id }));
  }, []);

  const setHoveredStageId = useCallback((id: StageId | null) => {
    setState((prev) => ({ ...prev, hoveredStageId: id }));
  }, []);

  const setFocusedStageId = useCallback((id: StageId | null) => {
    setState((prev) => ({ ...prev, focusedStageId: id }));
  }, []);

  const value: NavigatorContextValue = useMemo(
    () => ({
      state,
      setCollapseState,
      cycleCollapseState,
      setProjectId,
      setHoveredStageId,
      setFocusedStageId,
    }),
    [state, setCollapseState, cycleCollapseState, setProjectId, setHoveredStageId, setFocusedStageId]
  );

  return (
    <NavigatorContext.Provider value={value}>
      {children}
    </NavigatorContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useNavigator(): NavigatorContextValue {
  const ctx = useContext(NavigatorContext);
  if (!ctx) {
    throw new Error('useNavigator must be called inside <NavigatorProvider>.');
  }
  return ctx;
}
