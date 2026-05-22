/**
 * Tests for the pure `subscribeRealtime` helper that backs
 * useRealtimeChannel (REALTIME, 2026-05-22).
 *
 * Why test the helper instead of the hook? @testing-library/react isn't
 * installed in this repo (vitest tests are all pure-logic .ts files). The
 * hook itself is a thin useEffect wrapper around subscribeRealtime — we
 * verify the load-bearing contract here:
 *   - supabase.channel() called with the derived channel name
 *   - channel.on('postgres_changes', { event, schema, table, filter }, cb)
 *     called once per requested event
 *   - channel.subscribe() called
 *   - unsubscribe() removes the channel
 *   - enabled=false short-circuits (no channel created)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// use-realtime-channel.ts imports `@/lib/supabase` which the vitest setup
// doesn't resolve without a tsconfig-paths plugin (same workaround used in
// use-user-lane.test.ts). The helper under test (`subscribeRealtime`)
// receives the client by parameter so the mock value is never touched.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => ({ on: () => ({}), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));

import { subscribeRealtime } from '../use-realtime-channel';

type TestClient = Pick<SupabaseClient, 'channel' | 'removeChannel'>;

interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
}

interface MockClient {
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
  _channel: MockChannel;
}

function makeMockClient(): MockClient {
  const channel: MockChannel = {
    on: vi.fn(function on(this: MockChannel) {
      return this;
    }),
    subscribe: vi.fn(function subscribe(this: MockChannel) {
      return this;
    }),
  };
  return {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
    _channel: channel,
  };
}

describe('subscribeRealtime', () => {
  let client: MockClient;
  beforeEach(() => {
    client = makeMockClient();
  });

  it('opens a channel with the derived name and subscribes', () => {
    subscribeRealtime(
      client as unknown as TestClient,
      { table: 'sub_bids', filter: 'project_id=eq.abc' },
      () => () => {},
    );
    expect(client.channel).toHaveBeenCalledTimes(1);
    expect(client.channel).toHaveBeenCalledWith('realtime-sub_bids-project_id=eq.abc');
    expect(client._channel.subscribe).toHaveBeenCalledTimes(1);
  });

  it('registers postgres_changes listener with table/filter/event', () => {
    subscribeRealtime(
      client as unknown as TestClient,
      { table: 'project_rfis', filter: 'project_id=eq.xyz', events: ['UPDATE'] },
      () => () => {},
    );
    expect(client._channel.on).toHaveBeenCalledTimes(1);
    const [topic, config] = client._channel.on.mock.calls[0];
    expect(topic).toBe('postgres_changes');
    expect(config).toEqual({
      event: 'UPDATE',
      schema: 'public',
      table: 'project_rfis',
      filter: 'project_id=eq.xyz',
    });
  });

  it('defaults events to ["*"] and omits filter when not provided', () => {
    subscribeRealtime(client as unknown as TestClient, { table: 'invoices' }, () => () => {});
    expect(client._channel.on).toHaveBeenCalledTimes(1);
    const [, config] = client._channel.on.mock.calls[0];
    expect(config.event).toBe('*');
    expect(config.filter).toBeUndefined();
  });

  it('registers one listener per event when multiple are requested', () => {
    subscribeRealtime(
      client as unknown as TestClient,
      { table: 'invoice_payments', events: ['INSERT', 'UPDATE'] },
      () => () => {},
    );
    expect(client._channel.on).toHaveBeenCalledTimes(2);
    expect(client._channel.on.mock.calls[0][1].event).toBe('INSERT');
    expect(client._channel.on.mock.calls[1][1].event).toBe('UPDATE');
  });

  it('forwards realtime payloads to the latest handler returned by getHandler', () => {
    let latest = vi.fn();
    subscribeRealtime(client as unknown as TestClient, { table: 'sub_bids' }, () => latest);
    // Swap the handler AFTER subscribe; getHandler latches the new one.
    const newHandler = vi.fn();
    latest = newHandler;

    const cb = client._channel.on.mock.calls[0][2] as (p: unknown) => void;
    const payload = { eventType: 'INSERT', new: { id: 'bid-1' } };
    cb(payload);
    expect(newHandler).toHaveBeenCalledWith(payload);
  });

  it('returns an unsubscribe that calls removeChannel', () => {
    const unsubscribe = subscribeRealtime(
      client as unknown as TestClient,
      { table: 'project_change_orders' },
      () => () => {},
    );
    expect(client.removeChannel).not.toHaveBeenCalled();
    unsubscribe();
    expect(client.removeChannel).toHaveBeenCalledTimes(1);
    expect(client.removeChannel).toHaveBeenCalledWith(client._channel);
  });

  it('does not open a channel when enabled=false', () => {
    const unsubscribe = subscribeRealtime(
      client as unknown as TestClient,
      { table: 'project_budget_lines', enabled: false },
      () => () => {},
    );
    expect(client.channel).not.toHaveBeenCalled();
    expect(client._channel.subscribe).not.toHaveBeenCalled();
    // unsubscribe should still be safe to call.
    expect(() => unsubscribe()).not.toThrow();
  });

  it('honors a custom channelName', () => {
    subscribeRealtime(
      client as unknown as TestClient,
      { table: 'sub_bids', channelName: 'my-custom-chan' },
      () => () => {},
    );
    expect(client.channel).toHaveBeenCalledWith('my-custom-chan');
  });
});
