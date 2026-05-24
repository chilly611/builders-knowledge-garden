'use client';

/**
 * /intro — the 5-act cinematic for the May 2026 SF investor demo.
 *
 * Pure HTML/CSS/SVG/Framer-Motion. NO Three.js, NO video, NO audio. The
 * "wow moment" in Act 4 is a same-origin iframe of the LIVE killer app
 * (/killerapp/budget?...&hideShell=1) — investors interact with real product,
 * not a recording.
 *
 * Spec: app/docs/onboarding/DEMO-CINEMATIC-SPEC.md
 *
 * Acts:
 *   1. Umbrella       (~8s)  K logomark + tagline + 3 chrome orbit-out
 *   2. Problem        (~12s) four cross-dissolved vignettes
 *   3. #aikidotheAI   (~30s) split-screen voice + materializing platform
 *   4. Live killer app (user-controlled) — actual /killerapp/budget iframe
 *   5. Vision         (~12s) chromes pull apart + 5 future-domain dots + CTAs
 *
 * Keyboard:
 *   Esc        — skip to final CTAs
 *   Space      — pause / resume autoadvance
 *   →   or ↓   — next act (skip current)
 *   ←   or ↑   — previous act
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

// — Constants ——————————————————————————————————————————————————————————
const CHROME = {
  green: '#1D9E75', // Knowledge Garden
  warm:  '#D85A30', // Dream Machine primary
  warmB: '#C4A44A', // Dream Machine secondary
  red:   '#E8443A', // Killer App
};

const COLORS = {
  paper:  '#FAF6EB',  // trace paper, the cinematic background
  ink:    '#0F0F11',
  graphite: '#2A2A2D',
  faded:  '#7A7670',
  rule:   'rgba(15,15,17,0.10)',
  cream:  '#F4ECDC',
};

const DEMO_PROJECT_ID = '55730cd3-5225-493d-8b5c-49086d942565';

// Act durations in ms.
//   Act 1 (index 0) 8s → 6s (2026-05-19) → 8s (2026-05-22 AM, Chilly).
//     Rewound to 8s to fit the dramatic chrome zoom-past — chromes start
//     tiny (56px) at orbit positions, scale up over 3-4s with labels
//     readable, then zoom past the viewer (scale ~8×, fade out) leaving
//     the hammer + tagline alone for the act-end beat.
//   Act 2 (index 1) trimmed 12s → 8s → 10s (2026-05-21 AM, Chilly):
//     intermediate 8s left vignette 4's long "sequence, schedule…" title
//     unreadable. Back up to 10s with the vignette interval still 2s, so
//     vignettes 1-3 get 2s each and vignette 4 holds for 4s.
//   Act 3 (index 2) rewritten 2026-05-22 AM (Chilly): multi-input modality
//     panel (voice → sketch → blueprint → excel). 11s → 13s to fit the 4
//     input events. Cards re-timed to land alongside each input.
//   Act 4 (index 3) rewritten 2026-05-22 AM (single-page budget cinematic)
//     and AGAIN 2026-05-23 PM (Chilly): now a 7-phase multi-screen
//     workflow walkthrough — journey → sequencing → materials → equipment
//     → time-machine → code → contract. Hero budget always visible at top,
//     scales/pulses when each phase mutates it. 24s. "Open the real app"
//     escape link kept.
const ACT_DURATIONS_MS = [8000, 10000, 13000, 24000, 12000];
const TOTAL_ACTS = 5;

// Hook: reactive boolean for "are we under the mobile breakpoint right
// now." Used by Act 1 (chrome orbit positions + label positions need to
// be smaller on small viewports so they don't fly off-screen) and Act 3
// (auto-scroll only kicks in on phones where content overflows).
function useIsMobile(maxWidthPx = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, [maxWidthPx]);
  return isMobile;
}

// — Garden Logo (with SVG fallback) ————————————————————————————————————
// Loads a brand image from /public/logos/gardens/<file>; if the file is
// missing (404) or fails to decode, transparently falls back to the
// inline KLogomark / colored-dot below. Demo-safe: nothing breaks if the
// PNGs aren't yet uploaded.
//
// Expected files (drop these in app/public/logos/gardens/):
//   knowledge-gardens-tree.png   — umbrella mark (Act 1 + Act 5 center)
//   builders-hammer.png          — Builder's Garden (TopBar + Act 5 vertical)
//   health-garden-caduceus.png   — Health Garden (Act 5 vertical)
//   toxicology-caduceus.png      — Toxicology Garden (Act 5 vertical)
//   orchid-garden.png            — Orchid Garden (Act 5 vertical)
function GardenLogo({
  src,
  alt,
  size = 140,
  fallback,
  style,
}: {
  src: string;
  alt: string;
  size?: number;
  fallback: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [errored, setErrored] = useState(false);
  if (errored) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain', ...style }}
      onError={() => setErrored(true)}
    />
  );
}

// — K Logomark SVG ————————————————————————————————————————————————————
// Inline so the cinematic has no asset dependencies (the /public folder
// only has B-marks; no K). Stylized monogram in the same compass-rose
// register as the rest of the platform. Still used as the fallback for
// GardenLogo when the tree PNG isn't yet uploaded.
function KLogomark({ size = 140, color = COLORS.ink, accentColor }: { size?: number; color?: string; accentColor?: string }) {
  const stroke = Math.max(6, size / 14);
  const accent = accentColor || color;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-label="Knowledge Gardens">
      {/* Outer ring */}
      <circle cx="100" cy="100" r="92" fill="none" stroke={color} strokeWidth={stroke * 0.45} opacity={0.18} />
      {/* The K */}
      <g stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none">
        <line x1="58" y1="32" x2="58" y2="168" />
        <line x1="58" y1="100" x2="142" y2="32" />
        <line x1="58" y1="100" x2="142" y2="168" />
      </g>
      {/* Three chrome dots around the K (the platform's umbrella) */}
      <circle cx="158" cy="50" r="7" fill={CHROME.red} />
      <circle cx="158" cy="150" r="7" fill={CHROME.warm} />
      <circle cx="42" cy="100" r="7" fill={CHROME.green} />
      {/* Accent center dot */}
      <circle cx="58" cy="100" r={stroke * 0.55} fill={accent} />
    </svg>
  );
}

// — Top bar (always visible) —————————————————————————————————————————
function TopBar({ onSkip }: { onSkip: () => void }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '20px 28px',
      fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
      zIndex: 1000,
      pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: COLORS.graphite, pointerEvents: 'auto' }}>
        {/* Builder's hammer throughout the cinematic — the killer app's
            day-to-day mark. Falls back to the K logomark if the PNG isn't
            yet uploaded. */}
        <GardenLogo
          src="/logos/gardens/builders-hammer.png"
          alt="Builder's Garden"
          size={28}
          fallback={<KLogomark size={28} color={COLORS.ink} />}
        />
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Knowledge Gardens
        </span>
      </div>
      <button
        type="button"
        onClick={onSkip}
        style={{
          background: 'transparent',
          border: 'none',
          color: COLORS.graphite,
          fontSize: 13,
          fontFamily: 'inherit',
          fontWeight: 600,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          padding: '8px 14px',
          borderRadius: 6,
          pointerEvents: 'auto',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,15,17,0.06)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        aria-label="Skip cinematic and go to the killer app"
      >
        Skip → Start building
      </button>
    </div>
  );
}

// — Bottom act indicator + pause status —————————————————————————————————
function ActIndicator({ act, paused, onJump }: { act: number; paused: boolean; onJump: (n: number) => void }) {
  const labels = ['Umbrella', 'The problem', '#aikidotheAI', 'Live killer app', 'Tomorrow'];
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14,
      fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
      zIndex: 1000,
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 16px',
        background: 'rgba(250, 246, 235, 0.88)',
        border: `1px solid ${COLORS.rule}`,
        borderRadius: 999,
        backdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
      }}>
        {labels.map((label, i) => {
          const active = i === act;
          return (
            <button
              key={i}
              onClick={() => onJump(i)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              aria-label={`Jump to act ${i + 1}: ${label}`}
            >
              <span style={{
                width: active ? 22 : 8,
                height: 8,
                borderRadius: 4,
                background: active ? COLORS.ink : COLORS.rule,
                transition: 'width 220ms ease, background 220ms ease',
              }} />
              {active && (
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.ink, letterSpacing: '0.04em' }}>{label.toUpperCase()}</span>
              )}
            </button>
          );
        })}
      </div>
      {paused && (
        <span style={{
          fontSize: 11, fontWeight: 700, color: COLORS.faded, letterSpacing: '0.1em',
          textTransform: 'uppercase', pointerEvents: 'auto',
        }}>
          Paused · press space to resume
        </span>
      )}
    </div>
  );
}

