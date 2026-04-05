'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

/* ═══ SCENES ═══ */
const SCENES = [
  {
    image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1920&q=90&fit=crop',
    headline: 'Every great building',
    sub: '',
  },
  {
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1920&q=90&fit=crop',
    headline: 'started as a dream',
    sub: '',
  },
  {
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=90&fit=crop',
    headline: 'We make the journey',
    sub: 'from dream to reality',
  },
  {
    image: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1920&q=90&fit=crop',
    headline: 'effortless',
    sub: '',
  },
];

const SCENE_DURATION = 2800;

/* ═══ PATH CARDS ═══ */
const PATH_CARDS = [
  {
    id: 'dream',
    badge: '✦',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=900&q=85&fit=crop',
    alt: 'Beachfront villa with infinity pool overlooking ocean',
    title: 'I have a dream',
    desc: 'Describe what you want to build — voice, text, photo, or sketch — and watch AI bring it to life with plans, costs, and next steps.',
    cta: 'Start dreaming',
    accent: 'dream',
    href: '/dream',
  },
  {
    id: 'build',
    badge: '⚒',
    image: 'https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?w=900&q=85&fit=crop',
    alt: 'Crane against dramatic sky',
    title: 'I build for a living',
    desc: 'Launch projects, look up codes by jurisdiction, manage your pipeline, generate estimates, and run operations from one place.',
    cta: 'Start building',
    accent: 'build',
    href: '/crm',
  },
  {
    id: 'supply',
    badge: '◈',
    image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=900&q=85&fit=crop',
    alt: 'Raw construction materials',
    title: 'I supply the industry',
    desc: 'List your products and services, connect with contractors, reach builders at the exact moment they need what you offer.',
    cta: 'Start supplying',
    accent: 'supply',
    href: '/marketplace',
  },
];

const EXPLORE_TAGS = [
  { label: 'Browse Knowledge', icon: 'search' },
  { label: 'AI Copilot', icon: 'layers' },
  { label: 'Architecture Styles', icon: 'grid' },
  { label: 'Codes & Standards', icon: 'file' },
];

