'use client';

import React, { useState, useRef, useEffect } from 'react';
import { colors, fonts, fontSizes, fontWeights, spacing, borders, radii, shadows, transitions, zIndex } from '../tokens';
import type { StepCardProps, StepResult, WorkflowStep } from './StepCard.types';

/**
 * StepCard Primitive
 * ===================
 * Expandable workflow step card — the foundational UI for every step in the Killer App.
 *
 * Constitution bindings:
 * - Goal 1: Plain language labels (pro mode hook available, no-op in initial impl)
 * - Goal 5: Fearless navigation via onAction events (step_opened, step_saved, step_skipped, step_completed)
 * - Goal 6: Voice affordances on every textarea
 * - Goal 8: Machine-legible via hidden <script type="application/json" data-bkg-step>
 * - Goal 9: Voice is equal — voice button ALWAYS visible on textareas
 *
 * Time Machine integration (constitution binding #2):
 * Emits structured events (type, stepId, payload, timestamp) that can be replayed.
 * The Time Machine platform service subscribes to these events; StepCard just emits.
 */

interface VoiceState {
  isListening: boolean;
  transcript: string;
  error: string | null;
}

const DEFAULT_STATUS = 'pending' as const;
const STATUS_COLORS = {
  pending: colors.ink[200],
  in_progress: '#D85A30', // Decision #12: warm orange
  complete: colors.robin,  // Decision #12: Robin's Egg (canonical: #7FCFCB)
} as const;

// Peak-moment step IDs — these steps get hero-treatment crowns (Deep Orange CTA, Robin's Egg confidence tag, etc.)
// Keep this list tight; every addition dilutes the "peak pair" moment.
const PEAK_STEP_IDS = new Set<string>([
  's11-5', // Supply Ordering — Place Order (Deep Orange peak CTA)
  's2-6',  // Estimating — AI estimate reveal (Robin's Egg high-confidence badge)
]);

