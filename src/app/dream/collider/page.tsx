'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ============================================================================
// THE COLLIDER — Two Dreams Enter, One Building Leaves
// For couples, families, or business partners who need to align on a design
// ============================================================================

interface DreamInput {
  style: string;
  material: string;
  feature: string;
  mood: string;
  scale: string;
}

interface CollisionResult {
  name: string;
  description: string;
  harmonies: string[];
  tensions: string[];
  compromises: string[];
  features: string[];
  materials: string[];
  estimatedCost: string;
}

const STYLES = ['Modern Minimalist', 'Warm Farmhouse', 'Mediterranean Villa', 'Industrial Loft', 'Japanese Zen', 'Art Deco', 'Coastal Bohemian', 'Scandinavian', 'Brutalist', 'Prairie Style'];
const MATERIALS = ['Glass & Steel', 'Warm Wood', 'Raw Concrete', 'Natural Stone', 'Exposed Brick', 'Bamboo', 'Terracotta', 'Copper & Bronze', 'Reclaimed Wood', 'White Stucco'];
const FEATURES = ['Infinity Pool', 'Courtyard', 'Rooftop Garden', 'Home Theater', "Chef's Kitchen", 'Library Wall', 'Indoor-Outdoor Living', 'Firepit Lounge', 'Art Gallery', 'Meditation Room'];
const MOODS = ['Serene & Quiet', 'Bold & Dramatic', 'Warm & Inviting', 'Light & Airy', 'Moody & Intimate', 'Playful & Colorful', 'Rustic & Grounded', 'Futuristic & Clean'];
const SCALES = ['Cozy Cottage (1,200 sf)', 'Family Home (2,500 sf)', 'Grand Estate (4,000+ sf)', 'Urban Loft (900 sf)', 'Compound (6,000+ sf)'];

type Phase = 'intro' | 'dreamer-a' | 'dreamer-b' | 'collision' | 'result';

function synthesizeDreams(a: DreamInput, b: DreamInput): CollisionResult {
  const harmonies: string[] = [];
  const tensions: string[] = [];
  const compromises: string[] = [];

  if (a.style === b.style) harmonies.push(`You both love ${a.style} — that's your foundation`);
  else tensions.push(`${a.style} vs ${b.style} — different aesthetics`);

  if (a.material === b.material) harmonies.push(`Shared love of ${a.material}`);
  else compromises.push(`Blend ${a.material} with ${b.material} — use one for exterior, one for interior`);

  if (a.feature === b.feature) harmonies.push(`You both want a ${a.feature}!`);
  else harmonies.push(`Both features fit: ${a.feature} + ${b.feature}`);

  if (a.mood === b.mood) harmonies.push(`Same emotional wavelength: ${a.mood}`);
  else compromises.push(`${a.mood} meets ${b.mood} — create zones for each energy`);

  if (a.scale === b.scale) harmonies.push(`Agreed on size: ${a.scale}`);
  else tensions.push(`${a.scale} vs ${b.scale} — need to find middle ground`);

  if (tensions.length === 0) tensions.push('Remarkably aligned! Minor styling differences only.');
  if (compromises.length === 0) compromises.push('So aligned that compromises are just creative choices');

  const styleFusion = a.style === b.style ? a.style :
    `${a.style.split(' ')[0]} ${b.style.split(' ').pop()}`;

  return {
    name: `The ${styleFusion} Synthesis`,
    description: `A home that honors both visions — ${a.mood.toLowerCase()} spaces flow into ${b.mood.toLowerCase()} retreats, with ${a.material.toLowerCase()} grounding the exterior and ${b.material.toLowerCase()} warming the interior. This isn't a compromise — it's a conversation between two dreams that creates something neither could alone.`,
    harmonies,
    tensions,
    compromises,
    features: [a.feature, b.feature, 'Dual workspace zones', 'Connected-but-private retreats'],
    materials: [a.material, b.material],
    estimatedCost: '$450K – $1.2M (depending on location and finishes)',
  };
}

