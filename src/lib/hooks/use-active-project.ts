'use client';

/**
 * useActiveProject — single source of truth for "which project am I on?"
 * ======================================================================
 * Returns the current active project id (from `bkg-active-project` in
 * localStorage) and the setter. Auto-updates when:
 *
 *   1. Another tab writes to localStorage (`StorageEvent`).
 *   2. The SAME tab fires a synthetic `bkg:active-project:changed`
 *      CustomEvent — which `setActiveProject()` does on every write.
 *      Storage events don't fire in the originating tab, so we need
 *      this extra channel for single-tab flows (e.g., CompassBloom
 *      project switcher in W4.2).
 *
 * Why extract this: `GlobalJourneyMapHeader`, `GlobalBudgetWidget`, and
 * (soon) `CompassBloom` project switcher all need to react in lockstep
 * to the active project flipping. A shared hook keeps that contract in
 * one place and lets us swap in Clerk/Supabase sync later without
 * touching every consumer.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'bkg-active-project';
const CHANGE_EVENT = 'bkg:active-project:changed';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readStored(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  if (!isBrowser()) return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onStoreChange();
  };
  const onLocal = () => onStoreChange();
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onLocal as EventListener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onLocal as EventListener);
  };
}

/**
 * Returns the active project id (or null when none set) and a stable
 * setter that persists to localStorage + notifies subscribers in the
 * current tab.
 */
export function useActiveProject(): readonly [
  string | null,
  (id: string | null) => void
] {
  // useSyncExternalStore guarantees all consumers see the same value on
  // any given render pass — no stale reads during concurrent updates.
  const value = useSyncExternalStore(
    subscribe,
    readStored,
    () => null // server-side snapshot
  );

  const set = useCallback((id: string | null) => {
    if (!isBrowser()) return;
    try {
      if (id == null || id === '') {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, id);
      }
      // Fire a same-tab change event — storage events don't fire in the
      // tab that made the write.
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { id } }));
    } catch {
      // Ignore — quota or disabled storage. State will catch up on next
      // mount via the subscribe path.
    }
  }, []);

  // Defensive first-run emit: if another component set the value BEFORE
  // we mounted and we're the first useActiveProject on the page, the
  // snapshot is already correct — so there's nothing to do here. Left
  // as a comment for the next engineer who wonders why no effect runs.
  useEffect(() => {
    /* intentional no-op */
  }, []);

  return [value, set] as const;
}
