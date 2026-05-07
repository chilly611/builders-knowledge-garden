'use client';

import React, { useState, useEffect, useRef } from 'react';
import { colors, fonts, fontSizes, fontWeights, spacing, borders, radii, shadows, transitions, zIndex } from '../tokens';
import { useSpeechRecognition } from '../../lib/hooks/useSpeechRecognition';
import { matchCommand, COMMANDS } from '../../lib/voice-commands';
import type { NavigationIntent, VoiceNavError } from '../../lib/voice-commands';

export interface VoiceCommandNavProps {
  onNavigate: (intent: NavigationIntent) => void;
  onError?: (error: VoiceNavError) => void;
  disabled?: boolean;
}

/**
 * VoiceCommandNav Component
 * =========================
 * Mobile-first floating action button for voice-controlled navigation.
 * Feature-flagged via NEXT_PUBLIC_VOICE_NAV.
 *
 * Renders:
 * - null if flag is disabled
 * - null if SpeechRecognition API not available
 * - Mic FAB at bottom-left (bottom: 24px, left: 24px, z-index: 9996)
 * - Transcript pill above FAB during recording
 * - "I didn't catch that" toast on no-match (8s silence)
 * - Respects prefers-reduced-motion: reduce
 *
 * On intent match:
 * - Calls onNavigate(intent)
 * - Closes overlay
 * - Stops recognition
 */
export default function VoiceCommandNav({
  onNavigate,
  onError,
  disabled = false,
}: VoiceCommandNavProps) {
  // Hooks must run on every render — keep above any early returns.
  // Hook manages SpeechRecognition lifecycle
  const {
    supported,
    listening,
    transcript,
    interimTranscript,
    start,
    stop,
    reset,
    error,
  } = useSpeechRecognition();

  // UI state
  const [showTranscriptPill, setShowTranscriptPill] = useState(false);
  const [showNoMatchToast, setShowNoMatchToast] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle listening state change
  useEffect(() => {
    setShowTranscriptPill(listening);
  }, [listening]);

  // Handle error (no-speech after 8s)
  useEffect(() => {
    if (error === 'no-speech') {
      setShowNoMatchToast(true);
      if (onError) {
        onError('no-speech');
      }

      // Clear toast after 3s
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => {
        setShowNoMatchToast(false);
      }, 3000);

      reset();
    }
  }, [error, onError, reset]);

  // Handle final transcript matching
  useEffect(() => {
    if (transcript && !listening) {
      const intent = matchCommand(transcript);

      if (intent) {
        // Match found
        onNavigate(intent);
        stop();
        reset();
        setShowTranscriptPill(false);
      } else {
        // No match
        setShowNoMatchToast(true);
        if (onError) {
          onError('no-match');
        }

        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
          setShowNoMatchToast(false);
        }, 3000);

        reset();
      }
    }
  }, [transcript, listening, onNavigate, onError, stop, reset]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Check feature flag
  const flagEnabled = process.env.NEXT_PUBLIC_VOICE_NAV === 'enabled';
  if (!flagEnabled) {
    return null;
  }

  // Don't render if API not supported
  if (!supported) {
    return null;
  }

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  // Handle mic button tap
  const handleMicTap = () => {
    if (disabled) return;

    if (listening) {
      stop();
      setShowTranscriptPill(false);
    } else {
      reset();
      start();
    }
  };

  // Render transcript pill
  const displayTranscript = transcript || interimTranscript;

  return (
    <>
      {/* Transcript pill (above FAB, during listening) */}
      {showTranscriptPill && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            left: spacing[6],
            backgroundColor: colors.ink[900],
            color: colors.paper.white,
            padding: `${spacing[2]} ${spacing[3]}`,
            borderRadius: radii.full,
            fontSize: fontSizes.sm,
            fontFamily: fonts.body,
            maxWidth: '200px',
            wordBreak: 'break-word',
            boxShadow: shadows.md,
            zIndex: 9997,
            animation: !prefersReducedMotion
              ? `fadeIn ${transitions.base} ease-out`
              : 'none',
            opacity: displayTranscript ? 1 : 0.6,
          }}
        >
          {displayTranscript || 'Listening…'}
        </div>
      )}

      {/* No-match toast */}
      {showNoMatchToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            left: spacing[6],
            backgroundColor: colors.status.error,
            color: colors.paper.white,
            padding: `${spacing[2]} ${spacing[3]}`,
            borderRadius: radii.full,
            fontSize: fontSizes.sm,
            fontFamily: fonts.body,
            maxWidth: '200px',
            boxShadow: shadows.md,
            zIndex: 9997,
            animation: !prefersReducedMotion
              ? `fadeIn ${transitions.base} ease-out`
              : 'none',
          }}
        >
          I didn't catch that. Try again.
        </div>
      )}

      {/* Mic FAB */}
      <button
        type="button"
        onClick={handleMicTap}
        disabled={disabled}
        aria-label={listening ? 'Stop voice input' : 'Start voice input'}
        aria-pressed={listening}
        title="Voice navigation: tap to speak"
        style={{
          position: 'fixed',
          bottom: spacing[6],
          left: spacing[6],
          width: '56px',
          height: '56px',
          borderRadius: radii.full,
          border: 'none',
          backgroundColor: listening ? colors.status.warning : colors.orange,
          color: colors.paper.white,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: shadows.lg,
          transition: `all ${transitions.base}`,
          zIndex: 9996,
          opacity: disabled ? 0.6 : 1,
          transform: listening && !prefersReducedMotion ? 'scale(1.05)' : 'scale(1)',
          animation:
            listening && !prefersReducedMotion
              ? `pulse-voice 1.5s ease-in-out infinite`
              : 'none',
        }}
      >
        🎤
      </button>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-voice {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(217, 100, 46, 0.7);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(217, 100, 46, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes pulse-voice {
            0%, 100% {
              box-shadow: none;
            }
          }
        }
      `}</style>
    </>
  );
}
