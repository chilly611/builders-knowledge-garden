'use client';

/**
 * ShellConfigContext — one source of truth for the active shell config.
 *
 * The provider (mounted in the killerapp layout, inside ProjectProvider)
 * builds a DEFAULT config from the project's REAL ledger numbers
 * (useProjectLedger) + the user's RESOLVED lane. Lane is never silently
 * defaulted to GC: unknown → a neutral "Preview" state (see buildDefaultConfig).
 * A surface can push a richer config via `useSetShellConfig()` — the Owner
 * Lane does this with its lens-gated /api/owner-home data.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useUserLane, LEGACY_LANE_TO_PROJECT_ROLE } from '@/lib/use-user-lane';
import { useProjectLedger } from './useProjectLedger';
import { buildDefaultConfig, SEAL_SRC } from './config';
import type { ShellConfig } from './types';

/** Inert fallback so the hooks never throw if used outside the provider. */
const EMPTY: ShellConfig = {
  laneSlug: 'guest',
  laneLabel: 'Preview',
  kicker: "Builder's Knowledge Garden",
  projectId: null,
  projectName: 'Pick a project',
  sealSrc: SEAL_SRC,
  budget: { show: false, cells: [], activeStage: '', endBig: '—', endSub: '' },
  journey: { show: false, activeStage: '', pct: 0, weekOf: 0, weeksTotal: 0 },
  nav: [],
  ready: false,
};

interface ShellConfigCtx {
  config: ShellConfig;
  setConfig: (cfg: ShellConfig | null) => void;
}

const Ctx = createContext<ShellConfigCtx | null>(null);

export function ShellConfigProvider({ children }: { children: ReactNode }) {
  const { projectId, project } = useProjectContext();
  const { projectRole, legacyLane, loading } = useUserLane();

  // On a project HOME route (/killerapp/projects/<id>) the route param is the
  // active project — it wins over ProjectContext's ?project=/localStorage id,
  // which can disagree with the URL we're actually on (same reason LaneRouter
  // resolves role from the route param). Off such routes, fall back to context.
  const pathname = usePathname();
  const routeMatch = pathname?.match(/^\/killerapp\/projects\/([^/?#]+)/);
  const effectiveProjectId = routeMatch ? decodeURIComponent(routeMatch[1]) : projectId;

  const ledger = useProjectLedger(effectiveProjectId);
  const [override, setOverride] = useState<ShellConfig | null>(null);

  // Resolve the lane from the raw role / legacy lane — NOT effectiveLane,
  // which silently falls back to 'gc'. Unknown stays null → neutral state.
  const resolvedLane = projectRole ?? (legacyLane ? LEGACY_LANE_TO_PROJECT_ROLE[legacyLane] : null);
  const laneKnown = !loading && !!resolvedLane;

  const def = useMemo(
    () => buildDefaultConfig({
      ledger,
      lane: resolvedLane,
      laneKnown,
      projectId: effectiveProjectId,
      projectName: project?.name,
    }),
    [ledger, resolvedLane, laneKnown, effectiveProjectId, project?.name],
  );

  // Clear any pushed override when the active project changes.
  useEffect(() => { setOverride(null); }, [effectiveProjectId]);

  const setConfig = useCallback((cfg: ShellConfig | null) => setOverride(cfg), []);
  const value = useMemo<ShellConfigCtx>(() => ({ config: override ?? def, setConfig }), [override, def, setConfig]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShellConfig(): ShellConfig {
  const ctx = useContext(Ctx);
  return ctx ? ctx.config : EMPTY;
}

export function useSetShellConfig(): (cfg: ShellConfig | null) => void {
  const ctx = useContext(Ctx);
  return ctx ? ctx.setConfig : () => {};
}
