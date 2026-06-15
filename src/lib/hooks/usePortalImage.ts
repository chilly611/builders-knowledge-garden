'use client';

/**
 * usePortalImage — the client-side portal flow shared by every surface that
 * shows work-in-progress imagery (Builder B2 hero, Dream studies, field-log
 * thumbs). Spec: docs/design/seed-and-portals.md.
 *
 * Flow (Decision 18, visual-first — never an empty placeholder):
 *   1. INSTANT: show the archetype-matched seed asset (or, if none is staged,
 *      the guaranteed concept-sketch fallback). Derived purely from inputs, so
 *      it can never bleed across a ?project= switch.
 *   2. Request a per-project render via POST /api/v1/render and swap it in.
 *   3. GUARANTEED: if the render fails (unconfigured / rate-limited / timeout)
 *      we keep the seed/fallback; if the displayed image 404s (a seed not yet
 *      staged, or an expired render URL) onError degrades to the data-URI
 *      fallback, which never 404s.
 *
 * No bleed: async results (the render URL, the error flag) are keyed to the
 * exact active inputs. When ?project= changes, `key` changes, the in-flight
 * request is aborted, and `src` falls back to the new project's seed in the
 * same render — a stale render from the previous project can never display.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  portalRenderBody,
  seedSlugFor,
  seedAssetUrl,
  portalFallbackSrc,
  type Archetype,
  type PortalInputs,
} from '@/lib/portal-imagery';

export type PortalPhase = 'seed' | 'rendering' | 'render' | 'fallback';

export interface UsePortalImageArgs extends PortalInputs {
  /** Active project id — flips the portal with no bleed when it changes. */
  projectId?: string | null;
  archetype?: Archetype;
  /** When false, skip the live render (seed/fallback only). Default true. */
  live?: boolean;
}

export interface PortalImage {
  /** The current image src (seed URL, render URL, or data-URI fallback). */
  src: string;
  phase: PortalPhase;
  isRendering: boolean;
  /** Attach to <img onError>: degrades a 404'd seed / expired render to the fallback. */
  onError: () => void;
}

export function usePortalImage(args: UsePortalImageArgs): PortalImage {
  const {
    projectId,
    archetype,
    live = true,
    kind,
    buildingType,
    location,
    style,
    stage,
    progress,
  } = args;

  const inputs: PortalInputs = { kind, buildingType, location, style, stage, progress };

  // Base image: derived purely from inputs every render → bleed-proof.
  const seedUrl = seedAssetUrl(seedSlugFor(inputs, { archetype, variantKey: `${projectId ?? ''}:${kind}` }));
  const fallback = portalFallbackSrc(
    inputs,
    `${projectId ?? ''}:${kind}:${buildingType ?? ''}:${location ?? ''}:${style ?? ''}`,
  );
  const base = seedUrl ?? fallback;

  // One key that captures the full active-input identity.
  const key = [projectId, kind, buildingType, location, style, stage, progress, archetype, live].join('|');

  const [rendered, setRendered] = useState<{ key: string; url: string } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [renderingKey, setRenderingKey] = useState<string | null>(null);

  useEffect(() => {
    // Nothing meaningful to render yet, or live render disabled → seed/fallback only.
    if (!live || (!buildingType && !location)) {
      setRenderingKey(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    setRenderingKey(key);

    (async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {
          /* anonymous renders are allowed under a tighter server cap */
        }
        const res = await fetch('/api/v1/render', {
          method: 'POST',
          headers,
          body: JSON.stringify(portalRenderBody(inputs)),
          signal: controller.signal,
        });
        if (!res.ok) return; // keep seed/fallback — server already chose the honest code
        const data = await res.json();
        const url: string | undefined = (data?.renders || [])
          .map((r: { imageUrl?: string }) => r.imageUrl)
          .find(Boolean);
        if (url && !cancelled) setRendered({ key, url });
      } catch {
        /* keep seed/fallback */
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setRenderingKey((k) => (k === key ? null : k));
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
    // `inputs` and the individual fields are all captured by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const showFallback = failedKey === key;
  const src = showFallback ? fallback : rendered?.key === key ? rendered.url : base;
  const isRendering = renderingKey === key && rendered?.key !== key && !showFallback;
  const phase: PortalPhase = showFallback
    ? 'fallback'
    : rendered?.key === key
      ? 'render'
      : isRendering
        ? 'rendering'
        : seedUrl
          ? 'seed'
          : 'fallback';

  return { src, phase, isRendering, onError: () => setFailedKey(key) };
}
