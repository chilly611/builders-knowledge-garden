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

// Act durations in ms. Act 4 (index 3) is user-controlled — see auto-advance
// effect.
//   Act 1 (index 0) trimmed 8s → 6s (2026-05-19): both typewriters finish
//     around 4s, so 8s left 4s of dead hold. 6s gives ~1.5s of breathing
//     room after the second line lands.
//   Act 3 (index 2) trimmed 30s → 22s (2026-05-20, per V2 spec): the last
//     card landed at 25s and the act ended at 30s — too much dead air after
//     a marquee moment. Re-timed cards now land at 2/5/9/14/18s so the
//     final Journey card has ~4s of read-time before the auto-advance.
const ACT_DURATIONS_MS = [6000, 12000, 22000, Number.POSITIVE_INFINITY, 12000];
const TOTAL_ACTS = 5;

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
function Act1Umbrella({ reduced }: { reduced: boolean }) {
  const orbitTransition = reduced
    ? { duration: 0 }
    : { duration: 1.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 1.2 };
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
      <div style={{ position: 'relative', width: 360, height: 360 }}>
        {/* The umbrella — Knowledge Gardens tree, scales up then settles.
            Falls back to the K logomark if the PNG isn't yet uploaded. */}
        <motion.div
          initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: reduced ? 0 : 1, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}
        >
          <GardenLogo
            src="/logos/gardens/knowledge-gardens-tree.png"
            alt="Knowledge Gardens — the umbrella"
            size={260}
            fallback={<KLogomark size={220} color={COLORS.ink} />}
          />
        </motion.div>

        {/* Three chrome dots orbit out from behind the K */}
        <motion.div
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: 1, x: 180, y: -40 }}
          transition={orbitTransition}
          style={chromeOrbitDot(CHROME.red)}
        >
          <span style={chromeLabel}>Killer App</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: 1, x: -160, y: 100 }}
          transition={{ ...orbitTransition, delay: (orbitTransition.delay ?? 0) + 0.12 }}
          style={chromeOrbitDot(CHROME.warm)}
        >
          <span style={chromeLabel}>Dream Machine</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: 1, x: 170, y: 110 }}
          transition={{ ...orbitTransition, delay: (orbitTransition.delay ?? 0) + 0.24 }}
          style={chromeOrbitDot(CHROME.green)}
        >
          <span style={chromeLabel}>Knowledge Garden</span>
        </motion.div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 36, maxWidth: 720 }}>
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
    </motion.section>
  );
}

// — ACT 2: The problem ——————————————————————————————————————————————————
function Act2Problem({ reduced }: { reduced: boolean }) {
  // Each vignette is 3s in the wall clock; we crossfade between them.
  // Auto-cycle by tick so the user doesn't need to scroll.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduced) { setTick(3); return; }
    const t = setInterval(() => setTick((v) => Math.min(v + 1, 3)), 2800);
    return () => clearInterval(t);
  }, [reduced]);

  const vignettes = [
    { title: 'Estimate on a napkin',     accent: CHROME.warmB, art: <NapkinArt /> },
    { title: 'Code lookup by text',      accent: CHROME.warm,  art: <TextThreadArt /> },
    { title: 'Contract in Word',         accent: CHROME.green, art: <ContractArt /> },
    { title: 'Schedule on a whiteboard', accent: CHROME.red,   art: <WhiteboardArt /> },
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
              <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.ink, fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)", lineHeight: 1.2 }}>
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

