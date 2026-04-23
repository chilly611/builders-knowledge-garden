'use client';

/**
 * WorkflowTurkeyInput
 * ===================
 * The "talking turkey" natural-language box. Rendered by WorkflowShell on
 * every workflow route so the user always has an obvious place to type or
 * speak what they actually want — scoped to the current workflow context.
 *
 * Routes through the same SSE /api/v1/copilot pipeline as GlobalAiFab but
 * with the workflow id + stage id + breadcrumb label bundled so Claude
 * knows where the user is asking from and can give a workflow-scoped Pro
 * result.
 *
 * Design intent per founder (2026-04-19):
 *   - Always-on, can't be opted out of.
 *   - Placeholder copy is prescribed — don't soften it.
 *   - Coexists with the GlobalAiFab (which stays in the corner); this one
 *     is prominent and in-flow.
 */

import { useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { colors, fonts, fontSizes, fontWeights, spacing, radii, shadows } from '@/design-system/tokens';
import { toFriendlyMessage } from '@/lib/error-messages';
import { stageFromPathname } from '@/lib/stage-from-pathname';
import { markdownToJsx } from './utils/markdownToJsx';

interface MinimalSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>; resultIndex: number }) => void)
    | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface WorkflowTurkeyInputProps {
  workflowId: string;
  workflowLabel: string;
  stageId?: number;
}

const PLACEHOLDER =
  'say what you need and where you are by plain old talking turkey and we can figure out how to get you a pro result!';

export default function WorkflowTurkeyInput({
  workflowId,
  workflowLabel,
  stageId,
}: WorkflowTurkeyInputProps) {
  const pathname = usePathname();
  const computedStageId = stageFromPathname(pathname);

  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(async () => {
    const q = prompt.trim();
    if (!q || isStreaming) return;

    setResponse('');
    setError(null);
    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/v1/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          query: q,
          stage: computedStageId,
          workflowId: workflowId,
          project_context: {
            pathname: typeof window !== 'undefined' ? window.location.pathname : '',
            surface: `workflow-${workflowId}`,
            workflow: workflowId,
            label: workflowLabel,
            stage: computedStageId,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = { status: res.status, error: (body as { error?: string }).error };
        throw new Error(toFriendlyMessage(err, 'fetch'));
      }
      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          if (!frame.startsWith('data:')) continue;
          const payload = frame.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload) as
              | { type: 'text'; delta?: string }
              | { type?: string; text?: string; delta?: string };
            const delta =
              ('delta' in parsed && parsed.delta) ||
              ('text' in parsed && parsed.text) ||
              '';
            if (delta) setResponse((prev) => prev + delta);
          } catch {
            setResponse((prev) => prev + payload);
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        // Aborted — leave partial response in place.
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [prompt, isStreaming, workflowId, workflowLabel, computedStageId]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError(
        "Voice input isn't supported in this browser — try Chrome on desktop or mobile Safari."
      );
      return;
    }
    try {
      const rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (evt) => {
        let interim = '';
        let final = '';
        for (let i = evt.resultIndex; i < evt.results.length; i += 1) {
          const transcript = evt.results[i][0].transcript;
          if (evt.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        const currentTranscript = final || interim;
        setPrompt((prev) => {
          // Append voice to any existing typed text (don't clobber it).
          const sep = prev && !prev.endsWith(' ') ? ' ' : '';
          return prev + sep + currentTranscript;
        });
        if (final) {
          rec.stop();
        }
      };
      rec.onerror = (e) => {
        const err = e as { error?: string };
        setError(err.error ?? toFriendlyMessage(err, 'voice'));
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice input unavailable');
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  return (
    <section
      aria-label="Talk to your garden about this workflow"
      data-bkg-turkey={workflowId}
      style={{
        border: `1px solid ${colors.ink[100]}`,
        borderRadius: radii.lg,
        padding: spacing[4],
        marginBottom: spacing[6],
        backgroundColor: colors.trace,
        boxShadow: shadows.sm,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: spacing[3],
        }}
      >
        {/* Mic button */}
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: radii.full,
            border: `1px solid ${isListening ? '#D85A30' : colors.ink[200]}`,
            backgroundColor: isListening ? '#FFF5F0' : '#FFFFFF',
            cursor: 'pointer',
            fontSize: 20,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: '150ms ease',
          }}
        >
          {isListening ? (
            <span
              aria-hidden="true"
              style={{
                width: 12,
                height: 12,
                borderRadius: radii.full,
                backgroundColor: '#D85A30',
                animation: 'bkg-turkey-pulse 1s ease-in-out infinite',
              }}
            />
          ) : (
            <span aria-hidden="true">🎤</span>
          )}
        </button>

        {/* Text area */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={PLACEHOLDER}
          rows={2}
          style={{
            flex: 1,
            minHeight: 44,
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: fontSizes.sm,
            fontFamily: fonts.body,
            color: colors.ink[900],
            backgroundColor: '#FFFFFF',
            border: `1px solid ${colors.ink[200]}`,
            borderRadius: radii.md,
            resize: 'vertical',
            lineHeight: 1.5,
          }}
        />

        {/* Submit / Stop */}
        <button
          type="button"
          onClick={isStreaming ? stopStreaming : submit}
          disabled={!isStreaming && !prompt.trim()}
          aria-label={isStreaming ? 'Stop' : 'Ask'}
          style={{
            flexShrink: 0,
            padding: `${spacing[2]} ${spacing[4]}`,
            fontSize: fontSizes.sm,
            fontWeight: fontWeights.semibold,
            fontFamily: fonts.body,
            color: '#FFFFFF',
            backgroundColor: isStreaming ? '#D85A30' : '#1D9E75',
            border: 'none',
            borderRadius: radii.md,
            cursor: !isStreaming && !prompt.trim() ? 'not-allowed' : 'pointer',
            opacity: !isStreaming && !prompt.trim() ? 0.5 : 1,
            transition: '150ms ease',
            alignSelf: 'stretch',
          }}
        >
          {isStreaming ? 'Stop' : 'Ask'}
        </button>
      </div>

      {/* Response pane */}
      {(response || error) && (
        <div
          role="region"
          aria-label="Response"
          style={{
            marginTop: spacing[3],
            padding: spacing[3],
            fontSize: fontSizes.sm,
            fontFamily: fonts.body,
            color: error ? '#991B1B' : colors.ink[900],
            backgroundColor: error ? '#FEF2F2' : '#FFFFFF',
            border: `1px solid ${error ? '#FECACA' : colors.ink[100]}`,
            borderRadius: radii.md,
            lineHeight: 1.55,
          }}
        >
          {error ? error : markdownToJsx(response)}
        </div>
      )}

      {/* Cmd+Enter hint */}
      <div
        style={{
          marginTop: spacing[2],
          fontSize: fontSizes.xs,
          color: colors.ink[500],
          fontFamily: fonts.mono,
        }}
      >
        ⌘ + Enter to send · 🎤 to dictate · coexists with the bottom-right AI for anything-else
      </div>

      {/* Pulse keyframes, scoped to this component instance */}
      <style jsx>{`
        @keyframes bkg-turkey-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.4);
            opacity: 0.55;
          }
        }
      `}</style>
    </section>
  );
}
