'use client';

/**
 * CompassToday — the "TODAY" rectangle that blooms beside the navigation
 * rectangle when the ShellNav compass is engaged (hover or press).
 *
 *   ┌─ Daily brief ──────────┐
 *   │ (MorningBriefing gen)   │
 *   ├─ Daily logbook ─────────┤
 *   │ daily_log_state (#21)   │
 *   └─────────────────────────┘
 *
 * Brief: reuses the existing MorningBriefing generation via useDailyBriefing.
 * Logbook: reads/writes the persisted daily_log_state for the ACTIVE project
 * (useStageProject → useCompassLogbook), with an honest empty state.
 *
 * Reuses the `.pnav-panel` base class so it's visually identical to the nav
 * rectangle and inherits the shell's prefers-reduced-motion rule (no bloom
 * animation → instant open).
 */

import { useCallback } from 'react';
import { useStageProject } from '@/lib/hooks/useStageProject';
import { useDailyBriefing } from '@/lib/hooks/useDailyBriefing';
import { useCompassLogbook, type LogbookEntry } from '@/lib/hooks/useCompassLogbook';
import { BriefMarkdown } from './BriefMarkdown';

function todayLabel(): string {
  try {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Today';
  }
}

function formatWhen(at: string): string {
  try {
    const d = new Date(at);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

interface Props {
  /** Lifted to ShellNav so a half-typed note survives close/reopen. */
  draft: string;
  onDraftChange: (next: string) => void;
}

export function CompassToday({ draft, onDraftChange }: Props) {
  const sp = useStageProject();
  const projectId = sp.notFound ? null : sp.projectId;

  const brief = useDailyBriefing(sp.lane);
  const log = useCompassLogbook(projectId, true);

  const submit = useCallback(async () => {
    if (!draft.trim() || log.saving) return;
    const ok = await log.addEntry(draft);
    if (ok) onDraftChange('');
  }, [draft, log, onDraftChange]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void submit();
      }
    },
    [submit]
  );

  const entriesNewestFirst: LogbookEntry[] = [...log.entries].reverse();
  const canLog = !!projectId;

  return (
    <div className="pnav-panel pnav-today" role="dialog" aria-label="Today">
      <div className="pnav-panel-head">
        <span className="eng-label">Today</span>
        <span className="pnav-lane">{todayLabel()}</span>
      </div>

      {/* ── Daily brief ─────────────────────────────────────────────── */}
      <section className="today-sec" aria-label="Daily brief">
        <div className="today-sec-head eng-label">Daily brief</div>
        {brief.status === 'loading' || brief.status === 'idle' ? (
          <p className="today-muted">Composing today&rsquo;s brief…</p>
        ) : brief.status === 'error' ? (
          <p className="today-muted">Brief unavailable right now.</p>
        ) : brief.briefing ? (
          <>
            <BriefMarkdown text={brief.briefing} />
            {brief.quests.length > 0 && (
              <ul className="today-focus">
                {brief.quests.slice(0, 3).map((q) => (
                  <li key={q.id} className="today-focus-item">
                    <span className="today-focus-t">{q.title}</span>
                    <span className="today-focus-d">{q.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="today-muted">No brief for today yet.</p>
        )}
      </section>

      {/* ── Daily logbook ───────────────────────────────────────────── */}
      <section className="today-sec today-sec-log" aria-label="Daily logbook">
        <div className="today-sec-head eng-label">Daily logbook</div>

        {!canLog ? (
          <p className="today-muted">Open a project to keep a daily log.</p>
        ) : (
          <>
            {log.status === 'loading' && <p className="today-muted">Loading the log…</p>}
            {log.status === 'error' && (
              <p className="today-muted">Couldn&rsquo;t load the log.</p>
            )}
            {log.status === 'ready' && entriesNewestFirst.length === 0 && (
              <p className="today-muted">No entries yet — note what happened today.</p>
            )}
            {entriesNewestFirst.length > 0 && (
              <ul className="today-log">
                {entriesNewestFirst.map((e, i) => (
                  <li key={`${e.at}-${i}`} className="today-log-item">
                    <span className="today-log-when">{formatWhen(e.at)}</span>
                    <span className="today-log-txt">{e.text}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="today-log-form">
              <textarea
                className="today-log-input"
                placeholder="Jot a note for today's log…"
                value={draft}
                onChange={(ev) => onDraftChange(ev.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                aria-label="New log entry"
              />
              <div className="today-log-foot">
                {log.saveError ? (
                  <span className="today-log-err">{log.saveError}</span>
                ) : (
                  <span className="today-log-hint">⌘↵ to add</span>
                )}
                <button
                  type="button"
                  className="today-log-add"
                  disabled={!draft.trim() || log.saving}
                  onClick={() => void submit()}
                >
                  {log.saving ? 'Saving…' : 'Add to log'}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default CompassToday;
