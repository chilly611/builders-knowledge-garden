'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectProvider, useProject } from '../../dream-shared/ProjectContext';
import SaveLoadPanel from '../../dream-shared/SaveLoadPanel';
import ProjectPicker from '../../dream-shared/ProjectPicker';
import type { AlchemistState, DreamProject } from '../../dream-shared/types';

/* ─── Types ─── */
type IngredientType = 'style' | 'material' | 'feature' | 'mood';
type Phase = 'compose' | 'transmuting' | 'result';

interface Ingredient {
  id: string;
  type: IngredientType;
  label: string;
  emoji?: string;
  color: string;
}

interface AlchemyResult {
  name: string;
  style: string;
  description: string;
  features: string[];
  estimatedCost: string;
  imageUrl: string | null;
  imagePrompt: string;
}

/* ─── Ingredient Data ─── */
const STYLES: Ingredient[] = [
  { id: 's-med', type: 'style', label: 'Mediterranean', color: '#D4A574' },
  { id: 's-mod', type: 'style', label: 'Modern', color: '#94A3B8' },
  { id: 's-craft', type: 'style', label: 'Craftsman', color: '#8B6F47' },
  { id: 's-deco', type: 'style', label: 'Art Deco', color: '#C4A44A' },
  { id: 's-brut', type: 'style', label: 'Brutalist', color: '#6B7280' },
  { id: 's-jpn', type: 'style', label: 'Japanese', color: '#9CA38F' },
  { id: 's-scan', type: 'style', label: 'Scandinavian', color: '#E5DDD3' },
  { id: 's-span', type: 'style', label: 'Spanish Colonial', color: '#CD7F32' },
  { id: 's-ind', type: 'style', label: 'Industrial', color: '#78716C' },
  { id: 's-farm', type: 'style', label: 'Farmhouse', color: '#A3B18A' },
  { id: 's-tudor', type: 'style', label: 'Tudor', color: '#7C5C3E' },
  { id: 's-prairie', type: 'style', label: 'Prairie', color: '#B5865A' },
  { id: 's-trop', type: 'style', label: 'Tropical', color: '#2D9E75' },
  { id: 's-min', type: 'style', label: 'Minimalist', color: '#D4D4D4' },
  { id: 's-bio', type: 'style', label: 'Biophilic', color: '#6BA368' },
  { id: 's-mid', type: 'style', label: 'Mid-Century', color: '#E07A5F' },
];

const MATERIALS: Ingredient[] = [
  { id: 'm-wood', type: 'material', label: 'Warm Wood', emoji: '🪵', color: '#A0734A' },
  { id: 'm-concrete', type: 'material', label: 'Raw Concrete', emoji: '🧱', color: '#9CA3AF' },
  { id: 'm-steel', type: 'material', label: 'Brushed Steel', emoji: '⚙️', color: '#94A3B8' },
  { id: 'm-stone', type: 'material', label: 'Natural Stone', emoji: '🪨', color: '#8B8578' },
  { id: 'm-glass', type: 'material', label: 'Glass', emoji: '🪟', color: '#7DD3FC' },
  { id: 'm-brick', type: 'material', label: 'Exposed Brick', emoji: '🏠', color: '#C0392B' },
  { id: 'm-terra', type: 'material', label: 'Terracotta', emoji: '🏺', color: '#CD7F32' },
  { id: 'm-copper', type: 'material', label: 'Copper', emoji: '🔶', color: '#B87333' },
  { id: 'm-marble', type: 'material', label: 'Marble', emoji: '🤍', color: '#E8E0D8' },
  { id: 'm-bamboo', type: 'material', label: 'Bamboo', emoji: '🎋', color: '#90B06A' },
];

