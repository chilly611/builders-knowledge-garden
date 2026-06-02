'use client';

/**
 * Seal — the large self-animating BKG mark: the "Viver" hammer-roots herbarium
 * plate from the public brand-assets bucket (see BKG_SEAL_SRC / BKG_SEAL_POSTER).
 *
 * Motion: a Framer Motion spring entrance (scale/opacity/rotate) plus a slow
 * "breathing" scale loop, layered over the asset's own bloom + gentle idle, so
 * the seal reads as alive and prominent.
 *
 * prefers-reduced-motion: renders the static herbarium emblem at rest — no
 * entrance, no breathe loop, and a non-playing <video> (the poster image only),
 * so nothing animates and the heavy video bytes are never fetched.
 */

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BKG_SEAL_SRC, BKG_SEAL_POSTER } from './config';

export interface SealProps {
  size?: number;
  radius?: number;
  /** Override the motion asset (defaults to the canonical BKG Viver mark). */
  src?: string;
  /** Override the still/poster (defaults to the static BKG emblem). */
  poster?: string;
  className?: string;
  /** Entrance delay (seconds). */
  delay?: number;
}

export function Seal({ size = 52, radius, src, poster, className, delay = 0.1 }: SealProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const videoSrc = src ?? BKG_SEAL_SRC;
  const posterSrc = poster ?? BKG_SEAL_POSTER;

  useEffect(() => {
    if (reduce) return;
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const go = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    go();
    if (v.readyState < 2) v.addEventListener('loadeddata', go, { once: true });
  }, [reduce]);

  const markStyle = { width: size, height: size, borderRadius: radius ?? Math.round(size / 6) };

  // prefers-reduced-motion: a still herbarium emblem. The <video> never plays
  // (no autoPlay/loop, preload="none") so only the poster image renders, reusing
  // the same `.bkg-mark video` framing in both the shell and Owner scopes.
  if (reduce) {
    return (
      <span className={`bkg-shell-seal${className ? ' ' + className : ''}`} style={{ display: 'inline-flex' }}>
        <span className="bkg-mark" style={markStyle} aria-hidden="true">
          <video src={videoSrc} poster={posterSrc} muted playsInline preload="none" />
        </span>
      </span>
    );
  }

  return (
    <motion.span
      className={`bkg-shell-seal${className ? ' ' + className : ''}`}
      style={{ display: 'inline-flex' }}
      initial={{ scale: 0.55, opacity: 0, rotate: -12 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, delay }}
    >
      <motion.span
        style={{ display: 'inline-flex' }}
        animate={{ scale: [1, 1.035, 1] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span
          className="bkg-mark"
          style={markStyle}
          aria-hidden="true"
        >
          <video ref={ref} src={videoSrc} poster={posterSrc} autoPlay loop muted playsInline preload="auto" />
        </span>
      </motion.span>
    </motion.span>
  );
}

export default Seal;
