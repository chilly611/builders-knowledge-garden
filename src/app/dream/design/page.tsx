'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ACCENT, ACCENT_DIM, ACCENT_GLOW, BG_DARK, BG_PANEL, BORDER, TEXT_PRIMARY, TEXT_DIM,
  generateBlueprintSVG, mockExtractElements,
  type DesignToken,
} from './shared';

/* ─────────────────────────────────────────────────────────
   LOCAL TYPES
───────────────────────────────────────────────────────── */
type GenerationState = 'idle' | 'loading' | 'complete';

/* ─────────────────────────────────────────────────────────
   STATIC DATA
───────────────────────────────────────────────────────── */
const STYLES = ['Modern', 'Farmhouse', 'Industrial', 'Mediterranean', 'Contemporary', 'Craftsman'];
const SPACES = ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Exterior', 'Commercial', 'ADU', 'Full House'];
const MOODS  = ['Cozy', 'Bold', 'Minimal', 'Luxe', 'Rustic', 'Futuristic'];

const PALETTES = [
  { name: 'Coastal Blues',  swatches: ['#4A6B8A', '#89B4CC', '#C8DFE8', '#EAF4F8'] },
  { name: 'Warm Earth',     swatches: ['#8B7355', '#C4A882', '#E8D5B8', '#F5ECD8'] },
  { name: 'Modern Mono',    swatches: ['#1A1A1A', '#4A4A4A', '#9A9A9A', '#E8E8E8'] },
  { name: 'Forest Green',   swatches: ['#2D4A2D', '#5C8A5C', '#8ABB8A', '#C8E0C8'] },
  { name: 'Desert Adobe',   swatches: ['#6B4423', '#C4854A', '#E8B888', '#F5DCC0'] },
];

const VARIANT_GRADIENTS = [
  'linear-gradient(135deg, #8B7355 0%, #C4A882 50%, #E8D5B8 100%)',
  'linear-gradient(135deg, #4A6B8A 0%, #89B4CC 50%, #C8DFE8 100%)',
  'linear-gradient(135deg, #2D4A2D 0%, #5C8A5C 50%, #8ABB8A 100%)',
  'linear-gradient(135deg, #6B4423 0%, #C4854A 50%, #E8B888 100%)',
];
const VARIANT_NAMES = ['WARM EARTH', 'COASTAL', 'FOREST', 'DESERT'];

const LOADING_STEPS = [
  'PARSING BRIEF...',
  'ANALYZING STYLE...',
  'GENERATING COMPOSITION...',
  'RENDERING DETAILS...',
];

const REFINEMENT_CHIPS = [
  'More natural light', 'Darker tones', 'Add plants',
  'More storage', 'Higher ceiling', 'Change flooring',
];

const ELEMENT_ITEMS = [
  'Flooring type', 'Cabinet style', 'Lighting fixtures',
  'Color palette', 'Hardware finish', 'Countertop material',
];

const ANNOTATION_MARKERS = [
  { label: 'KITCHEN ISLAND',    top: '38%', left: '28%' },
  { label: 'ACCENT WALL',       top: '22%', left: '62%' },
  { label: 'PENDANT LIGHTING',  top: '15%', left: '44%' },
];

