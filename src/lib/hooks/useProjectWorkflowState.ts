/**
 * useProjectWorkflowState (Project Spine v1, 2026-05-03).
 *
 *   1. Reads `?project=<id>` from the URL.
 *   2. If absent, redirects back to `/killerapp` with `?toast=needs-project`.
 *   3. If present, fetches the project + extracts the workflow's
 *      JSONB state column (e.g. `estimating_state`).
 *   4. Returns hydrated step payloads for `WorkflowShell.hydratedPayloads`.
 *   5. Exposes `recordStepEvent(event)` — call this from `onStepComplete`.
 *      Debounces 500ms then PATCHes the JSONB column.
 *
 * Sister hook `useProjectStateBlob<T>` does the same for an arbitrary
 * JSON-serializable object instead of a per-step payload map (used by
 * contract-templates which doesn't use StepCard).
 *
 * Suspense:
 *   This hook calls `useSearchParams`. Components using it MUST be
 *   wrapped in `<Suspense>` (Next.js 16 prerender requirement).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { StepResult } from '@/design-system/components/StepCard.types';

export type StepPayload = {
  value?: string;
  selected?: string[];
  checked?: Record<string, boolean>;
  input?: string;
};

interface ProjectStateColumns {
  estimating_state?: Record<string, StepPayload>;
  code_compliance_state?: Record<string, StepPayload>;
  contracts_state?: Record<string, StepPayload>;
}

type StateColumn = keyof ProjectStateColumns;

export interface ProjectContext {
  id: string;
  name: string | null;
  raw_input: string | null;
  ai_summary: string | null;
  jurisdiction: string | null;
  project_type: string | null;
  estimated_cost_low: number | null;
  estimated_cost_high: number | null;
}

interface UseProjectWorkflowStateArgs {
  column: StateColumn;
  workflowId: string;
  debounceMs?: number;
}

interface UseProjectWorkflowStateReturn {
  projectId: string | null;
  loading: boolean;
  hydratedPayloads: Record<string, StepPayload>;
  recordStepEvent: (event: StepResult & { workflowId: string }) => void;
  lastSavedAt: number | null;
  saving: boolean;
  project: ProjectContext | null;
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

function payloadFromEvent(
  event: StepResult & { workflowId: string }
): StepPayload {
  const p = (event.payload ?? {}) as Partial<StepPayload>;
  const out: StepPayload = {};
  if (typeof p.value === 'string') out.value = p.value;
  if (Array.isArray(p.selected))
    out.selected = p.selected.filter((s): s is string => typeof s === 'string');
  if (p.checked && typeof p.checked === 'object') {
    out.checked = Object.fromEntries(
      Object.entries(p.checked).filter(
        ([, v]) => typeof v === 'boolean'
      ) as [string, boolean][]
    );
  }
  if (typeof p.input === 'string') out.input = p.input;
  return out;
}

export function useProjectWorkflowState(
  args: UseProjectWorkflowStateArgs
): UseProjectWorkflowStateReturn {
  const { column, workflowId, debounceMs = 500 } = args;
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  const [hydratedPayloads, setHydratedPayloads] = useState<
    Record<string, StepPayload>
  >({});
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [loading, setLoading] = useState<boolean>(!!projectId);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const stateRef = useRef<Record<string, StepPayload>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (projectId) return;
    router.replace(
      `/killerapp?toast=needs-project&workflow=${encodeURIComponent(workflowId)}`
    );
  }, [projectId, router, workflowId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await authedFetch(
          `/api/v1/projects?id=${encodeURIComponent(projectId)}`
        );
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const json = (await res.json()) as ProjectStateColumns &
          Partial<ProjectContext>;
        const map = (json[column] ?? {}) as Record<string, StepPayload>;
        if (cancelled) return;
        stateRef.current = { ...map };
        setHydratedPayloads(map);
        setProject({
          id: (json.id as string) ?? projectId,
          name: json.name ?? null,
          raw_input: json.raw_input ?? null,
          ai_summary: json.ai_summary ?? null,
          jurisdiction: json.jurisdiction ?? null,
          project_type: json.project_type ?? null,
          estimated_cost_low: json.estimated_cost_low ?? null,
          estimated_cost_high: json.estimated_cost_high ?? null,
        });
      } catch (e) {
        console.error('Project hydrate error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, column]);

  const flush = useCallback(async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      const res = await authedFetch('/api/v1/projects', {
        method: 'PATCH',
        body: JSON.stringify({ id: projectId, [column]: stateRef.current }),
      });
      if (res.ok) setLastSavedAt(Date.now());
    } catch (e) {
      console.error('Project autosave error:', e);
    } finally {
      setSaving(false);
    }
  }, [projectId, column]);

  const recordStepEvent = useCallback(
    (event: StepResult & { workflowId: string }) => {
      if (event.type === 'step_opened') return;
      const payload = payloadFromEvent(event);
      const isEmpty =
        !payload.value &&
        !payload.input &&
        (!payload.selected || payload.selected.length === 0) &&
        (!payload.checked || Object.keys(payload.checked).length === 0);

      if (event.type === 'step_skipped' || isEmpty) {
        const next = { ...stateRef.current };
        delete next[event.stepId];
        stateRef.current = next;
      } else {
        stateRef.current = { ...stateRef.current, [event.stepId]: payload };
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void flush(), debounceMs);
    },
    [debounceMs, flush]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (Object.keys(stateRef.current).length > 0) void flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    projectId: projectId ?? null,
    loading,
    hydratedPayloads,
    recordStepEvent,
    lastSavedAt,
    saving,
    project,
  };
}

// ─── useProjectStateBlob — for clients that don't use StepCard ───────────

interface UseProjectStateBlobArgs<T extends Record<string, unknown>> {
  column: StateColumn;
  workflowId: string;
  defaultValue: T;
  debounceMs?: number;
}

interface UseProjectStateBlobReturn<T> {
  projectId: string | null;
  loading: boolean;
  state: T;
  setState: (next: T | ((prev: T) => T)) => void;
  lastSavedAt: number | null;
  saving: boolean;
  project: ProjectContext | null;
}

export function useProjectStateBlob<T extends Record<string, unknown>>(
  args: UseProjectStateBlobArgs<T>
): UseProjectStateBlobReturn<T> {
  const { column, workflowId, defaultValue, debounceMs = 500 } = args;
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  const [state, setStateInner] = useState<T>(defaultValue);
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [loading, setLoading] = useState<boolean>(!!projectId);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const stateRef = useRef<T>(defaultValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (projectId) return;
    router.replace(
      `/killerapp?toast=needs-project&workflow=${encodeURIComponent(workflowId)}`
    );
  }, [projectId, router, workflowId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await authedFetch(
          `/api/v1/projects?id=${encodeURIComponent(projectId)}`
        );
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const json = (await res.json()) as ProjectStateColumns &
          Partial<ProjectContext>;
        const blob = (json[column] ?? {}) as Record<string, unknown>;
        if (cancelled) return;
        const merged = { ...defaultValue, ...blob } as T;
        stateRef.current = merged;
        setStateInner(merged);
        hasHydratedRef.current = true;
        setProject({
          id: (json.id as string) ?? projectId,
          name: json.name ?? null,
          raw_input: json.raw_input ?? null,
          ai_summary: json.ai_summary ?? null,
          jurisdiction: json.jurisdiction ?? null,
          project_type: json.project_type ?? null,
          estimated_cost_low: json.estimated_cost_low ?? null,
          estimated_cost_high: json.estimated_cost_high ?? null,
        });
      } catch (e) {
        console.error('Project blob hydrate error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, column]);

  const flush = useCallback(async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      const res = await authedFetch('/api/v1/projects', {
        method: 'PATCH',
        body: JSON.stringify({ id: projectId, [column]: stateRef.current }),
      });
      if (res.ok) setLastSavedAt(Date.now());
    } catch (e) {
      console.error('Project blob autosave error:', e);
    } finally {
      setSaving(false);
    }
  }, [projectId, column]);

  const setState = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === 'function'
          ? (next as (prev: T) => T)(stateRef.current)
          : next;
      stateRef.current = resolved;
      setStateInner(resolved);
      if (!hasHydratedRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void flush(), debounceMs);
    },
    [debounceMs, flush]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (hasHydratedRef.current) void flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    projectId: projectId ?? null,
    loading,
    state,
    setState,
    lastSavedAt,
    saving,
    project,
  };
}
