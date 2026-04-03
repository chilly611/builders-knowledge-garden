'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectProvider, useProject } from '../../dream-shared/ProjectContext';
import SaveLoadPanel from '../../dream-shared/SaveLoadPanel';
import ProjectPicker from '../../dream-shared/ProjectPicker';
import type { CosmosState, DreamProject } from '../../dream-shared/types';

/* ─── Types ─── */
interface OrbitalNode {
  id: string;
  label: string;
  description: string;
  orbit: number; // 1=inner, 2=middle, 3=outer
  angle: number; // radians
  color: string;
  emoji: string;
}

/* ─── Node Data ─── */
const STYLE_NODES: OrbitalNode[] = [
  { id: 'st-med', label: 'Mediterranean', description: 'Stucco walls, terracotta roofs, arched openings, warm earth tones. Inspired by coastal European villas.', orbit: 1, angle: 0, color: '#D4A574', emoji: '🏛️' },
  { id: 'st-mod', label: 'Modern', description: 'Clean lines, open plans, large windows, minimal ornamentation. Form follows function.', orbit: 1, angle: Math.PI / 6, color: '#94A3B8', emoji: '🔲' },
  { id: 'st-craft', label: 'Craftsman', description: 'Handcrafted details, natural materials, covered porches, exposed rafters. Arts & Crafts heritage.', orbit: 1, angle: Math.PI / 3, color: '#8B6F47', emoji: '🪵' },
  { id: 'st-deco', label: 'Art Deco', description: 'Geometric patterns, bold colors, luxurious materials, theatrical glamour. 1920s-30s influence.', orbit: 1, angle: Math.PI / 2, color: '#C4A44A', emoji: '✨' },
  { id: 'st-brut', label: 'Brutalist', description: 'Raw concrete, massive forms, honest materials, sculptural presence. Uncompromising boldness.', orbit: 1, angle: 2 * Math.PI / 3, color: '#6B7280', emoji: '🏗️' },
  { id: 'st-jpn', label: 'Japanese', description: 'Natural harmony, sliding screens, gardens, wood and paper, wabi-sabi aesthetics.', orbit: 1, angle: 5 * Math.PI / 6, color: '#9CA38F', emoji: '⛩️' },
  { id: 'st-scan', label: 'Scandinavian', description: 'Light, minimal, functional, hygge comfort. White interiors meet warm wood accents.', orbit: 1, angle: Math.PI, color: '#E5DDD3', emoji: '🏔️' },
  { id: 'st-span', label: 'Spanish Colonial', description: 'Courtyards, tile work, thick walls, carved wood, romantic archways. Colonial heritage.', orbit: 1, angle: 7 * Math.PI / 6, color: '#CD7F32', emoji: '🏰' },
  { id: 'st-ind', label: 'Industrial', description: 'Exposed structure, metal, brick, open ceilings, raw urban character. Factory-to-loft.', orbit: 1, angle: 4 * Math.PI / 3, color: '#78716C', emoji: '⚙️' },
  { id: 'st-farm', label: 'Farmhouse', description: 'Board-and-batten, wraparound porches, gabled roofs, rustic-modern comfort.', orbit: 1, angle: 3 * Math.PI / 2, color: '#A3B18A', emoji: '🌾' },
  { id: 'st-tudor', label: 'Tudor', description: 'Half-timbered facades, steep gables, diamond-paned windows, storybook charm.', orbit: 1, angle: 5 * Math.PI / 3, color: '#7C5C3E', emoji: '🏡' },
  { id: 'st-prairie', label: 'Prairie', description: 'Horizontal lines, flat/hipped roofs, integration with landscape. Frank Lloyd Wright lineage.', orbit: 1, angle: 11 * Math.PI / 6, color: '#B5865A', emoji: '🌅' },
];

