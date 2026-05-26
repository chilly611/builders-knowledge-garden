/**
 * TempoAdapt (Pattern Language #14, Dimensional Rendering).
 *
 * Category: Dimensional Rendering.
 * Axes touched: tempo (primary), trust_posture (active — emergency tempo
 *               assumes a long-tenured user who has earned the shortcut).
 *
 * Primitives breathe differently under different time pressure:
 *   leisurely → focused → urgent → emergency.
 *
 * The component is a wrapper that picks a single child to render based on the
 * current tempo. Children are passed by tempo name; missing tempos fall back
 * to the next-most-leisurely defined slot. Emergency may strip to a single
 * button.
 */

'use client';

import * as React from 'react';
import { useStanceCard } from '@/lib/stance-card';
import type { StanceCard, StanceTempo } from './StanceCard.types';

export interface TempoAdaptProps {
  /** Render at leisurely tempo (e.g. full guided card with helper copy). */
  leisurely?: React.ReactNode;
  /** Render at focused tempo (default ops view). */
  focused?: React.ReactNode;
  /** Render at urgent tempo (compressed, fewer secondary affordances). */
  urgent?: React.ReactNode;
  /** Render at emergency tempo (one button, biggest tap target). */
  emergency?: React.ReactNode;
  /** Pin tempo when rendered server-side or to override stance. */
  forceTempo?: StanceTempo;
  /** Optional stance for SSR contexts. */
  stance?: StanceCard;
}

const ORDER: StanceTempo[] = ['leisurely', 'focused', 'urgent', 'emergency'];

export function TempoAdapt({
  leisurely,
  focused,
  urgent,
  emergency,
  forceTempo,
  stance,
}: TempoAdaptProps) {
  const clientStance = useStanceCard();
  const card = stance ?? clientStance;
  const tempo = forceTempo ?? card.tempo;

  const slots: Record<StanceTempo, React.ReactNode> = {
    leisurely,
    focused,
    urgent,
    emergency,
  };

  // Walk DOWN from emergency to find the most-urgent defined slot at or below
  // the current tempo. This ensures "urgent" renders the urgent slot if defined,
  // else falls back to focused/leisurely. Emergency always shows emergency if
  // defined, else collapses to urgent / focused / leisurely in order.
  const startIdx = ORDER.indexOf(tempo);
  for (let i = startIdx; i >= 0; i--) {
    const slot = slots[ORDER[i]];
    if (slot !== undefined && slot !== null) {
      return <>{slot}</>;
    }
  }

  return null;
}

export default TempoAdapt;
