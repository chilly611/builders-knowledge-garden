'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectProvider, useProject } from '../../dream-shared/ProjectContext';
import SaveLoadPanel from '../../dream-shared/SaveLoadPanel';
import ProjectPicker from '../../dream-shared/ProjectPicker';
import type { DesignStudioState, DreamProject } from '../../dream-shared/types';

import {
  ACCENT, ACCENT_GLOW, BG_DARK, GRID_LINE, TEXT_PRIMARY, TEXT_DIM, BORDER,
  ROOMS, DEFAULT_CONTROLS,
  generateBlueprintSVG, mockExtractElements,
  type Phase, type StyleControlValues, type GeneratedImage, type BoardItem, type DesignToken,
} from './shared';
import DesignBrief from './DesignBrief';
import StyleControlsPanel from './StyleControls';
import GenerationGrid from './GenerationGrid';
import { BlueprintLoader, WorkspaceTabs, GenerateBar, RoomPicker } from './RefinementTools';
import DesignBoard from './DesignBoard';
import SpecSheet from './SpecSheet';

/* ─────────────── MAIN INNER COMPONENT ─────────────── */
function DesignStudioInner() {
  const { currentProject } = useProject();
  const [phase, setPhase] = useState<Phase>('brief');
  const [brief, setBrief] = useState('');
  const [controls, setControls] = useState<StyleControlValues>({ ...DEFAULT_CONTROLS });
  const [generations, setGenerations] = useState<GeneratedImage[]>([]);
  const [board, setBoard] = useState<BoardItem[]>([]);
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'board' | 'specs'>('results');
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [saveRoom, setSaveRoom] = useState<{ genId: string; open: boolean }>({ genId: '', open: false });
  const [blueprintExported, setBlueprintExported] = useState(false);
  const genCounter = useRef(0);

  const updateControl = useCallback((key: keyof StyleControlValues, value: number) => {
    setControls(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = useCallback(() => {
    if (!brief.trim()) return;
    setPhase('generating');
    setActiveTab('results');
    setTimeout(() => {
      const newGens: GeneratedImage[] = [];
      for (let i = 0; i < 4; i++) {
        genCounter.current += 1;
        const id = `gen-${Date.now()}-${i}`;
        const seed = genCounter.current * 17 + i * 7;
        const labels = ['Concept A', 'Concept B', 'Concept C', 'Concept D'];
        newGens.push({
          id, prompt: brief,
          imageUrl: generateBlueprintSVG(seed, labels[i]),
          timestamp: new Date().toISOString(), refinements: [], saved: false,
        });
      }
      setGenerations(prev => [...newGens, ...prev]);
      setPhase('results');
    }, 2500);
  }, [brief]);

  const handleRefine = useCallback((genId: string, refinement: string) => {
    setGenerations(prev => {
      const original = prev.find(g => g.id === genId);
      if (!original) return prev;
      genCounter.current += 1;
      const newGen: GeneratedImage = {
        id: `gen-${Date.now()}-ref`, prompt: `${original.prompt} — refined: ${refinement}`,
        imageUrl: generateBlueprintSVG(genCounter.current * 31, `Refined: ${refinement.slice(0, 20)}`),
        timestamp: new Date().toISOString(), refinements: [...original.refinements, refinement], saved: false,
      };
      return [newGen, ...prev];
    });
  }, []);

  const handleMoreLike = useCallback((genId: string) => {
    const original = generations.find(g => g.id === genId);
    if (!original) return;
    setPhase('generating');
    setTimeout(() => {
      const newGens: GeneratedImage[] = [];
      for (let i = 0; i < 2; i++) {
        genCounter.current += 1;
        newGens.push({
          id: `gen-${Date.now()}-ml${i}`, prompt: `Variation of: ${original.prompt}`,
          imageUrl: generateBlueprintSVG(genCounter.current * 23 + i * 11, `Variation ${i + 1}`),
          timestamp: new Date().toISOString(), refinements: [], saved: false,
        });
      }
      setGenerations(prev => [...newGens, ...prev]);
      setPhase('results');
    }, 1800);
  }, [generations]);

  const handleSaveToBoard = useCallback((genId: string, room: string) => {
    const gen = generations.find(g => g.id === genId);
    if (!gen) return;
    setGenerations(prev => prev.map(g => g.id === genId ? { ...g, saved: true } : g));
    setBoard(prev => [...prev, {
      id: `board-${Date.now()}`, generationId: genId,
      imageUrl: gen.imageUrl, room, label: gen.prompt.slice(0, 60),
    }]);
    setSaveRoom({ genId: '', open: false });
  }, [generations]);

  const handleExtract = useCallback((genId: string) => {
    setExtractingId(genId);
    setTimeout(() => {
      const seed = parseInt(genId.replace(/\D/g, '').slice(-6)) || 42;
      const newTokens = mockExtractElements(genId, seed);
      setTokens(prev => {
        const filtered = prev.filter(t => t.sourceGenerationId !== genId);
        return [...filtered, ...newTokens];
      });
      setExtractingId(null);
    }, 1500);
  }, []);

  const handleBuildBlueprint = useCallback(() => {
    setBlueprintExported(true);
    setTimeout(() => setBlueprintExported(false), 3000);
  }, []);

  /* ─── Serialization ─── */
  const handleSerialize = useCallback((): { interfaceData: DesignStudioState; essence: { styles: string[]; materials: string[]; features: string[]; moods: string[]; constraints: string[]; freeformNotes: string } } => {
    return {
      interfaceData: {
        phase: phase === 'generating' ? 'brief' : phase as DesignStudioState['phase'],
        brief, styleControls: controls,
        generations: generations.map(g => ({ id: g.id, prompt: g.prompt, imageUrl: g.imageUrl, timestamp: g.timestamp, refinements: g.refinements, saved: g.saved })),
        board: board.map(b => ({ id: b.id, generationId: b.generationId, imageUrl: b.imageUrl, room: b.room, label: b.label, x: 0, y: 0 })),
        extractedElements: tokens.map(t => ({ id: t.id, label: t.label, category: t.category, color: t.color, sourceGenerationId: t.sourceGenerationId, description: t.description })),
      },
      essence: {
        styles: [controls.architecturalStyle < 30 ? 'Traditional' : controls.architecturalStyle > 70 ? 'Avant-Garde' : 'Contemporary'],
        materials: tokens.map(t => t.label), features: [], moods: [controls.colorWarmth < 30 ? 'Cool' : controls.colorWarmth > 70 ? 'Warm' : 'Neutral'],
        constraints: [], freeformNotes: brief,
      },
    };
  }, [phase, brief, controls, generations, board, tokens]);

  // @ts-ignore — DreamEssence shape varies between local and Vercel
  const handleDeserialize = useCallback((data: { interfaceData: unknown; essence: unknown }) => {
    const d = data.interfaceData as DesignStudioState | null;
    if (d) {
      setBrief(d.brief || '');
      setControls(d.styleControls || { ...DEFAULT_CONTROLS });
      setGenerations((d.generations || []).map(g => ({ ...g, saved: g.saved ?? false })));
      setBoard((d.board || []).map(b => ({ id: b.id, generationId: b.generationId, imageUrl: b.imageUrl, room: b.room, label: b.label })));
      setTokens((d.extractedElements || []).map(t => ({ id: t.id, label: t.label, category: t.category, color: t.color, sourceGenerationId: t.sourceGenerationId, description: t.description })));
      setPhase(d.generations && d.generations.length > 0 ? 'results' : 'brief');
    } else if (data.essence) {
      const e = data.essence as { freeformNotes?: string };
      setBrief(e.freeformNotes || '');
    }
  }, []);

  const handleTabChange = useCallback((tab: 'results' | 'board' | 'specs') => {
    setActiveTab(tab);
    setPhase(tab === 'results' ? 'results' : tab);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: BG_DARK, color: TEXT_PRIMARY,
      fontFamily: 'var(--font-archivo), system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Blueprint grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(${GRID_LINE} 1px, transparent 1px), linear-gradient(90deg, ${GRID_LINE} 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />
      {/* Ambient holographic glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse at 30% 20%, rgba(0,212,255,0.06) 0%, transparent 50%),
                     radial-gradient(ellipse at 70% 80%, rgba(0,136,170,0.04) 0%, transparent 50%)`,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `linear-gradient(135deg, ${ACCENT}, #0088AA)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: `0 0 20px ${ACCENT_GLOW}`,
            }}>✏️</div>
            <h1 style={{
              margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px',
              background: `linear-gradient(135deg, ${ACCENT}, #66E0FF)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>AI DESIGN STUDIO</h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: TEXT_DIM, fontFamily: 'monospace' }}>
            Describe your vision. Generate designs. Refine until perfect.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ─── BRIEF PHASE ─── */}
          {phase === 'brief' && (
            <motion.div key="brief" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <DesignBrief brief={brief} onBriefChange={setBrief} />
              <StyleControlsPanel controls={controls} onUpdate={updateControl} />
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: `0 0 40px ${ACCENT_GLOW}` }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={!brief.trim()}
                style={{
                  width: '100%', padding: '18px 24px',
                  background: brief.trim() ? `linear-gradient(135deg, ${ACCENT}, #0088AA)` : 'rgba(255,255,255,0.06)',
                  color: brief.trim() ? '#000' : TEXT_DIM,
                  border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800,
                  cursor: brief.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
                  letterSpacing: '0.5px', boxShadow: brief.trim() ? `0 0 30px ${ACCENT_GLOW}` : 'none',
                  transition: 'all 0.3s',
                }}
              >GENERATE DESIGN CONCEPTS</motion.button>
            </motion.div>
          )}

          {/* ─── GENERATING ─── */}
          {phase === 'generating' && (
            <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <BlueprintLoader />
            </motion.div>
          )}

          {/* ─── WORKSPACE (results/board/specs) ─── */}
          {(phase === 'results' || phase === 'board' || phase === 'specs') && (
            <motion.div key="workspace" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <WorkspaceTabs activeTab={activeTab} generationCount={generations.length} boardCount={board.length} onTabChange={handleTabChange} />

              {activeTab === 'results' && (
                <div>
                  <GenerateBar brief={brief} onBriefChange={setBrief} onGenerate={handleGenerate} onAdjustSliders={() => { setPhase('brief'); setActiveTab('results'); }} />
                  <GenerationGrid
                    generations={generations} extractingId={extractingId}
                    onSave={(id) => { if (!generations.find(g => g.id === id)?.saved) setSaveRoom({ genId: id, open: true }); }}
                    onRefine={handleRefine} onMoreLike={handleMoreLike} onExtract={handleExtract}
                  />
                </div>
              )}

              {activeTab === 'board' && (
                <DesignBoard board={board} tokens={tokens} onRemoveFromBoard={(id) => setBoard(prev => prev.filter(b => b.id !== id))} onSwitchToResults={() => setActiveTab('results')} />
              )}

              {activeTab === 'specs' && (
                <SpecSheet board={board} tokens={tokens} brief={brief} controls={controls} onBuildBlueprint={handleBuildBlueprint} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Room picker modal */}
      <AnimatePresence>
        {saveRoom.open && (
          <RoomPicker open={saveRoom.open} rooms={ROOMS} onSelect={(room) => handleSaveToBoard(saveRoom.genId, room)} onClose={() => setSaveRoom({ genId: '', open: false })} />
        )}
      </AnimatePresence>

      {/* Blueprint exported toast */}
      <AnimatePresence>
        {blueprintExported && (
          <motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
              zIndex: 200, background: `linear-gradient(135deg, ${ACCENT}, #0088AA)`,
              color: '#000', padding: '14px 28px', borderRadius: 12,
              fontSize: 14, fontWeight: 700, fontFamily: 'monospace',
              boxShadow: `0 0 40px ${ACCENT_GLOW}`,
            }}
          >Blueprint compiled and ready for 3D pipeline</motion.div>
        )}
      </AnimatePresence>

      <SaveLoadPanel interfaceType="design" accentColor={ACCENT} onSerialize={handleSerialize} onDeserialize={handleDeserialize} onOpenPicker={() => setShowPicker(true)} />
      <ProjectPicker
        isOpen={showPicker} onClose={() => setShowPicker(false)}
        onSelectProject={(project: DreamProject) => {
          const iData = project.interfaceData.design;
          handleDeserialize({ interfaceData: iData || null, essence: project.dreamEssence });
        }}
        currentInterfaceType="design" accentColor={ACCENT}
      />

      <style jsx global>{`
        @keyframes blueprintPulse { 0%, 100% { box-shadow: 0 0 20px rgba(0,212,255,0.1); } 50% { box-shadow: 0 0 40px rgba(0,212,255,0.2); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
    </div>
  );
}

export default function DesignStudioPage() {
  return (
    <ProjectProvider>
      <DesignStudioInner />
    </ProjectProvider>
  );
}
