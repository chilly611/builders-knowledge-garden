'use client';

/**
 * DreamStudioClient — the guided Dream Machine flagship (v2).
 * ==========================================================
 *
 * One surface, one arc — "the Midjourney of architecture" that leads into a
 * plan you can build:
 *
 *   IMAGINE (guided intake)  → a warm, low-jargon question flow → DreamProfile
 *   CONCEPTS (generate)      → real renders from the brief (FLUX /api/v1/render,
 *                              instant concept-sketch fallback so it's never empty)
 *   BLUEPRINT (plan)         → a dimensioned schematic floor plan from the profile
 *                              (floorplan.ts), downloadable as SVG
 *   BUILD (handoff)          → create a real Killer App project from the dream and
 *                              drop you into the cockpit to build it
 *
 * Reuses the proven engine, doesn't re-roll it: `/api/v1/render` +
 * `conceptFallbackFor` (Dream Studio), the projects POST + genesis snapshot
 * (MakeThisRealButton), and the herbarium token system. Mounts on the Killer
 * App shell. Tokens only; reduced-motion honored (see dream-studio.css).
 *
 * Honest scope: BLUEPRINT is a SCHEMATIC (see floorplan.ts) — engineered
 * CAD/DWG/BIM export is a labeled Phase 2.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authedFetch } from '@/lib/authed-fetch';
import { createSnapshot } from '@/lib/time-machine';
import { conceptFallbackFor } from '@/app/dream/design/shared';
import {
  INTAKE,
  buildProfile,
  profileToBrief,
  profileToRenderPrompt,
  type IntakeAnswers,
} from './intake';
import { deriveRoomProgram, floorPlanDataUri } from './floorplan';
import { Lightbox, type LightboxItem } from './Lightbox';
import { IconExpand, IconRefresh, IconDownload, IconClose, IconCheck, StatusRing, DreamOrrery } from './icons';
import './dream-studio.css';

type Phase = 'intake' | 'concepts' | 'blueprint';
const PHASE_STEPS: { key: Phase | 'build'; label: string }[] = [
  { key: 'intake', label: 'Imagine' },
  { key: 'concepts', label: 'Concepts' },
  { key: 'blueprint', label: 'Blueprint' },
  { key: 'build', label: 'Build' },
];

interface Concept {
  id: string;
  label: string;
  src: string;
  kind: 'render' | 'concept';
  pending: boolean;
}

const CONCEPT_LABELS = ['Street view', 'Garden side', 'Golden hour', 'Sketch'];

/** Blueprint-page perspectives: the chosen direction from more angles + interiors. */
const PERSPECTIVES: { key: string; label: string; mod: string }[] = [
  { key: 'aerial', label: 'From above', mod: 'aerial view from directly overhead showing the roof and the site, birds-eye' },
  { key: 'street', label: 'Street side', mod: 'front street elevation, straight-on architectural view' },
  { key: 'rear', label: 'Garden side', mod: 'rear elevation facing the back garden' },
  { key: 'living', label: 'Inside · living', mod: 'interior of the open-plan living room, large windows, natural daylight' },
  { key: 'kitchen', label: 'Inside · kitchen', mod: 'interior of the kitchen with island and cabinetry' },
];