const FEATURES: Ingredient[] = [
  { id: 'f-pool', type: 'feature', label: 'Infinity Pool', emoji: '🏊', color: '#38BDF8' },
  { id: 'f-court', type: 'feature', label: 'Courtyard', emoji: '🌿', color: '#6BA368' },
  { id: 'f-green', type: 'feature', label: 'Green Roof', emoji: '🌱', color: '#4ADE80' },
  { id: 'f-theater', type: 'feature', label: 'Home Theater', emoji: '🎬', color: '#7C3AED' },
  { id: 'f-kitchen', type: 'feature', label: "Chef's Kitchen", emoji: '👨‍🍳', color: '#F59E0B' },
  { id: 'f-library', type: 'feature', label: 'Library', emoji: '📚', color: '#92400E' },
  { id: 'f-wine', type: 'feature', label: 'Wine Cellar', emoji: '🍷', color: '#881337' },
  { id: 'f-roof', type: 'feature', label: 'Rooftop Deck', emoji: '☀️', color: '#F97316' },
  { id: 'f-indoor', type: 'feature', label: 'Indoor-Outdoor', emoji: '🚪', color: '#059669' },
  { id: 'f-sky', type: 'feature', label: 'Skylights', emoji: '💡', color: '#FBBF24' },
  { id: 'f-fire', type: 'feature', label: 'Firepit', emoji: '🔥', color: '#DC2626' },
  { id: 'f-work', type: 'feature', label: 'Workshop', emoji: '🔨', color: '#78716C' },
  { id: 'f-gym', type: 'feature', label: 'Home Gym', emoji: '💪', color: '#3B82F6' },
  { id: 'f-sauna', type: 'feature', label: 'Sauna', emoji: '♨️', color: '#EA580C' },
  { id: 'f-nook', type: 'feature', label: 'Reading Nook', emoji: '📖', color: '#A16207' },
];

const MOODS: Ingredient[] = [
  { id: 'mo-sunset', type: 'mood', label: 'Sunset', emoji: '🌅', color: '#F97316' },
  { id: 'mo-mount', type: 'mood', label: 'Mountains', emoji: '🏔️', color: '#6B7280' },
  { id: 'mo-ocean', type: 'mood', label: 'Ocean', emoji: '🌊', color: '#0EA5E9' },
  { id: 'mo-forest', type: 'mood', label: 'Forest', emoji: '🌲', color: '#16A34A' },
  { id: 'mo-city', type: 'mood', label: 'City', emoji: '🏙️', color: '#6366F1' },
  { id: 'mo-garden', type: 'mood', label: 'Garden', emoji: '🌸', color: '#EC4899' },
  { id: 'mo-snow', type: 'mood', label: 'Snow', emoji: '❄️', color: '#BAE6FD' },
  { id: 'mo-night', type: 'mood', label: 'Night', emoji: '🌙', color: '#4338CA' },
];

const ALL_CATEGORIES = [
  { label: 'Styles', items: STYLES },
  { label: 'Materials', items: MATERIALS },
  { label: 'Features', items: FEATURES },
  { label: 'Moods', items: MOODS },
];

/* ─── Mock Result Generator ─── */
function generateMockResult(crucible: Ingredient[]): AlchemyResult {
  const styles = crucible.filter(i => i.type === 'style').map(i => i.label);
  const materials = crucible.filter(i => i.type === 'material').map(i => i.label);
  const features = crucible.filter(i => i.type === 'feature').map(i => i.label);
  const moods = crucible.filter(i => i.type === 'mood').map(i => i.label);

  const styleName = styles[0] || 'Contemporary';
  const moodWord = moods[0] || 'Serene';

  const names = [
    `The ${moodWord} ${styleName}`,
    `${styleName} ${moods[0] ? moodWord : 'Haven'}`,
    `The Alchemy of ${styleName}`,
  ];

  return {
    name: names[Math.floor(Math.random() * names.length)],
    style: styles.join(' × ') || 'Eclectic Modern',
    description: `A ${(styles[0] || 'modern').toLowerCase()}-inspired residence that channels the energy of ${(moods[0] || 'tranquility').toLowerCase()}. ${materials.length ? `Built with ${materials.join(' and ').toLowerCase()}, ` : ''}this home blends ${features.length > 1 ? features.slice(0, 2).join(' and ').toLowerCase() : 'thoughtful spaces'} into an architecture that feels both grounded and transcendent. Every room is a dialogue between structure and soul.`,
    features: features.length ? features : ['Open floor plan', 'Natural light', 'Indoor-outdoor flow'],
    estimatedCost: `$${(350 + Math.floor(Math.random() * 650))}K – $${(800 + Math.floor(Math.random() * 1200))}K`,
    imageUrl: null,
    imagePrompt: `Architectural photograph, ${styles.join(', ')} style home, ${materials.join(', ')} materials, ${moods.join(', ')} mood, ${features.join(', ')}, golden hour, professional photography`,
  };
}

