'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { type DiscoverSelections, DISCOVER_STEPS } from './DiscoverFlow';

const WARM = '#D85A30';
const GOLD = '#C4A44A';
const INK = '#2C1810';
const MUTED = '#8B7355';
const GREEN = '#1D9E75';

// ═══ Dream profile type ═══
export interface DreamProfile {
  title: string;
  description: string;
  style: string;
  mood: string;
  materials: string[];
  colorPalette: string[];
  estimatedBudget: string;
  scale: string;
  nextSteps: string[];
}

// ═══ Template fallback profiles (when API is slow/unavailable) ═══
const TEMPLATE_PROFILES: Record<string, Partial<DreamProfile>> = {
  'cozy': { title: 'The Sanctuary Builder', mood: 'Warm amber mornings, firelit evenings', colorPalette: ['#8B6914', '#D4A76A', '#5C4033', '#E8DFD0'] },
  'bold': { title: 'The Quiet Radical', mood: 'Precise, calm, powerful', colorPalette: ['#2D2D2D', '#888888', '#F5F5F5', '#D85A30'] },
  'airy': { title: 'The Light Chaser', mood: 'Cathedral light, cloudscape views', colorPalette: ['#87CEEB', '#F5F5F5', '#E8DFD0', '#C4A44A'] },
  'natural': { title: 'The Earth Whisperer', mood: 'Forest floor stillness, creek sound', colorPalette: ['#6B8E4E', '#8B7355', '#D4A76A', '#5C4033'] },
  'minimal': { title: 'The Essential Architect', mood: 'Silence as a feature, space as luxury', colorPalette: ['#F5F5F5', '#E0E0E0', '#2D2D2D', '#888888'] },
  'grand': { title: 'The Statement Maker', mood: 'Guests gasp when they walk in', colorPalette: ['#C4A44A', '#2D2D2D', '#8B6914', '#F5F5F5'] },
};

function buildFallbackProfile(selections: DiscoverSelections): DreamProfile {
  const feels = (selections.feel as string[]) || [];
  const priorities = (selections.priorities as string[]) || [];
  const style = ((selections.style as string[]) || [])[0] || 'contemporary';
  const scale = ((selections.scale as string[]) || [])[0] || 'medium';
  const outdoor = (selections.outdoor as number) || 50;
  const template = TEMPLATE_PROFILES[feels[0]] || TEMPLATE_PROFILES['bold'];

  const styleLabels: Record<string, string> = {
    farmhouse: 'Modern Farmhouse', industrial: 'Urban Industrial', mediterranean: 'Mediterranean',
    contemporary: 'Contemporary', craftsman: 'Craftsman', japandi: 'Japandi',
  };
  const scaleLabels: Record<string, string> = {
    small: '$5k – $80k', medium: '$80k – $500k', large: '$500k+',
  };

  const materialMap: Record<string, string[]> = {
    farmhouse: ['Reclaimed barn wood', 'Shiplap', 'Black iron hardware', 'Natural stone'],
    industrial: ['Exposed steel', 'Polished concrete', 'Reclaimed brick', 'Blackened metal'],
    mediterranean: ['Terracotta tile', 'Stucco walls', 'Wrought iron', 'Hand-painted ceramic'],
    contemporary: ['Glass panels', 'Engineered stone', 'Aluminum composite', 'White oak'],
    craftsman: ['Quarter-sawn oak', 'Art glass', 'River stone', 'Copper hardware'],
    japandi: ['Light ash wood', 'Washi paper screens', 'Natural linen', 'Concrete aggregate'],
  };

  return {
    title: template.title || 'The Visionary',
    description: `Your dream blends ${feels.map(f => f).join(' and ')} energy with ${styleLabels[style] || 'contemporary'} form. ${outdoor > 60 ? 'You crave connection to the outdoors — expect generous glass and transitional spaces.' : 'You value interior warmth and enclosure.'} ${priorities.includes('light') ? 'Natural light is non-negotiable.' : ''} ${priorities.includes('kitchen') ? 'The kitchen is your command center.' : ''}`,
    style: styleLabels[style] || 'Contemporary',
    mood: template.mood || 'Uniquely yours',
    materials: materialMap[style] || ['To be discovered'],
    colorPalette: template.colorPalette || ['#888888', '#D4A76A', '#2D2D2D', '#F5F5F5'],
    estimatedBudget: scaleLabels[scale] || '$80k – $500k',
    scale: scale,
    nextSteps: [
      'Refine your vision in the Design Studio',
      'Generate AI concept renders',
      'Get jurisdiction-specific code requirements',
      'See a preliminary cost breakdown',
    ],
  };
}

// ═══ Reveal animation ═══
function RevealAnimation() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60dvh', gap: 24,
    }}>
      <motion.div
        animate={{ rotate: 360, scale: [0.5, 1.2, 1] }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80">
          <motion.circle cx="40" cy="40" r="36" fill="none" stroke={GOLD} strokeWidth="2"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5 }} />
          <motion.circle cx="40" cy="40" r="24" fill="none" stroke={WARM} strokeWidth="1.5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.3 }} />
          <motion.circle cx="40" cy="40" r="12" fill={WARM}
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} />
        </svg>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{ fontSize: 18, fontWeight: 600, color: INK }}
      >
        Synthesizing your dream...
      </motion.p>
    </div>
  );
}

