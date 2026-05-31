'use client';

/**
 * Seal — the animated botanical mark. Canonical asset is the umbrella "tree"
 * mark pulled from the public brand-assets bucket (see SEAL_SRC). Commit 1
 * renders a plain looping video; the Framer Motion spring-entrance +
 * "breathing" scale land in Commit 2 (this file gains the motion wrapper).
 */

import { useEffect, useRef } from 'react';
import { SEAL_SRC } from './config';

export interface SealProps {
  size?: number;
  radius?: number;
  /** Override the asset (defaults to the canonical umbrella mark). */
  src?: string;
  className?: string;
}

export function Seal({ size = 52, radius, src, className }: SealProps) {
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
    <span
      className={`bkg-mark${className ? ' ' + className : ''}`}
      style={{ width: size, height: size, borderRadius: radius ?? Math.round(size / 6) }}
      aria-hidden="true"
    >
      <video ref={ref} src={src ?? SEAL_SRC} autoPlay loop muted playsInline preload="auto" />
    </span>
  );
}

export default Seal;