function OptionGrid({ options, selected, onSelect, label }: { options: string[]; selected: string; onSelect: (v: string) => void; label: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onSelect(opt)} style={{
            padding: '10px 18px', borderRadius: 12,
            border: selected === opt ? '2px solid #D85A30' : '1px solid rgba(255,255,255,0.15)',
            background: selected === opt ? 'rgba(216,90,48,0.2)' : 'rgba(255,255,255,0.05)',
            color: selected === opt ? '#fff' : 'rgba(255,255,255,0.7)',
            fontSize: 13, fontWeight: selected === opt ? 600 : 400,
            cursor: 'pointer', transition: 'all 0.2s',
          }}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

export default function ColliderPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [dreamerAName, setDreamerAName] = useState('Person A');
  const [dreamerBName, setDreamerBName] = useState('Person B');
  const [dreamA, setDreamA] = useState<DreamInput>({ style: '', material: '', feature: '', mood: '', scale: '' });
  const [dreamB, setDreamB] = useState<DreamInput>({ style: '', material: '', feature: '', mood: '', scale: '' });
  const [result, setResult] = useState<CollisionResult | null>(null);
  const [collisionProgress, setCollisionProgress] = useState(0);

  const isComplete = (d: DreamInput) => d.style && d.material && d.feature && d.mood && d.scale;

  const startCollision = useCallback(async () => {
    setPhase('collision');
    for (let i = 0; i <= 100; i += 2) {
      await new Promise(r => setTimeout(r, 40));
      setCollisionProgress(i);
    }
    const synthesis = synthesizeDreams(dreamA, dreamB);
    setResult(synthesis);
    setPhase('result');
  }, [dreamA, dreamB]);

  const WARM = '#D85A30';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'var(--font-archivo)' }}>
      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '16px 24px', zIndex: 50 }}>
        <Link href="/dream" style={{ color: WARM, textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 20, border: `1px solid ${WARM}40` }}>
          ← Dream Machine
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {/* INTRO */}
        {phase === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
            <motion.h1 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
              style={{ fontSize: 56, fontWeight: 700, color: WARM, marginBottom: 20 }}>The Collider</motion.h1>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
              style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 500, lineHeight: 1.6, marginBottom: 12 }}>
              Two dreams enter. One building leaves.
            </motion.p>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
              style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 440, lineHeight: 1.6, marginBottom: 40 }}>
              Each person creates their dream independently. Then we collide them — finding the harmonies, revealing the tensions, and building the synthesis.
            </motion.p>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
              style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 32 }}>
              <input placeholder="Dreamer A name" value={dreamerAName} onChange={e => setDreamerAName(e.target.value)}
                style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, width: 180, textAlign: 'center' }} />
              <span style={{ fontSize: 24, color: WARM }}>⚡</span>
              <input placeholder="Dreamer B name" value={dreamerBName} onChange={e => setDreamerBName(e.target.value)}
                style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, width: 180, textAlign: 'center' }} />
            </motion.div>
            <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }}
              onClick={() => setPhase('dreamer-a')}
              style={{ padding: '16px 48px', fontSize: 16, fontWeight: 600, borderRadius: 12, border: 'none', background: WARM, color: 'white', cursor: 'pointer' }}>
              Begin the Collision
            </motion.button>
          </motion.div>
        )}

        {/* DREAMER A */}
        {phase === 'dreamer-a' && (
          <motion.div key="a" initial={{ opacity: 0, x: -100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
            style={{ minHeight: '100vh', padding: '100px 40px 60px', maxWidth: 700, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, color: WARM, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Dreamer 1 of 2</div>
              <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{dreamerAName}&apos;s Dream</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Choose what speaks to you. Don&apos;t peek at your partner&apos;s choices.</p>
            </div>
            <OptionGrid options={STYLES} selected={dreamA.style} onSelect={v => setDreamA({ ...dreamA, style: v })} label="Architectural Style" />
            <OptionGrid options={MATERIALS} selected={dreamA.material} onSelect={v => setDreamA({ ...dreamA, material: v })} label="Primary Material" />
            <OptionGrid options={FEATURES} selected={dreamA.feature} onSelect={v => setDreamA({ ...dreamA, feature: v })} label="Must-Have Feature" />
            <OptionGrid options={MOODS} selected={dreamA.mood} onSelect={v => setDreamA({ ...dreamA, mood: v })} label="Overall Mood" />
            <OptionGrid options={SCALES} selected={dreamA.scale} onSelect={v => setDreamA({ ...dreamA, scale: v })} label="Scale" />
            {isComplete(dreamA) && (
              <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setPhase('dreamer-b')}
                style={{ padding: '16px 48px', fontSize: 16, fontWeight: 600, borderRadius: 12, border: 'none', background: WARM, color: 'white', cursor: 'pointer', marginTop: 20, width: '100%' }}>
                Lock in {dreamerAName}&apos;s Dream → Pass to {dreamerBName}
              </motion.button>
            )}
          </motion.div>
        )}

        {/* DREAMER B */}
        {phase === 'dreamer-b' && (
          <motion.div key="b" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }}
            style={{ minHeight: '100vh', padding: '100px 40px 60px', maxWidth: 700, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, color: '#C4A44A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Dreamer 2 of 2</div>
              <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{dreamerBName}&apos;s Dream</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Your turn. Choose independently — the magic happens when we collide.</p>
            </div>
            <OptionGrid options={STYLES} selected={dreamB.style} onSelect={v => setDreamB({ ...dreamB, style: v })} label="Architectural Style" />
            <OptionGrid options={MATERIALS} selected={dreamB.material} onSelect={v => setDreamB({ ...dreamB, material: v })} label="Primary Material" />
            <OptionGrid options={FEATURES} selected={dreamB.feature} onSelect={v => setDreamB({ ...dreamB, feature: v })} label="Must-Have Feature" />
            <OptionGrid options={MOODS} selected={dreamB.mood} onSelect={v => setDreamB({ ...dreamB, mood: v })} label="Overall Mood" />
            <OptionGrid options={SCALES} selected={dreamB.scale} onSelect={v => setDreamB({ ...dreamB, scale: v })} label="Scale" />
            {isComplete(dreamB) && (
              <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                onClick={startCollision}
                style={{ padding: '16px 48px', fontSize: 16, fontWeight: 600, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #D85A30, #C4A44A)', color: 'white', cursor: 'pointer', marginTop: 20, width: '100%' }}>
                ⚡ COLLIDE THE DREAMS ⚡
              </motion.button>
            )}
          </motion.div>
        )}

        {/* COLLISION ANIMATION */}
        {phase === 'collision' && (
          <motion.div key="collision" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 300, height: 300, marginBottom: 40 }}>
              {/* Two orbs colliding */}
              <motion.div animate={{ x: [-100, 0], scale: [1, 0.5, 1.3, 1] }} transition={{ duration: 2, ease: 'easeInOut' }}
                style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${WARM}, transparent)`, filter: 'blur(20px)' }} />
              <motion.div animate={{ x: [100, 0], scale: [1, 0.5, 1.3, 1] }} transition={{ duration: 2, ease: 'easeInOut' }}
                style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, #C4A44A, transparent)', filter: 'blur(20px)' }} />
              {collisionProgress > 50 && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 2, opacity: 1 }} transition={{ duration: 1 }}
                  style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)', filter: 'blur(40px)' }} />
              )}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase' }}>
              {collisionProgress < 30 ? 'Analyzing dreams...' : collisionProgress < 60 ? 'Finding harmonies...' : collisionProgress < 85 ? 'Resolving tensions...' : 'Building synthesis...'}
            </div>
            <div style={{ width: 200, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 16, overflow: 'hidden' }}>
              <motion.div style={{ height: '100%', background: `linear-gradient(90deg, ${WARM}, #C4A44A)`, width: `${collisionProgress}%` }} />
            </div>
          </motion.div>
        )}

        {/* RESULT */}
        {phase === 'result' && result && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ minHeight: '100vh', padding: '100px 40px 60px', maxWidth: 800, margin: '0 auto' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
              style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ fontSize: 12, color: WARM, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>The Synthesis</div>
              <h1 style={{ fontSize: 42, fontWeight: 700, marginBottom: 16 }}>{result.name}</h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>{result.description}</p>
            </motion.div>

            {/* Harmonies & Tensions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
              <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                style={{ padding: 24, borderRadius: 16, background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.2)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75', marginBottom: 12 }}>✨ HARMONIES</div>
                {result.harmonies.map((h, i) => <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', padding: '6px 0', lineHeight: 1.5 }}>• {h}</div>)}
              </motion.div>
              <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                style={{ padding: 24, borderRadius: 16, background: 'rgba(232,68,58,0.1)', border: '1px solid rgba(232,68,58,0.2)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E8443A', marginBottom: 12 }}>⚡ TENSIONS</div>
                {result.tensions.map((t, i) => <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', padding: '6px 0', lineHeight: 1.5 }}>• {t}</div>)}
              </motion.div>
            </div>

            {/* Compromises */}
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
              style={{ padding: 24, borderRadius: 16, background: 'rgba(216,90,48,0.1)', border: '1px solid rgba(216,90,48,0.2)', marginBottom: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: WARM, marginBottom: 12 }}>🤝 THE COMPROMISES</div>
              {result.compromises.map((c, i) => <div key={i} style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', padding: '8px 0', lineHeight: 1.6 }}>→ {c}</div>)}
            </motion.div>

            {/* Features & Cost */}
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 32 }}>
              <div style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>COMBINED FEATURES</div>
                {result.features.map((f, i) => <div key={i} style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', padding: '4px 0' }}>✓ {f}</div>)}
              </div>
              <div style={{ padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>ESTIMATED</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: WARM }}>{result.estimatedCost}</div>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }}
              style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => { setPhase('intro'); setDreamA({ style: '', material: '', feature: '', mood: '', scale: '' }); setDreamB({ style: '', material: '', feature: '', mood: '', scale: '' }); setResult(null); }}
                style={{ padding: '14px 32px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Try Again
              </button>
              <Link href="/dream" style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: WARM, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                Explore More Dreams
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
