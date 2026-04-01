'use client';

import { useState, useRef, useEffect } from 'react';
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
// HELPER FUNCTIONS
// ============================================================================

function generateBuildingName(genes: Genes): string {
  const {
    roofPitch,
    windowRatio,
    ceilingHeight,
    symmetry,
    indoorOutdoor,
    ornamentation,
    era,
    verticalScale,
    density,
    natureIntegration,
  } = genes;

  const roofDescriptors = [
    'Ascent',
    'Pinnacle',
    'Spire',
    'Dome',
    'Vault',
    'Crown',
  ];
  const roofIndex = Math.floor((roofPitch / 100) * (roofDescriptors.length - 1));

  const windowDescriptors = [
    'Shadow',
    'Aperture',
    'Portal',
    'Lens',
    'Prism',
    'Crystal',
  ];
  const windowIndex = Math.floor((windowRatio / 100) * (windowDescriptors.length - 1));

  const heightDescriptors = [
    'Hollow',
    'Chamber',
    'Hall',
    'Cathedral',
    'Basilica',
    'Temple',
  ];
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
  if (materialWarmth > 70 && indoorOutdoor > 70)
    return 'Organic Biophilic';
  if (density > 70) return 'Urban Compact';
  if (indoorOutdoor < 30) return 'Fortress Brutalist';

  return 'Contemporary Eclectic';
}

function buildImagePrompt(genes: Genes): string {
  const style = classifyStyle(genes);
  const roofType =
    genes.roofPitch > 70
      ? 'steep pitched'
      : genes.roofPitch > 40
        ? 'moderate pitched'
        : 'flat';
  const windowType =
    genes.windowRatio > 70
      ? 'extensive glazing'
      : genes.windowRatio > 40
        ? 'balanced fenestration'
        : 'minimal windows';
  const material =
    genes.materialWarmth > 70
      ? 'warm wood and natural materials'
      : genes.materialWarmth > 40
        ? 'mixed materials'
        : 'concrete and steel';
  const scale =
    genes.verticalScale > 70
      ? 'multi-story tower-like'
      : genes.verticalScale > 40
        ? 'medium-rise'
        : 'single-story residential';
  const integration =
    genes.natureIntegration > 70
      ? 'with abundant greenery, living walls, and botanical integration'
      : genes.natureIntegration > 40
        ? 'with integrated landscaping'
        : 'in an urban context';
  const color =
    genes.colorTemperature > 70
      ? 'warm sunset tones'
      : genes.colorTemperature > 40
        ? 'neutral earth tones'
        : 'cool blues and grays';
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
    const newValue = Math.max(0, Math.min(100, currentValue + mutation));
    (mutated as any)[key] = newValue;
  });

  return mutated;
}

function generateVariants(genes: Genes, count: number): Variant[] {
  const variants: Variant[] = [];

  for (let i = 0; i < count; i++) {
    const variantGenes = mutateGenome(genes);
    const name = generateBuildingName(variantGenes);
    const style = classifyStyle(variantGenes);

    variants.push({
      id: `variant-${i}-${Date.now()}`,
      genes: variantGenes,
      name,
      style,
    });
  }

  return variants;
}

// ============================================================================
// DNA HELIX COMPONENT
// ============================================================================

