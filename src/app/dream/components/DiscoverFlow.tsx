'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';

// ═══ Design tokens (Dream Machine warm/gold chrome) ═══
const WARM = '#D85A30';
const GOLD = '#C4A44A';
const CREAM = '#FDF8F0';
const INK = '#2C1810';
const MUTED = '#8B7355';

// ═══ Discovery step definitions ═══
export interface DiscoverOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  desc?: string;
  budget?: string;
}

export interface DiscoverStep {
  id: string;
  question: string;
  subtitle: string;
  type: 'multi' | 'single' | 'slider';
  max?: number;
  options?: DiscoverOption[];
  min?: number;
  sliderMax?: number;
  labels?: [string, string];
}

export const DISCOVER_STEPS: DiscoverStep[] = [
  {
    id: 'feel',
    question: 'How should it feel?',
    subtitle: 'Close your eyes. You walk through the front door. What hits you?',
    type: 'multi',
    max: 2,
    options: [
      { id: 'cozy', label: 'Cozy & warm', icon: '◖', color: '#D85A30', desc: 'Soft light, textures, wrapped in comfort' },
      { id: 'bold', label: 'Bold & modern', icon: '◆', color: '#2D2D2D', desc: 'Clean lines, statement pieces, confidence' },
      { id: 'airy', label: 'Light & airy', icon: '○', color: '#87CEEB', desc: 'Big windows, white walls, breathing room' },
      { id: 'natural', label: 'Rustic & natural', icon: '▲', color: '#6B8E4E', desc: 'Wood, stone, earth — grounded' },
      { id: 'minimal', label: 'Sleek & minimal', icon: '—', color: '#888888', desc: 'Nothing extra. Everything intentional' },
      { id: 'grand', label: 'Grand & dramatic', icon: '★', color: '#C4A44A', desc: 'High ceilings, wow factor, presence' },
    ],
  },
  {
    id: 'priorities',
    question: 'What matters most?',
    subtitle: 'Pick up to 3 things you\'d fight for.',
    type: 'multi',
    max: 3,
    options: [
      { id: 'light', label: 'Natural light', icon: '☀', color: '#EF9F27' },
      { id: 'open', label: 'Open spaces', icon: '⊞', color: '#87CEEB' },
      { id: 'storage', label: 'Smart storage', icon: '▦', color: '#888888' },
      { id: 'outdoor', label: 'Outdoor access', icon: '◈', color: '#6B8E4E' },
      { id: 'privacy', label: 'Privacy', icon: '◉', color: '#5C4033' },
      { id: 'entertain', label: 'Entertaining', icon: '◎', color: '#D85A30' },
      { id: 'workspace', label: 'Workspace', icon: '□', color: '#2D2D2D' },
      { id: 'kitchen', label: 'The kitchen', icon: '◇', color: '#C4A44A' },
    ],
  },
  {
    id: 'style',
    question: 'Which speaks to you?',
    subtitle: 'Don\'t overthink it. First instinct wins.',
    type: 'single',
    max: 1,
    options: [
      { id: 'farmhouse', label: 'Modern farmhouse', icon: '⌂', color: '#8B7355', desc: 'Warm wood, white walls, porch life' },
      { id: 'industrial', label: 'Urban industrial', icon: '⚙', color: '#555555', desc: 'Exposed brick, steel, raw character' },
      { id: 'mediterranean', label: 'Mediterranean', icon: '◠', color: '#D85A30', desc: 'Terracotta, arches, sun-soaked warmth' },
      { id: 'contemporary', label: 'Contemporary', icon: '⬡', color: '#2D2D2D', desc: 'Right now. Clean. Unexpected materials' },
      { id: 'craftsman', label: 'Craftsman', icon: '⊡', color: '#6B4423', desc: 'Built-ins, detail, handmade quality' },
      { id: 'japandi', label: 'Japandi', icon: '⊙', color: '#C4A44A', desc: 'Japanese serenity meets Scandinavian calm' },
    ],
  },
  {
    id: 'outdoor',
    question: 'Your relationship with the outdoors?',
    subtitle: 'Slide to where you live best.',
    type: 'slider',
    min: 0,
    sliderMax: 100,
    labels: ['Cozy cave dweller', 'Open-air everything'],
  },
  {
    id: 'scale',
    question: 'What\'s the scale of this dream?',
    subtitle: 'No wrong answer. Dreams grow.',
    type: 'single',
    max: 1,
    options: [
      { id: 'small', label: 'Small', icon: '·', color: '#6B8E4E', desc: 'ADU, renovation, one room, treehouse', budget: '$5k – $80k' },
      { id: 'medium', label: 'Medium', icon: '◎', color: '#C4A44A', desc: 'Full house, addition, major remodel', budget: '$80k – $500k' },
      { id: 'large', label: 'Large', icon: '◉', color: '#D85A30', desc: 'Commercial, multi-family, estate', budget: '$500k+' },
    ],
  },
];

