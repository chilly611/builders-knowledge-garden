'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ============================================================================
// THE SANDBOX — Minecraft for Real Buildings
// Place colored blocks at room scale, AI upscales to architecture
// ============================================================================

interface Block {
  x: number;
  y: number;
  type: string;
  color: string;
  label: string;
}

const ROOM_TYPES = [
  { type: 'living', color: '#4A90D9', label: 'Living Room', icon: '🛋️' },
  { type: 'bedroom', color: '#9B59B6', label: 'Bedroom', icon: '🛏️' },
  { type: 'kitchen', color: '#E67E22', label: 'Kitchen', icon: '🍳' },
  { type: 'bathroom', color: '#3498DB', label: 'Bathroom', icon: '🚿' },
  { type: 'office', color: '#2ECC71', label: 'Office', icon: '💻' },
  { type: 'garage', color: '#95A5A6', label: 'Garage', icon: '🚗' },
  { type: 'dining', color: '#E74C3C', label: 'Dining', icon: '🍽️' },
  { type: 'outdoor', color: '#1ABC9C', label: 'Outdoor', icon: '🌿' },
  { type: 'stairs', color: '#F39C12', label: 'Stairs', icon: '🪜' },
  { type: 'utility', color: '#7F8C8D', label: 'Utility', icon: '🔧' },
];

const GRID_SIZE = 12;
const CELL_SIZE = 52;

type Phase = 'build' | 'preview' | 'generating';

function generateBuildingSummary(blocks: Block[]): { rooms: Record<string, number>; totalSf: number; stories: number; description: string } {
  const rooms: Record<string, number> = {};
  blocks.forEach(b => {
    rooms[b.label] = (rooms[b.label] || 0) + 1;
  });
  const totalSf = blocks.length * 144; // each block ~12x12 ft = 144 sf
  const stories = Math.max(1, Math.ceil(blocks.length / 15));

  const roomList = Object.entries(rooms).map(([name, count]) => `${count > 1 ? count + ' ' : ''}${name}${count > 1 ? 's' : ''}`).join(', ');

  return {
    rooms,
    totalSf,
    stories,
    description: `A ${stories}-story home with ${roomList}. Approximately ${totalSf.toLocaleString()} square feet of living space. ${blocks.filter(b => b.type === 'outdoor').length > 0 ? 'Includes outdoor living areas.' : ''}`
  };
}