// — ACT 1: Umbrella ————————————————————————————————————————————————————
// 2026-05-22 AM (Chilly): dramatic chrome zoom-past rewrite.
// New choreography across Act 1's 8s window:
//   0.0-0.5s   hammer fades in, smaller now (260px not 420px) so the
//              "anchor" reads as the killer-app within the umbrella —
//              the hammer + roots are the only fixed thing, the chromes
//              are what passes through.
//   0.5-1.8s   each chrome orbits out from behind the hammer at ~56px
//              scale, label visible below. Labels are NOT inside the
//              colored dot anymore; the dot background is removed since
//              the chrome PNGs now ARE the visual.
//   1.8-5.0s   chromes scale up from 1× to ~3.5×, drifting slightly
//              further outward. Labels scale with them. At peak they're
//              ~200px chrome + ~30px label, taking over the frame.
//   5.0-7.0s   chromes zoom past the viewer: scale 3.5× → 8×, opacity
//              fades 1 → 0. Each chrome staggered slightly so they don't
//              all leave at the exact same moment.
//   7.0-8.0s   hammer + tagline alone — the killer app holds the frame.
// Reduced motion: skips the zoom-past entirely, leaves chromes at small
// orbit positions with labels visible (the spec-equivalent still state).
// Single chrome's orbit-out → converge-toward-center → hold → zoom-past
// animation. State-machine driven; mobile-aware so the chromes stay in
// frame on small viewports.
//
// 2026-05-23 PM rewrite (Chilly mobile pass): old version moved chromes
// OUTWARD as they grew, which threw them off the phone viewport before
// they reached peak readability. New choreography (per Chilly):
//
//   'hidden'   t=0-0.4s    scale 0.4, opacity 0, at canvas center.
//   'orbit'    t=0.4-1.6s  move out to orbit pos at scale 1 — readable
//                           small, briefly visible.
//   'incoming' t=1.6-2.6s  grow + HEAD TOWARD CENTER. Chromes appear to
//                           barrel toward the viewer rather than exit
//                           the frame.
//   (hold)     t=2.6-5.5s  ~3s of dwell at the incoming target — peak
//                           readable size, on/near center. No new phase,
//                           Framer just sits at the target until the
//                           next state change.
//   'past'     t=5.5-7.0s  zoom past the viewer: scale balloons to ~9×,
//                           translate back through center (away from
//                           orbit direction) so it feels like the chrome
//                           passes through the camera, opacity fades.
//
// Mobile (≤768px): orbit + incoming positions scale to ~55% of desktop
// so the chrome's visual extent stays inside the phone viewport at peak.
const CHROME_SIZE = 120;
function ChromeOrbit({
  src, alt, orbitX, orbitY, staggerDelay, fallbackColor, reduced,
}: {
  src: string;
  alt: string;
  orbitX: number;
  orbitY: number;
  staggerDelay: number;
  fallbackColor: string;
  reduced: boolean;
}) {
  type Phase = 'hidden' | 'orbit' | 'incoming' | 'past';
  const [phase, setPhase] = useState<Phase>('hidden');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (reduced) { setPhase('orbit'); return; }
    const baseDelay = staggerDelay * 1000;
    const ts: number[] = [
      window.setTimeout(() => setPhase('orbit'),    400  + baseDelay),
      window.setTimeout(() => setPhase('incoming'), 1600 + baseDelay),
      window.setTimeout(() => setPhase('past'),     5500 + baseDelay),
    ];
    return () => { ts.forEach((t) => window.clearTimeout(t)); };
  }, [reduced, staggerDelay]);

  // Mobile-aware geometry. On phone (375px viewport ≈ 345px canvas at
  // 92vw), full desktop orbit (170, -160) overshoots the viewport edge.
  // 55% scaling keeps chromes inside the frame at all phases.
  const orbitMul    = isMobile ? 0.55 : 1.00;
  const incomingMul = isMobile ? 0.20 : 0.30;  // how close to center at peak
  const incomingScale = isMobile ? 2.4  : 3.5;
  const pastScale     = isMobile ? 7.0  : 9.0;

  const target =
    phase === 'orbit'    ? { x: orbitX * orbitMul,    y: orbitY * orbitMul,    scale: 1.0,             opacity: 1 } :
    phase === 'incoming' ? { x: orbitX * incomingMul, y: orbitY * incomingMul, scale: incomingScale,   opacity: 1 } :
    phase === 'past'     ? { x: -orbitX * 0.15,       y: -orbitY * 0.15,       scale: pastScale,       opacity: 0 } :
                           { x: 0,                    y: 0,                    scale: 0.4,             opacity: 0 };

  const duration =
    phase === 'orbit'    ? 1.2 :
    phase === 'incoming' ? 1.0 :
    phase === 'past'     ? 1.5 :
                           0.0;

  return (
    <motion.div
      initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
      animate={target}
      transition={{ duration: reduced ? 0 : duration, ease: phase === 'past' ? 'easeIn' : 'easeOut' }}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: CHROME_SIZE,
        height: CHROME_SIZE,
        marginLeft: -CHROME_SIZE / 2,
        marginTop: -CHROME_SIZE / 2,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <GardenLogo
        src={src}
        alt={alt}
        size={CHROME_SIZE}
        fallback={<span style={chromeOrbitFallback(fallbackColor)} />}
      />
    </motion.div>
  );
}

function Act1Umbrella({ reduced }: { reduced: boolean }) {
  return (
    <motion.section
      key="act1"
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.6 }}
      style={actWrap(COLORS.paper)}
      aria-label="Act 1: the umbrella"
    >
      <div className="bkg-intro-act1-canvas" style={{ position: 'relative', width: 460, height: 440, maxWidth: '92vw', zIndex: 1 }}>
        {/* Hammer — smaller now (260px) so chromes can take over the
            frame as they scale up. Hammer + roots remain visible
            throughout the act per Chilly: "the hammer and the roots
            being the important parts to be able to see." */}
        <motion.div
          initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: reduced ? 0 : 1.1, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 3 }}
        >
          <GardenLogo
            src="/logos/gardens/builders-hammer.png"
            alt="Builder's Garden — the killer app"
            size={260}
            style={{ maxWidth: '64vw', maxHeight: '40vh' }}
            fallback={<KLogomark size={180} color={COLORS.ink} />}
          />
        </motion.div>

        {/* Three chrome satellites — orbit out from behind the hammer,
            swell up, then ZOOM PAST the viewer. 2026-05-23 PM rewrite:
            previous version used a 5-keyframe Framer Motion `times` array
            which (regression-tested via prod inspection) was leaving the
            chromes stuck at opacity:0 scale:0.4 in real browsers — Framer
            12's keyframe + times path is flaky. Replaced with a
            ChromeOrbit component that uses a state-machine: each phase is
            a simple single-target Framer animation, much more reliable. */}
        <ChromeOrbit src="/logos/gardens/chrome-killer-app.png"      alt="Killer App"        orbitX={ 170} orbitY={-160} staggerDelay={0.00} fallbackColor={CHROME.red}   reduced={reduced} />
        <ChromeOrbit src="/logos/gardens/chrome-dream-machine.png"   alt="Dream Machine"     orbitX={-170} orbitY={ -30} staggerDelay={0.18} fallbackColor={CHROME.warm}  reduced={reduced} />
        <ChromeOrbit src="/logos/gardens/chrome-knowledge-garden.png" alt="Knowledge Garden" orbitX={ 150} orbitY={ 160} staggerDelay={0.36} fallbackColor={CHROME.green} reduced={reduced} />

        {/* Three labels at fixed canvas positions, diagonally opposite
            from each logo's orbit position so they're far from the logo
            throughout the zoom-past (logos zoom in direction of their
            orbit vector; labels sit in the opposite half-plane). Labels
            fade in around 1.5s (after the logos have appeared), hold
            through the swell phase, fade out as logos zoom past (~5.5s).
            They DON'T scale — so they stay readable independent of the
            logo dramatic motion. Positions chosen to avoid overlap with
            the centered hammer (extends ±130px from center). */}
        <Act1ChromeLabel x={-180} y={-180} text="KILLER APP"       reduced={reduced} />
        <Act1ChromeLabel x={ 190} y={-100} text="DREAM MACHINE"    reduced={reduced} />
        <Act1ChromeLabel x={-180} y={ 140} text="KNOWLEDGE GARDEN" reduced={reduced} />
      </div>

      {/* Typewriter sits BELOW the hammer with explicit z-index higher
          than the hammer's z-index so any visual overlap renders the text
          on top, not the image. */}
      <div className="bkg-intro-act1-tagline" style={{ textAlign: 'center', marginTop: 36, maxWidth: 720, position: 'relative', zIndex: 5 }}>
        <Typewriter
          text="the operating system for knowledge work,"
          delaySec={reduced ? 0 : 2.2}
          reduced={reduced}
        />
        <Typewriter
          text="one vertical at a time."
          delaySec={reduced ? 0 : 3.0}
          reduced={reduced}
          style={{ marginTop: 4 }}
        />
      </div>

      {/* Mobile fix (2026-05-21 AM, Chilly): on iPhone the hammer was
          taking ~55vh + the typewriter's marginTop of 36 + two lines of
          Archivo Black were pushing the second tagline line below the
          fold. Shrink the hammer harder on small viewports, tighten the
          gap, and drop the typewriter min font from 20px → 15px so both
          lines fit. */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .bkg-intro-act1-canvas {
            width: 320px !important;
            height: 300px !important;
          }
          .bkg-intro-act1-canvas img {
            max-height: 38vh !important;
          }
          .bkg-intro-act1-tagline {
            margin-top: 18px !important;
          }
          .bkg-intro-act1-tagline p {
            font-size: clamp(15px, 4.2vw, 22px) !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>
    </motion.section>
  );
}

// Standalone label for Act 1's three chromes — positioned at fixed canvas
// coordinates, fades in/out without scaling. Lives outside the chrome
// motion.divs so the dramatic zoom-past can't drag the labels into
// illegibly-large overlapping text.
//
// 2026-05-23 PM (Chilly mobile pass): label positions scale to ~55% on
// mobile so they stay inside the 345px-wide phone canvas. Font also
// scales 14px → 11px on mobile.
function Act1ChromeLabel({ x, y, text, reduced }: { x: number; y: number; text: string; reduced: boolean }) {
  const isMobile = useIsMobile();
  const posMul = isMobile ? 0.55 : 1.0;
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={reduced ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }}
      transition={reduced ? { duration: 0 } : {
        duration: 7.0,
        delay: 0.4,
        times: [0, 0.18, 0.28, 0.72, 0.95],
        ease: 'linear',
      }}
      style={{
        position: 'absolute',
        top: `calc(50% + ${y * posMul}px)`,
        left: `calc(50% + ${x * posMul}px)`,
        transform: 'translate(-50%, -50%)',
        fontSize: isMobile ? 11 : 14,
        fontWeight: 800,
        letterSpacing: '0.12em',
        color: COLORS.ink,
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
        textShadow: '0 1px 0 rgba(250,246,235,0.9)',
        zIndex: 4,
        pointerEvents: 'none',
      }}
    >
      {text}
    </motion.div>
  );
}

