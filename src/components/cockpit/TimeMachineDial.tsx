'use client';

/**
 * TimeMachineDial (W9.D.9 — Real implementation)
 * ===============================================
 * Horizontal drafting compass rotary dial for project snapshots.
 * Occupies 25% of the cockpit band (~96px tall on desktop, scrollable row on mobile).
 *
 * Visual metaphor: brass tick marks on a thin navy arc. Current snapshot has
 * a brass compass needle pointer. Hover shows relative time tooltips.
 *
 * Empty state (no snapshots): "Project just started · save your first snapshot"
 * Mobile (<640px): horizontal scrollable row of snapshot chips.
 */

import { useState, useRef, useEffect } from 'react';
import { colors } from '@/design-system/tokens/colors';
import { spacing } from '@/design-system/tokens/spacing';
import { fontWeights, letterSpacing } from '@/design-system/tokens/typography';

interface Snapshot {
  snapshotId: string;
  label: string;
  timestamp: string;
  stageId: number;
}

interface TimeMachineDialProps {
  snapshots?: Snapshot[];
  currentSnapshotId?: string;
  onScrub?: (snapshotId: string) => void;
}

function formatRelativeTime(timestamp: string): string {
  try {
    const then = new Date(timestamp).getTime();
    const now = Date.now();
    const diffMs = now - then;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'unknown time';
  }
}

function truncateLabel(label: string, maxChars: number = 24): string {
  return label.length > maxChars ? label.substring(0, maxChars - 1) + '…' : label;
}