const MATERIAL_NODES: OrbitalNode[] = [
  { id: 'mt-timber', label: 'Timber', description: 'Engineered wood, CLT, glulam. Sustainable, warm, carbon-sequestering structural material.', orbit: 2, angle: 0, color: '#A0734A', emoji: '🪵' },
  { id: 'mt-steel', label: 'Steel', description: 'Structural steel, light gauge framing. High strength-to-weight, spans large distances.', orbit: 2, angle: Math.PI / 4, color: '#94A3B8', emoji: '⚙️' },
  { id: 'mt-concrete', label: 'Concrete', description: 'Reinforced, precast, decorative. Most used building material on earth. Thermal mass.', orbit: 2, angle: Math.PI / 2, color: '#9CA3AF', emoji: '🧱' },
  { id: 'mt-masonry', label: 'Masonry', description: 'Brick, block, stone masonry. Ancient craft, modern engineering. Fire-resistant, durable.', orbit: 2, angle: 3 * Math.PI / 4, color: '#C0392B', emoji: '🏠' },
  { id: 'mt-glass', label: 'Glass', description: 'Curtain walls, structural glazing, smart glass. Transparency, light, connection to outdoors.', orbit: 2, angle: Math.PI, color: '#7DD3FC', emoji: '🪟' },
  { id: 'mt-stone', label: 'Stone', description: 'Granite, marble, limestone, sandstone. Natural beauty, permanence, geological character.', orbit: 2, angle: 5 * Math.PI / 4, color: '#8B8578', emoji: '🪨' },
  { id: 'mt-comp', label: 'Composite', description: 'FRP, GFRC, fiber cement. Engineered performance materials. Lightweight, corrosion-resistant.', orbit: 2, angle: 3 * Math.PI / 2, color: '#6366F1', emoji: '🔬' },
  { id: 'mt-earth', label: 'Earth', description: 'Rammed earth, adobe, cob. Ancient sustainable building. Carbon-negative, breathable walls.', orbit: 2, angle: 7 * Math.PI / 4, color: '#92400E', emoji: '🌍' },
];

const CONSTRAINT_NODES: OrbitalNode[] = [
  { id: 'cn-ibc', label: 'IBC Code', description: 'International Building Code — the foundation of construction safety standards in the US and beyond.', orbit: 3, angle: 0, color: '#EF4444', emoji: '📋' },
  { id: 'cn-budget', label: 'Budget', description: 'Construction cost constraints shape every design decision, from materials to square footage.', orbit: 3, angle: Math.PI / 4, color: '#F59E0B', emoji: '💰' },
  { id: 'cn-climate', label: 'Climate', description: 'Climate zone determines insulation, HVAC, orientation, materials, and energy strategy.', orbit: 3, angle: Math.PI / 2, color: '#0EA5E9', emoji: '🌡️' },
  { id: 'cn-lot', label: 'Lot Size', description: 'Available land constrains footprint, setbacks, height, and outdoor space allocation.', orbit: 3, angle: 3 * Math.PI / 4, color: '#22C55E', emoji: '📐' },
  { id: 'cn-zone', label: 'Zoning', description: 'Zoning regulations control use, density, height, setbacks, parking, and FAR.', orbit: 3, angle: Math.PI, color: '#A855F7', emoji: '🗺️' },
  { id: 'cn-permit', label: 'Permits', description: 'Building permits govern what you can build, when, and how. Jurisdictional authority.', orbit: 3, angle: 5 * Math.PI / 4, color: '#EC4899', emoji: '📄' },
  { id: 'cn-energy', label: 'Energy Code', description: 'IECC and local energy codes set efficiency minimums. Envelope, HVAC, lighting, renewables.', orbit: 3, angle: 3 * Math.PI / 2, color: '#14B8A6', emoji: '⚡' },
  { id: 'cn-ada', label: 'Accessibility', description: 'ADA and universal design requirements ensure buildings serve all people, all abilities.', orbit: 3, angle: 7 * Math.PI / 4, color: '#F97316', emoji: '♿' },
];

