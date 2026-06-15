'use client';

/**
 * ProjectDashboardClient — the KILLER APP BUILDER LANE home (Section B).
 * ======================================================================
 *
 * The GC's project home, rebuilt to the design-system kit's herbarium fidelity
 * (replacing the prior demo-only ProjectCompass stub, which rendered "Project
 * not found" for every non-`demo-project` id — including the canonical Marin
 * UUID). Composes the shared Section-A primitives:
 *
 *   B1 greeting          — time-of-day + project + live stage/progress
 *   B2 cinematic hero     — surface plate band (placeholder asset; teal × rust)
 *   B3 instrument gauges  — Schedule · Budget · Quality (the signature row)
 *   B4 field-log plates   — SpecimenPlate grid
 *   B5 recall card        — "what changed since you left"
 *   B6 workflow entries   — WorkflowEntryCard grid (real live routes)
 *
 * DATA: 100% from useStageProject() (#18) for identity + budget, and the shell
 * ledger (useShellConfig) for live stage/progress. ZERO hard-coded project
 * data — switching ?project= flips every dimension. Metrics with no real
 * source yet (schedule variance, quality, field log, recall) render an honest
 * "no data" state — NEVER a fabricated reading (Decision 19/21).
 *
 * Type stack scoped to `.bld-root` (Archivo · Archivo Black · Space Mono ·
 * Cormorant Garamond), mirroring the Owner lane's `.ov-root` — minimal blast
 * radius, no global token churn.
 */

import Image from 'next/image';
import { useStageProject } from '@/lib/hooks/useStageProject';
import { useShellConfig } from '@/components/app-shell/ShellConfigContext';
import { KAC_STAGES } from '@/components/killerapp-chrome/types';
import { fmtMoney, laneLabel } from '@/components/app-shell/config';
import {
  InstrumentGauge,
  SpecimenPlate,
  WorkflowEntryCard,
} from '@/design-system/components';
import type { GaugeTone, WorkflowTone } from '@/design-system/components';
import './builder-lane.css';

// Placeholder cinematic plate until the Cowork-staged hero asset lands. The
// brand surface plate (not generated content) — swap for the staged render.
const HERO_PLATE = '/plates/chrome-killer-app.png';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

interface ProjectDashboardClientProps {
  projectId: string;
}

