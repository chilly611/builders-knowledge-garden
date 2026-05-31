'use client';

/**
 * useProjectLedger — the shell's single source of truth for "what are this
 * project's REAL numbers." No hardcoded Marin. One project = one set of
 * numbers everywhere (chrome === body === ledger).
 *
 *   - Real projects (uuid): budget from the canonical ledger via
 *     GET /api/v1/budget (synthesizes project_budget_lines), authed with the
 *     signed-in user's token. Current stage derived from the ledger's
 *     per-phase distribution.
 *   - Demo project ('demo-project' / 'demo-*'): the demo fixture
 *     (getDemoProject → docs/demo-data/demo-project.json), which the body
 *     (ProjectDashboardClient) also reads. The DB ledger is seeded to match
 *     it, so all three agree.
 *
 * Returns `ready:false` until resolved; the shell shows a neutral state
 * rather than fabricated numbers.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getDemoProject } from '@/lib/demo-seeder';

export interface LedgerBudget { total: number; spent: number; committed: number; remaining: number; }
export interface LedgerJourney { currentStage: number; stageProgress: Record<number, number>; }
export interface LedgerResult {
  ready: boolean;
  /** True once a project is in scope and its numbers resolved (vs no project). */
  hasData: boolean;
  name: string | null;
  budget: LedgerBudget | null;
  journey: LedgerJourney | null;
}

const EMPTY: LedgerResult = { ready: false, hasData: false, name: null, budget: null, journey: null };

const PHASE_TO_STAGE: Record<string, number> = {
  SIZE_UP: 1, LOCK: 2, PLAN: 3, BUILD: 4, ADAPT: 5, COLLECT: 6, REFLECT: 7,
};

function isDemo(id: string): boolean {
  return id === 'demo-project' || id.startsWith('demo-');
}

/** Map a /api/v1/budget summary into our normalized ledger shape. */
function fromSummary(s: Record<string, number> & { byPhase?: Record<string, { spent: number; estimated: number }> }): { budget: LedgerBudget; journey: LedgerJourney } {
  const total = Number(s.totalBudget) || 0;
  const spent = Number(s.totalSpent) || 0;
  const estimated = Number(s.totalEstimated) || 0;
  const committed = spent + estimated;
  // Remaining = uncommitted budget (total − committed), matching the body's
  // Budget River. Prefer the route's own `remaining` only if it agrees.
  const remaining = Math.max(0, total - committed);

  // Current stage = the highest-numbered phase that has any spend; pct within it.
  const byPhase = s.byPhase ?? {};
  let currentStage = 1;
  const stageProgress: Record<number, number> = {};
  for (const [phase, v] of Object.entries(byPhase)) {
    const stage = PHASE_TO_STAGE[phase];
    if (!stage) continue;
    const ph = v as { spent: number; estimated: number };
    const stageBudget = (ph.spent || 0) + (ph.estimated || 0);
    const pct = stageBudget > 0 ? Math.min(100, Math.round(((ph.spent || 0) / stageBudget) * 100)) : 0;
    stageProgress[stage] = pct;
    if ((ph.spent || 0) > 0) currentStage = Math.max(currentStage, stage);
  }
  return { budget: { total, spent, committed, remaining }, journey: { currentStage, stageProgress } };
}

export function useProjectLedger(projectId: string | null): LedgerResult {
  const [res, setRes] = useState<LedgerResult>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) { setRes({ ...EMPTY, ready: true }); return; }

    // Demo path — the fixture the body reads; the DB ledger is seeded to match.
    if (isDemo(projectId)) {
      try {
        const d = getDemoProject();
        const total = d.budget.approved, spent = d.budget.spent, committed = d.budget.committed;
        setRes({
          ready: true, hasData: true, name: d.name,
          // Remaining = uncommitted budget (total − committed), matching the
          // body's Budget River ("Remaining"); committed already includes spent.
          budget: { total, spent, committed, remaining: Math.max(0, total - committed) },
          journey: { currentStage: d.currentStage, stageProgress: d.stageProgress as Record<number, number> },
        });
      } catch {
        setRes({ ...EMPTY, ready: true });
      }
      return;
    }

    // Real project — read the canonical ledger (authed).
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const r = await fetch(`/api/v1/budget?project_id=${encodeURIComponent(projectId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) { if (!cancelled) setRes({ ...EMPTY, ready: true }); return; }
        const json = await r.json();
        const summary = json?.summary;
        if (!summary) { if (!cancelled) setRes({ ...EMPTY, ready: true }); return; }
        const { budget, journey } = fromSummary(summary);
        if (!cancelled) setRes({ ready: true, hasData: budget.total > 0, name: null, budget, journey });
      } catch {
        if (!cancelled) setRes({ ...EMPTY, ready: true });
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  return res;
}