// ═══ Selections type ═══
export type DiscoverSelections = Record<string, string[] | number>;

// ═══ Progress ring ═══
function ProgressRing({ step, total }: { step: number; total: number }) {
  const pct = (step / total) * 100;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#E8DFD0" strokeWidth="3" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke={WARM} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      />
      <text x="22" y="23" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 12, fontWeight: 600, fill: INK }}>
        {step}/{total}
      </text>
    </svg>
  );
}

// ═══ Dream palette chips ═══
function DreamPalette({ selections }: { selections: DiscoverSelections }) {
  const chips: { label: string; color: string }[] = [];
  Object.entries(selections).forEach(([stepId, vals]) => {
    if (Array.isArray(vals)) {
      const step = DISCOVER_STEPS.find(s => s.id === stepId);
      vals.forEach(v => {
        const opt = step?.options?.find(o => o.id === v);
        if (opt) chips.push({ label: opt.label, color: opt.color });
      });
    }
  });
  if (chips.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '12px 0' }}
    >
      {chips.map((c, i) => (
        <motion.span
          key={`${c.label}-${i}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            background: c.color + '18', color: c.color,
            border: `1px solid ${c.color}33`,
          }}
        >
          {c.label}
        </motion.span>
      ))}
    </motion.div>
  );
}

// ═══ Voice input button ═══
function VoiceHint({ onVoiceResult }: { onVoiceResult: (text: string) => void }) {
  const { isListening, transcript, isSupported, startListening, stopListening } = useSpeechRecognition();

  const handleToggle = () => {
    if (isListening) {
      stopListening();
      if (transcript) onVoiceResult(transcript);
    } else {
      startListening();
    }
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={handleToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 8,
        background: isListening ? WARM + '14' : '#fff',
        border: `1.5px solid ${isListening ? WARM : '#E8DFD0'}`,
        cursor: 'pointer', fontSize: 12, color: isListening ? WARM : MUTED,
        fontWeight: 500, transition: 'all 0.2s',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={isListening ? WARM : MUTED} strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 1v11M12 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
      </svg>
      {isListening ? (
        <span>Listening... tap to finish</span>
      ) : (
        <span>Or just tell me in your own words</span>
      )}
      {isListening && transcript && (
        <span style={{ fontStyle: 'italic', opacity: 0.7, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {transcript}
        </span>
      )}
    </button>
  );
}

// ═══ Slider label helper ═══
function getSliderLabel(val: number): string {
  if (val <= 20) return 'Hermit mode';
  if (val <= 40) return 'Mostly inside';
  if (val <= 60) return 'Best of both';
  if (val <= 80) return 'Indoor-outdoor flow';
  return 'Live outside';
}

// ═══ Main DiscoverFlow component ═══
interface DiscoverFlowProps {
  onComplete: (selections: DiscoverSelections) => void;
  onBack: () => void;
}

export default function DiscoverFlow({ onComplete, onBack }: DiscoverFlowProps) {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<DiscoverSelections>({});
  const [sliderVal, setSliderVal] = useState(50);

  const currentStep = DISCOVER_STEPS[step];
  const completedSteps = Object.keys(selections).filter(k => {
    const v = selections[k];
    return Array.isArray(v) ? v.length > 0 : v !== undefined;
  }).length;

  const canAdvance = useCallback(() => {
    if (!currentStep) return false;
    if (currentStep.type === 'slider') return true;
    const sel = selections[currentStep.id];
    return Array.isArray(sel) && sel.length > 0;
  }, [currentStep, selections]);

  const handleSelect = useCallback((optionId: string) => {
    const s = currentStep;
    const current = (selections[s.id] as string[]) || [];
    if (s.type === 'single' || s.max === 1) {
      setSelections(prev => ({ ...prev, [s.id]: [optionId] }));
    } else {
      if (current.includes(optionId)) {
        setSelections(prev => ({ ...prev, [s.id]: current.filter(x => x !== optionId) }));
      } else if (current.length < (s.max || 1)) {
        setSelections(prev => ({ ...prev, [s.id]: [...current, optionId] }));
      }
    }
  }, [currentStep, selections]);

  const nextStep = useCallback(() => {
    if (currentStep.type === 'slider') {
      setSelections(prev => ({ ...prev, [currentStep.id]: sliderVal }));
    }
    if (step < DISCOVER_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      const finalSelections = currentStep.type === 'slider'
        ? { ...selections, [currentStep.id]: sliderVal }
        : selections;
      onComplete(finalSelections);
    }
  }, [currentStep, step, sliderVal, selections, onComplete]);

  const prevStep = useCallback(() => {
    if (step > 0) setStep(step - 1);
    else onBack();
  }, [step, onBack]);

  const handleVoiceResult = useCallback((_text: string) => {
    // Voice input captures free-text — in production, send to Claude
    // to extract structured selections. For now, advance to next step.
    nextStep();
  }, [nextStep]);

  const isSlider = currentStep.type === 'slider';
  const selected = (selections[currentStep.id] as string[]) || [];

  return (
    <div style={{
      minHeight: '100dvh', padding: '24px 20px', display: 'flex', flexDirection: 'column',
      background: `linear-gradient(180deg, ${CREAM} 0%, #FFF8F0 100%)`,
    }}>
      {/* Top bar: back + progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <button onClick={prevStep} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
          color: MUTED, fontWeight: 500, padding: '4px 0',
        }}>
          ← {step === 0 ? 'Back' : 'Previous'}
        </button>
        <ProgressRing step={completedSteps} total={DISCOVER_STEPS.length} />
      </div>

      {/* Question card (animated on step change) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          style={{ flex: 1 }}
        >
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 2, color: WARM,
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            Question {step + 1} of {DISCOVER_STEPS.length}
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 900, color: INK, margin: '0 0 6px', lineHeight: 1.2 }}>
            {currentStep.question}
          </h2>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 20px' }}>
            {currentStep.subtitle}
          </p>

          {/* Voice input */}
          <div style={{ marginBottom: 20 }}>
            <VoiceHint onVoiceResult={handleVoiceResult} />
          </div>

          {/* Card grid (for multi/single types) */}
          {!isSlider && currentStep.options && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: (currentStep.options.length <= 3) ? '1fr' : '1fr 1fr',
              gap: 10,
            }}>
              {currentStep.options.map((opt) => {
                const isSelected = selected.includes(opt.id);
                return (
                  <motion.button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                      background: isSelected ? opt.color + '14' : '#fff',
                      border: `1.5px solid ${isSelected ? opt.color : '#E8DFD0'}`,
                      textAlign: 'left', transition: 'border-color 0.15s, background 0.15s',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: opt.color + '18', color: opt.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700, flexShrink: 0,
                      }}>
                        {opt.icon}
                      </span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{opt.label}</div>
                        {opt.desc && <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{opt.desc}</div>}
                        {opt.budget && <div style={{ fontSize: 12, fontWeight: 600, color: opt.color, marginTop: 2 }}>{opt.budget}</div>}
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          position: 'absolute', top: 8, right: 8, width: 20, height: 20,
                          borderRadius: '50%', background: opt.color, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
                        }}
                      >
                        ✓
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Slider (for outdoor question) */}
          {isSlider && (
            <div style={{ padding: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, color: MUTED, fontWeight: 500 }}>
                <span>{currentStep.labels?.[0]}</span>
                <span>{currentStep.labels?.[1]}</span>
              </div>
              <input
                type="range" min={currentStep.min || 0} max={currentStep.sliderMax || 100}
                value={sliderVal} onChange={(e) => setSliderVal(Number(e.target.value))}
                style={{ width: '100%', accentColor: WARM }}
              />
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <span style={{
                  display: 'inline-block', padding: '8px 20px', borderRadius: 24,
                  background: WARM + '14', color: WARM, fontSize: 14, fontWeight: 700,
                }}>
                  {getSliderLabel(sliderVal)}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom: palette + nav */}
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <DreamPalette selections={selections} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          {!isSlider && currentStep.max && currentStep.max > 1 && (
            <span style={{ fontSize: 12, color: MUTED }}>Pick up to {currentStep.max}</span>
          )}
          <div style={{ flex: 1 }} />
          <motion.button
            onClick={nextStep}
            disabled={!canAdvance()}
            whileTap={canAdvance() ? { scale: 0.97 } : undefined}
            style={{
              padding: '14px 32px', borderRadius: 12, cursor: canAdvance() ? 'pointer' : 'default',
              background: canAdvance() ? WARM : '#E8DFD0',
              border: 'none', fontSize: 14, fontWeight: 700,
              color: canAdvance() ? '#fff' : '#B8AE9C',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {step === DISCOVER_STEPS.length - 1 ? 'Reveal my dream ✦' : 'Next →'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
