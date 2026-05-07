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

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
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
import { fillTemplate } from '@/lib/contract-templates';
import { downloadContractPdf } from '@/lib/pdf/contract-pdf';
import { useProjectStateBlob } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';
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
              {requiredFields.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={fields[f.key] ?? ''}
                  onChange={(v) => updateField(f.key, v)}
                />
              ))}
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
            One more thing: {missingRequired.map(humanize).join(', ')}. Then you're ready.
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
}: {
  field: ContractField;
  value: string;
  onChange: (v: string) => void;
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