// ═══ Main DreamReveal ═══
interface DreamRevealProps {
  selections: DiscoverSelections;
  onRefine: (profile: DreamProfile) => void;
  onStartOver: () => void;
}

export default function DreamReveal({ selections, onRefine, onStartOver }: DreamRevealProps) {
  const [phase, setPhase] = useState<'animating' | 'revealed'>('animating');
  const [profile, setProfile] = useState<DreamProfile | null>(null);
  const [apiCalled, setApiCalled] = useState(false);

  // Synthesize dream via Claude API (with template fallback)
  useEffect(() => {
    if (apiCalled) return;
    setApiCalled(true);

    const fallback = buildFallbackProfile(selections);

    // Show animation for at least 2.2s
    const animTimer = setTimeout(() => {
      setPhase('revealed');
    }, 2200);

    // Attempt real Claude call
    fetch('/api/v1/oracle/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: selections,
        mode: 'discover',
      }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.profile) {
          setProfile({
            ...fallback,
            ...data.profile,
            materials: data.profile.materials || fallback.materials,
          });
        } else {
          setProfile(fallback);
        }
      })
      .catch(() => {
        setProfile(fallback);
      });

    // If API hasn't responded by animation end, use fallback
    const fallbackTimer = setTimeout(() => {
      setProfile(prev => prev || fallback);
    }, 2500);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(fallbackTimer);
    };
  }, [selections, apiCalled]);

  if (phase === 'animating') {
    return <RevealAnimation />;
  }

  if (!profile) return null;

  // Collect palette chips for display
  const chips: { label: string; color: string }[] = [];
  Object.entries(selections).forEach(([stepId, vals]) => {
    if (Array.isArray(vals)) {
      const step = DISCOVER_STEPS.find(s => s.id === stepId);
      vals.forEach(v => {
        const opt = step?.options?.find(o => o.id === v);
        if (opt) chips.push({ label: opt.label, color: opt.color });
      });
    }
  });

  return (
    <div style={{
      minHeight: '100dvh', padding: '24px 20px',
      background: `linear-gradient(180deg, #FDF8F0 0%, #FFF8F0 100%)`,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ maxWidth: 560, margin: '0 auto' }}
      >
        {/* Header badge */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: GREEN + '18', color: GREEN,
              letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16,
            }}
          >
            ✦ Dream revealed
          </motion.div>

          <h2 style={{ fontSize: 28, fontWeight: 900, color: INK, margin: '0 0 8px', lineHeight: 1.2 }}>
            {profile.title}
          </h2>
          <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, margin: 0, maxWidth: 440, marginInline: 'auto' }}>
            {profile.description}
          </p>
        </div>

        {/* Dream card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: '#fff', borderRadius: 16, padding: 24,
            border: `1px solid ${GOLD}22`, marginBottom: 20,
          }}
        >
          {/* Style + mood */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Style
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{profile.style}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Mood
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{profile.mood}</div>
            </div>
          </div>

          {/* Color palette swatches */}
          {profile.colorPalette && profile.colorPalette.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Color palette
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {profile.colorPalette.map((c, i) => (
                  <div key={i} style={{
                    width: 40, height: 40, borderRadius: 8, background: c,
                    border: '1px solid #E8DFD088',
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Materials */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Material palette
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.materials.map((m, i) => (
                <span key={i} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: '#FAF5ED', color: INK, border: '1px solid #E8DFD0',
                }}>
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0 0', borderTop: '1px solid #F0E8DA',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>
                Estimated range
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: WARM }}>
              {profile.estimatedBudget}
            </div>
          </div>
        </motion.div>

        {/* Collected chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
          {chips.map((c, i) => (
            <span key={i} style={{
              padding: '3px 8px', borderRadius: 16, fontSize: 11, fontWeight: 500,
              background: c.color + '14', color: c.color, border: `1px solid ${c.color}28`,
            }}>
              {c.label}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onStartOver}
            style={{
              flex: 1, padding: '14px 20px', borderRadius: 12, cursor: 'pointer',
              background: 'transparent', border: '1.5px solid #DDD5C8',
              fontSize: 14, fontWeight: 600, color: MUTED,
            }}
          >
            Start over
          </button>
          <motion.button
            onClick={() => onRefine(profile)}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 2, padding: '14px 20px', borderRadius: 12, cursor: 'pointer',
              background: WARM, border: 'none', fontSize: 14, fontWeight: 700, color: '#fff',
            }}
          >
            Refine this dream →
          </motion.button>
        </div>

        <p style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 16, opacity: 0.6 }}>
          Takes you to the Design Studio with everything pre-loaded
        </p>
      </motion.div>
    </div>
  );
}
