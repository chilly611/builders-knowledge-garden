'use client';

/**
 * TeamRoster — extracted 2026-05-28 from the demolished legacy
 * `/projects/[id]` team tab. Renders the project team with status
 * chips + an optional trade-assignment matrix. Meant to live inside
 * the Size Up stage ("assemble the team") so contractors can see and
 * claim trade coverage early in the lifecycle.
 */

import { motion } from 'framer-motion';

export interface TeamMember {
  id: string;
  name: string;
  trade: string;
  status: 'active' | 'inactive';
  contact: string;
}

const DEFAULT_TEAM: TeamMember[] = [
  { id: '1', name: 'John Doe', trade: 'General Contractor', status: 'active', contact: 'john@example.com' },
  { id: '2', name: 'Jane Smith', trade: 'Electrician', status: 'active', contact: 'jane@example.com' },
  { id: '3', name: 'Mike Johnson', trade: 'Plumber', status: 'active', contact: 'mike@example.com' },
  { id: '4', name: 'Sarah Brown', trade: 'HVAC', status: 'inactive', contact: 'sarah@example.com' },
];

interface Props {
  team?: TeamMember[];
  heading?: string;
  showMatrix?: boolean;
}

export function TeamRoster({
  team = DEFAULT_TEAM,
  heading = 'Team Members',
  showMatrix = false,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">{heading}</h3>
        <div className="space-y-3">
          {team.map((member) => (
            <div
              key={member.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--fg)]">{member.name}</p>
                  <p className="text-sm text-gray-600">{member.trade}</p>
                  <p className="text-xs text-gray-500 mt-1">{member.contact}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    member.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showMatrix && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6">
          <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">
            Trade Assignment Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">
                    Trade
                  </th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">
                    Assigned
                  </th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {team.map((member) => (
                  <tr key={member.id} className="border-b border-[var(--border)]">
                    <td className="py-2 px-3">{member.trade}</td>
                    <td className="text-center py-2 px-3">{member.name}</td>
                    <td className="text-center py-2 px-3">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            member.status === 'active' ? '#22c55e' : '#d1d5db',
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default TeamRoster;
