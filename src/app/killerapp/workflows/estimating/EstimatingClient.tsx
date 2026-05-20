'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StepResult } from '@/design-system/components/StepCard.types';
import { getProjectBudget, recordMaterialCost } from '@/lib/budget-spine';
import { resolveProjectId } from '@/lib/journey-progress';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import type { ProjectContext } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';
import AttachmentSection from '@/components/AttachmentSection';
import { colors, spacing, fonts, fontSizes, fontWeights, radii } from '@/design-system/tokens';
import { supabase } from '@/lib/supabase';

interface Props {
  workflow: Workflow;
  stages: LifecycleStage[];
}

// Shape of GET /api/v1/budget#summary (narrow — only the fields q2 reads).
// Source of truth: src/app/api/v1/budget/route.ts#BudgetSummary
interface BudgetSummaryShape {
  totalEstimated?: number;
  byCategory?: Record<string, { spent: number; estimated: number; count: number }>;
}

interface BudgetSnapshot {
  totalEstimated: number;
  categoryCount: number;
  isEmptyState?: boolean;
}

/**
 * Try to load demo budget data from localStorage.
 * Falls back to demo data when API fetch fails (graceful degradation for demo).
 * Returns null if no demo data is available.
 */
function tryLoadDemoBudgetData(): BudgetSnapshot | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    // Try to load demo budget data from localStorage
    const demoBudgetJson = window.localStorage.getItem('bkg:budget:demo-san-diego-adu');
    if (!demoBudgetJson) {
      return null;
    }

    const items = JSON.parse(demoBudgetJson) as Array<{ amount: number; isEstimate: boolean }>;
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    // Calculate totals from demo data
    const totalEstimated = items.reduce((sum, item) => {
      return item.isEstimate ? sum + item.amount : sum;
    }, 0);

    // For demo data, we'll report a reasonable category count
    // (the demo has 7 budget items across multiple categories)
    const uniqueCategories = new Set(items.map((_, idx) => Math.floor(idx / 2))); // rough estimate
    const categoryCount = Math.max(1, uniqueCategories.size);

    return { totalEstimated, categoryCount };
  } catch (e) {
    // Silently fail — if localStorage is corrupted, just show empty state
    return null;
  }
}

/**
 * Parse a rough-total dollar figure out of the contractor's final edit of
 * the AI takeoff. Matches the prompt contract (see
 * docs/ai-prompts/estimating-takeoff.md): the specialist is instructed to
 * emit a `Rough total: $XX,XXX` line that survives downstream parsing.
 *
 * We scan the text top-to-bottom and prefer the value after "Rough total:"
 * if present; otherwise fall back to the LAST `$XX,XXX` in the text so
 * itemized-line dollar amounts don't capture the handler. Same cross-cutting
 * caveat as q7/q11/q13/q17: until the prompt returns structured JSON, this
 * regex is load-bearing. Flipping all five handlers to structured output is
 * parked (see docs/ai-prompts/estimating-takeoff.md#production-rewrite).
 */
