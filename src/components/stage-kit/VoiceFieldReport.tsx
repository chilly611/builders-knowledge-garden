'use client';

/**
 * VoiceFieldReport — speak a field update → structured daily-log entry → DB.
 *
 * Web Speech API captures the spoken report; the build specialist structures
 * it (work completed / crew / issues / weather); "Save to daily log" persists
 * it to the project's `daily_log_state` JSONB (the same column the daily-log
 * workflow uses) via PATCH /api/v1/projects, with a localStorage mirror so
 * the entry shows instantly and survives even when the DB write is blocked
 * (e.g. not signed in). Typing is equal to voice — the textarea is editable.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import { structureFieldReport } from '@/lib/specialists/build';
import AutoFillButton from './AutoFillButton';
import { colors, fonts } from '@/design-system/tokens';

interface StructuredReport {
  work_completed?: string;
  crew?: string;
  deliveries?: string;
  issues?: string;
  weather?: string;
}

interface FieldEntry {
  id: string;
  at: string; // ISO
  text: string;
  structured: StructuredReport | null;
  persisted: 'db' | 'local';
}

const ACTIVE_PROJECT_KEY = 'bkg-active-project';

function mirrorKey(projectId: string | null): string {
  return `bkg:field-reports:${projectId ?? ACTIVE_PROJECT_KEY}`;
}

function readMirror(projectId: string | null): FieldEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(mirrorKey(projectId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMirror(projectId: string | null, entries: FieldEntry[]): void {
  try {
    window.localStorage.setItem(mirrorKey(projectId), JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers });
}

/** Merge the new entries into the project's daily_log_state JSONB. Returns true on a durable DB write. */
async function persistToDb(projectId: string, entries: FieldEntry[]): Promise<boolean> {
  try {
    const map: Record<string, { value: string }> = {};
    for (const e of entries) map[`field-report-${e.id}`] = { value: e.text };
    const res = await authedFetch('/api/v1/projects', {
      method: 'PATCH',
      body: JSON.stringify({ id: projectId, daily_log_state: map }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

function heuristicStructure(text: string): StructuredReport {
  return { work_completed: text.trim() };
}

function formatEntry(text: string, s: StructuredReport | null): string {
  if (!s) return text.trim();
  const lines: string[] = [];
  if (s.work_completed) lines.push(`Work: ${s.work_completed}`);
  if (s.crew) lines.push(`Crew: ${s.crew}`);
  if (s.deliveries) lines.push(`Deliveries: ${s.deliveries}`);
  if (s.issues) lines.push(`Issues: ${s.issues}`);
  if (s.weather) lines.push(`Weather: ${s.weather}`);
  return lines.length ? lines.join('\n') : text.trim();
}

export default function VoiceFieldReport({
  projectId,
  projectType,
}: {
  projectId: string | null;
  projectType?: string;
}) {
  const { supported, listening, transcript, interimTranscript, start, stop, reset, error } =
    useSpeechRecognition();
  const [draft, setDraft] = useState('');
  const [structured, setStructured] = useState<StructuredReport | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [entries, setEntries] = useState<FieldEntry[]>([]);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const lastTranscript = useRef('');

  // Hydrate today's entries from the localStorage mirror.
  useEffect(() => {
    setEntries(readMirror(projectId));
  }, [projectId]);

  // Append final speech results to the draft.
  useEffect(() => {
    const t = transcript.trim();
    if (t && t !== lastTranscript.current) {
      lastTranscript.current = t;
      setDraft((prev) => (prev ? `${prev} ${t}` : t));
      reset();
      lastTranscript.current = '';
    }
  }, [transcript, reset]);

  async function structureWithAI() {
    if (!draft.trim()) return;
    setStructuring(true);
    try {
      const res = await structureFieldReport({ transcript: draft, projectType });
      const s = (res.structured ?? {}) as StructuredReport;
      const hasFields = !!(s.work_completed || s.crew || s.issues || s.weather || s.deliveries);
      setStructured(hasFields ? s : heuristicStructure(draft));
    } catch {
      setStructured(heuristicStructure(draft));
    } finally {
      setStructuring(false);
    }
  }

  async function saveEntry() {
    const text = formatEntry(draft, structured);
    if (!text.trim()) return;
    const entry: FieldEntry = {
      id: `${Date.now()}`,
      at: new Date().toISOString(),
      text,
      structured,
      persisted: 'local',
    };
    const next = [entry, ...entries];
    setEntries(next);
    writeMirror(projectId, next);

    let persisted: FieldEntry['persisted'] = 'local';
    if (projectId) {
      const ok = await persistToDb(projectId, next);
      persisted = ok ? 'db' : 'local';
    }
    const finalised = next.map((e) => (e.id === entry.id ? { ...e, persisted } : e));
    setEntries(finalised);
    writeMirror(projectId, finalised);
    setSaveNote(persisted === 'db' ? 'Saved to project daily log ✓' : 'Saved locally (sign in to sync)');
    setTimeout(() => setSaveNote(null), 2600);

    // reset capture
    setDraft('');
    setStructured(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 }}>
      {/* Capture row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => (listening ? stop() : start())}
          disabled={!supported}
          title={supported ? 'Hold a normal conversation — tap to start/stop' : 'Voice not supported in this browser'}
          style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 999,
            cursor: supported ? 'pointer' : 'not-allowed',
            border: 'none',
            fontFamily: fonts.body,
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            background: listening ? colors.orange : supported ? colors.navy : colors.fadedRule,
            boxShadow: listening ? `0 0 0 4px ${colors.orange}33` : 'none',
            transition: 'all 160ms ease',
          }}
        >
          <span aria-hidden style={{ fontSize: 16 }}>{listening ? '⏹' : '🎙'}</span>
          {listening ? 'Listening… tap to stop' : 'Speak your update'}
        </button>
        {!supported && (
          <span style={{ fontSize: 11.5, color: colors.redline, alignSelf: 'center' }}>
            Voice input needs Chrome/Edge — you can still type below.
          </span>
        )}
        {error === 'permission-denied' && (
          <span style={{ fontSize: 11.5, color: colors.redline, alignSelf: 'center' }}>
            Mic permission blocked — type below instead.
          </span>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <textarea
          value={draft + (interimTranscript ? ` ${interimTranscript}` : '')}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tap the mic and talk, or type: “Framing crew of six finished the second-floor walls, lumber delivery came at 9, light rain this afternoon slowed the roof…”"
          rows={3}
          style={{
            width: '100%',
            resize: 'none',
            padding: '10px 12px',
            borderRadius: 10,
            border: `1.5px solid ${listening ? colors.orange : colors.paper.border}`,
            fontFamily: fonts.body,
            fontSize: 13.5,
            lineHeight: 1.45,
            color: colors.navy,
            background: '#fff',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <AutoFillButton onFill={structureWithAI} label={structuring ? 'Structuring…' : 'Structure with AI'} title="Turn this into a structured log entry" />
        <button
          type="button"
          onClick={saveEntry}
          disabled={!draft.trim()}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: 'none',
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
            background: draft.trim() ? '#14B8A6' : colors.fadedRule,
            color: '#fff',
            fontFamily: fonts.body,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Save to daily log
        </button>
        {saveNote && <span style={{ fontSize: 12, fontWeight: 600, color: '#0E7C66' }}>{saveNote}</span>}
      </div>

      {structured && (
        <div
          style={{
            borderRadius: 10,
            border: `1px solid ${colors.robin}`,
            background: `${colors.robin}14`,
            padding: '8px 12px',
            fontSize: 12.5,
            color: colors.navy,
            whiteSpace: 'pre-wrap',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.brass }}>
            ✨ Structured entry
          </span>
          <div style={{ marginTop: 4, lineHeight: 1.5 }}>{formatEntry(draft, structured)}</div>
        </div>
      )}

      {/* Today's log */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.brass, marginBottom: 4 }}>
          Today&rsquo;s log · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.length === 0 && (
            <p style={{ margin: 0, fontSize: 12.5, color: colors.graphite }}>
              No entries yet — your first spoken report lands here and in the project&rsquo;s daily log.
            </p>
          )}
          {entries.map((e) => (
            <div
              key={e.id}
              style={{
                borderRadius: 8,
                border: `1px solid ${colors.paper.border}`,
                background: '#fff',
                padding: '8px 10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.brass }}>
                  {new Date(e.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    color: e.persisted === 'db' ? '#0E7C66' : colors.brass,
                    background: e.persisted === 'db' ? '#14B8A622' : `${colors.brass}1A`,
                  }}
                >
                  {e.persisted === 'db' ? 'synced' : 'local'}
                </span>
              </div>
              <div style={{ marginTop: 3, fontSize: 12.5, color: colors.navy, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                {e.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
