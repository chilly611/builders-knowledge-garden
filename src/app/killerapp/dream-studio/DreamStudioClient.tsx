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

import { useCallback, useMemo, useRef, useState } from 'react';
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
  const genRef = useRef(0);

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
                    {m} ✕
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
                <span>{rendering ? '✦ Rendering photoreal concepts — your sketches are ready below in the meantime.' : status}</span>
              </div>
            )}
            <div className="dstudio-grid">
              {concepts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`dstudio-concept${chosen === c.id ? ' is-chosen' : ''}${c.pending ? ' is-pending' : ''}`}
                  onClick={() => setChosen(c.id)}
                  aria-pressed={chosen === c.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- render URL or data-URI fallback */}
                  <img src={c.src} alt={c.label} loading="lazy" />
                  <span className="dstudio-concept-tag eng-label">{c.label}{chosen === c.id ? ' · chosen' : ''}</span>
                </button>
              ))}
            </div>
            <div className="dstudio-actions">
              <button type="button" className="dstudio-btn dstudio-btn-ghost" onClick={back}>← Tweak answers</button>
              <button type="button" className="dstudio-btn dstudio-btn-ghost" onClick={() => runConcepts(profile)} disabled={rendering}>↻ Regenerate</button>
              <button type="button" className="dstudio-btn dstudio-btn-go" onClick={() => setPhase('blueprint')} disabled={!chosen}>
                Draw the blueprint →
              </button>
            </div>
          </section>
        )}

        {/* ── BLUEPRINT · schematic plan + build handoff ── */}
        {phase === 'blueprint' && (
          <section className="dstudio-card" aria-label="Blueprint">
            <div className="dstudio-blueprint">
              <div className="dstudio-plan">
                {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data-URI */}
                <img src={planSrc} alt={`Schematic floor plan — ${profile.buildingType}`} />
              </div>
              <aside className="dstudio-program">
                <div className="eng-label">Room program · {program.reduce((s, r) => s + r.sqft, 0).toLocaleString('en-US')} sf</div>
                <ul className="dstudio-program-list">
                  {program.map((r) => (
                    <li key={r.name}><span>{r.name}</span><span className="dstudio-program-sf">{r.sqft} sf</span></li>
                  ))}
                </ul>
                <a className="dstudio-btn dstudio-btn-ghost dstudio-dl" href={planSrc} download={`dream-floorplan-${profile.buildingType.replace(/\s+/g, '-')}.svg`}>
                  ↓ Download SVG
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
        )}
      </main>
    </div>
  );
}
