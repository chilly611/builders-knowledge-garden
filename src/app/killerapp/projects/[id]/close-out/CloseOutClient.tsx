'use client';

/**
 * CloseOutClient — Close-Out Ritual Experience
 * =============================================
 *
 * Manages the full close-out ritual lifecycle:
 * 1. Pre-roll fade-in (0.3s, black ground + audio cue placeholder)
 * 2. Main animation (3s, 4-frame PNG sequence fading)
 * 3. Post-roll resolve (hold final frame 2s, orrery halo pulses)
 * 4. Content reveal (before/after Compass maps + stats, 0.6s fade)
 * 5. Total duration: ~5.6s (simplified from 6.9s full spec)
 *
 * Design: Deep Orange (#D9642E) peak-moment celebration
 * Easing: cubic-bezier(.4,.02,.2,1) for stroke-draw feel
 * Accessibility: respects prefers-reduced-motion (no animation, static poster)
 */

import { useEffect, useState } from 'react';
import styles from './close-out.module.css';

interface CloseOutClientProps {
  projectId: string;
}

interface Phase {
  name: 'preroll' | 'animation' | 'postroll' | 'reveal' | 'idle';
  startTime: number;
  duration: number;
}

const PHASES: Record<Phase['name'], number> = {
  preroll: 300,      // 0.3s
  animation: 1000,   // 1s (4 frames × 250ms)
  postroll: 2000,    // 2s hold + halo pulse
  reveal: 600,       // 0.6s fade-in content
  idle: 0,           // final state
};

const FRAME_DURATION = 250; // ms per frame
const FRAMES = [
  '/design-assets/close-out-frames/frame-001.jpg',
  '/design-assets/close-out-frames/frame-002.jpg',
  '/design-assets/close-out-frames/frame-003.jpg',
  '/design-assets/close-out-frames/frame-004.jpg',
];

