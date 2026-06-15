'use client';

/**
 * useStageProject — the single source of project context every lifecycle
 * stage and stage-tool reads from (fix/context-routing, 2026-06-07).
 *
 * BEFORE: each of the 7 stage pages imported MARIN_* constants directly and
 * called ensureMarinActive() on mount, force-pinning building-type,
 * jurisdiction, lane, budget, and identity to the Marin demo regardless of
 * which project was open — so the SAME code could not serve a second project.
 *
 * NOW: this hook normalizes the already-mounted ProjectProvider
 * (useProjectContext) into the exact shape the stages need, with a canonical
 * Marin fallback for demo continuity. Switching ?project= flips every stage.
 *
 * Precedence (the heart of the fix):
 *   1. No active project        → canonical Marin (display only; NEVER writes
 *                                  localStorage, unlike the old ensureMarinActive).
 *   2. project === Marin id      → canonical fixture values, so the DB row
 *                                  ('Marin Farmhouse') can't override the
 *                                  canonical 'Modern Farmhouse in Marin' and
 *                                  the demo stays pixel-stable.
 *   3. other id, record loaded   → derive from the live ProjectRecord.
 *   4. other id, loading / 404   → honest loading / notFound — NEVER Marin
 *                                  (so "open SoMa" can't silently render Marin).
 */

import { useProjectContext, type ProjectRole } from '@/contexts/ProjectContext';
import { getDemoFixture, type DemoFixture } from '@/lib/projects/getCanonicalProject';
import { inferBuildingType, type BuildingType } from '@/lib/projects/buildingType';
import { MARIN_PROJECT_ID } from '@/lib/seed-data/marin-farmhouse';

export interface StageProject {
  /** Active project id passed to StageShell/BudgetRibbon/JourneyRow. Always concrete — Marin id in the canonical/no-project case. */
  projectId: string;
  /** True for the canonical Marin demo OR when nothing is active. */
  isCanonicalDemo: boolean;
  /** Record still hydrating (non-canonical only). */
  loading: boolean;
  /** A non-demo id is active but no record loaded (anon/404). Honest empty — not Marin. */
  notFound: boolean;
  // ── the four context dimensions + display ──
  projectName: string;
  /** Client/homeowner name for the active project (Lock stage signer prefill). */
  clientName: string;
  /** Drives CodeLookup + the header meta line. */
  jurisdiction: string;
  /** Free-text project_type → CodeLookup `projectType`. */
  buildingType: string;
  /** Inferred residential | commercial | mixed for tools that need the enum. */
  buildingKind: BuildingType | null;
  /** Per-project role from ProjectContext (no extra fetch). */
  lane: ProjectRole | null;
  // ── display helpers ──
  sqftDisplay: string;
  /** `${sqft} sqft · ${jurisdiction}` (omits missing parts). */
  projectMeta: string;
  /** StageShell initialBudget — canonical → Marin; else project.budget_amount. */
  budgetTotal?: number;
  /** StageShell budgetSpent — canonical → Marin; else 0 when a budget exists. */
  budgetSpent?: number;
}

function fmtSqft(raw: string | null | undefined): string {
  if (!raw) return '';
  const n = parseInt(String(raw).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n.toLocaleString('en-US') : '';
}

function meta(sqftDisplay: string, jurisdiction: string): string {
  return [sqftDisplay ? `${sqftDisplay} sqft` : '', jurisdiction].filter(Boolean).join(' · ');
}

/**
 * Build a StageProject from a code-served demo fixture (Marin OR Folsom). Used
 * for any seeded demo id and, with the Marin fixture, for the no-project
 * fallback — so switching `?project=` between the two demos flips every
 * dimension (identity, jurisdiction, budget) with no bleed.
 */
function fixtureStageProject(fixture: DemoFixture, lane: ProjectRole | null): StageProject {
  return {
    projectId: fixture.id,
    isCanonicalDemo: true,
    loading: false,
    notFound: false,
    projectName: fixture.name,
    clientName: fixture.clientName,
    jurisdiction: fixture.location,
    buildingType: fixture.projectType,
    buildingKind: inferBuildingType(fixture.projectType),
    lane,
    sqftDisplay: fixture.sqftDisplay,
    projectMeta: meta(fixture.sqftDisplay, fixture.location),
    budgetTotal: fixture.budget.total,
    budgetSpent: fixture.budget.spent,
  };
}

export function useStageProject(): StageProject {
  const { project, projectId, loading, projectRole } = useProjectContext();

  // (1) nothing active → display-only canonical Marin fallback;
  // (2) a seeded demo id (Marin OR Folsom) → that fixture.
  const fixture = getDemoFixture(projectId ?? MARIN_PROJECT_ID);
  if (!projectId || fixture) {
    // `fixture` is non-null whenever projectId is null (we fell back to Marin)
    // or projectId is a seeded demo; the `?? MARIN` guard keeps it defined.
    return fixtureStageProject(fixture ?? getDemoFixture(MARIN_PROJECT_ID)!, projectRole);
  }

  // (3)/(4) a non-canonical project is active.
  const p = project; // ProjectRecord | null
  const stillLoading = loading && !p;
  const notFound = !loading && !p;

  const jurisdiction = p?.jurisdiction ?? '';
  const buildingType = p?.project_type ?? '';
  const sqftDisplay = fmtSqft(p?.sqft);
  const hasBudget = typeof p?.budget_amount === 'number';

  return {
    projectId,
    isCanonicalDemo: false,
    loading: stillLoading,
    notFound,
    projectName: p?.name ?? (stillLoading ? '' : 'Project'),
    clientName: p?.client_name ?? '',
    jurisdiction,
    buildingType,
    buildingKind: buildingType ? inferBuildingType(buildingType) : null,
    lane: projectRole,
    sqftDisplay,
    projectMeta: meta(sqftDisplay, jurisdiction),
    budgetTotal: hasBudget ? (p!.budget_amount as number) : undefined,
    budgetSpent: hasBudget ? 0 : undefined,
  };
}
