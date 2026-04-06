'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* Green Flash Reward System
   "Green light at sunrise" - warm, satisfying green
   Two modes: flash (2s for milestones), sustain (15-30s for job completion)
   Integrates with XP/gamification system via useGamification(). */

export const GREEN_FLASH_COLORS = {
  primary: '#5C9E3C',
  glow: '#7CB85C',
  wash: 'rgba(92, 158, 60, 0.12)',
  particle: '#8FCC60',
  gold: '#D4A84B',
  killerRed: '#E8443A',
} as const;

export type GreenFlashMode = 'idle' | 'flash' | 'sustain';

export interface GreenFlashEvent {
  mode: GreenFlashMode;
  label?: string;
  xpAwarded?: number;
  timestamp: number;
}

export interface GreenFlashContextType {
  mode: GreenFlashMode;
  progress: number;
  label: string | null;
  xpAwarded: number;
  flashGreen: (opts?: { label?: string; xp?: number }) => void;
  sustainGreen: (opts?: { duration?: number; label?: string; xp?: number }) => void;
  dismiss: () => void;
  history: GreenFlashEvent[];
  sessionXP: number;
  chromeColor: string;
  chromeHighlight: string;
}

const GreenFlashContext = createContext<GreenFlashContextType | null>(null);

function playRewardChime(sustained: boolean = false) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.15, now);
    master.connect(ctx.destination);
    if (sustained) {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.3, now + i * 0.12 + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.8);
        osc.connect(gain); gain.connect(master);
        osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.9);
      });
    } else {
      [659.25, 987.77].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
        osc.connect(gain); gain.connect(master);
        osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.6);
      });
    }
    setTimeout(() => ctx.close(), 2000);
  } catch { /* Web Audio not available */ }
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  color: string; type: 'spark' | 'glow' | 'star';
  rotation: number; rotationSpeed: number;
}

const PARTICLE_COLORS = [
  GREEN_FLASH_COLORS.primary, GREEN_FLASH_COLORS.glow,
  GREEN_FLASH_COLORS.particle, GREEN_FLASH_COLORS.gold, '#A8E06C', '#E8D44D',
];

function createParticle(w: number, h: number, sustained: boolean): Particle {
  const type = Math.random() > 0.7 ? 'star' : Math.random() > 0.4 ? 'glow' : 'spark';
  let x: number, y: number;
  if (sustained) { x = Math.random() * w; y = h + 20; }
  else {
    const edge = Math.random();
    if (edge < 0.25) { x = 0; y = Math.random() * h; }
    else if (edge < 0.5) { x = w; y = Math.random() * h; }
    else if (edge < 0.75) { x = Math.random() * w; y = 0; }
    else { x = Math.random() * w; y = h; }
  }
  return {
    x, y,
    vx: (Math.random() - 0.5) * (sustained ? 1.5 : 4),
    vy: sustained ? -(Math.random() * 2 + 0.5) : (Math.random() - 0.5) * 4,
    life: 1, maxLife: sustained ? 120 + Math.random() * 120 : 40 + Math.random() * 40,
    size: type === 'star' ? 3 + Math.random() * 3 : type === 'glow' ? 6 + Math.random() * 8 : 2 + Math.random() * 2,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    type, rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.1,
  };
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
  }
  ctx.stroke(); ctx.restore();
}

const FLASH_DURATION = 2000;
const DEFAULT_SUSTAIN = 20000;

