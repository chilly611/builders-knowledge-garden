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
  complete: '#14B8A6',     // Decision #12: teal
} as const;

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
        transcript: prev.transcript + final + interim,
      }));
    };

    recognition.onerror = () => {
      setVoiceState((prev) => ({
        ...prev,
        error: 'Voice recognition error. Please try again.',
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

  // Apply voice transcript to textarea
  const handleApplyVoiceTranscript = () => {
    if (textareaRef.current) {
      textareaRef.current.value = voiceState.transcript;
      setInputValue(voiceState.transcript);
      setVoiceState({ isListening: false, transcript: '', error: null });
    }
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
              placeholder={step.placeholder || 'Enter text here...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
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
              placeholder={step.placeholder || 'Record or type voice input...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
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
              style={{
                ...commonInputStyle,
                height: '40px',
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
              style={{
                ...commonInputStyle,
                height: '40px',
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
                        error: 'Could not get location. Please enable permissions.',
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
              border: `${borders.thin} dashed ${colors.ink[300]}`,
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

            {/* Render analysis via renderAnalysis callback if provided */}
            {renderAnalysis && analysisInput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <label style={{ fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.ink[500] }}>
                  {step.analysisTitle}:
                </label>
                {renderAnalysis(step, analysisInput)}
              </div>
            ) : (
              <div
                style={{
                  padding: spacing[4],
                  backgroundColor: colors.ink[50],
                  borderRadius: radii.md,
                  border: `${borders.thin} ${colors.ink[200]}`,
                  opacity: 0.7,
                }}
              >
                <div
                  style={{
                    fontSize: fontSizes.xs,
                    color: colors.ink[500],
                    marginBottom: spacing[2],
                  }}
                >
                  Demo output:
                </div>
                <div
                  style={{
                    fontSize: fontSizes.sm,
                    color: colors.ink[700],
                    lineHeight: '1.5',
                    marginBottom: spacing[3],
                  }}
                >
                  {step.exampleOutput}
                </div>
                <div
                  style={{
                    fontSize: fontSizes.xs,
                    backgroundColor: colors.amber.glow,
                    color: colors.ink[900],
                    padding: `${spacing[2]} ${spacing[3]}`,
                    borderRadius: radii.sm,
                  }}
                >
                  This is example output — connect a specialist to see real analysis
                </div>
              </div>
            )}

            {/* Input field for analysis */}
            <textarea
              placeholder="Paste or describe the input for analysis..."
              value={analysisInput}
              onChange={(e) => setAnalysisInput(e.target.value)}
              style={{
                ...commonInputStyle,
                minHeight: '100px',
                resize: 'vertical',
              }}
            />
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
        ? 'Complete'
        : 'Not Started';

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

        {/* Label */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: 0,
              fontSize: fontSizes.sm,
              fontWeight: fontWeights.semibold,
              color: colors.ink[900],
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
          style={{
            padding: spacing[4],
            borderTop: `${borders.thin} ${colors.ink[100]}`,
            backgroundColor: colors.paper.cream,
          }}
        >
          {/* Step input */}
          <div style={{ marginBottom: spacing[4] }}>
            {renderStepInput()}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end', marginTop: spacing[4] }}>
            {/* Skip button (Goal 5: skip-and-return) */}
            <button
              type="button"
              onClick={() => handleStepSubmit('skip')}
              style={{
                padding: `${spacing[2]} ${spacing[3]}`,
                borderRadius: radii.md,
                border: `${borders.thin} ${colors.ink[300]}`,
                backgroundColor: colors.paper.white,
                color: colors.ink[600],
                fontFamily: fonts.body,
                fontSize: fontSizes.sm,
                fontWeight: fontWeights.semibold,
                cursor: 'pointer',
                transition: `all ${transitions.base}`,
              }}
            >
              Not now
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
              {status === 'complete' ? 'Done' : 'Continue'}
            </button>
          </div>
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