export default function CloseOutClient({ projectId }: CloseOutClientProps) {
  const [phase, setPhase] = useState<Phase['name']>('preroll');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Detect prefers-reduced-motion on mount
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  // Phase orchestration
  useEffect(() => {
    if (prefersReducedMotion) {
      // Skip animation, show static poster immediately
      setPhase('reveal');
      return;
    }

    const timeline: [Phase['name'], number][] = [
      ['preroll', PHASES.preroll],
      ['animation', PHASES.animation],
      ['postroll', PHASES.postroll],
      ['reveal', PHASES.reveal],
      ['idle', 0],
    ];

    let elapsed = 0;
    const timers: NodeJS.Timeout[] = [];

    for (const [phaseName, duration] of timeline) {
      const timer = setTimeout(() => {
        setPhase(phaseName);
      }, elapsed);
      timers.push(timer);
      elapsed += duration;
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [prefersReducedMotion]);

  // Frame cycling during animation phase
  useEffect(() => {
    if (prefersReducedMotion || phase !== 'animation') return;

    let frameIndex = 0;
    const frames: NodeJS.Timeout[] = [];

    for (let i = 0; i < FRAMES.length; i++) {
      const timer = setTimeout(() => {
        setCurrentFrameIndex(i);
      }, i * FRAME_DURATION);
      frames.push(timer);
    }

    return () => {
      frames.forEach(clearTimeout);
    };
  }, [phase, prefersReducedMotion]);

  // Emit telemetry events (placeholder for v1; backend integration in v2)
  useEffect(() => {
    if (phase === 'preroll') {
      // close_out_started event
      console.log('[close-out] started', { projectId });
    } else if (phase === 'idle') {
      // close_out_completed event
      console.log('[close-out] completed', { projectId });
    }
  }, [phase, projectId]);

  return (
    <div className={styles.container}>
      {/* Pre-roll: Black ground fade-in */}
      {(phase === 'preroll' || phase === 'animation' || phase === 'postroll') && (
        <div
          className={styles.blackGround}
          style={{
            opacity: ['preroll', 'animation', 'postroll'].includes(phase) ? 1 : 0,
            transition:
              phase === 'preroll'
                ? 'opacity 300ms cubic-bezier(.4,.02,.2,1)'
                : 'opacity 600ms cubic-bezier(.4,.02,.2,1)',
          }}
        />
      )}

      {/* Main animation: Frame sequence or reduced-motion poster */}
      {(phase === 'animation' || phase === 'postroll' || prefersReducedMotion) && (
        <div className={styles.ritualSurface}>
          <div className={styles.frameContainer}>
            {prefersReducedMotion ? (
              // Static poster for accessibility
              <img
                src={FRAMES[3]} // frame-004.jpg — full tree
                alt="Project complete"
                className={styles.posterImage}
              />
            ) : (
              // Frame sequence with cross-fade
              <div className={styles.frameSequence}>
                {FRAMES.map((frame, idx) => (
                  <img
                    key={frame}
                    src={frame}
                    alt={`Animation frame ${idx + 1}`}
                    className={styles.frameImage}
                    style={{
                      opacity:
                        phase === 'postroll'
                          ? idx === FRAMES.length - 1
                            ? 1
                            : 0
                          : idx === currentFrameIndex
                            ? 1
                            : 0,
                      transition:
                        phase === 'animation'
                          ? 'opacity 250ms linear'
                          : 'opacity 400ms cubic-bezier(.4,.02,.2,1)',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Orrery halo pulse overlay (post-roll) */}
            {phase === 'postroll' && !prefersReducedMotion && (
              <div className={styles.haloContainer}>
                <svg viewBox="0 0 200 200" className={styles.orrery}>
                  {/* Inner ring: graphite hairline */}
                  <circle
                    cx="100"
                    cy="100"
                    r="40"
                    fill="none"
                    stroke="var(--graphite)"
                    strokeWidth="0.5"
                    opacity="0.6"
                  />
                  {/* Middle ring: faded rule */}
                  <circle
                    cx="100"
                    cy="100"
                    r="70"
                    fill="none"
                    stroke="var(--faded-rule)"
                    strokeWidth="0.5"
                    opacity="0.4"
                  />
                  {/* Outer ring: Deep Orange pulse */}
                  <circle
                    cx="100"
                    cy="100"
                    r="95"
                    fill="none"
                    stroke="var(--orange)"
                    strokeWidth="3"
                    opacity="0.8"
                    className={styles.haloRing}
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Project complete text (overlay, Deep Orange) */}
          {(phase === 'postroll' || phase === 'reveal') && (
            <div
              className={styles.completeText}
              style={{
                opacity:
                  phase === 'postroll' && !prefersReducedMotion ? 0 : 1,
                transition:
                  phase === 'reveal'
                    ? 'opacity 600ms cubic-bezier(.4,.02,.2,1)'
                    : 'opacity 400ms cubic-bezier(.4,.02,.2,1)',
              }}
            >
              <h1 style={{ color: 'var(--orange)' }}>Project Complete</h1>
            </div>
          )}
        </div>
      )}

      {/* Post-ritual content: Before/after, stats, summary (reveal phase) */}
      {(phase === 'reveal' || phase === 'idle') && (
        <div
          className={styles.postRitualContent}
          style={{
            opacity: phase === 'idle' ? 1 : 0,
            transition: 'opacity 600ms cubic-bezier(.4,.02,.2,1)',
          }}
        >
          <div className={styles.contentWrapper}>
            {/* Before/After Compass maps (demo) */}
            <div className={styles.beforeAfterPair}>
              <div className={styles.compassCard}>
                <div className={styles.compass} style={{ opacity: 0.5 }}>
                  📍 Before (Stage 6)
                </div>
              </div>
              <div className={styles.arrow}>→</div>
              <div className={styles.compassCard}>
                <div
                  className={styles.compass}
                  style={{ color: 'var(--orange)' }}
                >
                  📍 After (Stage 7)
                </div>
              </div>
            </div>

            {/* Stats section */}
            <div className={styles.statsSection}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Project Duration</div>
                <div className={styles.statValue}>8 weeks</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total XP Earned</div>
                <div className={styles.statValue}>295 XP</div>
              </div>
            </div>

            {/* Summary card */}
            <div className={styles.summaryCard}>
              <h2>Journey Complete</h2>
              <p>
                Your project journey from planning through reflection is archived
                and available for team review.
              </p>
              <button
                className={styles.summaryButton}
                onClick={() => {
                  // v2: emit close_out_shared telemetry
                  console.log('[close-out] summary viewed', { projectId });
                }}
              >
                View Full Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