export default function SandboxPage() {
  const [phase, setPhase] = useState<Phase>('build');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedType, setSelectedType] = useState(ROOM_TYPES[0]);
  const [isErasing, setIsErasing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const WARM = '#D85A30';

  const getBlockAt = (x: number, y: number) => blocks.find(b => b.x === x && b.y === y);

  const toggleBlock = useCallback((x: number, y: number) => {
    const existing = blocks.find(b => b.x === x && b.y === y);
    if (isErasing) {
      setBlocks(blocks.filter(b => !(b.x === x && b.y === y)));
    } else if (existing) {
      setBlocks(blocks.filter(b => !(b.x === x && b.y === y)));
    } else {
      setBlocks([...blocks, { x, y, type: selectedType.type, color: selectedType.color, label: selectedType.label }]);
    }
  }, [blocks, selectedType, isErasing]);

  const handleCellInteraction = useCallback((x: number, y: number) => {
    toggleBlock(x, y);
  }, [toggleBlock]);

  const summary = generateBuildingSummary(blocks);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #ffffff)', color: 'var(--fg, #111111)', fontFamily: 'var(--font-archivo)' }}>
      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', zIndex: 50, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(17,17,17,0.06)' }}>
        <Link href="/dream" style={{ color: WARM, textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 20, border: `1px solid ${WARM}40` }}>
          ← Dream Machine
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: WARM }}>The Sandbox</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setBlocks([])} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' }}>Clear All</button>
          {blocks.length >= 3 && (
            <button onClick={() => setPhase('preview')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: WARM, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Preview ({blocks.length} rooms)
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', paddingTop: 60 }}>
        {/* Tool palette */}
        <div style={{ width: 80, padding: '16px 8px', borderRight: '1px solid rgba(17,17,17,0.06)', display: 'flex', flexDirection: 'column', gap: 4, position: 'fixed', top: 60, bottom: 0, overflowY: 'auto', background: 'var(--bg, #ffffff)', zIndex: 40 }}>
          {ROOM_TYPES.map(rt => (
            <button key={rt.type} onClick={() => { setSelectedType(rt); setIsErasing(false); }}
              style={{
                padding: '8px 4px', borderRadius: 10, border: selectedType.type === rt.type && !isErasing ? `2px solid ${rt.color}` : '1px solid rgba(255,255,255,0.06)',
                background: selectedType.type === rt.type && !isErasing ? `${rt.color}20` : 'transparent',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: 20 }}>{rt.icon}</span>
              <span style={{ fontSize: 8, color: selectedType.type === rt.type ? rt.color : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{rt.label}</span>
            </button>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
          <button onClick={() => setIsErasing(!isErasing)}
            style={{
              padding: '8px 4px', borderRadius: 10, border: isErasing ? '2px solid #E8443A' : '1px solid rgba(255,255,255,0.06)',
              background: isErasing ? 'rgba(232,68,58,0.2)' : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
            <span style={{ fontSize: 20 }}>🗑️</span>
            <span style={{ fontSize: 8, color: isErasing ? '#E8443A' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Erase</span>
          </button>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, marginLeft: 80, padding: 24, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: 'calc(100vh - 60px)' }}>
          <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`, gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`, gap: 1, background: 'rgba(17,17,17,0.03)', borderRadius: 16, padding: 2 }}
            onMouseDown={() => setIsDragging(true)} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              const block = getBlockAt(x, y);
              return (
                <div key={i} onClick={() => handleCellInteraction(x, y)}
                  onMouseEnter={() => isDragging && handleCellInteraction(x, y)}
                  style={{
                    width: CELL_SIZE, height: CELL_SIZE,
                    background: block ? block.color : 'rgba(17,17,17,0.02)',
                    border: block ? `2px solid ${block.color}` : '1px solid rgba(17,17,17,0.04)',
                    borderRadius: 6, cursor: isErasing ? 'crosshair' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: block ? 9 : 0, color: 'var(--fg, #111111)', fontWeight: 600,
                    transition: 'all 0.1s', userSelect: 'none',
                    opacity: block ? 0.9 : 1,
                  }}>
                  {block && <span style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{block.label.split(' ')[0]}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {blocks.length > 0 && (
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          style={{ position: 'fixed', bottom: 0, left: 80, right: 0, padding: '12px 24px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(17,17,17,0.06)', display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ color: WARM, fontWeight: 700, fontSize: 18 }}>{blocks.length}</span> rooms
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ color: WARM, fontWeight: 700, fontSize: 18 }}>~{summary.totalSf.toLocaleString()}</span> sq ft
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ color: WARM, fontWeight: 700, fontSize: 18 }}>{summary.stories}</span> {summary.stories === 1 ? 'story' : 'stories'}
          </div>
          {Object.entries(summary.rooms).slice(0, 4).map(([name, count]) => (
            <div key={name} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              {count}× {name}
            </div>
          ))}
        </motion.div>
      )}

      {/* PREVIEW MODAL */}
      <AnimatePresence>
        {phase === 'preview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ maxWidth: 600, width: '100%', padding: 40, borderRadius: 24, background: 'var(--bg, #ffffff)', border: '1px solid rgba(17,17,17,0.1)' }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: WARM, marginBottom: 8 }}>Your Blueprint</h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 24 }}>{summary.description}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(17,17,17,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: WARM }}>{blocks.length}</div>
                  <div style={{ fontSize: 11, color: 'rgba(17,17,17,0.4)' }}>Rooms</div>
                </div>
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(17,17,17,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: WARM }}>~{summary.totalSf.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'rgba(17,17,17,0.4)' }}>Sq Ft</div>
                </div>
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(17,17,17,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: WARM }}>{summary.stories}</div>
                  <div style={{ fontSize: 11, color: 'rgba(17,17,17,0.4)' }}>Stories</div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(17,17,17,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Room Breakdown</div>
                {Object.entries(summary.rooms).map(([name, count]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(17,17,17,0.05)' }}>
                    <span style={{ fontSize: 14, color: 'rgba(17,17,17,0.7)' }}>{name}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: WARM }}>{count}×</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setPhase('build')} style={{ flex: 1, padding: '14px 24px', borderRadius: 12, border: '1px solid rgba(17,17,17,0.2)', background: 'transparent', color: 'var(--fg, #111111)', fontSize: 14, cursor: 'pointer' }}>
                  Keep Editing
                </button>
                <button style={{ flex: 1, padding: '14px 24px', borderRadius: 12, border: 'none', background: WARM, color: '#ffffff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Generate Architecture →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
