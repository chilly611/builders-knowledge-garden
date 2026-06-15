'use client';

/**
 * FieldLogPlates — Killer App cockpit "Field log" (Fidelity spec B4).
 *
 * A herbarium plate strip of the project's most recent field activity, read
 * from the REAL persisted store: GET /api/v1/projects/<id>/attachments (site
 * photos, receipts, docs — newest first, with captions + EXIF dates).
 *
 * HONESTY (the whole point of this slice):
 *   - Shows real entries when they exist; an inviting, on-brand EMPTY plate
 *     when they don't. It never fabricates jobsite photos or notes.
 *   - Anon / demo / a project with no uploads → the request 401s or returns
 *     [], and we render the honest empty-state. No fake "0041 Framing passed"
 *     rows (those are the Owner-Lane demo fixture, not a store).
 *   - The plate № is the entry's real running position in the log (newest =
 *     highest), not an invented catalog number.
 *
 * Tokens only; no emoji in chrome (do-not list) — inline SVG glyphs. The
 * fetch is client-only (entries are null through SSR + first render, so date
 * formatting never hits the server HTML → no hydration mismatch).
 */

import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/authed-fetch';

interface Attachment {
  id: string;
  mime_type: string | null;
  original_filename: string | null;
  caption: string | null;
  exif_taken_at: string | null;
  created_at: string;
  signed_url: string | null;
}

const MONO = 'var(--bp-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-archivo-black, var(--font-archivo)), sans-serif';
const GRAPHITE = 'var(--ink-graphite, #2A2620)';
const BRASS = 'var(--brass, #B08D5C)';

const MAX_PLATES = 4;

function kindOf(mime: string | null): { label: string; tone: string } {
  if (!mime) return { label: 'Note', tone: 'var(--specimen-teal, #3C7A8A)' };
  if (mime.startsWith('image/')) return { label: 'Photo', tone: 'var(--specimen-teal, #3C7A8A)' };
  if (mime.startsWith('video/')) return { label: 'Video', tone: 'var(--specimen-brass, #B08D5C)' };
  if (mime === 'application/pdf' || mime.includes('pdf')) return { label: 'Doc', tone: 'var(--specimen-sage, #5E7A56)' };
  return { label: 'File', tone: 'var(--specimen-sage, #5E7A56)' };
}

/** en-US so SSR (n/a here — client-only) and client agree; "May 26, 2026". */
function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Document/leaf glyph for non-image plates — no emoji. */
function DocGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 3h8l4 4v14H6z" stroke={BRASS} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M14 3v4h4" stroke={BRASS} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 12h6M9 15h6M9 18h3" stroke={BRASS} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

/** Pressed-leaf specimen glyph for the empty-state — quiet, on-brand. */
function LeafGlyph() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 19c0-7 5-13 14-14 1 9-5 15-14 14z" stroke={BRASS} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5 19C9 15 13 11 18 6" stroke={BRASS} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function Plate({ entry, plateNo }: { entry: Attachment; plateNo: number }) {
  const kind = kindOf(entry.mime_type);
  const isImage = !!entry.mime_type?.startsWith('image/') && !!entry.signed_url;
  const title = entry.caption?.trim() || entry.original_filename || 'Field entry';
  const date = fmtDate(entry.exif_taken_at || entry.created_at);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--faded-rule, rgba(0,0,0,0.12))',
        background: 'var(--paper-cream, #F2E9D2)',
      }}
    >
      <div
        style={{
          aspectRatio: '4 / 3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isImage
            ? `center / cover no-repeat url("${entry.signed_url}")`
            : 'linear-gradient(135deg, var(--paper-vellum, #E8DDB8), var(--paper-cream, #F2E9D2))',
        }}
      >
        {isImage ? null : <DocGlyph />}
      </div>
      <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: BRASS }}>
            № {String(plateNo).padStart(2, '0')}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--ink-faded, #8A8478)' }}>{date}</span>
        </div>
        <span
          style={{
            fontSize: 12.5,
            lineHeight: 1.3,
            color: GRAPHITE,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </span>
        <span
          style={{
            alignSelf: 'flex-start',
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: kind.tone,
            background: 'color-mix(in srgb, currentColor 12%, transparent)',
            padding: '2px 6px',
            borderRadius: 999,
          }}
        >
          {kind.label}
        </span>
      </div>
    </div>
  );
}

export default function FieldLogPlates({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<Attachment[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!projectId) {
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        // Race the whole authed request against a timeout: authedFetch awaits
        // supabase.auth.getSession() first, which can stall under Web-Locks
        // contention — without this the strip would skeleton forever instead
        // of settling to the honest empty-state.
        const res = await Promise.race([
          authedFetch(`/api/v1/projects/${encodeURIComponent(projectId)}/attachments`),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
        if (!alive) return;
        if (res && res.ok) {
          const json = await res.json();
          setEntries(Array.isArray(json?.attachments) ? json.attachments : []);
        } else {
          // 401 (anon/demo), 403, 404, or timeout → honest empty, never a
          // fabricated log.
          setEntries([]);
        }
      } catch {
        if (alive) setEntries([]);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId]);

  const total = entries?.length ?? 0;
  const shown = entries?.slice(0, MAX_PLATES) ?? [];

  return (
    <section style={{ marginBottom: 20 }} data-machine="field_log">
      <script
        type="application/json"
        data-machine-twin="field_log"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ type: 'field_log', count: total, loaded }) }}
      />
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: BRASS }}>Field log</div>
        {total > 0 ? (
          <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--ink-faded, #8A8478)' }}>
            {total} {total === 1 ? 'entry' : 'entries'} · newest first
          </span>
        ) : null}
      </div>

      {!loaded ? (
        // brief client-only skeleton (data loads after paint)
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: '4 / 3',
                borderRadius: 10,
                border: '1px solid var(--faded-rule, rgba(0,0,0,0.10))',
                background: 'linear-gradient(135deg, var(--paper-vellum, #E8DDB8), var(--paper-cream, #F2E9D2))',
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      ) : total > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {shown.map((e, i) => (
            <Plate key={e.id} entry={e} plateNo={total - i} />
          ))}
        </div>
      ) : (
        // HONEST empty-state — inviting, never fabricated.
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 18px',
            borderRadius: 12,
            border: '1px dashed var(--specimen-brass, #B08D5C)',
            background: 'linear-gradient(135deg, var(--paper-cream, #F2E9D2), var(--paper-vellum, #E8DDB8))',
          }}
        >
          <span style={{ flexShrink: 0 }}>
            <LeafGlyph />
          </span>
          <div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 15, color: GRAPHITE, marginBottom: 2 }}>
              Your field log is empty
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--ink-faded, #6A6256)' }}>
              Site photos, receipts, and notes you capture on the job plate up here — newest first.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
