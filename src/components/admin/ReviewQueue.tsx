'use client';

/**
 * ReviewQueue — the human-in-the-loop approval surface (LOOP 2 / Slice B "B5",
 * docs/code-ingestion-hitl.md §6). The reviewer-facing screen over the B2 gate
 * API: list the review/needs_changes inbox, open a row, run the checklist, and
 * approve (= attest + publish) / request changes / reject.
 *
 * Presentational only — `items` + action callbacks are injected by the page,
 * so it's verifiable with seeded rows and free of I/O. Herbarium-locked via the
 * design-system `colors` tokens (paper-cream ground, ink-graphite text, brass
 * accent, the sage/amber/rust flag taxonomy). No #E8443A, no pure white, no
 * emoji, sentence-case headings/buttons, mono UPPERCASE engineering labels.
 *
 * §6 specifics honored: AI's-read flag chip per row; approve gated on the
 * substantive checklist boxes (invitation, not instruction); source links open
 * out; the Invitation-Card empty state; a Goal-8 machine twin for agents.
 */

import { useCallback, useState } from 'react';
import { colors } from '@/design-system';

// ── Palette (design-system tokens + the §3 flag taxonomy) ───────────────────
const C = {
  paper: colors.paper.cream, // #F2E9D2 — ground (never pure white)
  vellum: colors.paper.warm, // #E8DDB8 — raised panels
  edge: colors.trace, // #C9B98A — hairline rules
  ink: colors.graphite, // #2A2620 — text (never pure black)
  brass: colors.brass, // #B08D5C — the one accent / approve
  teal: colors.robin, // #3C7A8A — links / status
  amber: colors.orange, // #C68A3D — watch flag / request-changes
  rust: colors.redline, // #A53A2D — risk flag / reject
  sage: '#5E7A56', // green/ease flag (visual-first-and-flags.md §3)
  muted: '#8A7F66',
};

export interface ReviewItem {
  id: string;
  slug: string | null;
  title: string; // already unwrapped to plain text by the page
  entity_type: string | null;
  domain: string | null;
  status: string;
  jurisdiction_label?: string | null;
  auto_verification_flagged: boolean | null;
  auto_verification_confidence: number | null;
  source_urls: string[] | null;
}

export interface ReviewEventRow {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor_kind: string;
  note: string | null;
  source: string | null;
  created_at: string;
}

export interface ReviewQueueProps {
  items: ReviewItem[];
  loading?: boolean;
  error?: string | null;
  busyId?: string | null;
  onApprove: (id: string, source: string) => void;
  onReject: (id: string, reason: string) => void;
  onRequestChanges: (id: string, note: string) => void;
  loadHistory: (id: string) => Promise<ReviewEventRow[]>;
}

// Plain-language labels — no garden-speak / no raw entity_type in the surface.
const TYPE_LABEL: Record<string, string> = {
  building_code: 'Building code',
  code: 'Code',
  code_section: 'Code section',
  permit_requirement: 'Permit requirement',
  safety_regulation: 'Safety regulation',
  standard: 'Standard',
};
const typeLabel = (t: string | null) => (t ? TYPE_LABEL[t] ?? t.replace(/_/g, ' ') : 'Entity');

// §6 reviewer checklist. The first four are "substantive" — approve is gated
// on them (the domain-bucket check ties to §4 and is advisory).
const CHECKLIST = [
  { key: 'sources', label: 'Every source link opens and supports the claim', substantive: true },
  { key: 'match', label: 'Title + summary match the authoritative source', substantive: true },
  { key: 'jurisdiction', label: 'Jurisdiction is correct for this content', substantive: true },
  { key: 'edition', label: 'Code edition / year is the current cycle', substantive: true },
  { key: 'flag', label: 'Any AI-flagged discrepancy is resolved', substantive: false },
  { key: 'bucket', label: 'Domain bucket is correct for the entity type', substantive: false },
] as const;

const mono: React.CSSProperties = {
  fontFamily: 'var(--bp-font-mono, ui-monospace, monospace)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontSize: 11,
};

function FlagChip({ item }: { item: ReviewItem }) {
  const pct =
    typeof item.auto_verification_confidence === 'number'
      ? `${Math.round(item.auto_verification_confidence * 100)}%`
      : null;
  let color = C.muted;
  let label = 'Not yet checked';
  if (item.auto_verification_flagged === true) {
    color = C.rust;
    label = pct ? `AI flagged · ${pct}` : 'AI flagged';
  } else if (item.auto_verification_flagged === false) {
    color = C.sage;
    label = pct ? `AI cleared · ${pct}` : 'AI cleared';
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} aria-hidden />
      <span style={{ ...mono, color, letterSpacing: '0.08em' }}>{label}</span>
    </span>
  );
}