function DNAHelix({ genes }: { genes: Genes }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    let phase = 0;

    const animate = () => {
      phase += 0.01;
      setRotation((phase * 180) / Math.PI);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const geneValues = Object.values(genes);
  const width = 300;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;
  const amplitude = 50;
  const frequency = 0.15;

  // Generate strand points
  const points = [];
  for (let i = 0; i < 100; i++) {
    const y = (i / 100) * height;
    const x = centerX + Math.sin(i * frequency) * amplitude;
    points.push({ x, y });
  }

  // Generate rung positions (12 rungs for 12 genes)
  const rungPositions = [];
  for (let i = 0; i < 12; i++) {
    const index = Math.floor((i / 12) * (points.length - 1));
    rungPositions.push(points[index]);
  }

  const strandPath = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const strandPath2 = `M ${points
    .map((p) => `${centerX * 2 - p.x},${p.y}`)
    .join(' L ')}`;

  const getGeneColor = (value: number): string => {
    if (value < 25) return '#1E40AF'; // Cool blue
    if (value < 50) return '#0891B2'; // Cyan
    if (value < 75) return '#D85A30'; // Dream gold
    return '#1D9E75'; // Bio-green
  };

  return (
    <motion.svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      style={{
        transform: `rotateZ(${rotation * 0.5}deg)`,
        filter: 'drop-shadow(0 0 20px rgba(216, 90, 48, 0.3))',
      }}
    >
      {/* Left strand */}
      <path
        d={strandPath}
        fill="none"
        stroke="rgba(216, 90, 48, 0.4)"
        strokeWidth="2"
      />

      {/* Right strand */}
      <path
        d={strandPath2}
        fill="none"
        stroke="rgba(29, 158, 117, 0.4)"
        strokeWidth="2"
      />

      {/* Rungs */}
      {rungPositions.map((rung, i) => {
        const geneValue = geneValues[i];
        const rightX = centerX * 2 - rung.x;
        const color = getGeneColor(geneValue);

        return (
          <motion.g key={`rung-${i}`}>
            <line
              x1={rung.x}
              y1={rung.y}
              x2={rightX}
              y2={rung.y}
              stroke={color}
              strokeWidth="2"
              opacity={0.7}
            />
            <motion.circle
              cx={rung.x}
              cy={rung.y}
              r="4"
              fill={color}
              initial={{ r: 4, opacity: 0.7 }}
              animate={{ r: [4, 6, 4], opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: Infinity,
              }}
            />
            <motion.circle
              cx={rightX}
              cy={rung.y}
              r="4"
              fill={color}
              initial={{ r: 4, opacity: 0.7 }}
              animate={{ r: [4, 6, 4], opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: Infinity,
              }}
            />
          </motion.g>
        );
      })}
    </motion.svg>
  );
}

// ============================================================================
// CONCEPT CARD COMPONENT
// ============================================================================

function ConceptCard({
  genes,
  onRender,
  isLoading,
  imageUrl,
}: {
  genes: Genes;
  onRender: () => void;
  isLoading: boolean;
  imageUrl: string | null;
}) {
  const name = generateBuildingName(genes);
  const style = classifyStyle(genes);
  const description = `A ${style} structure embodying ${genes.symmetry > 50 ? 'balanced' : 'dynamic'} form with ${genes.indoorOutdoor > 50 ? 'permeable' : 'defined'} boundaries. ${genes.natureIntegration > 50 ? 'Rich botanical integration creates a living ecosystem.' : 'Sculpted geometry defines pristine spatial volumes.'}`;

  const estimatedSqFt = Math.round(
    5000 + genes.verticalScale * 200 + genes.density * 150
  );
  const sustainabilityScore = Math.round(
    (genes.materialWarmth +
      genes.natureIntegration +
      (100 - genes.density) +
      genes.indoorOutdoor) /
      4
  );

  // Generate 5 colors from genes
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
      className="rounded-lg overflow-hidden border border-[#D85A30]/30 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] flex flex-col h-full"
    >
      {/* Image Section */}
      <div className="aspect-video bg-gradient-to-br from-[#1D9E75]/20 to-[#D85A30]/20 relative flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <motion.img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        ) : (
          <div className="text-center">
            <div className="text-[#1D9E75] text-3xl mb-2">✨</div>
            <p className="text-[#999] text-sm">Awaiting vision render...</p>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-black text-[#D85A30] mb-1">{name}</h2>
          <p className="text-[#1D9E75] font-archivo text-sm uppercase tracking-wide">
            {style}
          </p>
        </div>

        {/* Description */}
        <p className="text-[#ccc] text-sm mb-4 leading-relaxed flex-1">
          {description}
        </p>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="bg-[#0a0a0a] rounded p-3 border border-[#333]">
            <p className="text-[#999]">Est. Square Feet</p>
            <p className="text-[#D85A30] font-bold">{estimatedSqFt.toLocaleString()}</p>
          </div>
          <div className="bg-[#0a0a0a] rounded p-3 border border-[#333]">
            <p className="text-[#999]">Sustainability</p>
            <p className="text-[#1D9E75] font-bold">{sustainabilityScore}%</p>
          </div>
        </div>

        {/* Color Palette */}
        <div className="mb-4">
          <p className="text-[#999] text-xs mb-2 uppercase tracking-wide">
            Genetic Palette
          </p>
          <div className="flex gap-2">
            {colors.map((color, i) => (
              <motion.div
                key={i}
                className="w-8 h-8 rounded-full border border-[#444]"
                style={{ backgroundColor: color }}
                whileHover={{ scale: 1.15 }}
              />
            ))}
          </div>
        </div>

        {/* Render Button */}
        <motion.button
          onClick={onRender}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-[#D85A30] to-[#1D9E75] text-white font-bold uppercase text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⚙️
              </motion.div>
              Rendering...
            </span>
          ) : (
            '✨ Render Vision'
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// GENE SLIDER COMPONENT
// ============================================================================

function GeneSlider({
  label,
  lowLabel,
  highLabel,
  value,
  onChange,
  pulseKey,
}: {
  label: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (value: number) => void;
  pulseKey?: string;
}) {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    setIsPulsing(true);
    const timer = setTimeout(() => setIsPulsing(false), 600);
    return () => clearTimeout(timer);
  }, [pulseKey]);

  return (
    <motion.div
      className="mb-6"
      animate={isPulsing ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.4 }}
    >
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-bold text-[#ccc] uppercase tracking-wide">
          {label}
        </label>
        <span className="text-[#D85A30] font-bold text-sm">{Math.round(value)}</span>
      </div>

      <div className="flex gap-2 items-center mb-2">
        <span className="text-xs text-[#999]">{lowLabel}</span>

        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-[#1E40AF] via-[#D85A30] to-[#1D9E75]"
          style={{
            WebkitAppearance: 'none',
          }}
        />

        <span className="text-xs text-[#999]">{highLabel}</span>
      </div>

      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #D85A30, #1D9E75);
          cursor: pointer;
          border: 2px solid #1D9E75;
          box-shadow: 0 0 8px rgba(216, 90, 48, 0.6);
        }

        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #D85A30, #1D9E75);
          cursor: pointer;
          border: 2px solid #1D9E75;
          box-shadow: 0 0 8px rgba(216, 90, 48, 0.6);
        }
      `}</style>
    </motion.div>
  );
}

// ============================================================================
// EVOLUTION VARIANTS MODAL
// ============================================================================

function EvolutionModal({
  variants,
  onSelect,
  onClose,
}: {
  variants: Variant[];
  onSelect: (genes: Genes) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0f0f0f] border border-[#D85A30]/30 rounded-lg p-6 max-w-4xl w-full max-h-96 overflow-y-auto"
        >
          <h3 className="text-2xl font-black text-[#D85A30] mb-4">Choose Your Evolution</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {variants.map((variant, i) => (
              <motion.button
                key={variant.id}
                onClick={() => {
                  onSelect(variant.genes);
                  onClose();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-left p-4 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#333] hover:border-[#D85A30]/50 transition-colors"
              >
                <p className="font-bold text-[#D85A30] mb-1">{variant.name}</p>
                <p className="text-xs text-[#1D9E75]">{variant.style}</p>
              </motion.button>
            ))}
          </div>

          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-2 rounded-lg border border-[#999] text-[#999] hover:border-[#ccc] hover:text-[#ccc] transition-colors"
          >
            Close
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GenomePage() {
  const geneNames: (keyof Genes)[] = [
    'roofPitch',
    'windowRatio',
    'materialWarmth',
    'ceilingHeight',
    'symmetry',
    'indoorOutdoor',
    'ornamentation',
    'era',
    'verticalScale',
    'colorTemperature',
    'density',
    'natureIntegration',
  ];

  const geneLabels: Record<keyof Genes, { label: string; low: string; high: string }> =
    {
      roofPitch: { label: 'Roof Pitch', low: 'Flat', high: 'Steep' },
      windowRatio: { label: 'Window Ratio', low: 'Minimal', high: 'Glass House' },
      materialWarmth: { label: 'Material Warmth', low: 'Concrete', high: 'Wood' },
      ceilingHeight: { label: 'Ceiling Height', low: 'Cozy', high: 'Cathedral' },
      symmetry: { label: 'Symmetry', low: 'Asymmetric', high: 'Symmetric' },
      indoorOutdoor: { label: 'Indoor-Outdoor', low: 'Fortress', high: 'Open-Air' },
      ornamentation: { label: 'Ornamentation', low: 'Minimal', high: 'Ornate' },
      era: { label: 'Era', low: 'Futuristic', high: 'Traditional' },
      verticalScale: { label: 'Vertical Scale', low: 'Single', high: 'Multi-Story' },
      colorTemperature: { label: 'Color Temperature', low: 'Cool', high: 'Warm' },
      density: { label: 'Density', low: 'Sprawl', high: 'Compact' },
      natureIntegration: { label: 'Nature Integration', low: 'Separate', high: 'Living' },
    };

  const [genes, setGenes] = useState<Genes>({
    roofPitch: 50,
    windowRatio: 50,
    materialWarmth: 50,
    ceilingHeight: 50,
    symmetry: 50,
    indoorOutdoor: 50,
    ornamentation: 50,
    era: 50,
    verticalScale: 50,
    colorTemperature: 50,
    density: 50,
    natureIntegration: 50,
  });

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastMutatedGene, setLastMutatedGene] = useState<string | undefined>(undefined);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);

  const handleGeneChange = (key: keyof Genes, value: number) => {
    setGenes((prev) => ({ ...prev, [key]: value }));
  };

  const handleMutate = () => {
    const mutated = mutateGenome(genes);
    setGenes(mutated);
    setImageUrl(null);
    setLastMutatedGene(`mutate-${Date.now()}`);
  };

  const handleEvolve = () => {
    const newVariants = generateVariants(genes, 4);
    setVariants(newVariants);
    setShowEvolutionModal(true);
  };

  const handleReset = () => {
    setGenes({
      roofPitch: 50,
      windowRatio: 50,
      materialWarmth: 50,
      ceilingHeight: 50,
      symmetry: 50,
      indoorOutdoor: 50,
      ornamentation: 50,
      era: 50,
      verticalScale: 50,
      colorTemperature: 50,
      density: 50,
      natureIntegration: 50,
    });
    setImageUrl(null);
    setLastMutatedGene(undefined);
  };

  const handleRandomize = () => {
    const randomized: Genes = {
      roofPitch: Math.random() * 100,
      windowRatio: Math.random() * 100,
      materialWarmth: Math.random() * 100,
      ceilingHeight: Math.random() * 100,
      symmetry: Math.random() * 100,
      indoorOutdoor: Math.random() * 100,
      ornamentation: Math.random() * 100,
      era: Math.random() * 100,
      verticalScale: Math.random() * 100,
      colorTemperature: Math.random() * 100,
      density: Math.random() * 100,
      natureIntegration: Math.random() * 100,
    };
    setGenes(randomized);
    setImageUrl(null);
    setLastMutatedGene(`randomize-${Date.now()}`);
  };

  const handleRender = async () => {
    setIsLoading(true);
    try {
      const prompt = buildImagePrompt(genes);
      const response = await fetch('/api/v1/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: 'exterior',
          aspect: 'landscape',
          quality: 'standard',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.renders?.[0]?.imageUrl) {
          setImageUrl(data.renders[0].imageUrl);
        }
      }
    } catch (error) {
      console.error('Render error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-archivo">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 border-b border-[#333] bg-[#0a0a0a]/95 backdrop-blur"
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link
            href="/dream"
            className="inline-flex items-center gap-2 text-[#D85A30] hover:text-[#1D9E75] transition-colors mb-4"
          >
            ← Dream Machine
          </Link>
          <div>
            <h1 className="text-4xl font-black text-[#D85A30]">The Genome</h1>
            <p className="text-[#999] mt-1">Evolve your building's DNA</p>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Section: Helix + Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
        >
          {/* DNA Helix */}
          <div className="rounded-lg border border-[#1D9E75]/30 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-8 flex items-center justify-center aspect-square">
            <div className="w-full h-full flex items-center justify-center">
              <DNAHelix genes={genes} />
            </div>
          </div>

          {/* Concept Card */}
          <ConceptCard
            genes={genes}
            onRender={handleRender}
            isLoading={isLoading}
            imageUrl={imageUrl}
          />
        </motion.div>

        {/* Bottom Section: Gene Sliders + Controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Gene Sliders (Left + Center) */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-[#D85A30]/30 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-6">
              <h2 className="text-xl font-black text-[#D85A30] mb-6 uppercase tracking-wide">
                Genetic Traits
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {geneNames.slice(0, 6).map((gene) => (
                  <GeneSlider
                    key={gene}
                    label={geneLabels[gene].label}
                    lowLabel={geneLabels[gene].low}
                    highLabel={geneLabels[gene].high}
                    value={genes[gene]}
                    onChange={(value) => handleGeneChange(gene, value)}
                    pulseKey={lastMutatedGene}
                  />
                ))}
              </div>

              <div className="border-t border-[#333] my-6" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {geneNames.slice(6).map((gene) => (
                  <GeneSlider
                    key={gene}
                    label={geneLabels[gene].label}
                    lowLabel={geneLabels[gene].low}
                    highLabel={geneLabels[gene].high}
                    value={genes[gene]}
                    onChange={(value) => handleGeneChange(gene, value)}
                    pulseKey={lastMutatedGene}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Evolution Controls (Right) */}
          <div className="rounded-lg border border-[#1D9E75]/30 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-6 flex flex-col h-full">
            <h2 className="text-xl font-black text-[#1D9E75] mb-6 uppercase tracking-wide">
              Evolution
            </h2>

            <div className="space-y-3 flex-1">
              <motion.button
                onClick={handleMutate}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-[#D85A30] to-[#C4A44A] text-black font-bold uppercase text-sm tracking-wide hover:shadow-lg hover:shadow-[#D85A30]/50 transition-all"
              >
                🧬 Mutate
              </motion.button>

              <motion.button
                onClick={handleEvolve}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-[#1D9E75] to-[#0f9e7b] text-white font-bold uppercase text-sm tracking-wide hover:shadow-lg hover:shadow-[#1D9E75]/50 transition-all"
              >
                ✨ Evolve
              </motion.button>

              <motion.button
                onClick={handleRandomize}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-lg border border-[#999] text-[#ccc] font-bold uppercase text-sm tracking-wide hover:border-[#D85A30] hover:text-[#D85A30] transition-all"
              >
                🎲 Randomize
              </motion.button>

              <motion.button
                onClick={handleReset}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-lg border border-[#666] text-[#999] font-bold uppercase text-sm tracking-wide hover:border-[#999] hover:text-[#ccc] transition-all"
              >
                ↻ Reset
              </motion.button>
            </div>

            {/* Gene Count */}
            <div className="mt-6 pt-6 border-t border-[#333]">
              <p className="text-xs text-[#999] uppercase tracking-wide mb-2">
                Genome Configuration
              </p>
              <div className="bg-[#0a0a0a] rounded p-3 border border-[#333]">
                <p className="text-[#D85A30] font-bold text-sm">12 Active Genes</p>
                <p className="text-[#999] text-xs mt-1">
                  Infinite evolutionary potential
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Evolution Modal */}
      {showEvolutionModal && (
        <EvolutionModal
          variants={variants}
          onSelect={(selectedGenes) => setGenes(selectedGenes)}
          onClose={() => setShowEvolutionModal(false)}
        />
      )}
    </div>
  );
}