// — ACT 2: The problem ——————————————————————————————————————————————————
function Act2Problem({ reduced }: { reduced: boolean }) {
  // Each vignette is 3s in the wall clock; we crossfade between them.
  // Auto-cycle by tick so the user doesn't need to scroll.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduced) { setTick(3); return; }
    // 2026-05-21 AM (Chilly): 2.8s → 2.0s to match Act 2's 12s → 8s trim.
    const t = setInterval(() => setTick((v) => Math.min(v + 1, 3)), 2000);
    return () => clearInterval(t);
  }, [reduced]);

  // 2026-05-21 AM (Chilly): vignette 3 and 4 titles flipped from
  // problem-statement labels ("Contract in Word" / "Schedule on a
  // whiteboard") to BKG-pitch lines ("plain speak creates legit contracts"
  // / "sequence, schedule & budget with voice, whiteboard, sketches or
  // excel files…"). Two concerns surfaced to Chilly: (a) "Contract in Word"
  // read as "Microsoft Word" to non-tech contractors; (b) the whiteboard
  // line was too narrow about what tools work. Title fontSize is responsive
  // below to keep the 100+ char vignette 4 title from overflowing the 280px
  // text column.
  const vignettes = [
    { title: 'Estimate on a napkin',     accent: CHROME.warmB, art: <NapkinArt /> },
    { title: 'Code lookup by text',      accent: CHROME.warm,  art: <TextThreadArt /> },
    { title: 'plain speak creates legit contracts', accent: CHROME.green, art: <ContractArt /> },
    { title: 'sequence, schedule & budget with voice, whiteboard, sketches or excel files — whatever works for you works!', accent: CHROME.red, art: <WhiteboardArt /> },
  ];

  return (
    <motion.section
      key="act2"
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.6 }}
      style={actWrap(COLORS.cream)}
      aria-label="Act 2: the problem"
    >
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={eyebrow(COLORS.faded)}>THE DAILY REALITY</p>
        <h2 style={h2Style}>The job is hard.<br />The tools shouldn&apos;t be.</h2>
      </div>

      <div style={{
        position: 'relative',
        width: 'min(880px, 90vw)',
        height: 240,
        border: `1px solid ${COLORS.rule}`,
        borderRadius: 14,
        background: COLORS.paper,
        overflow: 'hidden',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.7 }}
            style={{
              position: 'absolute', inset: 0,
              display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 24,
              padding: 24,
              alignItems: 'center',
            }}
          >
            <div style={{ minWidth: 0 }}>
              {vignettes[tick].art}
            </div>
            <div>
              <div style={{
                width: 12, height: 12, borderRadius: 6,
                background: vignettes[tick].accent, marginBottom: 12,
              }} />
              <div style={{
                // 2026-05-21 AM (Chilly): fontSize responsive to title
                // length so vignette 4's 100+ char line wraps cleanly
                // inside the 280px text column instead of overflowing.
                fontSize: vignettes[tick].title.length > 50 ? 16 : 22,
                fontWeight: 800, color: COLORS.ink,
                fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
                lineHeight: 1.25,
              }}>
                {vignettes[tick].title}
              </div>
              <div style={{ fontSize: 13, color: COLORS.faded, marginTop: 10, lineHeight: 1.5 }}>
                Every contractor we&apos;ve talked to. Every day.
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress ticks */}
        <div style={{ position: 'absolute', bottom: 16, left: 24, right: 24, display: 'flex', gap: 6 }}>
          {vignettes.map((_, i) => (
            <span key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= tick ? COLORS.ink : COLORS.rule,
              transition: 'background 220ms ease',
            }} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

// SVG vignettes used in Act 2.
function NapkinArt() {
  return (
    <svg viewBox="0 0 360 200" width="100%" height={180}>
      <rect x="20" y="20" width="320" height="160" fill="#FFFCF5" stroke={COLORS.rule} strokeWidth="1.5" transform="rotate(-2 180 100)" />
      <text x="60" y="80" fontFamily="Comic Sans MS, cursive" fontSize="22" fill={COLORS.ink} transform="rotate(-3 180 100)">drywall ~ $4800?</text>
      <text x="60" y="120" fontFamily="Comic Sans MS, cursive" fontSize="22" fill={COLORS.ink} transform="rotate(-3 180 100)">frmg crew × 3 days</text>
      <text x="60" y="160" fontFamily="Comic Sans MS, cursive" fontSize="28" fontWeight="bold" fill={CHROME.red} transform="rotate(-3 180 100)">$48k?</text>
    </svg>
  );
}
function TextThreadArt() {
  return (
    <svg viewBox="0 0 360 200" width="100%" height={180}>
      <rect x="20" y="20" width="320" height="160" fill="#F0F4F8" stroke={COLORS.rule} strokeWidth="1" rx="14" />
      <rect x="40" y="40" width="220" height="28" fill="#E8F0F7" rx="14" />
      <text x="55" y="59" fontFamily="ui-sans-serif" fontSize="12" fill={COLORS.ink}>@Mike u know stair handrail code?</text>
      <rect x="100" y="80" width="220" height="28" fill="#0084FF" rx="14" />
      <text x="115" y="99" fontFamily="ui-sans-serif" fontSize="12" fill="#fff">idk lemme ask jim</text>
      <rect x="40" y="120" width="120" height="28" fill="#E8F0F7" rx="14" />
      <text x="55" y="139" fontFamily="ui-sans-serif" fontSize="12" fill={COLORS.ink}>...3 days later</text>
    </svg>
  );
}
function ContractArt() {
  return (
    <svg viewBox="0 0 360 200" width="100%" height={180}>
      <rect x="40" y="14" width="280" height="172" fill="#FFFFFF" stroke={COLORS.rule} strokeWidth="1.5" />
      <text x="60" y="40" fontFamily="Times New Roman" fontSize="14" fontWeight="bold" fill={COLORS.ink}>AGREEMENT</text>
      <text x="60" y="64" fontFamily="Arial" fontSize="11" fill={COLORS.graphite}>This agreement between [CLIENT NAME]</text>
      <text x="60" y="80" fontFamily="Times New Roman" fontSize="11" fill={COLORS.graphite}>and Contractor for work at</text>
      <text x="60" y="100" fontFamily="Arial" fontSize="11" fill={CHROME.red} fontWeight="bold">[ADDRESS GOES HERE]</text>
      <text x="60" y="130" fontFamily="Times New Roman" fontSize="11" fill={COLORS.graphite}>for the sum of $___________</text>
      <text x="60" y="160" fontFamily="Comic Sans MS" fontSize="10" fill={COLORS.faded}>fonts not matching ↑↑↑</text>
    </svg>
  );
}
function WhiteboardArt() {
  return (
    <svg viewBox="0 0 360 200" width="100%" height={180}>
      <rect x="20" y="20" width="320" height="160" fill="#FBFAF6" stroke="#D6CDB6" strokeWidth="3" />
      <text x="40" y="48" fontFamily="Marker Felt, cursive" fontSize="16" fill="#1F77B4">Mon — framing</text>
      <line x1="40" y1="44" x2="200" y2="44" stroke={CHROME.red} strokeWidth="2" />
      <text x="40" y="78" fontFamily="Marker Felt, cursive" fontSize="16" fill="#4D7C2A">Tue — drywall?</text>
      <text x="40" y="108" fontFamily="Marker Felt, cursive" fontSize="16" fill="#D65A4A">Wed — plumb (J. out?)</text>
      <text x="40" y="148" fontFamily="Marker Felt, cursive" fontSize="22" fontWeight="bold" fill={COLORS.ink}>WHO&apos;S ON MONDAY???</text>
    </svg>
  );
}

// Journey strip assets (2026-05-22 PM, Chilly): 12 conceptual stage
// illustrations from `photos research/` copied into app/public/journey/.
// Scroll across the bottom of Act 3 as a marquee to show the FULL build
// journey investors are watching unfold. Order = build sequence narrative:
// begin → sketch → plan → structural → sizeup → sequence → tools →
// equipment → build → lock-in → journey-map → tree-portal-end.
const JOURNEY_STAGES: Array<{ file: string; label: string }> = [
  { file: 'beginning-journey.jpg',    label: 'Begin'      },
  { file: 'sketch-journey.JPG',       label: 'Sketch'     },
  { file: 'plan-journey.png',         label: 'Plan'       },
  { file: 'Structural-journey.jpeg',  label: 'Structural' },
  { file: 'sizeup-journey.png',       label: 'Size up'    },
  { file: 'sequencing-journey.JPG',   label: 'Sequence'   },
  { file: 'tool-journey.PNG',         label: 'Tools'      },
  { file: 'equipment-journey.PNG',    label: 'Equipment'  },
  { file: 'build-journey.png',        label: 'Build'      },
  { file: 'lock-journey.png',         label: 'Lock it in' },
  { file: 'Journey-map-sketch.png',   label: 'The map'    },
  { file: 'tree-portal-journey.PNG',  label: 'The garden' },
];

// Horizontal marquee of all 12 journey stages, scrolling right → left
// as a seamless infinite loop. 2026-05-23 PM (Chilly): previous version
// did one right-to-left pass over 13s, which left blank space at the
// end of the act and was too fast to read. Now: duplicate the items
// array so the track is 2× as wide; CSS @keyframes translateX from 0 to
// -50% in a slow linear loop (50% lands the second copy exactly where
// the first started → seamless). Speed tuned to ~50px/s so each image
// gets several seconds of viewing time as it crosses.
function Act3JourneyStrip({ reduced }: { reduced: boolean }) {
  const items = [...JOURNEY_STAGES, ...JOURNEY_STAGES];
  return (
    <div
      className="bkg-intro-act3-strip"
      style={{
        position: 'absolute',
        bottom: 70,   // clears ActIndicator (sits at bottom: 24, ~40px tall)
        left: 0,
        right: 0,
        height: 130,
        overflow: 'hidden',
        pointerEvents: 'none',
        // Edge fades so images dissolve into the parchment at the strip boundaries.
        maskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
      }}
    >
      <div
        className="bkg-intro-act3-marquee"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'flex',
          gap: 26,
          alignItems: 'flex-end',
          padding: '0 12px',
          width: 'max-content',
          height: '100%',
          // CSS animation handles the loop. Duration tuned to ~40s for one
          // full sweep — slow enough each image gets ~3s of visibility.
          animation: reduced ? 'none' : 'bkg-intro-marquee 40s linear infinite',
        }}
      >
        {items.map((s, i) => (
          <div key={`${s.file}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <img
              src={`/journey/${encodeURIComponent(s.file)}`}
              alt={s.label}
              style={{
                width: 110,
                height: 92,
                objectFit: 'contain',
                mixBlendMode: 'multiply',  // dissolve white/cream image backgrounds into parchment
              }}
              loading="eager"
            />
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: COLORS.ink,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes bkg-intro-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (max-width: 768px) {
          .bkg-intro-act3-strip {
            bottom: 60px !important;
            height: 90px !important;
          }
          .bkg-intro-act3-strip img {
            width: 70px !important;
            height: 60px !important;
          }
          .bkg-intro-act3-strip span {
            font-size: 9px !important;
          }
        }
      `}</style>
    </div>
  );
}

// — ACT 3: #aikidotheAI ————————————————————————————————————————————————
// 2026-05-22 AM (Chilly): rewrite of the left panel from "one voice
// transcript" to "four input modalities accumulating" — voice transcript,
// then a sketch upload, then a blueprint upload, then an Excel upload.
// Each input module appears in sequence to show the platform ingesting
// diverse artifact types (the killer-app idea: contractors don't speak
// alone — they sketch, they email blueprints, they wrangle Excel). Right
// pane keeps the sliding-window card stream from yesterday, but cards are
// re-timed so each one materializes just after its triggering input.
// Total Act 3 stretched 11s → 13s to fit the 4 input events without
// rushing.
function Act3Aikido({ reduced }: { reduced: boolean }) {
  const isMobile = useIsMobile();
  const fullTranscript =
    "I want to build a custom modern farmhouse in Marin. 1,800 square feet. 3 bed 2 bath. Slab on grade. Late summer 2026.";

  const [chars, setChars] = useState(0);
  useEffect(() => {
    if (reduced) { setChars(fullTranscript.length); return; }
    let i = 0;
    const tick = setInterval(() => {
      i += 4;
      setChars((c) => {
        if (c >= fullTranscript.length) {
          clearInterval(tick);
          return fullTranscript.length;
        }
        return Math.min(fullTranscript.length, c + 4);
      });
    }, 80);
    return () => clearInterval(tick);
  }, [reduced]);

  // Four input modalities, accumulating left-to-right (top-to-bottom in
  // the panel). Each appears at its `at` offset. Voice is at 0 and
  // contains the live transcript above; the other three are upload-style
  // modules with a filename + an inline SVG artifact representation.
  const inputs: Array<{ at: number; key: string; kind: 'voice' | 'sketch' | 'blueprint' | 'excel'; filename?: string }> = useMemo(() => [
    { at: 0,   key: 'voice',     kind: 'voice' },
    { at: 2.8, key: 'sketch',    kind: 'sketch',    filename: 'marin-floorplan-rough.jpg' },
    { at: 5.0, key: 'blueprint', kind: 'blueprint', filename: 'foundation-plan-v3.dwg' },
    { at: 7.2, key: 'excel',     kind: 'excel',     filename: 'preliminary-budget.xlsx' },
  ], []);

  // Right-panel cards — re-timed so each lands ~1.0-1.5s after the input
  // that triggered it. Pattern: Voice → Project, Sketch → Estimate,
  // Blueprint → Code, Excel → Contract, Final-beat → Journey synthesis.
  const cards: Array<{ at: number; render: () => React.ReactNode; key: string }> = useMemo(() => [
    { at: 1.5,  key: 'project',  render: () => <CardProject /> },
    { at: 4.0,  key: 'estimate', render: () => <CardEstimate /> },
    { at: 6.5,  key: 'code',     render: () => <CardCode /> },
    { at: 9.0,  key: 'contract', render: () => <CardContract /> },
    { at: 11.0, key: 'journey',  render: () => <CardJourney /> },
  ], []);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (reduced) { setElapsed(30); return; }
    const start = performance.now();
    const id = window.setInterval(() => setElapsed((performance.now() - start) / 1000), 100);
    return () => window.clearInterval(id);
  }, [reduced]);

  // Auto-scroll the Act 3 content over the 13s duration with a ramping
  // S-curve ease (slow start → faster middle → slow end). 2026-05-23 PM
  // (Chilly mobile pass): on phone the inputs + cards stacked into a
  // single column overflow the viewport and content animates in below
  // the fold. The scroll reveals content as it lands, then settles. On
  // desktop the scroll is gentler (only ~120px) — adds a cinematic
  // camera-pan feel without disorienting.
  const ACT3_DURATION_SEC = 13;
  const scrollProgress = (() => {
    if (reduced) return 1;
    const p = Math.max(0, Math.min(1, elapsed / ACT3_DURATION_SEC));
    // S-curve ease (in-out quad)
    return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  })();
  const totalScrollPx = isMobile ? 480 : 120;
  const scrollY = -scrollProgress * totalScrollPx;

  return (
    <motion.section
      key="act3"
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.6 }}
      style={actWrap(COLORS.paper, {
        gap: 24,
        // Mobile: align content top so we can scroll DOWN from there;
        // desktop keeps the vertical-center default. Padding-top is
        // tighter on mobile to give content more visible room.
        justifyContent: isMobile ? 'flex-start' : 'center',
        paddingTop: isMobile ? 50 : 80,
      })}
      aria-label="Act 3: voice in, project out"
    >
      {/* Scroll wrapper — translateY over time to reveal stacked content
          on mobile. Desktop gets a gentler pan for cinematic feel. */}
      <motion.div
        animate={{ y: scrollY }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          width: '100%',
          willChange: 'transform',
        }}
      >
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          ...h2Style,
          fontSize: 'clamp(34px, 5vw, 56px)',
          letterSpacing: '-0.02em',
        }}>
          <span style={{ color: CHROME.red }}>#</span>
          <span style={{ color: COLORS.ink }}>aikido</span>
          <span style={{ color: CHROME.warm }}>the</span>
          <span style={{ color: COLORS.ink }}>AI</span>
        </h2>
        <p style={{ marginTop: 8, fontSize: 15, color: COLORS.graphite, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
          Voice, sketches, blueprints, spreadsheets — whatever you have. Estimate, code, contract, schedule out. The platform does the parsing.
        </p>
      </div>

      <div className="bkg-intro-act3-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 38%) 1fr',
        gap: 28,
        width: 'min(1080px, 92vw)',
        maxWidth: '100%',
      }}>
        {/* LEFT: input modalities accumulate as new ones arrive. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <AnimatePresence>
              {inputs.filter((i) => elapsed >= i.at).map((input) => (
                <motion.div
                  key={input.key}
                  initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: reduced ? 0 : 0.5, ease: 'easeOut' }}
                >
                  {input.kind === 'voice' ? (
                    <VoiceInputModule chars={chars} fullTranscript={fullTranscript} reduced={reduced} />
                  ) : (
                    <UploadInputModule kind={input.kind} filename={input.filename ?? ''} reduced={reduced} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
        </div>

        {/* RIGHT: cards stream in. Sliding window of 2 visible cards
            (oldest drifts up + fades as new ones populate). Reduced
            motion: show all visible cards. */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minWidth: 0,
          minHeight: 220,
        }}>
          <AnimatePresence>
            {cards
              .filter((c) => elapsed >= c.at)
              .slice(reduced ? 0 : -2)
              .map((card, idx, arr) => {
                const isLatest = idx === arr.length - 1;
                return (
                  <motion.div
                    key={card.key}
                    initial={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.96 }}
                    animate={{
                      opacity: isLatest ? 1 : 0.55,
                      y: 0,
                      scale: isLatest ? 1 : 0.96,
                    }}
                    exit={{ opacity: 0, y: -40, scale: 0.94 }}
                    transition={{ duration: reduced ? 0 : 0.4, ease: 'easeOut' }}
                  >
                    {card.render()}
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      </div>
      </motion.div>

      {/* Journey marquee — scrolls all 12 stages across the bottom over
          Act 3's full 13s duration. Positioned absolute inside the act
          section so it doesn't disturb the centered content above (and
          isn't affected by the content-scroll wrapper). */}
      <Act3JourneyStrip reduced={reduced} />

      <style jsx global>{`
        @keyframes bkg-caret { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @media (max-width: 768px) {
          .bkg-intro-act3-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </motion.section>
  );
}

// Voice input module — the mic + the live transcript. Used as the first
// of four input modalities in Act 3.
function VoiceInputModule({ chars, fullTranscript, reduced }: { chars: number; fullTranscript: string; reduced: boolean }) {
  const done = chars >= fullTranscript.length;
  return (
    <div style={voicePanel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <MicPulse reduced={reduced} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: CHROME.warm, textTransform: 'uppercase' }}>
          {done ? 'Voice captured ✓' : 'Listening'}
        </span>
      </div>
      <p style={{ ...transcriptStyle, fontSize: 15 }}>
        {fullTranscript.slice(0, chars)}
        <span style={{
          display: 'inline-block', width: 6, height: 18, marginLeft: 2,
          background: COLORS.ink, verticalAlign: 'text-bottom',
          opacity: done ? 0 : 1,
          animation: reduced || done ? 'none' : 'bkg-caret 0.9s steps(2) infinite',
        }} />
      </p>
    </div>
  );
}

// Upload input module — used for sketch, blueprint, excel. Each has a
// distinct mini-art SVG, a filename, and an "Uploaded ✓" indicator.
function UploadInputModule({ kind, filename, reduced }: { kind: 'sketch' | 'blueprint' | 'excel'; filename: string; reduced: boolean }) {
  const meta = {
    sketch:    { label: 'Sketch uploaded',    accent: CHROME.warmB, art: <UploadArtSketch /> },
    blueprint: { label: 'Blueprint uploaded', accent: CHROME.warm,  art: <UploadArtBlueprint /> },
    excel:     { label: 'Excel uploaded',     accent: CHROME.green, art: <UploadArtExcel /> },
  }[kind];
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 12,
      background: '#fff',
      border: `1px solid ${COLORS.rule}`,
      borderLeft: `3px solid ${meta.accent}`,
      display: 'flex', alignItems: 'center', gap: 12,
      minWidth: 0,
    }}>
      <div style={{
        flexShrink: 0,
        width: 44, height: 44, borderRadius: 8,
        background: 'rgba(15,15,17,0.04)',
        border: `1px solid ${COLORS.rule}`,
        display: 'grid', placeItems: 'center',
      }}>
        {meta.art}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          color: meta.accent, textTransform: 'uppercase',
        }}>
          {meta.label}
        </div>
        <div style={{
          fontSize: 12, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          color: COLORS.graphite, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {filename}
        </div>
      </div>
      <motion.span
        initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.25, ease: 'backOut' }}
        style={{ flexShrink: 0, fontSize: 18, color: CHROME.green, fontWeight: 700 }}
        aria-hidden
      >
        ✓
      </motion.span>
    </div>
  );
}

// Mini SVG artifacts for the upload modules. Each ~28x28 inside a 44x44
// tile. Kept simple so they read at this size.
function UploadArtSketch() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
      {/* Rough rectangle "floorplan" with a couple interior walls */}
      <g fill="none" stroke={COLORS.ink} strokeWidth="1.5" strokeLinecap="round">
        <path d="M5 6 L27 6 L27 26 L5 26 Z" strokeDasharray="0" transform="rotate(-2 16 16)" />
        <path d="M16 6 L16 18" strokeWidth="1.2" />
        <path d="M16 18 L27 18" strokeWidth="1.2" />
        <path d="M9 22 L13 22" strokeWidth="1.6" stroke={CHROME.warm} />
      </g>
    </svg>
  );
}
function UploadArtBlueprint() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
      {/* Technical grid + a dimensioned frame */}
      <g stroke="rgba(15,15,17,0.20)" strokeWidth="0.6">
        <line x1="0" y1="8" x2="32" y2="8" />
        <line x1="0" y1="16" x2="32" y2="16" />
        <line x1="0" y1="24" x2="32" y2="24" />
        <line x1="8" y1="0" x2="8" y2="32" />
        <line x1="16" y1="0" x2="16" y2="32" />
        <line x1="24" y1="0" x2="24" y2="32" />
      </g>
      <rect x="6" y="8" width="20" height="14" fill="none" stroke={COLORS.ink} strokeWidth="1.6" />
      <line x1="6" y1="6" x2="26" y2="6" stroke={CHROME.warm} strokeWidth="1" />
      <line x1="6" y1="4" x2="6" y2="8" stroke={CHROME.warm} strokeWidth="1" />
      <line x1="26" y1="4" x2="26" y2="8" stroke={CHROME.warm} strokeWidth="1" />
    </svg>
  );
}
function UploadArtExcel() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
      {/* Spreadsheet — header row + 3 data rows */}
      <rect x="4" y="5" width="24" height="22" fill="#fff" stroke={COLORS.ink} strokeWidth="1.2" rx="1" />
      <rect x="4" y="5" width="24" height="5" fill={CHROME.green} />
      <line x1="4" y1="14" x2="28" y2="14" stroke={COLORS.rule} strokeWidth="0.8" />
      <line x1="4" y1="20" x2="28" y2="20" stroke={COLORS.rule} strokeWidth="0.8" />
      <line x1="12" y1="10" x2="12" y2="27" stroke={COLORS.rule} strokeWidth="0.8" />
      <line x1="20" y1="10" x2="20" y2="27" stroke={COLORS.rule} strokeWidth="0.8" />
      <text x="6" y="18" fontSize="3.5" fill={COLORS.graphite} fontFamily="ui-monospace">86k</text>
      <text x="14" y="18" fontSize="3.5" fill={COLORS.graphite} fontFamily="ui-monospace">142k</text>
      <text x="22" y="18" fontSize="3.5" fill={COLORS.graphite} fontFamily="ui-monospace">71k</text>
    </svg>
  );
}

function MicPulse({ reduced }: { reduced: boolean }) {
  return (
    <span style={{
      position: 'relative', width: 36, height: 36, display: 'inline-grid', placeItems: 'center',
      borderRadius: 18, background: CHROME.warm, color: '#fff',
    }} aria-hidden>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
      </svg>
      {!reduced && (
        <span style={{
          position: 'absolute', inset: -6, borderRadius: 24,
          border: `2px solid ${CHROME.warm}`,
          opacity: 0.5,
          animation: 'bkg-mic-pulse 1.6s ease-out infinite',
        }} />
      )}
      <style jsx global>{`
        @keyframes bkg-mic-pulse {
          0%   { transform: scale(0.85); opacity: 0.6; }
          80%  { transform: scale(1.4);  opacity: 0;   }
          100% { transform: scale(1.4);  opacity: 0;   }
        }
      `}</style>
    </span>
  );
}

function CardProject() {
  return (
    <div style={card(CHROME.red)}>
      <div style={cardEyebrow}>PROJECT CREATED</div>
      <div style={cardTitle}>Modern farmhouse in Marin</div>
      <div style={cardMeta}>CRC R301 · R403.1 · $750k–$1.06M</div>
    </div>
  );
}
function CardEstimate() {
  const rows = [
    ['Foundation',  '$ 86,400'],
    ['Framing',     '$142,800'],
    ['Title 24 envelope', '$ 71,200'],
    ['MEP rough-in', '$ 98,100'],
  ];
  return (
    <div style={card(CHROME.warmB)}>
      <div style={cardEyebrow}>AI ESTIMATE</div>
      <div style={{ marginTop: 6, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 12, color: COLORS.graphite }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px dashed ${COLORS.rule}` }}>
            <span>{k}</span><span>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontWeight: 700, color: COLORS.ink }}>
          <span>Midpoint</span><span>$905,000</span>
        </div>
      </div>
    </div>
  );
}
function CardCode() {
  return (
    <div style={card(CHROME.warm)}>
      <div style={cardEyebrow}>CODE CITATION</div>
      <div style={cardTitle}>CRC R327 — Wildland-Urban Interface</div>
      <div style={cardMeta}>Class A roof · ember-resistant vents · ignition-resistant siding</div>
    </div>
  );
}
function CardContract() {
  return (
    <div style={card(CHROME.green)}>
      <div style={cardEyebrow}>CONTRACT DRAFT</div>
      <div style={cardTitle}>Client Agreement · Modern farmhouse in Marin</div>
      <div style={cardMeta}>Contract amount $905,000 · Marin County, CA</div>
    </div>
  );
}
function CardJourney() {
  // 2026-05-23 PM (Chilly): no more blank slots — all 4 stages now have
  // real illustrations. Journey order reads as a real build sequence:
  // Size up → Plan it out → Lock it in (active) → Build. Each image gets
  // mixBlendMode: multiply since the /journey/ source files still have
  // cream backgrounds (the transparency PIL pass only processed
  // chrome-* + Act-5-vertical PNGs). The active stage gets a chrome-warm
  // accent ring + label color to read as "where we are right now."
  const stage = (label: string, src: string, active: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 56 }}>
      <div style={{
        padding: 3,
        border: active ? `2px solid ${CHROME.warm}` : `1px solid transparent`,
        borderRadius: 6,
        background: active ? 'rgba(216,90,48,0.06)' : 'transparent',
      }}>
        <GardenLogo
          src={src}
          alt={label}
          size={42}
          style={{ mixBlendMode: 'multiply' }}
          fallback={
            <span style={{
              display: 'inline-block', width: 42, height: 42, borderRadius: 4,
              background: active ? COLORS.ink : 'rgba(15,15,17,0.06)',
            }} />
          }
        />
      </div>
      <span style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
        color: active ? CHROME.warm : COLORS.graphite,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </div>
  );
  return (
    <div style={card(COLORS.ink)}>
      <div style={cardEyebrow}>JOURNEY</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {stage('Size up',    '/journey/sizeup-journey.png',  false)}
        <span style={journeyArrow}>→</span>
        {stage('Plan it out', '/journey/plan-journey.png',   false)}
        <span style={journeyArrow}>→</span>
        {stage('Lock it in', '/journey/lock-journey.png',    true)}
        <span style={journeyArrow}>→</span>
        {stage('Build',      '/journey/build-journey.png',   false)}
      </div>
    </div>
  );
}