export default function ReviewQueue({
  items,
  loading = false,
  error = null,
  busyId = null,
  onApprove,
  onReject,
  onRequestChanges,
  loadHistory,
}: ReviewQueueProps) {
  return (
    <main
      data-machine="review_queue"
      style={{
        minHeight: '100vh',
        background: C.paper,
        color: C.ink,
        fontFamily: 'var(--font-archivo), system-ui, sans-serif',
        padding: '40px 24px 80px',
      }}
    >
      {/* Goal-8 machine twin — the queue an agent can traverse (§6). */}
      <script
        type="application/json"
        data-machine-twin="review_queue"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            type: 'review_queue',
            actions: ['approve', 'request_changes', 'reject'],
            items: items.map((i) => ({
              id: i.id,
              status: i.status,
              entity_type: i.entity_type,
              flagged: i.auto_verification_flagged,
              confidence: i.auto_verification_confidence,
            })),
          }),
        }}
      />

      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <p style={{ ...mono, color: C.brass, margin: '0 0 6px' }}>
          Human-in-the-loop · approval gate
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 4px' }}>Review queue</h1>
        <p style={{ color: C.muted, margin: '0 0 28px', fontSize: 15 }}>
          {loading
            ? 'Loading the queue…'
            : `${items.length} ${items.length === 1 ? 'item is' : 'items are'} waiting for your eyes — flagged first, least-confident first.`}
        </p>

        {error && (
          <div
            style={{
              border: `1px solid ${C.rust}`,
              background: C.vellum,
              borderRadius: 10,
              padding: '14px 16px',
              color: C.rust,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && <EmptyInvitation />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onApprove={onApprove}
              onReject={onReject}
              onRequestChanges={onRequestChanges}
              loadHistory={loadHistory}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function EmptyInvitation() {
  return (
    <div
      style={{
        border: `1px solid ${C.edge}`,
        background: C.vellum,
        borderRadius: 12,
        padding: '40px 28px',
        textAlign: 'center',
      }}
    >
      <p style={{ ...mono, color: C.sage, margin: '0 0 8px' }}>Queue clear</p>
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>Nothing is waiting for your review</h2>
      <p style={{ color: C.muted, margin: 0, fontSize: 14, lineHeight: 1.6 }}>
        New knowledge lands here as <code>review</code> before it can publish, and rows sent back for changes
        return here. When something needs a human, it&rsquo;ll be the brightest thing on this page.
      </p>
    </div>
  );
}

function QueueRow({
  item,
  busy,
  onApprove,
  onReject,
  onRequestChanges,
  loadHistory,
}: {
  item: ReviewItem;
  busy: boolean;
  onApprove: (id: string, source: string) => void;
  onReject: (id: string, reason: string) => void;
  onRequestChanges: (id: string, note: string) => void;
  loadHistory: (id: string) => Promise<ReviewEventRow[]>;
}) {
  const [open, setOpen] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [source, setSource] = useState('upcodes-essentials');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'idle' | 'reject' | 'request'>('idle');
  const [history, setHistory] = useState<ReviewEventRow[] | null>(null);

  const substantiveDone = CHECKLIST.filter((c) => c.substantive).every((c) => checks[c.key]);
  const sourceCount = item.source_urls?.filter(Boolean).length ?? 0;

  const toggleOpen = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && history === null) {
      try {
        setHistory(await loadHistory(item.id));
      } catch {
        setHistory([]);
      }
    }
  }, [open, history, item.id, loadHistory]);

  return (
    <section
      style={{
        border: `1px solid ${C.edge}`,
        background: open ? C.vellum : 'rgba(255,253,247,0.5)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ ...mono, color: C.muted, letterSpacing: '0.1em' }}>{typeLabel(item.entity_type)}</span>
            <FlagChip item={item} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
            {item.jurisdiction_label || 'Globally applicable'} · {sourceCount} source{sourceCount === 1 ? '' : 's'} · {item.status.replace(/_/g, ' ')}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleOpen}
          style={{
            border: `1px solid ${C.edge}`,
            background: 'transparent',
            color: C.teal,
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {open ? 'Close' : 'Review'}
        </button>
      </div>

      {/* Detail */}
      {open && (
        <div style={{ borderTop: `1px solid ${C.edge}`, padding: '18px' }}>
          {/* Source links */}
          {sourceCount > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ ...mono, color: C.muted, margin: '0 0 8px' }}>Sources — open and confirm</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {item.source_urls!.filter(Boolean).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: C.teal, fontSize: 13, textDecoration: 'underline', wordBreak: 'break-all' }}
                  >
                    {url.replace(/^https?:\/\//, '').slice(0, 48)}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Reviewer checklist (§5/§6) — gates approve */}
          <p style={{ ...mono, color: C.muted, margin: '0 0 8px' }}>Reviewer checklist</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
            {CHECKLIST.map((c) => (
              <label key={c.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!checks[c.key]}
                  onChange={(e) => setChecks((p) => ({ ...p, [c.key]: e.target.checked }))}
                  style={{ marginTop: 2, accentColor: C.brass }}
                />
                <span style={{ color: checks[c.key] ? C.ink : C.muted }}>
                  {c.label}
                  {!c.substantive && <span style={{ ...mono, color: C.edge, marginLeft: 6 }}>optional</span>}
                </span>
              </label>
            ))}
          </div>

          {/* History timeline (§3) */}
          <p style={{ ...mono, color: C.muted, margin: '0 0 8px' }}>History</p>
          <div style={{ marginBottom: 18, fontSize: 13, color: C.muted }}>
            {history === null ? (
              'Loading…'
            ) : history.length === 0 ? (
              <span>No prior decisions — this is its first time through the gate.</span>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {history.map((ev) => (
                  <li key={ev.id}>
                    <strong>{ev.action.replace(/_/g, ' ')}</strong>
                    {ev.from_status && ev.to_status ? ` · ${ev.from_status} → ${ev.to_status}` : ''}
                    {ev.note ? ` — “${ev.note}”` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reject / request-changes note input */}
          {mode !== 'idle' && (
            <div style={{ marginBottom: 12 }}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={mode === 'reject' ? 'Why is this being rejected? (required)' : 'What needs to change? (required)'}
                rows={2}
                style={{
                  width: '100%',
                  border: `1px solid ${C.edge}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  background: C.paper,
                  color: C.ink,
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {mode === 'idle' ? (
              <>
                <button
                  type="button"
                  disabled={!substantiveDone || busy}
                  onClick={() => onApprove(item.id, source.trim() || 'upcodes-essentials')}
                  title={substantiveDone ? undefined : 'Tick the substantive checks first'}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    color: C.paper,
                    background: substantiveDone && !busy ? C.brass : C.edge,
                    cursor: substantiveDone && !busy ? 'pointer' : 'not-allowed',
                  }}
                >
                  {busy ? 'Working…' : 'Approve & publish'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { setMode('request'); setNote(''); }}
                  style={pill(C.amber)}
                >
                  Request changes
                </button>
                <button type="button" disabled={busy} onClick={() => { setMode('reject'); setNote(''); }} style={pill(C.rust)}>
                  Reject
                </button>
                {!substantiveDone && (
                  <span style={{ fontSize: 12, color: C.muted }}>Approve unlocks once the four substantive checks are ticked.</span>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={!note.trim() || busy}
                  onClick={() => {
                    if (mode === 'reject') onReject(item.id, note.trim());
                    else onRequestChanges(item.id, note.trim());
                    setMode('idle');
                  }}
                  style={{ ...pill(mode === 'reject' ? C.rust : C.amber), opacity: note.trim() && !busy ? 1 : 0.5 }}
                >
                  {mode === 'reject' ? 'Confirm reject' : 'Send back'}
                </button>
                <button type="button" onClick={() => setMode('idle')} style={pill(C.muted)}>
                  Cancel
                </button>
              </>
            )}
          </div>

          {/* Approve source (advisory) */}
          {mode === 'idle' && (
            <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
              Approving records your attestation against{' '}
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{
                  border: 'none',
                  borderBottom: `1px solid ${C.edge}`,
                  background: 'transparent',
                  color: C.ink,
                  fontFamily: 'var(--bp-font-mono, monospace)',
                  fontSize: 12,
                  width: 150,
                }}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function pill(color: string): React.CSSProperties {
  return {
    border: `1px solid ${color}`,
    background: 'transparent',
    color,
    borderRadius: 8,
    padding: '9px 16px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };
}
