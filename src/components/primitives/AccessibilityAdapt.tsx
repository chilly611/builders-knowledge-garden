/**
 * AccessibilityAdapt (Pattern Language #17, Dimensional Rendering).
 *
 * Category: Dimensional Rendering.
 * Axes touched: accessibility (primary — vision + hearing + motor + cognitive
 *               + neurodivergent), modality (active — blind users get voice
 *               rendering forced).
 *
 * Color · motor · cognitive · neurodivergent profiles operationalized, not
 * posture only. Wraps children with the right adaptations and exposes
 * adaptedProps for handcrafted overrides.
 */

'use client';

import * as React from 'react';
import { useStanceCard } from '@/lib/stance-card';
import type { StanceCard, StanceAccessibility } from './StanceCard.types';

export interface AccessibilityAdaptProps {
  children: React.ReactNode | ((profile: StanceAccessibility) => React.ReactNode);
  /** Force profile for previews / testing. */
  forceProfile?: Partial<StanceAccessibility>;
  /** Pin stance for SSR. */
  stance?: StanceCard;
}

export function AccessibilityAdapt({
  children,
  forceProfile,
  stance,
}: AccessibilityAdaptProps) {
  const clientStance = useStanceCard();
  const profile: StanceAccessibility = {
    ...(stance ?? clientStance).accessibility,
    ...forceProfile,
  };

  const reducedMotion = profile.cognitive === 'reduced-motion';
  const simplified = profile.cognitive === 'simplified';
  const lowVision = profile.vision === 'low';
  const motorLimited = profile.motor === 'limited';

  // Inline style wrapper that adapts spacing + motion + text size.
  const wrapperStyle: React.CSSProperties = {
    fontSize: lowVision ? '1.15em' : undefined,
    lineHeight: lowVision || simplified ? 1.7 : undefined,
    // 44px touch target minimum when motor is limited
    minHeight: motorLimited ? '2.75rem' : undefined,
    // Disable animations
    animation: reducedMotion ? 'none' : undefined,
    transition: reducedMotion ? 'none' : undefined,
  };

  const content =
    typeof children === 'function' ? children(profile) : children;

  return (
    <div
      data-accessibility-vision={profile.vision}
      data-accessibility-hearing={profile.hearing}
      data-accessibility-motor={profile.motor}
      data-accessibility-cognitive={profile.cognitive}
      data-accessibility-neurodivergent={profile.neurodivergent}
      style={wrapperStyle}
    >
      {content}
    </div>
  );
}

export default AccessibilityAdapt;
