import { describe, it, expect } from 'vitest';
import { laneToBriefingKey, fillBriefDate } from '../useDailyBriefing';
import { parseBrief } from '../../../components/app-shell/BriefMarkdown';
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

describe('fillBriefDate — never lets a bare [Date] reach the UI', () => {
  // Compute the expectation the same way the helper does so the test is
  // locale-independent (CI locale need not be en-US).
  const now = new Date('2026-06-15T12:00:00');
  const expected = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  it('substitutes the model\'s "[Date]" placeholder in the heading', () => {
    const out = fillBriefDate('# Morning Briefing — [Date]\n\nFive projects, zero fires.', now);
    expect(out).not.toMatch(/\[date\]/i);
    expect(out).toBe(`# Morning Briefing — ${expected}\n\nFive projects, zero fires.`);
  });

  it('handles the common placeholder variants', () => {
    expect(fillBriefDate('[DATE]', now)).toBe(expected);
    expect(fillBriefDate('[Current Date]', now)).toBe(expected);
    expect(fillBriefDate('[Today\'s Date]', now)).toBe(expected);
    expect(fillBriefDate('[today]', now)).toBe(expected);
    expect(fillBriefDate('{date}', now)).toBe(expected);
    expect(fillBriefDate('{{date}}', now)).toBe(expected);
  });

  it('leaves non-date brackets and plain text untouched', () => {
    expect(fillBriefDate('Check the [punch list] and update the bid.', now)).toBe(
      'Check the [punch list] and update the bid.'
    );
    expect(fillBriefDate('', now)).toBe('');
  });
});

describe('parseBrief — markdown to block tokens', () => {
  it('detects headings and caps the level at 3', () => {
    expect(parseBrief('# Title')).toEqual([{ kind: 'heading', level: 1, text: 'Title' }]);
    expect(parseBrief('### Sub')).toEqual([{ kind: 'heading', level: 3, text: 'Sub' }]);
    expect(parseBrief('##### Deep')).toEqual([{ kind: 'heading', level: 3, text: 'Deep' }]);
  });

  it('joins wrapped paragraph lines and splits blocks on blank lines', () => {
    expect(parseBrief('Five projects,\nzero fires.\n\nSteel is late.')).toEqual([
      { kind: 'paragraph', text: 'Five projects, zero fires.' },
      { kind: 'paragraph', text: 'Steel is late.' },
    ]);
  });

  it('groups unordered and ordered list items', () => {
    expect(parseBrief('- a\n- b')).toEqual([{ kind: 'list', items: ['a', 'b'] }]);
    expect(parseBrief('1. one\n2) two')).toEqual([{ kind: 'list', items: ['one', 'two'] }]);
  });

  it('keeps inline **bold**/*italic* markers in the text for the renderer', () => {
    expect(parseBrief('Call the **supplier** now.')).toEqual([
      { kind: 'paragraph', text: 'Call the **supplier** now.' },
    ]);
  });

  it('returns [] for empty / whitespace-only input', () => {
    expect(parseBrief('')).toEqual([]);
    expect(parseBrief('   \n  \n')).toEqual([]);
  });
});
