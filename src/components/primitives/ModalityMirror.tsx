/**
 * ModalityMirror (Pattern Language #15, Dimensional Rendering).
 *
 * Category: Dimensional Rendering.
 * Axes touched: modality (primary), accessibility (active — blind users get
 *               voice rendering even if their saved modality is visual),
 *               device_class (active — voice-only devices always get voice).
 *
 * Visual / voice / gestural / agent-API renderings of every workflow. The
 * caller supplies one slot per modality; this component picks the right one
 * for the current stance.
 */

'use client';

import * as React from 'react';
import { useStanceCard } from '@/lib/stance-card';
import type { StanceCard, StanceModality } from './StanceCard.types';

export interface ModalityMirrorProps {
  visual?: React.ReactNode;
  voice?: React.ReactNode;
  gesture?: React.ReactNode;
  agent?: React.ReactNode;
  /** Force a modality (e.g. previewing a different rendering). */
  forceModality?: StanceModality;
  /** Pin stance for SSR. */
  stance?: StanceCard;
}

export function ModalityMirror({
  visual,
  voice,
  gesture,
  agent,
  forceModality,
  stance,
}: ModalityMirrorProps) {
  const clientStance = useStanceCard();
  const card = stance ?? clientStance;

  // Accessibility / device-class overrides take precedence.
  let modality: StanceModality = forceModality ?? card.modality;
  if (card.accessibility.vision === 'blind') modality = 'voice';
  if (card.device_class === 'voice-only') modality = 'voice';
  if (card.device_class === 'agent' || card.lane === 'machine') modality = 'agent-api';

  const slots: Record<StanceModality, React.ReactNode> = {
    visual,
    voice,
    gesture,
    'agent-api': agent,
  };

  const slot = slots[modality] ?? visual;
  return <>{slot}</>;
}

export default ModalityMirror;
