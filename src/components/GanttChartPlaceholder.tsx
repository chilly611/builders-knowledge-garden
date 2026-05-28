'use client';

/**
 * GanttChartPlaceholder — extracted 2026-05-28 from the demolished
 * legacy `/projects/[id]` schedule tab. The real Gantt component is
 * on the WordPress'd list ("alpha — coming soon"), so this is the
 * honest stub that ships now: a dashed placeholder + a milestone
 * list rendered from whatever the caller passes in.
 *
 * Surfaces inside the Plan stage's "Coming soon" details fold with
 * an explicit alpha label per the BKG demo philosophy.
 */

import { motion } from 'framer-motion';

export interface Milestone {
  id: string;
  name: string;
  date: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

const DEFAULT_MILESTONES: Milestone[] = [
  { id: '1', name: 'Permit Approval', date: '2026-06-15', status: 'in_progress' },
  { id: '2', name: 'Foundation Complete', date: '2026-07-01', status: 'not_started' },
  { id: '3', name: 'Framing', date: '2026-08-15', status: 'not_started' },
  { id: '4', name: 'MEP Rough-In', date: '2026-09-01', status: 'not_started' },
  { id: '5', name: 'Drywall & Finish', date: '2026-10-15', status: 'not_started' },
];

interface Props {
  milestones?: Milestone[];
  /** Show the dashed Gantt placeholder above the milestone list. */
  showPlaceholder?: boolean;
}

export function GanttChartPlaceholder({
  milestones = DEFAULT_MILESTONES,
  showPlaceholder = true,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {showPlaceholder && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6">
          <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
            Gantt Chart{' '}
            <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-orange-600">
              alpha — coming soon
            </span>
          </h3>
          <div className="h-56 rounded bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border-2 border-dashed border-slate-300">
            <p className="text-gray-500 text-sm">
              Visual Gantt with drag-to-reschedule lands in a future sprint.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6">
        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
          Milestone List
        </h3>
        <div className="space-y-2">
          {milestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 rounded bg-[var(--bg-secondary)]"
            >
              <div>
                <p className="font-medium text-[var(--fg)]">{m.name}</p>
                <p className="text-sm text-gray-600">
                  {new Date(m.date).toLocaleDateString()}
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700">
                {m.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default GanttChartPlaceholder;
