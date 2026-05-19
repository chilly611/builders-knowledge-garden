'use client';

/**
 * JourneyTimeline (Ship 24 — investor demo Wed May 20)
 * =====================================================
 * The merged Journey Map + Time Machine surface per Chilly's directive:
 *
 *   "The journey map should reflect where you have interacted, where you have
 *    completed at least once and where you haven't yet visited in the project.
 *    The time machine needs to reflect the same and those two should be
 *    combined. The journey map is a still, present tense reflection of where
 *    you are in time. The time machine you can go back or forward in time to
 *    see what has been done and see what needs to be done."
 *
 * SINGLE horizontal surface inside the cockpit that does both jobs:
 *
 *   Top row    — 7 stage segments. State: visited | completed | unvisited |
 *                active. Each segment is a real <button> for a11y.
 *   Bottom row — Brass scrubber rail. Snapshot ticks on the left half, "now"
 *                marker, future zone (dashed) on the right. Drag handle or
 *                click ticks to rewind. Drag past "now" to preview unvisited
 *                stages forward in time.
 *   Banner     — "Return to live" pill appears centered below when the user
 *                is scrubbed off live (either backward into a snapshot OR
 *                forward into the future preview zone).
 *
 * Replaces the side-by-side <JourneyArc/> + <TimeMachineDial/> rendering in
 * ProjectCockpit. The original components are left in place (other surfaces
 * may import them) — only the cockpit stops mounting them.
 *
 * State derivation (per stage):
 *   - completed: doneCount >= 1
 *   - visited:   doneCount === 0 AND (hasInProgress OR doneCount > 0 in
 *                history). i.e. touched but not yet shipped.
 *   - unvisited: totalCount === 0 OR no interaction at all.
 *   - active:    overrides visual when stage.id === activeStageId.
 *
 * Future preview: when scrubbed past "now", unvisited stages render with a
 * ghosted italicized "coming next" treatment. We do NOT fabricate fake
 * snapshots — just hint at what's ahead.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  STAGE_REGISTRY,
  type StageId,
  type StageProgress,
} from '@/components/navigator/types';
import { LIFECYCLE_STAGES } from '@/lib/lifecycle-stages';
import { STAGE_ACCENTS } from '@/design-system/tokens/stage-accents';

// ─── Types ───────────────────────────────────────────────────────────────

interface SnapshotLike {
  snapshotId: string;
  label: string;
  timestamp: string;
  stageId: number;
}

export type JourneyStageState =
  | 'completed'
  | 'visited'
  | 'unvisited'
  | 'active';

export interface JourneyTimelineProps {
  stages: StageProgress[];
  activeStageId: StageId | null;
  snapshots?: SnapshotLike[];
  currentSnapshotId?: string | null;
  onStageClick?: (stageId: StageId) => void;
  onScrub?: (snapshotId: string | null) => void;
  onPreviewFuture?: (stageId: StageId | null) => void;
  onReturnToLive?: () => void;
}

// ─── Styling constants ───────────────────────────────────────────────────

const BRASS = '#B6873A';
const NAVY = '#1B3B5E';
const TRACE = '#F4F0E6';
const FADED = '#C9C3B3';

// ─── Per-stage state derivation ──────────────────────────────────────────

/**
 * Derive the present-tense state for each stage from the rolled-up
 * StageProgress[] passed in by the cockpit. "active" overrides the visual
 * but is rendered alongside the underlying state (so an active+completed
 * stage still shows its checkmark).
 */
function deriveStageStates(
  stages: StageProgress[],
  activeStageId: StageId | null
): Record<StageId, { base: JourneyStageState; isActive: boolean }> {
  const map: Record<number, { base: JourneyStageState; isActive: boolean }> = {};
  for (const s of stages) {
    let base: JourneyStageState;
    if (s.doneCount >= 1) {
      base = 'completed';
    } else if (s.totalCount === 0) {
      // Nothing to do here at all — treat as unvisited (the stage exists
      // structurally but has no workflows wired yet).
      base = 'unvisited';
    } else if (s.status === 'in_progress' || s.status === 'needs_attention') {
      base = 'visited';
    } else {
      base = 'unvisited';
    }
    map[s.stageId] = {
      base,
      isActive: activeStageId === s.stageId,
    };
  }
  // Ensure every stage in the registry has an entry even if stages[] was
  // partial.
  for (const stage of STAGE_REGISTRY) {
    if (!map[stage.id]) {
      map[stage.id] = {
        base: 'unvisited',
        isActive: activeStageId === stage.id,
      };
    }
  }
  return map as Record<StageId, { base: JourneyStageState; isActive: boolean }>;
}

