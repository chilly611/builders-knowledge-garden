/**
 * InfiniteDescent (Pattern Language #13, Dimensional Rendering).
 *
 * Category: Dimensional Rendering.
 * Axes touched: skill_signal × engagement-depth (primary), lane (active —
 *               machine lane jumps straight to F6 agent payload), time_horizon
 *               (active — short horizons stay at F0).
 *
 * Variable-floor engagement depth per workflow. Floor 0 plain question → Floor
 * N agent payload. Every user finds their floor. Floors are content slots —
 * the host supplies whatever it wants at each depth.
 *
 * Default floor selection per lane:
 *   public         → 0
 *   professional   → 2
 *   administrator  → 3
 *   machine        → 6 (agent payload)
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import { useStanceCard } from '@/lib/stance-card';
import type { StanceCard, StanceLane } from './StanceCard.types';

export interface DescentFloor {
  /** Floor number, 0 = plain question. */
  floor: number;
  /** Short label for the floor selector. */
  label: string;
  /** What renders at this floor. */
  content: React.ReactNode;
}

export interface InfiniteDescentProps {
  /** Floors ordered shallow-to-deep. Floor 0 must always exist. */
  floors: DescentFloor[];
  /** Optional starting floor override (e.g. resume-where-you-were). */
  initialFloor?: number;
  /** Pin a stance for SSR contexts. */
  stance?: StanceCard;
}

const LANE_DEFAULT_FLOOR: Record<StanceLane, number> = {
  public: 0,
  professional: 2,
  administrator: 3,
  machine: 6,
};

export function InfiniteDescent({
  floors,
  initialFloor,
  stance,
}: InfiniteDescentProps) {
  const clientStance = useStanceCard();
  const card = stance ?? clientStance;
  const desired = initialFloor ?? LANE_DEFAULT_FLOOR[card.lane] ?? 0;
  const available = floors.map((f) => f.floor);
  // Snap to the closest available floor at or below the desired floor.
  const startFloor =
    available.find((f) => f === desired) ??
    [...available].reverse().find((f) => f <= desired) ??
    0;
  const [activeFloor, setActiveFloor] = useState<number>(startFloor);

  const active = floors.find((f) => f.floor === activeFloor) ?? floors[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <nav
        aria-label="Engagement depth"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.35rem',
        }}
      >
        {floors.map((floor) => {
          const isActive = floor.floor === activeFloor;
          return (
            <button
              key={floor.floor}
              type="button"
              onClick={() => setActiveFloor(floor.floor)}
              aria-pressed={isActive}
              style={{
                padding: '0.25rem 0.6rem',
                borderRadius: '2px',
                border: `1px solid ${isActive ? BRAND_COLORS.copper : BRAND_COLORS.copperLine}`,
                background: isActive
                  ? BRAND_COLORS.parchmentWarm
                  : BRAND_COLORS.parchment,
                fontFamily: BRAND_FONTS.mono,
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: isActive ? BRAND_COLORS.copper : BRAND_COLORS.steel,
                cursor: 'pointer',
              }}
            >
              F{floor.floor} · {floor.label}
            </button>
          );
        })}
      </nav>
      <div>{active.content}</div>
    </div>
  );
}

export default InfiniteDescent;
