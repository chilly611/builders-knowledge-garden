'use client';

/**
 * Seal — the BKG "Viver" hammer-roots herbarium mark (BKG_SEAL_SRC /
 * BKG_SEAL_POSTER from the public brand-assets bucket).
 *
 * ONE component, two variants, so the same mark can live on every surface:
 *
 *  • variant="hero" (default) — the full self-playing <video> with a Framer
 *    Motion spring entrance + slow breathe. For prominent, ≥64px placements
 *    (the app-shell seal, the Owner hero). prefers-reduced-motion → static
 *    poster, and the heavy video bytes are never fetched.
 *
 *  • variant="header" — a LIGHTWEIGHT mark for chrome that mounts on every
 *    route (top nav, sidebar, error page). Renders the static poster emblem
 *    with a barely-there breathe and NEVER loads the multi-MB video — which
 *    on every route would wreck performance and re-trigger the prod autoplay
 *    "black square" bug. prefers-reduced-motion → fully static. Pass a local
 *    `poster` (e.g. /brand/bkg-mark.png) for instant, dependency-free chrome.
 *
 * Self-framing: the mark clips + object-fit:cover via inline styles, so it
 * looks right ANYWHERE — not only inside the `.bkg-shell` / `.ov-root` scopes
 * whose CSS adds the extra paper border/shadow.
 */

import { useEffect, useRef, type CSSProperties } from 'react';
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
  /** Entrance delay (seconds) — hero variant only. */
  delay?: number;
  /**
   * 'hero' (default): full animated <video>. 'header': poster-only, never
   * fetches the video — for chrome that renders on every route.
   */
  variant?: 'hero' | 'header';
}

/** Media fills the (clipped) mark box regardless of ancestor CSS scope. */
const FILL: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };

export function Seal({ size = 52, radius, src, poster, className, delay = 0.1, variant = 'hero' }: SealProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const videoSrc = src ?? BKG_SEAL_SRC;
  const posterSrc = poster ?? BKG_SEAL_POSTER;

  // Autoplay is only relevant to the hero <video>; the header never mounts one.
  useEffect(() => {
    if (reduce || variant !== 'hero') return;
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const go = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    go();
    if (v.readyState < 2) v.addEventListener('loadeddata', go, { once: true });
  }, [reduce, variant]);

  const outerClass = `bkg-shell-seal${className ? ' ' + className : ''}`;
  // Inline overflow/radius makes the mark self-clipping outside .bkg-shell /
  // .ov-root; those scopes still layer on the paper border + shadow via CSS.
  const markStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius ?? Math.round(size / 6),
    overflow: 'hidden',
    display: 'inline-block',
    flex: '0 0 auto',
  };

  // ── header: lightweight poster emblem; the video is never fetched ───────────
  if (variant === 'header') {
    const mark = (
      <span className="bkg-mark" style={markStyle} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={posterSrc} alt="" style={FILL} />
      </span>
    );
    if (reduce) {
      return <span className={outerClass} style={{ display: 'inline-flex' }}>{mark}</span>;
    }
    return (
      <motion.span
        className={outerClass}
        style={{ display: 'inline-flex' }}
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {mark}
      </motion.span>
    );
  }

  // ── hero: full animated video (poster + reduced-motion fallback) ────────────
  if (reduce) {
    return (
      <span className={outerClass} style={{ display: 'inline-flex' }}>
        <span className="bkg-mark" style={markStyle} aria-hidden="true">
          <video src={videoSrc} poster={posterSrc} muted playsInline preload="none" style={FILL} />
        </span>
      </span>
    );
  }

  return (
    <motion.span
      className={outerClass}
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
        <span className="bkg-mark" style={markStyle} aria-hidden="true">
          <video ref={ref} src={videoSrc} poster={posterSrc} autoPlay loop muted playsInline preload="auto" style={FILL} />
        </span>
      </motion.span>
    </motion.span>
  );
}

export default Seal;