export default function TimeMachineDial({
  snapshots = [],
  currentSnapshotId,
  onScrub,
}: TimeMachineDialProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect mobile and prefers-reduced-motion
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    const checkMotion = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);

    checkMobile();
    window.addEventListener('resize', checkMobile);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);
    motionQuery.addEventListener('change', checkMotion);

    return () => {
      window.removeEventListener('resize', checkMobile);
      motionQuery.removeEventListener('change', checkMotion);
    };
  }, []);

  const currentSnapshot = snapshots.find((s) => s.snapshotId === currentSnapshotId);

  // Empty state
  if (snapshots.length === 0) {
    return (
      <div
        data-zone="time-machine"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '96px',
          color: colors.graphite,
          fontSize: '12px',
          fontWeight: fontWeights.regular,
          letterSpacing: letterSpacing.normal,
        }}
      >
        <span style={{ marginRight: spacing.xs }}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{ display: 'inline-block', verticalAlign: 'middle' }}
          >
            <title>Plus icon</title>
            <line
              x1="6"
              y1="1"
              x2="6"
              y2="11"
              stroke={colors.brass}
              strokeWidth="1"
            />
            <line
              x1="1"
              y1="6"
              x2="11"
              y2="6"
              stroke={colors.brass}
              strokeWidth="1"
            />
          </svg>
        </span>
        Project just started · save your first snapshot
      </div>
    );
  }

  // Mobile: horizontal scrollable row of snapshot chips
  if (isMobile) {
    return (
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          minHeight: '96px',
          padding: spacing.sm,
        }}
      >
        <div
          ref={scrollContainerRef}
          style={{
            display: 'flex',
            gap: spacing.sm,
            overflowX: 'auto',
            overflowY: 'hidden',
            width: '100%',
            scrollBehavior: 'smooth',
          }}
        >
          {snapshots.map((snap) => {
            const isActive = snap.snapshotId === currentSnapshotId;
            return (
              <div
                key={snap.snapshotId}
                onClick={() => onScrub?.(snap.snapshotId)}
                onMouseEnter={() => setHoveredId(snap.snapshotId)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  flexShrink: 0,
                  padding: `${spacing.xs}px ${spacing.sm}px`,
                  border: `1px solid ${colors.brass}`,
                  borderRadius: '4px',
                  backgroundColor: isActive ? colors.brass : 'transparent',
                  color: isActive ? '#fff' : colors.graphite,
                  fontSize: '11px',
                  fontWeight: isActive ? fontWeights.semibold : fontWeights.regular,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {truncateLabel(snap.label, 16)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop: drafting compass dial with SVG arc and ticks
  const arcHeight = 4;
  const containerHeight = 96;
  const arcTopOffset = 20;
  const tickHeight = 8;

  // Calculate tick positions (evenly spaced across container width)
  const containerWidthPx = Math.max(200, 300); // Typical 25% zone width
  const tickXPositions = snapshots.map((_, index) => {
    return (index / Math.max(1, snapshots.length - 1)) * containerWidthPx;
  });

  return (
    <div
      data-zone="time-machine"
      style={{
        position: 'relative',
        width: '100%',
        height: '96px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
    >
      {/* Title above arc */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 0,
          fontSize: '9px',
          fontWeight: fontWeights.regular,
          letterSpacing: letterSpacing.technical,
          color: colors.brass,
          textTransform: 'uppercase',
        }}
      >
        Time Machine
      </div>

      {/* SVG Arc + Ticks + Pointer */}
      <svg
        viewBox={`0 0 ${containerWidthPx} ${containerHeight}`}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        <title>Time machine dial</title>

        {/* Navy arc (thin curved line at top) */}
        <path
          d={`M 8,${arcTopOffset} Q ${containerWidthPx / 2},${arcTopOffset - 4} ${containerWidthPx - 8},${arcTopOffset}`}
          stroke={colors.navy}
          strokeWidth={arcHeight}
          fill="none"
          strokeLinecap="round"
        />

        {/* Brass tick marks for each snapshot */}
        {snapshots.map((snap, idx) => {
          const x = tickXPositions[idx];
          const isActive = snap.snapshotId === currentSnapshotId;
          return (
            <g key={snap.snapshotId}>
              {/* Invisible clickable area */}
              <circle
                cx={x}
                cy={arcTopOffset}
                r="12"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => onScrub?.(snap.snapshotId)}
                onMouseEnter={() => setHoveredId(snap.snapshotId)}
                onMouseLeave={() => setHoveredId(null)}
              />

              {/* Tick mark */}
              <line
                x1={x}
                y1={arcTopOffset - tickHeight / 2}
                x2={x}
                y2={arcTopOffset + tickHeight / 2}
                stroke={colors.brass}
                strokeWidth="1.5"
                opacity={isActive || hoveredId === snap.snapshotId ? 1 : 0.6}
                style={{
                  transition: 'opacity 0.2s ease',
                  pointerEvents: 'none',
                }}
              />

              {/* Compass needle pointer for active tick */}
              {isActive && (
                <g
                  style={{
                    animation: !prefersReducedMotion
                      ? `pulse 1.5s ease-in-out infinite`
                      : 'none',
                  }}
                >
                  <style>
                    {`@keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.7; }
                    }`}
                  </style>
                  {/* Downward-pointing brass triangle */}
                  <path
                    d={`M ${x},${arcTopOffset + 8} L ${x - 4},${arcTopOffset - 2} L ${x + 4},${arcTopOffset - 2} Z`}
                    fill={colors.brass}
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip on hover */}
      {hoveredId && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(50% - 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: colors.navy,
            color: '#fff',
            padding: `${spacing.xs}px ${spacing.sm}px`,
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: fontWeights.regular,
            whiteSpace: 'nowrap',
            zIndex: 20,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {snapshots.find((s) => s.snapshotId === hoveredId)?.label} ·{' '}
          {formatRelativeTime(
            snapshots.find((s) => s.snapshotId === hoveredId)?.timestamp || ''
          )}
        </div>
      )}

      {/* Active snapshot label below arc */}
      {currentSnapshot && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 0,
            fontSize: '11px',
            fontWeight: fontWeights.regular,
            color: colors.graphite,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {truncateLabel(currentSnapshot.label)}
        </div>
      )}
    </div>
  );
}
