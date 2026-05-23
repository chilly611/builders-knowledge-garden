/**
 * Tests for src/lib/posthog.ts — OBSERVABILITY-WIRE
 * =================================================
 * Wire-level coverage for the server-side PostHog helper. We mock
 * `posthog-node` at the module boundary so we never make a real network
 * call and can assert the contract:
 *
 *   1. captureServerEvent is a no-op when no key is configured.
 *   2. captureServerEvent constructs a client + capture call when a
 *      key IS configured.
 *   3. Properties are augmented with `env` derived from VERCEL_ENV.
 *
 * Caught failures + transient PostHog errors are tested implicitly via
 * the swallow path: if `capture` throws, the helper must still resolve
 * without rejecting.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock posthog-node BEFORE importing the SUT so the lazy
// `new PostHog(...)` call inside posthog.ts uses our fake.
const captureMock = vi.fn();
const flushMock = vi.fn().mockResolvedValue(undefined);
const ctorMock = vi.fn();

vi.mock('posthog-node', () => {
  return {
    PostHog: class FakePostHog {
      constructor(key: string, opts: Record<string, unknown>) {
        ctorMock(key, opts);
      }
      capture = captureMock;
      flush = flushMock;
    },
  };
});

import {
  captureServerEvent,
  getPostHogServerClient,
  __resetPostHogClientForTests,
} from '../posthog';

const ENV = process.env;

beforeEach(() => {
  process.env = { ...ENV };
  __resetPostHogClientForTests();
  captureMock.mockReset();
  flushMock.mockReset();
  flushMock.mockResolvedValue(undefined);
  ctorMock.mockReset();
});

afterEach(() => {
  process.env = ENV;
  __resetPostHogClientForTests();
});

describe('getPostHogServerClient', () => {
  it('returns null when no key is configured', () => {
    delete process.env.POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    expect(getPostHogServerClient()).toBeNull();
    expect(ctorMock).not.toHaveBeenCalled();
  });

  it('returns a singleton client when POSTHOG_KEY is set', () => {
    process.env.POSTHOG_KEY = 'phc_test';
    const a = getPostHogServerClient();
    const b = getPostHogServerClient();
    expect(a).not.toBeNull();
    expect(a).toBe(b);
    // Constructor called exactly once across two getClient calls.
    expect(ctorMock).toHaveBeenCalledTimes(1);
    expect(ctorMock).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        host: 'https://us.posthog.com',
        flushAt: 1,
      }),
    );
  });

  it('falls back to NEXT_PUBLIC_POSTHOG_KEY when POSTHOG_KEY is unset', () => {
    delete process.env.POSTHOG_KEY;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_public';
    expect(getPostHogServerClient()).not.toBeNull();
    expect(ctorMock).toHaveBeenCalledWith('phc_public', expect.any(Object));
  });

  it('honors NEXT_PUBLIC_POSTHOG_HOST when set', () => {
    process.env.POSTHOG_KEY = 'phc_test';
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://eu.posthog.com';
    getPostHogServerClient();
    expect(ctorMock).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({ host: 'https://eu.posthog.com' }),
    );
  });
});

describe('captureServerEvent', () => {
  it('no-ops when no key is configured', async () => {
    delete process.env.POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    await captureServerEvent('user-1', 'test_event', { foo: 'bar' });
    expect(captureMock).not.toHaveBeenCalled();
    expect(flushMock).not.toHaveBeenCalled();
  });

  it('calls posthog-node when a key is set', async () => {
    process.env.POSTHOG_KEY = 'phc_test';
    await captureServerEvent('user-1', 'signup_completed', {
      lane: 'gc',
      org_id: 'org-1',
      project_id: 'proj-1',
    });
    expect(captureMock).toHaveBeenCalledTimes(1);
    const callArg = captureMock.mock.calls[0][0];
    expect(callArg.distinctId).toBe('user-1');
    expect(callArg.event).toBe('signup_completed');
    expect(callArg.properties).toMatchObject({
      lane: 'gc',
      org_id: 'org-1',
      project_id: 'proj-1',
    });
    // Awaits flush so serverless functions don't terminate before the
    // network round-trip completes.
    expect(flushMock).toHaveBeenCalledTimes(1);
  });

  it('augments properties with env from VERCEL_ENV', async () => {
    process.env.POSTHOG_KEY = 'phc_test';
    process.env.VERCEL_ENV = 'preview';
    await captureServerEvent('user-1', 'test_event', { foo: 'bar' });
    const callArg = captureMock.mock.calls[0][0];
    expect(callArg.properties).toMatchObject({ env: 'preview', foo: 'bar' });
  });

  it('uses "unknown" env when VERCEL_ENV is unset', async () => {
    process.env.POSTHOG_KEY = 'phc_test';
    delete process.env.VERCEL_ENV;
    await captureServerEvent('user-1', 'test_event');
    const callArg = captureMock.mock.calls[0][0];
    expect(callArg.properties).toMatchObject({ env: 'unknown' });
  });

  it('swallows errors from posthog-node so the request is unaffected', async () => {
    process.env.POSTHOG_KEY = 'phc_test';
    captureMock.mockImplementation(() => {
      throw new Error('PostHog blew up');
    });
    // Must not reject.
    await expect(
      captureServerEvent('user-1', 'test_event'),
    ).resolves.toBeUndefined();
  });

  it('swallows errors from flush so the request is unaffected', async () => {
    process.env.POSTHOG_KEY = 'phc_test';
    flushMock.mockRejectedValueOnce(new Error('flush failed'));
    await expect(
      captureServerEvent('user-1', 'test_event'),
    ).resolves.toBeUndefined();
  });
});