// ─── Component ───────────────────────────────────────────────────────────

export default function JourneyTimeline({
  stages,
  activeStageId,
  snapshots = [],
  currentSnapshotId = null,
  onStageClick,
  onScrub,
  onPreviewFuture,
  onReturnToLive,
}: JourneyTimelineProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hoveredStageId, setHoveredStageId] = useState<StageId | null>(null);
  const [previewStageId, setPreviewStageId] = useState<StageId | null>(null);
  const [hoveredSnapshotId, setHoveredSnapshotId] = useState<string | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const railRef = useRef<HTMLDivElement | null>(null);

  // Responsive + motion preference
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motion.matches);
    const onMotion = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    motion.addEventListener('change', onMotion);
    return () => {
      window.removeEventListener('resize', check);
      motion.removeEventListener('change', onMotion);
    };
  }, []);

  // Esc returns to live whenever the user is scrubbed off live.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (currentSnapshotId !== null || previewStageId !== null) {
        setPreviewStageId(null);
        onPreviewFuture?.(null);
        onScrub?.(null);
        onReturnToLive?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentSnapshotId, previewStageId, onScrub, onPreviewFuture, onReturnToLive]);

  const stageStates = useMemo(
    () => deriveStageStates(stages, activeStageId),
    [stages, activeStageId]
  );

  // Snapshots come from time-machine newest-first; the scrubber wants
  // oldest → newest left-to-right.
  const orderedSnapshots = useMemo(
    () => [...snapshots].reverse(),
    [snapshots]
  );

  const isScrubbedOffLive = currentSnapshotId !== null || previewStageId !== null;

  // ─── Stage segment renderer ────────────────────────────────────────────
  const renderStageSegment = (stageId: StageId, label: string, emoji: string) => {
    const accent = STAGE_ACCENTS[stageId];
    const accentHex = accent.hex;
    const meta = stageStates[stageId];
    const base = meta?.base ?? 'unvisited';
    const isActive = meta?.isActive ?? false;
    const isHovered = hoveredStageId === stageId;
    const isFuturePreview = previewStageId === stageId && base === 'unvisited';

    // Resolve visual treatment
    let borderWidth = 1;
    let borderStyle = 'solid';
    let borderColor = accentHex;
    let backgroundColor: string = 'transparent';
    let labelOpacity = 0.5;
    let labelWeight: 400 | 500 | 600 | 700 = 500;
    let labelStyle: 'normal' | 'italic' = 'normal';
    let showCheck = false;

    if (base === 'completed') {
      borderWidth = 2;
      borderColor = accentHex;
      backgroundColor = accentHex;
      labelOpacity = 1;
      labelWeight = 700;
      showCheck = true;
    } else if (base === 'visited') {
      borderWidth = 2;
      borderColor = accentHex;
      // ~30% alpha overlay
      backgroundColor = `${accentHex}4D`;
      labelOpacity = 1;
      labelWeight = 600;
    } else {
      // unvisited
      borderWidth = 1;
      borderColor = accentHex;
      backgroundColor = 'transparent';
      labelOpacity = 0.5;
      labelWeight = 500;
    }

    if (isFuturePreview) {
      // Ghosted future treatment — overrides unvisited styling.
      borderStyle = 'dashed';
      labelOpacity = 0.4;
      labelStyle = 'italic';
      backgroundColor = 'transparent';
    }

    const ringStyle = isActive
      ? {
          boxShadow: `0 0 0 2px ${TRACE}, 0 0 0 4px ${BRASS}`,
          animation:
            !prefersReducedMotion && !isScrubbedOffLive
              ? 'bkg-stage-pulse 1.4s ease-in-out infinite'
              : 'none',
        }
      : {};

    const a11yState =
      base === 'completed'
        ? 'Completed'
        : base === 'visited'
        ? 'In progress'
        : isFuturePreview
        ? 'Coming next'
        : 'Not yet visited';

    const onActivate = () => {
      onStageClick?.(stageId);
    };

    const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    };

    return (
      <button
        key={stageId}
        type="button"
        onClick={onActivate}
        onKeyDown={onKey}
        onMouseEnter={() => setHoveredStageId(stageId)}
        onMouseLeave={() => setHoveredStageId(null)}
        onFocus={() => setHoveredStageId(stageId)}
        onBlur={() => setHoveredStageId(null)}
        aria-label={`Stage ${stageId}: ${label}. ${a11yState}.`}
        aria-current={isActive ? 'step' : undefined}
        aria-pressed={isActive}
        data-stage-id={stageId}
        data-stage-state={isFuturePreview ? 'future' : base}
        data-stage-active={isActive ? 'true' : 'false'}
        style={{
          flex: '1 1 0',
          minWidth: 0,
          height: 44,
          padding: '4px 8px',
          margin: 0,
          border: `${borderWidth}px ${borderStyle} ${borderColor}`,
          borderRadius: 6,
          backgroundColor,
          color: base === 'completed' ? TRACE : NAVY,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 12,
          fontStyle: labelStyle,
          fontWeight: labelWeight,
          letterSpacing: 0.2,
          opacity: labelOpacity + (isHovered && !isActive ? 0.1 : 0),
          transition:
            'opacity 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
          position: 'relative',
          ...ringStyle,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>
          {isFuturePreview ? '›' : emoji}
        </span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {label}
        </span>
        {showCheck && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 3,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: BRASS,
              boxShadow: `0 0 0 1px ${TRACE}`,
            }}
          />
        )}
      </button>
    );
  };

  // ─── Scrubber math ─────────────────────────────────────────────────────
  // The bottom rail is divided into two zones:
  //   [ snapshots zone  | now |  future zone ]
  //         0..0.7         0.7      0.7..1.0
  // Snapshot ticks are evenly spaced inside the snapshots zone. The future
  // zone maps to the 7 stages (so dragging right previews each unvisited
  // stage in turn).
  const SNAPSHOT_ZONE_END = 0.7; // fraction of rail width
  const NOW_FRAC = 0.7;

  const xToHandleFrac = (x: number, railWidth: number): number => {
    if (railWidth <= 0) return NOW_FRAC;
    const frac = Math.max(0, Math.min(1, x / railWidth));
    return frac;
  };

  const handleFracToAction = useCallback(
    (frac: number) => {
      if (frac <= NOW_FRAC + 0.005) {
        // Snapshot zone (or "now")
        if (orderedSnapshots.length === 0) {
          // No snapshots; treat as "now"
          setPreviewStageId(null);
          onPreviewFuture?.(null);
          onScrub?.(null);
          return;
        }
        const t = frac / SNAPSHOT_ZONE_END;
        // Map t∈[0,1] across snapshot indices. Right edge of zone = newest
        // (live) snapshot = "now" → null.
        if (t >= 0.995) {
          setPreviewStageId(null);
          onPreviewFuture?.(null);
          onScrub?.(null);
          return;
        }
        const idx = Math.min(
          orderedSnapshots.length - 1,
          Math.max(0, Math.round(t * (orderedSnapshots.length - 1)))
        );
        const snap = orderedSnapshots[idx];
        if (snap) {
          setPreviewStageId(null);
          onPreviewFuture?.(null);
          onScrub?.(snap.snapshotId);
        }
      } else {
        // Future zone — map to next-unvisited stages.
        const futureFrac = (frac - NOW_FRAC) / (1 - NOW_FRAC);
        const unvisited = STAGE_REGISTRY.filter((s) => {
          const st = stageStates[s.id]?.base;
          return st === 'unvisited';
        });
        if (unvisited.length === 0) {
          setPreviewStageId(null);
          onPreviewFuture?.(null);
          return;
        }
        const idx = Math.min(
          unvisited.length - 1,
          Math.max(0, Math.floor(futureFrac * unvisited.length))
        );
        const stage = unvisited[idx];
        setPreviewStageId(stage.id);
        onPreviewFuture?.(stage.id);
        // Don't change snapshot — preview is a UI hint only.
      }
    },
    [orderedSnapshots, stageStates, onPreviewFuture, onScrub]
  );

  const handleRailPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const x = e.clientX - rect.left;
    handleFracToAction(xToHandleFrac(x, rect.width));
  };

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handleRailPointer(e);
  };

  const moveDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handleRailPointer(e);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // Current handle position
  const currentHandleFrac = useMemo(() => {
    if (previewStageId !== null) {
      const unvisited = STAGE_REGISTRY.filter(
        (s) => stageStates[s.id]?.base === 'unvisited'
      );
      const idx = unvisited.findIndex((s) => s.id === previewStageId);
      if (idx < 0 || unvisited.length === 0) return NOW_FRAC;
      // Center of that bucket inside the future zone
      const bucket = 1 / unvisited.length;
      return NOW_FRAC + bucket * (idx + 0.5) * (1 - NOW_FRAC);
    }
    if (currentSnapshotId === null) return NOW_FRAC;
    const idx = orderedSnapshots.findIndex(
      (s) => s.snapshotId === currentSnapshotId
    );
    if (idx < 0) return NOW_FRAC;
    if (orderedSnapshots.length <= 1) return 0;
    return (idx / (orderedSnapshots.length - 1)) * SNAPSHOT_ZONE_END;
  }, [previewStageId, currentSnapshotId, orderedSnapshots, stageStates]);

  // Keyboard navigation on the rail / handle
  const handleScrubKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (orderedSnapshots.length === 0 && e.key !== 'Escape') return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (currentSnapshotId === null) {
        // Move from "now" to most recent past snapshot
        const last = orderedSnapshots[orderedSnapshots.length - 1];
        if (last) onScrub?.(last.snapshotId);
        return;
      }
      const idx = orderedSnapshots.findIndex(
        (s) => s.snapshotId === currentSnapshotId
      );
      if (idx > 0) onScrub?.(orderedSnapshots[idx - 1].snapshotId);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (previewStageId !== null) {
        const unvisited = STAGE_REGISTRY.filter(
          (s) => stageStates[s.id]?.base === 'unvisited'
        );
        const i = unvisited.findIndex((s) => s.id === previewStageId);
        if (i >= 0 && i < unvisited.length - 1) {
          setPreviewStageId(unvisited[i + 1].id);
          onPreviewFuture?.(unvisited[i + 1].id);
        }
        return;
      }
      if (currentSnapshotId === null) {
        // Step forward into future preview if any unvisited exists
        const unvisited = STAGE_REGISTRY.filter(
          (s) => stageStates[s.id]?.base === 'unvisited'
        );
        if (unvisited.length > 0) {
          setPreviewStageId(unvisited[0].id);
          onPreviewFuture?.(unvisited[0].id);
        }
        return;
      }
      const idx = orderedSnapshots.findIndex(
        (s) => s.snapshotId === currentSnapshotId
      );
      if (idx >= 0 && idx < orderedSnapshots.length - 1) {
        onScrub?.(orderedSnapshots[idx + 1].snapshotId);
      } else {
        // step off the end → return to live
        onScrub?.(null);
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (orderedSnapshots.length > 0) onScrub?.(orderedSnapshots[0].snapshotId);
    } else if (e.key === 'End') {
      e.preventDefault();
      setPreviewStageId(null);
      onPreviewFuture?.(null);
      onScrub?.(null);
    }
  };

  const returnToLive = () => {
    setPreviewStageId(null);
    onPreviewFuture?.(null);
    onScrub?.(null);
    onReturnToLive?.();
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div
      data-zone="journey-timeline"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '2px 4px',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Pulse keyframes — scoped via global style tag (inert when not used). */}
      <style>{`
        @keyframes bkg-stage-pulse {
          0%, 100% { box-shadow: 0 0 0 2px ${TRACE}, 0 0 0 4px ${BRASS}; }
          50%      { box-shadow: 0 0 0 2px ${TRACE}, 0 0 0 6px ${BRASS}; }
        }
      `}</style>

      {/* ── Top row: 7 stage segments ─────────────────────────────────── */}
      <div
        role="group"
        aria-label="Project lifecycle stages"
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'row',
          flexWrap: isMobile ? 'nowrap' : 'nowrap',
          overflowX: isMobile ? 'auto' : 'visible',
          gap: 4,
          width: '100%',
        }}
      >
        {LIFECYCLE_STAGES.map((stage) =>
          renderStageSegment(
            stage.id as StageId,
            stage.name,
            stage.emoji
          )
        )}
      </div>

      {/* ── Bottom row: scrubber rail ─────────────────────────────────── */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Time machine scrubber. Left arrow rewinds, right arrow advances or previews future, Escape returns to live."
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(currentHandleFrac * 100)}
        onKeyDown={handleScrubKey}
        style={{
          position: 'relative',
          height: 22,
          width: '100%',
          cursor: orderedSnapshots.length > 0 ? 'pointer' : 'default',
          outline: 'none',
        }}
      >
        <div
          ref={railRef}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{
            position: 'absolute',
            top: 10,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: BRASS,
            borderRadius: 1,
          }}
        >
          {/* Snapshot zone solid (already painted by the parent rail). */}

          {/* Future zone overlay: dashed brass extension */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -1,
              left: `${NOW_FRAC * 100}%`,
              right: 0,
              height: 4,
              backgroundColor: TRACE,
              borderTop: `1px dashed ${BRASS}`,
              borderBottom: `1px dashed ${BRASS}`,
              opacity: 0.8,
            }}
          />

          {/* Snapshot ticks */}
          {orderedSnapshots.map((snap, idx) => {
            const t =
              orderedSnapshots.length <= 1
                ? 0
                : idx / (orderedSnapshots.length - 1);
            const fracX = t * SNAPSHOT_ZONE_END;
            const isActive = snap.snapshotId === currentSnapshotId;
            const isHovered = hoveredSnapshotId === snap.snapshotId;
            const size = isActive ? 12 : isHovered ? 10 : 8;
            return (
              <button
                key={snap.snapshotId}
                type="button"
                aria-label={`Snapshot: ${snap.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewStageId(null);
                  onPreviewFuture?.(null);
                  onScrub?.(snap.snapshotId);
                }}
                onMouseEnter={() => setHoveredSnapshotId(snap.snapshotId)}
                onMouseLeave={() => setHoveredSnapshotId(null)}
                onFocus={() => setHoveredSnapshotId(snap.snapshotId)}
                onBlur={() => setHoveredSnapshotId(null)}
                style={{
                  position: 'absolute',
                  left: `calc(${fracX * 100}% - ${size / 2}px)`,
                  top: `${1 - size / 2}px`,
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  backgroundColor: isActive ? BRASS : NAVY,
                  cursor: 'pointer',
                  transition: 'width 140ms ease, height 140ms ease',
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                }}
                title={`${snap.label} · ${new Date(
                  snap.timestamp
                ).toLocaleString()}`}
              />
            );
          })}

          {/* "Now" marker — bigger brass circle at the snapshot/future boundary */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `calc(${NOW_FRAC * 100}% - 6px)`,
              top: '-5px',
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: BRASS,
              border: `2px solid ${TRACE}`,
              boxShadow: `0 0 0 1px ${BRASS}`,
            }}
            title="Now (live)"
          />

          {/* Drag handle — brass square with vertical line */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `calc(${currentHandleFrac * 100}% - 8px)`,
              top: '-7px',
              width: 16,
              height: 16,
              backgroundColor: BRASS,
              border: `1px solid ${NAVY}`,
              borderRadius: 2,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: isDragging ? 'none' : 'left 160ms ease',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: 2,
                height: 10,
                backgroundColor: TRACE,
              }}
            />
          </div>
        </div>

        {/* Zone labels */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -4,
            left: 0,
            fontSize: 9,
            color: BRASS,
            letterSpacing: 1,
            textTransform: 'uppercase',
            opacity: 0.7,
          }}
        >
          Past
        </div>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -4,
            left: `${NOW_FRAC * 100}%`,
            transform: 'translateX(-50%)',
            fontSize: 9,
            color: BRASS,
            letterSpacing: 1,
            textTransform: 'uppercase',
            opacity: 0.7,
          }}
        >
          Now
        </div>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -4,
            right: 0,
            fontSize: 9,
            color: BRASS,
            letterSpacing: 1,
            textTransform: 'uppercase',
            opacity: 0.7,
            fontStyle: 'italic',
          }}
        >
          Coming next
        </div>
      </div>

      {/* ── "Return to live" pill ─────────────────────────────────────── */}
      {isScrubbedOffLive && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -14,
            transform: 'translateX(-50%)',
            zIndex: 3,
          }}
        >
          <button
            type="button"
            onClick={returnToLive}
            aria-label="Return to live view"
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              border: `1px solid ${BRASS}`,
              backgroundColor: NAVY,
              color: TRACE,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.4,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(27,58,92,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: BRASS,
              }}
            />
            Return to live
          </button>
        </div>
      )}
    </div>
  );
}
