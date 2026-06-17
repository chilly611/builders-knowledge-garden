/**
 * Dream Machine (v2 flagship) — Route Handler
 * ===========================================
 *
 * /killerapp/dream-studio — the guided "Midjourney of architecture" flow:
 * imagine (guided intake) → see (concept renders) → plan (schematic blueprint)
 * → build (hand off a real Killer App project). Mounts on the shared shell, so
 * it inherits the chrome + ProjectProvider. See DreamStudioClient.
 */

import { Suspense } from 'react';
import DreamStudioClient from './DreamStudioClient';

export const metadata = {
  title: 'Dream Machine',
  description: 'Imagine your build, see it in renders, plan it, and start building — the Dream Machine.',
};

export default function DreamStudioPage() {
  return (
    <Suspense fallback={null}>
      <DreamStudioClient />
    </Suspense>
  );
}
