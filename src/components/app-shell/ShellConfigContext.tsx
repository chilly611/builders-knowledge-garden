'use client';

/**
 * ShellConfigContext — one source of truth for the active shell config.
 *
 * The provider (mounted in the killerapp layout, inside ProjectProvider)
 * computes a DEFAULT config from the signed-in user's project role + the
 * active project (falling back to the canonical Marin numbers, matching the
 * prior KillerAppChrome fallback). A surface can push a richer config via
 * `useSetShellConfig()` — the Owner Lane does this with its lens-gated
 * /api/owner-home data so the shared shell shows owner budget/journey/nav.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { getCanonicalProject } from '@/lib/projects/getCanonicalProject';
import { buildDefaultConfig, SEAL_SRC } from './config';
import type { ShellConfig } from './types';

/** Inert fallback so the hooks never throw if used outside the provider. */
const EMPTY: ShellConfig = {
  laneSlug: 'gc',
  laneLabel: 'Builder',
  kicker: "Builder's Knowledge Garden",
  projectId: null,
  projectName: 'Your build',
  sealSrc: SEAL_SRC,
  budget: { show: false, cells: [], activeStage: 'build', endBig: '—', endSub: '' },
  journey: { show: false, activeStage: 'build', pct: 0, weekOf: 0, weeksTotal: 0 },
  nav: [],
  ready: false,
};

interface ShellConfigCtx {
  config: ShellConfig;
  /** Push an override config (null to clear and fall back to the default). */
  setConfig: (cfg: ShellConfig | null) => void;
}

const Ctx = createContext<ShellConfigCtx | null>(null);

export function ShellConfigProvider({ children }: { children: ReactNode }) {
  const { projectId, project, projectRole } = useProjectContext();
  const [override, setOverride] = useState<ShellConfig | null>(null);

  const fallbackProject = useMemo(() => getCanonicalProject(), []);
  const def = useMemo(
    () => buildDefaultConfig({
      project: fallbackProject,
      lane: projectRole,
      projectId,
      projectName: project?.name,
    }),
    [fallbackProject, projectRole, projectId, project?.name],
  );

  // Clear any pushed override when the active project changes — the new
  // surface re-pushes its own config; until then, show the default.
  useEffect(() => { setOverride(null); }, [projectId]);

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
