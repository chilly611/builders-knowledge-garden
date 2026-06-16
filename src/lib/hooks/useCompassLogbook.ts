'use client';

/**
 * useCompassLogbook — the "daily logbook" half of the compass TODAY bloom.
 *
 * Reads/writes the persisted `daily_log_state` JSONB column (Decision #21)
 * for the active project, using the SAME `/api/v1/projects` GET/PATCH
 * contract that `useProjectWorkflowState` (the q15 Voice-to-Daily-Log
 * workflow) uses. Entries therefore persist server-side and survive reload.
 *
 * Why a dedicated hook instead of reusing useProjectWorkflowState /
 * useProjectStateBlob: those hooks REDIRECT to /killerapp?toast=needs-project
 * when there's no ?project= in the URL. That's correct for a workflow PAGE,
 * but catastrophic for a persistent chrome element — the compass would hijack
 * the user's navigation. This hook is side-effect-free: no project → honest
 * empty state, never a redirect.
 *
 * Collision-safety: the logbook lives under a single dedicated key
 * (`compass-logbook`) INSIDE `daily_log_state`. Writes read-merge-write the
 * whole column so the q15 workflow's step payloads are preserved, never
 * clobbered.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { authedFetch } from '@/lib/authed-fetch';
import {
  LOGBOOK_KEY,
  mergeLogbookEntries,
  parseLogbookEntries,
  type DailyLogState,
  type LogbookEntry,
} from '@/lib/daily-log-state';

// Re-export the pure helpers so consumers keep a single import surface. The
// read/merge logic itself lives in the dependency-free daily-log-state module
// (unit-tested there).
export { LOGBOOK_KEY, mergeLogbookEntries, parseLogbookEntries };
export type { LogbookEntry };

export type LogbookStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseCompassLogbook {
  entries: LogbookEntry[];
  status: LogbookStatus;
  saving: boolean;
  saveError: string | null;
  /** Append a new dated entry; resolves true on durable persist, false otherwise. */
  addEntry: (text: string) => Promise<boolean>;
}

/**
 * @param projectId active project id (from useStageProject) — null disables.
 * @param enabled   only fetch/write when the panel is actually shown.
 */
export function useCompassLogbook(
  projectId: string | null,
  enabled: boolean
): UseCompassLogbook {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [status, setStatus] = useState<LogbookStatus>('idle');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The full daily_log_state as last seen from the server, kept so writes can
  // read-merge-write without clobbering other workflows' keys.
  const fullStateRef = useRef<DailyLogState>({});

  useEffect(() => {
    if (!enabled || !projectId) {
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setSaveError(null);
    (async () => {
      try {
        const res = await authedFetch(`/api/v1/projects?id=${encodeURIComponent(projectId)}`);
        if (!res.ok) {
          if (!cancelled) setStatus('error');
          return;
        }
        const json = (await res.json()) as { daily_log_state?: DailyLogState };
        const dls = (json.daily_log_state ?? {}) as DailyLogState;
        if (cancelled) return;
        fullStateRef.current = dls;
        setEntries(parseLogbookEntries(dls));
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, enabled]);

  const addEntry = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || !projectId) return false;
      setSaving(true);
      setSaveError(null);
      const entry: LogbookEntry = { at: new Date().toISOString(), text: trimmed };
      const next = [...entries, entry];
      try {
        const res = await authedFetch('/api/v1/projects', {
          method: 'PATCH',
          body: JSON.stringify({
            id: projectId,
            daily_log_state: mergeLogbookEntries(fullStateRef.current, next),
          }),
        });
        if (res.status === 401) {
          setSaveError('Sign in to keep your log.');
          return false;
        }
        if (!res.ok) {
          setSaveError("Couldn't save — try again.");
          return false;
        }
        // Persisted. Commit locally so the displayed list == the durable list.
        fullStateRef.current = mergeLogbookEntries(fullStateRef.current, next);
        setEntries(next);
        return true;
      } catch {
        setSaveError("Couldn't save — check your connection.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [entries, projectId]
  );

  return { entries, status, saving, saveError, addEntry };
}
