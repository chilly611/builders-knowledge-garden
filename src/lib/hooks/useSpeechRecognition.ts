'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type VoiceNavError = 'no-match' | 'permission-denied' | 'not-supported' | 'no-speech';

interface UseSpeechRecognitionReturn {
  supported: boolean;
  listening: boolean;
  transcript: string;
  interimTranscript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  error: VoiceNavError | null;
  /** @deprecated use `supported` */
  isSupported: boolean;
  /** @deprecated use `listening` */
  isListening: boolean;
  /** @deprecated use `start` */
  startListening: () => void;
  /** @deprecated use `stop` */
  stopListening: () => void;
}

/**
 * useSpeechRecognition Hook
 * ========================
 * Manages Web Speech API with silence timeout, interim results, and error handling.
 *
 * Returns:
 * - supported: boolean indicating API availability
 * - listening: true while recording
 * - transcript: final transcript
 * - interimTranscript: interim (not yet final) results
 * - start(): start listening
 * - stop(): stop listening
 * - reset(): clear all state
 * - error: VoiceNavError or null
 *
 * Silence timeout: stops listening after 8s of no speech.
 */
export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<VoiceNavError | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize SpeechRecognition on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    setSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Start handler
    recognition.onstart = () => {
      setListening(true);
      setError(null);
      setTranscript('');
      setInterimTranscript('');

      // Reset silence timeout on start
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      silenceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setListening(false);
        setError('no-speech');
      }, 8000);
    };

    // Result handler: process interim and final results separately
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const alt = event.results[i][0];
        if (event.results[i].isFinal) {
          final += alt.transcript + ' ';
        } else {
          interim += alt.transcript;
        }
      }

      if (final) {
        // Clear silence timeout on final result
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        setTranscript(final);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    // Error handler
    recognition.onerror = (event: any) => {
      setListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      if (event.error === 'permission-denied' || event.error === 'network') {
        setError('permission-denied');
      } else if (event.error === 'no-speech') {
        setError('no-speech');
      } else {
        setError('no-match');
      }
    };

    // End handler
    recognition.onend = () => {
      setListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  const start = useCallback(() => {
    if (recognitionRef.current && supported && !listening) {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      recognitionRef.current.start();
    }
  }, [supported, listening]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setListening(false);
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
  }, []);

  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    start,
    stop,
    reset,
    error,
    // Deprecated aliases — preserved so pre-W9.D consumers (dream/page, dream/components/DiscoverFlow)
    // don't break. New code should use the non-aliased names.
    isSupported: supported,
    isListening: listening,
    startListening: start,
    stopListening: stop,
  };
}
