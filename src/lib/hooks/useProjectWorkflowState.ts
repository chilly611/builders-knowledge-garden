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
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { StepResult } from '@/design-system/components/StepCard.types';

// localStorage key that stores the most-recently-active project id. Set by
// KillerappProjectShell whenever the user lands on /killerapp?project=<id>.
// Read here so a workflow page that's hit without ?project= in the URL
// (e.g. user clicks "Quick estimate" from bare /killerapp) can rescue the
// active project context instead of bouncing the user back home.
const ACTIVE_PROJECT_KEY = 'bkg-active-project';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readActiveProjectFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!raw) return null;
    if (!UUID_REGEX.test(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

function withProjectQuery(pathname: string, projectId: string): string {
  const sep = pathname.includes('?') ? '&' : '?';
  return `${pathname}${sep}project=${encodeURIComponent(projectId)}`;
}

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
  // Wave 2 (2026-05-06 morning) — q8/q15/q11 wiring
  permits_state?: Record<string, StepPayload>;
  daily_log_state?: Record<string, StepPayload>;
  supply_ordering_state?: Record<string, StepPayload>;
  // Wave 3 (2026-05-06 afternoon) — remaining 11 workflows
  job_sequencing_state?: Record<string, StepPayload>;
  worker_count_state?: Record<string, StepPayload>;
  sub_management_state?: Record<string, StepPayload>;
  equipment_state?: Record<string, StepPayload>;
  services_todos_state?: Record<string, StepPayload>;
  hiring_state?: Record<string, StepPayload>;
  weather_scheduling_state?: Record<string, StepPayload>;
  osha_toolbox_state?: Record<string, StepPayload>;
  expenses_state?: Record<string, StepPayload>;
  outreach_state?: Record<string, StepPayload>;
  compass_nav_state?: Record<string, StepPayload>;
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

// ─────────────────────────────────────────────────────────────────────────────
// Smart pre-fill — parse location + sqft from raw_input
// ─────────────────────────────────────────────────────────────────────────────
// User feedback 2026-05-06: "On quick estimate I shouldn't have to answer
// the questions of where is the location or square footage if I already
// put those in." So when raw_input mentions a location ("San Diego",
// "Tampa, FL") or a square footage ("2500 sf", "3,200 square feet"),
// auto-fill the matching workflow steps AND mark them complete so the
// XP counts.

const LOCATION_REGEX =
  // Matches "in <City>" or "in <City>, <State>" or " <City>, <State>"
  // Tries to capture proper-noun-style locations. Conservative on
  // matching — if uncertain, returns null and we leave the field empty.
  /\b(?:in|at|near)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s*,\s*[A-Z]{2})?)\b/;

const SQFT_REGEX =
  // Matches "2500 sf", "2,500 sq ft", "3200 square feet", "1500sqft"
  /\b([\d,]+)\s*(?:sf|sqft|sq\s?ft|square\s?(?:feet|foot|ft))\b/i;

export interface ParsedFromRaw {
  location?: string;
  sqft?: string;
}

export function parseLocationAndSqftFromRaw(raw: string): ParsedFromRaw {
  const out: ParsedFromRaw = {};
  const locMatch = raw.match(LOCATION_REGEX);
  if (locMatch) out.location = locMatch[1].trim();
  const sqftMatch = raw.match(SQFT_REGEX);
  if (sqftMatch) out.sqft = sqftMatch[1].replace(/,/g, '');
  return out;
}

/**
 * Given a workflow's steps + a project's raw_input, build a map of
 * stepId → seeded StepPayload. Handles:
 *   - text_input / voice_input         → { value: raw_input }
 *   - analysis_result                  → { input: raw_input }
 *   - location_input                   → { value: parsed location }
 *   - number_input + label match sqft  → { value: parsed sqft }
 *
 * Steps that already have a saved payload in `existing` are left alone
 * (saved values win over seeds). Returns the merged map.
 */
