'use client';

/**
 * useArchitecturalStyle — read + persist a project's chosen architectural
 * direction (the Dream Machine "Choose your direction" picker).
 *
 * Persistence, in priority:
 *   1. DB (system of record) — the existing project-update path:
 *        GET  /api/v1/projects?id=…   reads `architectural_style`
 *        PATCH /api/v1/projects {id, architectural_style}   writes it
 *      (The PATCH route spreads `...updates`, GET does `select('*')`, so the
 *       additive `architectural_style` column flows through with no route
 *       change.) We FEATURE-DETECT the column from the GET response and only
 *       PATCH when it exists — so no doomed request fires before the migration
 *       (`20260616_architectural_style.sql`) is applied to prod.
 *   2. localStorage `bkg-arch-style:<projectId>` — written unconditionally, so
 *      "remembers across reload" holds TODAY for every project, including the
 *      fixture-only Folsom Street Fourplex (no DB row) and before the column
 *      lands. When the DB has a value it wins and is mirrored back to storage.
 *
 * Keyed by projectId so a `?project=` switch never bleeds one project's
 * direction onto another.
 */

import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '@/lib/authed-fetch';

const lsKey = (id: string) => `bkg-arch-style:${id}`;

function readLocal(projectId: string | null | undefined): string | null {
  if (typeof window === 'undefined' || !projectId) return null;
  try {
    return window.localStorage.getItem(lsKey(projectId));
  } catch {
    return null;
  }
}

export interface ArchitecturalStyleState {
  /** Chosen style slug, or null when the project hasn't chosen yet. */
  chosen: string | null;
  /** True until the first DB read resolves (localStorage already applied). */
  loading: boolean;
  /** True while a DB write is in flight. */
  saving: boolean;
  /** true = the DB column exists (durable write active); false/null = local-only. */
  dbBacked: boolean | null;
  /** Persist a choice (null clears it). */
  choose: (slug: string | null) => void;
}

export function useArchitecturalStyle(
  projectId: string | null | undefined,
): ArchitecturalStyleState {
  const [chosen, setChosen] = useState<string | null>(() => readLocal(projectId));
  const [loading, setLoading] = useState<boolean>(!!projectId);
  const [saving, setSaving] = useState(false);
  const [dbBacked, setDbBacked] = useState<boolean | null>(null);

  useEffect(() => {
    if (!projectId) {
      setChosen(null);
      setLoading(false);
      setDbBacked(null);
      return;
    }
    // Optimistic: show the locally-remembered pick instantly (no picker flash).
    setChosen(readLocal(projectId));
    setDbBacked(null);
    setLoading(true);

    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch(`/api/v1/projects?id=${encodeURIComponent(projectId)}`);
        if (cancelled) return;
        if (res.ok) {
          const json = (await res.json()) as Record<string, unknown> | null;
          const hasColumn =
            !!json && Object.prototype.hasOwnProperty.call(json, 'architectural_style');
          setDbBacked(hasColumn);
          const dbVal = hasColumn ? (json!.architectural_style as string | null) : null;
          if (dbVal) {
            // DB is the system of record — adopt it and mirror to storage.
            setChosen(dbVal);
            try {
              window.localStorage.setItem(lsKey(projectId), dbVal);
            } catch {
              /* storage unavailable — DB value still shown */
            }
          }
        } else {
          // 404 (fixture project with no row) / 401 (anon) → local-only.
          setDbBacked(false);
        }
      } catch {
        setDbBacked(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const choose = useCallback(
    (slug: string | null) => {
      if (!projectId) return;
      setChosen(slug); // optimistic
      try {
        if (slug) window.localStorage.setItem(lsKey(projectId), slug);
        else window.localStorage.removeItem(lsKey(projectId));
      } catch {
        /* storage unavailable — DB write below still carries it when active */
      }
      // Durable write via the existing project-update path — only when the
      // column exists, so no doomed PATCH fires pre-migration. localStorage
      // already guarantees persistence regardless.
      if (dbBacked === true) {
        setSaving(true);
        authedFetch('/api/v1/projects', {
          method: 'PATCH',
          body: JSON.stringify({ id: projectId, architectural_style: slug }),
        })
          .catch(() => {
            /* localStorage carries it; surface stays consistent */
          })
          .finally(() => {
            setSaving(false);
          });
      }
    },
    [projectId, dbBacked],
  );

  return { chosen, loading, saving, dbBacked, choose };
}
