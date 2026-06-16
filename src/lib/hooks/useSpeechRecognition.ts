'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type VoiceNavError = 'no-match' | 'permission-denied' | 'not-supported' | 'no-speech';

export interface UseSpeechRecognitionOptions {
  /** Keep listening across natural pauses instead of stopping at the first one. Default false. */
  continuous?: boolean;
  /** Surface in-progress (not-yet-final) words. Default true. */
  interimResults?: boolean;
  /**
   * Restart automatically when the engine fires `onend` (Chrome caps a session
   * at ~60s and also ends on long pauses), until the user calls `stop()` or a
   * fatal mic/permission error occurs. Default false. Pair with `continuous`.
   */
  autoRestart?: boolean;
  /**
   * Auto-stop after this many ms with no finalized result (the legacy "8s
   * silence" behavior). `null` disables the timer entirely. Default 8000.
   */
  silenceTimeoutMs?: number | null;
  /**
   * Accumulate every finalized segment into `transcript` VERBATIM across the
   * whole session (and across auto-restarts), and expose each segment in
   * `rawPhrases`. Default false, which keeps the legacy "last final wins"
   * semantics. Set true for dictation/capture so long input isn't boiled down
   * to the final fragment.
   */
  accumulate?: boolean;
  lang?: string;
}

