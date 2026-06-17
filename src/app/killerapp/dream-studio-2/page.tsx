/**
 * Dream Machine v2 — Route Handler (NEW surface, /killerapp/dream-studio-2).
 * =========================================================================
 * The Claude Design "imagine → build pipeline" mock, recreated on the shared
 * App Shell (the killerapp layout provides UmbrellaBar / GlobalStrips /
 * PersistentNav). Coexists with /killerapp/dream-studio and /killerapp/dream
 * — those are untouched; this is reached by direct URL (no compass-nav change).
 *
 * High-fidelity interactive prototype: spine nav, stage steps, sheet tabs,
 * Genome sliders, hotspots and blend sliders are live; FLUX/plan/persistence
 * are a follow-up. Content renders from the DM2 demo literal (Twin Peaks).
 */

import { Suspense } from 'react';
import DreamStudio2Client from './DreamStudio2Client';

export const metadata = {
  title: 'Dream Machine v2',
  description: 'The imagine → build pipeline — one forward-moving journey from a seed to a buildable plan.',
};

export default function DreamStudio2Page() {
  return (
    <Suspense fallback={null}>
      <DreamStudio2Client />
    </Suspense>
  );
}