// — ACT 4: Multi-screen killer-app cinematic ————————————————————————————
// 2026-05-23 PM (Chilly): deep rewrite from the prior single-page budget
// cinematic. Now cycles through 7 phases of different killerapp workflows
// AT HYPER SPEED, with the hero budget value always visible at top and
// SCALING/CHANGING in response to each workflow action. "Money is the
// spine" — each phase makes that visible:
//
//   Phase 0  0.0-3.0s  /killerapp                       Journey + initial estimate    $0 → $750k
//   Phase 1  3.0-6.0s  /killerapp/workflows/sequencing  Task list optimizing          $750k → $820k
//   Phase 2  6.0-10.0s /killerapp/workflows/estimating  Materials grid populates      $820k → $890k
//   Phase 3  10.0-13.5s /killerapp/workflows/equipment  Equipment cards add up        $890k → $930k
//   Phase 4  13.5-17.0s /killerapp/time-machine          Rewind dial — budget scrubs   $930k → $820k → $930k
//   Phase 5  17.0-20.0s /killerapp/workflows/code-compliance Code refinement          $930k → $905k
//   Phase 6  20.0-24.0s /killerapp/workflows/contract-templates  Contract locks       $905k (pulse)
//
// The browser-chrome URL at the top updates per phase. The hero budget
// counts smoothly between keyframes (no abrupt jumps) and scales briefly
// when the delta exceeds a threshold. Phase content uses AnimatePresence
// for clean cross-fades. "Open the real app" escape link at the bottom.

