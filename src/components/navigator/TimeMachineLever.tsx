'use client';

import { useRef, useState, useEffect } from 'react';
import type { TimeMachineData, Snapshot } from './types';
import { NAVIGATOR_EVENTS } from './types';

export interface TimeMachineLeverProps {
  data: TimeMachineData;
  /** Fires when user drags the lever to a snapshot (or releases back to "now"). */
  onScrub: (snapshotId: string | null) => void;
  /** Optional: compact mode hides the track and shows just a "last saved: X" text. */
  compact?: boolean;
  /** Disable interaction entirely (e.g., when no project selected). */
  disabled?: boolean;
}

/**
 * TimeMachineLever – Horizontal H.G. Wells-style scrub bar to navigate project snapshots.
 *
 * Empty state: "Nothing to rewind to yet" message if snapshots.length === 0.
 * Interaction: Drag thumb to snap to nearest snapshot. Keyboard: arrow keys, Home/End.
 * Event dispatch: NAVIGATOR_EVENTS.TIME_SCRUBBED custom event on scrub.
 */
export default function TimeMachineLever(props: TimeMachineLeverProps) {
  const { data, onScrub, compact = false, disabled = false } = props;
  const { snapshots, currentSnapshotId } = data;

  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Current position: 0 (oldest) to snapshots.length (now)
  const currentIndex = currentSnapshotId
    ? snapshots.findIndex((s) => s.snapshotId === currentSnapshotId)
    : snapshots.length;
  const isNow = currentSnapshotId === null;

  // Reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Tooltip hover state
  const [hoveredTickIndex, setHoveredTickIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);

  // Emit custom event when snapshotId changes
  const emitTimeScrubbed = (snapshotId: string | null) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(NAVIGATOR_EVENTS.TIME_SCRUBBED, {
          detail: { snapshotId, projectId: null },
        })
      );
    }
  };

  // Find nearest snapshot index to a position (0–1 range)
  const getIndexFromPosition = (pos: number): number => {
    const clamped = Math.max(0, Math.min(1, pos));
    const ideal = clamped * snapshots.length;
    // Snap to nearest tick (including "now" at the end)
    const low = Math.floor(ideal);
    const high = Math.ceil(ideal);
    return ideal - low < 0.5 ? low : high;
  };

  // Handle pointer down on thumb
  const handleThumbPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    thumbRef.current?.setPointerCapture(e.pointerId);
  };

  // Handle pointer move (drag)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current) return;

    const track = trackRef.current.getBoundingClientRect();
    const pos = (e.clientX - track.left) / track.width;
    const newIndex = getIndexFromPosition(pos);

    // Snap without animation in reduced motion
    if (prefersReducedMotion) {
      handleIndexChange(newIndex);
    } else {
      // In normal motion, we could animate here; for now, snap instantly
      handleIndexChange(newIndex);
    }
  };

  // Handle pointer up (release)
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    thumbRef.current?.releasePointerCapture(e.pointerId);
  };

  // Change index and emit events
  const handleIndexChange = (newIndex: number) => {
    const snapshotId = newIndex === snapshots.length ? null : snapshots[newIndex]?.snapshotId;
    onScrub(snapshotId);
    emitTimeScrubbed(snapshotId);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    const key = e.key;
    let newIndex = currentIndex;

    if (key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = Math.max(0, currentIndex - 1);
    } else if (key === 'ArrowRight') {
      e.preventDefault();
      newIndex = Math.min(snapshots.length, currentIndex + 1);
    } else if (key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (key === 'End') {
      e.preventDefault();
      newIndex = snapshots.length;
    } else if (key === ' ' || key === 'Enter') {
      e.preventDefault();
      handleIndexChange(currentIndex);
      return;
    } else {
      return;
    }

    handleIndexChange(newIndex);
  };

  // Calculate thumb position (0–1 range)
  const thumbPos = snapshots.length > 0 ? currentIndex / snapshots.length : 1;

  // Compact mode
  if (compact) {
    const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;
    return (
      <div
        style={{
          fontSize: '11px',
          color: 'var(--graphite)',
          fontWeight: 500,
          padding: '0 12px',
        }}
      >
        Time Machine — {latestSnapshot ? `last saved: ${latestSnapshot.label}` : 'not started'}
      </div>
    );
  }

  // Empty state
  if (snapshots.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '56px',
          borderTop: '1px solid var(--faded-rule)',
          borderBottom: '1px solid var(--faded-rule)',
          color: 'var(--graphite)',
          fontSize: '11px',
          opacity: 0.6,
          padding: '0 12px',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '1px',
            width: '100%',
            backgroundColor: 'var(--graphite)',
            opacity: 0.2,
            marginBottom: '12px',
          }}
        />
        <span>Nothing to rewind to yet — the Time Machine starts recording the first time you save a snapshot</span>
      </div>
    );
  }

  // Expanded mode with snapshots
  const currentSnapshot =
    currentSnapshotId && snapshots.length > 0
      ? snapshots.find((s) => s.snapshotId === currentSnapshotId)
      : null;
  const currentLabel = currentSnapshot?.label || 'NOW';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px 12px',
        borderTop: '1px solid var(--faded-rule)',
        borderBottom: '1px solid var(--faded-rule)',
        backgroundColor: disabled ? 'rgba(0,0,0,0.02)' : 'transparent',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Label above lever */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--graphite)',
          height: '16px',
          position: 'relative',
          minHeight: '16px',
        }}
      >
        {currentLabel}
      </div>

      {/* Track and lever */}
      <div
        ref={trackRef}
        role="slider"
        aria-valuenow={currentIndex}
        aria-valuemin={0}
        aria-valuemax={snapshots.length}
        aria-valuetext={currentLabel}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        style={{
          position: 'relative',
          height: '24px',
          cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
          opacity: disabled ? 0.4 : 1,
          transition: disabled ? 'none' : 'opacity 0.2s ease',
        }}
      >
        {/* Track background (1px horizontal rule) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '0',
            right: '0',
            height: '1px',
            backgroundColor: 'var(--graphite)',
            transform: 'translateY(-50%)',
          }}
        />

        {/* Brass endcaps (circles at left and right) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '-6px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'var(--brass)',
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '-6px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'var(--brass)',
            transform: 'translate(50%, -50%)',
          }}
        />

        {/* Snapshot tick marks */}
        {snapshots.map((snapshot, idx) => {
          const tickPos = snapshots.length > 0 ? (idx / snapshots.length) * 100 : 0;
          return (
            <div
              key={snapshot.snapshotId}
              role="presentation"
              onPointerEnter={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setHoveredTickIndex(idx);
                setTooltipPos({ x: rect.left, y: rect.top - 8 });
              }}
              onPointerLeave={() => setHoveredTickIndex(null)}
              style={{
                position: 'absolute',
                top: '50%',
                left: `${tickPos}%`,
                width: '1px',
                height: '8px',
                backgroundColor: 'var(--graphite)',
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
              }}
            >
              {/* Tooltip on hover */}
              {hoveredTickIndex === idx && (
                <div
                  style={{
                    position: 'fixed',
                    top: tooltipPos.y - 24,
                    left: tooltipPos.x,
                    backgroundColor: 'var(--graphite)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 1000,
                  }}
                >
                  {snapshot.label} • {new Date(snapshot.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}

        {/* "NOW" label at far right */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '0',
            fontSize: '11px',
            color: 'var(--graphite)',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            transform: 'translateY(-50%)',
            marginLeft: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          NOW
        </div>

        {/* Draggable lever thumb (brass disk) */}
        <div
          ref={thumbRef}
          role="presentation"
          onPointerDown={handleThumbPointerDown}
          style={{
            position: 'absolute',
            top: '50%',
            left: `${thumbPos * 100}%`,
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'var(--brass)',
            transform: 'translate(-50%, -50%)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
            transition:
              isDragging || prefersReducedMotion
                ? 'none'
                : 'left 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        />
      </div>
    </div>
  );
}
