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

// ============================================================================
// GENE GROUP DEFINITIONS — the 3 panels
// ============================================================================

const GENE_GROUPS: { key: string; label: string; icon: string; genes: (keyof Genes)[] }[] = [
  {
    key: 'structure',
    label: 'Structure',
    icon: '🏗️',
    genes: ['roofPitch', 'ceilingHeight', 'verticalScale', 'density'],
  },
  {
    key: 'skin',
    label: 'Skin & Surface',
    icon: '🪨',
    genes: ['materialWarmth', 'windowRatio', 'colorTemperature', 'ornamentation'],
  },
  {
    key: 'soul',
    label: 'Soul & Context',
    icon: '🌿',
    genes: ['symmetry', 'indoorOutdoor', 'era', 'natureIntegration'],
  },
];

const GENE_LABELS: Record<keyof Genes, { label: string; low: string; high: string }> = {
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
  if (era > 75) return materialWarmth > 70 ? 'Contemporary Rustic' : ornamentation > 60 ? 'High-Tech Ornamentation' : 'Modern Minimalist';
  if (era < 25) return ornamentation > 70 ? 'Classical Baroque' : materialWarmth > 70 ? 'Vernacular Traditional' : 'Medieval Historic';
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
  while (indices.size < 3) indices.add(Math.floor(Math.random() * genesArray.length));
  const mutated = { ...genes };
  indices.forEach((idx) => {
    const [key] = genesArray[idx];
    const currentValue = genes[key as keyof Genes];
    (mutated as any)[key] = Math.max(0, Math.min(100, currentValue + (Math.random() - 0.5) * 40));
  });
  return mutated;
}

function generateVariants(genes: Genes, count: number): Variant[] {
  return Array.from({ length: count }, (_, i) => {
    const g = mutateGenome(genes);
    return { id: `v-${i}-${Date.now()}`, genes: g, name: generateBuildingName(g), style: classifyStyle(g) };
  });
}

// ============================================================================
// DNA HELIX — compact for sidebar
// ============================================================================

function DNAHelix({ genes }: { genes: Genes }) {
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    let id: number;
    let phase = 0;
    const animate = () => { phase += 0.01; setRotation((phase * 180) / Math.PI); id = requestAnimationFrame(animate); };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, []);

  const geneValues = Object.values(genes);
  const w = 160, h = 240, cx = w / 2, amp = 30, freq = 0.15;
  const pts = Array.from({ length: 100 }, (_, i) => ({ x: cx + Math.sin(i * freq) * amp, y: (i / 100) * h }));
  const s1 = `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const s2 = `M ${pts.map(p => `${cx * 2 - p.x},${p.y}`).join(' L ')}`;
  const rungs = Array.from({ length: 12 }, (_, i) => pts[Math.floor((i / 12) * 99)]);
  const getColor = (v: number) => v < 25 ? '#3B82F6' : v < 50 ? '#06B6D4' : v < 75 ? '#D85A30' : '#1D9E75';

  return (
    <motion.svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" style={{ transform: `rotateZ(${rotation * 0.5}deg)`, filter: 'drop-shadow(0 0 10px rgba(29,158,117,0.15))' }}>
      <path d={s1} fill="none" stroke="rgba(216,90,48,0.45)" strokeWidth="2" />
      <path d={s2} fill="none" stroke="rgba(29,158,117,0.45)" strokeWidth="2" />
      {rungs.map((r, i) => {
        const color = getColor(geneValues[i]);
        const rx = cx * 2 - r.x;
        return (
          <motion.g key={i}>
            <line x1={r.x} y1={r.y} x2={rx} y2={r.y} stroke={color} strokeWidth="1.5" opacity={0.5} />
            <motion.circle cx={r.x} cy={r.y} r={3.5} fill={color} animate={{ r: [3.5, 5, 3.5], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }} />
            <motion.circle cx={rx} cy={r.y} r={3.5} fill={color} animate={{ r: [3.5, 5, 3.5], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }} />
          </motion.g>
        );
      })}
    </motion.svg>
  );
}

// ============================================================================
// CELEBRATION TOAST
// ============================================================================

function Celebration({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.8 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-[#1D9E75] text-white font-bold text-sm shadow-lg shadow-[#1D9E75]/30">
      {message}
    </motion.div>
  );
}

// ============================================================================
// GUIDE TOOLTIP — floating, dismissable
// ============================================================================

function GuideTip({ step, onDismiss }: { step: number; onDismiss: () => void }) {
  const tips = [
    { text: 'Drag any slider to shape your building. The name and style update instantly.', target: 'Try Roof Pitch first — go extreme!' },
    { text: 'Nice! Each gene changes the DNA. Open other panels to tweak Skin and Soul.', target: 'Explore all three groups.' },
    { text: 'When it feels right, hit Render Vision to see your creation come to life.', target: '' },
  ];
  const tip = tips[Math.min(step, tips.length - 1)];
  if (step >= tips.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white text-gray-800 rounded-xl px-4 py-3 text-sm shadow-xl border border-gray-200 max-w-xs"
    >
      <p className="mb-1">{tip.text}</p>
      {tip.target && <p className="text-[#1D9E75] text-xs font-semibold">{tip.target}</p>}
      <button onClick={onDismiss} className="text-[#D85A30] hover:text-[#c44d28] text-xs mt-2 font-semibold underline underline-offset-2">
        Got it, let me explore
      </button>
    </motion.div>
  );
}

// ============================================================================
// GENE SLIDER — fog of war: muted until first touch, then awakens
// ============================================================================

function GeneSlider({ geneKey, label, lowLabel, highLabel, value, onChange, awakened }: {
  geneKey: string; label: string; lowLabel: string; highLabel: string;
  value: number; onChange: (v: number) => void; awakened: boolean;
}) {
  return (
    <motion.div
      className={`py-3 transition-all duration-500 ${awakened ? '' : 'opacity-50 saturate-0'}`}
      animate={awakened ? { opacity: 1, filter: 'saturate(1)' } : { opacity: 0.5, filter: 'saturate(0)' }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">{label}</label>
        <motion.span
          key={Math.round(value)}
          initial={awakened ? { scale: 1.3, color: '#D85A30' } : {}}
          animate={{ scale: 1, color: '#D85A30' }}
          className="text-sm font-bold tabular-nums"
        >
          {Math.round(value)}
        </motion.span>
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-[11px] text-gray-400 w-14 text-right shrink-0">{lowLabel}</span>
        <input
          type="range" min="0" max="100" value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
          style={{ background: 'linear-gradient(to right, #3B82F6, #06B6D4 33%, #D85A30 66%, #1D9E75)' }}
        />
        <span className="text-[11px] text-gray-400 w-14 shrink-0">{highLabel}</span>
      </div>

      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: white; cursor: pointer; border: 3px solid #D85A30;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15); transition: border-color 0.2s, box-shadow 0.2s;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          border-color: #1D9E75; box-shadow: 0 2px 10px rgba(29,158,117,0.35);
        }
        input[type='range']::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: white; cursor: pointer; border: 3px solid #D85A30;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
      `}</style>
    </motion.div>
  );
}