/* ═══ MAIN COMPONENT ═══ */
export default function CinematicPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'cinematic' | 'main'>('cinematic');
  const [sceneIndex, setSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const startTimeRef = useRef(Date.now());
  const totalDuration = SCENES.length * SCENE_DURATION;

  /* Progress bar */
  useEffect(() => {
    if (phase !== 'cinematic') return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / totalDuration) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [phase, totalDuration]);

  /* Scene advance */
  useEffect(() => {
    if (phase !== 'cinematic') return;
    const timer = setTimeout(() => {
      if (sceneIndex < SCENES.length - 1) {
        setSceneIndex((i) => i + 1);
      } else {
        setTimeout(() => setPhase('main'), 800);
      }
    }, SCENE_DURATION);
    return () => clearTimeout(timer);
  }, [sceneIndex, phase]);

  /* Show skip after 2.5s */
  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const skipCinematic = useCallback(() => setPhase('main'), []);

  const navigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  const scene = SCENES[sceneIndex];

  return (
    /* Force dark background — this page is always dark/cinematic */
    <div
      style={{
        fontFamily: "'Archivo', sans-serif",
        background: '#0a0a0a',
        color: '#f0f0f0',
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      {/* ═══ CINEMATIC OVERLAY ═══ */}
      <AnimatePresence>
        {phase === 'cinematic' && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Background image with Ken Burns */}
            <AnimatePresence mode="wait">
              <motion.div
                key={sceneIndex}
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${scene.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            </AnimatePresence>

            {/* Vignette */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)',
              }}
            />

            {/* Text */}
            <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: '0 40px' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`headline-${sceneIndex}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                >
                  <h1
                    style={{
                      fontFamily: "'Archivo Black', sans-serif",
                      fontSize: 'clamp(2.4rem, 6vw, 5rem)',
                      lineHeight: 1.05,
                      color: '#fff',
                      textShadow: '0 4px 40px rgba(0,0,0,0.5)',
                    }}
                  >
                    {scene.headline}
                  </h1>
                  {scene.sub && (
                    <p
                      style={{
                        fontFamily: "'Archivo', sans-serif",
                        fontSize: 'clamp(1rem, 2.5vw, 1.6rem)',
                        fontWeight: 300,
                        color: 'rgba(255,255,255,0.8)',
                        marginTop: 12,
                        textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                      }}
                    >
                      {scene.sub}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Skip button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: showSkip ? 1 : 0 }}
              onClick={skipCinematic}
              style={{
                position: 'absolute',
                bottom: 80,
                right: 40,
                zIndex: 10,
                padding: '10px 24px',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 100,
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(8px)',
                color: 'rgba(255,255,255,0.7)',
                fontFamily: "'Archivo', sans-serif",
                fontSize: '0.8rem',
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                cursor: 'pointer',
              }}
              whileHover={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.5)',
              }}
            >
              Skip →
            </motion.button>

            {/* Progress bar */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                background: 'rgba(255,255,255,0.1)',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #1D9E75, #5DCAA5)',
                  width: `${progress}%`,
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MAIN CONTENT ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'main' ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={phase === 'main' ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '28px 48px 0' }}
        >
          <Image
            src="/logo/b_white_outline_512.png"
            alt="BKG"
            width={40}
            height={40}
            style={{ height: 40, width: 'auto' }}
          />
          <span
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #5DCAA5, #1D9E75)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Builder&apos;s Knowledge Garden
          </span>
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phase === 'main' ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.2 }}
          style={{ textAlign: 'center', padding: '72px 48px 40px' }}
        >
          <h2
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: 'clamp(2rem, 4.5vw, 3.4rem)',
              lineHeight: 1.08,
              marginBottom: 18,
              background: 'linear-gradient(135deg, #ffffff 40%, #5DCAA5)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Where do you want
            <br />
            to begin?
          </h2>
          <p
            style={{
              fontSize: '1.1rem',
              color: 'rgba(255,255,255,0.55)',
              maxWidth: 560,
              margin: '0 auto',
              fontWeight: 300,
              lineHeight: 1.6,
            }}
          >
            The operating system for everyone who dreams, designs, plans, builds, delivers, and grows
            in the construction economy.
          </p>
        </motion.div>

        {/* Path Cards */}
        <div style={{ padding: '20px 48px 48px', maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 18 }}>
            {PATH_CARDS.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={phase === 'main' ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.9, delay: 0.35 + i * 0.15 }}
                onClick={() => navigate(card.href)}
                whileHover={{ y: -5, boxShadow: '0 24px 64px -16px rgba(0,0,0,0.8)' }}
                style={{
                  position: 'relative',
                  background: '#181818',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 20,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                  <img
                    src={card.image}
                    alt={card.alt}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'saturate(0.8) brightness(0.85)',
                      transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.6s',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 60,
                      background: 'linear-gradient(to top, #181818, transparent)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      background: 'rgba(0,0,0,0.45)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      zIndex: 2,
                    }}
                  >
                    {card.badge}
                  </div>
                </div>
                <div style={{ padding: '20px 24px 24px' }}>
                  <div
                    style={{
                      fontFamily: "'Archivo Black', sans-serif",
                      fontSize: '1.25rem',
                      marginBottom: 8,
                      lineHeight: 1.2,
                      color: '#f0f0f0',
                    }}
                  >
                    {card.title}
                  </div>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      color: 'rgba(255,255,255,0.5)',
                      lineHeight: 1.55,
                      fontWeight: 300,
                    }}
                  >
                    {card.desc}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 16,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color:
                        card.accent === 'dream'
                          ? '#D85A30'
                          : card.accent === 'build'
                          ? '#1D9E75'
                          : '#C4A44A',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    {card.cta} <span>→</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Explore Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={phase === 'main' ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.85 }}
            onClick={() => navigate('/knowledge')}
            whileHover={{
              y: -3,
              borderColor: 'rgba(29,158,117,0.3)',
              boxShadow: '0 32px 80px -24px rgba(0,0,0,0.8), 0 0 120px -40px rgba(29,158,117,0.25)',
            }}
            style={{
              position: 'relative',
              background: '#181818',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              height: 300,
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, #181818 0%, #181818 12%, rgba(24,24,24,0.95) 22%, rgba(24,24,24,0.75) 38%, rgba(24,24,24,0.3) 60%, transparent 85%)',
                zIndex: 2,
              }}
            />
            <div
              style={{
                position: 'relative',
                zIndex: 5,
                padding: '36px 40px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                maxWidth: 440,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.14em',
                  color: '#5DCAA5',
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#1D9E75',
                    display: 'inline-block',
                    animation: 'pulse 2.5s ease-in-out infinite',
                  }}
                />
                The Knowledge Garden
              </div>
              <div
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: '1.7rem',
                  lineHeight: 1.12,
                  marginBottom: 12,
                  background: 'linear-gradient(135deg, #ffffff 30%, #5DCAA5)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Explore the Garden
              </div>
              <div
                style={{
                  fontSize: '0.92rem',
                  color: 'rgba(255,255,255,0.5)',
                  lineHeight: 1.6,
                  fontWeight: 300,
                  marginBottom: 22,
                }}
              >
                The scientific foundation beneath everything. Browse knowledge entities, study codes,
                discover materials, and let AI guide you through the construction universe.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {EXPLORE_TAGS.map((tag) => (
                  <span
                    key={tag.label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 13px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 100,
                      fontSize: '0.76rem',
                      color: 'rgba(255,255,255,0.55)',
                      fontWeight: 400,
                    }}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phase === 'main' ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 1.1 }}
          style={{
            textAlign: 'center',
            padding: '40px 48px 28px',
            color: 'rgba(255,255,255,0.25)',
            fontSize: '0.75rem',
            fontWeight: 400,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
          }}
        >
          The Knowledge Gardens · Dream → Design → Plan → Build → Deliver → Grow
        </motion.div>
      </motion.div>

      {/* Pulse animation keyframe */}
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.75);
          }
        }
        @media (max-width: 900px) {
          .path-row-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