function parseRoughTotal(text: string): number | null {
  // Prefer explicit "Rough total:" anchor if the specialist kept format.
  const anchored = text.match(/Rough total:\s*(\$[\d,]+\.?\d*k?)/i);
  // Fall back to the LAST dollar figure in the text so itemized-line values
  // don't capture the handler if the anchor is missing.
  const candidate = anchored?.[1] ?? text.match(/\$[\d,]+\.?\d*k?[^$]*$/)?.[0];
  if (!candidate) return null;
  const raw = candidate.match(/\$[\d,]+\.?\d*k?/i)?.[0];
  if (!raw) return null;
  // $48.2k means 48,200 — not 48.2 with trailing zeros. Handle k suffix
  // by detect-and-multiply, not blind string replace (the naive
  // `.replace('k','000')` pattern used elsewhere in the codebase breaks on
  // decimal-k values; flagged as cross-cutting cleanup for W4.3b-polish).
  const hasK = /k$/i.test(raw);
  const numeric = parseFloat(raw.replace(/k$/i, '').replace(/[$,]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return hasK ? numeric * 1000 : numeric;
}

// C4: CSI estimate-block parser. The estimating-takeoff specialist may
// emit a fenced <estimate> JSON block with `total` and `lines[]`. We
// parse permissively so the table renders when structured output
// arrives without breaking older transcripts.
interface EstimateLine { division: string; low: number; high: number; }
interface EstimateBlock { total: number | null; lines: EstimateLine[]; }
function parseEstimateBlock(text: string): EstimateBlock | null {
  const m = text.match(/<estimate>([\s\S]*?)<\/estimate>/i);
  if (!m) return null;
  try {
    const parsed: unknown = JSON.parse(m[1].trim());
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as { total?: unknown; lines?: unknown };
    const linesRaw = Array.isArray(p.lines) ? p.lines : [];
    const lines: EstimateLine[] = linesRaw
      .filter((l): l is { division: string; low?: number; high?: number } =>
        !!l && typeof l === 'object' && typeof (l as { division?: unknown }).division === 'string'
      )
      .map((l) => ({
        division: String(l.division),
        low: Number(l.low) || 0,
        high: Number(l.high) || 0,
      }));
    return { total: typeof p.total === 'number' ? p.total : null, lines };
  } catch {
    return null;
  }
}

// Ship 34 — parser fallbacks. If the specialist prompt drifts and the
// fenced <estimate>...</estimate> JSON block isn't there, we still want
// the "Push to budget" button to work. Two fallbacks scan the same
// transcript text the primary parser sees.

/**
 * Dollar-amount tokenizer used by both fallback parsers. Handles
 * `$48,500`, `$48.5k`, `48000`, `48k` — same `k` detect-and-multiply
 * logic as parseRoughTotal so 48.2k → 48200, not 48200000.
 */
function parseMoneyToken(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[$,]/g, '');
  const m = cleaned.match(/^(\d+(?:\.\d+)?)(k?)$/i);
  if (!m) return null;
  const numeric = parseFloat(m[1]);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return /k/i.test(m[2]) ? numeric * 1000 : numeric;
}

/**
 * Ship 34 fallback #1 — markdown table parser. Looks for a `|`-delimited
 * table with at least 3 columns (Description / Low / High). Skips the
 * header row, the `---` separator row, and TOTAL rows. Returns [] if no
 * usable table is found.
 *
 * Tolerant of leading/trailing whitespace and tables that don't start at
 * column 0. We don't try to find a *specific* header — any 3+ column row
 * where the 2nd and 3rd cells parse as money counts.
 */
function parseEstimateMarkdownTable(text: string): EstimateLine[] {
  if (!text) return [];
  const lines = text.split('\n');
  const out: EstimateLine[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('|') || !line.endsWith('|')) continue;
    // Strip outer pipes, split into cells, trim.
    const cells = line.slice(1, -1).split('|').map((c) => c.trim());
    if (cells.length < 3) continue;
    // Separator row (e.g. `|---|---|---|`).
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const label = cells[0];
    // Skip header / total / empty-label rows.
    if (!label) continue;
    if (/^(division|description|category|item|line)$/i.test(label)) continue;
    if (/^total/i.test(label)) continue;
    const low = parseMoneyToken(cells[1]);
    const high = parseMoneyToken(cells[2]);
    if (low === null || high === null) continue;
    out.push({ division: label, low, high });
  }
  return out;
}

/**
 * Ship 34 fallback #2 — prose parser. Regex-extracts patterns like
 *   "Plumbing: $4,500–$6,500"
 *   "Electrical: $8k - $12k"
 *   "Site prep ranges $15k to $20k"
 * one match per non-empty line. Conservative: requires both a low and a
 * high value, and a label before the colon / "ranges" keyword.
 */
