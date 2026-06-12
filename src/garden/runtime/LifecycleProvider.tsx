'use client';

/**
 * Engine runtime — LifecycleProvider / useLifecycle / useStageResolver
 * ====================================================================
 *
 * The injection point that lets generic chrome read lifecycle stages AND
 * resolve the current stage from a pathname WITHOUT importing the
 * builders-specific `src/lib/lifecycle-stages.ts` / `src/lib/stage-from-pathname.ts`.
 * This is the mechanism that cuts the lifecycle coupling edges in
 * `docs/garden-engine/01-DEPENDENCY-GRAPH.md §4`.
 *
 * Phase 2 (this commit): mounted once in `src/components/Providers.tsx` (a
 * client component — the app's garden-wiring point) with `buildersLifecycle`
 * and `buildersStageFromPath`. The design-system stage components consume these
 * hooks instead of importing the construction modules directly.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { Lifecycle, StageFromPath } from '../contracts/lifecycle';

interface LifecycleContextValue {
  stages: Lifecycle;
  resolveStageFromPath: StageFromPath;
}

const LifecycleContext = createContext<LifecycleContextValue | null>(null);

export function LifecycleProvider({
  lifecycle,
  resolveStageFromPath,
  children,
}: {
  lifecycle: Lifecycle;
  resolveStageFromPath: StageFromPath;
  children: ReactNode;
}) {
  return (
    <LifecycleContext.Provider value={{ stages: lifecycle, resolveStageFromPath }}>
      {children}
    </LifecycleContext.Provider>
  );
}

function useLifecycleContext(): LifecycleContextValue {
  const ctx = useContext(LifecycleContext);
  if (ctx === null) {
    throw new Error(
      'useLifecycle()/useStageResolver() must be used within a <LifecycleProvider>. ' +
        'Mount it at the app root (src/components/Providers.tsx) with the garden lifecycle.',
    );
  }
  return ctx;
}

/** Read the active garden's ordered lifecycle stages. */
export function useLifecycle(): Lifecycle {
  return useLifecycleContext().stages;
}

/** Get the garden's pathname→stage-id resolver (0 = none/landing). */
export function useStageResolver(): StageFromPath {
  return useLifecycleContext().resolveStageFromPath;
}
