'use client';

/**
 * BudgetSnapshot (W9.D.9 — Lane A4 stub)
 * ======================================
 * Budget summary snapshot in the cockpit band.
 * Occupies 35% of the cockpit band.
 *
 * Stub for now; real implementation comes from Lane A4.
 */

interface StageBudget {
  stageId: number;
  committedCents: number;
  spentCents: number;
  remainingCents: number;
  status: 'not-started' | 'on-track' | 'overbudget';
}

interface BudgetTimelineData {
  byStage: Record<number, StageBudget>;
  totalCommittedCents: number;
  totalSpentCents: number;
  isOverbudget: boolean;
  overAmountCents: number;
}

interface BudgetSnapshotProps {
  data: BudgetTimelineData;
  activeStageId?: number | null;
}

export default function BudgetSnapshot({
  data,
  activeStageId,
}: BudgetSnapshotProps) {
  return (
    <div
      data-zone="budget"
      style={{
        flex: '0 0 35%',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div style={{ fontSize: '11px', color: '#666' }}>Budget</div>
    </div>
  );
}
