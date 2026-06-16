/**
 * daily-log-state — pure read/merge helpers for the `daily_log_state` JSONB
 * column (Decision #21). No React, no fetch, no module aliases, so this is
 * trivially unit-testable and safe to import anywhere.
 *
 * The compass logbook stores its entries under a single dedicated key
 * (`compass-logbook`) INSIDE `daily_log_state`, as a JSON-stringified array in
 * a StepPayload-shaped `{ value }` slot — so the column stays uniform with the
 * q15 Voice-to-Daily-Log workflow's per-step payloads, and writes can be
 * merged in without clobbering those step keys.
 */

export const LOGBOOK_KEY = 'compass-logbook';

export interface LogbookEntry {
  /** ISO timestamp */
  at: string;
  text: string;
}

export type DailyLogState = Record<string, unknown>;

function isEntry(v: unknown): v is LogbookEntry {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as LogbookEntry).at === 'string' &&
    typeof (v as LogbookEntry).text === 'string'
  );
}

/**
 * Read the logbook entries out of a `daily_log_state` object. Tolerant of any
 * malformed/legacy shape — returns [] rather than throwing.
 */
export function parseLogbookEntries(state: DailyLogState | null | undefined): LogbookEntry[] {
  const slot = state?.[LOGBOOK_KEY];
  const raw = slot && typeof slot === 'object' ? (slot as { value?: unknown }).value : undefined;
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(isEntry);
  } catch {
    return [];
  }
}

/**
 * Produce the next `daily_log_state` with the logbook entries merged in under
 * the dedicated key, preserving every other key (the q15 step payloads)
 * untouched.
 */
export function mergeLogbookEntries(
  state: DailyLogState | null | undefined,
  entries: LogbookEntry[]
): DailyLogState {
  return {
    ...(state ?? {}),
    [LOGBOOK_KEY]: { value: JSON.stringify(entries) },
  };
}
