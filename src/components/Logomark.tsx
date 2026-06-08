"use client";

import Image from "next/image";

interface LogomarkProps {
  size?: number;
  alt?: string;
}

// SEAL (2026-06-07): point at the canonical Viver hammer-roots mark
// (`/brand/bkg-mark.png`, the same square plate `brand/Logo.tsx` uses) instead
// of `/icon.png`. The seal rollout (PR #15/#16) swept the `Logo` component and
// the favicons but never updated `public/icon.png`, so this shared Logomark —
// the brand mark in the Killer App header (KillerAppNav), the error page, and
// CompassNav — was still rendering the old "B". One mark, every surface.
export default function Logomark({
  size = 32,
  alt = "Builder's Knowledge Garden",
}: LogomarkProps) {
  return (
    <Image
      src="/brand/bkg-mark.png"
      alt={alt}
      width={size}
      height={size}
      priority
      style={{
        width: size,
        height: size,
        display: "block",
      }}
    />
  );
}
