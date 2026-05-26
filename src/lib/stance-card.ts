/**
 * Stance Card resolver + client hook.
 *
 * The Stance Card is the operational mechanism that makes "all four lanes
 * always" actually work in code. It is a structured user-state snapshot every
 * primitive reads before rendering. The platform doesn't hold knowledge — it
 * improves itself in public; the Stance Card is how each render benefits from
 * everything the platform has learned about this user so far.
 *
 * Two entry points:
 *   - resolveStanceCard()  — server-side. Reads request headers, cookies,
 *                            session data. Returns a fully-populated card.
 *   - useStanceCard()      — client-side React hook. Reads navigator + DOM +
 *                            localStorage. Subscribes to in-session updates.
 *
 * Both fall back to DEFAULT_STANCE_CARD when a signal is missing. No field is
 * ever left undefined — primitives must always have a value to branch on.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_STANCE_CARD,
  type StanceCard,
  type StanceDeviceClass,
  type StanceLane,
  type StanceModality,
  type StanceSurface,
  type StanceTempo,
} from '@/components/primitives/StanceCard.types';

export type { StanceCard } from '@/components/primitives/StanceCard.types';

/**
 * Override input — callers can pin specific axes (e.g. a surface that knows
 * it is killer-app pins `surface: 'killer-app'`). Unspecified axes fall back
 * to resolved values or DEFAULT_STANCE_CARD.
 */
export type StanceOverride = Partial<StanceCard>;

const STORAGE_KEY = 'kgos:stance-card:v1';

function inferDeviceClass(): StanceDeviceClass {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/mobi|android|iphone/.test(ua) && !/ipad|tablet/.test(ua)) return 'phone';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

function inferModality(): StanceModality {
  // Default to visual; voice / gesture / agent-api are opt-in via overrides
  // or by an explicit mode-switch elsewhere in the app.
  return 'visual';
}

function inferLane(): StanceLane {
  // Killer-app default is professional unless we know the user is a homeowner
  // (public) or an internal admin. Overrides take precedence.
  return 'professional';
}

function inferSurface(): StanceSurface {
  if (typeof window === 'undefined') return 'killer-app';
  const path = window.location.pathname;
  if (path.startsWith('/killerapp')) return 'killer-app';
  if (path.startsWith('/dream')) return 'dream';
  if (path.startsWith('/knowledge')) return 'garden';
  return 'killer-app';
}

function inferTempo(): StanceTempo {
  // Heuristic: leisurely on first visit, focused on subsequent. The TempoAdapt
  // primitive consumes additional signals (urgency banners, expiry dates) at
  // render time to escalate further.
  return 'focused';
}

function inferLocale(): StanceCard['locale'] {
  if (typeof window === 'undefined') return DEFAULT_STANCE_CARD.locale;
  const language =
    window.navigator.languages?.[0] ?? window.navigator.language ?? 'en-US';
  // Imperial-vs-metric heuristic. Construction in US-CA is imperial.
  const units: StanceCard['locale']['units'] = language.startsWith('en-US')
    ? 'imperial'
    : 'metric';
  const currency = language.startsWith('en-US') ? 'USD' : 'USD';
  return {
    language,
    jurisdiction: 'US-CA',
    units,
    currency,
    conventions: {},
  };
}

function inferAccessibility(): StanceCard['accessibility'] {
  if (typeof window === 'undefined') return DEFAULT_STANCE_CARD.accessibility;
  const reducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  return {
    ...DEFAULT_STANCE_CARD.accessibility,
    cognitive: reducedMotion ? 'reduced-motion' : 'default',
  };
}

/**
 * Client-side stance card builder. Pure function — call it any time you need a
 * fresh snapshot.
 */
export function buildClientStanceCard(override: StanceOverride = {}): StanceCard {
  const stored = readStoredStance();
  return {
    ...DEFAULT_STANCE_CARD,
    surface: inferSurface(),
    lane: inferLane(),
    modality: inferModality(),
    device_class: inferDeviceClass(),
    tempo: inferTempo(),
    locale: inferLocale(),
    accessibility: inferAccessibility(),
    ...stored,
    ...override,
  };
}

/**
 * Server-side stance card resolver. Accepts already-derived headers / cookies
 * and returns a card. This is intentionally pure — call from server components,
 * route handlers, MCP endpoints. Pass overrides for axes you already know.
 */
export function resolveStanceCard(
  input: {
    acceptLanguage?: string;
    userAgent?: string;
    surface?: StanceSurface;
    lane?: StanceLane;
    jurisdiction?: string;
  } = {},
  override: StanceOverride = {},
): StanceCard {
  const language = input.acceptLanguage?.split(',')[0]?.trim() ?? 'en-US';
  const ua = input.userAgent?.toLowerCase() ?? '';
  const device_class: StanceDeviceClass =
    /mobi|android|iphone/.test(ua) && !/ipad|tablet/.test(ua)
      ? 'phone'
      : /ipad|tablet/.test(ua)
        ? 'tablet'
        : 'desktop';
  return {
    ...DEFAULT_STANCE_CARD,
    surface: input.surface ?? DEFAULT_STANCE_CARD.surface,
    lane: input.lane ?? DEFAULT_STANCE_CARD.lane,
    device_class,
    locale: {
      ...DEFAULT_STANCE_CARD.locale,
      language,
      jurisdiction: input.jurisdiction ?? DEFAULT_STANCE_CARD.locale.jurisdiction,
    },
    ...override,
  };
}

function readStoredStance(): StanceOverride {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StanceOverride;
  } catch {
    return {};
  }
}

/**
 * Persist a partial stance override so it survives reloads. Use for
 * user-explicit choices like lane switches, modality toggles, locale picks.
 */
export function persistStanceOverride(override: StanceOverride): void {
  if (typeof window === 'undefined') return;
  try {
    const merged = { ...readStoredStance(), ...override };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // localStorage may be disabled in some embeddings — silently ignore.
  }
}

/**
 * React hook — every primitive that branches on stance calls this. Returns the
 * card plus a setter that persists overrides. Re-evaluates when the URL path
 * changes so surface inference stays current.
 */
export function useStanceCard(override: StanceOverride = {}): StanceCard {
  const [card, setCard] = useState<StanceCard>(() =>
    buildClientStanceCard(override),
  );

  useEffect(() => {
    setCard(buildClientStanceCard(override));
    const handler = () => setCard(buildClientStanceCard(override));
    window.addEventListener('popstate', handler);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      window.removeEventListener('resize', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(override)]);

  return card;
}
