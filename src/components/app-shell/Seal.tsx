'use client';

/**
 * Seal — the large animated botanical mark. Canonical asset is the umbrella
 * "tree" mark from the public brand-assets bucket (see SEAL_SRC).
 *
 * Motion (Commit 2): a Framer Motion spring entrance (scale/opacity/rotate)
 * plus a slow "breathing" scale loop so the seal reads as alive and prominent.
 * Honors prefers-reduced-motion — appears at rest, no entrance, no loop.
 */

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SEAL_SRC } from './config';

export interface SealProps {
  size?: number;
  radius?: number;
  /** Override the asset (defaults to the canonical umbrella mark). */
  src?: string;
  className?: string;
  /** Entrance delay (seconds). */
  delay?: number;
}

export function Seal({ size = 52, radius, src, className, delay = 0.1 }: SealProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const go = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    go();
    if (v.readyState < 2) v.addEventListener('loadeddata', go, { once: true });
  }, []);
  return (
    <motion.span
      className={`bkg-shell-seal${className ? ' ' + className : ''}`}
      style={{ display: 'inline-flex' }}
      initial={reduce ? false : { scale: 0.55, opacity: 0, rotate: -12 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, delay }}
    >
      <motion.span
        style={{ display: 'inline-flex' }}
        animate={reduce ? undefined : { scale: [1, 1.035, 1] }}
        transition={reduce ? undefined : { duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span
          className="bkg-mark"
          style={{ width: size, height: size, borderRadius: radius ?? Math.round(size / 6) }}
          aria-hidden="true"
        >
          <video ref={ref} src={src ?? SEAL_SRC} autoPlay loop muted playsInline preload="auto" />
        </span>
      </motion.span>
    </motion.span>
  );
}

export default Seal;
