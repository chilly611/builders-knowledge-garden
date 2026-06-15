'use client';

/**
 * CockpitHero — Killer App Builder-lane top (Fidelity spec B1 + B2).
 *
 * B1 crew greeting line + B2 cinematic hero band, the warm lead-in that sits
 * above the instrument gauges (B3). Honesty:
 *   - Greeting facts come from useStageProject()/useShellConfig() — NO
 *     fabricated YARD/CREW; "week n of m" shows only when a schedule exists.
 *   - The hero is a BRANDED FALLBACK (warm herbarium plate) per the generation
 *     contract — placeholder-first; a real project photo streams in here once
 *     Cowork produces it (asset B-asset-1). No fake "photo" claim.
 *
 * Tokens only; the time-of-day greeting is computed client-side (starts neutral
 * on SSR/first render, settles on mount) so there's no hydration mismatch.
 */

import { useEffect, useState } from 'react';
import { useShellConfig } from '@/components/app-shell/ShellConfigContext';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const MONO = 'var(--bp-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-archivo-black, var(--font-archivo)), sans-serif';
const SERIF = 'var(--bp-font-serif, Georgia, serif)';

export default function CockpitHero() {
  const cfg = useShellConfig();

  // Time-of-day greeting is client-only — SSR + first client render both show
  // the neutral "Welcome back" (no hydration mismatch), then it settles.
  const [hello, setHello] = useState('Welcome back');
  useEffect(() => {
    setHello(greetingFor(new Date().getHours()));
  }, []);

  const project = cfg.projectName;
  const weekOf = cfg.journey?.weekOf ?? 0;
  const weeksTotal = cfg.journey?.weeksTotal ?? 0;
  const hasWeeks = weeksTotal > 0;

  return (
    <div style={{ marginBottom: 20 }} data-machine="cockpit_hero">
      {/* B1 — crew greeting. The meta facts (jurisdiction · type · sqft) render
          in the existing project-facts row below, so we don't duplicate them. */}
      <p style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(18px, 2.6vw, 26px)', lineHeight: 1.15, margin: '0 0 16px', color: 'var(--ink-graphite, #2A2620)' }}>
        {hello}, crew — {project}
        {hasWeeks ? <>, week {weekOf} of {weeksTotal}</> : null}.
      </p>

      {/* B2 — cinematic hero. Branded fallback until a real project photo lands
          (generation contract); the warm gradient + overlay keep the headline
          legible exactly as a photo + overlay would. */}
      <div
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--specimen-brass, #B08D5C)',
          minHeight: 200,
          background:
            'linear-gradient(135deg, var(--paper-vellum, #E8DDB8) 0%, var(--paper-cream, #F2E9D2) 45%, rgba(176,141,92,0.40) 100%)',
        }}
      >
        {/* warm legibility overlay (bottom-weighted, as over a photo) */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(42,38,32,0) 35%, rgba(42,38,32,0.22) 100%)' }} aria-hidden />
        <div style={{ position: 'relative', padding: '24px 26px', minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-graphite, #2A2620)', opacity: 0.65 }}>
            Your week · by the instruments
          </span>
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(26px, 4.5vw, 40px)', lineHeight: 1.08, margin: '6px 0 0', color: 'var(--ink-graphite, #2A2620)' }}>
            Where the build stands
          </h1>
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: 'var(--ink-faded, #6A6256)', margin: '10px 0 0', alignSelf: 'flex-end', textAlign: 'right' }}>
            {project}
          </p>
        </div>
      </div>
    </div>
  );
}
