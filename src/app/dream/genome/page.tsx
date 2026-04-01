'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Genes {
  roofPitch: number;
  windowRatio: number;
  materialWarmth: number;
  ceilingHeight: number;
  symmetry: number;
  indoorOutdoor: number;
  ornamentation: number;
  era: number;
  verticalScale: number;
  colorTemperature: number;
  density: number;
  natureIntegration: number;
}

interface Variant {
  id: string;
  genes: Genes;
  name: string;
  style: string;
}

type Phase = 'intro' | 'first-gene' | 'second-gene' | 'third-gene' | 'unlocked' | 'evolved';

// ============================================================================
// MICRO-LOOP CELEBRATION
// ============================================================================

function Celebration({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-[#1D9E75] text-white font-bold text-sm shadow-lg shadow-[#1D9E75]/30"
    >
      {message}
    </motion.div>
  );
}

// ============================================================================
// SPARKLE PARTICLES (on slider interaction)
// ============================================================================

function Sparkles({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.8 }}
      className="absolute -top-2 -right-2 text-lg pointer-events-none"
    >
      ✨
    </motion.span>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateBuildingName(genes: Genes): string {
  const { ornamentation, ceilingHeight, symmetry, density } = genes;

  const heightDescriptors = ['Hollow', 'Chamber', 'Hall', 'Cathedral', 'Basilica', 'Temple'];
  const heightIndex = Math.floor((ceilingHeight / 100) * (heightDescriptors.length - 1));

  const symmetryBonus = symmetry > 70 ? ' Symmetric' : symmetry < 30 ? ' Asymmetric' : '';
  const densityBonus = density > 70 ? ' Nexus' : density < 30 ? ' Sanctuary' : '';

  const adjectives = ['Glass', 'Iron', 'Living', 'Carved', 'Floating', 'Woven'];
  const adjIndex = Math.floor((ornamentation / 100) * (adjectives.length - 1));

  return `The ${adjectives[adjIndex]} ${heightDescriptors[heightIndex]}${symmetryBonus}${densityBonus}`;
}

function classifyStyle(genes: Genes): string {
  const { era, materialWarmth, ornamentation, indoorOutdoor, density } = genes;

  if (era > 75)
    return materialWarmth > 70
      ? 'Contemporary Rustic'
      : ornamentation > 60
        ? 'High-Tech Ornamentation'
        : 'Modern Minimalist';
  if (era < 25)
    return ornamentation > 70
      ? 'Classical Baroque'
      : materialWarmth > 70
        ? 'Vernacular Traditional'
        : 'Medieval Historic';
  if (materialWarmth > 70 && indoorOutdoor > 70) return 'Organic Biophilic';
  if (density > 70) return 'Urban Compact';
  if (indoorOutdoor < 30) return 'Fortress Brutalist';
  return 'Contemporary Eclectic';
}

function buildImagePrompt(genes: Genes): string {
  const style = classifyStyle(genes);
  const roofType = genes.roofPitch > 70 ? 'steep pitched' : genes.roofPitch > 40 ? 'moderate pitched' : 'flat';
  const windowType = genes.windowRatio > 70 ? 'extensive glazing' : genes.windowRatio > 40 ? 'balanced fenestration' : 'minimal windows';
  const material = genes.materialWarmth > 70 ? 'warm wood and natural materials' : genes.materialWarmth > 40 ? 'mixed materials' : 'concrete and steel';
  const scale = genes.verticalScale > 70 ? 'multi-story tower-like' : genes.verticalScale > 40 ? 'medium-rise' : 'single-story residential';
  const integration = genes.natureIntegration > 70 ? 'with abundant greenery, living walls, and botanical integration' : genes.natureIntegration > 40 ? 'with integrated landscaping' : 'in an urban context';
  const color = genes.colorTemperature > 70 ? 'warm sunset tones' : genes.colorTemperature > 40 ? 'neutral earth tones' : 'cool blues and grays';
  const time = genes.era > 50 ? 'contemporary' : 'timeless';
  return `${time} ${style} architecture, ${scale} building with ${roofType} roof, ${windowType}, finished in ${material}, ${color}, ${integration}. Professional architectural photography, Golden Hour lighting, high quality, detailed, exterior perspective.`;
}

function mutateGenome(genes: Genes): Genes {
  const genesArray = Object.entries(genes);
  const indices = new Set<number>();
  while (indices.size < 3) {
    indices.add(Math.floor(Math.random() * genesArray.length));
  }
  const mutated = { ...genes };
  indices.forEach((idx) => {
    const [key] = genesArray[idx];
    const currentValue = genes[key as keyof Genes];
    const mutation = (Math.random() - 0.5) * 40;
    (mutated as any)[key] = Math.max(0, Math.min(100, currentValue + mutation));
  });
  return mutated;
}

function generateVariants(genes: Genes, count: number): Variant[] {
  return Array.from({ length: count }, (_, i) => {
    const variantGenes = mutateGenome(genes);
    return {
      id: `variant-${i}-${Date.now()}`,
      genes: variantGenes,
      name: generateBuildingName(variantGenes),
      style: classifyStyle(variantGenes),
    };
  });
}

// ============================================================================
// DNA HELIX COMPONENT (light-theme adapted)
// ============================================================================

function DNAHelix({ genes, compact }: { genes: Genes; compact?: boolean }) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let id: number;
    let phase = 0;
    const animate = () => {
      phase += 0.01;
      setRotation((phase * 180) / Math.PI);
      id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, []);

  const geneValues = Object.values(genes);
  const width = compact ? 120 : 220;
  const height = compact ? 160 : 320;
  const centerX = width / 2;
  const amplitude = compact ? 25 : 40;
  const frequency = 0.15;

  const points = Array.from({ length: 100 }, (_, i) => ({
    x: centerX + Math.sin(i * frequency) * amplitude,
    y: (i / 100) * height,
  }));

  const strandPath = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const strandPath2 = `M ${points.map((p) => `${centerX * 2 - p.x},${p.y}`).join(' L ')}`;

  const rungPositions = Array.from({ length: 12 }, (_, i) =>
    points[Math.floor((i / 12) * (points.length - 1))]
  );

  const getGeneColor = (v: number) =>
    v < 25 ? '#3B82F6' : v < 50 ? '#06B6D4' : v < 75 ? '#D85A30' : '#1D9E75';

  return (
    <motion.svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      style={{
        transform: `rotateZ(${rotation * 0.5}deg)`,
        filter: 'drop-shadow(0 0 12px rgba(29, 158, 117, 0.2))',
      }}
    >
      <path d={strandPath} fill="none" stroke="rgba(216, 90, 48, 0.5)" strokeWidth="2" />
      <path d={strandPath2} fill="none" stroke="rgba(29, 158, 117, 0.5)" strokeWidth="2" />
      {rungPositions.map((rung, i) => {
        const color = getGeneColor(geneValues[i]);
        const rightX = centerX * 2 - rung.x;
        return (
          <motion.g key={i}>
            <line x1={rung.x} y1={rung.y} x2={rightX} y2={rung.y} stroke={color} strokeWidth="1.5" opacity={0.6} />
            <motion.circle cx={rung.x} cy={rung.y} r={compact ? 3 : 4} fill={color}
              animate={{ r: [compact ? 3 : 4, compact ? 4 : 5.5, compact ? 3 : 4], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
            />
            <motion.circle cx={rightX} cy={rung.y} r={compact ? 3 : 4} fill={color}
              animate={{ r: [compact ? 3 : 4, compact ? 4 : 5.5, compact ? 3 : 4], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
            />
          </motion.g>
        );
      })}
    </motion.svg>
  );
}

// ============================================================================
// GENE SLIDER — light theme with micro-loop feedback
// ============================================================================

function GeneSlider({
  label,
  lowLabel,
  highLabel,
  value,
  onChange,
  locked,
  hint,
}: {
  label: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (value: number) => void;
  locked?: boolean;
  hint?: string;
}) {
  const [sparkle, setSparkle] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (Math.abs(value - prevValue.current) > 5) {
      setSparkle(true);
      const t = setTimeout(() => setSparkle(false), 600);
      prevValue.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  if (locked) {
    return (
      <div className="mb-4 opacity-40 cursor-not-allowed">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-bold text-gray-400 uppercase tracking-wide">{label}</label>
          <span className="text-xs text-gray-400">🔒 Locked</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200" />
      </div>
    );
  }

  return (
    <motion.div className="mb-4 relative" layout>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">{label}</label>
        <div className="flex items-center gap-1 relative">
          <span className="text-[#D85A30] font-bold text-sm tabular-nums">{Math.round(value)}</span>
          <Sparkles active={sparkle} />
        </div>
      </div>

      {hint && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-xs text-[#1D9E75] mb-2 italic"
        >
          {hint}
        </motion.p>
      )}

      <div className="flex gap-2 items-center">
        <span className="text-xs text-gray-500 w-16 text-right">{lowLabel}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3B82F6, #06B6D4 33%, #D85A30 66%, #1D9E75)`,
          }}
        />
        <span className="text-xs text-gray-500 w-16">{highLabel}</span>
      </div>

      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 3px solid #D85A30;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transition: border-color 0.2s;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          border-color: #1D9E75;
          box-shadow: 0 2px 8px rgba(29, 158, 117, 0.3);
        }
        input[type='range']::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 3px solid #D85A30;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
      `}</style>
    </motion.div>
  );
}

// ============================================================================
// PROGRESS RING — visual micro-loop tracker
// ============================================================================

function ProgressRing({ genesChanged, total }: { genesChanged: number; total: number }) {
  const pct = Math.round((genesChanged / total) * 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex items-center gap-3">
      <svg width="68" height="68" className="-rotate-90">
        <circle cx="34" cy="34" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <motion.circle
          cx="34" cy="34" r={r}
          fill="none"
          stroke="#1D9E75"
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div>
        <p className="text-sm font-bold text-gray-800">{pct}% explored</p>
        <p className="text-xs text-gray-500">{genesChanged} of {total} genes tuned</p>
      </div>
    </div>
  );
}

// ============================================================================
// CONCEPT CARD — light theme
// ============================================================================

function ConceptCard({ genes, onRender, isLoading, imageUrl }: {
  genes: Genes; onRender: () => void; isLoading: boolean; imageUrl: string | null;
}) {
  const name = generateBuildingName(genes);
  const style = classifyStyle(genes);
  const description = `A ${style} structure with ${genes.symmetry > 50 ? 'balanced' : 'dynamic'} form and ${genes.indoorOutdoor > 50 ? 'permeable' : 'defined'} boundaries. ${genes.natureIntegration > 50 ? 'Rich botanical integration creates a living ecosystem.' : 'Sculpted geometry defines pristine volumes.'}`;

  const sqFt = Math.round(5000 + genes.verticalScale * 200 + genes.density * 150);
  const sustainability = Math.round((genes.materialWarmth + genes.natureIntegration + (100 - genes.density) + genes.indoorOutdoor) / 4);

  const colors = [
    `hsl(${genes.colorTemperature * 3.6}, 80%, 50%)`,
    `hsl(${genes.era * 3.6}, 70%, 45%)`,
    `hsl(${genes.materialWarmth * 3.6}, 75%, 55%)`,
    `hsl(${genes.symmetry * 3.6}, 65%, 50%)`,
    `hsl(${genes.density * 3.6}, 70%, 48%)`,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm flex flex-col"
    >
      {/* Image */}
      <div className="aspect-video bg-gradient-to-br from-[#1D9E75]/10 to-[#D85A30]/10 relative flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <motion.img src={imageUrl} alt={name} className="w-full h-full object-cover"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🧬</div>
            <p className="text-gray-400 text-sm">Tune your genes, then render</p>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h2 className="text-xl font-black text-[#D85A30] mb-0.5">{name}</h2>
        <p className="text-[#1D9E75] font-bold text-xs uppercase tracking-widest mb-3">{style}</p>
        <p className="text-gray-600 text-sm mb-4 leading-relaxed flex-1">{description}</p>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
            <p className="text-gray-400">Est. Sq Ft</p>
            <p className="text-[#D85A30] font-bold">{sqFt.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
            <p className="text-gray-400">Sustainability</p>
            <p className="text-[#1D9E75] font-bold">{sustainability}%</p>
          </div>
        </div>

        {/* Palette */}
        <div className="flex gap-1.5 mb-4">
          {colors.map((color, i) => (
            <motion.div key={i} className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: color }} whileHover={{ scale: 1.2 }} />
          ))}
        </div>

        {/* Render Button */}
        <motion.button onClick={onRender} disabled={isLoading}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D85A30] to-[#1D9E75] text-white font-bold uppercase text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-shadow"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>⚙️</motion.span>
              Rendering...
            </span>
          ) : '✨ Render Vision'}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// EVOLUTION MODAL — light theme
// ============================================================================

function EvolutionModal({ variants, onSelect, onClose }: {
  variants: Variant[]; onSelect: (genes: Genes) => void; onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-gray-200 rounded-2xl p-6 max-w-2xl w-full shadow-xl">
          <h3 className="text-2xl font-black text-[#D85A30] mb-1">Choose Your Evolution</h3>
          <p className="text-gray-500 text-sm mb-5">Each variant mutated 3 genes from your current DNA</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {variants.map((variant) => (
              <motion.button key={variant.id}
                onClick={() => { onSelect(variant.genes); onClose(); }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="text-left p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#1D9E75] hover:shadow-md transition-all">
                <p className="font-bold text-gray-800 mb-0.5">{variant.name}</p>
                <p className="text-xs text-[#1D9E75] font-medium">{variant.style}</p>
              </motion.button>
            ))}
          </div>
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors text-sm font-medium">
            Keep Current Genome
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// INTRO SCREEN — game-style tutorial kickoff
// ============================================================================

function IntroScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white flex items-center justify-center px-6"
    >
      <div className="max-w-lg text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-32 h-40 mx-auto mb-6"
        >
          <DNAHelix genes={{
            roofPitch: 70, windowRatio: 60, materialWarmth: 80, ceilingHeight: 65,
            symmetry: 55, indoorOutdoor: 70, ornamentation: 45, era: 60,
            verticalScale: 50, colorTemperature: 65, density: 40, natureIntegration: 75,
          }} compact />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-black text-gray-900 mb-3"
        >
          The Genome
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-gray-500 text-lg mb-2"
        >
          Every building has DNA.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-gray-400 text-base mb-8"
        >
          Tune 12 genes. Watch your creation evolve. Render it into existence.
        </motion.p>

        <motion.button
          onClick={onBegin}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#D85A30] to-[#1D9E75] text-white font-bold text-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          Begin Sequencing
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-gray-300 text-xs mt-4"
        >
          Takes about 60 seconds
        </motion.p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PHASE PROMPTS — game-style captions for each unlock phase
// ============================================================================

const PHASE_CONFIG: Record<string, { title: string; subtitle: string; genes: (keyof Genes)[]; hint: Record<string, string> }> = {
  'first-gene': {
    title: 'Start with the bones',
    subtitle: 'How does your building meet the sky?',
    genes: ['roofPitch', 'ceilingHeight', 'verticalScale'],
    hint: {
      roofPitch: 'Flat modernist slab or steep alpine peak?',
      ceilingHeight: 'Cozy nook or cathedral grandeur?',
      verticalScale: 'Ground-hugging bungalow or multi-story tower?',
    },
  },
  'second-gene': {
    title: 'Give it skin',
    subtitle: 'What does it feel like to touch?',
    genes: ['materialWarmth', 'windowRatio', 'colorTemperature'],
    hint: {
      materialWarmth: 'Cold concrete or warm timber?',
      windowRatio: 'A fortress wall or a glass house?',
      colorTemperature: 'Cool Nordic blues or warm desert tones?',
    },
  },
  'third-gene': {
    title: 'Breathe life into it',
    subtitle: 'How does it relate to the world?',
    genes: ['symmetry', 'indoorOutdoor', 'ornamentation', 'era', 'density', 'natureIntegration'],
    hint: {
      symmetry: 'Perfectly balanced or playfully asymmetric?',
      indoorOutdoor: 'Sealed fortress or open-air pavilion?',
      ornamentation: 'Clean minimalism or rich decoration?',
      era: 'Blade Runner future or timeless tradition?',
      density: 'Sprawling estate or tight urban infill?',
      natureIntegration: 'Separate from nature or wrapped in green?',
    },
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GenomePage() {
  const allGeneNames: (keyof Genes)[] = [
    'roofPitch', 'windowRatio', 'materialWarmth', 'ceilingHeight', 'symmetry',
    'indoorOutdoor', 'ornamentation', 'era', 'verticalScale', 'colorTemperature',
    'density', 'natureIntegration',
  ];

  const geneLabels: Record<keyof Genes, { label: string; low: string; high: string }> = {
    roofPitch: { label: 'Roof Pitch', low: 'Flat', high: 'Steep' },
    windowRatio: { label: 'Window Ratio', low: 'Minimal', high: 'Glass House' },
    materialWarmth: { label: 'Material Warmth', low: 'Concrete', high: 'Wood' },
    ceilingHeight: { label: 'Ceiling Height', low: 'Cozy', high: 'Cathedral' },
    symmetry: { label: 'Symmetry', low: 'Asymmetric', high: 'Symmetric' },
    indoorOutdoor: { label: 'Indoor-Outdoor', low: 'Fortress', high: 'Open-Air' },
    ornamentation: { label: 'Ornamentation', low: 'Minimal', high: 'Ornate' },
    era: { label: 'Era', low: 'Futuristic', high: 'Traditional' },
    verticalScale: { label: 'Vertical Scale', low: 'Single', high: 'Multi-Story' },
    colorTemperature: { label: 'Color Temp', low: 'Cool', high: 'Warm' },
    density: { label: 'Density', low: 'Sprawl', high: 'Compact' },
    natureIntegration: { label: 'Nature', low: 'Separate', high: 'Living' },
  };

  const [phase, setPhase] = useState<Phase>('intro');
  const [genes, setGenes] = useState<Genes>({
    roofPitch: 50, windowRatio: 50, materialWarmth: 50, ceilingHeight: 50,
    symmetry: 50, indoorOutdoor: 50, ornamentation: 50, era: 50,
    verticalScale: 50, colorTemperature: 50, density: 50, natureIntegration: 50,
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [touchedGenes, setTouchedGenes] = useState<Set<string>>(new Set());

  // Track which genes have been adjusted
  const handleGeneChange = useCallback((key: keyof Genes, value: number) => {
    setGenes((prev) => ({ ...prev, [key]: value }));
    setTouchedGenes((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  // Phase progression based on interaction
  useEffect(() => {
    if (phase === 'first-gene') {
      const firstGenes = PHASE_CONFIG['first-gene'].genes;
      const touched = firstGenes.filter((g) => touchedGenes.has(g)).length;
      if (touched >= 2) {
        setCelebration('Bones locked in! Now give it skin.');
        setTimeout(() => setPhase('second-gene'), 1200);
      }
    } else if (phase === 'second-gene') {
      const secondGenes = PHASE_CONFIG['second-gene'].genes;
      const touched = secondGenes.filter((g) => touchedGenes.has(g)).length;
      if (touched >= 2) {
        setCelebration('Looking sharp! Time to breathe life into it.');
        setTimeout(() => setPhase('third-gene'), 1200);
      }
    } else if (phase === 'third-gene') {
      const thirdGenes = PHASE_CONFIG['third-gene'].genes;
      const touched = thirdGenes.filter((g) => touchedGenes.has(g)).length;
      if (touched >= 3) {
        setCelebration('All genes unlocked! You have full control.');
        setTimeout(() => setPhase('unlocked'), 1200);
      }
    }
  }, [touchedGenes, phase]);

  const handleMutate = () => {
    setGenes(mutateGenome(genes));
    setImageUrl(null);
    setCelebration('DNA mutated! 3 genes shifted.');
  };

  const handleEvolve = () => {
    setVariants(generateVariants(genes, 4));
    setShowEvolutionModal(true);
  };

  const handleReset = () => {
    setGenes({
      roofPitch: 50, windowRatio: 50, materialWarmth: 50, ceilingHeight: 50,
      symmetry: 50, indoorOutdoor: 50, ornamentation: 50, era: 50,
      verticalScale: 50, colorTemperature: 50, density: 50, natureIntegration: 50,
    });
    setImageUrl(null);
    setTouchedGenes(new Set());
  };

  const handleRandomize = () => {
    const r = () => Math.random() * 100;
    setGenes({
      roofPitch: r(), windowRatio: r(), materialWarmth: r(), ceilingHeight: r(),
      symmetry: r(), indoorOutdoor: r(), ornamentation: r(), era: r(),
      verticalScale: r(), colorTemperature: r(), density: r(), natureIntegration: r(),
    });
    setImageUrl(null);
    setTouchedGenes(new Set(allGeneNames));
    setCelebration('Total genetic scramble! Check out your mutant.');
  };

  const handleRender = async () => {
    setIsLoading(true);
    try {
      const prompt = buildImagePrompt(genes);
      const response = await fetch('/api/v1/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: 'exterior', aspect: 'landscape', quality: 'standard' }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.renders?.[0]?.imageUrl) {
          setImageUrl(data.renders[0].imageUrl);
          setCelebration('Your building is alive!');
        }
      }
    } catch (error) {
      console.error('Render error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine which genes are visible/locked
  const getGeneState = (gene: keyof Genes): 'visible' | 'locked' | 'hidden' => {
    if (phase === 'unlocked' || phase === 'evolved') return 'visible';
    for (const [phaseKey, config] of Object.entries(PHASE_CONFIG)) {
      if (config.genes.includes(gene)) {
        if (phase === phaseKey) return 'visible';
        // Show genes from already-completed phases
        const phaseOrder = ['first-gene', 'second-gene', 'third-gene'];
        const currentIdx = phaseOrder.indexOf(phase);
        const genePhaseIdx = phaseOrder.indexOf(phaseKey);
        if (genePhaseIdx < currentIdx) return 'visible';
        if (genePhaseIdx === currentIdx + 1) return 'locked';
        return 'hidden';
      }
    }
    return 'hidden';
  };

  const currentPhaseConfig = PHASE_CONFIG[phase];

  // ──────────────────────────────────────────────
  // INTRO PHASE
  // ──────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <AnimatePresence mode="wait">
        <IntroScreen onBegin={() => setPhase('first-gene')} />
      </AnimatePresence>
    );
  }

  // ──────────────────────────────────────────────
  // MAIN GENOME LAB
  // ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white font-archivo">
      {/* Celebration toast */}
      <AnimatePresence>
        {celebration && (
          <Celebration message={celebration} onDone={() => setCelebration(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/dream" className="inline-flex items-center gap-2 text-[#D85A30] hover:text-[#1D9E75] transition-colors text-sm font-medium mb-1">
              ← Dream Machine
            </Link>
            <h1 className="text-2xl font-black text-gray-900">The Genome</h1>
          </div>
          <ProgressRing genesChanged={touchedGenes.size} total={12} />
        </div>
      </motion.div>

      {/* Phase prompt — game tutorial caption */}
      {currentPhaseConfig && phase !== 'unlocked' && (
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="max-w-7xl mx-auto px-6 pt-6"
        >
          <div className="bg-gradient-to-r from-[#D85A30]/5 to-[#1D9E75]/5 border border-[#D85A30]/15 rounded-2xl px-6 py-4">
            <p className="text-xs text-[#D85A30] font-bold uppercase tracking-widest mb-1">
              Step {phase === 'first-gene' ? '1 of 3' : phase === 'second-gene' ? '2 of 3' : '3 of 3'}
            </p>
            <h2 className="text-xl font-black text-gray-900 mb-0.5">{currentPhaseConfig.title}</h2>
            <p className="text-gray-500 text-sm">{currentPhaseConfig.subtitle}</p>
          </div>
        </motion.div>
      )}

      {/* Unlocked header */}
      {phase === 'unlocked' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto px-6 pt-6"
        >
          <div className="bg-gradient-to-r from-[#1D9E75]/5 to-[#D85A30]/5 border border-[#1D9E75]/15 rounded-2xl px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#1D9E75] font-bold uppercase tracking-widest mb-1">Full Access</p>
              <h2 className="text-xl font-black text-gray-900">All 12 genes unlocked</h2>
              <p className="text-gray-500 text-sm">Tune, mutate, evolve — then render your vision</p>
            </div>
            <div className="flex gap-2">
              <motion.button onClick={handleMutate} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-xl bg-[#D85A30] text-white font-bold text-xs uppercase tracking-wide shadow-sm">
                🧬 Mutate
              </motion.button>
              <motion.button onClick={handleEvolve} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-xl bg-[#1D9E75] text-white font-bold text-xs uppercase tracking-wide shadow-sm">
                ✨ Evolve
              </motion.button>
              <motion.button onClick={handleRandomize} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-600 font-bold text-xs uppercase tracking-wide">
                🎲 Random
              </motion.button>
              <motion.button onClick={handleReset} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wide">
                ↻ Reset
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: DNA Helix + Concept Card stacked */}
          <div className="lg:col-span-1 space-y-6">
            {/* DNA Helix */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="h-64 flex items-center justify-center">
                <DNAHelix genes={genes} />
              </div>
            </div>

            {/* Concept Card */}
            <ConceptCard genes={genes} onRender={handleRender} isLoading={isLoading} imageUrl={imageUrl} />
          </div>

          {/* RIGHT: Gene Sliders */}
          <div className="lg:col-span-2">
            <motion.div layout className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-gray-900 mb-1 uppercase tracking-wide">Genetic Traits</h2>
              <p className="text-xs text-gray-400 mb-5">
                {phase === 'unlocked' ? 'All genes active — fine-tune to perfection' : 'Adjust the highlighted genes to unlock the next set'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <AnimatePresence>
                  {allGeneNames.map((gene) => {
                    const state = getGeneState(gene);
                    if (state === 'hidden') return null;
                    const info = geneLabels[gene];
                    const hint = currentPhaseConfig?.hint?.[gene];
                    return (
                      <motion.div
                        key={gene}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        layout
                      >
                        <GeneSlider
                          label={info.label}
                          lowLabel={info.low}
                          highLabel={info.high}
                          value={genes[gene]}
                          onChange={(v) => handleGeneChange(gene, v)}
                          locked={state === 'locked'}
                          hint={hint}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* During guided phases, show evolution controls inline */}
              {phase !== 'unlocked' && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                  <motion.button onClick={handleRandomize} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-wide hover:border-[#D85A30] hover:text-[#D85A30] transition-colors">
                    🎲 Randomize All
                  </motion.button>
                  <motion.button onClick={() => { setPhase('unlocked'); setCelebration('Skipped ahead — all genes unlocked!'); }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wide hover:border-gray-400 hover:text-gray-600 transition-colors">
                    Skip Tutorial →
                  </motion.button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Evolution Modal */}
      {showEvolutionModal && (
        <EvolutionModal
          variants={variants}
          onSelect={(selectedGenes) => { setGenes(selectedGenes); setCelebration('New DNA adopted!'); }}
          onClose={() => setShowEvolutionModal(false)}
        />
      )}
    </div>
  );
}