export function GreenFlashProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<GreenFlashMode>('idle');
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState<string | null>(null);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [history, setHistory] = useState<GreenFlashEvent[]>([]);
  const [sessionXP, setSessionXP] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const durationRef = useRef(0);

  const animateProgress = useCallback((duration: number) => {
    startTimeRef.current = performance.now();
    durationRef.current = duration;
    const tick = (now: number) => {
      const p = Math.min((now - startTimeRef.current) / durationRef.current, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timerRef.current = null; rafRef.current = 0;
  }, []);

  const returnToIdle = useCallback(() => {
    cleanup();
    setMode('idle'); setProgress(0); setLabel(null); setXpAwarded(0);
  }, [cleanup]);

  const flashGreen = useCallback((opts?: { label?: string; xp?: number }) => {
    cleanup();
    const xp = opts?.xp ?? 50;
    const eventLabel = opts?.label ?? 'Milestone complete!';
    setMode('flash'); setLabel(eventLabel); setXpAwarded(xp);
    setSessionXP(prev => prev + xp);
    setHistory(prev => [...prev, { mode: 'flash', label: eventLabel, xpAwarded: xp, timestamp: Date.now() }]);
    playRewardChime(false);
    animateProgress(FLASH_DURATION);
    timerRef.current = setTimeout(returnToIdle, FLASH_DURATION);
  }, [cleanup, animateProgress, returnToIdle]);

  const sustainGreen = useCallback((opts?: { duration?: number; label?: string; xp?: number }) => {
    cleanup();
    const duration = opts?.duration ?? DEFAULT_SUSTAIN;
    const xp = opts?.xp ?? 250;
    const eventLabel = opts?.label ?? 'Job complete!';
    setMode('sustain'); setLabel(eventLabel); setXpAwarded(xp);
    setSessionXP(prev => prev + xp);
    setHistory(prev => [...prev, { mode: 'sustain', label: eventLabel, xpAwarded: xp, timestamp: Date.now() }]);
    playRewardChime(true);
    animateProgress(duration);
    timerRef.current = setTimeout(returnToIdle, duration);
  }, [cleanup, animateProgress, returnToIdle]);

  useEffect(() => cleanup, [cleanup]);

  const chromeColor = mode !== 'idle' ? GREEN_FLASH_COLORS.primary : GREEN_FLASH_COLORS.killerRed;
  const chromeHighlight = mode !== 'idle' ? GREEN_FLASH_COLORS.glow : '#FF7A6E';

  const value: GreenFlashContextType = {
    mode, progress, label, xpAwarded, flashGreen, sustainGreen,
    dismiss: returnToIdle, history, sessionXP, chromeColor, chromeHighlight,
  };

  return (
    <GreenFlashContext.Provider value={value}>
      {children}
      <GreenFlashOverlay />
    </GreenFlashContext.Provider>
  );
}

export function useGreenFlash(): GreenFlashContextType {
  const ctx = useContext(GreenFlashContext);
  if (!ctx) throw new Error('useGreenFlash must be used within a GreenFlashProvider');
  return ctx;
}

function GreenFlashOverlay() {
  const { mode, progress, label, xpAwarded } = useGreenFlash();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (mode !== 'sustain') { setPulse(0); return; }
    let frame = 0;
    const tick = () => { frame++; setPulse(Math.sin(frame * 0.03) * 0.5 + 0.5); animFrameRef.current = requestAnimationFrame(tick); };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [mode]);

  const runParticles = useCallback((currentMode: GreenFlashMode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const particles = particlesRef.current;
    particles.length = 0;
    for (let i = 0; i < (currentMode === 'sustain' ? 60 : 30); i++) {
      particles.push(createParticle(canvas.width, canvas.height, currentMode === 'sustain'));
    }
    let spawnTimer = 0;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      spawnTimer++;
      if (spawnTimer % (currentMode === 'sustain' ? 3 : 8) === 0 && particles.length < 200) {
        particles.push(createParticle(canvas.width, canvas.height, currentMode === 'sustain'));
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.rotation += p.rotationSpeed; p.life -= 1 / p.maxLife;
        if (p.life <= 0 || p.y < -20 || p.x < -20 || p.x > canvas.width + 20) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life * (currentMode === 'sustain' ? 0.6 : 0.8);
        if (p.type === 'glow') {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, p.color); g.addColorStop(1, 'transparent');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'star') {
          ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; drawStar(ctx, p.x, p.y, p.size, p.rotation);
        } else {
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1; animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animFrameRef.current); particles.length = 0; };
  }, []);

  useEffect(() => {
    if (mode === 'idle') {
      const canvas = canvasRef.current;
      if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }
      particlesRef.current.length = 0; return;
    }
    return runParticles(mode);
  }, [mode, runParticles]);

  const isActive = mode !== 'idle';
  let overlayOpacity = 0;
  if (mode === 'flash') {
    if (progress < 0.15) overlayOpacity = progress / 0.15;
    else if (progress < 0.7) overlayOpacity = 1;
    else overlayOpacity = 1 - (progress - 0.7) / 0.3;
  } else if (mode === 'sustain') {
    if (progress < 0.05) overlayOpacity = progress / 0.05;
    else if (progress < 0.85) overlayOpacity = 0.8 + pulse * 0.2;
    else overlayOpacity = (1 - (progress - 0.85) / 0.15) * 0.8;
  }
  const borderGlow = isActive ? overlayOpacity : 0;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998,
        background: `radial-gradient(ellipse at 50% 30%, ${GREEN_FLASH_COLORS.wash}, transparent 70%)`,
        opacity: overlayOpacity * 0.7,
        transition: mode === 'flash' ? 'opacity 0.15s ease-out' : 'opacity 0.4s ease-out',
        mixBlendMode: 'screen',
      }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9997,
        boxShadow: `inset 0 0 ${60 + pulse * 30}px ${10 + pulse * 10}px ${GREEN_FLASH_COLORS.primary}${Math.round(borderGlow * 40).toString(16).padStart(2, '0')}`,
        transition: mode === 'flash' ? 'box-shadow 0.2s ease-out' : 'box-shadow 0.6s ease-out',
      }} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
        opacity: isActive ? 1 : 0, transition: 'opacity 0.3s ease-out',
      }} />
      <AnimatePresence>
        {isActive && label && (
          <motion.div key="gf-label" initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ position: 'fixed', top: mode === 'sustain' ? '35%' : 24, left: '50%',
              transform: 'translateX(-50%)', zIndex: 10000, pointerEvents: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
            <motion.div animate={mode === 'sustain' ? { scale: [1, 1.02, 1],
              transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' } } : {}}
              style={{
                background: mode === 'sustain'
                  ? `linear-gradient(135deg, ${GREEN_FLASH_COLORS.primary}, ${GREEN_FLASH_COLORS.glow})`
                  : 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(12px)', border: `2px solid ${GREEN_FLASH_COLORS.glow}`,
                borderRadius: mode === 'sustain' ? 20 : 14,
                padding: mode === 'sustain' ? '20px 40px' : '10px 20px', textAlign: 'center',
              }}>
              <p style={{ margin: 0, fontSize: mode === 'sustain' ? '28px' : '16px', fontWeight: 800,
                color: mode === 'sustain' ? '#fff' : GREEN_FLASH_COLORS.glow,
                letterSpacing: mode === 'sustain' ? '-0.5px' : '0',
                textShadow: mode === 'sustain' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
              }}>{label}</p>
              {mode === 'sustain' && (
                <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                  All green lights ahead. Take a breather.
                </p>
              )}
            </motion.div>
            {xpAwarded > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 20 }}
                style={{ background: `linear-gradient(135deg, ${GREEN_FLASH_COLORS.gold}, #E8C84D)`,
                  borderRadius: 20, padding: '5px 14px', fontSize: '13px', fontWeight: 800, color: '#1a1a1a',
                  boxShadow: `0 2px 12px ${GREEN_FLASH_COLORS.gold}66`,
                }}>+{xpAwarded} XP</motion.div>
            )}
            {mode === 'sustain' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.5 }}
                style={{ marginTop: 8, width: 48, height: 48 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke={GREEN_FLASH_COLORS.glow}
                    strokeWidth="3" strokeDasharray={`${(1 - progress) * 125.6} 125.6`} strokeLinecap="round" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mode === 'sustain' && progress < 0.85 && (
          <motion.div key="sustain-check" initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.15, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
            style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              zIndex: 9996, pointerEvents: 'none', fontSize: '200px', lineHeight: 1,
              color: GREEN_FLASH_COLORS.primary, filter: 'blur(2px)',
            }}>\u2713</motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