const ALL_NODES = [...STYLE_NODES, ...MATERIAL_NODES, ...CONSTRAINT_NODES];

const ORBIT_LABELS = ['', 'Architectural Styles', 'Material Families', 'Constraints'];
const ORBIT_RADII = [0, 160, 280, 400];

/* Pre-computed star positions (avoids Math.random in render) */
const STAR_POSITIONS = Array.from({ length: 60 }, (_, i) => {
  const seed = (i * 7919 + 1) % 100;
  const seed2 = (i * 6271 + 3) % 100;
  return {
    x: (seed * 37 + i * 13) % 100,
    y: (seed2 * 41 + i * 17) % 100,
    size: i % 5 === 0 ? 2 : 1,
    duration: 2 + (i % 5) * 0.8,
    delay: (i % 7) * 0.4,
  };
});

/* ─── 2D Fallback Visualization ─── */
function CosmosVisualization({
  nodes,
  selected,
  absorbed,
  onSelect,
  onAbsorb,
}: {
  nodes: OrbitalNode[];
  selected: OrbitalNode | null;
  absorbed: string[];
  onSelect: (n: OrbitalNode) => void;
  onAbsorb: (n: OrbitalNode) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 0.002), 16);
    return () => clearInterval(interval);
  }, []);

  const cx = 450;
  const cy = 380;

  return (
    <div
      ref={canvasRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 900,
        height: 760,
        margin: '0 auto',
      }}
    >
      {/* SVG orbit rings */}
      <svg
        viewBox="0 0 900 760"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {[1, 2, 3].map(orbit => (
          <circle
            key={orbit}
            cx={cx}
            cy={cy}
            r={ORBIT_RADII[orbit]}
            fill="none"
            stroke={`rgba(29,158,117,${0.15 - orbit * 0.03})`}
            strokeWidth={1}
            strokeDasharray="4 8"
          />
        ))}
      </svg>

      {/* Center dream sphere */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 40px rgba(29,158,117,0.3)',
            '0 0 70px rgba(29,158,117,0.5)',
            '0 0 40px rgba(29,158,117,0.3)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          position: 'absolute',
          left: cx - 40,
          top: cy - 40,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(29,158,117,0.6) 0%, rgba(29,158,117,0.2) 60%, transparent 100%)`,
          border: '2px solid rgba(29,158,117,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: absorbed.length > 0 ? '28px' : '20px', transition: 'font-size 0.3s ease' }}>
          {absorbed.length > 2 ? '🏛️' : absorbed.length > 0 ? '🏠' : '✦'}
        </span>
      </motion.div>

      {/* Orbit labels */}
      {[1, 2, 3].map(orbit => (
        <div
          key={`label-${orbit}`}
          style={{
            position: 'absolute',
            left: cx - 80,
            top: cy - ORBIT_RADII[orbit] - 22,
            width: 160,
            textAlign: 'center',
            fontSize: '10px',
            color: 'rgba(29,158,117,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            fontWeight: 600,
          }}
        >
          {ORBIT_LABELS[orbit]}
        </div>
      ))}

      {/* Orbital nodes */}
      {nodes.map((node) => {
        const isAbsorbed = absorbed.includes(node.id);
        if (isAbsorbed) return null;

        const speed = node.orbit === 1 ? 0.3 : node.orbit === 2 ? 0.2 : 0.12;
        const animAngle = node.angle + time * speed;
        const r = ORBIT_RADII[node.orbit];
        const x = cx + r * Math.cos(animAngle) - 28;
        const y = cy + r * Math.sin(animAngle) - 28;
        const isSelected = selected?.id === node.id;

        return (
          <motion.button
            key={node.id}
            onClick={() => onSelect(node)}
            onDoubleClick={() => onAbsorb(node)}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: isSelected ? `${node.color}40` : 'rgba(255,255,255,0.05)',
              border: `2px solid ${isSelected ? node.color : `${node.color}50`}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontFamily: 'inherit',
              zIndex: 5,
              transition: 'all 0.2s ease',
              boxShadow: isSelected ? `0 0 20px ${node.color}40` : 'none',
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            title={`${node.label} — click to inspect, double-click to absorb`}
          >
            <span style={{ fontSize: '18px' }}>{node.emoji}</span>
            <span style={{
              position: 'absolute',
              bottom: -18,
              fontSize: '9px',
              color: node.color,
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}>
              {node.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─── Main Page ─── */
function CosmosPageInner() {
  const [selected, setSelected] = useState<OrbitalNode | null>(null);
  const [absorbed, setAbsorbed] = useState<string[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleSelect = (node: OrbitalNode) => {
    setSelected(node);
    setPanelOpen(true);
  };

  const handleAbsorb = (node: OrbitalNode) => {
    if (absorbed.includes(node.id)) return;
    setAbsorbed(prev => [...prev, node.id]);
    setSelected(null);
    setPanelOpen(false);
  };

  const absorbedNodes = ALL_NODES.filter(n => absorbed.includes(n.id));

  // ─── Save/Load Integration ───
  const [showPicker, setShowPicker] = useState(false);

  const handleSerialize = useCallback(() => {
    const interfaceData: CosmosState = {
      absorbedIds: absorbed,
      selectedId: selected?.id || null,
    };
    const absNodes = ALL_NODES.filter(n => absorbed.includes(n.id));
    return {
      interfaceData,
      essence: {
        styles: absNodes.filter(n => n.orbit === 1).map(n => n.label),
        materials: absNodes.filter(n => n.orbit === 2).map(n => n.label),
        constraints: absNodes.filter(n => n.orbit === 3).map(n => n.label),
        freeformNotes: absNodes.map(n => n.label).join(', '),
      },
    };
  }, [absorbed, selected]);

  const handleDeserialize = useCallback((data: { interfaceData: unknown; essence: DreamProject['dreamEssence'] }) => {
    const state = data.interfaceData as CosmosState | null;
    if (state) {
      setAbsorbed(state.absorbedIds || []);
      if (state.selectedId) {
        const node = ALL_NODES.find(n => n.id === state.selectedId);
        if (node) { setSelected(node); setPanelOpen(true); }
      }
    } else if (data.essence) {
      // Seed from dream essence (cross-interface import)
      const matchedIds: string[] = [];
      const labels = [...(data.essence.styles || []), ...(data.essence.materials || []), ...(data.essence.constraints || [])];
      for (const label of labels) {
        const node = ALL_NODES.find(n => n.label.toLowerCase() === label.toLowerCase());
        if (node) matchedIds.push(node.id);
      }
      if (matchedIds.length > 0) setAbsorbed(matchedIds);
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060612',
      color: '#fff',
      fontFamily: 'var(--font-archivo), sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Starfield background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 50% 40%, rgba(29,158,117,0.06) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(99,102,241,0.04) 0%, transparent 40%)',
        pointerEvents: 'none',
      }} />

      {/* Star particles (CSS) — deterministic positions to avoid hydration mismatch */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {STAR_POSITIONS.map((star, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: star.size,
              height: star.size,
              background: 'rgba(255,255,255,0.4)',
              borderRadius: '50%',
              left: `${star.x}%`,
              top: `${star.y}%`,
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header style={{
        position: 'relative', zIndex: 10, padding: '24px 32px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{
            fontSize: '28px', fontWeight: 800, margin: 0,
            background: 'linear-gradient(135deg, #1D9E75, #4ADE80)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>
            The Construction Cosmos
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
            Explore the building universe. Click to inspect, double-click to absorb.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {absorbed.length > 0 && (
            <button
              onClick={() => { setAbsorbed([]); setPanelOpen(false); setSelected(null); }}
              style={{
                fontSize: '12px', color: 'rgba(255,255,255,0.4)',
                background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Reset
            </button>
          )}
          <a href="/dream" style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
            padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
          }}>
            ← Dream Machine
          </a>
        </div>
      </header>

      {/* Absorbed summary bar */}
      {absorbed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'relative', zIndex: 10,
            padding: '8px 32px',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '12px', color: 'rgba(29,158,117,0.7)', fontWeight: 600 }}>
            Absorbed:
          </span>
          {absorbedNodes.map(n => (
            <span key={n.id} style={{
              background: `${n.color}20`,
              border: `1px solid ${n.color}50`,
              borderRadius: '14px',
              padding: '3px 10px',
              fontSize: '11px',
              color: n.color,
            }}>
              {n.emoji} {n.label}
            </span>
          ))}
        </motion.div>
      )}

      {/* Main visualization */}
      <div style={{ position: 'relative', zIndex: 5, marginTop: 8 }}>
        <CosmosVisualization
          nodes={ALL_NODES}
          selected={selected}
          absorbed={absorbed}
          onSelect={handleSelect}
          onAbsorb={handleAbsorb}
        />
      </div>

      {/* Detail side panel */}
      <AnimatePresence>
        {panelOpen && selected && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            style={{
              position: 'fixed',
              right: 0, top: 0, bottom: 0,
              width: 360,
              background: 'rgba(10,10,20,0.95)',
              borderLeft: '1px solid rgba(29,158,117,0.2)',
              backdropFilter: 'blur(20px)',
              zIndex: 50,
              padding: '32px 24px',
              overflowY: 'auto',
            }}
          >
            <button
              onClick={() => { setPanelOpen(false); setSelected(null); }}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                fontSize: '20px', cursor: 'pointer',
              }}
            >
              ×
            </button>

            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: `${selected.color}25`,
              border: `2px solid ${selected.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <span style={{ fontSize: '32px' }}>{selected.emoji}</span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px', color: selected.color }}>
              {selected.label}
            </h2>
            <p style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase', letterSpacing: '1.5px',
              margin: '0 0 16px',
            }}>
              {ORBIT_LABELS[selected.orbit]}
            </p>

            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: '0 0 24px' }}>
              {selected.description}
            </p>

            <button
              onClick={() => handleAbsorb(selected)}
              disabled={absorbed.includes(selected.id)}
              style={{
                width: '100%',
                background: absorbed.includes(selected.id)
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, #1D9E75, #4ADE80)',
                color: absorbed.includes(selected.id) ? 'rgba(255,255,255,0.3)' : '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: absorbed.includes(selected.id) ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {absorbed.includes(selected.id) ? '✓ Absorbed' : '↳ Absorb into Dream'}
            </button>

            {/* Related nodes hint */}
            <div style={{ marginTop: 32 }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Related Knowledge
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                Explore building codes, materials, and methods related to {selected.label} in the Knowledge Garden.
              </p>
              <a
                href={`/knowledge?q=${encodeURIComponent(selected.label)}`}
                style={{
                  display: 'inline-block',
                  marginTop: 12,
                  fontSize: '13px',
                  color: '#1D9E75',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(29,158,117,0.3)',
                }}
              >
                Search Knowledge Garden →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save/Load System */}
      <SaveLoadPanel
        interfaceType="cosmos"
        accentColor="#1D9E75"
        onSerialize={handleSerialize}
        onDeserialize={handleDeserialize}
        onOpenPicker={() => setShowPicker(true)}
      />
      <ProjectPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectProject={(project) => {
          const iData = project.interfaceData.cosmos;
          handleDeserialize({ interfaceData: iData || null, essence: project.dreamEssence });
        }}
        currentInterfaceType="cosmos"
        accentColor="#1D9E75"
      />

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export default function CosmosPage() {
  return (
    <ProjectProvider>
      <CosmosPageInner />
    </ProjectProvider>
  );
}
