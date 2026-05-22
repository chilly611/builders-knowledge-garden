'use client';

/**
 * PunchListClient (q-punch, 2026-05-22)
 * =====================================
 *
 * Field-grade running punch list. Mobile-first. The whole point is that
 * a foreman on a ladder can add a punch item in under 10 seconds:
 *
 *   FAB tap → camera opens (capture="environment") → take photo →
 *   one-line description (with voice button if the browser supports
 *   webkitSpeechRecognition) → submit. Trade + location are optional.
 *
 * Once items exist they show as cards with a thumbnail, description,
 * trade chip, and status chip. Swipe right resolves, swipe left opens a
 * trade reassign menu, long-press deletes. Filter chips at the top
 * narrow the list to Open / Resolved / a specific trade.
 *
 * API:
 *   GET    /api/v1/punch-list?projectId=X[&status=open]
 *   POST   /api/v1/punch-list                  (description + projectId required)
 *   PATCH  /api/v1/punch-list?id=Y             (status / assigned_trade / etc.)
 *   DELETE /api/v1/punch-list?id=Y
 *
 * Photo upload reuses the existing /api/v1/uploads/photo pipeline (auth-
 * gated, magic-byte sniffed). We pass the resulting public URL into the
 * punch row's photo_url column.
 *
 * Why no WorkflowShell? This is a list-and-FAB surface, not a stepwise
 * workflow. q24 (final walk-through) still uses WorkflowShell because
 * THAT is stepwise — the running punch list deliberately doesn't fit
 * that mold.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useProject } from '@/lib/hooks/useProject';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import ProjectContextBanner from '../ProjectContextBanner';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

interface PunchItem {
  id: string;
  project_id: string;
  location: string | null;
  description: string;
  assigned_trade: string | null;
  priority: string | null;
  status: string | null;
  photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type FilterMode = 'all' | 'open' | 'resolved' | string; // string = trade name

const TRADE_OPTIONS = [
  'Electrical',
  'Plumbing',
  'Drywall',
  'Paint',
  'HVAC',
  'Framing',
  'Other',
] as const;

const COLORS = {
  paper: '#FDF8F0',
  trace: '#F4F0E6',
  ink: '#1B3B5E',
  graphite: '#2E2E30',
  fadedRule: '#C9C3B3',
  orange: '#D9642E',
  brass: '#B6873A',
  robin: '#7FCFCB',
  redline: '#A1473A',
  success: '#2E7D32',
  successLight: '#E8F5E9',
  successInk: '#1F5A23',
};

// Bearer-token helper. Mirrors the pattern used in ArchitectOfRecordClient.
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ------------------------------------------------------------------ */
/* Speech recognition (graceful fallback when missing)                  */
/* ------------------------------------------------------------------ */

interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechEvent extends Event {
  results: ArrayLike<SpeechResult>;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
function getSpeechRecognitionCtor(): { new (): SpeechRecognition } | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: { new (): SpeechRecognition };
    webkitSpeechRecognition?: { new (): SpeechRecognition };
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/* ------------------------------------------------------------------ */
/* The component                                                        */
/* ------------------------------------------------------------------ */

export default function PunchListClient({ workflow, stages: _stages }: Props) {
  // _stages is accepted so this signature mirrors FinalWalkThroughClient
  // even though we don't render the JourneyMapHeader directly here.
  void _stages;
  void workflow;

  const { project, projectId } = useProject();

  const [items, setItems] = useState<PunchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('open');

  const [addOpen, setAddOpen] = useState(false);

  /* ---------------- load list ---------------- */

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const headers = await authHeader();
      const res = await fetch(
        `/api/v1/punch-list?projectId=${encodeURIComponent(projectId)}`,
        { headers }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(
          (json && typeof json.error === 'string' ? json.error : null) ||
            `Failed to load punch list (${res.status})`
        );
        return;
      }
      if (Array.isArray(json)) {
        setItems(json as PunchItem[]);
      } else {
        setItems([]);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load punch list');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ---------------- filter ---------------- */

  // DB status vocab is 'open' | 'in_progress' | 'complete' | 'verified'.
  // UI calls a "complete" punch "Resolved" — Tony-foreman's word, not the
  // DB's. We treat both 'complete' and 'verified' as resolved.
  const isResolvedStatus = (s: string | null | undefined): boolean =>
    s === 'complete' || s === 'verified';
  const isOpenStatus = (s: string | null | undefined): boolean =>
    !s || s === 'open' || s === 'in_progress';

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'open') return items.filter((i) => isOpenStatus(i.status));
    if (filter === 'resolved') return items.filter((i) => isResolvedStatus(i.status));
    return items.filter((i) => i.assigned_trade === filter);
  }, [items, filter]);

  const openCount = items.filter((i) => isOpenStatus(i.status)).length;
  const resolvedCount = items.filter((i) => isResolvedStatus(i.status)).length;

  /* ---------------- create ---------------- */

  const handleCreate = useCallback(
    async (payload: {
      description: string;
      photo_url?: string;
      assigned_trade?: string;
      location?: string;
    }) => {
      if (!projectId) throw new Error('No active project');
      const headers = await authHeader();
      const res = await fetch('/api/v1/punch-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          projectId,
          description: payload.description,
          photo_url: payload.photo_url,
          assigned_trade: payload.assigned_trade,
          location: payload.location,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (json && typeof json.error === 'string' ? json.error : null) ||
            `Failed to add punch (${res.status})`
        );
      }
      // Optimistic prepend (server returns the row).
      setItems((prev) => [json as PunchItem, ...prev]);
    },
    [projectId]
  );

  /* ---------------- patch / delete ---------------- */

  const patchItem = useCallback(async (id: string, patch: Partial<PunchItem>) => {
    const headers = await authHeader();
    const res = await fetch(`/api/v1/punch-list?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(patch),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (json && typeof json.error === 'string' ? json.error : null) ||
          `Failed to update punch (${res.status})`
      );
    }
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...(json as PunchItem) } : it))
    );
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const headers = await authHeader();
    const res = await fetch(`/api/v1/punch-list?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(
        (json && typeof json.error === 'string' ? json.error : null) ||
          `Failed to delete punch (${res.status})`
      );
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  /* ---------------- no project state ---------------- */

  if (!projectId) {
    return (
      <div style={{ background: COLORS.paper, minHeight: '100vh', padding: '24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', paddingTop: 48 }}>
          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 28,
              color: COLORS.ink,
              margin: 0,
            }}
          >
            Running punch list
          </h1>
          <p style={{ color: COLORS.graphite, marginTop: 12 }}>
            Open a project first — the punch list is per-project.
          </p>
          <Link
            href="/killerapp"
            style={{ color: COLORS.ink, textDecoration: 'underline', display: 'inline-block', marginTop: 16 }}
          >
            ← Back to the dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: COLORS.paper,
        minHeight: '100vh',
        paddingBottom: 120, // make room for the FAB
      }}
    >
      <ProjectContextBanner project={project} selfWorkflow="punch-list" />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 0' }}>
        <header style={{ marginBottom: 12 }}>
          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 24,
              color: COLORS.ink,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Running punch list
          </h1>
          <p
            style={{
              color: COLORS.graphite,
              fontSize: 13,
              margin: '4px 0 0',
            }}
          >
            Field-grade. Snap a photo, add a one-liner, swipe to resolve. Used during construction,
            not the close-out walk.
          </p>
        </header>

        <FilterChips
          filter={filter}
          onChange={setFilter}
          counts={{ open: openCount, resolved: resolvedCount, all: items.length }}
        />

        {loadError && (
          <div
            style={{
              background: '#FFEBEE',
              color: COLORS.redline,
              padding: '12px 16px',
              border: `1px solid ${COLORS.redline}`,
              borderRadius: 4,
              fontSize: 13,
              marginTop: 12,
            }}
          >
            {loadError}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div style={{ color: COLORS.graphite, fontSize: 14, padding: '32px 0', textAlign: 'center' }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
            {filtered.map((item) => (
              <PunchCard
                key={item.id}
                item={item}
                isOpen={isOpenStatus(item.status)}
                onResolve={() => patchItem(item.id, { status: 'complete' })}
                onReopen={() => patchItem(item.id, { status: 'open' })}
                onReassign={(trade) => patchItem(item.id, { assigned_trade: trade })}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <FAB onClick={() => setAddOpen(true)} />

      {addOpen && (
        <AddPunchModal
          onClose={() => setAddOpen(false)}
          onSubmit={async (payload) => {
            await handleCreate(payload);
            setAddOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter chips                                                         */
/* ------------------------------------------------------------------ */

function FilterChips({
  filter,
  onChange,
  counts,
}: {
  filter: FilterMode;
  onChange: (f: FilterMode) => void;
  counts: { open: number; resolved: number; all: number };
}) {
  const chip = (label: string, value: FilterMode, count?: number) => {
    const active = filter === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => onChange(value)}
        style={{
          padding: '8px 14px',
          borderRadius: 999,
          border: `1.5px solid ${active ? COLORS.ink : COLORS.fadedRule}`,
          background: active ? COLORS.ink : 'transparent',
          color: active ? COLORS.paper : COLORS.graphite,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        {typeof count === 'number' ? (
          <span style={{ marginLeft: 6, opacity: 0.8 }}>{count}</span>
        ) : null}
      </button>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {chip('All', 'all', counts.all)}
      {chip('Open', 'open', counts.open)}
      {chip('Resolved', 'resolved', counts.resolved)}
      {TRADE_OPTIONS.map((t) => chip(t, t))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                          */
/* ------------------------------------------------------------------ */

function EmptyState({ filter }: { filter: FilterMode }) {
  const isOpen = filter === 'open';
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 16px',
        color: COLORS.graphite,
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>
        {isOpen ? '✓' : '·'}
      </div>
      <div style={{ fontSize: 15, color: COLORS.ink, marginBottom: 4 }}>
        {isOpen ? 'No open punch items.' : 'Nothing here yet.'}
      </div>
      <div style={{ fontSize: 13 }}>Tap the + button to add one.</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Punch card — with swipe gestures                                     */
/* ------------------------------------------------------------------ */

function PunchCard({
  item,
  isOpen,
  onResolve,
  onReopen,
  onReassign,
  onDelete,
}: {
  item: PunchItem;
  isOpen: boolean;
  onResolve: () => Promise<void> | void;
  onReopen: () => Promise<void> | void;
  onReassign: (trade: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [dx, setDx] = useState(0); // horizontal drag offset
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const movedHorizontal = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const SWIPE_THRESHOLD = 80;

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    movedHorizontal.current = false;
    cancelLongPress();
    longPressTimer.current = setTimeout(() => {
      // Long press → delete confirmation
      longPressTimer.current = null;
      if (!movedHorizontal.current) {
        if (typeof window !== 'undefined' && window.confirm('Delete this punch item?')) {
          void onDelete();
        }
      }
    }, 600);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    const t = e.touches[0];
    const ddx = t.clientX - startX.current;
    const ddy = t.clientY - startY.current;
    if (Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(ddy)) {
      movedHorizontal.current = true;
      cancelLongPress();
      setDx(ddx);
    }
  };

  const onTouchEnd = () => {
    cancelLongPress();
    const final = dx;
    setDx(0);
    startX.current = null;
    startY.current = null;
    if (final > SWIPE_THRESHOLD) {
      // Swipe right → resolve (or reopen if already resolved)
      if (isOpen) {
        if (typeof window !== 'undefined' && window.confirm('Mark this punch resolved?')) {
          void onResolve();
        }
      } else {
        void onReopen();
      }
    } else if (final < -SWIPE_THRESHOLD) {
      // Swipe left → reassign trade
      setReassignOpen(true);
    }
  };

  return (
    <li
      style={{
        listStyle: 'none',
        marginBottom: 10,
        position: 'relative',
        // Hint backdrop showing the swipe action
        background:
          dx > 10
            ? COLORS.successLight
            : dx < -10
            ? COLORS.trace
            : 'transparent',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {/* Backdrop labels */}
      {dx > 10 && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            color: COLORS.successInk,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          → Resolve
        </div>
      )}
      {dx < -10 && (
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            color: COLORS.brass,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Reassign ←
        </div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          cancelLongPress();
          setDx(0);
        }}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dx === 0 ? 'transform 180ms ease' : 'none',
          background: COLORS.paper,
          border: `1px solid ${COLORS.fadedRule}`,
          borderRadius: 6,
          padding: 12,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          userSelect: 'none',
          touchAction: 'pan-y',
        }}
      >
        {/* Thumbnail */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 4,
            background: COLORS.trace,
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.fadedRule,
            fontSize: 20,
          }}
        >
          {item.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.photo_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span aria-hidden>📷</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={() => setExpanded((v) => !v)}
            style={{
              fontSize: 14,
              color: COLORS.ink,
              fontWeight: 500,
              lineHeight: 1.35,
              whiteSpace: expanded ? 'normal' : 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: 'pointer',
            }}
            title={item.description}
          >
            {item.description}
          </div>

          {item.location && (
            <div
              style={{
                fontSize: 12,
                color: COLORS.graphite,
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.location}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <Chip
              label={item.assigned_trade || 'Other'}
              tone="neutral"
              onClick={() => setReassignOpen(true)}
            />
            <Chip
              label={
                isOpen
                  ? item.status === 'in_progress'
                    ? 'In progress'
                    : 'Open'
                  : item.status === 'verified'
                  ? 'Verified'
                  : 'Resolved'
              }
              tone={isOpen ? 'warn' : 'success'}
            />
          </div>
        </div>

        {/* Tap-friendly resolve button for non-touch users */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {isOpen ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof window !== 'undefined' && window.confirm('Mark resolved?')) {
                  void onResolve();
                }
              }}
              style={{
                background: COLORS.success,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Resolve
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void onReopen();
              }}
              style={{
                background: 'transparent',
                color: COLORS.ink,
                border: `1px solid ${COLORS.fadedRule}`,
                borderRadius: 4,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Reopen
            </button>
          )}
        </div>
      </div>

      {reassignOpen && (
        <ReassignSheet
          current={item.assigned_trade}
          onPick={async (trade) => {
            setReassignOpen(false);
            await onReassign(trade);
          }}
          onClose={() => setReassignOpen(false)}
        />
      )}
    </li>
  );
}

function Chip({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: 'neutral' | 'warn' | 'success';
  onClick?: () => void;
}) {
  const palette =
    tone === 'success'
      ? { bg: COLORS.successLight, fg: COLORS.successInk, border: COLORS.success }
      : tone === 'warn'
      ? { bg: '#FFF3E0', fg: '#7A3E00', border: COLORS.orange }
      : { bg: COLORS.trace, fg: COLORS.graphite, border: COLORS.fadedRule };
  return (
    <span
      onClick={onClick}
      style={{
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: 999,
        padding: '2px 10px',
        fontSize: 11,
        fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Reassign sheet                                                       */
/* ------------------------------------------------------------------ */

function ReassignSheet({
  current,
  onPick,
  onClose,
}: {
  current: string | null;
  onPick: (trade: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Reassign trade"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 29, 51, 0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 400,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.paper,
          width: '100%',
          maxWidth: 480,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          padding: 16,
          boxShadow: '0 -8px 24px rgba(11, 29, 51, 0.18)',
        }}
      >
        <div style={{ fontSize: 16, color: COLORS.ink, fontWeight: 600, marginBottom: 12 }}>
          Reassign trade
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TRADE_OPTIONS.map((t) => {
            const active = t === current;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onPick(t)}
                style={{
                  padding: '10px 14px',
                  border: `1.5px solid ${active ? COLORS.ink : COLORS.fadedRule}`,
                  background: active ? COLORS.ink : 'transparent',
                  color: active ? COLORS.paper : COLORS.graphite,
                  borderRadius: 999,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            background: 'transparent',
            color: COLORS.graphite,
            border: `1px solid ${COLORS.fadedRule}`,
            borderRadius: 6,
            padding: 10,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAB                                                                  */
/* ------------------------------------------------------------------ */

function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add punch item"
      style={{
        position: 'fixed',
        right: 20,
        bottom: 24,
        zIndex: 300,
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: COLORS.orange,
        color: '#fff',
        border: 'none',
        boxShadow: '0 6px 18px rgba(11, 29, 51, 0.25)',
        fontSize: 18,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
        <span style={{ fontSize: 28, lineHeight: 1 }}>+</span>
        <span style={{ fontSize: 9, letterSpacing: 0.5, marginTop: 2 }}>PUNCH</span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Add Punch modal                                                      */
/* ------------------------------------------------------------------ */

function AddPunchModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (payload: {
    description: string;
    photo_url?: string;
    assigned_trade?: string;
    location?: string;
  }) => Promise<void>;
}) {
  const [, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [trade, setTrade] = useState<string>('Other');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const speechSupported = useMemo(() => getSpeechRecognitionCtor() != null, []);

  // Open the camera immediately on mount — the whole point is foreman speed.
  useEffect(() => {
    const t = setTimeout(() => fileInputRef.current?.click(), 50);
    return () => clearTimeout(t);
  }, []);

  // Clean up the preview blob URL when we unmount.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const onPhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setPhotoFile(f);
    const url = URL.createObjectURL(f);
    setPhotoPreview(url);

    // Kick off upload immediately so it runs in parallel with the user
    // typing/voicing the description. By the time they hit submit the
    // photo URL is usually ready.
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', f);
      const headers = await authHeader();
      const res = await fetch('/api/v1/uploads/photo', {
        method: 'POST',
        headers, // FormData sets its own Content-Type
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok || !json.url) {
        throw new Error(json?.error || `Photo upload failed (${res.status})`);
      }
      setPhotoUrl(json.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploading(false);
    }

    // Auto-focus description so they can type immediately
    setTimeout(() => textInputRef.current?.focus(), 50);
  }, []);

  const toggleVoice = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Voice input not supported in this browser.');
      return;
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang =
      typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
    rec.onresult = (ev: SpeechEvent) => {
      let combined = '';
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        combined += r[0].transcript;
      }
      // Replace the prior in-flight transcript chunk: simplest approach
      // is to just set to combined when this is the only run.
      setDescription(combined.trim());
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening]);

  const canSubmit =
    description.trim().length > 0 && !submitting && !uploading;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        description: description.trim(),
        photo_url: photoUrl || undefined,
        assigned_trade: trade && trade !== 'Other' ? trade : undefined,
        location: location.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add punch');
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Add punch item"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 29, 51, 0.6)',
        zIndex: 400,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: COLORS.paper,
          width: '100%',
          maxWidth: 520,
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 20, color: COLORS.ink, fontFamily: 'Georgia, serif' }}>
            Add punch
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: COLORS.graphite,
              fontSize: 24,
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Step 1: photo (required, but the file picker auto-opens) */}
        <label
          style={{
            display: 'block',
            border: `1.5px dashed ${COLORS.fadedRule}`,
            borderRadius: 6,
            background: COLORS.trace,
            padding: 16,
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Selected punch photo"
              style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 4 }}
            />
          ) : (
            <div style={{ color: COLORS.graphite, fontSize: 14 }}>
              <div style={{ fontSize: 32 }} aria-hidden>📷</div>
              <div>Tap to take a photo</div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoChange}
            style={{ display: 'none' }}
          />
          {uploading && (
            <div style={{ marginTop: 8, fontSize: 12, color: COLORS.graphite }}>
              Uploading photo…
            </div>
          )}
          {photoUrl && !uploading && (
            <div style={{ marginTop: 8, fontSize: 12, color: COLORS.success }}>
              ✓ Photo uploaded
            </div>
          )}
        </label>

        {/* Step 2: description (REQUIRED) */}
        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: COLORS.graphite, marginBottom: 4 }}>
            What&apos;s wrong? <span style={{ color: COLORS.redline }}>*</span>
          </div>
          <div style={{ position: 'relative' }}>
            <textarea
              ref={textInputRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Outlet cover missing in master closet"
              rows={2}
              style={{
                width: '100%',
                padding: '10px 44px 10px 12px',
                border: `1.5px solid ${COLORS.fadedRule}`,
                borderRadius: 6,
                fontSize: 16, // 16+ to prevent iOS zoom-on-focus
                color: COLORS.ink,
                background: '#fff',
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: 1.35,
                boxSizing: 'border-box',
              }}
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={listening ? 'Stop recording' : 'Voice input'}
                style={{
                  position: 'absolute',
                  right: 6,
                  top: 6,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: listening ? COLORS.redline : COLORS.trace,
                  color: listening ? '#fff' : COLORS.ink,
                  border: `1px solid ${listening ? COLORS.redline : COLORS.fadedRule}`,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                🎤
              </button>
            )}
          </div>
        </label>

        {/* Step 3: trade (optional, defaults to Other) */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: COLORS.graphite, marginBottom: 4 }}>
            Trade <span style={{ opacity: 0.7 }}>(optional)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TRADE_OPTIONS.map((t) => {
              const active = t === trade;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrade(t)}
                  style={{
                    padding: '8px 12px',
                    border: `1.5px solid ${active ? COLORS.ink : COLORS.fadedRule}`,
                    background: active ? COLORS.ink : 'transparent',
                    color: active ? COLORS.paper : COLORS.graphite,
                    borderRadius: 999,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: location (optional, free text) */}
        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: COLORS.graphite, marginBottom: 4 }}>
            Location <span style={{ opacity: 0.7 }}>(optional)</span>
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Master bath, north wall"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1.5px solid ${COLORS.fadedRule}`,
              borderRadius: 6,
              fontSize: 16,
              color: COLORS.ink,
              background: '#fff',
              boxSizing: 'border-box',
            }}
          />
        </label>

        {error && (
          <div
            style={{
              background: '#FFEBEE',
              color: COLORS.redline,
              padding: '10px 12px',
              border: `1px solid ${COLORS.redline}`,
              borderRadius: 4,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          style={{
            background: canSubmit ? COLORS.orange : COLORS.fadedRule,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '14px 18px',
            fontSize: 16,
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            marginBottom: 8,
          }}
        >
          {submitting ? 'Adding…' : uploading ? 'Uploading photo…' : 'Add punch'}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            color: COLORS.graphite,
            border: `1px solid ${COLORS.fadedRule}`,
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
