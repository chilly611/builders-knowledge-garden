'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectProvider, useProject } from '../../dream-shared/ProjectContext';
import SaveLoadPanel from '../../dream-shared/SaveLoadPanel';
import ProjectPicker from '../../dream-shared/ProjectPicker';
import type { DesignStudioState, DreamProject } from '../../dream-shared/types';

import { supabase } from '@/lib/supabase';
import {
  ACCENT, ACCENT_DIM, ACCENT_GLOW, GOLD, BG_DARK, GRID_LINE, TEXT_PRIMARY, TEXT_DIM, BORDER, ON_ACCENT,
  ROOMS, DEFAULT_CONTROLS,
  generateBlueprintSVG, buildStudioPrompt, mockExtractElements,
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
  const [rendering, setRendering] = useState(false);
  const [status, setStatus] = useState<{ kind: 'info' | 'warn'; text: string } | null>(null);
  const genCounter = useRef(0);

  const updateControl = useCallback((key: keyof StyleControlValues, value: number) => {
    setControls(prev => ({ ...prev, [key]: value }));
  }, []);

  /* Call the real render API. Returns image URLs, or null on any failure
   * (unconfigured / rate-limited / timeout / error) — the caller then keeps the
   * local concept sketch so the grid is NEVER empty. Sends the Supabase bearer
   * token when signed in (anonymous is allowed under a tighter server cap). */
  const callRender = useCallback(async (promptText: string, count: number): Promise<string[] | null> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch { /* anonymous is fine */ }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 40000);
      let res: Response;
      try {
        res = await fetch('/api/v1/render', {
          method: 'POST', headers,
          body: JSON.stringify({ prompt: promptText, mode: 'concepts', count }),
          signal: controller.signal,
        });
      } finally { clearTimeout(timeout); }

      if (!res.ok) {
        let code = '';
        try { code = (await res.json())?.code || ''; } catch { /* no body */ }
        if (res.status === 429 && code === 'anon_limit') {
          setStatus({ kind: 'warn', text: 'Free preview limit reached — sign in to keep generating photoreal renders. Showing concept sketches for now.' });
        } else if (res.status === 503) {
          setStatus({ kind: 'info', text: 'Live renders are warming up — here are concept sketches you can keep refining.' });
        } else {
          setStatus({ kind: 'info', text: 'Showing concept sketches — live renders will retry next time.' });
        }
        return null;
      }
      const data = await res.json();
      const urls: string[] = (data.renders || []).map((r: { imageUrl?: string }) => r.imageUrl).filter(Boolean);
      if (!urls.length) {
        setStatus({ kind: 'info', text: 'Showing concept sketches — live renders will retry next time.' });
        return null;
      }
      return urls;
    } catch {
      setStatus({ kind: 'info', text: 'Showing concept sketches — live renders will retry next time.' });
      return null;
    }
  }, []);

  /* Insert N instant concept-sketch tiles (so something shows immediately), then
   * upgrade them in place with real renders as they arrive. */
  const runConcepts = useCallback((promptText: string, labels: string[]) => {
    const batchIds: string[] = [];
    const placeholders: GeneratedImage[] = labels.map((label, i) => {
      genCounter.current += 1;
      const id = `gen-${Date.now()}-${i}`;
      batchIds.push(id);
      return {
        id, prompt: promptText,
        imageUrl: generateBlueprintSVG(genCounter.current * 17 + i * 7, label),
        timestamp: new Date().toISOString(), refinements: [], saved: false,
        kind: 'concept', pending: true,
      };
    });
    setGenerations(prev => [...placeholders, ...prev]);
    setActiveTab('results');
    setPhase('results');
    setRendering(true);
    callRender(promptText, labels.length).then(urls => {
      setGenerations(prev => prev.map(g => {
        const idx = batchIds.indexOf(g.id);
        if (idx < 0) return g;
        if (urls && urls[idx]) return { ...g, imageUrl: urls[idx], kind: 'render', pending: false };
        return { ...g, pending: false }; // keep the concept sketch
      }));
    }).finally(() => setRendering(false));
  }, [callRender]);

  const handleGenerate = useCallback(() => {
    if (!brief.trim()) return;
    setStatus(null);
    runConcepts(buildStudioPrompt(brief, controls), ['Exterior', 'Interior', 'Aerial', 'Sketch']);
  }, [brief, controls, runConcepts]);

  const handleRefine = useCallback((genId: string, refinement: string) => {
    const original = generations.find(g => g.id === genId);
    if (!original) return;
    setStatus(null);
    const refinedPrompt = `${original.prompt} — ${refinement}`;
    genCounter.current += 1;
    const id = `gen-${Date.now()}-ref`;
    const placeholder: GeneratedImage = {
      id, prompt: refinedPrompt,
      imageUrl: generateBlueprintSVG(genCounter.current * 31, 'Refined'),
      timestamp: new Date().toISOString(),
      refinements: [...original.refinements, refinement], saved: false,
      kind: 'concept', pending: true,
    };
    setGenerations(prev => [placeholder, ...prev]);
    setActiveTab('results');
    setRendering(true);
    callRender(refinedPrompt, 1).then(urls => {
      setGenerations(prev => prev.map(g => g.id === id
        ? (urls && urls[0] ? { ...g, imageUrl: urls[0], kind: 'render', pending: false } : { ...g, pending: false })
        : g));
    }).finally(() => setRendering(false));
  }, [generations, callRender]);

  const handleMoreLike = useCallback((genId: string) => {
    const original = generations.find(g => g.id === genId);
    if (!original) return;
    setStatus(null);
    const batchIds: string[] = [];
    const placeholders: GeneratedImage[] = [0, 1].map(i => {
      genCounter.current += 1;
      const id = `gen-${Date.now()}-ml${i}`;
      batchIds.push(id);
      return {
        id, prompt: `Variation of: ${original.prompt}`,
        imageUrl: generateBlueprintSVG(genCounter.current * 23 + i * 11, `Variation ${i + 1}`),
        timestamp: new Date().toISOString(), refinements: [], saved: false,
        kind: 'concept', pending: true,
      };
    });
    setGenerations(prev => [...placeholders, ...prev]);
    setActiveTab('results');
    setRendering(true);
    callRender(`${original.prompt}, alternative variation`, 2).then(urls => {
      setGenerations(prev => prev.map(g => {
        const idx = batchIds.indexOf(g.id);
        if (idx < 0) return g;
        if (urls && urls[idx]) return { ...g, imageUrl: urls[idx], kind: 'render', pending: false };
        return { ...g, pending: false };
      }));
    }).finally(() => setRendering(false));
  }, [generations, callRender]);

  /* Pick up the dream handed off from /dream (express type/voice or discover) and
   * prefill the brief. For the express ramp, auto-generate so "type your dream →
   * see images" takes zero extra clicks. One-shot: the handoff key is cleared. */
  useEffect(() => {
    if (typeof window === 'undefined' || brief) return;
    try {
      const source = new URLSearchParams(window.location.search).get('source');
      let seed = '';
      const express = localStorage.getItem('bkg-dream-express');
      if (express) {
        const p = JSON.parse(express);
        if (p?.prompt) seed = String(p.prompt);
        localStorage.removeItem('bkg-dream-express');
      }
      if (!seed) {
        const profile = localStorage.getItem('bkg-dream-profile');
        if (profile) {
          const p = JSON.parse(profile);
          seed = String(p?.freeformNotes || p?.summary || p?.profileSummary || p?.description || '').trim();
          localStorage.removeItem('bkg-dream-profile');
        }
      }
      if (seed) {
        setBrief(seed);
        if (source === 'express') {
          setTimeout(() => runConcepts(buildStudioPrompt(seed, DEFAULT_CONTROLS), ['Exterior', 'Interior', 'Aerial', 'Sketch']), 50);
        }
      }
    } catch { /* ignore malformed handoff */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setGenerations((d.generations || []).map(g => ({
        ...g, saved: g.saved ?? false,
        kind: (g.imageUrl || '').startsWith('data:') ? 'concept' : 'render', pending: false,
      })));
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
        background: `radial-gradient(ellipse at 30% 20%, rgba(216,90,48,0.05) 0%, transparent 50%),
                     radial-gradient(ellipse at 70% 80%, rgba(196,164,74,0.05) 0%, transparent 50%)`,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `linear-gradient(135deg, ${ACCENT}, ${GOLD})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: `0 0 20px ${ACCENT_GLOW}`,
            }}>✏️</div>
            <h1 style={{
              margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px',
              background: `linear-gradient(135deg, ${ACCENT}, ${GOLD})`,
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
                  background: brief.trim() ? `linear-gradient(135deg, ${ACCENT}, ${GOLD})` : 'rgba(44,24,16,0.06)',
                  color: brief.trim() ? ON_ACCENT : TEXT_DIM,
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
                  {(rendering || status) && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
                      padding: '10px 14px', borderRadius: 10,
                      background: status?.kind === 'warn' ? 'rgba(196,164,74,0.12)' : ACCENT_DIM,
                      border: `1px solid ${status?.kind === 'warn' ? 'rgba(196,164,74,0.4)' : BORDER}`,
                      color: TEXT_PRIMARY, fontSize: 12.5, fontFamily: 'monospace',
                    }}>
                      <span style={{ fontSize: 14 }}>{rendering ? '✨' : status?.kind === 'warn' ? '🔒' : '✏️'}</span>
                      <span>{rendering ? 'Rendering photoreal concepts… your sketches are ready below in the meantime.' : status?.text}</span>
                    </div>
                  )}
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
              zIndex: 200, background: `linear-gradient(135deg, ${ACCENT}, ${GOLD})`,
              color: ON_ACCENT, padding: '14px 28px', borderRadius: 12,
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
        @keyframes blueprintPulse { 0%, 100% { box-shadow: 0 0 20px rgba(216,90,48,0.1); } 50% { box-shadow: 0 0 40px rgba(216,90,48,0.2); } }
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