export default function ProjectDashboardClient({ projectId }: ProjectDashboardClientProps) {
  const sp = useStageProject();
  const cfg = useShellConfig();

  // ── Live stage / progress (from the real ledger; reconciles to canonical
  //    Marin — Build · 42%). useStageProject carries identity + budget; the
  //    shell journey carries stage + percent.
  const activeSlug = cfg.journey?.activeStage || '';
  const activeStage = KAC_STAGES.find((s) => s.slug === activeSlug);
  const pct = Math.round(cfg.journey?.pct ?? 0);
  const hasJourney = !!cfg.journey?.show && !!activeStage;

  // ── B3 BUDGET gauge — the one gauge with a real source (spent / total). ──
  const total = sp.budgetTotal;
  const spent = sp.budgetSpent ?? 0;
  const hasBudget = typeof total === 'number' && total > 0;
  const spentRatio = hasBudget ? clamp01(spent / total) : 0;
  const budgetTone: GaugeTone = !hasBudget
    ? 'none'
    : spentRatio >= 0.95
      ? 'risk'
      : spentRatio >= 0.7
        ? 'watch'
        : 'good';

  // ── B6 workflow entries — real live routes; preserve project context. ──
  const withProject = (href: string) =>
    sp.projectId ? `${href}?project=${encodeURIComponent(sp.projectId)}` : href;
  const workflows: Array<{
    title: string;
    blurb: string;
    verb: string;
    phase: string;
    tone: WorkflowTone;
    href: string;
  }> = [
    { title: 'Run an estimate', blurb: 'Size up scope and price the work.', verb: 'Open', phase: 'size up', tone: 'teal', href: withProject('/killerapp/workflows/estimating') },
    { title: "Today's field log", blurb: 'Log what happened on site — photos, notes, weather.', verb: 'Open', phase: 'build', tone: 'sage', href: withProject('/killerapp/workflows/daily-log') },
    { title: 'Sequence the job', blurb: 'Order the trades and lay out the schedule.', verb: 'Open', phase: 'plan', tone: 'amber', href: withProject('/killerapp/workflows/job-sequencing') },
    { title: 'Open the budget', blurb: 'See spend, commitments, and what is left.', verb: 'Open', phase: 'build', tone: 'brass', href: withProject('/killerapp/budget') },
  ];

  // ── Honest empties for non-canonical projects still loading / not found. ──
  if (sp.loading) {
    return (
      <div className="bld-root">
        <div className="bld-state">Loading your build…</div>
      </div>
    );
  }
  if (sp.notFound) {
    return (
      <div className="bld-root">
        <div className="bld-state bld-state--empty">
          <div className="eng-label">Builder lane</div>
          <h1>We couldn&apos;t find that project</h1>
          <p>It may have moved, or you may not have access yet. Pick a project to get back to work.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bld-root" data-project-id={projectId}>
      <main className="bld">
        {/* ── B2 · Cinematic hero band ─────────────────────────────────── */}
        <header className="bld-hero">
          <div className="bld-hero-art" aria-hidden="true">
            <Image
              src={HERO_PLATE}
              alt=""
              fill
              sizes="(max-width: 1000px) 100vw, 900px"
              style={{ objectFit: 'cover', opacity: 0.9, mixBlendMode: 'multiply' }}
              priority={false}
            />
            <div className="bld-hero-wash" />
          </div>
          <div className="bld-hero-text">
            <div className="eng-label bld-hero-eyebrow">
              Builder lane · {laneLabel(sp.lane)}
            </div>
            <h1 className="bld-hero-title">{sp.projectName}</h1>
            {sp.projectMeta && <div className="bld-hero-sub">{sp.projectMeta}</div>}
          </div>
        </header>

        {/* ── B1 · Greeting ─────────────────────────────────────────────── */}
        <section className="bld-greet">
          <p className="bld-greet-line">
            Welcome back.{' '}
            {hasJourney ? (
              <>
                <strong>{sp.projectName}</strong> is in{' '}
                <span className="bld-greet-stage">{activeStage!.short}</span> — {pct}% of the way through.
              </>
            ) : (
              <>Here&apos;s where <strong>{sp.projectName}</strong> stands today.</>
            )}
          </p>
          {sp.clientName && (
            <p className="bld-greet-sub">For {sp.clientName}.</p>
          )}
        </section>

        {/* ── B3 · Instrument gauges (the signature row) ───────────────── */}
        <section className="bld-section">
          <div className="bld-section-head">
            <h2>The instruments</h2>
            <span className="eng-label">Live read</span>
          </div>
          <div className="bld-gauges">
            {/* Schedule — no honest variance source yet (Decision 19/21). */}
            <div className="bld-gauge-cell">
              <InstrumentGauge
                label="Schedule"
                tone="none"
                caption="No schedule data yet"
              />
            </div>
            {/* Budget — real: spent of total, from useStageProject. */}
            <div className="bld-gauge-cell">
              <InstrumentGauge
                label="Budget"
                tone={budgetTone}
                value={spentRatio}
                display={hasBudget ? fmtMoney(spent) : undefined}
                caption={hasBudget ? `spent · ${fmtMoney(total!)} total` : 'No budget set yet'}
              />
            </div>
            {/* Quality — no source anywhere; honest no-data. */}
            <div className="bld-gauge-cell">
              <InstrumentGauge
                label="Quality"
                tone="none"
                caption="No quality data yet"
              />
            </div>
          </div>
        </section>

        {/* ── B6 · Workflow entries ─────────────────────────────────────── */}
        <section className="bld-section">
          <div className="bld-section-head">
            <h2>Pick up the work</h2>
            <span className="eng-label">Next steps</span>
          </div>
          <div className="bld-workflows">
            {workflows.map((w) => (
              <WorkflowEntryCard
                key={w.title}
                title={w.title}
                blurb={w.blurb}
                verb={w.verb}
                phase={w.phase}
                tone={w.tone}
                href={w.href}
              />
            ))}
          </div>
        </section>

        {/* ── B4 · Field-log plates (honest empty — no GC field-log source) ── */}
        <section className="bld-section">
          <div className="bld-section-head">
            <h2>Field log</h2>
            <span className="eng-label">From the site</span>
          </div>
          <div className="bld-fieldlog-empty">
            <SpecimenPlate
              phase="FIELD"
              title="No field entries yet"
              quote="Snap a photo or drop a note from the site — it lands here as a dated plate."
              caption="the log begins with the first day on site"
            />
          </div>
        </section>

        {/* ── B5 · Recall card (honest no-data — no recall source) ───────── */}
        <section className="bld-section">
          <div className="bld-section-head">
            <h2>Recall</h2>
            <span className="eng-label">Since you left</span>
          </div>
          <SpecimenPlate
            phase="RECALL"
            tag="WAITING"
            tagTone="teal"
            title="Nothing to recall yet"
            meta="Your build remembers what changed while you were away."
            quote="Leave and come back — anything that moved since your last visit shows up here."
          />
        </section>
      </main>
    </div>
  );
}