/* ─── Component ─── */
function AlchemistPageInner() {
  const [phase, setPhase] = useState<Phase>('compose');
  const [crucible, setCrucible] = useState<Ingredient[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [result, setResult] = useState<AlchemyResult | null>(null);
  const [transmutePulse, setTransmutePulse] = useState(0);
  const crucibleRef = useRef<HTMLDivElement>(null);

  const addToCrucible = useCallback((ingredient: Ingredient) => {
    setCrucible(prev => {
      if (prev.find(i => i.id === ingredient.id)) return prev;
      if (prev.length >= 7) return prev;
      return [...prev, ingredient];
    });
  }, []);

  const removeFromCrucible = useCallback((id: string) => {
    setCrucible(prev => prev.filter(i => i.id !== id));
  }, []);

  const transmute = useCallback(async () => {
    if (crucible.length < 2) return;
    setPhase('transmuting');
    setTransmutePulse(0);

    // Animate through pulse stages
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 600));
      setTransmutePulse(i + 1);
    }

    // Try API, fall back to mock
    try {
      const res = await fetch('/api/v1/oracle/transmute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: crucible.map(i => ({ type: i.type, label: i.label })) }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        throw new Error('API unavailable');
      }
    } catch {
      // Generate locally
      await new Promise(r => setTimeout(r, 800));
      setResult(generateMockResult(crucible));
    }

    setPhase('result');
  }, [crucible]);

  const remix = useCallback(() => {
    setPhase('compose');
    setResult(null);
  }, []);

  const startFresh = useCallback(() => {
    setCrucible([]);
    setResult(null);
    setPhase('compose');
  }, []);

  // ─── Save/Load Integration ───
  const [showPicker, setShowPicker] = useState(false);

  const handleSerialize = useCallback(() => {
    const interfaceData: AlchemistState = {
      phase,
      crucibleIds: crucible.map(i => i.id),
      activeCategory,
      result: result ? {
        name: result.name,
        style: result.style,
        description: result.description,
        features: result.features,
        estimatedCost: result.estimatedCost,
        imagePrompt: result.imagePrompt,
      } : null,
    };
    const allIngredients = [...STYLES, ...MATERIALS, ...FEATURES, ...MOODS];
    return {
      interfaceData,
      essence: {
        styles: crucible.filter(i => i.type === 'style').map(i => i.label),
        materials: crucible.filter(i => i.type === 'material').map(i => i.label),
        features: crucible.filter(i => i.type === 'feature').map(i => i.label),
        moods: crucible.filter(i => i.type === 'mood').map(i => i.label),
        estimatedBudget: result?.estimatedCost || '',
        freeformNotes: result?.description || '',
      },
    };
  }, [phase, crucible, activeCategory, result]);

  const handleDeserialize = useCallback((data: { interfaceData: unknown; essence: DreamProject['dreamEssence'] }) => {
    const state = data.interfaceData as AlchemistState | null;
    const allIngredients = [...STYLES, ...MATERIALS, ...FEATURES, ...MOODS];
    if (state) {
      setPhase(state.phase === 'transmuting' ? 'compose' : state.phase || 'compose');
      setCrucible(state.crucibleIds
        .map(id => allIngredients.find(i => i.id === id))
        .filter((i): i is Ingredient => !!i));
      setActiveCategory(state.activeCategory || 0);
      if (state.result) {
        setResult({ ...state.result, imageUrl: null });
      }
    } else if (data.essence) {
      // Seed from dream essence (cross-interface import)
      const matched: Ingredient[] = [];
      for (const label of [...(data.essence.styles || []), ...(data.essence.materials || []), ...(data.essence.features || []), ...(data.essence.moods || [])]) {
        const found = allIngredients.find(i => i.label.toLowerCase() === label.toLowerCase());
        if (found && matched.length < 7) matched.push(found);
      }
      if (matched.length > 0) setCrucible(matched);
      setPhase('compose');
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'var(--font-archivo), sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(216,90,48,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(196,164,74,0.06) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <header style={{
        position: 'relative', zIndex: 10, padding: '24px 32px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{
            fontSize: '28px', fontWeight: 800, margin: 0,
            background: 'linear-gradient(135deg, #D85A30, #C4A44A)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>
            The Alchemist
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
            Combine ingredients. Transmute a dream.
          </p>
        </div>
        <a href="/dream" style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
          padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          ← Dream Machine
        </a>
      </header>

      <AnimatePresence mode="wait">
        {/* ─── COMPOSE PHASE ─── */}
        {phase === 'compose' && (
          <motion.div
            key="compose"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'relative', zIndex: 5 }}
          >
            {/* Crucible */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '20px 32px 16px',
            }}>
              <div
                ref={crucibleRef}
                style={{
                  width: 280, height: 280, borderRadius: '50%',
                  border: `2px solid ${crucible.length > 0 ? 'rgba(216,90,48,0.6)' : 'rgba(255,255,255,0.12)'}`,
                  background: crucible.length > 0
                    ? 'radial-gradient(circle, rgba(216,90,48,0.15) 0%, rgba(196,164,74,0.08) 50%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
                  display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: 24,
                  transition: 'all 0.5s ease',
                  boxShadow: crucible.length > 0 ? '0 0 60px rgba(216,90,48,0.15), inset 0 0 40px rgba(196,164,74,0.08)' : 'none',
                }}
              >
                {crucible.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.5 }}>
                    Click ingredients below<br />to add them here
                  </p>
                ) : (
                  crucible.map((ing) => (
                    <motion.button
                      key={ing.id}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      onClick={() => removeFromCrucible(ing.id)}
                      style={{
                        background: `${ing.color}30`,
                        border: `1px solid ${ing.color}60`,
                        borderRadius: '20px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        color: ing.color,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontFamily: 'inherit',
                      }}
                      title="Click to remove"
                    >
                      {ing.emoji && <span>{ing.emoji}</span>}
                      <span>{ing.label}</span>
                      <span style={{ opacity: 0.5, marginLeft: 2 }}>×</span>
                    </motion.button>
                  ))
                )}
              </div>

              {/* Crucible count + Transmute button */}
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 12px' }}>
                  {crucible.length}/7 ingredients · {crucible.length < 2 ? 'Add at least 2' : 'Ready to transmute'}
                </p>
                <button
                  onClick={transmute}
                  disabled={crucible.length < 2}
                  style={{
                    background: crucible.length >= 2
                      ? 'linear-gradient(135deg, #D85A30, #C4A44A)'
                      : 'rgba(255,255,255,0.08)',
                    color: crucible.length >= 2 ? '#fff' : 'rgba(255,255,255,0.3)',
                    border: 'none',
                    borderRadius: '28px',
                    padding: '14px 40px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: crucible.length >= 2 ? 'pointer' : 'default',
                    fontFamily: 'inherit',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease',
                    boxShadow: crucible.length >= 2 ? '0 4px 20px rgba(216,90,48,0.3)' : 'none',
                  }}
                >
                  ✦ Transmute
                </button>
              </div>
            </div>

            {/* Category tabs */}
            <div style={{
              display: 'flex', gap: 0, padding: '0 32px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              {ALL_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(i)}
                  style={{
                    background: 'none', border: 'none', borderBottom: activeCategory === i ? '2px solid #C4A44A' : '2px solid transparent',
                    color: activeCategory === i ? '#C4A44A' : 'rgba(255,255,255,0.4)',
                    padding: '12px 20px',
                    fontSize: '13px',
                    fontWeight: activeCategory === i ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {cat.label} ({cat.items.length})
                </button>
              ))}
            </div>

            {/* Ingredient grid */}
            <div style={{
              padding: '20px 32px 100px',
              display: 'flex', flexWrap: 'wrap', gap: 10,
            }}>
              <AnimatePresence mode="popLayout">
                {ALL_CATEGORIES[activeCategory].items.map((ing) => {
                  const inCrucible = crucible.find(c => c.id === ing.id);
                  return (
                    <motion.button
                      key={ing.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => inCrucible ? removeFromCrucible(ing.id) : addToCrucible(ing)}
                      style={{
                        background: inCrucible ? `${ing.color}25` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${inCrucible ? `${ing.color}80` : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '12px',
                        padding: '10px 16px',
                        fontSize: '13px',
                        color: inCrucible ? ing.color : 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.2s ease',
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {ing.emoji && <span style={{ fontSize: '16px' }}>{ing.emoji}</span>}
                      <span>{ing.label}</span>
                      {inCrucible && <span style={{ fontSize: '10px', opacity: 0.6 }}>✓</span>}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ─── TRANSMUTING PHASE ─── */}
        {phase === 'transmuting' && (
          <motion.div
            key="transmuting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 'calc(100vh - 100px)', padding: '40px 32px',
            }}
          >
            {/* Pulsing crucible */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 40px rgba(216,90,48,0.2)',
                  '0 0 80px rgba(196,164,74,0.4)',
                  '0 0 40px rgba(216,90,48,0.2)',
                ],
              }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                width: 200, height: 200, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(216,90,48,0.3) 0%, rgba(196,164,74,0.15) 50%, transparent 70%)',
                border: '2px solid rgba(196,164,74,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 32,
              }}
            >
              <span style={{ fontSize: '48px' }}>⚗️</span>
            </motion.div>

            {/* Progress steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300 }}>
              {['Dissolving ingredients...', 'Analyzing combinations...', 'Synthesizing concept...', 'Materializing design...', 'Rendering vision...'].map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: transmutePulse > i ? 1 : 0.3, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: '14px', color: transmutePulse > i ? '#C4A44A' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  <span style={{ width: 20, textAlign: 'center' }}>
                    {transmutePulse > i ? '✦' : '○'}
                  </span>
                  {step}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── RESULT PHASE ─── */}
        {phase === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              padding: '20px 32px 80px',
              maxWidth: 800, margin: '0 auto',
            }}
          >
            {/* Result card */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(196,164,74,0.3)',
              borderRadius: '20px',
              overflow: 'hidden',
            }}>
              {/* Image area */}
              <div style={{
                height: 320,
                background: 'linear-gradient(135deg, rgba(216,90,48,0.15) 0%, rgba(196,164,74,0.1) 50%, rgba(30,30,30,1) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {result.imageUrl ? (
                  <img src={result.imageUrl} alt={result.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '64px', display: 'block', marginBottom: 12 }}>🏛️</span>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                      Render generating...
                    </p>
                  </div>
                )}
                {/* Recipe overlay */}
                <div style={{
                  position: 'absolute', bottom: 16, left: 16,
                  display: 'flex', gap: 6, flexWrap: 'wrap',
                }}>
                  {crucible.map(ing => (
                    <span key={ing.id} style={{
                      background: `${ing.color}40`,
                      border: `1px solid ${ing.color}60`,
                      borderRadius: '14px',
                      padding: '3px 10px',
                      fontSize: '11px',
                      color: ing.color,
                      backdropFilter: 'blur(8px)',
                    }}>
                      {ing.emoji} {ing.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '28px 28px 24px' }}>
                <h2 style={{
                  fontSize: '26px', fontWeight: 800, margin: '0 0 4px',
                  background: 'linear-gradient(135deg, #D85A30, #C4A44A)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {result.name}
                </h2>
                <p style={{ fontSize: '13px', color: '#C4A44A', margin: '0 0 16px', fontWeight: 600 }}>
                  {result.style}
                </p>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: '0 0 20px' }}>
                  {result.description}
                </p>

                {/* Features */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {result.features.map((f: string) => (
                    <span key={f} style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.6)',
                    }}>
                      {f}
                    </span>
                  ))}
                </div>

                {/* Cost estimate */}
                <div style={{
                  background: 'rgba(196,164,74,0.08)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 24,
                }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Estimated Range</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#C4A44A' }}>{result.estimatedCost}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={remix}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #D85A30, #C4A44A)',
                      color: '#fff', border: 'none', borderRadius: '12px',
                      padding: '14px', fontSize: '15px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    ♻️ Remix Recipe
                  </button>
                  <button
                    onClick={startFresh}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    ✦ New Recipe
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save/Load System */}
      <SaveLoadPanel
        interfaceType="alchemist"
        accentColor="#C4A44A"
        onSerialize={handleSerialize}
        onDeserialize={handleDeserialize}
        onOpenPicker={() => setShowPicker(true)}
      />
      <ProjectPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectProject={(project) => {
          const iData = project.interfaceData.alchemist;
          handleDeserialize({ interfaceData: iData || null, essence: project.dreamEssence });
        }}
        currentInterfaceType="alchemist"
        accentColor="#C4A44A"
      />

      <style jsx global>{`
        @keyframes crucibleGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(216,90,48,0.15); }
          50% { box-shadow: 0 0 60px rgba(196,164,74,0.25); }
        }
      `}</style>
    </div>
  );
}

export default function AlchemistPage() {
  return (
    <ProjectProvider>
      <AlchemistPageInner />
    </ProjectProvider>
  );
}