// Budget value at each keyframe (in seconds, dollars). Interpolated
// linearly between keyframes. Final settles at $905k (canonical Marin
// farmhouse midpoint per DEMO-MAY20-PLAN).
const ACT4_BUDGET_KF: Array<{ t: number; v: number }> = [
  { t:  0.0, v:       0 },
  { t:  1.5, v:  750000 },  // initial range midpoint
  { t:  3.0, v:  750000 },  // hold during journey
  { t:  4.5, v:  820000 },  // sequencing optimization +70k
  { t:  6.0, v:  820000 },  // hold
  { t:  8.5, v:  890000 },  // materials add +70k
  { t: 10.0, v:  890000 },  // hold
  { t: 12.0, v:  930000 },  // equipment +40k
  { t: 13.5, v:  930000 },  // hold
  { t: 14.5, v:  820000 },  // time-machine rewind — preview past state
  { t: 16.5, v:  820000 },  // hold (showing the past)
  { t: 17.2, v:  930000 },  // "Return to live" snap back
  { t: 18.5, v:  905000 },  // code refinement -25k
  { t: 24.0, v:  905000 },  // final hold
];

type Act4Phase = 'journey' | 'sequencing' | 'materials' | 'equipment' | 'timemachine' | 'code' | 'contract';

function act4PhaseAt(elapsed: number): Act4Phase {
  if (elapsed <  3.0) return 'journey';
  if (elapsed <  6.0) return 'sequencing';
  if (elapsed < 10.0) return 'materials';
  if (elapsed < 13.5) return 'equipment';
  if (elapsed < 17.0) return 'timemachine';
  if (elapsed < 20.0) return 'code';
  return 'contract';
}

const ACT4_PHASE_URL: Record<Act4Phase, string> = {
  journey:     '/killerapp?project=55730cd3...',
  sequencing:  '/killerapp/workflows/sequencing',
  materials:   '/killerapp/workflows/estimating',
  equipment:   '/killerapp/workflows/equipment',
  timemachine: '/killerapp/time-machine',
  code:        '/killerapp/workflows/code-compliance',
  contract:    '/killerapp/workflows/contract-templates',
};

const ACT4_PHASE_LABEL: Record<Act4Phase, string> = {
  journey:     'Project · Marin farmhouse',
  sequencing:  'Sequencing — optimize the build order',
  materials:   'Estimating — materials takeoff',
  equipment:   'Equipment & subs',
  timemachine: 'Time Machine — rewind the budget',
  code:        'Code compliance — Title 24 + WUI',
  contract:    'Contracts — draft & lock the agreement',
};

// Linear interpolation between budget keyframes.
function act4BudgetAt(elapsed: number): number {
  if (elapsed <= ACT4_BUDGET_KF[0].t) return ACT4_BUDGET_KF[0].v;
  for (let i = 0; i < ACT4_BUDGET_KF.length - 1; i++) {
    const a = ACT4_BUDGET_KF[i];
    const b = ACT4_BUDGET_KF[i + 1];
    if (elapsed >= a.t && elapsed < b.t) {
      const p = (elapsed - a.t) / (b.t - a.t);
      return a.v + (b.v - a.v) * p;
    }
  }
  return ACT4_BUDGET_KF[ACT4_BUDGET_KF.length - 1].v;
}

// Returns the |dBudget/dt| over a small window centered at `elapsed`.
// Used to scale the hero up briefly when the budget changes rapidly.
function act4BudgetVelocity(elapsed: number): number {
  const dt = 0.2;
  const a = act4BudgetAt(Math.max(0, elapsed - dt));
  const b = act4BudgetAt(elapsed + dt);
  return Math.abs(b - a) / (2 * dt);
}

function formatUsd(n: number, withDollar = true): string {
  const sign = withDollar ? '$' : '';
  return sign + Math.round(n).toLocaleString('en-US');
}

// Each phase-view component receives the elapsed time WITHIN its phase
// (not the overall act elapsed), making each one independently testable
// and easier to animate. Lifted to module scope so they don't get
// re-created on every Act4LiveBudget render.

