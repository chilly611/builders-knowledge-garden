/**
 * Tests for ONBOARDING-V1 state helpers. The component + cron rely on
 * these being pure and side-effect-free — no Supabase needed.
 */

import { describe, it, expect, vi } from 'vitest';

import {
  freshState,
  getOnboardingFromUser,
  isCompleted,
  reminderDue,
  setOnboardingStep,
  type OnboardingState,
} from '../onboarding-state';
import type { User } from '@supabase/supabase-js';

function mkUser(meta: Record<string, unknown>): User {
  return { id: 'u_1', user_metadata: meta } as unknown as User;
}

describe('getOnboardingFromUser', () => {
  it('returns null when metadata missing', () => {
    expect(getOnboardingFromUser(null)).toBeNull();
    expect(getOnboardingFromUser(mkUser({}))).toBeNull();
  });

  it('returns null when shape is malformed', () => {
    expect(getOnboardingFromUser(mkUser({ onboarding: { step: 'not-a-step' } }))).toBeNull();
  });

  it('parses a valid state', () => {
    const ob = {
      step: 'project_created',
      started_at: '2026-05-22T10:00:00Z',
      reminders_sent: ['day1'],
    };
    const got = getOnboardingFromUser(mkUser({ onboarding: ob }));
    expect(got?.step).toBe('project_created');
    expect(got?.reminders_sent).toEqual(['day1']);
  });

  it('strips bogus reminders', () => {
    const ob = {
      step: 'welcome',
      started_at: '2026-05-22T10:00:00Z',
      reminders_sent: ['day1', 'never', 'day99'],
    };
    const got = getOnboardingFromUser(mkUser({ onboarding: ob }));
    expect(got?.reminders_sent).toEqual(['day1']);
  });
});

describe('isCompleted', () => {
  it('false for null / partial', () => {
    expect(isCompleted(null)).toBe(false);
    expect(isCompleted({ step: 'welcome' } as OnboardingState)).toBe(false);
  });
  it('true when step=completed', () => {
    expect(
      isCompleted({
        step: 'completed',
        started_at: '2026-05-22T00:00:00Z',
        reminders_sent: [],
      }),
    ).toBe(true);
  });
});

describe('reminderDue', () => {
  const start = '2026-05-22T00:00:00Z';
  const at = (hoursLater: number) =>
    new Date(new Date(start).getTime() + hoursLater * 3600_000);

  it('returns null for completed users', () => {
    const s: OnboardingState = {
      step: 'completed',
      started_at: start,
      completed_at: start,
      reminders_sent: [],
    };
    expect(reminderDue(s, at(48))).toBeNull();
  });

  it('returns null inside the first 24h (grace period)', () => {
    const s: OnboardingState = { step: 'welcome', started_at: start, reminders_sent: [] };
    expect(reminderDue(s, at(12))).toBeNull();
    expect(reminderDue(s, at(23))).toBeNull();
  });

  it('fires day1 between 24h and 72h', () => {
    const s: OnboardingState = { step: 'welcome', started_at: start, reminders_sent: [] };
    expect(reminderDue(s, at(25))).toBe('day1');
    expect(reminderDue(s, at(71))).toBe('day1');
  });

  it('does NOT fire day1 again once sent', () => {
    const s: OnboardingState = {
      step: 'welcome',
      started_at: start,
      reminders_sent: ['day1'],
    };
    expect(reminderDue(s, at(48))).toBeNull();
  });

  it('fires day3 between 72h and 168h', () => {
    const s: OnboardingState = {
      step: 'project_created',
      started_at: start,
      reminders_sent: ['day1'],
    };
    expect(reminderDue(s, at(73))).toBe('day3');
    expect(reminderDue(s, at(167))).toBe('day3');
  });

  it('fires day7 between 168h and 336h, then gives up', () => {
    const s: OnboardingState = {
      step: 'sub_invited',
      started_at: start,
      reminders_sent: ['day1', 'day3'],
    };
    expect(reminderDue(s, at(169))).toBe('day7');
    expect(reminderDue(s, at(335))).toBe('day7');
    expect(reminderDue(s, at(337))).toBeNull();
    expect(reminderDue(s, at(24 * 30))).toBeNull(); // month later — silent
  });

  it('handles malformed started_at gracefully', () => {
    const s = { step: 'welcome', started_at: 'not-a-date', reminders_sent: [] } as OnboardingState;
    expect(reminderDue(s, new Date())).toBeNull();
  });
});

describe('freshState', () => {
  it('starts at welcome with no reminders', () => {
    const s = freshState();
    expect(s.step).toBe('welcome');
    expect(s.reminders_sent).toEqual([]);
    expect(typeof s.started_at).toBe('string');
  });
});

describe('setOnboardingStep', () => {
  function mkClient(currentUser: User | null) {
    const updateUser = vi.fn(async () => ({ data: {}, error: null }));
    return {
      client: {
        auth: {
          getUser: async () => ({ data: { user: currentUser }, error: null }),
          updateUser,
        },
      } as unknown as Parameters<typeof setOnboardingStep>[0],
      updateUser,
    };
  }

  it('returns null when not signed in', async () => {
    const { client } = mkClient(null);
    expect(await setOnboardingStep(client, 'project_created')).toBeNull();
  });

  it('preserves started_at when advancing', async () => {
    const user = mkUser({
      name: 'Sam',
      onboarding: {
        step: 'welcome',
        started_at: '2026-05-22T00:00:00Z',
        reminders_sent: ['day1'],
      },
    });
    const { client, updateUser } = mkClient(user);
    const next = await setOnboardingStep(client, 'project_created');
    expect(next?.step).toBe('project_created');
    expect(next?.started_at).toBe('2026-05-22T00:00:00Z');
    expect(next?.reminders_sent).toEqual(['day1']);
    // Ensure we didn't clobber `name`.
    const call = (updateUser.mock.calls[0] as unknown as [{ data: { name: string } }])[0];
    expect(call.data.name).toBe('Sam');
  });

  it('stamps completed_at when transitioning to completed', async () => {
    const user = mkUser({
      onboarding: {
        step: 'contract_drafted',
        started_at: '2026-05-22T00:00:00Z',
        reminders_sent: [],
      },
    });
    const { client } = mkClient(user);
    const next = await setOnboardingStep(client, 'completed');
    expect(next?.step).toBe('completed');
    expect(typeof next?.completed_at).toBe('string');
  });
});