// ============================================================================
// COLLAPSIBLE GENE GROUP PANEL
// ============================================================================

function GeneGroupPanel({ group, genes, touchedGenes, onGeneChange, defaultOpen }: {
  group: typeof GENE_GROUPS[0];
  genes: Genes;
  touchedGenes: Set<string>;
  onGeneChange: (key: keyof Genes, value: number) => void;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const groupTouched = group.genes.filter(g => touchedGenes.has(g)).length;
  const groupTotal = group.genes.length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header — always visible, clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{group.icon}</span>
          <div className="text-left">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{group.label}</h3>
            <p className="text-xs text-gray-400">{groupTouched}/{groupTotal} genes tuned</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini progress dots */}
          <div className="flex gap-1">
            {group.genes.map(g => (
              <motion.div
                key={g}
                className="w-2 h-2 rounded-full"
                animate={{
                  backgroundColor: touchedGenes.has(g) ? '#1D9E75' : '#e5e7eb',
                  scale: touchedGenes.has(g) ? [1, 1.3, 1] : 1,
                }}
                transition={{ duration: 0.4 }}
              />
            ))}
          </div>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400 text-sm"
          >
            ▼
          </motion.span>
        </div>
      </button>

      {/* Collapsible slider content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 divide-y divide-gray-100">
              {group.genes.map(gene => {
                const info = GENE_LABELS[gene];
                return (
                  <GeneSlider
                    key={gene}
                    geneKey={gene}
                    label={info.label}
                    lowLabel={info.low}
                    highLabel={info.high}
                    value={genes[gene]}
                    onChange={(v) => onGeneChange(gene, v)}
                    awakened={touchedGenes.has(gene)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// CONCEPT CARD — light theme, live-updating
// ============================================================================

function ConceptCard({ genes, onRender, isLoading, imageUrl }: {
  genes: Genes; onRender: () => void; isLoading: boolean; imageUrl: string | null;
}) {
  const name = generateBuildingName(genes);
  const style = classifyStyle(genes);
  const desc = `A ${style} structure with ${genes.symmetry > 50 ? 'balanced' : 'dynamic'} form and ${genes.indoorOutdoor > 50 ? 'permeable' : 'defined'} boundaries. ${genes.natureIntegration > 50 ? 'Rich botanical integration creates a living ecosystem.' : 'Sculpted geometry defines pristine volumes.'}`;
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
    <motion.div layout className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Image or placeholder */}
      <div className="aspect-[16/10] bg-gradient-to-br from-[#1D9E75]/10 to-[#D85A30]/10 relative flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <motion.img src={imageUrl} alt={name} className="w-full h-full object-cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        ) : (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">🧬</div>
            <p className="text-gray-400 text-xs">Tune your genes, then render</p>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* Live-updating name — the core micro-loop */}
        <motion.h2 key={name} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}
          className="text-xl font-black text-[#D85A30] mb-0.5 leading-tight">{name}</motion.h2>
        <motion.p key={style} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}
          className="text-[#1D9E75] font-bold text-xs uppercase tracking-widest mb-3">{style}</motion.p>
        <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1">{desc}</p>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
            <p className="text-gray-400 text-[10px]">Est. Sq Ft</p>
            <p className="text-[#D85A30] font-bold">{sqFt.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
            <p className="text-gray-400 text-[10px]">Sustainability</p>
            <p className="text-[#1D9E75] font-bold">{sustainability}%</p>
          </div>
        </div>

        {/* Palette */}
        <div className="flex gap-1.5 mb-4">
          {colors.map((c, i) => (
            <motion.div key={i} className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c }} whileHover={{ scale: 1.2 }} />
          ))}
        </div>

        {/* Render */}
        <motion.button onClick={onRender} disabled={isLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D85A30] to-[#1D9E75] text-white font-bold uppercase text-sm tracking-wide disabled:opacity-50 shadow-md hover:shadow-lg transition-shadow">
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
// PROGRESS RING
// ============================================================================

function ProgressRing({ count, total }: { count: number; total: number }) {
  const pct = Math.round((count / total) * 100);
  const r = 24, circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-2">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <motion.circle cx="28" cy="28" r={r} fill="none" stroke="#1D9E75" strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round"
          initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 0.5 }} />
      </svg>
      <div>
        <p className="text-xs font-bold text-gray-700">{pct}%</p>
        <p className="text-[10px] text-gray-400">{count}/12 tuned</p>
      </div>
    </div>
  );
}

