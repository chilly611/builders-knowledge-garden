'use client';

/**
 * MaterialsCSI — extracted 2026-05-28 from the demolished legacy
 * `/projects/[id]` materials tab. CSI MasterFormat division breakdown
 * with expand-on-click rows. Pro-mode surface — meant to live behind
 * the Pro toggle inside the Plan stage (default consumers should
 * pass `proMode={false}` to keep it tucked into a "Coming soon"
 * fold).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

export interface CSIDivision {
  code: string;
  name: string;
  estimated_qty: number;
  unit: string;
  cost: number;
}

export const CSI_DIVISIONS: CSIDivision[] = [
  { code: '01', name: 'General Requirements', estimated_qty: 1, unit: 'lot', cost: 0 },
  { code: '02', name: 'Existing Conditions', estimated_qty: 1, unit: 'lot', cost: 0 },
  { code: '03', name: 'Concrete', estimated_qty: 125, unit: 'cy', cost: 0 },
  { code: '04', name: 'Masonry', estimated_qty: 8500, unit: 'sf', cost: 0 },
  { code: '05', name: 'Metals', estimated_qty: 2000, unit: 'lb', cost: 0 },
  { code: '06', name: 'Wood/Plastics', estimated_qty: 15000, unit: 'bf', cost: 0 },
  { code: '07', name: 'Thermal/Moisture', estimated_qty: 8500, unit: 'sf', cost: 0 },
  { code: '08', name: 'Openings', estimated_qty: 45, unit: 'ea', cost: 0 },
  { code: '09', name: 'Finishes', estimated_qty: 8500, unit: 'sf', cost: 0 },
  { code: '10', name: 'Specialties', estimated_qty: 1, unit: 'lot', cost: 0 },
  { code: '11', name: 'Equipment', estimated_qty: 1, unit: 'lot', cost: 0 },
  { code: '12', name: 'Furnishings', estimated_qty: 1, unit: 'lot', cost: 0 },
  { code: '13', name: 'Special Construction', estimated_qty: 1, unit: 'lot', cost: 0 },
  { code: '14', name: 'Conveying', estimated_qty: 1, unit: 'lot', cost: 0 },
  { code: '21', name: 'Fire Suppression', estimated_qty: 1, unit: 'lot', cost: 0 },
  { code: '22', name: 'Plumbing', estimated_qty: 1, unit: 'lot', cost: 0 },
];

interface Props {
  divisions?: CSIDivision[];
  heading?: string;
  /** When false, render a single-column compact grid. Default: two-column on md+. */
  twoColumn?: boolean;
}

export function MaterialsCSI({
  divisions = CSI_DIVISIONS,
  heading = 'CSI Division Breakdown',
  twoColumn = true,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <h3 className="text-lg font-semibold text-[var(--fg)] mb-2">{heading}</h3>
      <div
        className={`grid gap-3 ${twoColumn ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}
      >
        {divisions.map((div) => (
          <div
            key={div.code}
            onClick={() =>
              setExpanded(expanded === div.code ? null : div.code)
            }
            className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 hover:bg-[var(--bg-secondary)] transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--fg)]">
                  {div.code} - {div.name}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {div.estimated_qty} {div.unit}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[var(--accent)]">
                  ${(div.cost || 0).toLocaleString()}
                </p>
              </div>
            </div>
            {expanded === div.code && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-[var(--border)]"
              >
                <p className="text-sm text-gray-600">
                  Quantity: {div.estimated_qty} {div.unit}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Cost: ${(div.cost || 0).toLocaleString()}
                </p>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default MaterialsCSI;
