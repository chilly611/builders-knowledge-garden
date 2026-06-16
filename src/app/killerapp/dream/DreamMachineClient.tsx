'use client';

/**
 * DreamMachineClient — the Dream Machine surface (component-fidelity spec §C).
 * ==========================================================================
 *
 * Mounts on the shared App Shell (which renders the project header / journey /
 * budget / Ask-the-garden FAB above this content), so this file owns only the
 * two project-scoped pieces the surface adds:
 *
 *   C1  header        — "Imagine the next move." over the active project
 *   §C2 "In motion"   — three staged line-and-wash exploration cards
 *                       (massing / clearance / daylight), per project, with an
 *                       honest concept-sketch fallback when a project has none
 *   "Choose your direction" — three pickable architectural styles for a
 *                       style-less project; once picked, the chosen direction
 *                       replaces the picker (persisted; see useArchitecturalStyle)
 *
 * DATA: 100% from useStageProject() — switching ?project= flips identity and the
 * exploration set with no bleed; ZERO hardcoded project names. Type stack scoped
 * to `.dream-root` (Archivo · Archivo Black · Space Mono · Cormorant Garamond),
 * mirroring the Builder lane's `.bld-root` — minimal blast radius.
 */

import { useState } from 'react';
import { useStageProject } from '@/lib/hooks/useStageProject';
import { useArchitecturalStyle } from '@/lib/dream/useArchitecturalStyle';
import {
  explorationStudiesFor,
  studyFallbackSrc,
  STYLE_OPTIONS,
  styleOptionBySlug,
  type ExplorationStudy,
  type StyleOption,
} from '@/lib/dream/exploration-assets';
import './dream-machine.css';

/* ── §C2 · One "In motion" exploration card ──────────────────────────────── */
function StudyCard({
  projectId,
  study,
}: {
  projectId: string | null;
  study: ExplorationStudy;
}) {
  // Degrade a 404'd staged render to the guaranteed concept sketch.
  const [src, setSrc] = useState(study.src);
  return (
    <a className="dream-card" href={src} target="_blank" rel="noopener noreferrer">
      <div className="dream-card-art">
        {/* eslint-disable-next-line @next/next/no-img-element -- staged render is a
            public Supabase URL with a data-URI concept fallback; next/image can't
            serve the data-URI fallback, and the art is decorative (titled below). */}
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setSrc(studyFallbackSrc(projectId, study.key, study.title))}
        />
        {!study.staged && <span className="dream-card-flag">CONCEPT</span>}
      </div>
      <div className="dream-card-body">
        <div className="eng-label">{study.tag}</div>
        <h3 className="dream-card-title">{study.title}</h3>
        <p className="dream-card-text">{study.body}</p>
        <span className="dream-card-action">{study.action} →</span>
      </div>
    </a>
  );
}

/* ── "Choose your direction" · one pickable style card ───────────────────── */
function StyleCard({
  opt,
  selected,
  onPick,
}: {
  opt: StyleOption;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <div className={`dream-style${selected ? ' is-selected' : ''}`}>
      <div className="dream-style-art">
        {/* eslint-disable-next-line @next/next/no-img-element -- public Supabase
            bucket URL; kept as <img> to match the lane's portal-imagery pattern. */}
        <img src={opt.src} alt={opt.label} loading="lazy" />
      </div>
      <div className="dream-style-body">
        <h3 className="dream-style-title">{opt.label}</h3>
        <p className="dream-style-tagline">{opt.tagline}</p>
        <button type="button" className="dream-pick" onClick={onPick} aria-pressed={selected}>
          {selected ? 'Chosen ✓' : 'Choose this'}
        </button>
      </div>
    </div>
  );
}

export default function DreamMachineClient() {
  const sp = useStageProject();
  const style = useArchitecturalStyle(sp.projectId);
  const [editing, setEditing] = useState(false);

  // Honest empties for a non-canonical project still loading / not found.
  if (sp.loading) {
    return (
      <div className="dream-root">
        <div className="dream-state">Loading the dream view…</div>
      </div>
    );
  }
  if (sp.notFound) {
    return (
      <div className="dream-root">
        <div className="dream-state dream-state--empty">
          <div className="eng-label">Dream Machine</div>
          <h1>We couldn&apos;t find that project</h1>
          <p>It may have moved, or you may not have access yet. Pick a project to imagine its next move.</p>
        </div>
      </div>
    );
  }

  const studies = explorationStudiesFor(sp.projectId);
  const chosenOption = styleOptionBySlug(style.chosen);
  const showPicker = !chosenOption || editing;

  return (
    <div className="dream-root" data-project-id={sp.projectId}>
      <main className="dream">
        {/* ── C1 · Prompt header ───────────────────────────────────────────── */}
        <header className="dream-hero">
          <div className="eng-label dream-hero-eyebrow">Dream Machine · What-if</div>
          <h1 className="dream-hero-title">Imagine the next move.</h1>
          <p className="dream-hero-sub">
            {sp.projectName} — the dream view
            {sp.projectMeta ? ` · ${sp.projectMeta}` : ''}
          </p>
        </header>

        {/* ── Choose your direction ────────────────────────────────────────── */}
        <section className="dream-section">
          <div className="dream-section-head">
            <h2>Choose your direction</h2>
            <span className="eng-label">
              {chosenOption && !editing ? 'Your direction' : 'Pick a style'}
            </span>
          </div>

          {showPicker ? (
            <>
              <p className="dream-lede">
                Pick the architectural language for <strong>{sp.projectName}</strong>. You can
                change it any time — it sets the register for the explorations below.
              </p>
              <div className="dream-styles">
                {STYLE_OPTIONS.map((opt) => (
                  <StyleCard
                    key={opt.slug}
                    opt={opt}
                    selected={style.chosen === opt.slug}
                    onPick={() => {
                      style.choose(opt.slug);
                      setEditing(false);
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="dream-chosen">
              <div className="dream-chosen-art" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- public bucket URL */}
                <img src={chosenOption!.src} alt="" />
                <div className="dream-chosen-wash" />
              </div>
              <div className="dream-chosen-text">
                <div className="eng-label">Your direction{style.saving ? ' · saving…' : ''}</div>
                <h3 className="dream-chosen-title">{chosenOption!.label}</h3>
                <p className="dream-chosen-tagline">{chosenOption!.tagline}</p>
                <button type="button" className="dream-textbtn" onClick={() => setEditing(true)}>
                  Change direction
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── §C2 · In motion ──────────────────────────────────────────────── */}
        <section className="dream-section">
          <div className="dream-section-head">
            <h2>In motion</h2>
            <span className="eng-label">3 explorations · this week</span>
          </div>
          <div className="dream-studies">
            {studies.map((s) => (
              <StudyCard key={`${sp.projectId}:${s.key}`} projectId={sp.projectId} study={s} />
            ))}
          </div>
          {!studies[0]?.staged && (
            <p className="dream-note">
              Concept sketches for now — {sp.projectName}&apos;s explorations render as you work the design.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
