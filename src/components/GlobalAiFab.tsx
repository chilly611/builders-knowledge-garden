'use client';

/**
 * Global AI FAB
 * =============
 *
 * Ever-present floating action button, bottom-right of every page.
 *
 * Click → opens an inline composer with:
 *   - Textarea for typed prompts
 *   - 🎤 Voice button (SpeechRecognition API — same pattern as W2.5)
 *   - Streaming response pane
 *
 * Surface-aware: when the user submits, we attach the current pathname and
 * any `data-bkg-surface` attribute on the first matching <main>/<section>.
 * That lets the copilot endpoint treat "ask about this workflow" the same
 * way as "ask about the whole app".
 *
 * Why bottom-right (per Chilly's 2026-04-18 answer):
 *   - Mobile: CompassBloom also lives bottom-right. The FAB stacks ABOVE
 *     the compass (72px offset) so both remain reachable.
 *   - Desktop: no left sidebar is wired globally (CompassBloom is the
 *     mobile-only bloom; CompassNav exists but is unused). Bottom-right
 *     is free real estate.
 *
 * Endpoints:
 *   - POST /api/v1/copilot — streams SSE. We parse the `text` deltas into
 *     the panel and stop on `[DONE]`.
 *
 * Deferred:
 *   - Auth-gated history, Clerk profile memory.
 *   - Cross-surface actions (e.g. "save this budget row" from within the
 *     composer). Week 4.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { usePathname } from 'next/navigation';
import { stageFromPathname } from '@/lib/stage-from-pathname';
import { markdownToJsx } from '@/design-system/components/utils/markdownToJsx';

// Minimal SpeechRecognition typing — the web APIs differ per browser and
// we only need .start(), .stop(), .onresult, .onerror, .onend for the MVP.
interface MinimalSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void)
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

interface SurfaceContext {
  pathname: string;
  surfaceId: string | null;
  workflowId: string | null;
  breadcrumbLabel: string | null;
}

function readSurfaceContext(pathname: string): SurfaceContext {
  if (typeof document === 'undefined') {
    return {
      pathname,
      surfaceId: null,
      workflowId: null,
      breadcrumbLabel: null,
    };
  }
  const tagged = document.querySelector<HTMLElement>('[data-bkg-surface]');
  const surfaceId = tagged?.dataset.bkgSurface ?? null;
  const workflowId = surfaceId?.startsWith('workflow-')
    ? surfaceId.replace('workflow-', '')
    : null;
  // Use the H1 text as a friendly label if present.
  const h1 = document.querySelector<HTMLHeadingElement>('h1');
  const breadcrumbLabel = h1?.textContent?.trim() ?? null;
  return { pathname, surfaceId, workflowId, breadcrumbLabel };
}

// ─── Component ────────────────────────────────────────────────────────────

export default function GlobalAiFab() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pathname = usePathname() ?? '/';

  // Avoid hydration mismatch — only render after mount.
  useEffect(() => setMounted(true), []);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Listen for bkg:ai-fab:open event to open FAB and focus textarea.
  // If detail.prompt is provided, seed the textarea with it so the user
  // doesn't land on an empty input — fixes the "feels nowhere" complaint
  // when triggered from "Ask the AI what to do next" CTA.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ prompt?: string } | undefined>).detail;
      if (detail?.prompt && typeof detail.prompt === 'string') {
        setPrompt(detail.prompt);
      }
      setOpen(true);
      setTimeout(() => {
        const textarea = document.querySelector<HTMLTextAreaElement>(
          '[placeholder="What do you want to do? Type or tap 🎤"]'
        );
        textarea?.focus();
      }, 0);
    };
    window.addEventListener('bkg:ai-fab:open', handler);
    return () => window.removeEventListener('bkg:ai-fab:open', handler);
  }, []);

  // Escape-to-close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const q = prompt.trim();
    if (!q || isStreaming) return;

    setIsStreaming(true);
    setResponse('');
    setError(null);

    const ctx = readSurfaceContext(pathname);
    abortRef.current = new AbortController();

    try {
      // Compute stage, workflowId, and projectId
      const stage = stageFromPathname(pathname);

      // Extract workflowId from URL if pathname matches /killerapp/workflows/(.+?)(/|$)
      let workflowId: string | null = null;
      const workflowMatch = pathname.match(/\/killerapp\/workflows\/(.+?)(?:\/|$)/);
      if (workflowMatch) {
        workflowId = workflowMatch[1];
      }

      // Get projectId from localStorage or default
      const projectId = typeof window !== 'undefined'
        ? localStorage.getItem('bkg-active-project') || 'default'
        : 'default';

      const res = await fetch('/api/v1/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          query: q,
          stage,
          workflowId,
          projectId,
          project_context: {
            pathname: ctx.pathname,
            surface: ctx.surfaceId,
            workflow: ctx.workflowId,
            label: ctx.breadcrumbLabel,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `Request failed (${res.status})`
        );
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

        // SSE frames: `data: …\n\n`
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

            // Handle the new 'complete' event with full text
            if ('type' in parsed && parsed.type === 'complete' && 'text' in parsed) {
              setResponse(parsed.text ?? '');
            }
          } catch {
            // Ignore malformed JSON
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        // Aborted — leave the partial response in place.
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, pathname, prompt]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError(
        'Voice input isn\'t supported in this browser — try Chrome on desktop or mobile Safari.'
      );
      return;
    }
    try {
      const rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (evt) => {
        let transcript = '';
        for (let i = 0; i < evt.results.length; i += 1) {
          transcript += evt.results[i][0].transcript;
        }
        setPrompt(transcript);
      };
      rec.onerror = (e) => {
        const err = e as { error?: string };
        setError(err.error ?? 'Voice input failed.');
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

  const handleVoicePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!isListening) {
        startListening();
      }
    },
    [isListening, startListening]
  );

  const handleVoicePointerUp = useCallback(() => {
    if (isListening) {
      stopListening();
    }
  }, [isListening, stopListening]);

  const handleVoicePointerLeave = useCallback(() => {
    if (isListening) {
      stopListening();
    }
  }, [isListening, stopListening]);

  // INP fix (2026-05-06): Memoize surface context to avoid redundant DOM queries
  // on every render. readSurfaceContext() queries the DOM, which is expensive.
  //
  // CRITICAL (2026-05-06b): Hooks MUST be called BEFORE the early returns
  // below. Calling useMemo after `if (!mounted) return null` is a Rules of
  // Hooks violation — SSR runs the early-return path (no useMemo), client
  // mount runs the full path (with useMemo), React then sees a different
  // hook count between renders and throws "Rendered more hooks than during
  // the previous render," cascading the entire layout into Next's 500
  // fallback. This bug took out every /killerapp/* route.
  const ctx = useMemo(() => readSurfaceContext(pathname), [pathname]);

  if (!mounted) return null;

  // Hide on the presentation / cinematic surfaces, same rule as CompassBloom.
  if (pathname === '/presentation' || pathname === '/cinematic') return null;
  const contextLabel =
    ctx.workflowId ? `Workflow ${ctx.workflowId.toUpperCase()}` : ctx.pathname;

  return (
    <>
      <style>{`
        @keyframes bkgAiThinking {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
        @keyframes bkgVoicePulse {
          0%, 100% {
            box-shadow: 0 0 12px rgba(220, 38, 38, 0.6);
          }
          50% {
            box-shadow: 0 0 20px rgba(220, 38, 38, 0.8);
          }
        }
      `}</style>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="AI composer"
          style={panelStyle}
        >
          <header style={panelHeaderStyle}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Ask the garden</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {contextLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={closeButtonStyle}
            >
              ✕
            </button>
          </header>

          <div style={{ position: 'relative' }}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="What do you want to do? Type or tap 🎤"
              rows={3}
              style={textareaStyle}
              disabled={isStreaming}
            />
            <button
              type="button"
              onPointerDown={handleVoicePointerDown}
              onPointerUp={handleVoicePointerUp}
              onPointerLeave={handleVoicePointerLeave}
              aria-pressed={isListening}
              aria-label={isListening ? 'Listening…' : 'Press and hold to talk'}
              style={{
                ...voiceButtonStyle,
                background: isListening ? 'linear-gradient(135deg, #DC2626, #B91C1C)' : '#fff',
                color: isListening ? '#fff' : '#555',
                animation: isListening ? 'bkgVoicePulse 1s ease-in-out infinite' : 'none',
                boxShadow: isListening ? '0 0 12px rgba(220, 38, 38, 0.6)' : 'none',
              }}
              title={isListening ? 'Release to stop' : 'Press and hold to talk'}
            >
              {isListening ? '🎤' : '🎤'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={isStreaming ? stopStreaming : handleSubmit}
              disabled={!prompt.trim() && !isStreaming}
              style={{
                ...primaryButtonStyle,
                opacity: !prompt.trim() && !isStreaming ? 0.5 : 1,
              }}
            >
              {isStreaming ? 'Stop' : 'Ask (⌘↵)'}
            </button>
            {response && (
              <button
                type="button"
                onClick={() => {
                  setResponse('');
                  setError(null);
                }}
                style={secondaryButtonStyle}
              >
                Clear
              </button>
            )}
          </div>

          {isStreaming && !response && !error && (
            <div style={{ ...responseStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#B6873A',
                  animation: 'bkgAiThinking 1.4s ease-in-out infinite',
                }}
              />
              <span>Thinking through your question…</span>
            </div>
          )}

          {error && (
            <div style={errorStyle} role="alert">
              {error}
            </div>
          )}

          {response && (
            <article style={responseStyle} aria-live="polite">
              {markdownToJsx(response)}
            </article>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        aria-label={open ? 'Close AI composer' : 'Open AI composer'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          ...fabStyle,
          background: open
            ? 'linear-gradient(135deg, #D85A30, #A63E1A)'
            : 'linear-gradient(135deg, #1D9E75, #0c5e45)',
        }}
      >
        {open ? '✕' : '✨'}
      </button>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const fabStyle: CSSProperties = {
  position: 'fixed',
  // Sits ABOVE the CompassBloom FAB on mobile (which uses 24px bottom).
  bottom: 96,
  right: 24,
  zIndex: 9997,
  width: 52,
  height: 52,
  borderRadius: 14,
  border: 'none',
  cursor: 'pointer',
  color: '#fff',
  fontSize: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow:
    '0 4px 16px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)',
  transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
};

const panelStyle: CSSProperties = {
  position: 'fixed',
  bottom: 160,
  right: 24,
  width: 360,
  // 2026-05-07: was `calc(100vw - 32px)` which collides with the
  // 24px right-offset (panel needed 360+24=384px > 375px iPhone width).
  // Cap to the viewport minus 2× the right-offset for symmetric breathing.
  maxWidth: 'min(360px, calc(100vw - 48px))',
  zIndex: 9996,
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #e5e5e0',
  boxShadow: '0 20px 48px rgba(0,0,0,0.16), 0 6px 12px rgba(0,0,0,0.06)',
  padding: 14,
  fontFamily: 'var(--font-archivo), system-ui, sans-serif',
  color: '#1a1a1a',
  animation: 'bkgFabIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
};

const panelHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
};

const closeButtonStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 14,
  cursor: 'pointer',
  color: '#999',
  padding: 4,
};

const textareaStyle: CSSProperties = {
  width: '100%',
  padding: '10px 40px 10px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  border: '1px solid #e0e0dc',
  borderRadius: 10,
  resize: 'vertical',
  minHeight: 68,
  outline: 'none',
  background: '#fafaf8',
  color: '#1a1a1a',
};

const voiceButtonStyle: CSSProperties = {
  position: 'absolute',
  right: 8,
  top: 8,
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid #e0e0dc',
  cursor: 'pointer',
  fontSize: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s',
};

const primaryButtonStyle: CSSProperties = {
  flex: 1,
  padding: '8px 14px',
  background: '#1D9E75',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const secondaryButtonStyle: CSSProperties = {
  padding: '8px 14px',
  background: 'transparent',
  color: '#555',
  border: '1px solid #e0e0dc',
  borderRadius: 10,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const responseStyle: CSSProperties = {
  marginTop: 10,
  padding: 12,
  background: '#fafaf8',
  border: '1px solid #eeeceb',
  borderRadius: 10,
  fontSize: 13,
  lineHeight: 1.5,
  color: '#222',
  maxHeight: 280,
  overflowY: 'auto',
  whiteSpace: 'pre-wrap',
};

const errorStyle: CSSProperties = {
  marginTop: 10,
  padding: 10,
  background: '#FEF2F2',
  border: '1px solid #FECACA',
  borderRadius: 8,
  fontSize: 12,
  color: '#991B1B',
};