// — ACT 3: #aikidotheAI ————————————————————————————————————————————————
function Act3Aikido({ reduced }: { reduced: boolean }) {
  const fullTranscript =
    "I want to build a custom modern farmhouse in Marin. 1,800 square feet. 3 bed 2 bath. Slab on grade. Late summer 2026.";

  const [chars, setChars] = useState(0);
  useEffect(() => {
    if (reduced) { setChars(fullTranscript.length); return; }
    let i = 0;
    const tick = setInterval(() => {
      i += 2; // ~25ms per char ≈ 5s to type the line
      setChars((c) => {
        if (c >= fullTranscript.length) {
          clearInterval(tick);
          return fullTranscript.length;
        }
        return Math.min(fullTranscript.length, c + 2);
      });
    }, 80);
    return () => clearInterval(tick);
  }, [reduced]);

  // Schedule of right-panel cards. Cards appear at offsets in seconds.
  // Re-timed 2026-05-20 alongside the 30s → 22s act-duration trim. Cards now
  // land at 2/5/9/14/18s; final Journey card has ~4s of read-time before
  // auto-advance to Act 4.
  const cards: Array<{ at: number; render: () => React.ReactNode; key: string }> = useMemo(() => [
    { at: 2,  key: 'project',  render: () => <CardProject /> },
    { at: 5,  key: 'estimate', render: () => <CardEstimate /> },
    { at: 9,  key: 'code',     render: () => <CardCode /> },
    { at: 14, key: 'contract', render: () => <CardContract /> },
    { at: 18, key: 'journey',  render: () => <CardJourney /> },
  ], []);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (reduced) { setElapsed(30); return; }
    const start = performance.now();
    const id = window.setInterval(() => setElapsed((performance.now() - start) / 1000), 100);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <motion.section
      key="act3"
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.6 }}
      style={actWrap(COLORS.paper, { gap: 24 })}
      aria-label="Act 3: voice in, project out"
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
          Voice in. Estimate, code, contract, schedule out. The platform does the parsing.
        </p>
      </div>

      <div className="bkg-intro-act3-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 38%) 1fr',
        gap: 28,
        width: 'min(1080px, 92vw)',
        maxWidth: '100%',
      }}>
        {/* LEFT: mic + transcript */}
        <div style={voicePanel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <MicPulse reduced={reduced} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: CHROME.warm, textTransform: 'uppercase' }}>
              Listening
            </span>
          </div>
          <p style={transcriptStyle}>
            {fullTranscript.slice(0, chars)}
            <span style={{
              display: 'inline-block', width: 7, height: 22, marginLeft: 2,
              background: COLORS.ink, verticalAlign: 'text-bottom',
              animation: reduced ? 'none' : 'bkg-caret 0.9s steps(2) infinite',
            }} />
          </p>
        </div>

        {/* RIGHT: cards stream in */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {cards.map(({ at, key, render }) => (
            <AnimatePresence key={key} mode="wait">
              {elapsed >= at && (
                <motion.div
                  initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.4, ease: 'easeOut' }}
                >
                  {render()}
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
      </div>

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
  // 2026-05-20: swapped from a dark #15151A card to the same light register
  // as the other 4 cards. The dark version read as "broken/empty" on mobile
  // and broke the visual rhythm of the right-panel card stream.
  return (
    <div style={card(COLORS.ink)}>
      <div style={cardEyebrow}>JOURNEY</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, flexWrap: 'wrap' }}>
        <span style={{ ...journeyPill(COLORS.graphite), background: 'rgba(15,15,17,0.06)' }}>Size up</span>
        <span style={journeyArrow}>→</span>
        <span style={{ ...journeyPill('#FFFFFF'), background: COLORS.ink }}>Lock it in</span>
        <span style={journeyArrow}>→</span>
        <span style={{ ...journeyPill(COLORS.graphite), background: 'transparent', border: `1px dashed ${COLORS.rule}` }}>Plan it out</span>
      </div>
    </div>
  );
}

// — ACT 4: Live killer app ————————————————————————————————————————————
function Act4LiveBudget({ onContinue }: { onContinue: () => void }) {
  const src = `/killerapp/budget?project=${DEMO_PROJECT_ID}&hideShell=1`;
  const [showPrompt, setShowPrompt] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowPrompt(false), 6500);
    return () => clearTimeout(t);
  }, []);
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
      aria-label="Act 4: live killer app"
    >
      <div className="bkg-intro-act4-header" style={{ padding: '64px 40px 12px', textAlign: 'center' }}>
        <p style={eyebrow(COLORS.faded)}>THE ACTUAL PRODUCT — RIGHT NOW</p>
        <h2 style={{ ...h2Style, marginTop: 4, fontSize: 'clamp(22px, 3vw, 32px)' }}>
          You can use it. Real data. Live route.
        </h2>
      </div>
      <div className="bkg-intro-act4-iframe-wrap" style={{ flex: 1, position: 'relative', padding: '12px 40px 24px', minHeight: 0 }}>
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          border: `1px solid ${COLORS.rule}`, borderRadius: 14, overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 12px 48px rgba(15,15,17,0.08)',
        }}>
          <iframe
            src={src}
            title="Builder's Garden — Marin farmhouse budget (live)"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            loading="eager"
          />
          {showPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                position: 'absolute', top: 18, left: 18,
                padding: '8px 14px', borderRadius: 999,
                background: 'rgba(15,15,17,0.86)', color: '#fff',
                fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
                pointerEvents: 'none',
              }}
            >
              Hover the categories →
            </motion.div>
          )}
        </div>
      </div>
      <div className="bkg-intro-act4-cta" style={{
        padding: '16px 40px 28px',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14,
        flexWrap: 'wrap',
      }}>
        <button type="button" onClick={onContinue} style={ctaPrimary(CHROME.red)}>
          Continue →
        </button>
        <Link href={`/killerapp/budget?project=${DEMO_PROJECT_ID}`} style={ctaGhost} target="_blank">
          Open full app in a new tab
        </Link>
      </div>

      {/* Mobile fixes 2026-05-20:
          - Trim the 64px top header padding (it ate a third of the phone
            viewport before the iframe even rendered).
          - Tighten side padding so the iframe actually has room.
          - Stack the Continue + ghost-link bar vertically AND pad-bottom
            enough to clear the floating ActIndicator pill (which sits at
            bottom: 24 and is ~40px tall). Without this, investors on
            mobile literally cannot reach Act 5.
          - Cap the iframe wrap height so the CTA bar can't be pushed below
            the fold by a tall iframe payload. */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .bkg-intro-act4-header {
            padding: 28px 18px 8px !important;
          }
          .bkg-intro-act4-iframe-wrap {
            padding: 8px 12px 12px !important;
          }
          .bkg-intro-act4-cta {
            padding: 12px 16px 88px !important;
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
  // Five verticals around the umbrella. Each renders a real garden logo
  // if uploaded to /public/logos/gardens/; otherwise falls back to a
  // labeled colored dot (so the demo never breaks on a missing asset).
  // Builder's is listed first — it's the vertical that's already shipping;
  // the rest are "the rest of the umbrella" the investor's about to see.
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
      label: 'Coming',
      color: COLORS.faded,
      src: null,
      alt: 'More gardens coming',
    },
  ];
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
      <div style={{ position: 'relative', width: 460, height: 460 }}>
        {/* The umbrella tree at center — replaces the K from Act 1. */}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <GardenLogo
            src="/logos/gardens/knowledge-gardens-tree.png"
            alt="Knowledge Gardens"
            size={180}
            fallback={<KLogomark size={140} color={COLORS.ink} />}
          />
        </div>

        {/* Three chromes — pulled apart further than Act 1 */}
        {[
          { color: CHROME.red,   x: 200, y: -130 },
          { color: CHROME.warm,  x: -200, y: -50 },
          { color: CHROME.green, x: 60,  y: 200 },
        ].map((c, i) => (
          <motion.div
            key={`chrome-${i}`}
            initial={reduced ? { opacity: 1, x: c.x, y: c.y } : { opacity: 0, x: 0, y: 0 }}
            animate={{ opacity: 1, x: c.x, y: c.y }}
            transition={{ duration: reduced ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: i * 0.08 }}
            style={{ ...chromeOrbitDot(c.color, 18), top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          />
        ))}

        {/* Five verticals around the umbrella — real logos with dot fallback. */}
        {domains.map((d, i) => {
          const angle = (i / domains.length) * Math.PI * 2 + Math.PI / 2;
          const r = 220;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          const dotFallback = (
            <span style={{
              display: 'inline-block',
              width: 14, height: 14, borderRadius: 7,
              background: d.color, opacity: 0.95,
              outline: `2px dashed ${COLORS.rule}`,
              outlineOffset: 2,
            }} />
          );
          return (
            <motion.div
              key={d.label}
              initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.8 + i * 0.10 }}
              style={{
                position: 'absolute',
                top: `calc(50% + ${y}px)`,
                left: `calc(50% + ${x}px)`,
                transform: 'translate(-50%, -50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              {d.src ? (
                <GardenLogo src={d.src} alt={d.alt} size={56} fallback={dotFallback} />
              ) : (
                dotFallback
              )}
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.graphite, letterSpacing: '0.08em' }}>
                {d.label.toUpperCase()}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div style={{ marginTop: 32, textAlign: 'center', maxWidth: 760 }}>
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

      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/killerapp" style={ctaPrimary(CHROME.red)}>
          Start building →
        </Link>
        <Link href={`/killerapp?project=${DEMO_PROJECT_ID}`} style={ctaGhost}>
          Show me the demo project →
        </Link>
      </div>
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

  // Auto-advance, except Act 4 which is user-controlled.
  useEffect(() => {
    if (paused || act === 3) return;
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
        {act === 3 && <Act4LiveBudget onContinue={goNext} />}
        {act === 4 && <Act5Vision reduced={reduced} />}
      </AnimatePresence>

      <ActIndicator act={act} paused={paused} onJump={(n) => setAct(n)} />
    </main>
  );
}