// ============================================================================
// EVOLUTION MODAL — light theme
// ============================================================================

function EvolutionModal({ variants, onSelect, onClose }: {
  variants: Variant[]; onSelect: (g: Genes) => void; onClose: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl border border-gray-200">
        <h3 className="text-2xl font-black text-[#D85A30] mb-1">Choose Your Evolution</h3>
        <p className="text-gray-500 text-sm mb-5">Each variant mutated 3 genes from your current DNA</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {variants.map(v => (
            <motion.button key={v.id} onClick={() => { onSelect(v.genes); onClose(); }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="text-left p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#1D9E75] hover:shadow-md transition-all">
              <p className="font-bold text-gray-800 mb-0.5">{v.name}</p>
              <p className="text-xs text-[#1D9E75] font-medium">{v.style}</p>
            </motion.button>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-500 hover:text-gray-700 text-sm font-medium">
          Keep Current
        </button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// INTRO SCREEN
// ============================================================================

function IntroScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30 }}
      className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }}
          className="w-28 h-36 mx-auto mb-6">
          <DNAHelix genes={{ roofPitch: 70, windowRatio: 60, materialWarmth: 80, ceilingHeight: 65, symmetry: 55, indoorOutdoor: 70, ornamentation: 45, era: 60, verticalScale: 50, colorTemperature: 65, density: 40, natureIntegration: 75 }} />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="text-4xl font-black text-gray-900 mb-3">The Genome</motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="text-gray-500 text-lg mb-2">Every building has DNA.</motion.p>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="text-gray-400 mb-8">12 genes across Structure, Skin, and Soul. Tune them and watch your creation evolve.</motion.p>
        <motion.button onClick={onBegin} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#D85A30] to-[#1D9E75] text-white font-bold text-lg shadow-lg hover:shadow-xl transition-shadow">
          Begin Sequencing
        </motion.button>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="text-gray-300 text-xs mt-4">Takes about 60 seconds</motion.p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function GenomePage() {
  const [started, setStarted] = useState(false);
  const [genes, setGenes] = useState<Genes>({
    roofPitch: 50, windowRatio: 50, materialWarmth: 50, ceilingHeight: 50,
    symmetry: 50, indoorOutdoor: 50, ornamentation: 50, era: 50,
    verticalScale: 50, colorTemperature: 50, density: 50, natureIntegration: 50,
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [showEvolution, setShowEvolution] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [touchedGenes, setTouchedGenes] = useState<Set<string>>(new Set());
  const [guideStep, setGuideStep] = useState(0);
  const [guideDismissed, setGuideDismissed] = useState(false);

  // Milestones for celebrations
  const prevTouchedCount = useRef(0);
  useEffect(() => {
    const count = touchedGenes.size;
    if (count === 1 && prevTouchedCount.current === 0) {
      setCelebration('First gene tuned! The name is changing...');
      if (!guideDismissed) setGuideStep(1);
    } else if (count === 4 && prevTouchedCount.current < 4) {
      setCelebration('4 genes in — your building is taking shape');
    } else if (count === 8 && prevTouchedCount.current < 8) {
      setCelebration('8 genes tuned — the DNA is almost complete');
    } else if (count === 12 && prevTouchedCount.current < 12) {
      setCelebration('Full genome sequenced! Hit Render Vision.');
      if (!guideDismissed) setGuideStep(2);
    }
    prevTouchedCount.current = count;
  }, [touchedGenes, guideDismissed]);

  const handleGeneChange = useCallback((key: keyof Genes, value: number) => {
    setGenes(prev => ({ ...prev, [key]: value }));
    setTouchedGenes(prev => { const n = new Set(prev); n.add(key); return n; });
  }, []);

  const handleRender = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/render', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildImagePrompt(genes), style: 'exterior', aspect: 'landscape', quality: 'standard' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.renders?.[0]?.imageUrl) {
          setImageUrl(data.renders[0].imageUrl);
          setCelebration('Your building is alive!');
        }
      }
    } catch (e) { console.error('Render error:', e); }
    finally { setIsLoading(false); }
  };

  // ── Intro ──
  if (!started) {
    return <AnimatePresence mode="wait"><IntroScreen onBegin={() => setStarted(true)} /></AnimatePresence>;
  }

  // ── Main Lab ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white font-archivo">
      <AnimatePresence>
        {celebration && <Celebration message={celebration} onDone={() => setCelebration(null)} />}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <Link href="/dream" className="text-[#D85A30] hover:text-[#1D9E75] transition-colors text-sm font-medium">← Dream Machine</Link>
            <h1 className="text-xl font-black text-gray-900">The Genome</h1>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing count={touchedGenes.size} total={12} />
            <div className="flex gap-2">
              <motion.button onClick={() => { setGenes(mutateGenome(genes)); setImageUrl(null); setCelebration('3 genes mutated!'); }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-3 py-2 rounded-xl bg-[#D85A30] text-white font-bold text-xs shadow-sm">🧬 Mutate</motion.button>
              <motion.button onClick={() => { setVariants(generateVariants(genes, 4)); setShowEvolution(true); }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-3 py-2 rounded-xl bg-[#1D9E75] text-white font-bold text-xs shadow-sm">✨ Evolve</motion.button>
              <motion.button onClick={() => {
                const r = () => Math.random() * 100;
                setGenes({ roofPitch: r(), windowRatio: r(), materialWarmth: r(), ceilingHeight: r(), symmetry: r(), indoorOutdoor: r(), ornamentation: r(), era: r(), verticalScale: r(), colorTemperature: r(), density: r(), natureIntegration: r() });
                setImageUrl(null);
                setTouchedGenes(new Set(Object.keys(genes) as (keyof Genes)[]));
                setCelebration('Total genetic scramble!');
              }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-3 py-2 rounded-xl bg-white border border-gray-300 text-gray-600 font-bold text-xs">🎲 Random</motion.button>
              <motion.button onClick={() => {
                setGenes({ roofPitch: 50, windowRatio: 50, materialWarmth: 50, ceilingHeight: 50, symmetry: 50, indoorOutdoor: 50, ornamentation: 50, era: 50, verticalScale: 50, colorTemperature: 50, density: 50, natureIntegration: 50 });
                setImageUrl(null); setTouchedGenes(new Set());
              }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-400 font-bold text-xs">↻ Reset</motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Concept Card + Helix */}
          <div className="lg:col-span-1 space-y-6">
            <ConceptCard genes={genes} onRender={handleRender} isLoading={isLoading} imageUrl={imageUrl} />
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="h-48 flex items-center justify-center">
                <DNAHelix genes={genes} />
              </div>
            </div>
          </div>

          {/* RIGHT — 3 Collapsible Gene Group Panels */}
          <div className="lg:col-span-2 space-y-4">
            {/* Guide tooltip */}
            <AnimatePresence>
              {!guideDismissed && (
                <GuideTip step={guideStep} onDismiss={() => setGuideDismissed(true)} />
              )}
            </AnimatePresence>

            {GENE_GROUPS.map((group, i) => (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
              >
                <GeneGroupPanel
                  group={group}
                  genes={genes}
                  touchedGenes={touchedGenes}
                  onGeneChange={handleGeneChange}
                  defaultOpen={i === 0}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Evolution Modal */}
      <AnimatePresence>
        {showEvolution && (
          <EvolutionModal variants={variants}
            onSelect={g => { setGenes(g); setCelebration('New DNA adopted!'); setTouchedGenes(new Set(Object.keys(g) as (keyof Genes)[])); }}
            onClose={() => setShowEvolution(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