function parseEstimateProse(text: string): EstimateLine[] {
  if (!text) return [];
  const out: EstimateLine[] = [];
  // Accept en-dash (–), em-dash (—), hyphen-minus (-), and "to" between
  // the two money tokens.
  const colonRe = /^([^:\n][^:\n]{0,80}?):\s*\$?([\d.,]+k?)\s*(?:[–—\-]|to)\s*\$?([\d.,]+k?)\b/i;
  const rangesRe = /^([^\n]{1,80}?)\s+ranges?\s+\$?([\d.,]+k?)\s*(?:[–—\-]|to)\s*\$?([\d.,]+k?)\b/i;
  const seen = new Set<string>();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    // Don't double-eat markdown-table rows the table parser already handled.
    if (line.startsWith('|')) continue;
    const m = line.match(colonRe) ?? line.match(rangesRe);
    if (!m) continue;
    const label = m[1].trim().replace(/^[*\-•]+\s*/, '');
    if (!label || /^total/i.test(label)) continue;
    const low = parseMoneyToken(m[2]);
    const high = parseMoneyToken(m[3]);
    if (low === null || high === null) continue;
    const key = `${label.toLowerCase()}::${low}::${high}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ division: label, low, high });
  }
  return out;
}

/**
 * Ship 33 — stable ID for an estimate line. Format:
 *   est-{projectId}-{division-slug}
 * where division-slug is lowercase, non-alphanumerics collapsed to `-`,
 * leading/trailing dashes stripped, capped at 40 chars. Lets re-runs
 * REPLACE the prior push for the same division instead of duplicating.
 */
function stableEstimateLineId(projectId: string | null | undefined, division: string): string {
  const slug = division
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `est-${projectId ?? 'anonymous'}-${slug}`;
}

export default function EstimatingClient({ workflow, stages }: Props) {
  // Project Spine v1: hydrate + autosave the per-workflow JSONB state.
  // Hook redirects to /killerapp if no ?project=<id>.
  const {
    projectId,
    hydratedPayloads,
    recordStepEvent,
    lastSavedAt,
    saving,
    project,
  } = useProjectWorkflowState({
    column: 'estimating_state',
    workflowId: workflow.id,
  });

  const [budgetSnapshot, setBudgetSnapshot] = useState<BudgetSnapshot | null>(null);
  const [budgetError, setBudgetError] = useState<'no-active-project' | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [lastRecordedAmount, setLastRecordedAmount] = useState<number | null>(null);
  const [csiEstimate, setCsiEstimate] = useState<EstimateBlock | null>(null);

  // ── Project-summary sync state ────────────────────────────────────────
  // Local override of the project context so the banner reflects changes
  // immediately after the user confirms an update, without a full re-fetch.
  const [localProject, setLocalProject] = useState<ProjectContext | null>(null);

  // Pending scope change: holds the stepResult + new raw_input until the
  // user confirms the modal. We don't call recordStepEvent until confirmed
  // so the step card isn't committed if the user cancels.
  const [pendingScopeChange, setPendingScopeChange] = useState<{
    value: string;
    stepResult: StepResult & { workflowId: string };
  } | null>(null);

  // In-session sqft override: updates immediately when s2-3 completes so the
  // banner reflects the new value without waiting for the server round-trip.
  const [localSqft, setLocalSqft] = useState<string | null>(null);

  // Inline update flags — auto-dismiss after 6 s.
  const [locationFlag, setLocationFlag] = useState(false);
  const [sqftFlag, setSqftFlag] = useState(false);
  const locationFlagTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sqftFlagTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper: PATCH a project field through the API with the supabase auth token.
  const patchProject = useCallback(async (id: string, updates: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch('/api/v1/projects', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ id, ...updates }),
    }).catch(() => { /* offline / demo — best-effort */ });
  }, []);

  // 2026-05-19 (Ship 28): AI estimate → /killerapp/budget handoff.
  // Re-uses the already-parsed csiEstimate.lines (low/high per division)
  // and appends them as 'estimated'-state lines into the budget store
  // BudgetClient reads from (`bkg-budget-{projectId}` localStorage + the
  // new `project_budgets` JSONB column from Ship 25). Demo flow:
  // estimating runs → user clicks "Push to budget" → opens /budget
  // pre-populated so they don't have to retype 10 division totals.
  const [pushReceipt, setPushReceipt] = useState<
    | { kind: 'idle' }
    | { kind: 'pushing' }
    // Ship 33: distinguish "refreshed" (replaced previously pushed AI
    // lines) from "added" (all-new). `replaced` is the count of prior
    // AI-pushed lines that were removed during merge.
    | { kind: 'pushed'; added: number; replaced: number }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  // Project Spine v1: track step status locally; seed from hydrated.
  const [stepStatusMap, setStepStatusMap] = useState<
    Record<string, 'pending' | 'in_progress' | 'complete'>
  >({});

  useEffect(() => {
    if (Object.keys(hydratedPayloads).length === 0) return;
    const saved = hydratedPayloads['s2-6'];
    if (saved && typeof saved === 'object') {
      // 2026-05-19 dogfood: manual-fill answer (payload.value) wins over
      // AI input (payload.input). Lets dad demo estimating end-to-end by
      // pasting a hand-written breakdown.
      const value = (saved as { value?: unknown }).value;
      const input = (saved as { input?: unknown }).input;
      const text =
        typeof value === 'string' && value.trim()
          ? value
          : typeof input === 'string'
            ? input
            : '';
      const block = parseEstimateBlock(text);
      if (block) setCsiEstimate(block);
    }
    setStepStatusMap((prev) => {
      const next = { ...prev };
      for (const stepId of Object.keys(hydratedPayloads)) {
        if (!next[stepId]) next[stepId] = 'complete';
      }
      return next;
    });
  }, [hydratedPayloads]);

  async function refreshBudget() {
    // Pass URL-bound project id so we don't race localStorage timing.
    const result = await getProjectBudget(projectId ?? undefined);
    if (!result.ok) {
      // API fetch failed — attempt graceful fallback to demo data
      if (result.reason === 'no-active-project') {
        setBudgetError('no-active-project');
        setBudgetSnapshot(null);
        return;
      }

      // Try to load demo data from localStorage as fallback
      const demoBudgetData = tryLoadDemoBudgetData();
      if (demoBudgetData) {
        setBudgetError(null);
        setBudgetSnapshot(demoBudgetData);
        return;
      }

      // No demo data available — show empty state instead of error
      setBudgetError(null);
      setBudgetSnapshot({ totalEstimated: 0, categoryCount: 0, isEmptyState: true });
      return;
    }
    const summary = result.summary as BudgetSummaryShape;
    const totalEstimated = summary.totalEstimated ?? 0;
    // Real category count = categories with at least one estimated-line > 0.
    // (The old code counted Object.keys(summary).length - 1, which reflected
    // API field count, not budget categories — classic bug.)
    const categoryCount = summary.byCategory
      ? Object.values(summary.byCategory).filter((c) => c.estimated > 0).length
      : 0;
    setBudgetError(null);
    setBudgetSnapshot({ totalEstimated, categoryCount });
  }

  useEffect(() => {
    if (!projectId) return; // wait for hook to resolve
    setLoadingBudget(true);
    refreshBudget().finally(() => setLoadingBudget(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleStepComplete(stepResult: StepResult & { workflowId: string }) {
    const activeProject = localProject ?? project;
    const payload = stepResult.payload as { value?: string; input?: string } | undefined;
    const stepValue = payload?.value?.trim() ?? '';

    // ── s2-1 "Describe the job" ───────────────────────────────────────────
    // If the project already has a description AND it's changing, show the
    // scope-change confirmation modal before committing anything.
    if (
      stepResult.stepId === 's2-1' &&
      stepResult.type === 'step_completed' &&
      stepValue &&
      activeProject?.raw_input &&
      stepValue !== activeProject.raw_input
    ) {
      setPendingScopeChange({ value: stepValue, stepResult });
      return; // hold — don't persist yet
    }

    // ── s2-2 "Where is it?" ──────────────────────────────────────────────
    // PATCH jurisdiction and show inline flag when the location changes.
    if (stepResult.stepId === 's2-2' && stepResult.type === 'step_completed' && stepValue && projectId) {
      const wasSet = !!activeProject?.jurisdiction;
      void patchProject(projectId, { jurisdiction: stepValue });
      setLocalProject((prev) => {
        const base = prev ?? activeProject;
        if (!base) return prev;
        return { ...base, jurisdiction: stepValue };
      });
      if (wasSet) {
        if (locationFlagTimer.current) clearTimeout(locationFlagTimer.current);
        setLocationFlag(true);
        locationFlagTimer.current = setTimeout(() => setLocationFlag(false), 6000);
      }
    }

    // ── s2-3 "Approximate square footage" ────────────────────────────────
    // No dedicated DB column — sqft is persisted in estimating_state (via
    // recordStepEvent below) and displayed in the banner via seededPayloads.
    // Show inline flag when the value changes.
    if (stepResult.stepId === 's2-3' && stepResult.type === 'step_completed' && stepValue) {
      setLocalSqft(stepValue);
      if (sqftFlagTimer.current) clearTimeout(sqftFlagTimer.current);
      setSqftFlag(true);
      sqftFlagTimer.current = setTimeout(() => setSqftFlag(false), 6000);
    }

    // Project Spine v1: persist this step's payload into estimating_state.
    recordStepEvent(stepResult);

    // Bump local statusMap so counter updates in-session.
    if (stepResult.type === 'step_completed') {
      setStepStatusMap((prev) => ({ ...prev, [stepResult.stepId]: 'complete' }));
    } else if (stepResult.type === 'step_saved') {
      setStepStatusMap((prev) => ({
        ...prev,
        [stepResult.stepId]: prev[stepResult.stepId] ?? 'in_progress',
      }));
    }

    // Only the final step (s2-6 AI estimate) drives a budget write.
    if (stepResult.stepId !== 's2-6' || stepResult.type !== 'step_completed') return;

    // Manual-fill answer (payload.value) wins over AI input (payload.input).
    const finalText = (payload?.value && payload.value.trim()) || payload?.input || '';
    const block = parseEstimateBlock(finalText);
    if (block) setCsiEstimate(block);
    const amount = parseRoughTotal(finalText);
    if (amount === null) return;

    const budgetProjectId = projectId ?? resolveProjectId();
    const result = await recordMaterialCost({
      description: 'AI estimate — Size Up',
      amount,
      lifecycleStageId: 1,
      isEstimate: true,
      projectId: budgetProjectId,
    });

    if (result.ok) {
      setLastRecordedAmount(amount);
      await refreshBudget();
    }
  }

  // ─── "Saved" indicator string ────────────────────────────────────────
  const savedLabel = saving
    ? 'Saving…'
    : lastSavedAt
      ? `Saved · ${new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : null;

  // Ship 34 — derive the latest assistant-side transcript text for s2-6
  // so the fallback parsers can scan it when the <estimate> JSON block
  // is missing. Mirrors the value/input precedence in the seed effect.
  const s26Text = useMemo(() => {
    const saved = hydratedPayloads['s2-6'];
    if (!saved || typeof saved !== 'object') return '';
    const value = (saved as { value?: unknown }).value;
    const input = (saved as { input?: unknown }).input;
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof input === 'string') return input;
    return '';
  }, [hydratedPayloads]);

  // Ship 34 — combined "effective lines" for the Push-to-budget button.
  // Priority: primary csiEstimate.lines → markdown table → prose. The
  // button is enabled when ANY of these returns >= 1 line.
  const effectiveLines = useMemo<EstimateLine[]>(() => {
    if (csiEstimate && csiEstimate.lines.length > 0) return csiEstimate.lines;
    const table = parseEstimateMarkdownTable(s26Text);
    if (table.length > 0) return table;
    const prose = parseEstimateProse(s26Text);
    if (prose.length > 0) return prose;
    return [];
  }, [csiEstimate, s26Text]);

  // Pre-fill text/voice/analysis steps with raw_input AND parse out
  // location + sqft for location_input/number_input steps. User
  // feedback 2026-05-06: "I shouldn't have to answer the questions of
  // where is the location or square footage if I already put those in."
  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );

  // Mark seeded steps as 'complete' so the XP counter credits the user
  // for project context they already provided. Active completions
  // during the session still update via setStepStatusMap below.
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

  // sqft for the ProjectContextBanner.
  // Priority: in-session edit (localSqft) → persisted workflow state (seededPayloads
  // merges hydratedPayloads, which survives reload via estimating_state).
  const bannerSqft = useMemo(
    () => localSqft ?? seededPayloads['s2-3']?.value ?? hydratedPayloads['s2-3']?.value ?? null,
    [localSqft, seededPayloads, hydratedPayloads]
  );

  // ── Scope-change modal handlers ───────────────────────────────────────
  async function confirmScopeChange() {
    if (!pendingScopeChange || !projectId) {
      setPendingScopeChange(null);
      return;
    }
    const { value, stepResult } = pendingScopeChange;
    recordStepEvent(stepResult);
    setStepStatusMap((prev) => ({ ...prev, [stepResult.stepId]: 'complete' }));
    void patchProject(projectId, { raw_input: value });
    setLocalProject((prev) => {
      const base = prev ?? project;
      if (!base) return prev;
      return { ...base, raw_input: value };
    });
    setPendingScopeChange(null);
  }

  function cancelScopeChange() {
    setPendingScopeChange(null);
  }

  const activeProject = localProject ?? project;

  const topPanel = (
    <section
      style={{
        padding: spacing[4],
        backgroundColor: colors.ink[50],
        borderRadius: radii.md,
        border: `1px solid ${colors.ink[100]}`,
        position: 'relative',
      }}
    >
      {savedLabel && (
        <span
          aria-live="polite"
          style={{
            position: 'absolute',
            top: spacing[2],
            right: spacing[3],
            fontSize: fontSizes.xs,
            color: colors.ink[500],
            fontFamily: fonts.body,
          }}
          data-testid="estimating-saved-indicator"
        >
          {savedLabel}
        </span>
      )}
      {loadingBudget ? (
        <p style={{ fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.ink[400] }}>
          Loading budget…
        </p>
      ) : budgetError === 'no-active-project' ? (
        <div>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: fontSizes.sm,
              color: colors.ink[600],
              marginBottom: spacing[2],
            }}
          >
            No active project yet.
          </p>
          <a
            href="/killerapp"
            style={{
              display: 'inline-block',
              padding: `${spacing[2]} ${spacing[3]}`,
              fontFamily: fonts.body,
              fontSize: fontSizes.sm,
              color: 'var(--trace)',
              backgroundColor: colors.ink[900],
              textDecoration: 'none',
              borderRadius: radii.sm,
            }}
          >
            Create a project
          </a>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: fontSizes.sm,
                fontWeight: fontWeights.medium,
                color: colors.ink[900],
              }}
            >
              Budget snapshot
            </p>
            {budgetSnapshot?.isEmptyState && (
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: fontSizes.xs,
                  color: colors.ink[400],
                  fontStyle: 'italic',
                }}
              >
                starter values
              </span>
            )}
          </div>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: fontSizes.xs,
              color: colors.ink[400],
              marginTop: spacing[1],
            }}
          >
            {budgetSnapshot && budgetSnapshot.totalEstimated > 0
              ? `$${budgetSnapshot.totalEstimated.toLocaleString()} in estimates across ${budgetSnapshot.categoryCount || 1} ${
                  budgetSnapshot.categoryCount === 1 ? 'category' : 'categories'
                } so far.`
              : 'Total committed: $0 · Spent: $0'}
          </p>
          {lastRecordedAmount !== null && (
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: fontSizes.xs,
                color: colors.ink[600],
                marginTop: spacing[1],
              }}
            >
              Just recorded ${lastRecordedAmount.toLocaleString()} from the AI takeoff.
            </p>
          )}
        </div>
      )}
      {csiEstimate && csiEstimate.lines.length > 0 && (
        <div style={{ marginTop: spacing[4] }}>
          <p style={{
            fontFamily: fonts.body,
            fontSize: fontSizes.sm,
            fontWeight: fontWeights.semibold,
            color: colors.ink[900],
            marginBottom: spacing[2],
          }}>
            Cost breakdown by CSI division
          </p>
          <div style={{
            border: `1px solid ${colors.ink[200]}`,
            borderRadius: radii.md,
            overflow: 'hidden',
            backgroundColor: 'var(--trace)',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              padding: `${spacing[2]} ${spacing[3]}`,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              fontWeight: fontWeights.semibold,
              color: colors.ink[600],
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderBottom: `1px solid ${colors.ink[200]}`,
            }}>
              <span>Division</span>
              <span style={{ textAlign: 'right' }}>Low</span>
              <span style={{ textAlign: 'right' }}>High</span>
            </div>
            {csiEstimate.lines.map((line, idx) => (
              <div key={`${line.division}-${idx}`} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                padding: `${spacing[2]} ${spacing[3]}`,
                fontFamily: fonts.body,
                fontSize: fontSizes.sm,
                color: colors.ink[900],
                borderBottom: idx < csiEstimate.lines.length - 1
                  ? `1px solid ${colors.ink[100]}`
                  : 'none',
              }}>
                <span>{line.division}</span>
                <span style={{ textAlign: 'right' }}>${line.low.toLocaleString()}</span>
                <span style={{ textAlign: 'right' }}>${line.high.toLocaleString()}</span>
              </div>
            ))}
            {csiEstimate.total !== null && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr',
                padding: `${spacing[2]} ${spacing[3]}`,
                fontFamily: fonts.body,
                fontSize: fontSizes.sm,
                fontWeight: fontWeights.semibold,
                color: colors.ink[900],
                borderTop: `1px solid ${colors.ink[200]}`,
                backgroundColor: colors.ink[50],
              }}>
                <span>Total estimate</span>
                <span style={{ textAlign: 'right' }}>${csiEstimate.total.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Ship 28 + 33 + 34 — push this AI estimate into the dedicated /budget page.
          Ship 33: dedup by stable ID (est-{projectId}-{division-slug}) so re-runs
          REPLACE prior AI-pushed lines instead of duplicating with a shifted midpoint.
          Ship 34: button is enabled whenever effectiveLines has rows (primary
          csiEstimate, markdown-table fallback, or prose fallback). Sibling of the
          CSI table block so the button still renders when the AI prompt drifts
          and the <estimate> JSON block is missing. */}
      {effectiveLines.length > 0 && (
        <div style={{ marginTop: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[3], flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              if (effectiveLines.length === 0) return;
              setPushReceipt({ kind: 'pushing' });
              try {
                // Heuristic category mapping (case-insensitive).
                const categorize = (label: string): string => {
                  const t = label.toLowerCase();
                  if (/plumb|electric|hvac|mechanical|roof|drywall|insul|tile|stucco|paint|landscap|solar|fire/.test(t)) return 'subcontractors';
                  if (/labor|crew|foreman|wages|payroll/.test(t)) return 'labor';
                  if (/permit|plan check|fee|impact|inspect/.test(t)) return 'permits';
                  if (/profit|overhead|o&p|markup|margin/.test(t)) return 'profit';
                  if (/equipment|rental|scaffold|lift|generator|crane|excavat/.test(t)) return 'equipment';
                  if (/insurance|bond|liability|workers comp/.test(t)) return 'insurance';
                  if (/admin|office|software|phone|mileage/.test(t)) return 'admin';
                  if (/contingency|reserve|buffer/.test(t)) return 'contingency';
                  if (/concrete|gravel|rebar|sand|aggregate/.test(t)) return 'raw-supplies';
                  return 'materials';
                };
                const now = new Date().toISOString();
                // Ship 33 — stable IDs so re-runs replace, not duplicate.
                const newLines = effectiveLines.map((line) => ({
                  id: stableEstimateLineId(projectId, line.division),
                  category: categorize(line.division),
                  description: line.division,
                  amount: Math.round((line.low + line.high) / 2),
                  state: 'estimated' as const,
                  notes: `AI estimate: $${line.low.toLocaleString()}–$${line.high.toLocaleString()} (from /workflows/estimating)`,
                  createdAt: now,
                  updatedAt: now,
                }));
                // Ship 33 — dedup by stable ID. Load existing lines, drop any
                // previously-AI-pushed rows whose ID matches an incoming new ID
                // (this is the "replace prior push" path), then append.
                const lsKey = `bkg-budget-${projectId ?? 'anonymous'}`;
                let existing: Array<{ id?: string; description?: string; amount?: number }> = [];
                try {
                  const raw = window.localStorage.getItem(lsKey);
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed?.lines)) existing = parsed.lines;
                  }
                } catch { /* localStorage corrupt — start fresh */ }
                const incomingIds = new Set(newLines.map((l) => l.id));
                const aiPrefix = `est-${projectId ?? 'anonymous'}-`;
                // A row is "previously AI-pushed" if its id starts with the
                // est-{projectId}- prefix. We only drop those that match an
                // incoming new ID — orphaned prior pushes (e.g. division
                // renamed away) stay so the user can manually clean them up.
                const replaced = existing.filter(
                  (l) => typeof l.id === 'string' && l.id.startsWith(aiPrefix) && incomingIds.has(l.id)
                ).length;
                const kept = existing.filter(
                  (l) => !(typeof l.id === 'string' && l.id.startsWith(aiPrefix) && incomingIds.has(l.id))
                );
                const merged = [...kept, ...newLines];
                try {
                  window.localStorage.setItem(lsKey, JSON.stringify({ lines: merged }));
                } catch { /* quota / disabled — fall through to API */ }
                // Fire-and-forget DB sync (Ship 25's project_budgets column).
                if (projectId) {
                  void fetch('/api/v1/projects', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: projectId, project_budgets: { lines: merged } }),
                  }).catch(() => { /* offline / no-auth — localStorage is the source of truth */ });
                }
                setPushReceipt({ kind: 'pushed', added: newLines.length, replaced });
              } catch (err) {
                setPushReceipt({
                  kind: 'error',
                  message: err instanceof Error ? err.message : 'Push failed',
                });
              }
            }}
            disabled={pushReceipt.kind === 'pushing' || effectiveLines.length === 0}
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              fontSize: fontSizes.sm,
              fontWeight: fontWeights.semibold,
              fontFamily: fonts.body,
              background: 'var(--brass, #C9913F)',
              color: 'var(--trace, #F4F0E6)',
              border: 'none',
              borderRadius: radii.full,
              cursor: 'pointer',
              minHeight: 40,
            }}
            data-testid="estimating-push-to-budget"
          >
            Push to budget →
          </button>
          {pushReceipt.kind === 'pushed' && (
            <span
              role="status"
              aria-live="polite"
              style={{ fontSize: fontSizes.sm, color: colors.ink[600] }}
            >
              {pushReceipt.replaced > 0
                ? `Refreshed ${pushReceipt.added} line${pushReceipt.added === 1 ? '' : 's'} — `
                : `Added ${pushReceipt.added} line${pushReceipt.added === 1 ? '' : 's'} — `}
              <a
                href={`/killerapp/budget${projectId ? `?project=${encodeURIComponent(projectId)}` : ''}`}
                style={{ color: 'var(--brass, #C9913F)', textDecoration: 'underline' }}
              >
                Open budget →
              </a>
            </span>
          )}
          {pushReceipt.kind === 'error' && (
            <span style={{ fontSize: fontSizes.sm, color: '#A02A1F' }}>
              Push failed: {pushReceipt.message}
            </span>
          )}
        </div>
      )}
    </section>
  );

  return (
    <>
      {/* ── Scope-change confirmation modal ─────────────────────────────── */}
      {pendingScopeChange && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="scope-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing[4],
            backgroundColor: 'rgba(14, 14, 14, 0.55)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              background: 'var(--trace, #F4F0E6)',
              borderRadius: radii.lg,
              padding: spacing[6],
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              fontFamily: fonts.body,
            }}
          >
            <p
              style={{
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: '#A02A1F',
                marginBottom: spacing[2],
              }}
            >
              Heads up
            </p>
            <h2
              id="scope-modal-title"
              style={{
                fontSize: fontSizes.lg,
                fontWeight: fontWeights.semibold,
                color: 'var(--graphite, #2E2E30)',
                marginBottom: spacing[3],
              }}
            >
              Change the scope of your project?
            </h2>
            <p
              style={{
                fontSize: fontSizes.sm,
                lineHeight: 1.55,
                color: 'var(--graphite, #2E2E30)',
                opacity: 0.75,
                marginBottom: spacing[4],
              }}
            >
              Updating the job description changes the foundation of your entire project.
              This could affect <strong>all</strong> aspects — estimations, code compliance,
              permits, and contracts — and may require you to re-run those workflows.
            </p>
            <blockquote
              style={{
                margin: `0 0 ${spacing[5]}`,
                padding: `${spacing[3]} ${spacing[4]}`,
                background: colors.ink[100],
                borderLeft: `3px solid var(--brass, #C9913F)`,
                borderRadius: radii.sm,
                fontSize: fontSizes.sm,
                lineHeight: 1.45,
                color: 'var(--graphite, #2E2E30)',
              }}
            >
              {pendingScopeChange.value.length > 180
                ? `${pendingScopeChange.value.slice(0, 177)}…`
                : pendingScopeChange.value}
            </blockquote>
            <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={cancelScopeChange}
                style={{
                  padding: `${spacing[2]} ${spacing[4]}`,
                  fontSize: fontSizes.sm,
                  fontFamily: fonts.body,
                  background: 'transparent',
                  color: 'var(--graphite, #2E2E30)',
                  border: `1px solid ${colors.ink[300]}`,
                  borderRadius: radii.full,
                  cursor: 'pointer',
                  minHeight: 40,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmScopeChange()}
                style={{
                  padding: `${spacing[2]} ${spacing[4]}`,
                  fontSize: fontSizes.sm,
                  fontWeight: fontWeights.semibold,
                  fontFamily: fonts.body,
                  background: '#A02A1F',
                  color: '#fff',
                  border: 'none',
                  borderRadius: radii.full,
                  cursor: 'pointer',
                  minHeight: 40,
                }}
              >
                Yes, update project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Location updated flag ─────────────────────────────────────────── */}
      {locationFlag && (
        <div
          role="status"
          aria-live="polite"
          style={{
            maxWidth: 900,
            margin: '0 auto',
            marginBottom: spacing[3],
            padding: `${spacing[3]} ${spacing[4]}`,
            background: 'var(--trace, #F4F0E6)',
            border: `1px solid var(--brass, #C9913F)`,
            borderRadius: radii.md,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
            fontFamily: fonts.body,
            fontSize: fontSizes.sm,
            color: 'var(--graphite, #2E2E30)',
          }}
        >
          <span style={{ fontSize: 16 }}>📍</span>
          <span>
            <strong>Project location updated.</strong> Your project summary now reflects the new location.
          </span>
          <button
            type="button"
            onClick={() => setLocationFlag(false)}
            aria-label="Dismiss"
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: colors.ink[500],
              padding: spacing[1],
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Square footage updated flag ───────────────────────────────────── */}
      {sqftFlag && (
        <div
          role="status"
          aria-live="polite"
          style={{
            maxWidth: 900,
            margin: '0 auto',
            marginBottom: spacing[3],
            padding: `${spacing[3]} ${spacing[4]}`,
            background: 'var(--trace, #F4F0E6)',
            border: `1px solid var(--brass, #C9913F)`,
            borderRadius: radii.md,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
            fontFamily: fonts.body,
            fontSize: fontSizes.sm,
            color: 'var(--graphite, #2E2E30)',
          }}
        >
          <span style={{ fontSize: 16 }}>📐</span>
          <span>
            <strong>Square footage updated.</strong> Your project summary now reflects the new size.
          </span>
          <button
            type="button"
            onClick={() => setSqftFlag(false)}
            aria-label="Dismiss"
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: colors.ink[500],
              padding: spacing[1],
            }}
          >
            ✕
          </button>
        </div>
      )}

      <ProjectContextBanner project={activeProject} selfWorkflow="estimating" sqft={bannerSqft} />
      <AttachmentSection
        projectId={projectId}
        workflowId="q2"
        stepId="upload-jobsite-reference-photos"
        title="Upload jobsite reference photos"
        subtitle="Drop existing-conditions shots — site, structure, finishes — anything the takeoff should account for."
        onUploaded={(uploaded) => {
          recordStepEvent({
            type: 'step_completed',
            workflowId: 'q2',
            stepId: 'upload-jobsite-reference-photos',
            payload: {
              value: `${uploaded.length} ${uploaded.length === 1 ? 'file' : 'files'} uploaded`,
            },
            timestamp: Date.now(),
          });
        }}
      />
      <WorkflowShell
        workflow={workflow}
        stages={stages}
        breadcrumbLabel="AI Estimating Gate"
        topPanel={topPanel}
        onStepComplete={handleStepComplete}
        projectId={projectId ?? undefined}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />
    </>
  );
}
