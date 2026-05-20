'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  in_progress: colors.orange, // Decision #12: Deep Orange (canonical: #D9642E)
  complete: colors.robin,      // Decision #12: Robin's Egg (canonical: #7FCFCB)
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
  initialPayload,
}: StepCardProps) {
  // State management.
  // Project Spine v1: initialPayload seeds inputs on mount when the
  // workflow is rehydrating from saved JSONB. Default empty for the
  // ~17 existing callers that don't pass the prop.
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [voiceState, setVoiceState] = useState<VoiceState>({ isListening: false, transcript: '', error: null });
  const [inputValue, setInputValue] = useState(initialPayload?.value ?? '');
  const [selectedOptions, setSelectedOptions] = useState<string[]>(initialPayload?.selected ?? []);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(initialPayload?.checked ?? {});
  const [analysisInput, setAnalysisInput] = useState(initialPayload?.input ?? '');
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  // 2026-05-19 dogfood: manual-fill mode for analysis_result steps. When
  // turned on, the user writes their own answer in place of the AI
  // specialist call. Initial value comes from initialPayload.value (which
  // is how a previously-saved manual answer gets re-hydrated).
  const [manualMode, setManualMode] = useState<boolean>(
    !!initialPayload?.value && step.type === 'analysis_result'
  );
  const [manualAnswer, setManualAnswer] = useState<string>(initialPayload?.value ?? '');

  // Project Spine v1 — late-arriving initialPayload sync.
  // Hydration is async; useState's initializer captures empty values on
  // first render. When the hydrated values land later, adopt them ONLY
  // if the field is still empty so we never clobber active typing.
  useEffect(() => {
    if (!initialPayload) return;
    if (typeof initialPayload.value === 'string' && !inputValue) {
      setInputValue(initialPayload.value);
    }
    if (typeof initialPayload.input === 'string' && !analysisInput) {
      setAnalysisInput(initialPayload.input);
    }
    if (Array.isArray(initialPayload.selected) && selectedOptions.length === 0) {
      setSelectedOptions(initialPayload.selected);
    }
    if (
      initialPayload.checked &&
      typeof initialPayload.checked === 'object' &&
      Object.keys(checkedItems).length === 0
    ) {
      setCheckedItems(initialPayload.checked);
    }
    // 2026-05-19 dogfood: hydrate manual-fill answer for analysis_result.
    if (
      step.type === 'analysis_result' &&
      typeof initialPayload.value === 'string' &&
      initialPayload.value &&
      !manualAnswer
    ) {
      setManualAnswer(initialPayload.value);
      setManualMode(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPayload]);

  // ── Draft auto-persist (2026-05-19, dogfood fix) ────────────────────────
  // Why: prior behavior only emitted onAction on explicit Save/Skip/Complete
  // clicks. A user who typed and then navigated to another workflow lost
  // their input. Now we emit `step_saved` on a 400ms debounce whenever the
  // local input state changes, AND once more on unmount. Persistence layer
  // is unchanged — same payload shape, same column, downstream consumers
  // (status map, parsers) read identically.
  //
  // `lastPersistedSigRef` holds the JSON signature of the last emitted
  // payload so we don't re-emit unchanged values (e.g. hydrate echoes or
  // re-renders that don't actually change anything).
  const lastPersistedSigRef = useRef<string>(
    JSON.stringify(initialPayload ?? {})
  );

  const buildDraftPayload = useCallback((): {
    value?: string;
    selected?: string[];
    checked?: Record<string, boolean>;
    input?: string;
  } => {
    switch (step.type) {
      case 'text_input':
      case 'voice_input':
      case 'number_input':
      case 'location_input':
      case 'file_upload':
        return { value: inputValue };
      case 'multi_select':
      case 'select':
      case 'template_chooser':
        return { selected: selectedOptions };
      case 'checklist':
        return { checked: checkedItems };
      case 'analysis_result': {
        // Manual-fill: when the user wrote their own answer, persist BOTH
        // input (scope to AI) and value (their narrative). Downstream
        // consumers can prefer payload.value when set, fall back to AI.
        const p: { value?: string; input?: string } = {};
        if (analysisInput) p.input = analysisInput;
        if (manualMode && manualAnswer) p.value = manualAnswer;
        return p;
      }
      default:
        return {};
    }
  }, [step.type, inputValue, selectedOptions, checkedItems, analysisInput, manualMode, manualAnswer]);

  const isPayloadEmpty = (p: {
    value?: string;
    selected?: string[];
    checked?: Record<string, boolean>;
    input?: string;
  }) =>
    !p.value &&
    !p.input &&
    (!p.selected || p.selected.length === 0) &&
    (!p.checked || Object.keys(p.checked).length === 0);

  const persistDraft = useCallback(() => {
    if (!onAction) return;
    const payload = buildDraftPayload();
    if (isPayloadEmpty(payload)) return;
    const sig = JSON.stringify(payload);
    if (sig === lastPersistedSigRef.current) return;
    lastPersistedSigRef.current = sig;
    onAction({
      type: 'step_saved',
      stepId: step.id,
      payload,
      timestamp: Date.now(),
    });
  }, [onAction, buildDraftPayload, step.id]);

  // Debounced auto-persist on local-state change. Only fires once expanded
  // so we don't echo the hydrate before the user has interacted.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isExpanded) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(persistDraft, 400);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [inputValue, selectedOptions, checkedItems, analysisInput, manualAnswer, manualMode, isExpanded, persistDraft]);

  // Final flush on unmount — preserves whatever was typed if the user
  // navigates away mid-debounce.
  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistDraft();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const payload: {
      value?: string;
      selected?: string[];
      checked?: Record<string, boolean>;
      input?: string;
    } =
      step.type === 'text_input' || step.type === 'voice_input' || step.type === 'location_input'
        ? { value: inputValue }
        : step.type === 'number_input'
          ? { value: inputValue }
          : step.type === 'multi_select' || step.type === 'select'
            ? { selected: selectedOptions }
            : step.type === 'checklist'
              ? { checked: checkedItems }
              : step.type === 'analysis_result'
                ? (manualMode && manualAnswer
                    ? { input: analysisInput, value: manualAnswer }
                    : { input: analysisInput })
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
      lastPersistedSigRef.current = JSON.stringify(payload);
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
                title={voiceAvailable ? 'Tap to talk — we\'ll transcribe' : 'Voice not available in this browser'}
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
                title={voiceAvailable ? 'Tap to talk — we\'ll transcribe' : 'Voice not available in this browser'}
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
              Drag your file here — or tap to pick one
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

            {/* 2026-05-19 dogfood: manual-fill toggle. Lets the user write
                the answer themselves (e.g. when AI is rate-limited, or for
                demoing a slice without burning specialist calls). Persists
                to payload.value via the auto-persist effect. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                fontSize: fontSizes.xs,
              }}
            >
              <button
                type="button"
                onClick={() => setManualMode((m) => !m)}
                style={{
                  padding: `${spacing[1]} ${spacing[2]}`,
                  borderRadius: radii.sm,
                  border: `${borders.thin} ${colors.ink[300]}`,
                  backgroundColor: manualMode ? colors.ink[50] : colors.paper.white,
                  color: colors.ink[700],
                  fontFamily: fonts.body,
                  fontSize: fontSizes.xs,
                  cursor: 'pointer',
                }}
                aria-pressed={manualMode}
              >
                {manualMode ? '↩ Use the specialist instead' : '✏️ Write the answer yourself'}
              </button>
              <span style={{ color: colors.ink[500] }}>
                {manualMode
                  ? 'Manual mode — your text is saved as the answer for this step.'
                  : 'Skip the AI call and fill this in by hand.'}
              </span>
            </div>

            {manualMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <label style={{ fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.ink[500] }}>
                  {step.analysisTitle ?? 'Your answer'} (manual):
                </label>
                <textarea
                  placeholder="Write the answer in your own words. Auto-saves as you go."
                  value={manualAnswer}
                  onChange={(e) => setManualAnswer(e.target.value)}
                  style={{
                    ...commonInputStyle,
                    minHeight: '160px',
                    resize: 'vertical',
                  }}
                />
                <div style={{ fontSize: fontSizes.xs, color: colors.ink[500] }}>
                  Saved to the project — every other workflow can read this.
                </div>
              </div>
            ) : (
              /* Render analysis via renderAnalysis callback if provided (no exampleOutput display) */
              renderAnalysis && analysisInput ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                  <label style={{ fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.ink[500] }}>
                    {step.analysisTitle}:
                  </label>
                  {renderAnalysis(step, analysisInput)}
                </div>
              ) : null
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
          {/* Hero treatment: step label */}
          <div style={{ marginBottom: spacing[6] }}>
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