function Act4PhaseJourney() {
  // Show 4 of the 12 journey illustrations in a row — the "build arc."
  // Highlight "Begin" since this is the project-start phase.
  const stages = [
    { file: 'beginning-journey.jpg', label: 'Begin',     active: true  },
    { file: 'sketch-journey.JPG',    label: 'Sketch',    active: false },
    { file: 'plan-journey.png',      label: 'Plan',      active: false },
    { file: 'sizeup-journey.png',    label: 'Size up',   active: false },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 13, color: COLORS.graphite, lineHeight: 1.5 }}>
        Modern farmhouse · Marin County, CA · 1,800 sf · slab on grade · Q3 2026
      </div>
      <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
        {stages.map((s) => (
          <div key={s.file} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              padding: 6,
              border: s.active ? `2px solid ${CHROME.warm}` : `1px solid ${COLORS.rule}`,
              borderRadius: 12,
              background: s.active ? 'rgba(216,90,48,0.06)' : 'transparent',
              boxShadow: s.active ? `0 0 0 4px rgba(216,90,48,0.10)` : 'none',
            }}>
              <img
                src={`/journey/${encodeURIComponent(s.file)}`}
                alt={s.label}
                style={{ width: 120, height: 100, objectFit: 'contain', mixBlendMode: 'multiply', display: 'block' }}
              />
            </div>
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
              color: s.active ? CHROME.warm : COLORS.graphite,
              textTransform: 'uppercase',
            }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <div style={{
        fontSize: 12, color: COLORS.faded, textAlign: 'center', fontStyle: 'italic',
      }}>
        Initial estimate range: $750k – $1.06M (CRC R301, Title 24 baseline)
      </div>
    </div>
  );
}

function Act4PhaseSequencing({ localT }: { localT: number }) {
  // 5 tasks, each "checks itself in" as localT progresses. Final beat:
  // "Sequencing optimized — +$70k recovered" hint slides in.
  const tasks = [
    { label: 'Foundation',      days:  3, cost: 110000, at: 0.0 },
    { label: 'Framing',         days: 12, cost: 165000, at: 0.4 },
    { label: 'MEP rough-in',    days:  8, cost: 112000, at: 0.8 },
    { label: 'Drywall + paint', days:  6, cost:  54000, at: 1.2 },
    { label: 'Finishes',        days: 21, cost: 199000, at: 1.6 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {tasks.map((t) => {
        const done = localT >= t.at;
        return (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: done ? 1 : 0.3, x: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr auto auto',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              border: `1px solid ${COLORS.rule}`,
              borderRadius: 8,
              background: done ? '#fff' : 'rgba(15,15,17,0.02)',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: 4,
              border: `2px solid ${done ? CHROME.green : COLORS.rule}`,
              background: done ? CHROME.green : 'transparent',
              display: 'grid', placeItems: 'center',
              color: '#fff', fontSize: 13, fontWeight: 800,
            }}>{done ? '✓' : ''}</span>
            <span style={{ fontSize: 13, color: COLORS.ink, fontWeight: 600 }}>{t.label}</span>
            <span style={{ fontSize: 11, color: COLORS.faded, fontFamily: 'ui-monospace, Menlo, monospace' }}>
              {t.days}d
            </span>
            <span style={{ fontSize: 12, color: COLORS.graphite, fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
              {formatUsd(t.cost)}
            </span>
          </motion.div>
        );
      })}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: localT >= 2.0 ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        style={{
          marginTop: 6,
          padding: '8px 12px',
          background: 'rgba(29, 158, 117, 0.10)',
          border: `1px solid rgba(29, 158, 117, 0.3)`,
          borderLeft: `3px solid ${CHROME.green}`,
          borderRadius: 6,
          fontSize: 12, color: COLORS.ink, fontWeight: 600,
        }}
      >
        Sequence locked. Critical path shaved 4 days — <span style={{ color: CHROME.green, fontWeight: 800 }}>+$70k</span> off the bottom.
      </motion.div>
    </div>
  );
}

function Act4PhaseMaterials({ localT }: { localT: number }) {
  const items = [
    { label: '2×6 Douglas fir',      qty: '8,200 sf',     cost: 42300, at: 0.0 },
    { label: 'Drywall (5/8")',       qty: '6,400 sf',     cost: 17920, at: 0.3 },
    { label: 'Insulation R-30',      qty: '2,800 sf',     cost:  9800, at: 0.6 },
    { label: 'Title 24 windows',     qty: '12 units',     cost: 48000, at: 0.9 },
    { label: 'Roofing — Class A',    qty: '2,400 sf',     cost: 32400, at: 1.2 },
    { label: 'Slab concrete',        qty: '38 cy',        cost: 22000, at: 1.5 },
    { label: 'MEP fixtures',         qty: '1 lot',        cost: 56000, at: 1.8 },
    { label: 'Hardwood (5" oak)',    qty: '1,200 sf',     cost: 14400, at: 2.1 },
  ];
  const visible = items.filter((i) => localT >= i.at);
  const running = visible.reduce((s, i) => s + i.cost, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 6,
      }}>
        {items.map((item) => {
          const show = localT >= item.at;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.96 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px',
                border: `1px solid ${COLORS.rule}`,
                borderLeft: `3px solid ${CHROME.warmB}`,
                borderRadius: 6,
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 11, color: COLORS.ink, fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: 9, color: COLORS.faded, fontFamily: 'ui-monospace, Menlo, monospace' }}>{item.qty}</span>
              </div>
              <span style={{ fontSize: 11, color: COLORS.graphite, fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700 }}>
                {formatUsd(item.cost)}
              </span>
            </motion.div>
          );
        })}
      </div>
      <div style={{
        marginTop: 6,
        padding: '8px 12px',
        background: 'rgba(196, 164, 74, 0.12)',
        border: `1px solid rgba(196, 164, 74, 0.35)`,
        borderLeft: `3px solid ${CHROME.warmB}`,
        borderRadius: 6,
        fontSize: 12, color: COLORS.ink, fontWeight: 600,
        textAlign: 'right',
      }}>
        Materials subtotal: <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 800 }}>{formatUsd(running)}</span>
      </div>
    </div>
  );
}

