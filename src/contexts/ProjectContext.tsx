'use client';

/**
 * ProjectContext — the spine of the BKG OS (Lane C1, 2026-05-18 sprint).
 *
 * ONE source of truth for "active project." Replaces the patchwork of
 * useSearchParams reads, localStorage writes, and per-workflow fetches
 * scattered across 27 client files. Coexists with useProjectWorkflowState
 * (which still owns per-workflow JSONB state writes) — both hooks read
 * the same URL + localStorage key, so identity cannot disagree.
 *
 * Contract:
 *   - URL ?project=<uuid> wins
 *   - Fallback: localStorage['bkg-active-project'] (accepts UUID OR
 *     'demo-*' prefix for the seeded demo project)
 *   - Fallback: project = null (no redirect loop)
 *
 * Side-effects (atomic):
 *   - setActiveProject(id) → URL.replace + localStorage.setItem +
 *     window.dispatchEvent('bkg:project:changed') + optimistic state
 *   - clearActiveProject() → strip ?project= + localStorage.removeItem +
 *     window.dispatchEvent('bkg:project:changed', {detail:{id:null}})
 *
 * Cross-tab sync: listens to StorageEvent for 'bkg-active-project' AND
 * custom 'bkg:project:changed' event (storage events only fire in OTHER
 * tabs; the custom event covers same-tab cross-component updates).
 *
 * Debug hook: assigns window.__bkg_project__ for MCP/agent introspection.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const ACTIVE_PROJECT_KEY = 'bkg-active-project';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROJECT_CHANGED_EVENT = 'bkg:project:changed';

export interface ProjectRecord {
  id: string;
  name: string | null;
  raw_input: string | null;
  ai_summary: string | null;
  jurisdiction: string | null;
  sqft: string | null;
  project_type: string | null;
  estimated_cost_low: number | null;
  estimated_cost_high: number | null;
  client_name?: string | null;
}

// LANE-INFRA (2026-05-22): mirror of `ProjectRole` in
// `src/lib/use-user-lane.ts`. Inlined here to avoid a circular import
// (use-user-lane.ts depends on this context for projectId).
export type ProjectRole =
  | 'owner'
  | 'gc'
  | 'contractor'
  | 'teammate'
  | 'day_hire'
  | 'specialist'
  | 'diy';

interface ProjectContextValue {
  project: ProjectRecord | null;
  projectId: string | null;
  loading: boolean;
  error: string | null;
  /**
   * The signed-in user's `project_members.project_role` for the active
   * project, or null if there's no row (anonymous user, or no project,
   * or the user isn't a member). For the "best-guess effective lane"
   * that falls back to legacy `user_metadata.lane`, use `useUserLane()`
   * — this raw value is exposed for consumers that need to distinguish
   * "no membership" from "membership with default role".
   */
  projectRole: ProjectRole | null;
  setActiveProject: (id: string) => void;
  clearActiveProject: () => void;
  refreshProject: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function isValidProjectId(id: string): boolean {
  return UUID_REGEX.test(id) || id.startsWith('demo-');
}

function readActiveProjectFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!raw) return null;
    if (!isValidProjectId(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers });
}

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('project');

  // Compute initial projectId: URL wins, localStorage rescues, else null.
  const [fetchKey, setFetchKey] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(() => {
    if (urlProjectId && isValidProjectId(urlProjectId)) return urlProjectId;
    return readActiveProjectFromStorage();
  });
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(!!projectId);
  const [error, setError] = useState<string | null>(null);
  // LANE-INFRA: per-(projectId, userId) project_members.project_role, or null.
  const [projectRole, setProjectRole] = useState<ProjectRole | null>(null);
  const inFlight = useRef<{ id: string; key: number } | null>(null);

  // First-paint persistence: if initial state came from URL, write
  // to localStorage so cross-tab + rescue logic stays in sync. Runs
  // exactly once after mount.
  useEffect(() => {
    if (projectId && typeof window !== 'undefined') {
      try { window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId); }
      catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever URL ?project= changes (back/forward nav, link clicks),
  // align local projectId state.
  useEffect(() => {
    if (urlProjectId && isValidProjectId(urlProjectId) && urlProjectId !== projectId) {
      setProjectId(urlProjectId);
    }
  }, [urlProjectId, projectId]);

  // Hydrate project record from API whenever projectId changes.
  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setLoading(false);
      setError(null);
      return;
    }
    // Skip concurrent in-flight fetches for the same (id, fetchKey) pair.
    // A fetchKey bump (from refreshProject) bypasses this guard so a
    // re-fetch always fires even when the project id hasn't changed.
    if (inFlight.current?.id === projectId && inFlight.current?.key === fetchKey) return;
    inFlight.current = { id: projectId, key: fetchKey };
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await authedFetch(
          `/api/v1/projects?id=${encodeURIComponent(projectId)}`
        );
        if (!res.ok) {
          if (cancelled) return;
          if (res.status === 404) {
            setError('Project not found');
          } else if (res.status === 401) {
            // Anonymous user — project may not be theirs. Keep id, no record.
            setError(null);
            setProject(null);
          } else {
            setError(`Failed to load (${res.status})`);
          }
          setLoading(false);
          return;
        }
        const json = (await res.json()) as Partial<ProjectRecord> & { id?: string };
        if (cancelled) return;
        const record: ProjectRecord = {
          id: json.id ?? projectId,
          name: json.name ?? null,
          raw_input: json.raw_input ?? null,
          ai_summary: json.ai_summary ?? null,
          jurisdiction: json.jurisdiction ?? null,
          sqft: (json as { sqft?: string | null }).sqft ?? null,
          project_type: json.project_type ?? null,
          estimated_cost_low: json.estimated_cost_low ?? null,
          estimated_cost_high: json.estimated_cost_high ?? null,
          client_name: (json as { client_name?: string | null }).client_name ?? null,
        };
        setProject(record);
        setLoading(false);
        // Debug hook for MCP/agent introspection.
        if (typeof window !== 'undefined') {
          (window as unknown as { __bkg_project__?: ProjectRecord }).__bkg_project__ = record;
        }
      } catch (e) {
        if (cancelled) return;
        console.error('ProjectProvider hydrate error:', e);
        setError('Failed to load project');
        setLoading(false);
      } finally {
        if (inFlight.current?.id === projectId && inFlight.current?.key === fetchKey) {
          inFlight.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, fetchKey]);

  // LANE-INFRA: hydrate projectRole whenever (projectId, userId) changes.
  // Reads via the same anon Supabase client the auth session lives on, so
  // RLS on project_members applies (users can only see their own rows).
  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      if (!projectId) {
        setProjectRole(null);
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        if (!cancelled) setProjectRole(null);
        return;
      }
      // A user can hold multiple roles on the same project; pick the
      // highest-priority one. Inline priority table to avoid pulling in
      // use-user-lane (which would create a circular dep).
      const PRIORITY: Record<ProjectRole, number> = {
        owner: 100, gc: 90, contractor: 70, specialist: 60,
        teammate: 50, diy: 40, day_hire: 30,
      };
      const { data, error } = await supabase
        .from('project_members')
        .select('project_role')
        .eq('project_id', projectId)
        .eq('user_id', userId);
      if (cancelled) return;
      if (error) {
        // Quietly null out — useUserLane() handles the legacy fallback.
        setProjectRole(null);
      } else {
        const roles = (data ?? [])
          .map((r) => r.project_role as ProjectRole | null)
          .filter((r): r is ProjectRole => !!r);
        if (roles.length === 0) {
          setProjectRole(null);
        } else {
          const winner = [...roles].sort((a, b) => PRIORITY[b] - PRIORITY[a])[0];
          setProjectRole(winner);
        }
      }
    }
    void loadRole();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void loadRole();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [projectId]);

  const refreshProject = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  // setActiveProject — atomic URL + localStorage + state update.
  const setActiveProject = useCallback(
    (id: string) => {
      if (!isValidProjectId(id)) {
        console.warn('setActiveProject: invalid id', id);
        return;
      }
      try {
        window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
      } catch {
        // ignore storage failures
      }
      setProjectId(id); // optimistic
      // Push URL with ?project= preserving other query params.
      const params = new URLSearchParams(searchParams.toString());
      params.set('project', id);
      router.replace(`${pathname}?${params.toString()}`);
      // Broadcast for same-tab cross-component sync.
      window.dispatchEvent(
        new CustomEvent(PROJECT_CHANGED_EVENT, { detail: { id } })
      );
    },
    [router, pathname, searchParams]
  );

  const clearActiveProject = useCallback(() => {
    try {
      window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
    } catch {
      // ignore
    }
    setProjectId(null);
    setProject(null);
    setError(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('project');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    window.dispatchEvent(
      new CustomEvent(PROJECT_CHANGED_EVENT, { detail: { id: null } })
    );
    if (typeof window !== 'undefined') {
      (window as unknown as { __bkg_project__?: ProjectRecord | null }).__bkg_project__ = null;
    }
  }, [router, pathname, searchParams]);

  // Cross-tab + same-tab listeners.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== ACTIVE_PROJECT_KEY) return;
      const next = e.newValue;
      if (next && isValidProjectId(next)) {
        setProjectId(next);
      } else if (next === null) {
        setProjectId(null);
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const next = detail.id as string | null;
      if (next === null) {
        setProjectId(null);
        return;
      }
      if (next && isValidProjectId(next) && next !== projectId) {
        setProjectId(next);
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(PROJECT_CHANGED_EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(PROJECT_CHANGED_EVENT, onCustom);
    };
  }, [projectId]);

  // 2026-05-22 (Sec+Auth Burn 6): Linda bug — signing in as gc-trial-03 in
  // a browser that previously held specialty-trial-01's session left the
  // localStorage `bkg-active-project` pointing at the prior tenant's
  // project, so the new user briefly saw the wrong project name & footer.
  // Clear cached project state on SIGNED_OUT and on SIGNED_IN (where the
  // user's id changes — same key, different tenant). The ProjectProvider
  // is mounted high in the killerapp tree so this fires once per auth
  // transition.
  //
  // 2026-05-22 (W9.D-W2 mount): also wipe `bkg:stage-welcome:*` dismissal
  // flags. Otherwise the new tenant inherits the prior tenant's "I've
  // seen the foreman copy" state for any (projectId, stageId) where the
  // two users happen to share a projectId via the demo seed.
  useEffect(() => {
    let lastUserId: string | null = null;
    let initialized = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      lastUserId = data.session?.user?.id ?? null;
      initialized = true;
    })();

    const clearStageWelcomeFlags = () => {
      try {
        const ls = window.localStorage;
        const toRemove: string[] = [];
        for (let i = 0; i < ls.length; i++) {
          const key = ls.key(i);
          if (key && key.startsWith('bkg:stage-welcome:')) toRemove.push(key);
        }
        for (const k of toRemove) ls.removeItem(k);
      } catch { /* ignore */ }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null;

      // SIGNED_OUT — wipe everything.
      if (event === 'SIGNED_OUT' || nextUserId === null) {
        try { window.localStorage.removeItem(ACTIVE_PROJECT_KEY); } catch { /* ignore */ }
        try { window.localStorage.removeItem('last-project-id'); } catch { /* ignore */ }
        clearStageWelcomeFlags();
        setProjectId(null);
        setProject(null);
        setProjectRole(null);
        setError(null);
        lastUserId = null;
        return;
      }

      // SIGNED_IN as a different user — drop the previous tenant's
      // active-project pointer before the new user's components mount.
      // Skip the very first auth event (which is the initial session load
      // and isn't actually a user-switch).
      if (initialized && lastUserId && nextUserId && lastUserId !== nextUserId) {
        try { window.localStorage.removeItem(ACTIVE_PROJECT_KEY); } catch { /* ignore */ }
        try { window.localStorage.removeItem('last-project-id'); } catch { /* ignore */ }
        clearStageWelcomeFlags();
        setProjectId(null);
        setProject(null);
        setProjectRole(null);
        setError(null);
      }
      lastUserId = nextUserId;
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        project,
        projectId,
        loading,
        error,
        projectRole,
        setActiveProject,
        clearActiveProject,
        refreshProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error(
      'useProjectContext (or useProject) must be used inside <ProjectProvider>. ' +
        'Mount it in /killerapp/layout.tsx (or your route group layout).'
    );
  }
  return ctx;
}
