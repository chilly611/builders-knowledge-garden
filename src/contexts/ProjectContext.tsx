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

interface ProjectContextValue {
  project: ProjectRecord | null;
  projectId: string | null;
  loading: boolean;
  error: string | null;
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

  return (
    <ProjectContext.Provider
      value={{
        project,
        projectId,
        loading,
        error,
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