function Act4PhaseEquipment({ localT }: { localT: number }) {
  const equip = [
    { label: 'Excavator (CAT 320)', days: 3, cost: 9000,  at: 0.0 },
    { label: 'Concrete pump',       days: 2, cost: 5800,  at: 0.4 },
    { label: 'Tower crane',         days: 1, cost: 3600,  at: 0.8 },
    { label: 'Lift / boom',         days: 5, cost: 4500,  at: 1.2 },
    { label: 'Specialty subs lot',  days: 0, cost: 17100, at: 1.6 },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {equip.map((e) => {
        const show = localT >= e.at;
        return (
          <motion.div
            key={e.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: show ? 1 : 0, y: show ? 0 : 8 }}
            transition={{ duration: 0.3 }}
            style={{
              padding: '10px 14px',
              border: `1px solid ${COLORS.rule}`,
              borderLeft: `3px solid ${CHROME.warm}`,
              borderRadius: 8,
              background: '#fff',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink }}>{e.label}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: COLORS.faded, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                {e.days > 0 ? `${e.days} days` : 'lump sum'}
              </span>
              <span style={{ fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700, color: COLORS.graphite }}>
                {formatUsd(e.cost)}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function Act4PhaseTimeMachine({ localT }: { localT: number }) {
  // Dial scrubs counter-clockwise during 0-1.5s (rewind), then snaps
  // back during 2.5-3.0s (return to live). Indicator angle reflects
  // current scrub position; a label below names the state being viewed.
  const PHASE_DURATION = 3.5;
  // angle 0 = "live" (today), angle goes negative as we rewind
  let angle = 0;
  let stateLabel = 'Live · Today';
  let stateVal = '$930,000';
  if (localT < 1.5) {
    // Rewind: 0 → -120°
    angle = -120 * (localT / 1.5);
    stateLabel = 'Rewinding…';
    stateVal = '—';
  } else if (localT < 2.5) {
    // Hold at past state
    angle = -120;
    stateLabel = 'Yesterday · before sequencing';
    stateVal = '$820,000';
  } else if (localT < PHASE_DURATION) {
    // Return to live: -120 → 0 over 0.5s
    angle = -120 + 120 * ((localT - 2.5) / 1.0);
    stateLabel = 'Returning to live…';
    stateVal = '—';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, justifyContent: 'center' }}>
      {/* Dial */}
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg viewBox="-100 -100 200 200" width="180" height="180">
          {/* Outer ring */}
          <circle cx="0" cy="0" r="85" fill="none" stroke={COLORS.rule} strokeWidth="2" />
          {/* Tick marks every 30 degrees */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
            const a = (deg - 90) * Math.PI / 180;
            const x1 = Math.cos(a) * 78, y1 = Math.sin(a) * 78;
            const x2 = Math.cos(a) * 88, y2 = Math.sin(a) * 88;
            return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLORS.graphite} strokeWidth="1.5" />;
          })}
          {/* "Today" marker at top */}
          <text x="0" y="-92" textAnchor="middle" fontSize="9" fontWeight="800" fill={CHROME.red}>TODAY</text>
          {/* Indicator hand */}
          <motion.g
            animate={{ rotate: angle }}
            transition={{ duration: 0.1 }}
            style={{ transformOrigin: 'center' }}
          >
            <line x1="0" y1="0" x2="0" y2="-72" stroke={CHROME.red} strokeWidth="3" strokeLinecap="round" />
            <circle cx="0" cy="-72" r="4" fill={CHROME.red} />
          </motion.g>
          {/* Center pivot */}
          <circle cx="0" cy="0" r="5" fill={COLORS.ink} />
        </svg>
      </div>
      {/* State readout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: COLORS.faded, textTransform: 'uppercase' }}>
          Budget state
        </span>
        <span style={{ fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)", fontSize: 28, color: COLORS.ink, lineHeight: 1.1 }}>
          {stateVal}
        </span>
        <span style={{ fontSize: 12, color: CHROME.warm, fontWeight: 600 }}>
          {stateLabel}
        </span>
      </div>
    </div>
  );
}

function Act4PhaseCode({ localT }: { localT: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          padding: '12px 16px',
          border: `1px solid ${COLORS.rule}`,
          borderLeft: `4px solid ${CHROME.warm}`,
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: CHROME.warm, textTransform: 'uppercase' }}>
          Code citation · multi-source verified
        </div>
        <div style={{ fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)", fontSize: 18, marginTop: 4, color: COLORS.ink }}>
          CRC R327 · Wildland-Urban Interface
        </div>
        <div style={{ fontSize: 12, color: COLORS.graphite, marginTop: 4, lineHeight: 1.4 }}>
          Class A roof · ember-resistant vents · ignition-resistant siding. Marin County overlay applies.
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: localT >= 0.8 ? 1 : 0, y: localT >= 0.8 ? 0 : 6 }}
        transition={{ duration: 0.5 }}
        style={{
          padding: '12px 16px',
          border: `1px solid ${COLORS.rule}`,
          borderLeft: `4px solid ${CHROME.green}`,
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: CHROME.green, textTransform: 'uppercase' }}>
          Title 24 §110.10 · solar mandate
        </div>
        <div style={{ fontSize: 12, color: COLORS.graphite, marginTop: 4, lineHeight: 1.4 }}>
          Class A roof saves $40k vs spec (cheaper assembly). High-perf envelope adds $15k. <strong style={{ color: CHROME.green }}>Net refinement: −$25,000.</strong>
        </div>
      </motion.div>
    </div>
  );
}

function Act4PhaseContract({ localT }: { localT: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        padding: '20px 24px',
        background: 'rgba(232, 68, 58, 0.05)',
        border: `1px solid rgba(232, 68, 58, 0.3)`,
        borderLeft: `5px solid ${CHROME.red}`,
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: CHROME.red, textTransform: 'uppercase' }}>
        Client Agreement · auto-drafted
      </div>
      <div style={{
        fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
        fontSize: 22, color: COLORS.ink, marginTop: 6, lineHeight: 1.2,
      }}>
        Modern farmhouse · Marin County, CA
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: COLORS.graphite, fontWeight: 600 }}>
          Contract amount
        </span>
        <motion.span
          initial={{ scale: 0.9 }}
          animate={{ scale: localT >= 0.6 ? [1, 1.18, 1] : 1 }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
          style={{
            fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
            fontSize: 'clamp(28px, 4vw, 40px)',
            color: COLORS.ink,
            letterSpacing: '-0.01em',
            display: 'inline-block',
            transformOrigin: 'center right',
          }}
        >
          $905,000
        </motion.span>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: COLORS.faded, fontStyle: 'italic' }}>
        Locked in · ready for client signature
      </div>
    </motion.div>
  );
}

function Act4LiveBudget() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    // 33ms ≈ 30fps. Smooth enough for budget interpolation across the
    // ~24s act × 30fps = ~720 renders. Reasonable React load.
    const id = window.setInterval(() => setElapsed((performance.now() - start) / 1000), 33);
    return () => window.clearInterval(id);
  }, []);

  const phase = act4PhaseAt(elapsed);
  const budget = act4BudgetAt(elapsed);
  // Hero scale: pulse up when budget velocity is high (mid-transition).
  // Velocity tops out around 70k/s during the fastest transitions →
  // normalize to [0, 1] then map to [1, 1.18] scale.
  const velocity = act4BudgetVelocity(elapsed);
  const heroScale = 1 + Math.min(0.18, velocity / 400000);

  // Phase-local elapsed for sub-views (resets each phase entry).
  const phaseStartT: Record<Act4Phase, number> = {
    journey: 0, sequencing: 3, materials: 6, equipment: 10,
    timemachine: 13.5, code: 17, contract: 20,
  };
  const localT = elapsed - phaseStartT[phase];

  return (
    <motion.section
      key="act4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed', inset: 0,
        background: COLORS.paper,
        display: 'flex', flexDirection: 'column',
      }}
      aria-label="Act 4: multi-screen killer-app cinematic"
    >
      <div className="bkg-intro-act4-header" style={{ padding: '44px 40px 4px', textAlign: 'center' }}>
        <p style={eyebrow(COLORS.faded)}>THE PLATFORM, AT HYPER-SPEED</p>
        <h2 style={{ ...h2Style, marginTop: 4, fontSize: 'clamp(22px, 3vw, 30px)' }}>
          Every action moves the money. The money moves the build.
        </h2>
      </div>

      <div className="bkg-intro-act4-canvas" style={{
        flex: 1, position: 'relative', padding: '12px 40px 8px', minHeight: 0,
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          width: 'min(880px, 100%)', height: '100%',
          background: '#fff',
          border: `1px solid ${COLORS.rule}`,
          borderRadius: 14,
          boxShadow: '0 12px 48px rgba(15,15,17,0.08)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Browser-chrome strip — URL updates per phase. */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px',
            borderBottom: `1px solid ${COLORS.rule}`,
            background: 'rgba(15,15,17,0.025)',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#E8443A', opacity: 0.6 }} />
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#E8B53A', opacity: 0.6 }} />
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#3AE863', opacity: 0.6 }} />
            <AnimatePresence mode="wait">
              <motion.span
                key={phase}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.25 }}
                style={{
                  marginLeft: 10, fontSize: 11, color: COLORS.faded,
                  fontFamily: 'ui-monospace, Menlo, monospace',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                builders.theknowledgegardens.com{ACT4_PHASE_URL[phase]}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Persistent budget hero — visible across all phases, animates
              as the budget value mutates. */}
          <div style={{
            padding: '14px 24px 8px',
            borderBottom: `1px solid ${COLORS.rule}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(15,15,17,0.012)',
          }}>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.14em',
                color: COLORS.faded, textTransform: 'uppercase',
              }}>
                Live budget · Modern farmhouse · Marin
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={{ opacity: 0.5, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ fontSize: 11, color: CHROME.warm, fontWeight: 600, marginTop: 2 }}
                >
                  {ACT4_PHASE_LABEL[phase]}
                </motion.div>
              </AnimatePresence>
            </div>
            <motion.div
              animate={{ scale: heroScale }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{
                fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
                fontSize: 'clamp(30px, 4.5vw, 48px)',
                color: COLORS.ink,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                transformOrigin: 'center right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatUsd(budget)}
            </motion.div>
          </div>

          {/* Phase content — cross-fades between the 7 sub-views. */}
          <div style={{ flex: 1, padding: '18px 24px', overflow: 'hidden', position: 'relative' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ height: '100%' }}
              >
                {phase === 'journey'     && <Act4PhaseJourney />}
                {phase === 'sequencing'  && <Act4PhaseSequencing  localT={localT} />}
                {phase === 'materials'   && <Act4PhaseMaterials   localT={localT} />}
                {phase === 'equipment'   && <Act4PhaseEquipment   localT={localT} />}
                {phase === 'timemachine' && <Act4PhaseTimeMachine localT={localT} />}
                {phase === 'code'        && <Act4PhaseCode        localT={localT} />}
                {phase === 'contract'    && <Act4PhaseContract    localT={localT} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom CTA: investor escape hatch into the real product */}
      <div className="bkg-intro-act4-cta" style={{
        padding: '10px 40px 80px',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14,
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 5,
      }}>
        <Link href={`/killerapp?project=${DEMO_PROJECT_ID}`} style={ctaGhost} target="_blank">
          Open the real platform in a new tab
        </Link>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .bkg-intro-act4-header {
            padding: 24px 18px 4px !important;
          }
          .bkg-intro-act4-canvas {
            padding: 8px 12px 6px !important;
          }
          .bkg-intro-act4-cta {
            padding: 6px 16px 88px !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
          .bkg-intro-act4-cta > * {
            width: 100% !important;
            max-width: 320px !important;
            text-align: center !important;
          }
        }
      `}</style>
    </motion.section>
  );
}

// — ACT 5: The vision ——————————————————————————————————————————————————
function Act5Vision({ reduced }: { reduced: boolean }) {
  // 2026-05-23 (Chilly): Act 5 polish round.
  //   • Center "umbrella tree" replaced with the looping `tool-tree.mp4`
  //     animation, wrapped in a Link to /killerapp — it's the "portal to
  //     the killer app." Static knowledge-gardens-tree.png stays as the
  //     <video poster> so something shows while the mp4 loads (or if a
  //     browser fails to play it).
  //   • Vertical logos bumped 96px → 140px and orbit radius 240 → 290
  //     for more presence. mixBlendMode: multiply dissolves the cream/
  //     white image backgrounds into the parchment page.
  //   • Vertical labels bumped 11px → 13px, color graphite → ink, so they
  //     read more clearly under the now-larger images.
  //   • Canvas grown 640×360 → 720×540 to fit the larger compositions.
  //     Mobile scale tightened 0.55 → 0.5 to keep within 92vw on iPhones.
  const domains = [
    {
      label: "Builder's",
      color: CHROME.red,
      src: '/logos/gardens/builders-hammer.png',
      alt: "Builder's Garden — the killer app shipping today",
    },
    {
      label: 'Health',
      color: '#2F7DC1',
      src: '/logos/gardens/health-garden-caduceus.png',
      alt: 'Health Garden',
    },
    {
      label: 'Toxicology',
      color: '#4A6FA0',
      src: '/logos/gardens/toxicology-caduceus.png',
      alt: 'Toxicology Garden',
    },
    {
      label: 'Orchid',
      color: '#C24A8B',
      src: '/logos/gardens/orchid-garden.png',
      alt: 'Orchid Garden',
    },
    {
      label: 'Legal',
      color: '#6B4FBB',
      src: '/logos/gardens/legal.png',
      alt: 'Legal Garden',
    },
    // 2026-05-23 PM (Chilly): removed the "Coming" placeholder — its
    // dotted-circle was bunching against the Legal logo at the right
    // edge of the arc, making the labels overlap. Five real verticals
    // spread across the same arc give better spacing and read cleaner.
  ];

  // Six verticals across the top 240° (from lower-left through top to
  // lower-right). The bottom 120° below the tree stays clear. With y-down
  // CSS coords and our angle convention (Math.cos/sin), we want angles in
  // the half-plane where sin(angle) < ~0.3 — i.e., the top + upper sides.
  // Linear sweep from 195° (lower-left) to 345° (lower-right) skips the
  // bottom entirely.
  const positions = domains.map((d, i) => {
    const startDeg = 195;
    const endDeg = 345;
    const t = domains.length === 1 ? 0.5 : i / (domains.length - 1);
    const angleDeg = startDeg + t * (endDeg - startDeg);
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = 290;
    return {
      ...d,
      x: Math.cos(angleRad) * r,
      y: Math.sin(angleRad) * r,
    };
  });
  return (
    <motion.section
      key="act5"
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.6 }}
      style={actWrap(COLORS.paper)}
      aria-label="Act 5: the vision"
    >
      <div className="bkg-intro-act5-canvas" style={{ position: 'relative', width: 720, height: 540, maxWidth: '94vw', zIndex: 1 }}>
        {/* Center: static knowledge-gardens-tree.png (transparent bg)
            wrapped in a Link to /killerapp — it's the "portal to the
            killer app." 2026-05-23 PM (Chilly): the tool-tree.mp4
            video version was showing as a black square in prod (poster
            never rendering, autoplay silently failing in this context).
            Reverted to the static image which we know works. The tree
            itself was processed for transparent background so it
            dissolves into the parchment cleanly. */}
        <motion.div
          initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: reduced ? 0 : 1, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 1 }}
        >
          <Link
            href="/killerapp"
            aria-label="Enter the killer app"
            style={{
              display: 'block',
              cursor: 'pointer',
              borderRadius: 16,
              transition: 'transform 220ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.0)'; }}
          >
            <GardenLogo
              src="/logos/gardens/knowledge-gardens-tree.png"
              alt="Knowledge Gardens — enter the killer app"
              size={320}
              fallback={<KLogomark size={240} color={COLORS.ink} />}
            />
          </Link>
        </motion.div>

        {/* Six verticals arc across the top — bottom stays clear for text.
            2026-05-23 (Chilly): bumped from 96px → 140px logos at radius
            290 (was 240). mixBlendMode: multiply on each image removes
            visible box backgrounds. Labels 11→13px in ink (not graphite). */}
        {positions.map((d, i) => {
          const dotFallback = (
            <span style={{
              display: 'inline-block',
              width: 36, height: 36, borderRadius: 18,
              background: d.color, opacity: 0.95,
              outline: `2px dashed ${COLORS.rule}`,
              outlineOffset: 2,
            }} />
          );
          return (
            <motion.div
              key={d.label}
              initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.8 + i * 0.10 }}
              style={{
                position: 'absolute',
                top: `calc(50% + ${d.y}px)`,
                left: `calc(50% + ${d.x}px)`,
                transform: 'translate(-50%, -50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}
            >
              {d.src ? (
                <GardenLogo
                  src={d.src}
                  alt={d.alt}
                  size={140}
                  fallback={dotFallback}
                />
              ) : (
                dotFallback
              )}
              <span style={{
                fontSize: 13,
                fontWeight: 800,
                color: COLORS.ink,
                letterSpacing: '0.12em',
                textShadow: '0 1px 0 rgba(250,246,235,0.85)',
              }}>
                {d.label.toUpperCase()}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Typewriter + CTAs sit BELOW the canvas with z-index 5 so any
          overlapping vertical logo (shouldn't happen with the top-arc
          layout, but defensive) renders behind the text. paddingBottom on
          CTAs gives the floating ActIndicator clearance. */}
      <div style={{ marginTop: 32, textAlign: 'center', maxWidth: 760, position: 'relative', zIndex: 5 }}>
        <Typewriter
          text="Today: Builder's Garden."
          delaySec={reduced ? 0 : 2.0}
          reduced={reduced}
          style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}
        />
        <Typewriter
          text="Tomorrow: every domain that has a knowledge problem."
          delaySec={reduced ? 0 : 2.9}
          reduced={reduced}
          style={{ fontSize: 'clamp(16px, 2vw, 22px)', color: COLORS.graphite, marginTop: 8 }}
        />
      </div>

      <div style={{ marginTop: 28, marginBottom: 60, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 5 }}>
        <Link href="/killerapp" style={ctaPrimary(CHROME.red)}>
          Start building →
        </Link>
        <Link href={`/killerapp?project=${DEMO_PROJECT_ID}`} style={ctaGhost}>
          Show me the demo project →
        </Link>
      </div>

      {/* Mobile: scale the whole Act 5 canvas down so the 290px-radius
          orbit positions don't clip off the 92vw container. Canvas is
          now 720×540 so we use scale 0.5 (was 0.55 at 640×360). Negative
          margin reclaims the visual gap the transform leaves behind. */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .bkg-intro-act5-canvas {
            transform: scale(0.5);
            transform-origin: top center;
            margin-bottom: -260px;
          }
        }
      `}</style>
    </motion.section>
  );
}

// — Typewriter helper ——————————————————————————————————————————————————
function Typewriter({
  text, delaySec, reduced, style,
}: { text: string; delaySec: number; reduced: boolean; style?: React.CSSProperties }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced) { setN(text.length); return; }
    const start = window.setTimeout(() => {
      let i = 0;
      const id = window.setInterval(() => {
        i += 1;
        setN((c) => Math.min(c + 1, text.length));
        if (i >= text.length) window.clearInterval(id);
      }, 38);
    }, delaySec * 1000);
    return () => window.clearTimeout(start);
  }, [text, delaySec, reduced]);
  return (
    <p style={{
      margin: 0,
      fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
      fontSize: 'clamp(20px, 2.6vw, 28px)',
      lineHeight: 1.25,
      color: COLORS.ink,
      ...style,
    }}>
      {text.slice(0, n)}
      <span style={{ opacity: n < text.length ? 1 : 0 }}>|</span>
    </p>
  );
}

// — Shared styles ————————————————————————————————————————————————————————
function actWrap(bg: string, extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    position: 'fixed', inset: 0,
    background: bg,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '80px 32px 80px',
    fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
    color: COLORS.ink,
    overflow: 'hidden',
    ...extra,
  };
}

// 2026-05-22 AM: chromeOrbitDot + chromeLabel are no longer used by Act
// 1 — they were the prior colored-dot-plus-side-label treatment. The
// styles below replace them with a vertical stack (image above label)
// that scales as a unit during the new zoom-past animation. Kept the
// originals out for now in case any other surface uses them; they can
// be removed in a follow-up sweep.
function chromeOrbitDot(color: string, size = 16): React.CSSProperties {
  return {
    position: 'absolute',
    width: size, height: size, borderRadius: size / 2,
    background: color,
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
    boxShadow: `0 0 0 4px rgba(255,255,255,0.65), 0 6px 16px rgba(15,15,17,0.12)`,
  };
}

const chromeLabel: React.CSSProperties = {
  position: 'absolute',
  left: 24, top: '50%',
  transform: 'translateY(-50%)',
  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
  color: COLORS.graphite,
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
};

// New chrome-orbit treatment (2026-05-22 AM): the outer motion.div is a
// zero-size anchor at canvas center — Framer Motion's x/y/scale animate
// THAT anchor (because Framer strips any CSS transform we put on the
// motion element itself). The inner div self-centers content on the
// anchor via its own translate(-50%, -50%), which Framer doesn't touch.
// This way scale grows the content outward from the anchor (i.e., from
// each chrome's own visual center, not from the canvas center).
const chromeOrbitContainer: React.CSSProperties = {
  position: 'absolute',
  top: '50%', left: '50%',
  width: 0, height: 0,            // zero-size anchor
  pointerEvents: 'none',
  zIndex: 2,
  transformOrigin: 'center center',
};
const chromeOrbitInner: React.CSSProperties = {
  position: 'absolute',
  top: 0, left: 0,
  transform: 'translate(-50%, -50%)',  // self-center content on anchor
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};
const chromeOrbitLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.1em',
  color: COLORS.ink,
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  textShadow: '0 1px 0 rgba(250,246,235,0.9)',
};
function chromeOrbitFallback(color: string): React.CSSProperties {
  return {
    display: 'inline-block',
    width: 56, height: 56,
    borderRadius: 28,
    background: color,
    boxShadow: '0 0 0 3px rgba(255,255,255,0.7), 0 6px 18px rgba(15,15,17,0.15)',
  };
}

function eyebrow(c: string): React.CSSProperties {
  return {
    margin: 0,
    fontSize: 12, fontWeight: 700, letterSpacing: '0.18em',
    color: c, textTransform: 'uppercase',
  };
}

const h2Style: React.CSSProperties = {
  margin: '8px 0 0',
  fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
  fontSize: 'clamp(30px, 4vw, 48px)',
  lineHeight: 1.15,
  color: COLORS.ink,
  letterSpacing: '-0.01em',
};

const voicePanel: React.CSSProperties = {
  padding: 24,
  borderRadius: 16,
  background: 'rgba(216, 90, 48, 0.05)',
  border: `1px solid rgba(216, 90, 48, 0.18)`,
  minHeight: 220,
};

const transcriptStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
  fontSize: 18,
  lineHeight: 1.5,
  color: COLORS.ink,
  fontWeight: 500,
};

function card(accent: string): React.CSSProperties {
  return {
    padding: '14px 18px',
    background: '#fff',
    border: `1px solid ${COLORS.rule}`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 10,
    fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
    color: COLORS.ink,
    boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03)',
  };
}

const cardEyebrow: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: COLORS.faded,
};
const cardTitle: React.CSSProperties = {
  marginTop: 4,
  fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
  fontSize: 16, color: COLORS.ink,
};
const cardMeta: React.CSSProperties = {
  marginTop: 4, fontSize: 13, color: COLORS.graphite,
};

function journeyPill(color: string): React.CSSProperties {
  return {
    padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    color,
  };
}
// Light-card register: arrow uses graphite at low opacity so it sits on a
// cream/white card instead of the prior dark-only color.
const journeyArrow: React.CSSProperties = {
  color: 'rgba(15,15,17,0.35)', fontSize: 12,
};

function ctaPrimary(color: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '14px 26px',
    background: color,
    color: '#fff',
    borderRadius: 8,
    fontSize: 16, fontWeight: 700, letterSpacing: '0.01em',
    textDecoration: 'none',
    border: 'none', cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

const ctaGhost: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 22px',
  background: 'transparent',
  color: COLORS.ink,
  border: `1px solid ${COLORS.rule}`,
  borderRadius: 8,
  fontSize: 15, fontWeight: 600,
  textDecoration: 'none',
};

// — Page controller ————————————————————————————————————————————————————
export default function IntroPage() {
  const [act, setAct] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const skipToCTAsRef = useRef(false);

  const goNext = useCallback(() => {
    setAct((a) => Math.min(a + 1, TOTAL_ACTS - 1));
  }, []);
  const goPrev = useCallback(() => {
    setAct((a) => Math.max(a - 1, 0));
  }, []);
  const skipToEnd = useCallback(() => {
    skipToCTAsRef.current = true;
    setAct(TOTAL_ACTS - 1);
  }, []);

  // Auto-advance every act, including Act 4 (flipped 2026-05-21 AM, Chilly:
  // dropping the Continue button and letting Act 4 ride a 14s timer so the
  // cinematic flows end-to-end without investor input). Paused state still
  // freezes the timer; act === N keeps a finite dur sentinel just in case
  // someone re-introduces an Infinity later.
  useEffect(() => {
    if (paused) return;
    const dur = ACT_DURATIONS_MS[act];
    if (!isFinite(dur)) return;
    const id = window.setTimeout(() => {
      setAct((a) => Math.min(a + 1, TOTAL_ACTS - 1));
    }, reduced ? Math.min(dur, 1500) : dur);
    return () => window.clearTimeout(id);
  }, [act, paused, reduced]);

  // Keyboard handlers.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); skipToEnd(); return; }
      if (e.code === 'Space') { e.preventDefault(); setPaused((p) => !p); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); return; }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, skipToEnd]);

  return (
    <main style={{
      minHeight: '100vh',
      background: COLORS.paper,
      color: COLORS.ink,
      fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
      overflow: 'hidden',
    }}>
      <TopBar onSkip={skipToEnd} />

      <AnimatePresence mode="wait">
        {act === 0 && <Act1Umbrella reduced={reduced} />}
        {act === 1 && <Act2Problem reduced={reduced} />}
        {act === 2 && <Act3Aikido reduced={reduced} />}
        {act === 3 && <Act4LiveBudget />}
        {act === 4 && <Act5Vision reduced={reduced} />}
      </AnimatePresence>

      <ActIndicator act={act} paused={paused} onJump={(n) => setAct(n)} />
    </main>
  );
}
