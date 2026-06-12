'use client';

/**
 * Engine runtime — SpecialistRunnerProvider / useSpecialistRunner
 * ===============================================================
 *
 * The injection point that lets the engine's `AnalysisPane` execute a
 * specialist call WITHOUT importing the builders-specific
 * `src/lib/specialists.client.ts`. This cuts edge 5 of
 * `docs/garden-engine/01-DEPENDENCY-GRAPH.md §4` — the last design-system →
 * builders runtime import.
 *
 * Mirrors the `LifecycleProvider` pattern: mounted once in
 * `src/components/Providers.tsx` (the app's garden-wiring point) with
 * `buildersSpecialistRunner` from `src/garden/builders/specialists.ts`.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { SpecialistRunner } from '../contracts/specialists';

const SpecialistRunnerContext = createContext<SpecialistRunner | null>(null);

export function SpecialistRunnerProvider({
  runner,
  children,
}: {
  runner: SpecialistRunner;
  children: ReactNode;
}) {
  return (
    <SpecialistRunnerContext.Provider value={runner}>
      {children}
    </SpecialistRunnerContext.Provider>
  );
}

/** Get the active garden's specialist runner. */
export function useSpecialistRunner(): SpecialistRunner {
  const runner = useContext(SpecialistRunnerContext);
  if (runner === null) {
    throw new Error(
      'useSpecialistRunner() must be used within a <SpecialistRunnerProvider>. ' +
        'Mount it at the app root (src/components/Providers.tsx) with the garden runner.',
    );
  }
  return runner;
}
