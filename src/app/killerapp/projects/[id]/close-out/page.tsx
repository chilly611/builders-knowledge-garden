/**
 * Close-Out Ritual — Route Handler
 * =====================================
 *
 * Server component that wraps the close-out ritual client component.
 * Extracts projectId from URL params and renders the ritual.
 *
 * § 9 OPEN DECISIONS MADE (v1 simplifications):
 *
 * 1. COLOR GRADE ON MP4?
 *    Decision: SKIP for v1. Using PNG frame sequence with CSS fades.
 *    Reasoning: Simpler implementation, no video codec complexity, meets 3s total duration.
 *    v2 TODO: MP4 with warm color grade if motion budget allows.
 *
 * 2. PERSONALIZED VISION-ANCHOR?
 *    Decision: SKIP for v1. Post-ritual shows static before/after Compass maps.
 *    Reasoning: Vision anchor requires dataset wiring; can be added as enhancement.
 *    v2 TODO: Integrate dream asset from project metadata.
 *
 * 3. SOUND ON ROADMAP?
 *    Decision: NO for v1. Motion-only celebration per accessibility best practice.
 *    Reasoning: Pros use tools 10+ hours/day; audio would interrupt focus.
 *    v2 TODO: Optional soft chime (G5, -20 dB) with mute toggle.
 *
 * 4. MANUAL TRIGGER BUTTON PLACEMENT?
 *    Decision: ProjectCompass Reflect-stage chip, small icon.
 *    Reasoning: Treats close-out as "advanced action" only when stage 7 complete.
 *    See: src/components/ProjectCompass.tsx CTA addition.
 *
 * 5. ROUTE VS. MODAL?
 *    Decision: DEDICATED ROUTE (/killerapp/projects/[id]/close-out).
 *    Reasoning: Allows deep-linking, clear breadcrumb navigation, shareable state.
 *    Future: Modal overlay can wrap this same component if UX testing suggests it.
 *
 * SIMPLIFICATIONS FOR V1:
 * ========================
 * - 4-frame PNG sequence (250ms × 4 = 1s) + 2s hold = 3s total
 *   instead of full 5.2s MP4 + 0.8s post-roll resolve + 0.6s content reveal
 * - CSS keyframe animation instead of video element
 * - Static before/after Compass maps (demo data)
 * - No vision anchor, no audio, no telemetry to backend
 * - prefers-reduced-motion: graceful fallback to static poster
 *
 * ROUTE: /killerapp/projects/[id]/close-out
 * PARAMS: { id: projectId }
 * STATUS: v1 ready for ship; v2 adds MP4, audio, anchor dataset wiring
 */

import CloseOutClient from './CloseOutClient';

interface CloseOutPageProps {
  params: {
    id: string;
  };
}

export default function CloseOutPage({ params }: CloseOutPageProps) {
  return <CloseOutClient projectId={params.id} />;
}
