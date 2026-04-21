/**
 * Motion system tokens — durations and easings for BKG animations.
 * Use these constants for inline styles or as reference for CSS class delays.
 */

export const MOTION = {
  /** Entrance animation duration (ms). Used for fade-up, scale-in, hero animations. */
  entranceDuration: 280,

  /** Hover transition duration (ms). Quick feedback on interactive elements. */
  hoverDuration: 180,

  /** Hero mark animation duration (ms). Slower, more dramatic entrance for key elements. */
  heroDuration: 900,

  /** Entrance easing. Springy curve: cubic-bezier(0.2, 0.8, 0.2, 1) */
  entranceEase: 'cubic-bezier(0.2, 0.8, 0.2, 1)',

  /** Hover easing. Quick ease-out for responsive feel. */
  hoverEase: 'ease-out',
} as const;

/**
 * Stagger delays for sequential animations. Apply via .bkg-stagger-N utility classes.
 */
export const STAGGER_DELAYS = [40, 80, 120, 160, 200, 240] as const;

export type MotionConfig = typeof MOTION;