export default function DreamStudioClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intake');
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [freeText, setFreeText] = useState('');
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [views, setViews] = useState<Concept[]>([]); // blueprint-page perspectives
  const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number; kind: 'concepts' | 'views' } | null>(null);
  const genRef = useRef(0);
  const viewsForRef = useRef<string | null>(null); // chosen id the perspectives were generated for

  const profile = useMemo(() => buildProfile(answers), [answers]);
  const q = INTAKE[stepIdx];

  /* ── Render call (reuses the Dream Studio engine; honest fallback) ── */
  const callRender = useCallback(async (prompt: string, count: number): Promise<string[] | null> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch { /* anonymous allowed under a tighter cap */ }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 40000);
      let res: Response;
      try {
        res = await fetch('/api/v1/render', {
          method: 'POST', headers,
          body: JSON.stringify({ prompt, mode: 'concepts', count }),
          signal: controller.signal,
        });
      } finally { clearTimeout(timeout); }
      if (!res.ok) {
        setStatus(res.status === 429
          ? 'Free preview limit reached — sign in to keep generating photoreal renders. Showing concept sketches for now.'
          : 'Showing concept sketches — live renders will retry next time.');
        return null;
      }
      const data = await res.json();
      const urls: string[] = (data.renders || []).map((r: { imageUrl?: string }) => r.imageUrl).filter(Boolean);
      return urls.length ? urls : null;
    } catch {
      setStatus('Showing concept sketches — live renders will retry next time.');
      return null;
    }
  }, []);

  const runConcepts = useCallback((p: ReturnType<typeof buildProfile>) => {
    const prompt = profileToRenderPrompt(p);
    genRef.current += 1;
    const base = genRef.current;
    const placeholders: Concept[] = CONCEPT_LABELS.map((label, i) => ({
      id: `c-${base}-${i}`, label,
      src: conceptFallbackFor(`${prompt}:${label}:${base}`, label),
      kind: 'concept', pending: true,
    }));
    setConcepts(placeholders);
    setChosen(null);
    setStatus(null);
    setRendering(true);
    void (async () => {
      const urls = await callRender(prompt, CONCEPT_LABELS.length);
      setConcepts((prev) => prev.map((c, i) =>
        urls && urls[i] ? { ...c, src: urls[i], kind: 'render', pending: false } : { ...c, pending: false }));
      setRendering(false);
    })();
  }, [callRender]);

  /* ── Perspectives for the Blueprint page: the chosen direction from more
       angles + a couple of interiors. One render per view (parallel), each with
       the same never-empty concept-sketch fallback. ── */
  const runPerspectives = useCallback((p: ReturnType<typeof buildProfile>) => {
    genRef.current += 1;
    const base = genRef.current;
    const placeholders: Concept[] = PERSPECTIVES.map((v, i) => ({
      id: `v-${base}-${i}`, label: v.label,
      src: conceptFallbackFor(`${p.buildingType}:${v.key}:${base}`, v.label),
      kind: 'concept', pending: true,
    }));
    setViews(placeholders);
    PERSPECTIVES.forEach((v, i) => {
      const prompt = `${profileToBrief(p)} ${v.mod}. Architectural photography, golden hour, warm and filmic, no people, no text, no signage.`;
      void callRender(prompt, 1).then((urls) => {
        setViews((prev) => prev.map((x) => x.id === placeholders[i].id
          ? (urls && urls[0] ? { ...x, src: urls[0], kind: 'render', pending: false } : { ...x, pending: false })
          : x));
      });
    });
  }, [callRender]);

  // Generate the perspectives once we reach the blueprint with a chosen look
  // (and re-generate if the chosen concept changes).
  useEffect(() => {
    if (phase === 'blueprint' && chosen && viewsForRef.current !== chosen) {
      viewsForRef.current = chosen;
      runPerspectives(profile);
    }
  }, [phase, chosen, profile, runPerspectives]);

  /* ── Intake navigation ── */
  const answerValue = (id: typeof q.id) => answers[id];

  const pickSingle = useCallback((value: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }) as IntakeAnswers);
  }, [q.id]);

  const toggleMulti = useCallback((value: string) => {
    setAnswers((prev) => {
      const cur = new Set((prev.musthaves as string[]) ?? []);
      if (cur.has(value)) cur.delete(value); else cur.add(value);
      return { ...prev, musthaves: Array.from(cur) };
    });
  }, []);

  const commitFreeText = useCallback(() => {
    const v = freeText.trim();
    if (!v) return;
    setAnswers((prev) => {
      if (q.multi) {
        const cur = new Set((prev.musthaves as string[]) ?? []);
        cur.add(v);
        return { ...prev, musthaves: Array.from(cur) };
      }
      return { ...prev, [q.id]: v } as IntakeAnswers;
    });
    setFreeText('');
  }, [freeText, q]);

  const canAdvance = q.multi
    ? ((answers.musthaves as string[])?.length ?? 0) > 0 || !!freeText.trim()
    : !!answerValue(q.id) || !!freeText.trim() || q.id === 'place'; // place is skippable

  const next = useCallback(() => {
    if (freeText.trim()) commitFreeText();
    if (stepIdx < INTAKE.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      setPhase('concepts');
      // build a fresh profile from the latest answers (+ any just-committed free text)
      setTimeout(() => runConcepts(buildProfile({ ...answers })), 0);
    }
  }, [freeText, commitFreeText, stepIdx, answers, runConcepts]);

  const back = useCallback(() => {
    setFreeText('');
    if (phase === 'concepts') { setPhase('intake'); return; }
    if (phase === 'blueprint') { setPhase('concepts'); return; }
    setStepIdx((i) => Math.max(0, i - 1));
  }, [phase]);

  /* ── Build handoff: create a Killer App project from the dream ── */
  const realize = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const program = deriveRoomProgram(profile);
      const res = await authedFetch('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify({
          raw_input: profileToBrief(profile),
          project_type: profile.buildingType,
          jurisdiction: profile.location ?? null,
          notes: `Dreamed in the Dream Machine. Direction: ${(profile.style ?? profile.vibe ?? 'open').replace(/-/g, ' ')}. Program: ${program.map((r) => r.name).join(', ')}.`,
        }),
      });
      if (res.status === 401) { setSaveError('Sign in to build your dream.'); setSaving(false); return; }
      if (!res.ok) { setSaveError('Couldn’t start the project — try again.'); setSaving(false); return; }
      const json = (await res.json()) as { project?: { id: string } };
      const id = json.project?.id;
      if (!id) { setSaveError('No project id returned — try again.'); setSaving(false); return; }
      // Carry the chosen architectural direction onto the new project (the
      // column exists; PATCH spreads it through). Best-effort — the brief +
      // notes already capture it, so a failure here never blocks the build.
      if (profile.style) {
        try {
          await authedFetch('/api/v1/projects', {
            method: 'PATCH',
            body: JSON.stringify({ id, architectural_style: profile.style }),
          });
        } catch { /* non-fatal */ }
      }
      try { window.localStorage.setItem('bkg-active-project', id); } catch { /* ignore */ }
      try { createSnapshot(id, 'manual_save', 1, 'Genesis — from the Dream Machine', 'dream-machine'); } catch { /* ignore */ }
      try { window.dispatchEvent(new CustomEvent('bkg:project:changed', { detail: { id } })); } catch { /* ignore */ }
      router.push(`/killerapp?project=${encodeURIComponent(id)}`);
    } catch {
      setSaveError('Couldn’t start the project — try again.');
      setSaving(false);
    }
  }, [profile, router]);

  const activeStepKey: Phase | 'build' = phase;
  const planSrc = useMemo(() => (phase === 'blueprint' ? floorPlanDataUri(profile) : ''), [phase, profile]);
  const program = useMemo(() => (phase === 'blueprint' ? deriveRoomProgram(profile) : []), [phase, profile]);

  return (
    <div className="dstudio-root">
      <main className="dstudio">
        {/* ── Header + progress ── */}
        <header className="dstudio-head">
          <DreamOrrery />
          <div className="eng-label dstudio-eyebrow">Dream Machine</div>
          <h1 className="dstudio-title">
            {phase === 'intake' ? 'Dream it.' : phase === 'concepts' ? 'See it.' : 'Plan it.'}
          </h1>
          <ol className="dstudio-steps" aria-label="Progress">
            {PHASE_STEPS.map((s) => (
              <li key={s.key} className={`dstudio-step${s.key === activeStepKey ? ' is-on' : ''}`}>
                <span className="dstudio-step-dot" />{s.label}
              </li>
            ))}
          </ol>
        </header>

        {/* ── IMAGINE · guided intake ── */}
        {phase === 'intake' && (
          <section className="dstudio-card dstudio-intake" aria-label={q.prompt}>
            <div className="eng-label">Question {stepIdx + 1} of {INTAKE.length}</div>
            <h2 className="dstudio-q">{q.prompt}</h2>
            <p className="dstudio-helper">{q.helper}</p>

            <div className="dstudio-options">
              {q.options.map((opt) => {
                const selected = q.multi
                  ? ((answers.musthaves as string[]) ?? []).includes(opt.value)
                  : answerValue(q.id) === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    className={`dstudio-opt${selected ? ' is-selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => (q.multi ? toggleMulti(opt.value) : pickSingle(opt.value))}
                  >
                    <span className="dstudio-opt-l">{opt.label}</span>
                    {opt.hint && <span className="dstudio-opt-h">{opt.hint}</span>}
                  </button>
                );
              })}
            </div>

            {q.freeText && (
              <div className="dstudio-free">
                <input
                  type="text"
                  className="dstudio-free-input"
                  placeholder={q.freeText.placeholder}
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } }}
                />
              </div>
            )}

            {q.multi && ((answers.musthaves as string[])?.length ?? 0) > 0 && (
              <div className="dstudio-chips">
                {(answers.musthaves as string[]).map((m) => (
                  <button key={m} type="button" className="dstudio-chip" onClick={() => toggleMulti(m)} aria-label={`Remove ${m}`}>
                    {m}<IconClose className="ds-ico ds-ico-sm" />
                  </button>
                ))}
              </div>
            )}

            <div className="dstudio-actions">
              {stepIdx > 0 && <button type="button" className="dstudio-btn dstudio-btn-ghost" onClick={back}>← Back</button>}
              <button type="button" className="dstudio-btn dstudio-btn-go" onClick={next} disabled={!canAdvance}>
                {stepIdx < INTAKE.length - 1 ? 'Next →' : 'See the concepts →'}
              </button>
            </div>
          </section>
        )}

        {/* ── CONCEPTS · generate ── */}
        {phase === 'concepts' && (
          <section className="dstudio-card" aria-label="Concepts">
            <p className="dstudio-brief"><em>{profileToBrief(profile)}</em></p>
            {(rendering || status) && (
              <div className="dstudio-status">
                {rendering && <StatusRing />}
                <span>{rendering ? 'Rendering photoreal concepts — your sketches are ready below in the meantime.' : status}</span>
              </div>
            )}
            <div className="dstudio-grid">
              {concepts.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className={`dstudio-concept${chosen === c.id ? ' is-chosen' : ''}${c.pending ? ' is-pending' : ''}`}
                  onClick={() => setLightbox({ items: concepts.map((x) => ({ src: x.src, label: x.label })), index: i, kind: 'concepts' })}
                  aria-label={`${c.label} — open full frame`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- render URL or data-URI fallback */}
                  <img src={c.src} alt={c.label} loading="lazy" />
                  <span className="dstudio-concept-zoom" aria-hidden="true"><IconExpand /></span>
                  <span className="dstudio-concept-tag eng-label">{chosen === c.id && <IconCheck className="ds-ico ds-ico-sm" />}{c.label}{chosen === c.id ? ' · chosen' : ''}</span>
                </button>
              ))}
            </div>
            <div className="dstudio-actions">
              <button type="button" className="dstudio-btn dstudio-btn-ghost" onClick={back}>← Tweak answers</button>
              <button type="button" className="dstudio-btn dstudio-btn-ghost" onClick={() => runConcepts(profile)} disabled={rendering}><IconRefresh /> Regenerate</button>
              <button type="button" className="dstudio-btn dstudio-btn-go" onClick={() => setPhase('blueprint')} disabled={!chosen}>
                Draw the blueprint →
              </button>
            </div>
          </section>
        )}

        {/* ── BLUEPRINT · the look from every angle + schematic plan + build ── */}
        {phase === 'blueprint' && (() => {
          const chosenConcept = concepts.find((c) => c.id === chosen) ?? null;
          // One navigable set: floor plan first, then the chosen look + perspectives.
          const gallery: LightboxItem[] = [
            { src: planSrc, label: 'Floor plan — schematic' },
            ...(chosenConcept ? [{ src: chosenConcept.src, label: 'Your look' }] : []),
            ...views.map((v) => ({ src: v.src, label: v.label })),
          ];
          const openLb = (i: number) => setLightbox({ items: gallery, index: i, kind: 'views' });
          const stillRendering = views.some((v) => v.pending);
          return (
            <section className="dstudio-card" aria-label="Blueprint">
              {/* Perspectives gallery */}
              <div className="dstudio-section-head">
                <span className="eng-label">The look · {profile.style ? profile.style.replace(/-/g, ' ') : profile.vibe || 'your direction'}</span>
                <span className="eng-label">{stillRendering ? 'Rendering more views…' : 'Tap any image to view full frame'}</span>
              </div>
              <div className="dstudio-views">
                {chosenConcept && (
                  <button type="button" className="dstudio-view" onClick={() => openLb(1)} aria-label="Your look — open full frame">
                    {/* eslint-disable-next-line @next/next/no-img-element -- render URL or data-URI fallback */}
                    <img src={chosenConcept.src} alt="Your look" loading="lazy" />
                    <span className="dstudio-concept-zoom" aria-hidden="true"><IconExpand /></span>
                    <span className="dstudio-view-tag eng-label">Your look</span>
                  </button>
                )}
                {views.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`dstudio-view${v.pending ? ' is-pending' : ''}`}
                    onClick={() => openLb(gallery.findIndex((g) => g.src === v.src))}
                    aria-label={`${v.label} — open full frame`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- render URL or data-URI fallback */}
                    <img src={v.src} alt={v.label} loading="lazy" />
                    <span className="dstudio-concept-zoom" aria-hidden="true"><IconExpand /></span>
                    <span className="dstudio-view-tag eng-label">{v.label}</span>
                  </button>
                ))}
              </div>

              {/* Schematic plan + room program */}
              <div className="dstudio-blueprint">
                <button type="button" className="dstudio-plan" onClick={() => openLb(0)} aria-label="Open the floor plan full frame">
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data-URI */}
                  <img src={planSrc} alt={`Schematic floor plan — ${profile.buildingType}`} />
                  <span className="dstudio-concept-zoom" aria-hidden="true"><IconExpand /></span>
                </button>
                <aside className="dstudio-program">
                  <div className="eng-label">Room program · {program.reduce((s, r) => s + r.sqft, 0).toLocaleString('en-US')} sf</div>
                  <ul className="dstudio-program-list">
                    {program.map((r) => (
                      <li key={r.name}><span>{r.name}</span><span className="dstudio-program-sf">{r.sqft} sf</span></li>
                    ))}
                  </ul>
                  <a className="dstudio-btn dstudio-btn-ghost dstudio-dl" href={planSrc} download={`dream-floorplan-${profile.buildingType.replace(/\s+/g, '-')}.svg`}>
                    <IconDownload /> Download SVG
                  </a>
                  <p className="dstudio-disclaimer">Schematic — a starting point, not engineered construction documents.</p>
                </aside>
              </div>

              <div className="dstudio-actions">
                <button type="button" className="dstudio-btn dstudio-btn-ghost" onClick={back}>← Back to concepts</button>
                <button type="button" className="dstudio-btn dstudio-btn-build" onClick={realize} disabled={saving}>
                  {saving ? 'Starting your build…' : 'Build this in the Killer App →'}
                </button>
              </div>
              {saveError && <p className="dstudio-error" role="alert">{saveError}</p>}
            </section>
          );
        })()}
      </main>

      <Lightbox
        items={lightbox?.items ?? []}
        index={lightbox ? lightbox.index : null}
        onIndex={(i) => setLightbox((lb) => (lb ? { ...lb, index: i } : lb))}
        onClose={() => setLightbox(null)}
        action={lightbox?.kind === 'concepts'
          ? { label: 'Choose this concept →', onActivate: (i) => { const c = concepts[i]; if (c) setChosen(c.id); setLightbox(null); } }
          : undefined}
      />
    </div>
  );
}
