'use client';

/**
 * JourneyArc (W9.D.9 Lane B1)
 * ===========================
 * 7-station architect's divider arc showing journey progress.
 * Occupies 40% of the cockpit band (~96px tall desktop, flat pill mobile).
 *
 * - Current station: filled brass circle + stage-accent ring
 * - Completed stations: hollow brass circle + checkmark
 * - Upcoming stations: faded rule circle
 * - SVG quadratic bezier arc (hand-traced aesthetic, 12px dip)
 * - Compass needle pointing at current station
 * - Hover tooltips with stage name + workflow count
 * - Mobile: flat horizontal pill row (same semantics)
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { StageId, StageProgress, STAGE_REGISTRY } from '@/components/navigator/types';
import { LIFECYCLE_STAGES } from '@/lib/lifecycle-stages';
import { STAGE_ACCENTS, stageAccent } from '@/design-system/tokens/stage-accents';

interface JourneyArcProps {
  stages: StageProgress[];
  activeStageId: StageId | null;
  onStageClick?: (stageId: StageId) => void;
}

export default function JourneyArc({
  stages,
  activeStageId,
  onStageClick,
}: JourneyArcProps) {
  const [hoveredStageId, setHoveredStageId] = useState<StageId | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Build stage lookup: stageId -> StageProgress
  const stageProgress = useMemo(() => {
    const map: Record<number, StageProgress> = {};
    stages.forEach((s) => {
      map[s.stageId] = s;
    });
    return map;
  }, [stages]);

  // Determine which stages are completed
  const completedStageIds = useMemo(() => {
    return stages
      .filter((s) => s.status === 'complete')
      .map((s) => s.stageId);
  }, [stages]);

  const handleStageClick = useCallback(
    (stageId: StageId) => {
      if (onStageClick) onStageClick(stageId);
    },
    [onStageClick]
  );

  const brass = '#B6873A';
  const fadedRule = '#C9C3B3';
  const navyInk = '#1B3B5E';
  const traceWhite = '#F4F0E6';

  // Mobile version: flat horizontal pill row
  if (isMobile) {
    return (
      <div
        data-zone="journey-mobile"
        style={{
          display: 'flex',
          gap: '8px',
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '4px 8px',
        }}
      >
        {LIFECYCLE_STAGES.map((stage) => {
          const stageId = stage.id as StageId;
          const isActive = activeStageId === stageId;
          const isCompleted = completedStageIds.includes(stageId);
          const progress = stageProgress[stageId];
          const accentColor = stageAccent(stageId).hex;

          return (
            <button
              key={stage.id}
              onClick={() => handleStageClick(stageId)}
              onMouseEnter={() => setHoveredStageId(stageId)}
              onMouseLeave={() => setHoveredStageId(null)}
              style={{
                padding: '6px 12px',
                borderRadius: '12px',
                border: isActive ? `2px solid ${accentColor}` : `1px solid ${brass}`,
                backgroundColor: isActive ? `${accentColor}20` : traceWhite,
                color: navyInk,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                transition: 'all 200ms ease',
              }}
              title={`${stage.emoji} ${stage.name}${progress ? ` (${progress.doneCount}/${progress.totalCount})` : ''}`}
            >
              <span>{stage.emoji}</span>
              <span>{stage.name}</span>
              {isCompleted && <span style={{ fontSize: '11px' }}>✓</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // Desktop version: SVG arc with stations
  const arcWidth = 380;
  const arcHeight = 72;
  const arcBaselineY = 60;
  const arcDip = 12;
  const xPadding = 20;
  const stationSpacing = (arcWidth - 2 * xPadding) / 6; // 6 gaps for 7 stations

  return (
    <div
      data-zone="journey-arc"
      style={{
        flex: '0 0 100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <svg
        viewBox={`0 0 ${arcWidth} ${arcHeight}`}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        {/* Quadratic bezier arc path */}
        <path
          d={`M ${xPadding} ${arcBaselineY} Q ${arcWidth / 2} ${arcBaselineY + arcDip} ${arcWidth - xPadding} ${arcBaselineY}`}
          stroke={navyInk}
          strokeWidth="1.5"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />

        {/* Station marks and interactive zones */}
        {LIFECYCLE_STAGES.map((stage, idx) => {
          const x = xPadding + idx * stationSpacing;
          const y = arcBaselineY;
          const isActive = activeStageId === stage.id;
          const isCompleted = completedStageIds.includes(stage.id as StageId);
          const isHovered = hoveredStageId === stage.id;
          const accentColor = stageAccent(stage.id as StageId).hex;
          const progress = stageProgress[stage.id];

          // Station circle radius
          const circleR = 5;
          const ringR = 7;

          return (
            <g
              key={stage.id}
              style={{
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredStageId(stage.id as StageId)}
              onMouseLeave={() => setHoveredStageId(null)}
              onClick={() => handleStageClick(stage.id as StageId)}
            >
              {/* Brass tick mark above arc */}
              <line
                x1={x}
                y1={y - 8}
                x2={x}
                y2={y - 14}
                stroke={brass}
                strokeWidth="1"
              />

              {/* Station circle background */}
              {isActive ? (
                <>
                  {/* Current: filled brass + accent ring */}
                  <circle
                    cx={x}
                    cy={y}
                    r={ringR}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="2"
                  />
                  <circle cx={x} cy={y} r={circleR} fill={brass} />
                </>
              ) : isCompleted ? (
                <>
                  {/* Completed: hollow brass + checkmark */}
                  <circle
                    cx={x}
                    cy={y}
                    r={circleR}
                    fill="none"
                    stroke={brass}
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={y + 1.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill={brass}
                  >
                    ✓
                  </text>
                </>
              ) : (
                <>
                  {/* Upcoming: faded rule circle, hollow */}
                  <circle
                    cx={x}
                    cy={y}
                    r={circleR}
                    fill="none"
                    stroke={fadedRule}
                    strokeWidth="1.5"
                  />
                </>
              )}

              {/* SVG title for accessibility */}
              <title>
                {`${stage.emoji} ${stage.name}${progress ? ` (${progress.doneCount}/${progress.totalCount})` : ''}`}
              </title>

              {/* Invisible hit target for better click area */}
              <circle
                cx={x}
                cy={y}
                r={12}
                fill="transparent"
                pointerEvents="auto"
              />

              {/* Stage emoji + name label below */}
              <g style={{ pointerEvents: 'none' }}>
                <text
                  x={x}
                  y={y + 24}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="14"
                  fontWeight="500"
                  fill={navyInk}
                  style={{
                    opacity: isHovered || isActive ? 1 : 0.7,
                    transition: 'opacity 200ms ease',
                  }}
                >
                  {stage.emoji}
                </text>
                <text
                  x={x}
                  y={y + 38}
                  textAnchor="middle"
                  dominantBaseline="text-before-edge"
                  fontSize="9"
                  fontWeight="500"
                  fill={navyInk}
                  style={{
                    opacity: isHovered || isActive ? 1 : 0.6,
                    transition: 'opacity 200ms ease',
                  }}
                >
                  {stage.name.length > 10 ? stage.name.substring(0, 8) + '…' : stage.name}
                </text>
              </g>
            </g>
          );
        })}

        {/* Compass needle pointing at current station */}
        {activeStageId && (
          (() => {
            const idx = LIFECYCLE_STAGES.findIndex((s) => s.id === activeStageId);
            if (idx === -1) return null;
            const x = xPadding + idx * stationSpacing;
            const y = arcBaselineY - 12;

            return (
              <g key="compass-needle" style={{ pointerEvents: 'none' }}>
                {/* Small brass triangle needle */}
                <polygon
                  points={`${x},${y - 6} ${x - 3},${y} ${x + 3},${y}`}
                  fill={brass}
                  opacity="0.8"
                />
              </g>
            );
          })()
        )}
      </svg>
    </div>
  );
}
