import React from 'react';

/**
 * Stage Backdrops — Raster (0-4) + SVG (5-7)
 *
 * RASTER (Stages 0-4):
 * - Canonical asset paths in /public/stage-backdrops/
 * - Rendered via next/image with fill, quality=70
 * - Paper overlay gradient for readability
 *
 * SVG (Stages 5-7):
 * - Inline drafting-paper textures (1600×1000)
 * - Trace ground (#F4F0E6) + faded rule grid (#C9C3B3)
 * - Brass watermark + stage-specific accent glyph
 * - Robin's Egg (5), Purple (6), Deep Orange (7)
 */

/** Raster backdrop metadata */
interface RasterBackdrop {
  src: string;
  alt: string;
}

/** Map of stage 0-4 to raster image paths */
export const RASTER_BACKDROPS: Record<0 | 1 | 2 | 3 | 4, RasterBackdrop> = {
  0: {
    src: '/stage-backdrops/beginning-journey.jpg',
    alt: 'Architectural floor plan',
  },
  1: {
    src: '/stage-backdrops/sizeup-journey.png',
    alt: 'Child with paper-sculpture bird head on ruler',
  },
  2: {
    src: '/stage-backdrops/lock-journey.png',
    alt: 'Brass padlock on cream paper',
  },
  3: {
    src: '/stage-backdrops/plan-journey.png',
    alt: 'White geometric paper architecture',
  },
  4: {
    src: '/stage-backdrops/build-journey.png',
    alt: 'Exploded construction components',
  },
};

function StageBackdrop5(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 1600 1000"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <rect width="1600" height="1000" fill="#F4F0E6" />

      {/* Faded rule lines */}
      {[80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880].map((y) => (
        <line
          key={`rule-${y}`}
          x1="0"
          y1={y}
          x2="1600"
          y2={y}
          stroke="#C9C3B3"
          strokeWidth="0.8"
          opacity="0.5"
        />
      ))}

      {/* Brass watermark: "5" + refresh emoji */}
      <text
        x="1520"
        y="100"
        fontSize="120"
        fontWeight="bold"
        fill="#B6873A"
        opacity="0.09"
        textAnchor="end"
        fontFamily="serif"
      >
        5 🔄
      </text>

      <text
        x="1520"
        y="160"
        fontSize="24"
        fill="#B6873A"
        opacity="0.08"
        textAnchor="end"
        fontFamily="sans-serif"
        letterSpacing="2"
      >
        ADAPT
      </text>

      {/* Flow arrow glyph, center-bottom, ~12% opacity */}
      <g opacity="0.12" stroke="#7FCFCB" fill="none" strokeWidth="3">
        {/* Curved flow arrow */}
        <path
          d="M 750 580 Q 800 530 850 580"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrow head */}
        <polygon points="850,580 865,575 860,595" fill="#7FCFCB" />
      </g>
    </svg>
  );
}

function StageBackdrop6(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 1600 1000"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <rect width="1600" height="1000" fill="#F4F0E6" />

      {/* Faded rule lines */}
      {[80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880].map((y) => (
        <line
          key={`rule-${y}`}
          x1="0"
          y1={y}
          x2="1600"
          y2={y}
          stroke="#C9C3B3"
          strokeWidth="0.8"
          opacity="0.5"
        />
      ))}

      {/* Brass watermark: "6" + money bag emoji */}
      <text
        x="1520"
        y="100"
        fontSize="120"
        fontWeight="bold"
        fill="#B6873A"
        opacity="0.09"
        textAnchor="end"
        fontFamily="serif"
      >
        6 💰
      </text>

      <text
        x="1520"
        y="160"
        fontSize="24"
        fill="#B6873A"
        opacity="0.08"
        textAnchor="end"
        fontFamily="sans-serif"
        letterSpacing="2"
      >
        COLLECT
      </text>

      {/* Coin stack glyph, center-bottom, ~12% opacity */}
      <g opacity="0.12" fill="#D9642E">
        {/* Stacked coins */}
        <ellipse cx="800" cy="650" rx="40" ry="12" />
        <ellipse cx="800" cy="630" rx="40" ry="12" fill="#D9642E" opacity="0.8" />
        <ellipse cx="800" cy="610" rx="40" ry="12" fill="#D9642E" opacity="0.6" />
        {/* Center circle on top coin */}
        <circle cx="800" cy="610" r="8" fill="#F4F0E6" />
      </g>
    </svg>
  );
}

function StageBackdrop7(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 1600 1000"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <rect width="1600" height="1000" fill="#F4F0E6" />

      {/* Faded rule lines */}
      {[80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880].map((y) => (
        <line
          key={`rule-${y}`}
          x1="0"
          y1={y}
          x2="1600"
          y2={y}
          stroke="#C9C3B3"
          strokeWidth="0.8"
          opacity="0.5"
        />
      ))}

      {/* Brass watermark: "7" + book emoji */}
      <text
        x="1520"
        y="100"
        fontSize="120"
        fontWeight="bold"
        fill="#B6873A"
        opacity="0.09"
        textAnchor="end"
        fontFamily="serif"
      >
        7 📖
      </text>

      <text
        x="1520"
        y="160"
        fontSize="24"
        fill="#B6873A"
        opacity="0.08"
        textAnchor="end"
        fontFamily="sans-serif"
        letterSpacing="2"
      >
        REFLECT
      </text>

      {/* Book spine glyph, center-bottom, ~12% opacity */}
      <g opacity="0.12">
        {/* Book spine (left) */}
        <rect x="750" y="550" width="15" height="80" fill="#1B3B5E" />
        {/* Book pages (right) */}
        <rect x="765" y="550" width="60" height="80" fill="none" stroke="#1B3B5E" strokeWidth="2" />
        {/* Page lines */}
        <line x1="775" y1="565" x2="820" y2="565" stroke="#1B3B5E" strokeWidth="1.5" opacity="0.6" />
        <line x1="775" y1="580" x2="820" y2="580" stroke="#1B3B5E" strokeWidth="1.5" opacity="0.6" />
        <line x1="775" y1="595" x2="820" y2="595" stroke="#1B3B5E" strokeWidth="1.5" opacity="0.6" />
      </g>
    </svg>
  );
}

/**
 * Export map of stage IDs 5-7 to SVG backdrop components
 */
export const STAGE_BACKDROPS: Record<5 | 6 | 7, React.ComponentType> = {
  5: StageBackdrop5,
  6: StageBackdrop6,
  7: StageBackdrop7,
};
