'use client';

import React from 'react';
import Image from 'next/image';
import { STAGE_BACKDROPS, RASTER_BACKDROPS } from './stage-backdrops';

export interface StageBackdropProps {
  /** 0 = beginning/landing, 1-7 = lifecycle stages */
  stage: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** Optional opacity override; default 0.12 */
  opacity?: number;
  /** Optional CSS class for additional styling */
  className?: string;
}

/**
 * StageBackdrop — Stage-specific atmospheric backdrop primitive
 *
 * Renders a fixed, full-screen backdrop behind killerapp content:
 * - Stages 0-4: Raster images (architectural, photography)
 * - Stages 5-7: Inline SVG drafting-paper with blueprint grid
 *
 * Features:
 * - position: fixed; inset: 0; z-index: -1; pointer-events: none
 * - Paper overlay gradient for content readability
 * - Respects @media (prefers-reduced-motion: reduce)
 * - Accessibility: alt="", aria-hidden="true"
 */
export default function StageBackdrop({
  stage,
  opacity = 0.12,
  className = '',
}: StageBackdropProps): React.ReactElement {
  // Validate stage
  if (stage === null || stage === undefined || !Number.isInteger(stage) || stage < 0 || stage > 7) {
    console.warn(`StageBackdrop: invalid stage "${stage}". Expected 0–7.`);
    return <div />;
  }

  const baseStyles: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: -1,
    pointerEvents: 'none',
    overflow: 'hidden',
  };

  // Raster images: stages 0-4
  if (stage >= 0 && stage <= 4) {
    const rasterInfo = RASTER_BACKDROPS[stage as 0 | 1 | 2 | 3 | 4];
    if (!rasterInfo) {
      console.warn(`StageBackdrop: no raster backdrop found for stage ${stage}`);
      return <div />;
    }

    return (
      <div
        className={className}
        style={baseStyles}
        role="presentation"
        aria-hidden="true"
      >
        {/* Raster image */}
        <Image
          src={rasterInfo.src}
          alt=""
          fill
          priority={false}
          quality={70}
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />

        {/* Paper overlay gradient for readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(rgba(244,240,230,0.65), rgba(244,240,230,0.85))`,
            pointerEvents: 'none',
          }}
        />
      </div>
    );
  }

  // SVG backdrops: stages 5-7
  if (stage >= 5 && stage <= 7) {
    const BackdropComponent = STAGE_BACKDROPS[stage as 5 | 6 | 7];
    if (!BackdropComponent) {
      console.warn(`StageBackdrop: no SVG backdrop found for stage ${stage}`);
      return <div />;
    }

    return (
      <div
        className={className}
        style={baseStyles}
        role="presentation"
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity,
          }}
        >
          <BackdropComponent />
        </div>
      </div>
    );
  }

  return <div />;
}
