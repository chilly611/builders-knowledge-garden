/**
 * src/lib/onboarding-state.ts
 * ===========================
 * ONBOARDING-V1 (2026-05-22) — first-run state lives on
 * `auth.users.raw_user_meta_data.onboarding` so it travels in the JWT
 * and survives reloads / device-changes without a new table.
 *
 * Shape (single source of truth — keep in sync with the cron route):
 *
 *   user_metadata.onboarding = {
 *     step: 'welcome' | 'project_created' | 'sub_invited'
 *         | 'contract_drafted' | 'completed',
 *     started_at: string,            // ISO when the user first hit /killerapp?first_run=1
 *     completed_at?: string,         // ISO when step flipped to 'completed'
 *     reminders_sent: ('day1'|'day3'|'day7')[]  // which Resend reminders fired
 *   }
 *
 * Read paths:
 *   - Client: `getOnboardingFromUser(user)` — pull from the user object
 *             handed back by `supabase.auth.getUser()`.
 *   - Server: same helper, just pass the admin-API user payload.
 *
 * Write paths:
 *   - Client: `setOnboardingStep(supabase, step)` — calls
 *             `supabase.auth.updateUser` so the JWT refreshes inline.
 *   - Server cron: `mergeOnboarding(adminClient, userId, patch)` —
 *             uses the auth admin API to merge state and record which
 *             reminders fired without clobbering the rest of metadata.
 *
 * NEVER replace `user_metadata` wholesale — always spread and merge so
 * we don't blow away `lane`, `name`, `demo_project_id`, etc.
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';

export type OnboardingStep =
  | 'welcome'
  | 'project_created'
  | 'sub_invited'
  | 'contract_drafted'
  | 'completed';

export type ReminderKey = 'day1' | 'day3' | 'day7';

export interface OnboardingState {
  step: OnboardingStep;
  started_at: string;
  completed_at?: string;
  reminders_sent: ReminderKey[];
}

/** Stage order used by the modal and by the cron-reminder eligibility check. */
export const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'project_created',
  'sub_invited',
  'contract_drafted',
  'completed',
];

/** True when the user is "done" — modal stays hidden, reminders stop firing. */
export function isCompleted(s: OnboardingState | null | undefined): boolean {
  return !!s && s.step === 'completed';
}

/**
 * Read onboarding state off any Supabase user payload. Tolerates the
 * legacy shape (`onboarding: undefined`) by returning null — callers
 * decide whether "null + first_run=1" means "fresh start".
 */
export function getOnboardingFromUser(
  user: User | null | undefined,
): OnboardingState | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const raw = meta.onboarding as Partial<OnboardingState> | undefined;
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.step || !STEP_ORDER.includes(raw.step as OnboardingStep)) return null;
  return {
    step: raw.step as OnboardingStep,
    started_at: typeof raw.started_at === 'string' ? raw.started_at : new Date().toISOString(),
    completed_at: typeof raw.completed_at === 'string' ? raw.completed_at : undefined,
    reminders_sent: Array.isArray(raw.reminders_sent)
      ? (raw.reminders_sent.filter((r) =>
          ['day1', 'day3', 'day7'].includes(r as string),
        ) as ReminderKey[])
      : [],
  };
}

/** Create a fresh `welcome` state — used when first_run=1 and metadata is empty. */
export function freshState(): OnboardingState {
  return {
    step: 'welcome',
    started_at: new Date().toISOString(),
    reminders_sent: [],
  };
}

/**
 * Client-side: advance (or rewind) the current user's onboarding step.
 * Calls `supabase.auth.updateUser` so the new state is reflected in the
 * next JWT refresh + survives reloads. Returns the new state or null
 * on failure (call sites typically log and move on — the worst case is
 * "modal re-appears next reload", which is non-destructive).
 *
 * IMPORTANT: we merge by reading the current user first, then spreading
 * `existing` so we never clobber `started_at`, `reminders_sent`, etc.
 */
export async function setOnboardingStep(
  supabase: SupabaseClient,
  step: OnboardingStep,
): Promise<OnboardingState | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return null;

    const existing = getOnboardingFromUser(user) ?? freshState();
    const next: OnboardingState = {
      ...existing,
      step,
    };
    if (step === 'completed' && !existing.completed_at) {
      next.completed_at = new Date().toISOString();
    }

    const meta = { ...(user.user_metadata ?? {}), onboarding: next };
    const { error } = await supabase.auth.updateUser({ data: meta });
    if (error) {
      console.warn('[onboarding-state] updateUser failed:', error.message);
      return null;
    }
    return next;
  } catch (e) {
    console.warn('[onboarding-state] setOnboardingStep threw:', e);
    return null;
  }
}

/**
 * Server-side merge using the auth admin API. Used by the cron route
 * to flip `reminders_sent` after a successful Resend send. NEVER call
 * this from a request handler that's authenticated as the user — the
 * client-side helper handles that path and keeps the JWT in sync.
 *
 * Signature kept narrow: callers always pass a patch (not a full
 * state) so we can't accidentally clobber `started_at` or downgrade
 * the step.
 */
export async function mergeOnboarding(
  adminClient: SupabaseClient,
  userId: string,
  patch: Partial<OnboardingState>,
): Promise<OnboardingState | null> {
  // 1. Read current state.
  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  if (error || !data?.user) {
    console.warn('[onboarding-state] mergeOnboarding getUserById failed:', error?.message);
    return null;
  }
  const existing = getOnboardingFromUser(data.user) ?? freshState();

  const merged: OnboardingState = {
    step: patch.step ?? existing.step,
    started_at: existing.started_at, // never overwrite — first wins
    completed_at: patch.completed_at ?? existing.completed_at,
    reminders_sent: Array.from(
      new Set([...(existing.reminders_sent ?? []), ...(patch.reminders_sent ?? [])]),
    ) as ReminderKey[],
  };

  const meta = { ...(data.user.user_metadata ?? {}), onboarding: merged };
  const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: meta,
  });
  if (updateErr) {
    console.warn('[onboarding-state] mergeOnboarding updateUserById failed:', updateErr.message);
    return null;
  }
  return merged;
}

/**
 * Decide whether a given reminder should fire for this user, given the
 * elapsed time since they started onboarding. Returns the cadence key
 * to fire (or null if no reminder is due). Pure function — easy to
 * unit-test without mocking Supabase.
 *
 *   day1 → 24h <= elapsed < 72h
 *   day3 → 72h <= elapsed < 168h
 *   day7 → 168h <= elapsed < 14d (after 14d we give up — stop nagging)
 */
export function reminderDue(
  state: OnboardingState | null,
  now: Date = new Date(),
): ReminderKey | null {
  if (!state || isCompleted(state)) return null;
  const startedMs = Date.parse(state.started_at);
  if (Number.isNaN(startedMs)) return null;
  const elapsedHr = (now.getTime() - startedMs) / (1000 * 60 * 60);
  const sent = new Set(state.reminders_sent);

  if (elapsedHr >= 24 && elapsedHr < 72 && !sent.has('day1')) return 'day1';
  if (elapsedHr >= 72 && elapsedHr < 168 && !sent.has('day3')) return 'day3';
  if (elapsedHr >= 168 && elapsedHr < 336 && !sent.has('day7')) return 'day7';
  return null;
}
