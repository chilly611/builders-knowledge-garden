import { describe, it, expect } from 'vitest';
import { laneToBriefingKey } from '../useDailyBriefing';
import {
  parseLogbookEntries,
  mergeLogbookEntries,
  LOGBOOK_KEY,
  type LogbookEntry,
} from '../../daily-log-state';

describe('laneToBriefingKey', () => {
  it('maps each ProjectRole to a briefing voice', () => {
    expect(laneToBriefingKey('gc')).toBe('builder');
    expect(laneToBriefingKey('owner')).toBe('ally');
    expect(laneToBriefingKey('contractor')).toBe('specialist');
    expect(laneToBriefingKey('specialist')).toBe('specialist');
    expect(laneToBriefingKey('teammate')).toBe('crew');
    expect(laneToBriefingKey('day_hire')).toBe('crew');
    expect(laneToBriefingKey('diy')).toBe('builder');
  });

  it('defaults to builder for null/unknown (the GC killer app)', () => {
    expect(laneToBriefingKey(null)).toBe('builder');
    expect(laneToBriefingKey(undefined)).toBe('builder');
    expect(laneToBriefingKey('martian')).toBe('builder');
  });

  it('is case-insensitive and passes through native briefing keys', () => {
    expect(laneToBriefingKey('Owner')).toBe('ally');
    expect(laneToBriefingKey('CREW')).toBe('crew');
  });
});

describe('parseLogbookEntries', () => {
  it('returns [] for empty / missing / malformed state', () => {
    expect(parseLogbookEntries(null)).toEqual([]);
    expect(parseLogbookEntries({})).toEqual([]);
    expect(parseLogbookEntries({ [LOGBOOK_KEY]: {} })).toEqual([]);
    expect(parseLogbookEntries({ [LOGBOOK_KEY]: { value: 'not json' } })).toEqual([]);
    expect(parseLogbookEntries({ [LOGBOOK_KEY]: { value: '{"not":"array"}' } })).toEqual([]);
  });

  it('reads back valid entries in order and drops malformed ones', () => {
    const entries: LogbookEntry[] = [
      { at: '2026-06-15T08:00:00.000Z', text: 'Poured footings' },
      { at: '2026-06-15T15:30:00.000Z', text: 'Inspector signed off' },
    ];
    const value = JSON.stringify([...entries, { at: 1, text: 2 }, 'junk']);
    expect(parseLogbookEntries({ [LOGBOOK_KEY]: { value } })).toEqual(entries);
  });
});

describe('mergeLogbookEntries — never clobbers other daily_log_state keys', () => {
  it('preserves the q15 workflow step payloads alongside the logbook', () => {
    const existing = {
      'q15-safety': { value: 'done' },
      'upload-progress-photos': { value: '3 files uploaded' },
    };
    const entries: LogbookEntry[] = [{ at: '2026-06-15T08:00:00.000Z', text: 'Crew of 6' }];
    const merged = mergeLogbookEntries(existing, entries);

    // other keys survive untouched
    expect(merged['q15-safety']).toEqual({ value: 'done' });
    expect(merged['upload-progress-photos']).toEqual({ value: '3 files uploaded' });
    // logbook round-trips
    expect(parseLogbookEntries(merged)).toEqual(entries);
  });

  it('round-trips with an empty/absent prior state', () => {
    const entries: LogbookEntry[] = [{ at: '2026-06-15T08:00:00.000Z', text: 'first note' }];
    expect(parseLogbookEntries(mergeLogbookEntries(undefined, entries))).toEqual(entries);
    expect(parseLogbookEntries(mergeLogbookEntries({}, entries))).toEqual(entries);
  });
});
