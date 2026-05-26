/**
 * CrossSurfaceBridge (Pattern Language #18, Dimensional Rendering).
 *
 * Category: Dimensional Rendering.
 * Axes touched: surface (primary — bridges between garden/dream/killer-app),
 *               lane (active — bridges respect lane gates), time_horizon
 *               (active — bridges may carry project context).
 *
 * Context flows Dream → Garden → Killer App without retyping. The primitive
 * is a typed handoff envelope. Caller serializes the bridge payload; the
 * receiving surface deserializes via the same envelope.
 *
 * Persistence: sessionStorage by bridgeId. WS3 will replace with server-side
 * project context once Supabase wiring lands.
 */

'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import type { StanceSurface } from './StanceCard.types';

export interface BridgePayload<T = unknown> {
  /** Stable id so the receiving surface can pull the right payload. */
  bridgeId: string;
  /** Originating surface — for analytics + back-link rendering. */
  origin: StanceSurface;
  /** Destination surface. */
  destination: StanceSurface;
  /** Human-readable label e.g. "Continue this sketch in the Project Pipeline". */
  label: string;
  /** Caller-defined payload — typed by the consumer. */
  data: T;
  /** ISO timestamp of creation. */
  createdAt: string;
}

const STORAGE_KEY_PREFIX = 'kgos:bridge:';

export function persistBridge<T>(payload: BridgePayload<T>): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY_PREFIX + payload.bridgeId,
      JSON.stringify(payload),
    );
  } catch {
    /* sessionStorage disabled */
  }
}

export function readBridge<T>(bridgeId: string): BridgePayload<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY_PREFIX + bridgeId);
    if (!raw) return null;
    return JSON.parse(raw) as BridgePayload<T>;
  } catch {
    return null;
  }
}

export interface CrossSurfaceBridgeProps<T = unknown> {
  /** Bridge payload to surface. */
  payload: BridgePayload<T>;
  /** Click handler — typically a router.push to the destination. */
  onCross?: (payload: BridgePayload<T>) => void;
  /** Render variant. */
  variant?: 'inline' | 'banner';
}

export function CrossSurfaceBridge<T>({
  payload,
  onCross,
  variant = 'inline',
}: CrossSurfaceBridgeProps<T>) {
  // Auto-persist on mount so the destination can pick it up.
  useEffect(() => {
    persistBridge(payload);
  }, [payload]);

  const banner = variant === 'banner';

  return (
    <button
      type="button"
      onClick={() => onCross?.(payload)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: banner ? '0.85rem 1rem' : '0.45rem 0.75rem',
        background: BRAND_COLORS.parchmentWarm,
        border: `1px solid ${BRAND_COLORS.copperLine}`,
        borderRadius: '4px',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: BRAND_FONTS.display,
        color: BRAND_COLORS.forestInk,
        width: banner ? '100%' : undefined,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: BRAND_FONTS.mono,
          fontSize: '0.7rem',
          color: BRAND_COLORS.copper,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {payload.origin} → {payload.destination}
      </span>
      <span style={{ flex: 1 }}>{payload.label}</span>
      <span aria-hidden="true" style={{ color: BRAND_COLORS.copper }}>
        →
      </span>
    </button>
  );
}

/**
 * Hook to consume a bridge on mount. Returns the payload (or null) and a
 * clear() helper to clean up after handoff.
 */
export function useBridge<T>(bridgeId: string) {
  const [payload, setPayload] = useState<BridgePayload<T> | null>(null);
  useEffect(() => {
    setPayload(readBridge<T>(bridgeId));
  }, [bridgeId]);
  const clear = () => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(STORAGE_KEY_PREFIX + bridgeId);
    } catch {
      /* sessionStorage disabled */
    }
    setPayload(null);
  };
  return { payload, clear };
}

export default CrossSurfaceBridge;
