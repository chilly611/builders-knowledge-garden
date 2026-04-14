'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DiscoverFlow, { type DiscoverSelections } from './components/DiscoverFlow';
import DreamReveal, { type DreamProfile } from './components/DreamReveal';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';

// ═══ Design tokens ═══
const WARM = '#D85A30';
const GOLD = '#C4A44A';
const CREAM = '#FDF8F0';
const INK = '#2C1810';
const MUTED = '#8B7355';
const GREEN = '#1D9E75';

// ═══ Trade-aware placeholder prompts ═══
function getPlaceholder(lane?: string | null): string {
  const prompts: Record<string, string[]> = {
    gc: ['3-story mixed-use in downtown Portland...', '40-unit apartment complex with underground parking...', 'Tenant improvement for a 5,000 SF dental office...'],
    roofer: ['Standing seam metal roof replacement, 2,400 SF ranch...', 'Flat roof commercial repair, EPDM to TPO conversion...'],
    hvac: ['Mini-split install for a 1,800 SF ADU...', 'Ductwork replacement for a 3-story townhome...'],
    electrician: ['200A panel upgrade, 1960s bungalow...', 'EV charger install, detached garage...'],
    plumber: ['Whole-house repipe, copper to PEX...', 'Bathroom addition with tankless water heater...'],
    remodeler: ['Full kitchen remodel, open concept...', 'Master bath renovation, walk-in shower...'],
    default: ['Modern farmhouse in Asheville...', 'Kitchen remodel with an island and skylight...', 'ADU in the backyard for my parents...', 'A treehouse my kids will never forget...'],
  };
  const pool = prompts[lane || 'default'] || prompts.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ═══ Phases ═══
type Phase = 'welcome' | 'discover' | 'reveal';

export default function DreamPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('welcome');
  const [selections, setSelections] = useState<DiscoverSelections>({});
  const [expressInput, setExpressInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Read lane from localStorage (set during /onboarding)
  const lane = typeof window !== 'undefined' ? localStorage.getItem('bkg-lane') : null;

  const { isListening, transcript, isSupported, startListening, stopListening } = useSpeechRecognition();

  // ═══ Express path: type/voice → straight to /dream/design ═══
  const handleExpressSubmit = useCallback(() => {
    const text = expressInput.trim() || transcript.trim();
    if (!text) return;

    // Save to localStorage for Design Studio to pick up
    localStorage.setItem('bkg-dream-express', JSON.stringify({
      prompt: text,
      timestamp: Date.now(),
      lane,
    }));

    router.push('/dream/design?source=express');
  }, [expressInput, transcript, lane, router]);

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      // If we got a transcript, submit it
      setTimeout(() => {
        if (transcript.trim()) {
          setExpressInput(transcript);
          handleExpressSubmit();
        }
      }, 300);
    } else {
      startListening();
    }
  }, [isListening, stopListening, startListening, transcript, handleExpressSubmit]);

  // ═══ Discover path callbacks ═══
  const handleDiscoverComplete = useCallback((sels: DiscoverSelections) => {
    setSelections(sels);
    setPhase('reveal');
  }, []);

  const handleRefine = useCallback((profile: DreamProfile) => {
    // Save dream profile for Design Studio
    localStorage.setItem('bkg-dream-profile', JSON.stringify({
      ...profile,
      selections,
      timestamp: Date.now(),
      source: 'discover',
    }));
    router.push('/dream/design?source=discover');
  }, [selections, router]);

  const handleStartOver = useCallback(() => {
    setSelections({});
    setPhase('welcome');
  }, []);

  // ═══ Render by phase ═══
  return (
    <AnimatePresence mode="wait">
      {phase === 'welcome' && (
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            minHeight: '100dvh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px',
            background: `linear-gradient(180deg, ${CREAM} 0%, #FFF8F0 100%)`,
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 3 + i * 0.7,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute', width: 5, height: 5, borderRadius: '50%',
                background: i % 2 === 0 ? WARM : GOLD,
                top: `${15 + (i * 13) % 70}%`,
                left: `${8 + (i * 19) % 84}%`,
              }}
            />
          ))}

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', maxWidth: 480, width: '100%', position: 'relative', zIndex: 1 }}
          >
            {/* Brand mark */}
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 3, color: WARM,
              textTransform: 'uppercase', marginBottom: 20,
            }}>
              The Dream Machine
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: 34, fontWeight: 900, color: INK,
              margin: '0 0 12px', lineHeight: 1.1,
            }}>
              What do you want<br />to build?
            </h1>

            <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.6, margin: '0 0 36px' }}>
              Type it, say it, or let us help you discover it.<br />
              No wrong answers. Dreams grow.
            </p>

            {/* ═══ Main input (Express ramp) ═══ */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#fff', border: `1.5px solid ${GOLD}44`,
              borderRadius: 14, padding: '12px 16px',
              marginBottom: 16, width: '100%',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}>
              <input
                ref={inputRef}
                type="text"
                value={isListening ? transcript : expressInput}
                onChange={(e) => setExpressInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleExpressSubmit(); }}
                placeholder={getPlaceholder(lane)}
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: 16, color: INK,
                  background: 'transparent',
                }}
              />
              {/* Voice button */}
              {isSupported && (
                <motion.button
                  onClick={handleVoiceToggle}
                  whileTap={{ scale: 0.92 }}
                  style={{
                    width: 40, height: 40, borderRadius: '50%', border: 'none',
                    background: isListening ? WARM : WARM,
                    color: '#fff', cursor: 'pointer', fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, position: 'relative',
                  }}
                >
                  {isListening && (
                    <motion.div
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      style={{
                        position: 'absolute', inset: -4, borderRadius: '50%',
                        border: `2px solid ${WARM}44`,
                      }}
                    />
                  )}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 1v11M12 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
                  </svg>
                </motion.button>
              )}
              {/* Submit arrow */}
              {(expressInput.trim() || transcript.trim()) && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={handleExpressSubmit}
                  style={{
                    width: 40, height: 40, borderRadius: '50%', border: 'none',
                    background: GREEN, color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </motion.button>
              )}
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 24px' }}>
              <div style={{ flex: 1, height: 1, background: '#DDD5C8' }} />
              <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#DDD5C8' }} />
            </div>

            {/* ═══ Two secondary ramps ═══ */}
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              {/* Discover ramp */}
              <motion.button
                onClick={() => setPhase('discover')}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1, padding: '20px 16px', borderRadius: 14, cursor: 'pointer',
                  background: '#fff', border: `1.5px solid ${GOLD}33`,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>✦</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 4 }}>
                  Help me discover
                </div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>
                  5 quick questions, zero jargon
                </div>
              </motion.button>

              {/* Upload ramp */}
              <motion.button
                onClick={() => router.push('/dream/upload')}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1, padding: '20px 16px', borderRadius: 14, cursor: 'pointer',
                  background: '#fff', border: `1.5px solid ${GREEN}33`,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>📎</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 4 }}>
                  I have files
                </div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>
                  Photos, plans, sketches, links
                </div>
              </motion.button>
            </div>

            {/* Footer note */}
            <p style={{ fontSize: 11, color: MUTED, marginTop: 32, opacity: 0.5 }}>
              Everything here is free. Dream as big as you want.
            </p>
          </motion.div>
        </motion.div>
      )}

      {phase === 'discover' && (
        <motion.div
          key="discover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <DiscoverFlow
            onComplete={handleDiscoverComplete}
            onBack={() => setPhase('welcome')}
          />
        </motion.div>
      )}

      {phase === 'reveal' && (
        <motion.div
          key="reveal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <DreamReveal
            selections={selections}
            onRefine={handleRefine}
            onStartOver={handleStartOver}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