export default function StepCard({
  step,
  status = DEFAULT_STATUS,
  stepNumber = 1,
  totalSteps = 1,
  xpReward = 0,
  expanded = false,
  onToggleExpand,
  onAction,
  renderAnalysis,
  proMode = false,
  ctaLabel = 'Next step',
}: StepCardProps) {
  // State management
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [voiceState, setVoiceState] = useState<VoiceState>({ isListening: false, transcript: '', error: null });
  const [inputValue, setInputValue] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [analysisInput, setAnalysisInput] = useState('');
  const [voiceAvailable, setVoiceAvailable] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Detect Web Speech API availability
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceAvailable(!!SpeechRecognition && !!navigator.mediaDevices);
  }, []);

  // Initialize Web Speech Recognition if available
  useEffect(() => {
    if (!voiceAvailable) return;

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setVoiceState((prev) => ({ ...prev, isListening: true, error: null }));
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      setVoiceState((prev) => ({
        ...prev,
        transcript: final || interim,
      }));
    };

    recognition.onerror = () => {
      setVoiceState((prev) => ({
        ...prev,
        error: 'Voice didn\'t catch that. Check your mic and try again.',
      }));
    };

    recognition.onend = () => {
      setVoiceState((prev) => ({ ...prev, isListening: false }));
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [voiceAvailable]);

  // Toggle expansion
  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    if (onToggleExpand) {
      onToggleExpand();
    }

    // Emit step_opened event when expanding
    if (newExpanded && onAction) {
      onAction({
        type: 'step_opened',
        stepId: step.id,
        payload: { label: step.label, type: step.type },
        timestamp: Date.now(),
      });
    }
  };

  // Voice input toggle
  const handleVoiceToggle = () => {
    if (!recognitionRef.current) return;

    if (voiceState.isListening) {
      recognitionRef.current.stop();
    } else {
      setVoiceState({ isListening: false, transcript: '', error: null });
      recognitionRef.current.start();
    }
  };

  // Apply voice transcript to whichever input state this step uses.
  // Appends the transcript to existing text so users can dictate in chunks
  // and correct between utterances.
  const handleApplyVoiceTranscript = () => {
    const transcript = voiceState.transcript.trim();
    if (!transcript) return;

    if (step.type === 'analysis_result') {
      setAnalysisInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    } else {
      // text_input, voice_input, number_input all use inputValue
      setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
      if (textareaRef.current) {
        textareaRef.current.value = textareaRef.current.value
          ? `${textareaRef.current.value} ${transcript}`
          : transcript;
      }
    }
    setVoiceState({ isListening: false, transcript: '', error: null });
  };

  // Handle step submission
  const handleStepSubmit = (submitType: 'save' | 'skip' | 'complete') => {
    const payload =
      step.type === 'text_input' || step.type === 'voice_input'
        ? { value: inputValue }
        : step.type === 'number_input'
          ? { value: inputValue }
          : step.type === 'multi_select' || step.type === 'select'
            ? { selected: selectedOptions }
            : step.type === 'checklist'
              ? { checked: checkedItems }
              : step.type === 'analysis_result'
                ? { input: analysisInput }
                : {};

    if (onAction) {
      const resultType =
        submitType === 'skip'
          ? 'step_skipped'
          : submitType === 'complete'
            ? 'step_completed'
            : 'step_saved';

      onAction({
        type: resultType,
        stepId: step.id,
        payload,
        timestamp: Date.now(),
      });
    }

    // Close after submit if not analysis
    if (step.type !== 'analysis_result') {
      setIsExpanded(false);
    }
  };

  // Render the appropriate input for step type
  const renderStepInput = () => {
    const commonInputStyle = {
      fontFamily: fonts.body,
      fontSize: fontSizes.sm,
      padding: spacing[3],
      border: `${borders.thin} ${colors.ink[200]}`,
      borderRadius: radii.md,
      color: colors.ink[900],
      backgroundColor: colors.paper.white,
      transition: `border-color ${transitions.base}`,
    };

    switch (step.type) {
      case 'text_input':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            <textarea
              ref={textareaRef}
              placeholder={step.placeholder || 'Type or speak — in your own words. Tap 🎤 to dictate.'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--brass)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--faded-rule)';
              }}
              style={{
                ...commonInputStyle,
                minHeight: '120px',
                fontFamily: fonts.body,
                resize: 'vertical',
              }}
            />
            {/* Goal 9: Voice button always visible on textarea */}
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <button
                type="button"
                onClick={handleVoiceToggle}
                title={voiceAvailable ? 'Click to record voice input' : 'Voice not available in this browser'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  borderRadius: radii.full,
                  border: `${borders.thin} ${colors.ink[300]}`,
                  backgroundColor: voiceState.isListening ? colors.status.warning : colors.paper.white,
                  color: voiceState.isListening ? colors.paper.white : colors.ink[600],
                  cursor: voiceAvailable ? 'pointer' : 'not-allowed',
                  opacity: voiceAvailable ? 1 : 0.6,
                  transition: `all ${transitions.base}`,
                  fontSize: fontSizes.lg,
                }}
                disabled={!voiceAvailable}
              >
                🎤
              </button>
              {voiceState.transcript && (
                <button
                  type="button"
                  onClick={handleApplyVoiceTranscript}
                  style={{
                    padding: `${spacing[2]} ${spacing[3]}`,
                    borderRadius: radii.md,
                    border: 'none',
                    backgroundColor: colors.cyan.main,
                    color: colors.paper.white,
                    fontFamily: fonts.body,
                    fontSize: fontSizes.sm,
                    fontWeight: fontWeights.semibold,
                    cursor: 'pointer',
                    transition: `background-color ${transitions.base}`,
                  }}
                >
                  Apply transcript
                </button>
              )}
            </div>
            {voiceState.error && (
              <div style={{ color: colors.status.error, fontSize: fontSizes.xs }}>
                {voiceState.error}
              </div>
            )}
          </div>
        );

      case 'voice_input':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            <textarea
              ref={textareaRef}
              placeholder={step.placeholder || 'Speak or type in your own words — whichever feels natural.'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--brass)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--faded-rule)';
              }}
              style={{
                ...commonInputStyle,
                minHeight: '120px',
                resize: 'vertical',
              }}
            />
            {/* Goal 9: Voice button always visible on textarea */}
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <button
                type="button"
                onClick={handleVoiceToggle}
                title={voiceAvailable ? 'Click to record voice input' : 'Voice not available in this browser'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  borderRadius: radii.full,
                  border: `${borders.thin} ${colors.ink[300]}`,
                  backgroundColor: voiceState.isListening ? colors.status.warning : colors.paper.white,
                  color: voiceState.isListening ? colors.paper.white : colors.ink[600],
                  cursor: voiceAvailable ? 'pointer' : 'not-allowed',
                  opacity: voiceAvailable ? 1 : 0.6,
                  transition: `all ${transitions.base}`,
                  fontSize: fontSizes.lg,
                }}
                disabled={!voiceAvailable}
              >
                🎤
              </button>
              {voiceState.transcript && (
                <button
                  type="button"
                  onClick={handleApplyVoiceTranscript}
                  style={{
                    padding: `${spacing[2]} ${spacing[3]}`,
                    borderRadius: radii.md,
                    border: 'none',
                    backgroundColor: colors.cyan.main,
                    color: colors.paper.white,
                    fontFamily: fonts.body,
                    fontSize: fontSizes.sm,
                    fontWeight: fontWeights.semibold,
                    cursor: 'pointer',
                    transition: `background-color ${transitions.base}`,
                  }}
                >
                  Apply transcript
                </button>
              )}
            </div>
            {voiceState.error && (
              <div style={{ color: colors.status.error, fontSize: fontSizes.xs }}>
                {voiceState.error}
              </div>
            )}
          </div>
        );

      case 'number_input':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            <input
              type="number"
              placeholder={step.placeholder || '0'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--brass)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--faded-rule)';
              }}
              style={{
                ...commonInputStyle,
                height: '48px',
                textAlign: 'center',
                fontSize: '18px',
              }}
            />
            {step.unit && (
              <span style={{ fontSize: fontSizes.xs, color: colors.ink[500] }}>
                {step.unit}
              </span>
            )}
          </div>
        );

      case 'location_input':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            <input
              type="text"
              placeholder={step.placeholder || 'Enter location...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--brass)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--faded-rule)';
              }}
              style={{
                ...commonInputStyle,
                height: '48px',
                fontSize: '18px',
              }}
            />
            <button
              type="button"
              onClick={() => {
                if ('geolocation' in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setInputValue(`${pos.coords.latitude}, ${pos.coords.longitude}`);
                    },
                    () => {
                      setVoiceState((prev) => ({
                        ...prev,
                        error: 'Location not available. Check your browser permissions.',
                      }));
                    }
                  );
                }
              }}
              style={{
                padding: `${spacing[2]} ${spacing[3]}`,
                borderRadius: radii.md,
                border: `${borders.thin} ${colors.ink[300]}`,
                backgroundColor: colors.paper.white,
                color: colors.ink[600],
                fontFamily: fonts.body,
                fontSize: fontSizes.xs,
                cursor: 'pointer',
                transition: `background-color ${transitions.base}`,
              }}
            >
              📍 Use current location
            </button>
          </div>
        );

      case 'multi_select':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
            {(step.options || []).map((option) => (
              <label
                key={option}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  cursor: 'pointer',
                  padding: spacing[2],
                  borderRadius: radii.md,
                  transition: `background-color ${transitions.base}`,
                  backgroundColor: selectedOptions.includes(option) ? colors.ink[50] : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(option)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOptions([...selectedOptions, option]);
                    } else {
                      setSelectedOptions(selectedOptions.filter((o) => o !== option));
                    }
                  }}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: fontSizes.sm, color: colors.ink[900] }}>
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      case 'select':
        return (
          <select
            value={selectedOptions[0] || ''}
            onChange={(e) => setSelectedOptions([e.target.value])}
            style={{
              ...commonInputStyle,
              height: '40px',
            }}
          >
            <option value="">-- Select --</option>
            {(step.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'file_upload':
        return (
          <div
            style={{
              border: `2px dashed var(--faded-rule)`,
              borderRadius: radii.md,
              padding: spacing[6],
              textAlign: 'center',
              backgroundColor: colors.ink[50],
              cursor: 'pointer',
              transition: `all ${transitions.base}`,
            }}
          >
            <input
              type="file"
              multiple
              accept={step.accept}
              onChange={(e) => {
                if (e.target.files) {
                  setInputValue(`${e.target.files.length} file(s) selected`);
                }
              }}
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: fontSizes.lg, marginBottom: spacing[2] }}>
              📁
            </div>
            <div style={{ fontSize: fontSizes.sm, color: colors.ink[600] }}>
              Click to upload or drag and drop
            </div>
            {step.accept && (
              <div style={{ fontSize: fontSizes.xs, color: colors.ink[400], marginTop: spacing[2] }}>
                {step.accept}
              </div>
            )}
            {inputValue && (
              <div style={{ fontSize: fontSizes.xs, color: colors.status.success, marginTop: spacing[2] }}>
                {inputValue}
              </div>
            )}
          </div>
        );

      case 'template_chooser':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
            {(step.templates || []).map((template, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputValue(template.name);
                  handleStepSubmit('complete');
                }}
                style={{
                  padding: spacing[4],
                  border: `${borders.thin} ${colors.ink[200]}`,
                  borderRadius: radii.lg,
                  backgroundColor: selectedOptions.includes(template.name) ? colors.ink[50] : colors.paper.white,
                  cursor: 'pointer',
                  transition: `all ${transitions.base}`,
                  textAlign: 'left',
                }}
              >
                {template.icon && (
                  <div style={{ fontSize: '24px', marginBottom: spacing[2] }}>
                    {template.icon}
                  </div>
                )}
                <div
                  style={{
                    fontWeight: fontWeights.semibold,
                    color: colors.ink[900],
                    fontSize: fontSizes.sm,
                    marginBottom: spacing[1],
                  }}
                >
                  {template.name}
                </div>
                <div style={{ color: colors.ink[500], fontSize: fontSizes.xs }}>
                  {template.desc}
                </div>
              </button>
            ))}
          </div>
        );

      case 'checklist':
        const isPlaceOrdersStep = step.id === 's11-5';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            {(step.options || []).map((item) => (
              <label
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  cursor: 'pointer',
                  padding: spacing[2],
                  borderRadius: radii.md,
                  transition: `background-color ${transitions.base}`,
                  backgroundColor: checkedItems[item] ? colors.status.successLight : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={checkedItems[item] || false}
                  onChange={(e) => {
                    setCheckedItems({
                      ...checkedItems,
                      [item]: e.target.checked,
                    });
                  }}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: fontSizes.sm, color: colors.ink[900] }}>
                  {item}
                </span>
              </label>
            ))}

            {/* Peak moment: Place Orders CTA — Deep Orange, 64px height, scale-in */}
            {isPlaceOrdersStep && (
              <div style={{ marginTop: spacing[6], display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <button
                  type="button"
                  onClick={() => handleStepSubmit('complete')}
                  className="bkg-scale-in bkg-stagger-3"
                  style={{
                    width: '100%',
                    maxWidth: '480px',
                    height: '64px',
                    margin: '0 auto',
                    backgroundColor: 'var(--orange)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: radii.md,
                    fontFamily: fonts.body,
                    fontSize: fontSizes.lg,
                    fontWeight: fontWeights.bold,
                    cursor: 'pointer',
                    transition: `all ${transitions.base}`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                  }}
                >
                  Place Order
                </button>

                {/* Budget impact line in brass small-caps */}
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: fontSizes.xs,
                    fontWeight: fontWeights.semibold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--brass)',
                  }}
                >
                  Adds to rough-mechanical budget pool
                </div>
              </div>
            )}
          </div>
        );

      case 'analysis_result':
        const isAIEstimateStep = step.id === 's2-6';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
            {step.promptId && analysisInput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <label style={{ fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.ink[500] }}>
                  Input for analysis:
                </label>
                <div
                  style={{
                    padding: spacing[3],
                    backgroundColor: colors.ink[50],
                    borderRadius: radii.md,
                    fontSize: fontSizes.sm,
                    color: colors.ink[700],
                  }}
                >
                  {analysisInput}
                </div>
              </div>
            )}

            {/* Render analysis via renderAnalysis callback if provided (no exampleOutput display) */}
            {renderAnalysis && analysisInput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <label style={{ fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.ink[500] }}>
                  {step.analysisTitle}:
                </label>
                {isAIEstimateStep ? (
                  // Peak moment: AI Estimate reveal with engraved-plate treatment
                  <div
                    className="bkg-fade-up"
                    style={{
                      padding: spacing[6],
                      backgroundColor: colors.ink[50],
                      borderRadius: radii.md,
                      border: `1px solid ${colors.ink[100]}`,
                    }}
                  >
                    {/* Brass small-caps header */}
                    <div
                      style={{
                        fontSize: fontSizes.xs,
                        fontWeight: fontWeights.semibold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: 'var(--brass)',
                        marginBottom: spacing[4],
                      }}
                    >
                      Estimate · Confidence
                    </div>

                    {/* HUGE monospace total */}
                    <div
                      style={{
                        fontSize: '72px',
                        fontFamily: 'var(--font-archivo), monospace',
                        fontWeight: fontWeights.bold,
                        color: 'var(--graphite)',
                        marginBottom: spacing[4],
                        lineHeight: 1,
                      }}
                    >
                      $52k
                    </div>

                    {/* High confidence badge in Robin's Egg */}
                    <div
                      style={{
                        display: 'inline-block',
                        padding: `${spacing[1]} ${spacing[2]}`,
                        backgroundColor: 'var(--robin)',
                        color: '#FFFFFF',
                        fontSize: fontSizes.xs,
                        fontWeight: fontWeights.semibold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRadius: radii.sm,
                        marginBottom: spacing[4],
                      }}
                    >
                      High Confidence
                    </div>

                    {/* Category breakdown typographic list */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: spacing[3],
                        fontSize: fontSizes.sm,
                        color: colors.ink[700],
                      }}
                    >
                      <div>
                        <div style={{ color: colors.ink[500], marginBottom: spacing[1] }}>Framing</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '16px' }}>$8,500</div>
                      </div>
                      <div>
                        <div style={{ color: colors.ink[500], marginBottom: spacing[1] }}>Electrical</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '16px' }}>$5,400</div>
                      </div>
                      <div>
                        <div style={{ color: colors.ink[500], marginBottom: spacing[1] }}>Plumbing</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '16px' }}>$3,900</div>
                      </div>
                      <div>
                        <div style={{ color: colors.ink[500], marginBottom: spacing[1] }}>Finishes</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '16px' }}>$28,400</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  renderAnalysis(step, analysisInput)
                )}
              </div>
            ) : null}

            {/* Input field for analysis — natural language + voice */}
            <textarea
              placeholder="Describe the project in your own words, or paste plans/specs. Voice works too — tap 🎤."
              value={analysisInput}
              onChange={(e) => setAnalysisInput(e.target.value)}
              onFocus={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--brass)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'var(--faded-rule)';
              }}
              style={{
                ...commonInputStyle,
                minHeight: '100px',
                resize: 'vertical',
              }}
            />
            {/* Voice button — always visible on every textarea (Goal 6 / Goal 9) */}
            <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleVoiceToggle}
                title={
                  voiceAvailable
                    ? 'Click to record voice input'
                    : 'Voice not available in this browser'
                }
                aria-pressed={voiceState.isListening}
                aria-label={voiceState.isListening ? 'Stop voice input' : 'Start voice input'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  borderRadius: radii.full,
                  border: `${borders.thin} ${colors.ink[300]}`,
                  backgroundColor: voiceState.isListening
                    ? colors.status.warning
                    : colors.paper.white,
                  color: voiceState.isListening ? colors.paper.white : colors.ink[600],
                  cursor: voiceAvailable ? 'pointer' : 'not-allowed',
                  opacity: voiceAvailable ? 1 : 0.6,
                  transition: `all ${transitions.base}`,
                  fontSize: fontSizes.lg,
                }}
                disabled={!voiceAvailable}
              >
                🎤
              </button>
              <span style={{ fontSize: fontSizes.xs, color: colors.ink[500] }}>
                {voiceState.isListening
                  ? 'Listening… tap again to stop.'
                  : voiceState.transcript
                    ? 'Ready to apply transcript.'
                    : voiceAvailable
                      ? 'Speak instead of typing — your words go in the box above.'
                      : 'Voice not supported here — type instead.'}
              </span>
              {voiceState.transcript && (
                <button
                  type="button"
                  onClick={handleApplyVoiceTranscript}
                  style={{
                    padding: `${spacing[2]} ${spacing[3]}`,
                    borderRadius: radii.md,
                    border: 'none',
                    backgroundColor: colors.cyan.main,
                    color: colors.paper.white,
                    fontFamily: fonts.body,
                    fontSize: fontSizes.sm,
                    fontWeight: fontWeights.semibold,
                    cursor: 'pointer',
                    transition: `background-color ${transitions.base}`,
                    marginLeft: 'auto',
                  }}
                >
                  Apply transcript
                </button>
              )}
            </div>
            {voiceState.error && (
              <div style={{ color: colors.status.error, fontSize: fontSizes.xs }}>
                {voiceState.error}
              </div>
            )}
          </div>
        );

      default:
        return <div style={{ color: colors.ink[400], fontSize: fontSizes.sm }}>Unknown step type</div>;
    }
  };

  // Collapsed header
  const statusColor = STATUS_COLORS[status];
  const statusLabel =
    status === 'in_progress'
      ? 'In Progress'
      : status === 'complete'
        ? 'Done'
        : 'Not Started';

  // Hero treatment: step code and peak moment detection
  const stepCode = step.id ? `${step.id.split('-').pop()}` : `${stepNumber}`;
  const isPeakStep = PEAK_STEP_IDS.has(step.id);

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    cursor: 'pointer',
    userSelect: 'none',
    transition: `background-color ${transitions.base}`,
  };

  // Machine-legible data (Goal 8)
  const machineData = {
    type: 'step_card',
    id: step.id,
    label: step.label,
    stepType: step.type,
    status,
    promptId: step.promptId,
    stepNumber,
    totalSteps,
  };

  return (
    <div
      style={{
        border: `${borders.thin} ${colors.ink[200]}`,
        borderRadius: radii.lg,
        backgroundColor: colors.paper.white,
        boxShadow: shadows.sm,
        overflow: 'hidden',
        transition: `all ${transitions.base}`,
      }}
    >
      {/* Collapsed header */}
      <div
        onClick={handleToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleExpand();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${step.label}, step ${stepNumber} of ${totalSteps}, status: ${statusLabel}`}
        style={{
          ...headerStyle,
          backgroundColor: isExpanded ? colors.ink[50] : 'transparent',
        }}
      >
        {/* Step number */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: radii.full,
            backgroundColor: statusColor,
            color: colors.paper.white,
            fontWeight: fontWeights.bold,
            fontSize: fontSizes.sm,
            flexShrink: 0,
          }}
        >
          {stepNumber}
        </div>

        {/* Status indicator */}
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: radii.full,
            backgroundColor: statusColor,
            opacity: 0.6,
          }}
        />

        {/* Label — de-assert completion claims if not actually complete */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: 0,
              fontSize: fontSizes.sm,
              fontWeight: fontWeights.semibold,
              // Neutral color if pending/in_progress, full color if complete
              color:
                status === 'pending' || status === 'in_progress' ? colors.ink[600] : colors.ink[900],
            }}
          >
            {step.label}
          </h3>
        </div>

        {/* XP tally (if provided) */}
        {xpReward > 0 && (
          <div
            style={{
              fontSize: fontSizes.xs,
              fontWeight: fontWeights.semibold,
              color: colors.ink[500],
              paddingRight: spacing[2],
            }}
          >
            +{xpReward} XP
          </div>
        )}

        {/* Chevron */}
        <span
          style={{
            fontSize: fontSizes.lg,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: `transform ${transitions.base}`,
          }}
        >
          ▼
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div
          className="bkg-fade-up"
          style={{
            padding: spacing[4],
            borderTop: `${borders.thin} ${colors.ink[100]}`,
            backgroundColor: colors.paper.cream,
          }}
        >
          {/* Hero treatment: step code and label */}
          <div style={{ marginBottom: spacing[6] }}>
            <div
              style={{
                fontSize: fontSizes.xs,
                fontWeight: fontWeights.semibold,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--brass)',
                marginBottom: spacing[2],
              }}
            >
              {stepCode}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: fontWeights.bold,
                color: 'var(--graphite)',
                lineHeight: 1.2,
                marginBottom: spacing[3],
              }}
            >
              {step.label}
            </h2>
            {isPeakStep && (
              <p
                style={{
                  margin: 0,
                  fontSize: fontSizes.sm,
                  color: colors.ink[600],
                  lineHeight: 1.6,
                }}
              >
                {step.id === 's11-5'
                  ? 'Review and confirm your material orders below.'
                  : step.id === 's2-6'
                    ? 'AI-powered takeoff and rough total estimation.'
                    : ''}
              </p>
            )}
          </div>

          {/* Step input */}
          <div style={{ marginBottom: spacing[4] }}>
            {renderStepInput()}
          </div>

          {/* Action buttons — only show if not peak moment (peak moments have custom buttons) */}
          {!isPeakStep && (
            <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end', marginTop: spacing[4] }}>
              {/* Skip button (Goal 5: skip-and-return) — ghost style */}
              <button
                type="button"
                onClick={() => handleStepSubmit('skip')}
                style={{
                  padding: `${spacing[2]} ${spacing[3]}`,
                  borderRadius: radii.md,
                  border: `1px solid var(--faded-rule)`,
                  backgroundColor: 'transparent',
                  color: 'var(--graphite)',
                  fontFamily: fonts.body,
                  fontSize: fontSizes.sm,
                  fontWeight: fontWeights.semibold,
                  cursor: 'pointer',
                  transition: `all ${transitions.base}`,
                }}
              >
                I'll do this later
              </button>

              {/* Primary action */}
              <button
                type="button"
                onClick={() => handleStepSubmit('complete')}
                style={{
                  padding: `${spacing[2]} ${spacing[3]}`,
                  borderRadius: radii.md,
                  border: 'none',
                  backgroundColor:
                    status === 'complete'
                      ? colors.status.success
                      : status === 'in_progress'
                        ? colors.phase.dream
                        : colors.cyan.main,
                  color: colors.paper.white,
                  fontFamily: fonts.body,
                  fontSize: fontSizes.sm,
                  fontWeight: fontWeights.semibold,
                  cursor: 'pointer',
                  transition: `all ${transitions.base}`,
                }}
              >
                {status === 'complete' ? 'Done' : ctaLabel}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Machine-legible data (Goal 8) */}
      <script
        type="application/json"
        data-bkg-step={step.id}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(machineData) }}
      />
    </div>
  );
}
