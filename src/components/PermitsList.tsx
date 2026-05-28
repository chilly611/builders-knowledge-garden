'use client';

/**
 * PermitsList — extracted 2026-05-28 from the demolished legacy
 * `/projects/[id]` permits tab. Surfaces required permits with status
 * and deadlines. Designed to drop into the Plan stage (or anywhere a
 * journey-aware screen needs to show permit readiness).
 *
 * Default data: a curated Marin demo set so the component renders
 * something useful before live `inspection_requirements` hydrate from
 * `GET /api/v1/projects?id=...` (compliance subobject).
 */

import { motion } from 'framer-motion';

export interface Permit {
  id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'approved';
  deadline?: string;
}

const DEFAULT_PERMITS: Permit[] = [
  { id: '1', name: 'Building Permit', status: 'in_progress', deadline: '2026-06-15' },
  { id: '2', name: 'Electrical Permit', status: 'not_started', deadline: '2026-07-01' },
  { id: '3', name: 'Plumbing Permit', status: 'not_started', deadline: '2026-07-01' },
  { id: '4', name: 'HVAC Permit', status: 'not_started', deadline: '2026-07-15' },
];

const STATUS_STYLES: Record<Permit['status'], string> = {
  approved: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  not_started: 'bg-gray-100 text-gray-700',
};

interface Props {
  permits?: Permit[];
  heading?: string;
  /** When true, drop the section heading (caller provides its own). */
  flush?: boolean;
}

export function PermitsList({
  permits = DEFAULT_PERMITS,
  heading = 'Required Permits',
  flush = false,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {!flush && (
        <h3 className="text-lg font-semibold text-[var(--fg)] mb-2">
          {heading}
        </h3>
      )}
      {permits.map((permit) => (
        <div
          key={permit.id}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-[var(--fg)]">{permit.name}</p>
              {permit.deadline && (
                <p className="text-sm text-gray-600 mt-1">
                  Deadline: {new Date(permit.deadline).toLocaleDateString()}
                </p>
              )}
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded whitespace-nowrap ml-4 ${STATUS_STYLES[permit.status]}`}
            >
              {permit.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

export default PermitsList;
