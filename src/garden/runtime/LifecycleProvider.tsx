'use client';

/**
 * Engine runtime — LifecycleProvider / useLifecycle
 * =================================================
 *
 * The injection point that lets generic chrome read lifecycle stages WITHOUT
 * importing the builders-specific `src/lib/lifecycle-stages.ts`. This is the
 * mechanism that cuts ~11 of the 13 coupling edges in
 * `docs/garden-engine/01-DEPENDENCY-GRAPH.md §4`.
 *
 * Phase 1 (this commit): the provider + hook exist but nothing mounts them yet
 * — behaviour is unchanged. Phase 2 mounts the provider once at
 * `app/killerapp/layout.tsx` with `buildersLifecycle`, then converts
 * StageBreadcrumb / StageContextPill / NextWorkflowCard / NavigatorMiniStrip /
 * JourneyRow / cockpit/* / GlobalJourneyMapHeader / … to call `useLifecycle()`
 * and deletes their direct imports.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { Lifecycle } from '../contracts/lifecycle';

const LifecycleContext = createContext<Lifecycle | null>(null);

export function LifecycleProvider({
  lifecycle,
  children,
}: {
  lifecycle: Lifecycle;
  children: ReactNode;
}) {
  return (
    <LifecycleContext.Provider value={lifecycle}>
      {children}
    </LifecycleContext.Provider>
  );
}

/**
 * Read the active garden's lifecycle. Throws if used outside a provider so the
 * missing-mount is caught at dev time rather than rendering empty chrome.
 */
export function useLifecycle(): Lifecycle {
  const ctx = useContext(LifecycleContext);
  if (ctx === null) {
    throw new Error(
      'useLifecycle() must be used within a <LifecycleProvider>. ' +
        'Mount it at the app shell root with the garden lifecycle.',
    );
  }
  return ctx;
}
