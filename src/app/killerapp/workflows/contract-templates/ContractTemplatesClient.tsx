'use client';

/**
 * ContractTemplatesClient
 * =======================
 * Client Component for /killerapp/workflows/contract-templates.
 *
 * Owns:
 *   - Template selection (multi-select across the 6 templates)
 *   - Shared field values across the selected templates
 *   - PDF generation on demand (jsPDF runs in-browser)
 *   - DRAFT disclaimer banner — displayed before any work happens and
 *     stamped on every page of every PDF generated
 *
 * Per killer-app-direction.md § Legal prerequisites: until a construction
 * attorney has reviewed the template language for the user's state, every
 * output is treated as a DRAFT only. There is currently no path to flip
 * that flag to `false` from the UI; it ships locked on.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type LifecycleStage } from '@/components/JourneyMapHeader';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  spacing,
  radii,
  borders,
  transitions,
} from '@/design-system/tokens';
import type {
  ContractTemplateMeta,
  ContractField,
  TemplateBodies,
} from '@/lib/contract-templates';
import {
  fillTemplate,
  filterTemplatesByQuery,
  getDefaultTemplateIdForJurisdiction,
  getTemplateMeta,
  groupTemplatesByCategory,
} from '@/lib/contract-templates';
import { sanitizeAiText } from '@/lib/sanitize-ai-text';
import { downloadContractPdf } from '@/lib/pdf/contract-pdf';
import { useProjectStateBlob } from '@/lib/hooks/useProjectWorkflowState';
import { supabase } from '@/lib/supabase';
import ProjectContextBanner from '../ProjectContextBanner';
import CostPerSquareFootBadge from '@/design-system/components/CostPerSquareFootBadge';
import AttachmentSection from '@/components/AttachmentSection';

// Project Spine v1 — JSONB shape for contracts_state.
// Stored as plain object (Set<string> can't round-trip through JSON).
interface ContractsState extends Record<string, unknown> {
  selectedIds: string[];
  fields: Record<string, string>;
}

const DEFAULT_CONTRACTS_STATE: ContractsState = {
  selectedIds: [],
  fields: {},
};

interface ContractTemplatesClientProps {
  workflow: Workflow;
  stages: LifecycleStage[];
  templates: ContractTemplateMeta[];
  bodies: TemplateBodies;
}

export default function ContractTemplatesClient({
  workflow,
  stages,
  templates,
  bodies,
}: ContractTemplatesClientProps) {
  // Project Spine v1: hydrate + autosave contracts_state JSONB.
  const {
    state: contractsState,
    setState: setContractsState,
    lastSavedAt,
    saving,
    loading: projectLoading,
    project,
    projectId: spineProjectId,
  } = useProjectStateBlob<ContractsState>({
    column: 'contracts_state',
    workflowId: workflow.id,
    defaultValue: DEFAULT_CONTRACTS_STATE,
  });

  // Derive Set<string> locally from string[] for the existing render code.
  const selected = useMemo(
    () => new Set(contractsState.selectedIds ?? []),
    [contractsState.selectedIds]
  );
  const fields = contractsState.fields ?? {};

  const [proMode, setProMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string[]>([]);

  // -----------------------------------------------------------------
  // CONTRACT-PICKER (2026-05-22): top-of-page picker UI.
  // -----------------------------------------------------------------
  // Lets the GC search free-text ("hiring a sub", "California", "architect")
  // and pick a template from a category-grouped dropdown. Selecting a
  // template:
  //   1. Updates URL ?template={id} so the choice is shareable.
  //   2. Updates contracts_state.selectedIds so the existing
  //      multi-select cards stay in sync and the existing field-merge /
  //      autofill / PDF-generation code keeps working unchanged.
  //
  // We do NOT replace the multi-select cards below — the picker is an
  // ADDITIVE quick-access UI on top of them. That way the existing
  // autofill flow (contractAmount, scopeOfWork, etc.) keeps working,
  // and a user who wants to generate multiple contracts at once can
  // still tick multiple cards.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTemplate = searchParams?.get('template') ?? null;
  const [pickerQuery, setPickerQuery] = useState('');

  // The currently "primary" template the picker is focused on. Sources, in
  // priority order: URL param → first selected card → jurisdiction default.
  const activeTemplateId = useMemo<string>(() => {
    if (urlTemplate && getTemplateMeta(urlTemplate)) return urlTemplate;
    const firstSelected = contractsState.selectedIds?.[0];
    if (firstSelected && getTemplateMeta(firstSelected)) return firstSelected;
    return getDefaultTemplateIdForJurisdiction(project?.jurisdiction);
  }, [urlTemplate, contractsState.selectedIds, project?.jurisdiction]);

  const activeTemplate = useMemo(
    () => getTemplateMeta(activeTemplateId),
    [activeTemplateId],
  );

  // Filter templates against the free-text query, then group by category.
  const filteredGroups = useMemo(
    () => groupTemplatesByCategory(filterTemplatesByQuery(templates, pickerQuery)),
    [templates, pickerQuery],
  );

  // On first load: if the URL has no ?template= but we DO know a sensible
  // default for the project's jurisdiction, push it to the URL so a refresh
  // or share is deterministic. Also auto-select the default template if
  // nothing is currently selected (so the user lands with a working form).
  const didSyncDefaultRef = React.useRef(false);
  useEffect(() => {
    if (didSyncDefaultRef.current) return;
    // Wait for the project hydration to finish before deciding the default —
    // otherwise we'd seed `client-agreement` on a CA project just because
    // `project` is still null on first paint.
    if (projectLoading) return;
    didSyncDefaultRef.current = true;
    if (!urlTemplate) {
      const defaultId = getDefaultTemplateIdForJurisdiction(project?.jurisdiction);
      // Only push if we actually have a pathname (server-side renders pass
      // null). useRouter is a no-op on the server.
      if (pathname) {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.set('template', defaultId);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
      // If the user has no cards selected, pre-select the default so they
      // don't see the "Pick at least one" empty state on first visit.
      if ((contractsState.selectedIds ?? []).length === 0) {
        setContractsState((prev: ContractsState) => ({
          ...prev,
          selectedIds: [defaultId],
        }));
      }
    }
  }, [
    project,
    projectLoading,
    urlTemplate,
    pathname,
    searchParams,
    router,
    contractsState.selectedIds,
    setContractsState,
  ]);

  /**
   * Switch to a different template via the picker. Updates URL, swaps
   * the (single) selection in contracts_state so the existing field-merge
   * + autofill + generate flow targets the new template. Does NOT clear
   * the field values — overlapping placeholders (clientName,
   * contractAmount, projectAddress, …) carry over.
   */
  const handlePickTemplate = useCallback(
    (id: string) => {
      if (!getTemplateMeta(id)) return;
      // 1. URL
      if (pathname) {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.set('template', id);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
      // 2. selectedIds: replace any single-template selection with the new
      //    pick. If the user has multiple cards ticked, ADD the new id
      //    instead of clobbering their multi-select.
      setContractsState((prev: ContractsState) => {
        const prevIds = prev.selectedIds ?? [];
        if (prevIds.length <= 1) {
          return { ...prev, selectedIds: [id] };
        }
        if (prevIds.includes(id)) return prev;
        return { ...prev, selectedIds: [...prevIds, id] };
      });
    },
    [pathname, searchParams, router, setContractsState],
  );

  // Project Spine v1.5: autofill contract fields from project context.
  // Re-runs whenever the project's `ai_summary` changes so a server-side
  // backfill of sanitized prose flows through to existing trial accounts
  // that already touched this page. The `seed` helper still refuses to
  // clobber a field the user actually typed — it only writes when the
  // stored value is empty/whitespace.
  //
  // 2026-05-22 (Demo2 fix): the previous implementation used a one-shot
  // `didAutofill` boolean. Once flipped true on first visit, a later
  // update to `ai_summary` (e.g. the sanitizer fix that landed after
  // first run) could never reach the contract field — the stale prose
  // stayed baked into `contracts_state.fields.scopeOfWork` forever. We
  // now track the last summary string we autofilled from in a ref;
  // identical summary → skip (idempotent), new summary → re-seed any
  // empty fields. Non-empty (user-typed) fields are still protected
  // by the per-field check inside `seed`.
  //
  // See tasks.lessons.md 2026-05-18 for the typing trap this avoids:
  // ContractsState extends `Record<string, unknown>`, and the hook's
  // hydration spread (`{ ...defaultValue, ...blob } as T` in
  // useProjectStateBlob) widens `fields` to `Record<string, unknown>` at
  // the spread site. We declare `f: Record<string, string>` LOCALLY to
  // narrow the assignment target back to string-only, so `String(val)`
  // assigns cleanly and `f[key].trim()` is type-safe.
  const lastAutofilledSummaryRef = React.useRef<string | null>(null);
  // 2026-05-22 (BUDGET+SEC2 fix): track the real budget total (sum of
  // project_budget_lines.budgeted) separately from the AI low/high midpoint.
  // The cockpit BudgetSnapshot reads this same number; if we let the AI
  // midpoint into the contract while the cockpit shows the lines total,
  // Marin gets a $1.05M contract autofilled while the budget page says
  // $914K. We prefer the real total when it's > 0, fall back to AI midpoint,
  // and show the user both numbers so they can choose.
  const [budgetTotalFromLines, setBudgetTotalFromLines] = useState<number | null>(null);
  const [aiMidpoint, setAiMidpoint] = useState<number | null>(null);
  useEffect(() => {
    if (!project) return;
    const summaryKey = project.ai_summary ?? project.raw_input ?? '';
    if (lastAutofilledSummaryRef.current === summaryKey) return;
    setContractsState((prev: ContractsState) => {
      const f: Record<string, string> = { ...(prev.fields ?? {}) };
      let changed = false;
      const seed = (key: string, val: string | number | null | undefined): void => {
        if (val === null || val === undefined || val === '') return;
        const existing: string | undefined = f[key];
        // Skip only when the user (or a prior fill) put real content here.
        // Empty string / whitespace → autofill is welcome to write.
        if (existing && existing.trim().length > 0) return;
        f[key] = String(val);
        changed = true;
      };
      seed('projectName', project.name);
      const low = project.estimated_cost_low;
      const high = project.estimated_cost_high;
      let mid: number | null = null;
      if (typeof low === 'number' && typeof high === 'number' && high > 0) {
        mid = Math.round((low + high) / 2);
        setAiMidpoint(mid);
      }
      // Provisional seed using AI midpoint so the field isn't blank while we
      // wait for /api/v1/budget. The budget-fetch effect below will overwrite
      // this (but only this) value when the lines total comes back > 0.
      if (mid !== null) {
        seed('contractAmount', `$${mid.toLocaleString()}`);
      }
      // Sarah-GC reported (2026-05-22) that the autofill Scope of Work
      // included literal AI prose like "Alright, here's how I'd read it:"
      // and trailing "Here's where I'd start:". That voice comes from the
      // foreman-orientation prompt in /api/v1/projects/summarize — fine for
      // the project shell, not fine on a signed contract. We sanitize at the
      // boundary: AI text → contract field. raw_input is user-typed and
      // does NOT go through the sanitizer.
      const summary = project.ai_summary
        ? sanitizeAiText(project.ai_summary, 'contract-prose')
        : project.raw_input;
      if (summary) seed('scopeOfWork', summary);
      return changed ? { ...prev, fields: f } : prev;
    });
    lastAutofilledSummaryRef.current = summaryKey;
  }, [project, setContractsState]);

  // 2026-05-22 (BUDGET+SEC2 fix): fetch the project's budget total from
  // /api/v1/budget (the project_budget_lines source of truth that the
  // cockpit BudgetSnapshot reads). When totalBudget > 0 AND the field
  // currently holds the AI midpoint we just seeded (i.e. the user hasn't
  // typed over it), upgrade contractAmount to the real total so all three
  // surfaces (cockpit, /killerapp/budget HeroStrip, contract autofill)
  // agree on the same number.
  useEffect(() => {
    if (!spineProjectId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(
          `/api/v1/budget?project_id=${encodeURIComponent(spineProjectId)}`,
          { headers },
        );
        if (cancelled) return;
        // 404 = no budget yet → leave AI midpoint in place.
        if (!res.ok) return;
        const json = (await res.json()) as { summary?: { totalBudget?: number } };
        const total = json.summary?.totalBudget;
        if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0) return;
        if (cancelled) return;
        setBudgetTotalFromLines(total);
        const formatted = `$${Math.round(total).toLocaleString()}`;
        setContractsState((prev: ContractsState) => {
          const f: Record<string, string> = { ...(prev.fields ?? {}) };
          const existing = (f.contractAmount ?? '').trim();
          // Only upgrade if the field is empty OR still holds the AI midpoint
          // we seeded a moment ago. Never clobber a user-typed value.
          const aiSeed = aiMidpoint !== null ? `$${aiMidpoint.toLocaleString()}` : null;
          if (existing && aiSeed && existing !== aiSeed) return prev;
          if (existing === formatted) return prev;
          f.contractAmount = formatted;
          return { ...prev, fields: f };
        });
      } catch {
        // Network/auth failure — leave AI midpoint in place. Not fatal.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spineProjectId, aiMidpoint, setContractsState]);

  // Saved indicator string.
  const savedLabel = saving
    ? 'Saving…'
    : lastSavedAt
      ? `Saved · ${new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : null;

  // Merge field definitions across the selected templates — dedupe by key
  // (prefer the first definition encountered so common fields get their
  // canonical label). Shows only fields actually needed right now.
  const requiredFields = useMemo(() => {
    const seen = new Map<string, ContractField>();
    for (const t of templates) {
      if (!selected.has(t.id)) continue;
      for (const f of t.fields) {
        if (!seen.has(f.key)) seen.set(f.key, f);
      }
    }
    return Array.from(seen.values());
  }, [selected, templates]);

  const missingRequired = useMemo(() => {
    return requiredFields
      .filter((f) => f.required && !fields[f.key]?.trim())
      .map((f) => f.key);
  }, [requiredFields, fields]);

  const canGenerate = selected.size > 0 && missingRequired.length === 0;

  const toggleTemplate = (id: string) => {
    setContractsState((prev) => {
      const ids = new Set(prev.selectedIds ?? []);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ...prev, selectedIds: Array.from(ids) };
    });
  };

  const updateField = (key: string, value: string) => {
    setContractsState((prev) => ({
      ...prev,
      fields: { ...(prev.fields ?? {}), [key]: value },
    }));
  };

  const handleGenerate = () => {
    if (!canGenerate || generating) return;
    setGenerating(true);
    const generated: string[] = [];
    try {
      for (const template of templates) {
        if (!selected.has(template.id)) continue;
        const body = bodies[template.id];
        if (!body) {
          console.error(`Missing body for template ${template.id}`);
          continue;
        }
        const filled = fillTemplate(body, fields);
        downloadContractPdf({
          templateName: template.name,
          body: filled,
          draft: true,
        });
        generated.push(template.name);
      }
      setLastGenerated(generated);
    } finally {
      setGenerating(false);
    }
  };

  // JourneyMapHeader is mounted globally in src/app/killerapp/layout.tsx
  // since W4.1b; no longer rendered per workflow. `stages` prop still
  // accepted for back-compat but unused here.
  void stages;

  return (
    <>
      <div style={{ paddingTop: spacing[6] }}>
        <ProjectContextBanner project={project} selfWorkflow="contract-templates" />
      </div>
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: `${spacing[8]} ${spacing[4]}`,
          fontFamily: fonts.body,
        }}
      >
        {savedLabel && (
          <div
            aria-live="polite"
            style={{
              textAlign: 'right',
              marginBottom: spacing[2],
              fontSize: fontSizes.xs,
              color: colors.ink[500],
              fontFamily: fonts.body,
            }}
            data-testid="contract-templates-saved-indicator"
          >
            {savedLabel}
          </div>
        )}
        {/* Breadcrumb + Pro Toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing[6],
          }}
        >
          <nav style={{ fontSize: fontSizes.sm, color: colors.ink[500] }}>
            <Link
              href="/killerapp"
              style={{ color: colors.ink[500], textDecoration: 'none' }}
            >
              Killer App
            </Link>
            <span style={{ margin: `0 ${spacing[2]}` }}>/</span>
            <span>Workflows</span>
            <span style={{ margin: `0 ${spacing[2]}` }}>/</span>
            <span
              style={{
                color: colors.ink[900],
                fontWeight: fontWeights.medium,
              }}
            >
              Contract Templates
            </span>
          </nav>

          <button
            type="button"
            onClick={() => setProMode((p) => !p)}
            aria-pressed={proMode}
            style={{
              padding: `${spacing[2]} ${spacing[3]}`,
              fontSize: fontSizes.xs,
              fontWeight: fontWeights.semibold,
              fontFamily: fonts.mono,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              border: `1px solid ${proMode ? 'var(--brass)' : colors.ink[200]}`,
              backgroundColor: proMode ? 'var(--brass)' : 'transparent',
              color: proMode ? 'var(--trace)' : colors.ink[700],
              borderRadius: radii.full,
              cursor: 'pointer',
              transition: '150ms ease',
            }}
          >
            {proMode ? 'Pro: On' : 'Pro: Off'}
          </button>
        </div>

        {/* DRAFT disclaimer — read before signing */}
        <DraftDisclaimer />

        {/* CONTRACT-PICKER (2026-05-22): top-of-page picker */}
        <ContractPicker
          activeTemplate={activeTemplate}
          query={pickerQuery}
          onQueryChange={setPickerQuery}
          filteredGroups={filteredGroups}
          onPick={handlePickTemplate}
          totalTemplates={templates.length}
        />

        {/* Step 1: Pick templates */}
        <StepHeading n={1} total={3} title="Pick the contracts you need" />
        <p
          style={{
            fontSize: fontSizes.sm,
            color: colors.ink[600],
            margin: `${spacing[2]} 0 ${spacing[4]}`,
          }}
        >
          Select as many as you like. We&rsquo;ll ask for the fields each one
          needs in Step&nbsp;2.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: spacing[3],
            marginBottom: spacing[8],
          }}
        >
          {templates.map((t) => {
            const active = selected.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTemplate(t.id)}
                aria-pressed={active}
                style={{
                  padding: spacing[4],
                  border: `${borders.thin} ${active ? 'var(--brass)' : colors.ink[200]}`,
                  borderRadius: radii.lg,
                  backgroundColor: active ? 'var(--trace)' : colors.paper.white,
                  cursor: 'pointer',
                  transition: `all ${transitions.base}`,
                  textAlign: 'left',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: spacing[3],
                    right: spacing[3],
                    width: 18,
                    height: 18,
                    borderRadius: radii.sm,
                    border: `1.5px solid ${active ? 'var(--brass)' : colors.ink[300]}`,
                    backgroundColor: active ? 'var(--brass)' : 'transparent',
                    color: 'var(--trace)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: fontSizes.xs,
                    fontWeight: fontWeights.bold,
                  }}
                  aria-hidden
                >
                  {active ? '✓' : ''}
                </div>
                <div style={{ fontSize: '26px', marginBottom: spacing[2] }}>
                  {t.icon}
                </div>
                <div
                  style={{
                    fontWeight: fontWeights.semibold,
                    color: colors.ink[900],
                    fontSize: fontSizes.sm,
                    marginBottom: spacing[1],
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    color: colors.ink[500],
                    fontSize: fontSizes.xs,
                    lineHeight: 1.4,
                  }}
                >
                  {t.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Step 2: Fields */}
        <StepHeading
          n={2}
          total={3}
          title={
            selected.size === 0
              ? 'Pick at least one contract above'
              : 'Fill in the details'
          }
        />
        {selected.size > 0 && (
          <>
            <p
              style={{
                fontSize: fontSizes.sm,
                color: colors.ink[600],
                margin: `${spacing[2]} 0 ${spacing[4]}`,
              }}
            >
              Fields required by the{' '}
              {selected.size === 1 ? 'template' : 'templates'} you picked.
              Leave anything blank — it'll show as a [bracketed] placeholder so you can fill it in later.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: spacing[4],
                marginBottom: spacing[8],
              }}
            >
              {requiredFields.map((f) => {
                // BUDGET+SEC2 2026-05-22: show the two competing numbers on
                // the contractAmount field so the user picks deliberately
                // instead of trusting whichever one autofilled.
                let extraHint: string | null = null;
                if (f.key === 'contractAmount') {
                  const lineTotal = budgetTotalFromLines;
                  const ai = aiMidpoint;
                  const parts: string[] = [];
                  if (lineTotal !== null && lineTotal > 0) {
                    parts.push(
                      `Budget total: $${Math.round(lineTotal).toLocaleString()} (from line items)`,
                    );
                  }
                  if (ai !== null && (lineTotal === null || ai !== Math.round(lineTotal))) {
                    parts.push(`AI midpoint: $${ai.toLocaleString()}`);
                  }
                  extraHint = parts.length > 0 ? parts.join(' · ') : null;
                }
                return (
                  <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                    <FieldInput
                      field={f}
                      value={fields[f.key] ?? ''}
                      onChange={(v) => updateField(f.key, v)}
                      extraHint={extraHint}
                    />
                    {f.key === 'contractAmount' && project && (
                      // COCKPIT-FIXES Pain 1 (2026-05-22): live $/sf
                      // derived from project.estimated_cost_low/high ÷ sqft,
                      // surfaced next to the contract dollar amount so the
                      // GC has the per-square-foot context the AI summary
                      // used to (incorrectly) bake into prose.
                      <CostPerSquareFootBadge
                        costLow={project.estimated_cost_low ?? null}
                        costHigh={project.estimated_cost_high ?? null}
                        sqft={project.sqft ?? null}
                        style={{ alignSelf: 'flex-start' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Step 3: Generate */}
        <StepHeading n={3} total={3} title="Generate your drafts" />
        <p
          style={{
            fontSize: fontSizes.sm,
            color: colors.ink[600],
            margin: `${spacing[2]} 0 ${spacing[4]}`,
          }}
        >
          One PDF per contract, each stamped with a diagonal DRAFT watermark
          and the attorney-review disclaimer on every page.
        </p>

        {missingRequired.length > 0 && (
          <div
            style={{
              padding: spacing[3],
              marginBottom: spacing[4],
              borderRadius: radii.md,
              backgroundColor: '#FEF3C7',
              border: `1px solid #FDE68A`,
              fontSize: fontSizes.sm,
              color: '#92400E',
            }}
          >
            Still need: {missingRequired.map(humanize).join(', ')}.
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          style={{
            padding: `${spacing[3]} ${spacing[6]}`,
            fontSize: fontSizes.sm,
            fontWeight: fontWeights.semibold,
            fontFamily: fonts.body,
            color: 'var(--trace)',
            backgroundColor: canGenerate && !generating ? 'var(--brass)' : colors.ink[300],
            border: 'none',
            borderRadius: radii.md,
            cursor: canGenerate && !generating ? 'pointer' : 'not-allowed',
            transition: `background-color ${transitions.base}`,
          }}
        >
          {generating
            ? 'Putting them together…'
            : selected.size === 0
              ? 'Get your drafts'
              : `Get your draft${selected.size === 1 ? '' : 's'} (PDF)`}
        </button>

        {lastGenerated.length > 0 && (
          <div
            style={{
              marginTop: spacing[6],
              padding: spacing[4],
              borderRadius: radii.md,
              backgroundColor: 'var(--trace)',
              border: `1px solid var(--faded-rule)`,
              fontSize: fontSizes.sm,
              color: colors.ink[700],
            }}
          >
            <strong>Downloaded:</strong>{' '}
            {lastGenerated.join(' · ')}. Check your Downloads folder. Send
            these to your construction attorney for state-specific review
            before you sign or ask anyone else to sign.
          </div>
        )}

        {/* Pro-mode only: raw template preview. */}
        {proMode && selected.size > 0 && (
          <details
            style={{
              marginTop: spacing[8],
              padding: spacing[4],
              borderRadius: radii.md,
              backgroundColor: colors.ink[50],
              fontSize: fontSizes.xs,
              fontFamily: fonts.mono,
              color: colors.ink[700],
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: fontWeights.semibold,
                marginBottom: spacing[2],
              }}
            >
              Pro: inspect filled template bodies
            </summary>
            {templates
              .filter((t) => selected.has(t.id))
              .map((t) => (
                <pre
                  key={t.id}
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    marginTop: spacing[4],
                    padding: spacing[3],
                    backgroundColor: colors.paper.white,
                    borderRadius: radii.sm,
                    border: `1px solid ${colors.ink[200]}`,
                  }}
                >
                  <strong>{t.name}</strong>
                  {'\n\n'}
                  {fillTemplate(bodies[t.id] ?? '', fields)}
                </pre>
              ))}
          </details>
        )}
      </div>
      <AttachmentSection
        projectId={spineProjectId}
        workflowId="q4"
        stepId="upload-signed-contract"
        title="Upload signed contract"
        subtitle="Drop the executed contract PDF here once everyone has signed. Keeps the paper trail tied to the project."
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepHeading({ n, total, title }: { n: number; total: number; title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: spacing[3],
        marginTop: spacing[6],
      }}
    >
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          color: colors.ink[500],
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Step {n} / {total}
      </span>
      <h2
        style={{
          fontFamily: fonts.display ?? fonts.body,
          fontSize: fontSizes.xl,
          fontWeight: fontWeights.semibold,
          color: colors.ink[900],
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

/**
 * Top-of-page contract picker.
 *
 * Two controls:
 *   1. Free-text search box — case-insensitive substring filter against the
 *      template name + desc + whenToUse + id. Filters the dropdown below it.
 *   2. Category-grouped <select> dropdown listing every (filtered) template.
 *
 * Selecting from the dropdown calls `onPick(id)`, which the parent uses to
 * update the URL `?template=` param AND mirror the choice into
 * `contracts_state.selectedIds` so the existing Step-1 cards / Step-2
 * field-merge / Step-3 PDF generation flow targets the new template.
 *
 * The picker is ADDITIVE — the multi-select cards below still work for
 * generating multiple contracts in one go.
 */
function ContractPicker({
  activeTemplate,
  query,
  onQueryChange,
  filteredGroups,
  onPick,
  totalTemplates,
}: {
  activeTemplate: ContractTemplateMeta | undefined;
  query: string;
  onQueryChange: (q: string) => void;
  filteredGroups: Array<{
    id: string;
    label: string;
    templates: ContractTemplateMeta[];
  }>;
  onPick: (id: string) => void;
  totalTemplates: number;
}) {
  const filteredCount = filteredGroups.reduce((n, g) => n + g.templates.length, 0);
  const noMatches = query.trim().length > 0 && filteredCount === 0;

  return (
    <section
      aria-label="Pick a contract"
      style={{
        padding: spacing[5],
        marginBottom: spacing[6],
        borderRadius: radii.lg,
        border: `${borders.thin} ${colors.ink[200]}`,
        backgroundColor: colors.paper.white,
      }}
    >
      <label
        htmlFor="contract-picker-query"
        style={{
          display: 'block',
          fontFamily: fonts.display ?? fonts.body,
          fontSize: fontSizes.lg,
          fontWeight: fontWeights.semibold,
          color: colors.ink[900],
          marginBottom: spacing[2],
        }}
      >
        What kind of contract do you need?
      </label>
      <input
        id="contract-picker-query"
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search for a contract type — e.g., &quot;hiring a sub&quot;, &quot;California&quot;, &quot;architect&quot;…"
        aria-describedby="contract-picker-help"
        data-testid="contract-picker-query"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: spacing[3],
          fontSize: fontSizes.sm,
          fontFamily: fonts.body,
          border: `1px solid ${colors.ink[300]}`,
          borderRadius: radii.sm,
          backgroundColor: 'var(--trace)',
          color: colors.ink[900],
        }}
      />
      <div
        id="contract-picker-help"
        style={{
          fontSize: fontSizes.xs,
          color: colors.ink[500],
          marginTop: spacing[1],
          marginBottom: spacing[4],
        }}
      >
        {query.trim().length === 0
          ? `${totalTemplates} templates available — filter by typing above.`
          : noMatches
            ? 'No matches. Try a broader word like "sub", "lien", or "California".'
            : `${filteredCount} of ${totalTemplates} templates match.`}
      </div>

      <label
        htmlFor="contract-picker-select"
        style={{
          display: 'block',
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          color: colors.ink[600],
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: spacing[1],
        }}
      >
        Or pick from the list
      </label>
      <select
        id="contract-picker-select"
        value={activeTemplate?.id ?? ''}
        onChange={(e) => {
          const id = e.target.value;
          if (id) onPick(id);
        }}
        data-testid="contract-picker-select"
        disabled={noMatches}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: spacing[3],
          fontSize: fontSizes.sm,
          fontFamily: fonts.body,
          border: `1px solid ${colors.ink[300]}`,
          borderRadius: radii.sm,
          backgroundColor: 'var(--trace)',
          color: colors.ink[900],
          cursor: noMatches ? 'not-allowed' : 'pointer',
        }}
      >
        {filteredGroups.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {group.templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {activeTemplate && (
        <div
          role="note"
          aria-label="Why this contract"
          title={activeTemplate.whenToUse}
          style={{
            marginTop: spacing[3],
            padding: spacing[3],
            borderRadius: radii.sm,
            backgroundColor: 'var(--trace)',
            border: `1px solid var(--faded-rule, ${colors.ink[100]})`,
            fontSize: fontSizes.xs,
            color: colors.ink[700],
            lineHeight: 1.5,
          }}
        >
          <strong
            style={{
              fontSize: fontSizes.xs,
              fontWeight: fontWeights.semibold,
              color: colors.ink[900],
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginRight: spacing[2],
            }}
          >
            Why this contract?
          </strong>
          {activeTemplate.whenToUse}
        </div>
      )}
    </section>
  );
}

