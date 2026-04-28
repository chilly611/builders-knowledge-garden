'use client';

/**
 * JourneyArc (W9.D.9 — Lane A2 stub)
 * ==================================
 * Horizontal journey strip showing stage pills.
 * Occupies 40% of the cockpit band.
 *
 * Stub for now; real implementation comes from Lane A2.
 */

import { StageId, StageProgress } from '@/components/navigator/types';

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
  return (
    <div
      data-zone="journey"
      style={{
        flex: '0 0 40%',
        display: 'flex',
        alignItems: 'center',
        paddingRight: '8px',
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
    >
      <div style={{ fontSize: '11px', color: '#666' }}>Journey</div>
    </div>
  );
}