/* ─────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────── */
export default function DreamDesignPage() {
  const router = useRouter();

  /* Core state */
  const [genState, setGenState]           = useState<GenerationState>('idle');
  const [selectedStyle, setSelectedStyle] = useState('Modern');
  const [brief, setBrief]                 = useState('');
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [loadingStep, setLoadingStep]     = useState(0);

  /* Left sidebar */
  const [selectedSpace, setSelectedSpace]   = useState('Kitchen');
  const [budget, setBudget]                 = useState(50000);
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [selectedMood, setSelectedMood]     = useState('Cozy');

  /* Right sidebar */
  const [refinementText, setRefinementText] = useState('');
  const [checkedElements, setCheckedElements] = useState<Set<string>>(new Set());
  const [specSheetVisible, setSpecSheetVisible] = useState(false);
  const [extractedTokens, setExtractedTokens] = useState<DesignToken[]>([]);

  /* Scanning line animation ref */
  const scanRef = useRef<HTMLDivElement>(null);

  /* ── Generation logic ── */
  function handleGenerate() {
    if (!brief.trim() && genState !== 'complete') return;
    setGenState('loading');
    setLoadingStep(0);

    let step = 0;
    const advance = () => {
      step += 1;
      if (step < LOADING_STEPS.length) {
        setLoadingStep(step);
        setTimeout(advance, 600);
      } else {
        setGenState('complete');
        setExtractedTokens(mockExtractElements('gen-001', selectedVariant));
      }
    };
    setTimeout(advance, 600);
  }

  function toggleElement(item: string) {
    setCheckedElements(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  }

  function handleExtractSpecs() {
    if (checkedElements.size === 0) {
      setCheckedElements(new Set(ELEMENT_ITEMS));
    }
    setSpecSheetVisible(true);
  }

  const formatBudget = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

  /* ─────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────── */
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: BG_DARK,
      color: TEXT_PRIMARY,
      fontFamily: 'var(--bp-font-mono, "Courier Prime", monospace)',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── Global scan-line overlay ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.013) 2px, rgba(0,212,255,0.013) 4px)`,
      }} />

      {/* ══════════════════════════════════════════════════
          TOP BAR
      ══════════════════════════════════════════════════ */}
      <TopBar onBack={() => router.back()} />

      {/* ══════════════════════════════════════════════════
          BODY (sidebar + center + sidebar)
      ══════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* ── LEFT SIDEBAR ── */}
        <LeftSidebar
          brief={brief} setBrief={setBrief}
          selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle}
          selectedSpace={selectedSpace} setSelectedSpace={setSelectedSpace}
          budget={budget} setBudget={setBudget}
          selectedPalette={selectedPalette} setSelectedPalette={setSelectedPalette}
          selectedMood={selectedMood} setSelectedMood={setSelectedMood}
          onGenerate={handleGenerate}
          formatBudget={formatBudget}
          genState={genState}
        />

        {/* ── CENTER PANEL ── */}
        <CenterPanel
          genState={genState}
          loadingStep={loadingStep}
          selectedVariant={selectedVariant}
          setSelectedVariant={setSelectedVariant}
          scanRef={scanRef}
        />

        {/* ── RIGHT SIDEBAR ── */}
        <RightSidebar
          refinementText={refinementText}
          setRefinementText={setRefinementText}
          checkedElements={checkedElements}
          toggleElement={toggleElement}
          specSheetVisible={specSheetVisible}
          onExtractSpecs={handleExtractSpecs}
          extractedTokens={extractedTokens}
          genState={genState}
        />
      </div>

      {/* ══════════════════════════════════════════════════
          ACTION BAR (bottom)
      ══════════════════════════════════════════════════ */}
      <ActionBar onBuildBlueprint={() => router.push('/killerapp')} />

      {/* Keyframe styles */}
      <style>{`
        @keyframes scan {
          0%   { top: -4px; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes pulse-grid {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes blink-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes step-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress-fill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(0,212,255,0.3), 0 0 20px rgba(0,212,255,0.1); }
          50%       { box-shadow: 0 0 16px rgba(0,212,255,0.6), 0 0 40px rgba(0,212,255,0.25); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   TOP BAR
───────────────────────────────────────────────────────── */
function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      height: 52,
      borderBottom: `1px solid ${BORDER}`,
      background: 'rgba(10,14,23,0.95)',
      backdropFilter: 'blur(8px)',
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* Left: back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: `1px solid ${BORDER}`, color: TEXT_DIM,
          padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
          letterSpacing: '0.08em',
        }}>← BACK</button>

        {/* Crosshair icon */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.6" />
          <circle cx="9" cy="9" r="2.5" fill={ACCENT} fillOpacity="0.7" />
          <line x1="9" y1="0" x2="9" y2="4.5" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.5" />
          <line x1="9" y1="13.5" x2="9" y2="18" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.5" />
          <line x1="0" y1="9" x2="4.5" y2="9" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.5" />
          <line x1="13.5" y1="9" x2="18" y2="9" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.5" />
        </svg>

        <span style={{ fontSize: 13, letterSpacing: '0.12em', fontWeight: 700, color: TEXT_PRIMARY }}>
          DREAM AI DESIGN STUDIO
        </span>
        <span style={{
          fontSize: 9, letterSpacing: '0.1em', color: ACCENT,
          border: `1px solid ${ACCENT}`, padding: '2px 6px', opacity: 0.8,
        }}>v2.4</span>
      </div>

      {/* Center: phase indicators */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {['BRIEF', 'GENERATE', 'REFINE', 'EXPORT'].map((phase, i) => (
          <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              fontSize: 9, letterSpacing: '0.1em',
              color: i === 1 ? 'var(--bp-phase-design, #7F77DD)' : TEXT_DIM,
              padding: '3px 8px',
              border: i === 1 ? '1px solid var(--bp-phase-design, #7F77DD)' : '1px solid transparent',
              background: i === 1 ? 'rgba(127,119,221,0.1)' : 'transparent',
            }}>{phase}</div>
            {i < 3 && <span style={{ color: BORDER, fontSize: 10 }}>›</span>}
          </div>
        ))}
      </div>

      {/* Right: status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF88', boxShadow: '0 0 6px #00FF88' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.1em', color: TEXT_DIM }}>AI ENGINE ONLINE</span>
        </div>
        <div style={{ fontSize: 10, color: TEXT_DIM, letterSpacing: '0.08em' }}>
          SYS / DESIGN-MODULE
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   LEFT SIDEBAR
───────────────────────────────────────────────────────── */
interface LeftSidebarProps {
  brief: string; setBrief: (v: string) => void;
  selectedStyle: string; setSelectedStyle: (v: string) => void;
  selectedSpace: string; setSelectedSpace: (v: string) => void;
  budget: number; setBudget: (v: number) => void;
  selectedPalette: number; setSelectedPalette: (v: number) => void;
  selectedMood: string; setSelectedMood: (v: string) => void;
  onGenerate: () => void;
  formatBudget: (v: number) => string;
  genState: GenerationState;
}

function LeftSidebar({
  brief, setBrief,
  selectedStyle, setSelectedStyle,
  selectedSpace, setSelectedSpace,
  budget, setBudget,
  selectedPalette, setSelectedPalette,
  selectedMood, setSelectedMood,
  onGenerate,
  formatBudget,
  genState,
}: LeftSidebarProps) {
  return (
    <div style={{
      width: 280, flexShrink: 0,
      borderRight: `1px solid ${BORDER}`,
      background: BG_PANEL,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <SidebarHeader label="DESIGN BRIEF" icon="◈" />

      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Brief textarea */}
        <div>
          <Label>DESIGN DESCRIPTION</Label>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder="Describe your dream design..."
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(0,212,255,0.04)',
              border: `1px solid ${BORDER}`,
              color: TEXT_PRIMARY,
              fontFamily: 'inherit', fontSize: 11,
              padding: '8px 10px', resize: 'vertical',
              outline: 'none', letterSpacing: '0.04em', lineHeight: 1.6,
            }}
          />
        </div>

        {/* Architectural style */}
        <div>
          <Label>ARCHITECTURAL STYLE</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {STYLES.map(s => (
              <button key={s} onClick={() => setSelectedStyle(s)} style={{
                padding: '5px 8px', fontSize: 10, letterSpacing: '0.08em',
                cursor: 'pointer', fontFamily: 'inherit',
                background: selectedStyle === s ? ACCENT_DIM : 'transparent',
                border: `1px solid ${selectedStyle === s ? ACCENT : BORDER}`,
                color: selectedStyle === s ? ACCENT : TEXT_DIM,
                transition: 'all 0.15s',
              }}>{s.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {/* Space type */}
        <div>
          <Label>SPACE TYPE</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {SPACES.map(s => (
              <button key={s} onClick={() => setSelectedSpace(s)} style={{
                padding: '5px 8px', fontSize: 9, letterSpacing: '0.07em',
                cursor: 'pointer', fontFamily: 'inherit',
                background: selectedSpace === s ? 'rgba(127,119,221,0.15)' : 'transparent',
                border: `1px solid ${selectedSpace === s ? 'var(--bp-phase-design,#7F77DD)' : BORDER}`,
                color: selectedSpace === s ? 'var(--bp-phase-design,#7F77DD)' : TEXT_DIM,
                transition: 'all 0.15s',
              }}>{s.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {/* Budget slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Label style={{ marginBottom: 0 }}>BUDGET RANGE</Label>
            <span style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>{formatBudget(budget)}</span>
          </div>
          <input type="range" min={5000} max={500000} step={5000}
            value={budget} onChange={e => setBudget(Number(e.target.value))}
            style={{ width: '100%', accentColor: ACCENT, cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontSize: 9, color: TEXT_DIM }}>$5k</span>
            <span style={{ fontSize: 9, color: TEXT_DIM }}>$500k</span>
          </div>
        </div>

        {/* Color palettes */}
        <div>
          <Label>COLOR PALETTE</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {PALETTES.map((p, i) => (
              <button key={p.name} onClick={() => setSelectedPalette(i)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', cursor: 'pointer',
                background: selectedPalette === i ? ACCENT_DIM : 'transparent',
                border: `1px solid ${selectedPalette === i ? ACCENT : BORDER}`,
                fontFamily: 'inherit',
              }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {p.swatches.map((c, si) => (
                    <div key={si} style={{ width: 14, height: 14, background: c, flexShrink: 0 }} />
                  ))}
                </div>
                <span style={{ fontSize: 10, letterSpacing: '0.07em', color: selectedPalette === i ? ACCENT : TEXT_DIM }}>
                  {p.name.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Mood chips */}
        <div>
          <Label>MOOD</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {MOODS.map(m => (
              <button key={m} onClick={() => setSelectedMood(m)} style={{
                padding: '4px 10px', fontSize: 10, letterSpacing: '0.08em',
                cursor: 'pointer', fontFamily: 'inherit',
                background: selectedMood === m ? 'rgba(255,167,38,0.12)' : 'transparent',
                border: `1px solid ${selectedMood === m ? 'var(--bp-amber-main,#FFA726)' : BORDER}`,
                color: selectedMood === m ? 'var(--bp-amber-main,#FFA726)' : TEXT_DIM,
                borderRadius: 2,
                transition: 'all 0.15s',
              }}>{m.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={onGenerate}
          disabled={genState === 'loading'}
          style={{
            width: '100%', padding: '12px 0',
            background: genState === 'loading' ? 'rgba(0,212,255,0.1)' : ACCENT_DIM,
            border: `1.5px solid ${genState === 'loading' ? 'rgba(0,212,255,0.3)' : ACCENT}`,
            color: genState === 'loading' ? 'rgba(0,212,255,0.5)' : ACCENT,
            fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            letterSpacing: '0.12em', cursor: genState === 'loading' ? 'not-allowed' : 'pointer',
            animation: genState === 'idle' ? 'glow-pulse 2s ease-in-out infinite' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {genState === 'loading' ? '● PROCESSING...' : 'GENERATE DESIGN ▶'}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CENTER PANEL
───────────────────────────────────────────────────────── */
interface CenterPanelProps {
  genState: GenerationState;
  loadingStep: number;
  selectedVariant: number;
  setSelectedVariant: (v: number) => void;
  scanRef: React.RefObject<HTMLDivElement | null>;
}

function CenterPanel({ genState, loadingStep, selectedVariant, setSelectedVariant, scanRef }: CenterPanelProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>

      {/* Generation area */}
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── State: IDLE ── */}
        {genState === 'idle' && <IdleState scanRef={scanRef} />}

        {/* ── State: LOADING ── */}
        {genState === 'loading' && <LoadingState loadingStep={loadingStep} />}

        {/* ── State: COMPLETE ── */}
        {genState === 'complete' && (
          <>
            <VariantGrid
              selectedVariant={selectedVariant}
              setSelectedVariant={setSelectedVariant}
            />
            <DesignBoard selectedVariant={selectedVariant} />
          </>
        )}
      </div>
    </div>
  );
}

/* ── Idle placeholder ── */
function IdleState({ scanRef }: { scanRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div style={{
      flex: 1,
      minHeight: 480,
      position: 'relative', overflow: 'hidden',
      border: `1px solid ${BORDER}`,
      background: '#060A12',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Blueprint grid */}
      <div className="bp-grid-dark" style={{ position: 'absolute', inset: 0, opacity: 0.6 }} />

      {/* Fine grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.3,
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.07) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }} />

      {/* Scanning line */}
      <div ref={scanRef} style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
        opacity: 0.5,
        animation: 'scan 3s linear infinite',
        boxShadow: `0 0 12px ${ACCENT}`,
      }} />

      {/* Corner markers */}
      {[{ top: 12, left: 12 }, { top: 12, right: 12 }, { bottom: 12, left: 12 }, { bottom: 12, right: 12 }].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', ...pos,
          width: 14, height: 14,
          borderTop: i < 2 ? `1.5px solid ${ACCENT}` : 'none',
          borderBottom: i >= 2 ? `1.5px solid ${ACCENT}` : 'none',
          borderLeft: i % 2 === 0 ? `1.5px solid ${ACCENT}` : 'none',
          borderRight: i % 2 === 1 ? `1.5px solid ${ACCENT}` : 'none',
          opacity: 0.5,
        }} />
      ))}

      {/* Center content */}
      <div style={{ textAlign: 'center', zIndex: 1, userSelect: 'none' }}>
        {/* Crosshair SVG */}
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ display: 'block', margin: '0 auto 16px', opacity: 0.5 }}>
          <circle cx="24" cy="24" r="20" stroke={ACCENT} strokeWidth="1" fill="none" strokeDasharray="4 3" />
          <circle cx="24" cy="24" r="10" stroke={ACCENT} strokeWidth="0.75" fill="none" />
          <circle cx="24" cy="24" r="3" fill={ACCENT} opacity="0.7" />
          <line x1="24" y1="0" x2="24" y2="12" stroke={ACCENT} strokeWidth="1" />
          <line x1="24" y1="36" x2="24" y2="48" stroke={ACCENT} strokeWidth="1" />
          <line x1="0" y1="24" x2="12" y2="24" stroke={ACCENT} strokeWidth="1" />
          <line x1="36" y1="24" x2="48" y2="24" stroke={ACCENT} strokeWidth="1" />
        </svg>

        <div style={{ fontSize: 16, letterSpacing: '0.18em', color: ACCENT, opacity: 0.7, marginBottom: 8 }}>
          AWAITING DESIGN BRIEF
        </div>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', color: TEXT_DIM }}>
          FILL BRIEF + GENERATE TO INITIALIZE
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 20, justifyContent: 'center' }}>
          {['STYLE', 'SPACE', 'MOOD', 'PALETTE'].map(tag => (
            <div key={tag} style={{
              fontSize: 9, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.3)',
              border: '1px solid rgba(0,212,255,0.1)', padding: '3px 8px',
            }}>{tag}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Loading state ── */
function LoadingState({ loadingStep }: { loadingStep: number }) {
  const progress = ((loadingStep + 1) / LOADING_STEPS.length) * 100;

  return (
    <div style={{
      flex: 1,
      minHeight: 480,
      position: 'relative', overflow: 'hidden',
      border: `1px solid ${BORDER}`,
      background: '#060A12',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Pulsing grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        animation: 'pulse-grid 1.2s ease-in-out infinite',
      }} />

      <div style={{ zIndex: 1, width: '80%', maxWidth: 420, textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ marginBottom: 24, opacity: 0.6 }}>
          <svg width="40" height="40" viewBox="0 0 40 40" style={{ display: 'block', margin: '0 auto', animation: 'pulse-grid 1s ease-in-out infinite' }}>
            <rect x="2" y="2" width="36" height="36" stroke={ACCENT} strokeWidth="1" fill="none" strokeDasharray="6 3" />
            <rect x="10" y="10" width="20" height="20" stroke={ACCENT} strokeWidth="0.75" fill="none" />
            <rect x="17" y="17" width="6" height="6" fill={ACCENT} opacity="0.6" />
          </svg>
        </div>

        {/* Current step */}
        <div key={loadingStep} style={{
          fontSize: 15, letterSpacing: '0.16em', color: ACCENT,
          marginBottom: 8, animation: 'step-in 0.3s ease-out',
        }}>
          {LOADING_STEPS[loadingStep]}
        </div>

        {/* Step count */}
        <div style={{ fontSize: 10, color: TEXT_DIM, letterSpacing: '0.1em', marginBottom: 24 }}>
          STEP {loadingStep + 1} / {LOADING_STEPS.length}
        </div>

        {/* Progress bar */}
        <div style={{
          height: 3, background: 'rgba(0,212,255,0.1)',
          border: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${progress}%`,
            background: `linear-gradient(90deg, rgba(0,212,255,0.4), ${ACCENT})`,
            boxShadow: `0 0 10px ${ACCENT}`,
            transition: 'width 0.5s ease',
          }} />
        </div>

        {/* Step labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {LOADING_STEPS.map((s, i) => (
            <div key={s} style={{
              fontSize: 8, letterSpacing: '0.06em',
              color: i <= loadingStep ? ACCENT : TEXT_DIM,
              opacity: i <= loadingStep ? 1 : 0.4,
              transition: 'all 0.3s',
            }}>
              {i <= loadingStep ? '◆' : '◇'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 2×2 Variant grid ── */
function VariantGrid({ selectedVariant, setSelectedVariant }: {
  selectedVariant: number;
  setSelectedVariant: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <SectionLabel>AI DESIGN VARIANTS</SectionLabel>
        <span style={{ fontSize: 10, color: TEXT_DIM }}> — 4 results generated</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {VARIANT_GRADIENTS.map((grad, i) => (
          <VariantCard
            key={i}
            index={i}
            gradient={grad}
            name={VARIANT_NAMES[i]}
            selected={selectedVariant === i}
            onSelect={() => setSelectedVariant(i)}
          />
        ))}
      </div>
    </div>
  );
}

function VariantCard({ index, gradient, name, selected, onSelect }: {
  index: number; gradient: string; name: string;
  selected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const stars = [4, 5, 4, 5][index];

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        border: selected
          ? `1.5px solid ${ACCENT}`
          : hovered ? `1px solid rgba(0,212,255,0.4)` : `1px solid ${BORDER}`,
        boxShadow: selected ? `0 0 16px ${ACCENT_GLOW}, 0 0 40px rgba(0,212,255,0.1)` : 'none',
        transition: 'all 0.2s',
        animation: selected ? 'glow-pulse 2s ease-in-out infinite' : 'none',
      }}
    >
      {/* Image area */}
      <div style={{ height: 130, background: gradient, position: 'relative' }}>
        {/* Blueprint grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)`,
          backgroundSize: '15px 15px',
        }} />

        {/* Top-left label */}
        <div style={{
          position: 'absolute', top: 6, left: 6,
          fontSize: 8, letterSpacing: '0.12em',
          background: 'rgba(10,14,23,0.8)',
          border: `1px solid ${BORDER}`,
          padding: '2px 6px', color: ACCENT,
        }}>
          DESIGN VARIANT 0{index + 1}
        </div>

        {/* Selected check */}
        {selected && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            width: 18, height: 18,
            background: ACCENT, color: '#0A0E17',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>✓</div>
        )}

        {/* Corner markers */}
        {selected && [0, 1, 2, 3].map(c => (
          <div key={c} style={{
            position: 'absolute',
            top: c < 2 ? 0 : undefined, bottom: c >= 2 ? 0 : undefined,
            left: c % 2 === 0 ? 0 : undefined, right: c % 2 === 1 ? 0 : undefined,
            width: 8, height: 8,
            borderTop: c < 2 ? `2px solid ${ACCENT}` : 'none',
            borderBottom: c >= 2 ? `2px solid ${ACCENT}` : 'none',
            borderLeft: c % 2 === 0 ? `2px solid ${ACCENT}` : 'none',
            borderRight: c % 2 === 1 ? `2px solid ${ACCENT}` : 'none',
          }} />
        ))}
      </div>

      {/* Card footer */}
      <div style={{
        padding: '8px 10px',
        background: selected ? 'rgba(0,212,255,0.05)' : 'rgba(6,10,18,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', color: TEXT_PRIMARY }}>{name}</div>
          <div style={{ marginTop: 3 }}>
            {Array.from({ length: 5 }, (_, si) => (
              <span key={si} style={{ fontSize: 9, color: si < stars ? '#FFA726' : BORDER }}>★</span>
            ))}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onSelect(); }} style={{
          padding: '4px 10px', fontSize: 9, letterSpacing: '0.1em',
          cursor: 'pointer', fontFamily: 'inherit',
          background: selected ? ACCENT : 'transparent',
          border: `1px solid ${selected ? ACCENT : BORDER}`,
          color: selected ? '#0A0E17' : TEXT_DIM,
          fontWeight: selected ? 700 : 400,
          transition: 'all 0.15s',
        }}>
          {selected ? 'SELECTED' : 'SELECT'}
        </button>
      </div>
    </div>
  );
}

/* ── Design Board ── */
function DesignBoard({ selectedVariant }: { selectedVariant: number }) {
  const [activeTool, setActiveTool] = useState<string>('ANNOTATE');

  return (
    <div style={{ animation: 'fade-in 0.4s ease-out' }}>
      {/* Board header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionLabel>DESIGN BOARD — VARIANT 0{selectedVariant + 1}</SectionLabel>
        <div style={{ display: 'flex', gap: 5 }}>
          {['ANNOTATE', 'MEASURE', 'COMPARE'].map(tool => (
            <button key={tool} onClick={() => setActiveTool(tool)} style={{
              padding: '4px 10px', fontSize: 9, letterSpacing: '0.1em',
              cursor: 'pointer', fontFamily: 'inherit',
              background: activeTool === tool ? ACCENT_DIM : 'transparent',
              border: `1px solid ${activeTool === tool ? ACCENT : BORDER}`,
              color: activeTool === tool ? ACCENT : TEXT_DIM,
              transition: 'all 0.15s',
            }}>{tool}</button>
          ))}
        </div>
      </div>

      {/* Board canvas */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        border: `1px solid ${BORDER}`,
        height: 280,
        background: VARIANT_GRADIENTS[selectedVariant],
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }} />

        {/* Annotation markers */}
        {activeTool === 'ANNOTATE' && ANNOTATION_MARKERS.map((marker, i) => (
          <div key={i} style={{ position: 'absolute', top: marker.top, left: marker.left }}>
            {/* Dot */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: ACCENT, boxShadow: `0 0 8px ${ACCENT}`,
              position: 'absolute', top: -4, left: -4,
            }} />
            {/* Line + label */}
            <div style={{
              position: 'absolute', top: -22, left: 6,
              whiteSpace: 'nowrap',
            }}>
              <div style={{
                fontSize: 8, letterSpacing: '0.1em', color: ACCENT,
                background: 'rgba(10,14,23,0.85)',
                border: `1px solid ${ACCENT}`,
                padding: '2px 6px',
              }}>{marker.label}</div>
              <div style={{
                width: 1, height: 18, background: ACCENT, opacity: 0.5,
                margin: '0 0 0 20px',
              }} />
            </div>
          </div>
        ))}

        {/* Board label */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          fontSize: 9, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.7)',
          background: 'rgba(10,14,23,0.7)', padding: '3px 8px',
          border: `1px solid ${BORDER}`,
        }}>DESIGN BOARD — FULL VIEW</div>

        {/* Scale bar */}
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ width: 60, height: 2, background: ACCENT, opacity: 0.6 }} />
          <span style={{ fontSize: 8, color: 'rgba(0,212,255,0.6)', letterSpacing: '0.1em' }}>10 FT</span>
        </div>

        {/* North indicator */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          fontSize: 9, color: 'rgba(0,212,255,0.5)',
          border: `1px solid rgba(0,212,255,0.2)`, padding: '2px 6px',
        }}>N ↑</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   RIGHT SIDEBAR
───────────────────────────────────────────────────────── */
interface RightSidebarProps {
  refinementText: string;
  setRefinementText: (v: string) => void;
  checkedElements: Set<string>;
  toggleElement: (item: string) => void;
  specSheetVisible: boolean;
  onExtractSpecs: () => void;
  extractedTokens: DesignToken[];
  genState: GenerationState;
}

function RightSidebar({
  refinementText, setRefinementText,
  checkedElements, toggleElement,
  specSheetVisible, onExtractSpecs,
  extractedTokens, genState,
}: RightSidebarProps) {
  return (
    <div style={{
      width: 260, flexShrink: 0,
      borderLeft: `1px solid ${BORDER}`,
      background: BG_PANEL,
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      <SidebarHeader label="REFINEMENT TOOLS" icon="⊕" />

      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Refinement input */}
        <div>
          <Label>REFINE DESIGN</Label>
          <div style={{ display: 'flex', gap: 5 }}>
            <input
              type="text"
              value={refinementText}
              onChange={e => setRefinementText(e.target.value)}
              placeholder="Describe refinement..."
              style={{
                flex: 1, padding: '7px 8px', fontSize: 10,
                background: 'rgba(0,212,255,0.04)',
                border: `1px solid ${BORDER}`,
                color: TEXT_PRIMARY, fontFamily: 'inherit',
                letterSpacing: '0.04em', outline: 'none',
              }}
            />
            <button style={{
              padding: '7px 10px', fontSize: 10, letterSpacing: '0.08em',
              cursor: 'pointer', fontFamily: 'inherit',
              background: ACCENT_DIM, border: `1px solid ${ACCENT}`, color: ACCENT,
            }}>REFINE</button>
          </div>
        </div>

        {/* Quick refinement chips */}
        <div>
          <Label>QUICK REFINEMENTS</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {REFINEMENT_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => setRefinementText(chip)}
                style={{
                  padding: '4px 8px', fontSize: 9, letterSpacing: '0.06em',
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: refinementText === chip ? ACCENT_DIM : 'transparent',
                  border: `1px solid ${refinementText === chip ? ACCENT : BORDER}`,
                  color: refinementText === chip ? ACCENT : TEXT_DIM,
                  transition: 'all 0.15s', borderRadius: 2,
                }}
              >{chip}</button>
            ))}
          </div>
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: BORDER }} />

        {/* Element extraction */}
        <div>
          <Label>ELEMENT EXTRACTION</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
            {ELEMENT_ITEMS.map(item => (
              <label key={item} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', padding: '4px 0',
              }}>
                <div
                  onClick={() => toggleElement(item)}
                  style={{
                    width: 14, height: 14, flexShrink: 0,
                    border: `1px solid ${checkedElements.has(item) ? ACCENT : BORDER}`,
                    background: checkedElements.has(item) ? ACCENT_DIM : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {checkedElements.has(item) && (
                    <span style={{ fontSize: 8, color: ACCENT, lineHeight: 1 }}>✓</span>
                  )}
                </div>
                <span style={{ fontSize: 10, color: TEXT_DIM, letterSpacing: '0.06em' }}>
                  {item.toUpperCase()}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={onExtractSpecs}
            disabled={genState !== 'complete'}
            style={{
              width: '100%', padding: '8px 0', fontSize: 10,
              letterSpacing: '0.1em', cursor: genState === 'complete' ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              background: genState === 'complete' ? 'rgba(127,119,221,0.1)' : 'transparent',
              border: `1px solid ${genState === 'complete' ? 'var(--bp-phase-design,#7F77DD)' : BORDER}`,
              color: genState === 'complete' ? 'var(--bp-phase-design,#7F77DD)' : TEXT_DIM,
              transition: 'all 0.15s',
            }}
          >
            EXTRACT SPECS
          </button>
        </div>

        {/* Spec sheet */}
        {specSheetVisible && (
          <div style={{ animation: 'fade-in 0.3s ease-out' }}>
            <Label>SPEC SHEET</Label>
            <div style={{
              background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}`,
              padding: '10px', fontSize: 9, lineHeight: 1.8,
              letterSpacing: '0.06em', color: TEXT_DIM, marginBottom: 10,
              fontFamily: 'inherit',
            }}>
              <div style={{ color: ACCENT, marginBottom: 4 }}>// EXTRACTED ELEMENTS</div>
              {extractedTokens.length > 0
                ? extractedTokens.map(tok => (
                  <div key={tok.id}>
                    <span style={{ color: 'rgba(127,119,221,0.8)' }}>{tok.category.toUpperCase()}:</span>{' '}
                    <span style={{ color: TEXT_PRIMARY }}>{tok.label}</span>
                  </div>
                ))
                : ELEMENT_ITEMS.filter(item => checkedElements.has(item)).map(item => (
                  <div key={item}>
                    <span style={{ color: 'rgba(127,119,221,0.8)' }}>{item.toUpperCase()}:</span>{' '}
                    <span style={{ color: TEXT_PRIMARY }}>TBD — analyze design</span>
                  </div>
                ))
              }
              <div style={{ marginTop: 6, color: TEXT_DIM }}>// END SPEC</div>
            </div>

            <button style={{
              width: '100%', padding: '8px 0', fontSize: 10,
              letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'inherit',
              background: 'rgba(255,167,38,0.1)',
              border: '1px solid var(--bp-amber-main,#FFA726)',
              color: 'var(--bp-amber-main,#FFA726)',
            }}>
              EXPORT SPEC SHEET ↓
            </button>
          </div>
        )}

        {/* Separator */}
        <div style={{ height: 1, background: BORDER }} />

        {/* Element Library */}
        <div>
          <Label>ELEMENT LIBRARY</Label>
          {genState === 'complete'
            ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {['Surfaces', 'Fixtures', 'Lighting', 'Textiles', 'Hardware'].map(cat => (
                  <div key={cat} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 8px',
                    border: `1px solid ${BORDER}`,
                    background: 'rgba(0,212,255,0.02)',
                  }}>
                    <span style={{ fontSize: 10, letterSpacing: '0.07em', color: TEXT_DIM }}>{cat.toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: ACCENT }}>
                      {Math.floor(Math.random() * 8) + 2}
                    </span>
                  </div>
                ))}
              </div>
            )
            : (
              <div style={{ fontSize: 10, color: TEXT_DIM, letterSpacing: '0.07em', padding: '8px 0' }}>
                GENERATE DESIGN TO POPULATE
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   ACTION BAR
───────────────────────────────────────────────────────── */
function ActionBar({ onBuildBlueprint }: { onBuildBlueprint: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      height: 52,
      borderTop: `1px solid ${BORDER}`,
      background: 'rgba(10,14,23,0.95)',
      backdropFilter: 'blur(8px)',
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* Left: credit counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFA726' }} />
        <span style={{ fontSize: 10, letterSpacing: '0.1em', color: TEXT_DIM }}>
          8 GENERATIONS REMAINING
        </span>
      </div>

      {/* Center: main actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button style={{
          padding: '8px 14px', fontSize: 10, letterSpacing: '0.1em',
          cursor: 'pointer', fontFamily: 'inherit',
          background: 'transparent',
          border: `1px solid ${BORDER}`, color: TEXT_DIM,
          transition: 'all 0.15s',
        }}>SAVE DESIGN</button>

        <button style={{
          padding: '8px 14px', fontSize: 10, letterSpacing: '0.1em',
          cursor: 'pointer', fontFamily: 'inherit',
          background: 'transparent',
          border: `1px solid ${BORDER}`, color: TEXT_DIM,
          transition: 'all 0.15s',
        }}>SHARE ↗</button>

        <button
          onClick={onBuildBlueprint}
          style={{
            padding: '8px 22px', fontSize: 12, letterSpacing: '0.14em',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
            background: 'rgba(255,167,38,0.15)',
            border: '1.5px solid var(--bp-amber-main,#FFA726)',
            color: 'var(--bp-amber-main,#FFA726)',
            boxShadow: '0 0 12px rgba(255,167,38,0.2)',
            transition: 'all 0.2s',
          }}
        >
          BUILD BLUEPRINT →
        </button>
      </div>

      {/* Right: coordinates / readout */}
      <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.3)' }}>
        COORD 34.052 / -118.243 · DESIGN MODULE
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SMALL UTILITY COMPONENTS
───────────────────────────────────────────────────────── */
function SidebarHeader({ label, icon }: { label: string; icon: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px',
      borderBottom: `1px solid ${BORDER}`,
      flexShrink: 0,
    }}>
      <span style={{ color: ACCENT, fontSize: 12 }}>{icon}</span>
      <span style={{ fontSize: 10, letterSpacing: '0.14em', color: TEXT_DIM }}>{label}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9, letterSpacing: '0.14em', color: TEXT_DIM,
      textTransform: 'uppercase',
    }}>{children}</span>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 9, letterSpacing: '0.12em', color: TEXT_DIM,
      marginBottom: 6, textTransform: 'uppercase',
      ...style,
    }}>{children}</div>
  );
}