interface UseSpeechRecognitionReturn {
  supported: boolean;
  listening: boolean;
  /** Finalized transcript. With `accumulate`, this is the full verbatim session text. */
  transcript: string;
  /** Current in-progress (not-yet-final) words. */
  interimTranscript: string;
  /** `transcript` + `interimTranscript` — the full LIVE text to render while speaking. */
  liveTranscript: string;
  /** Each finalized segment, verbatim, in order (only populated when `accumulate`). */
  rawPhrases: string[];
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
 * Web Speech API wrapper. Defaults preserve the original single-shot behavior
 * (continuous=false, interim on, 8s silence stop, last-final-wins) so the eight
 * existing call sites are unaffected — in particular VoiceCommandNav and
 * VoiceCaptureFAB, which rely on the silence timeout flipping `listening` off to
 * fire their command-match / submit logic.
 *
 * The cockpit CaptureZone opts into proper dictation behavior, which fixes the
 * 2026-06-15 redline ("voice cuts users off + boils language to bare bones"):
 *
 *   useSpeechRecognition({ continuous: true, autoRestart: true,
 *                          silenceTimeoutMs: null, accumulate: true })
 *
 *   - continuous + silenceTimeoutMs:null → never auto-stops at a pause;
 *   - autoRestart → restarts on Chrome's ~60s `onend` until the user stops;
 *   - accumulate → `transcript`/`rawPhrases` keep the user's words VERBATIM,
 *     and `liveTranscript` renders them live as they speak. Nothing here ever
 *     rewrites the user's words — any summarizing happens downstream.
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    continuous = false,
    interimResults = true,
    autoRestart = false,
    silenceTimeoutMs = 8000,
    accumulate = false,
    lang = 'en-US',
  } = options;

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [rawPhrases, setRawPhrases] = useState<string[]>([]);
  const [error, setError] = useState<VoiceNavError | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalRef = useRef('');
  const rawPhrasesRef = useRef<string[]>([]);
  const userStoppedRef = useRef(false);
  const fatalRef = useRef(false);
  const runningRef = useRef(false);

  // Initialize SpeechRecognition once. Deps are value-stable primitives, so a
  // caller passing an inline options object doesn't churn this effect.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    // Mount-time browser-capability probe — SSR has no window, so this can't run
    // during render; a setState in this effect is the correct, SSR-safe pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(Boolean(Ctor));
    if (!Ctor) return;

    const clearSilence = () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    };
    const armSilence = () => {
      if (silenceTimeoutMs == null) return;
      clearSilence();
      silenceTimeoutRef.current = setTimeout(() => {
        // A silence stop IS a stop — don't let autoRestart fight it.
        userStoppedRef.current = true;
        try {
          recognitionRef.current?.stop();
        } catch {
          /* not running */
        }
        setListening(false);
        setError('no-speech');
      }, silenceTimeoutMs);
    };

    const recognition = new Ctor();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onstart = () => {
      runningRef.current = true;
      setListening(true);
      setError(null);
      armSilence();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalsThisEvent = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result?.[0]?.transcript ?? '';
        if (result?.isFinal) {
          if (accumulate) {
            const phrase = text.trim();
            if (phrase) {
              rawPhrasesRef.current = [...rawPhrasesRef.current, phrase];
              finalRef.current = finalRef.current ? `${finalRef.current} ${phrase}` : phrase;
            }
          } else {
            finalsThisEvent += text + ' ';
          }
        } else {
          interim += text;
        }
      }

      if (accumulate) {
        // Verbatim: never overwrite earlier finals, keep raw phrases alongside.
        setTranscript(finalRef.current);
        setRawPhrases(rawPhrasesRef.current);
        setInterimTranscript(interim);
      } else if (finalsThisEvent) {
        // Legacy single-shot: a final result ends the listen + clears silence.
        clearSilence();
        setTranscript(finalsThisEvent);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: Event) => {
      const code = (event as { error?: string }).error;
      // Permission / hardware failures are fatal — never auto-restart (that
      // would re-trigger the permission prompt forever).
      if (code === 'not-allowed' || code === 'permission-denied' || code === 'service-not-allowed') {
        fatalRef.current = true;
        userStoppedRef.current = true;
        setError('permission-denied');
        setListening(false);
      } else if (code === 'audio-capture') {
        fatalRef.current = true;
        userStoppedRef.current = true;
        setError('permission-denied');
        setListening(false);
      } else if (code === 'no-speech') {
        setError('no-speech');
      } else if (code && code !== 'aborted') {
        setError('no-match');
      }
      clearSilence();
    };

    recognition.onend = () => {
      runningRef.current = false;
      clearSilence();
      // In-progress words never carry across an engine session; the finalized
      // transcript lives in finalRef and is preserved.
      if (accumulate) setInterimTranscript('');
      if (autoRestart && !userStoppedRef.current && !fatalRef.current) {
        // Chrome ends the session on its ~60s cap or a long pause — restart so
        // the user is never cut off mid-thought.
        try {
          recognition.start();
        } catch {
          // start() throws if it hasn't fully released — retry once shortly.
          setTimeout(() => {
            if (autoRestart && !userStoppedRef.current && !fatalRef.current && !runningRef.current) {
              try {
                recognition.start();
              } catch {
                /* give up quietly; user can press the mic again */
              }
            }
          }, 250);
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      userStoppedRef.current = true;
      fatalRef.current = true;
      clearSilence();
      try {
        recognition.abort();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, [continuous, interimResults, autoRestart, silenceTimeoutMs, accumulate, lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current || runningRef.current) return;
    userStoppedRef.current = false;
    fatalRef.current = false;
    // A user-initiated session starts fresh; auto-restarts (onend) do NOT call
    // this, so accumulated dictation survives Chrome's ~60s resets.
    finalRef.current = '';
    rawPhrasesRef.current = [];
    setTranscript('');
    setInterimTranscript('');
    setRawPhrases([]);
    setError(null);
    try {
      recognitionRef.current.start();
    } catch {
      /* already starting */
    }
  }, []);

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    setListening(false);
    setInterimTranscript('');
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* not running */
    }
  }, []);

  const reset = useCallback(() => {
    finalRef.current = '';
    rawPhrasesRef.current = [];
    setTranscript('');
    setInterimTranscript('');
    setRawPhrases([]);
    setError(null);
  }, []);

  const liveTranscript = interimTranscript
    ? transcript
      ? `${transcript} ${interimTranscript}`
      : interimTranscript
    : transcript;

  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    liveTranscript,
    rawPhrases,
    start,
    stop,
    reset,
    error,
    // Deprecated aliases — preserved so pre-W9.D consumers (dream/page,
    // dream/components/DiscoverFlow) keep working. New code uses the plain names.
    isSupported: supported,
    isListening: listening,
    startListening: start,
    stopListening: stop,
  };
}
