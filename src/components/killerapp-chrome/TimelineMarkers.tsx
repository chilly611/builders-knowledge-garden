'use client';

/**
 * TimelineMarkers — draggable date markers above JourneyTimeRow.
 *
 * Renders the schedule's named markers (permits, foundation, framing,
 * etc.) as small chips positioned along the same horizontal axis as the
 * 7 stage nodes. The builder can drag a marker left/right to reorder
 * or reschedule.
 *
 * Drag implementation
 * -------------------
 * Native HTML5 drag-and-drop (dragstart / dragover / drop). No new
 * library — the chrome ships with what's already in package.json.
 *
 * Persistence note
 * ----------------
 * The schedule API at /api/v1/projects/schedule is generate-only (Claude
 * builds a fresh schedule from project params). There is no update
 * endpoint for reordering individual markers yet. So TimelineMarkers
 * fires an `onReorder(nextOrder)` callback and lets the parent decide
 * how to persist (optimistic local + POST follow-up later). This keeps
 * the chrome honest for the Thursday demo without inventing a fake API.
 */

import { useMemo, useState } from 'react';
import { KAC_COLORS, KAC_FONTS } from './types';
import type { KacTimelineMarker } from './types';

export interface TimelineMarkersProps {
  startDate: string; // ISO
  endDate: string; // ISO
  markers: KacTimelineMarker[];
  /** Fired with the reordered marker list (by id) when a drop completes. */
  onReorder?: (orderedIds: string[]) => void;
  /** Override height in px. Default 28. */
  height?: number;
}

function isoToTs(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function fmtMonthDay(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function TimelineMarkers({
  startDate,
  endDate,
  markers,
  onReorder,
  height = 28,
}: TimelineMarkersProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const span = useMemo(() => {
    const start = isoToTs(startDate);
    const end = isoToTs(endDate);
    return { start, end, total: Math.max(1, end - start) };
  }, [startDate, endDate]);

  // Sort by date so the rendered order matches calendar order on first paint.
  const sorted = useMemo(
    () => [...markers].sort((a, b) => isoToTs(a.date) - isoToTs(b.date)),
    [markers]
  );

  function positionPct(iso: string): number {
    const ts = isoToTs(iso);
    return Math.max(0, Math.min(100, ((ts - span.start) / span.total) * 100));
  }

  function handleDragStart(id: string, e: React.DragEvent) {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox to start the drag.
    e.dataTransfer.setData('text/plain', id);
  }

  function handleDragOver(id: string, e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoverId !== id) setHoverId(id);
  }

  function handleDragLeave(id: string) {
    if (hoverId === id) setHoverId(null);
  }

  function handleDrop(targetId: string, e: React.DragEvent) {
    e.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setHoverId(null);
      return;
    }
    const ids = sorted.map((m) => m.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) {
      setDragId(null);
      setHoverId(null);
      return;
    }
    const next = [...ids];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setDragId(null);
    setHoverId(null);
    onReorder?.(next);
  }

  function handleDragEnd() {
    setDragId(null);
    setHoverId(null);
  }

  if (sorted.length === 0) {
    return <div style={{ height }} aria-hidden="true" />;
  }

  return (
    <div
      role="list"
      aria-label="Schedule milestones"
      style={{
        position: 'relative',
        height,
        width: '100%',
        flexShrink: 0,
      }}
    >
      {/* Faint baseline */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 1,
          background: KAC_COLORS.divider,
        }}
      />
      {sorted.map((m) => {
        const left = positionPct(m.date);
        const isDragging = dragId === m.id;
        const isHover = hoverId === m.id && dragId && dragId !== m.id;
        return (
          <div
            key={m.id}
            role="listitem"
            draggable
            onDragStart={(e) => handleDragStart(m.id, e)}
            onDragOver={(e) => handleDragOver(m.id, e)}
            onDragLeave={() => handleDragLeave(m.id)}
            onDrop={(e) => handleDrop(m.id, e)}
            onDragEnd={handleDragEnd}
            title={`${m.label} — ${fmtMonthDay(m.date)}`}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: 0,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '2px 8px',
              borderRadius: 999,
              background: isHover ? KAC_COLORS.redChrome : KAC_COLORS.card,
              border: `1px solid ${isHover ? KAC_COLORS.redChrome : KAC_COLORS.divider}`,
              color: isHover ? KAC_COLORS.card : KAC_COLORS.textInk,
              fontFamily: KAC_FONTS.body,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.02em',
              cursor: 'grab',
              opacity: isDragging ? 0.5 : 1,
              userSelect: 'none',
              whiteSpace: 'nowrap',
              transition: 'background 160ms ease, color 160ms ease, opacity 160ms ease',
              boxShadow: `0 1px 2px ${KAC_COLORS.shadow}`,
            }}
          >
            <span>{m.label}</span>
            <span
              style={{
                fontFamily: KAC_FONTS.mono,
                fontSize: 9,
                color: isHover ? KAC_COLORS.card : KAC_COLORS.textWarmGray,
                lineHeight: 1,
              }}
            >
              {fmtMonthDay(m.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
