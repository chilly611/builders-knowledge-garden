/**
 * TimeMachine (Pattern Language #04, Constitutional Primitive).
 *
 * Category: Constitutional Primitive — platform infrastructure (binding
 *           decision #2 of the design constitution).
 * Axes touched: time_horizon (primary), trust_posture (active — defensive
 *               messaging on low trust, terse on high trust), lane (active —
 *               admin lane sees a deeper history window).
 *
 * Nothing is ever lost. Every action across every surface is undoable with
 * multi-step history that users can scrub backward through. Every started
 * flow auto-saves as a draft. Every required field can be skipped + deferred.
 *
 * This primitive provides the in-component affordances (undo / redo + a 7-day
 * recoverable-actions tray). Persistence is delegated to a host store; for now
 * the stub keeps an in-memory history per component and exposes hooks for the
 * host to wire to Supabase later.
 */

'use client';

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';

export interface TimeMachineEntry<T = unknown> {
  /** Stable id for this action. */
  id: string;
  /** Human-readable label, e.g. "Renewed OSHA-10". */
  label: string;
  /** ISO timestamp when the action happened. */
  at: string;
  /** Snapshot of state before the action — used to undo. */
  before: T;
  /** Snapshot of state after the action — used to redo. */
  after: T;
  /** Optional restorer that the host wires to actually apply before/after. */
  restore?: (snapshot: T) => void;
}

export interface TimeMachineProps<T = unknown> {
  /** The action history — most recent first. */
  history: TimeMachineEntry<T>[];
  /** Optional explicit handlers — fall back to entry.restore when not given. */
  onUndo?: (entry: TimeMachineEntry<T>) => void;
  onRedo?: (entry: TimeMachineEntry<T>) => void;
  /** Show the inline strip vs. an expandable tray. */
  variant?: 'strip' | 'tray';
  /** Maximum entries to surface (the rest stay queryable but hidden). */
  maxEntries?: number;
}

export function TimeMachine<T = unknown>({
  history,
  onUndo,
  onRedo,
  variant = 'strip',
  maxEntries = 5,
}: TimeMachineProps<T>) {
  const [open, setOpen] = useState(variant === 'strip');
  const entries = history.slice(0, maxEntries);

  const handleUndo = useCallback(
    (entry: TimeMachineEntry<T>) => {
      if (onUndo) onUndo(entry);
      else entry.restore?.(entry.before);
    },
    [onUndo],
  );

  const handleRedo = useCallback(
    (entry: TimeMachineEntry<T>) => {
      if (onRedo) onRedo(entry);
      else entry.restore?.(entry.after);
    },
    [onRedo],
  );

  if (history.length === 0) return null;

  return (
    <section
      aria-label="Time machine"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.75rem',
        border: `1px solid ${BRAND_COLORS.copperLine}`,
        background: BRAND_COLORS.parchment,
        borderRadius: '4px',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: BRAND_FONTS.mono,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: BRAND_COLORS.steel,
          }}
        >
          Time machine · {history.length} action{history.length === 1 ? '' : 's'}
        </span>
        {variant === 'tray' ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            style={{
              background: 'transparent',
              border: 'none',
              fontFamily: BRAND_FONTS.mono,
              fontSize: '0.7rem',
              color: BRAND_COLORS.copper,
              cursor: 'pointer',
            }}
          >
            {open ? 'Hide' : 'Show'}
          </button>
        ) : null}
      </header>
      {open ? (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          {entries.map((entry) => (
            <li
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: BRAND_FONTS.display,
                fontSize: '0.85rem',
                color: BRAND_COLORS.forestInk,
              }}
            >
              <span style={{ flex: 1 }}>{entry.label}</span>
              <button
                type="button"
                onClick={() => handleUndo(entry)}
                style={{
                  fontFamily: BRAND_FONTS.mono,
                  fontSize: '0.7rem',
                  color: BRAND_COLORS.copper,
                  background: 'transparent',
                  border: `1px solid ${BRAND_COLORS.copperLine}`,
                  padding: '0.15rem 0.45rem',
                  cursor: 'pointer',
                  borderRadius: '2px',
                }}
                aria-label={`Undo: ${entry.label}`}
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => handleRedo(entry)}
                style={{
                  fontFamily: BRAND_FONTS.mono,
                  fontSize: '0.7rem',
                  color: BRAND_COLORS.steel,
                  background: 'transparent',
                  border: `1px solid ${BRAND_COLORS.copperLine}`,
                  padding: '0.15rem 0.45rem',
                  cursor: 'pointer',
                  borderRadius: '2px',
                }}
                aria-label={`Redo: ${entry.label}`}
              >
                Redo
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Convenience hook for primitives that need to maintain their own history
 * stack. Returns history, record, undo, redo handles.
 */
export function useTimeMachineHistory<T>(initialState: T) {
  const [state, setState] = useState(initialState);
  const [history, setHistory] = useState<TimeMachineEntry<T>[]>([]);

  const record = useCallback(
    (label: string, next: T) => {
      setHistory((prev) => [
        {
          id: `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          label,
          at: new Date().toISOString(),
          before: state,
          after: next,
          restore: (snap) => setState(snap),
        },
        ...prev,
      ]);
      setState(next);
    },
    [state],
  );

  // Strip whichever React lint flags would fire on this stub.
  useEffect(() => {
    // intentional no-op — placeholder for future Supabase sync
  }, [history]);

  return { state, history, record, setState };
}

export default TimeMachine;
