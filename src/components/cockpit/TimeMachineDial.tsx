'use client';

/**
 * TimeMachineDial (W9.D.9 — Lane A3 stub)
 * =======================================
 * Horizontal time machine scrubber.
 * Occupies 25% of the cockpit band.
 *
 * Stub for now; real implementation comes from Lane A3.
 */

interface Snapshot {
  snapshotId: string;
  label: string;
  timestamp: string;
  stageId: number;
}

interface TimeMachineDialProps {
  snapshots: Snapshot[];
  onScrub?: (snapshotId: string | null) => void;
}

export default function TimeMachineDial({
  snapshots,
  onScrub,
}: TimeMachineDialProps) {
  return (
    <div
      data-zone="time-machine"
      style={{
        flex: '0 0 25%',
        display: 'flex',
        alignItems: 'center',
        paddingRight: '8px',
      }}
    >
      <div style={{ fontSize: '11px', color: '#666' }}>
        Time Machine ({snapshots.length})
      </div>
    </div>
  );
}