export function seedPayloadsFromRaw(
  steps: Array<{ id: string; type: string; label?: string }>,
  rawInput: string | null | undefined,
  existing: Record<string, StepPayload>
): Record<string, StepPayload> {
  const out = { ...existing };
  const raw = rawInput?.trim();
  if (!raw) return out;

  const parsed = parseLocationAndSqftFromRaw(raw);
  const labelHintsSqft = (label?: string) =>
    !!label && /\b(square|sqft|sq\s?ft|footage|size|area)\b/i.test(label);

  for (const step of steps) {
    if (out[step.id]) continue; // saved values win
    if (step.type === 'text_input' || step.type === 'voice_input') {
      out[step.id] = { value: raw };
    } else if (step.type === 'analysis_result') {
      out[step.id] = { input: raw };
    } else if (step.type === 'location_input' && parsed.location) {
      out[step.id] = { value: parsed.location };
    } else if (step.type === 'number_input' && parsed.sqft && labelHintsSqft(step.label)) {
      out[step.id] = { value: parsed.sqft };
    }
  }
  return out;
}

/**
 * Mark every seeded step as 'complete' in the status map. This is what
 * gives the user the "XP credit" for project context they already
 * provided in raw_input. Saved-state steps stay 'complete' (they were
 * already marked by the workflow client). Skipped steps stay 'pending'.
 *
 * 2026-05-07 trust-fix: analysis_result steps seed with `{ input: raw }`
 * (the raw_input is fed to the specialist as a starting point). They
 * STAY pending until the specialist actually runs — otherwise a fresh q5
 * project shows "7 of 7 complete" before any code lookups have happened.
 * We detect analysis_result-style seeds by the payload shape: `input` set,
 * `value` empty, no selections/checks. text_input / voice_input /
 * location_input / number_input seeds keep their auto-complete behavior.
 */
export function statusFromSeeded(
  seeded: Record<string, StepPayload>,
  existingStatus: Record<string, 'pending' | 'in_progress' | 'complete'>
): Record<string, 'pending' | 'in_progress' | 'complete'> {
  const out = { ...existingStatus };
  for (const stepId of Object.keys(seeded)) {
    if (out[stepId]) continue;
    const p = seeded[stepId];
    const isAnalysisSeed =
      !!p.input &&
      !p.value &&
      (!p.selected || p.selected.length === 0) &&
      (!p.checked || Object.keys(p.checked).length === 0);
    if (isAnalysisSeed) continue; // specialist still needs to run
    out[stepId] = 'complete';
  }
  return out;
}

export function useProjectWorkflowState(
  args: UseProjectWorkflowStateArgs
): UseProjectWorkflowStateReturn {
  const { column, workflowId, debounceMs = 500 } = args;
  const router = useRouter();
  const pathname = usePathname();
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

  // 2026-05-06: When the user clicks a workflow CTA from bare /killerapp
  // (no ?project= in URL), rescue the active project from localStorage and
  // redirect to the SAME workflow with the id appended. Only bounce the
  // user back home when there's truly no active project to fall back on.
  useEffect(() => {
    if (projectId) return;
    const fallback = readActiveProjectFromStorage();
    if (fallback) {
      router.replace(withProjectQuery(pathname, fallback));
      return;
    }
    router.replace(
      `/killerapp?toast=needs-project&workflow=${encodeURIComponent(workflowId)}`
    );
  }, [projectId, router, pathname, workflowId]);

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
  const pathname = usePathname();
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

  // Same rescue-from-localStorage pattern as useProjectWorkflowState above.
  useEffect(() => {
    if (projectId) return;
    const fallback = readActiveProjectFromStorage();
    if (fallback) {
      router.replace(withProjectQuery(pathname, fallback));
      return;
    }
    router.replace(
      `/killerapp?toast=needs-project&workflow=${encodeURIComponent(workflowId)}`
    );
  }, [projectId, router, pathname, workflowId]);

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
