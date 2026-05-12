'use client';

// VoiceCaptureFAB — Brief 1
// Big round button (72px). Hold-to-talk pattern. Uses the existing
// useSpeechRecognition hook. On release: calls recordContact({source:'voice'}).
// Visual states: idle (brass), listening (pulse), processing, success (robin's
// egg), error. Spacebar-hold on focus for keyboard a11y.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import { recordContact, type ContactWriteOkResult } from '@/lib/crm-spine';

type FabState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

interface VoiceCaptureFABProps {
  projectId: string;
  onSuccess: (result: ContactWriteOkResult, transcript: string) => void;
  onError: (reason: string, detail?: string) => void;
}

const BRASS = '#B6873A';
const ROBIN = '#81D8D0';
const INK = '#1A1A1A';
const PAPER = '#FFFDF7';
const RED = '#E8443A';

export default function VoiceCaptureFAB({
  projectId,
  onSuccess,
  onError,
}: VoiceCaptureFABProps) {
  const { supported, listening, transcript, interimTranscript, start, stop, error, reset } =
    useSpeechRecognition();
  const [fabState, setFabState] = useState<FabState>('idle');
  const submittingRef = useRef<boolean>(false);

  // When listening flips off + we have a final transcript, submit.
  useEffect(() => {
    if (!listening && transcript && transcript.trim().length > 0 && !submittingRef.current) {
      submittingRef.current = true;
      setFabState('processing');
      void (async () => {
        try {
          const result = await recordContact({
            source: 'voice',
            transcript: transcript.trim(),
            projectId,
          });
          if (result.ok) {
            setFabState('success');
            onSuccess(result, transcript.trim());
            window.setTimeout(() => {
              setFabState('idle');
              reset();
            }, 1500);
          } else {
            setFabState('error');
            onError(result.reason, result.detail);
            window.setTimeout(() => {
              setFabState('idle');
              reset();
            }, 2500);
          }
        } finally {
          submittingRef.current = false;
        }
      })();
    }
  }, [listening, transcript, projectId, onSuccess, onError, reset]);

  // Surface hook errors.
  useEffect(() => {
    if (error) {
      setFabState('error');
      onError(`voice-${error}`);
      window.setTimeout(() => setFabState('idle'), 2000);
    }
  }, [error, onError]);

  // ─── Press handlers ─────────────────────────────────────────────────

  const handlePressStart = useCallback(() => {
    if (!supported) {
      onError('voice-not-supported');
      return;
    }
    if (fabState !== 'idle' && fabState !== 'listening') return;
    setFabState('listening');
    start();
  }, [supported, fabState, start, onError]);

  const handlePressEnd = useCallback(() => {
    if (listening) {
      stop();
    }
  }, [listening, stop]);

  // Keyboard a11y: Spacebar held on focus = press.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        handlePressStart();
      }
    },
    [handlePressStart]
  );
  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === ' ') {
        e.preventDefault();
        handlePressEnd();
      }
    },
    [handlePressEnd]
  );

  // ─── Visuals ────────────────────────────────────────────────────────

  const bg =
    fabState === 'listening'
      ? RED
      : fabState === 'success'
        ? ROBIN
        : fabState === 'error'
          ? RED
          : BRASS;
  const label =
    fabState === 'listening'
      ? 'Listening… release to save'
      : fabState === 'processing'
        ? 'Saving…'
        : fabState === 'success'
          ? 'Saved'
          : fabState === 'error'
            ? 'Try again'
            : 'Hold to talk';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      {(listening || transcript) && (
        <div
          style={{
            background: PAPER,
            color: INK,
            border: `1px solid ${BRASS}`,
            borderRadius: 12,
            padding: '8px 12px',
            fontSize: 13,
            maxWidth: 280,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          {transcript || interimTranscript || '...'}
        </div>
      )}
      <button
        type="button"
        aria-label={label}
        aria-pressed={fabState === 'listening'}
        disabled={!supported || fabState === 'processing'}
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerCancel={handlePressEnd}
        onPointerLeave={handlePressEnd}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: bg,
          color: PAPER,
          border: 'none',
          cursor: supported ? 'pointer' : 'not-allowed',
          fontSize: 30,
          boxShadow:
            fabState === 'listening'
              ? `0 0 0 8px rgba(232, 68, 58, 0.25), 0 6px 22px rgba(0,0,0,0.25)`
              : '0 6px 22px rgba(0,0,0,0.25)',
          animation: fabState === 'listening' ? 'bkg-fab-pulse 1.4s ease-in-out infinite' : undefined,
          transition: 'background 200ms ease',
        }}
      >
        {fabState === 'success' ? 'OK' : 'MIC'}
      </button>
      <span
        style={{
          fontSize: 11,
          color: INK,
          background: PAPER,
          padding: '2px 8px',
          borderRadius: 999,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <style jsx>{`
        @keyframes bkg-fab-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
