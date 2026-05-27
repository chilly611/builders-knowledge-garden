/**
 * Marin Farmhouse — canonical demo seed for the Killer App chrome.
 *
 * Locked 2026-05-27 for the Thursday contractor demo. Numbers come
 * straight from the session prompt. This seed is consumed by KillerApp-
 * Chrome whenever no real project is wired through ProjectContext —
 * giving every public route a stable, photogenic demo without forcing
 * the user to seed a project first.
 *
 * Keep this file deliberately small. If demo numbers drift, change them
 * here and the chrome updates everywhere.
 */

import type { KacProject } from '@/components/killerapp-chrome/types';

export const MARIN_FARMHOUSE: KacProject = {
  // Match the existing demo project id in demo-seed-data.ts so chrome
  // and seed data agree on identity. The legacy record's title/budget
  // are updated in lockstep — see demo-seed-data.ts (proj-chen-farmhouse).
  id: 'proj-chen-farmhouse',
  name: 'Modern Farmhouse — Chen Residence',
  location: 'Marin County, CA',
  sqft: 4000,
  bedrooms: 4,
  bathrooms: 3,
  budget: {
    total: 1_650_000,
    spent: 312_400,
    committed: 186_200,
    remaining: 1_151_400,
    draws: {
      closed: 495_000,
      projected: 1_485_000,
      closedCount: 3,
      projectedCount: 9,
    },
  },
  schedule: {
    startDate: '2026-03-18',
    substantialCompletionDate: '2026-12-04',
    markers: [
      { id: 'm1', label: 'Permits', date: '2026-04-02', stageId: 2 },
      { id: 'm2', label: 'Foundation', date: '2026-05-15', stageId: 4 },
      { id: 'm3', label: 'Framing', date: '2026-07-08', stageId: 4 },
      { id: 'm4', label: 'MEP rough-in', date: '2026-08-24', stageId: 4 },
      { id: 'm5', label: 'Final inspection', date: '2026-11-20', stageId: 6 },
    ],
  },
  stages: [
    { id: 1, slug: 'size-up', completion: 100, startDate: '2026-01-05', dueDate: '2026-02-12' },
    { id: 2, slug: 'lock', completion: 100, startDate: '2026-02-12', dueDate: '2026-03-18' },
    { id: 3, slug: 'plan', completion: 85, startDate: '2026-02-26', dueDate: '2026-04-15' },
    { id: 4, slug: 'build', completion: 42, startDate: '2026-03-18', dueDate: '2026-11-20' },
    { id: 5, slug: 'adapt', completion: 0, startDate: '2026-03-18', dueDate: '2026-11-20' },
    { id: 6, slug: 'collect', completion: 0, startDate: '2026-10-15', dueDate: '2026-12-04' },
    { id: 7, slug: 'reflect', completion: 0, startDate: '2026-12-04', dueDate: '2027-01-30' },
  ],
};