function DraftDisclaimer() {
  return (
    <div
      role="note"
      style={{
        padding: spacing[4],
        marginBottom: spacing[6],
        borderRadius: radii.md,
        backgroundColor: '#FEF3C7',
        border: `1px solid #FCD34D`,
        fontSize: fontSizes.sm,
        color: '#78350F',
      }}
    >
      <div
        style={{
          fontWeight: fontWeights.bold,
          marginBottom: spacing[2],
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: fontSizes.xs,
        }}
      >
        ⚠ Read before using these drafts
      </div>
      <p style={{ margin: 0, lineHeight: 1.5 }}>
        These are <strong>starter drafts</strong>, not finished contracts.
        Every document generated here is watermarked <strong>DRAFT</strong> and
        must be reviewed by a <strong>licensed construction attorney in your
        state</strong> before you sign or ask anyone else to sign.
        Lien&nbsp;waiver law, deposit caps, indemnity limits, and change-order
        procedures vary by state — generic forms can be unenforceable or
        wrong. Builder&rsquo;s Knowledge Garden is not your attorney and does
        not provide legal advice.
      </p>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  extraHint,
}: {
  field: ContractField;
  value: string;
  onChange: (v: string) => void;
  extraHint?: string | null;
}) {
  const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1],
  };
  const spanStyle: React.CSSProperties = {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.ink[600],
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
  const inputStyle: React.CSSProperties = {
    padding: spacing[2],
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    border: `1px solid ${colors.ink[200]}`,
    borderRadius: radii.sm,
    backgroundColor: 'var(--trace)',
    color: colors.ink[900],
    width: '100%',
    boxSizing: 'border-box',
  };

  const hint = field.hint ? (
    <span style={{ fontSize: fontSizes.xs, color: colors.ink[500] }}>
      {field.hint}
    </span>
  ) : null;
  const budgetHint = extraHint ? (
    <span
      style={{
        fontSize: fontSizes.xs,
        color: colors.ink[600],
        fontWeight: fontWeights.medium,
      }}
    >
      {extraHint}
    </span>
  ) : null;

  if (field.type === 'textarea') {
    return (
      <label style={labelStyle}>
        <span style={spanStyle}>
          {field.label}
          {field.required ? ' *' : ''}
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          style={{ ...inputStyle, fontFamily: fonts.body, resize: 'vertical' }}
        />
        {budgetHint}
        {hint}
      </label>
    );
  }

  const htmlType =
    field.type === 'date'
      ? 'date'
      : field.type === 'number' || field.type === 'currency'
        ? 'text' // keep currency as text so users can type $ and ,
        : 'text';

  return (
    <label style={labelStyle}>
      <span style={spanStyle}>
        {field.label}
        {field.required ? ' *' : ''}
      </span>
      <input
        type={htmlType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        style={inputStyle}
      />
      {budgetHint}
      {hint}
    </label>
  );
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
