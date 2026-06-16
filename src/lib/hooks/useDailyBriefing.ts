'use client';

/**
 * useDailyBriefing — the "daily brief" half of the compass TODAY bloom.
 *
 * Reuses the EXISTING MorningBriefing generation (`POST /api/v1/briefing`,
 * the same lane-aware Anthropic generator the onboarding MorningBriefing
 * modal calls) — this hook is the lane→generation bridge for the persistent
 * compass surface, NOT a new generator.
 *
 * The generation is an Anthropic call (cost + a few seconds), so it is:
 *   - lazy: only runs when a consumer mounts (the TODAY panel is open);
 *   - de-duped + session-cached per lane key, so reopening the compass does
 *     not re-bill the model. A full reload regenerates (acceptable — it IS a
 *     "today" brief).
 *
 * No auth header is needed — /api/v1/briefing has no auth gate (it only needs
 * the server-side ANTHROPIC_API_KEY).
 */

import { useEffect, useState } from 'react';

export interface BriefingQuest {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  action_type: string;
}

export interface BriefingResult {
  briefing: string;
  quests: BriefingQuest[];
}

export type BriefingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; briefing: string; quests: BriefingQuest[] }
  | { status: 'error' };

// The /api/v1/briefing lane vocabulary (the 8-lane briefing taxonomy) is
// distinct from the project ProjectRole vocabulary. Map ProjectRole (or any
// lane-ish string) onto the closest briefing voice; default to 'builder'
// (this is the GC killer app). The endpoint itself also falls back to
// 'builder' for an unknown key, so an imperfect map degrades safely.
const ROLE_TO_BRIEFING_KEY: Record<string, string> = {
  owner: 'ally',
  gc: 'builder',
  contractor: 'specialist',
  specialist: 'specialist',
  teammate: 'crew',
  day_hire: 'crew',
  diy: 'builder',
  // pass-through for callers that already speak the briefing taxonomy
  builder: 'builder',
  dreamer: 'dreamer',
  merchant: 'merchant',
  ally: 'ally',
  crew: 'crew',
  fleet: 'fleet',
  machine: 'machine',
};

export function laneToBriefingKey(lane: string | null | undefined): string {
  if (!lane) return 'builder';
  return ROLE_TO_BRIEFING_KEY[lane.toLowerCase()] ?? 'builder';
}

/**
 * Substitute the real date for any date placeholder the briefing model leaves
 * unfilled (it likes to open with "# Morning Briefing — [Date]"). Replaces
 * `[Date]` and any bracketed token containing the word "date", `[today]` /
 * `[today's]`, and `{date}` / `{{date}}`. Guarantees a bare "[Date]" never
 * reaches the UI. Pure + date-injectable so it's deterministic to test; the
 * date is bound at fetch time (consistent with the rest of the brief's
 * content, which is also generated then).
 */
export function fillBriefDate(text: string, now: Date = new Date()): string {
  if (!text) return text;
  let formatted: string;
  try {
    formatted = now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    formatted = now.toDateString();
  }
  return text
    .replace(/\{\{\s*date\s*\}\}/gi, formatted) // {{date}}
    .replace(/\{\s*date\s*\}/gi, formatted) // {date}
    .replace(/\[[^\]]*\bdate\b[^\]]*\]/gi, formatted) // [Date], [Current Date], [insert date here]
    .replace(/\[\s*today'?s?\s*\]/gi, formatted); // [today], [today's]
}

// Session-scoped caches (module-level so they survive the TODAY panel
// mounting/unmounting as the compass opens and closes).
const briefingCache = new Map<string, BriefingResult>();
const inflight = new Map<string, Promise<BriefingResult>>();

async function fetchBriefing(laneKey: string): Promise<BriefingResult> {
  const cached = briefingCache.get(laneKey);
  if (cached) return cached;

  const existing = inflight.get(laneKey);
  if (existing) return existing;

  const p = (async () => {
    const res = await fetch('/api/v1/briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lane: laneKey }),
    });
    if (!res.ok) throw new Error(`briefing ${res.status}`);
    const data = (await res.json()) as Partial<BriefingResult>;
    const result: BriefingResult = {
      briefing: typeof data.briefing === 'string' ? fillBriefDate(data.briefing.trim()) : '',
      quests: Array.isArray(data.quests) ? data.quests : [],
    };
    briefingCache.set(laneKey, result);
    return result;
  })();

  inflight.set(laneKey, p);
  try {
    return await p;
  } finally {
    inflight.delete(laneKey);
  }
}

/**
 * Lazily generate (or read from session cache) the daily brief for `lane`.
 * `lane` is the project lane (ProjectRole) or any lane-ish string; it is
 * mapped to the briefing taxonomy internally.
 */
export function useDailyBriefing(lane: string | null | undefined): BriefingState {
  const laneKey = laneToBriefingKey(lane);
  // Async fetch result, keyed by laneKey so a stale result from a previous
  // lane is never shown. setState happens ONLY in the async then/catch
  // callbacks below — never synchronously in the effect body — so the
  // cached/loading states are derived during render instead.
  const [resolved, setResolved] = useState<{ key: string; state: BriefingState } | null>(null);

  useEffect(() => {
    if (briefingCache.has(laneKey)) return; // render derives 'ready' from cache
    let cancelled = false;
    fetchBriefing(laneKey)
      .then((r) => {
        if (!cancelled) {
          setResolved({ key: laneKey, state: { status: 'ready', briefing: r.briefing, quests: r.quests } });
        }
      })
      .catch(() => {
        if (!cancelled) setResolved({ key: laneKey, state: { status: 'error' } });
      });
    return () => {
      cancelled = true;
    };
  }, [laneKey]);

  const cached = briefingCache.get(laneKey);
  if (cached) return { status: 'ready', briefing: cached.briefing, quests: cached.quests };
  if (resolved && resolved.key === laneKey) return resolved.state;
  return { status: 'loading' };
}
