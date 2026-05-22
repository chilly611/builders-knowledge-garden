/**
 * useRealtimeChannel — REALTIME (2026-05-22)
 * ============================================
 * Thin wrapper around Supabase realtime postgres_changes. The cockpit and
 * its workflow pages drop this in to live-refresh whenever the underlying
 * Postgres rows change — no page refresh, no manual polling.
 *
 * Contract:
 *   - SSR-safe: all subscriptions happen inside useEffect, so the import
 *     never touches the Supabase client on the server.
 *   - RLS-respecting: realtime broadcasts ONLY rows the authenticated user
 *     can already SELECT. We don't need a second authz layer.
 *   - Clean unmount: removeChannel(channel) on cleanup so we don't leak
 *     websocket subscriptions against the Supabase quota (~500/project on
 *     the free tier — easy to blow through with a multi-tab user).
 *   - Debounce: callers that fire on UPDATE storms (budget autosave,
 *     payment splits) should wrap their refetch in their own 500ms debounce.
 *     The hook itself is intentionally unopinionated about that — callbacks
 *     fire on every event.
 *
 * Filter syntax mirrors Supabase's postgres_changes filter format:
 *   'project_id=eq.<uuid>'
 *   'project_id=in.(<uuid1>,<uuid2>)'
 *   'status=neq.draft'
 *
 * Usage:
 *   useRealtimeChannel(
 *     { table: 'sub_bids', filter: `project_id=in.(${ids.join(',')})` },
 *     (payload) => { refetch(); }
 *   );
 */

import { useEffect, useRef } from 'react';
import type {
  RealtimePostgresChangesPayload,
  RealtimeChannel,
  SupabaseClient,
} from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * The generic parameter must satisfy supabase-js's `{[key:string]: any}`
 * constraint on RealtimePostgresChangesPayload — use `any` here rather than
 * `unknown` so call sites can pass their own typed row interfaces.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChangeHandler<T extends { [key: string]: any } = { [key: string]: any }> = (
  payload: RealtimePostgresChangesPayload<T>,
) => void;

export interface UseRealtimeOpts {
  /** Postgres table name (assumed public schema). */
  table: string;
  /** Optional postgres_changes filter — e.g. 'project_id=eq.55730...'. */
  filter?: string;
  /** Which DML events to listen for. Defaults to all. */
  events?: RealtimeEvent[];
  /**
   * Optional channel name. Each unique channel name multiplexes onto one
   * websocket; if two hooks share the same channel name, they collide.
   * Default: `realtime-<table>-<filter or 'all'>`.
   */
  channelName?: string;
  /**
   * Disable the subscription entirely. Useful when projectId isn't known
   * yet (don't subscribe to a filter that resolves to "project_id=eq.null").
   */
  enabled?: boolean;
}

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'errored'
  | 'closed';

export interface UseRealtimeChannelResult {
  /** Best-effort connection state for footer indicators / toasts. */
  state: ConnectionState;
}

/**
 * Pure helper — wires a Supabase realtime channel for the given table.
 * Returns an unsubscribe function. Extracted from the hook so it's directly
 * unit-testable without spinning up React renderers.
 *
 * `getHandler` is invoked at event-fire time so the effect can latch the
 * latest callback (via useRef) without needing to re-subscribe.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function subscribeRealtime<T extends { [key: string]: any } = { [key: string]: any }>(
  client: Pick<SupabaseClient, 'channel' | 'removeChannel'>,
  opts: UseRealtimeOpts,
  getHandler: () => ChangeHandler<T>,
): () => void {
  if (opts.enabled === false) return () => {};

  const channelName =
    opts.channelName || `realtime-${opts.table}-${opts.filter || 'all'}`;
  const channel: RealtimeChannel = client.channel(channelName);
  const events: RealtimeEvent[] = opts.events ?? ['*'];

  for (const event of events) {
    // Supabase's typings here aren't strict enough to satisfy generic T —
    // cast through unknown to keep the call site type-safe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      event,
      schema: 'public',
      table: opts.table,
    };
    if (opts.filter) config.filter = opts.filter;

    // `config` is typed as `any` above so the postgres_changes overload
    // resolves; the runtime shape is what supabase-js expects.
    channel.on(
      'postgres_changes',
      config,
      (payload: RealtimePostgresChangesPayload<T>) => getHandler()(payload),
    );
  }

  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

/**
 * Subscribe to postgres_changes for a single table. Returns nothing today —
 * callers handle the payload through `onChange`. Future enhancement: surface
 * connection state via a ref so a footer dot can render "Live" vs
 * "Reconnecting…" without each consumer rewriting the boilerplate.
 *
 * Safe to pass an inline `onChange` — the hook latches the latest callback
 * through a ref so the websocket isn't churned on every render.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealtimeChannel<T extends { [key: string]: any } = { [key: string]: any }>(
  opts: UseRealtimeOpts,
  onChange: ChangeHandler<T>,
): void {
  const handlerRef = useRef(onChange);
  handlerRef.current = onChange;

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR safety
    return subscribeRealtime<T>(supabase, opts, () => handlerRef.current);
  }, [
    opts.table,
    opts.filter,
    opts.channelName,
    opts.enabled,
    // events is an array — stringify to a stable key so we don't re-subscribe
    // on every render when the caller inlines `['INSERT','UPDATE']`.
    (opts.events ?? ['*']).join(','),
  ]);
}

export default useRealtimeChannel;
