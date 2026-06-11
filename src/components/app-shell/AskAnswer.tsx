'use client';

/**
 * AskAnswer — the "Ask" half of the single "Ask or tell the garden" entry
 * point (2026-06-10 merge). Minimal question → answer composer inside the
 * ShellNav ask panel. Speaks the exact same /api/v1/copilot contract as the
 * legacy GlobalAiFab (Bearer-authed POST, SSE `text` deltas + a `complete`
 * event carrying the full text), so answers persist to the same
 * project_conversations history. The "Tell" half (multimodal capture) stays
 * in AskTheGarden — one button, two functions.
 */

import { useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { ShellConfig } from './types';

export function AskAnswer({ config }: { config: ShellConfig }) {
  const pathname = usePathname() ?? '';
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback(async () => {
    const q = query.trim();
    if (!q || streaming) return;
    setStreaming(true);
    setError('');
    setAnswer('');
    abortRef.current = new AbortController();

    try {
      // Same project resolution as the legacy composer: explicit shell
      // config first, then the active-project cache.
      const projectId =
        config.projectId ??
        (typeof window !== 'undefined'
          ? window.localStorage.getItem('bkg-active-project') || 'default'
          : 'default');

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch('/api/v1/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          query: q,
          projectId,
          project_context: { pathname },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
      }
      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamed = '';

      // SSE frames: `data: …\n\n` — `text` deltas accumulate, `complete`
      // carries the authoritative full text (mirrors GlobalAiFab's parser).
      for (;;) {
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
            const parsed = JSON.parse(payload) as { type?: string; text?: string; delta?: string };
            if (parsed.type === 'text' && parsed.delta) {
              streamed += parsed.delta;
              setAnswer(streamed);
            } else if (parsed.type === 'complete' && typeof parsed.text === 'string') {
              setAnswer(parsed.text);
            }
          } catch {
            // Ignore malformed JSON frames.
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [query, streaming, config.projectId, pathname]);

  return (
    <div className="pnav-askanswer">
      <textarea
        className="pnav-aa-input"
        rows={2}
        placeholder="Ask anything about this project…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
        }}
        aria-label="Your question"
      />
      <div className="pnav-aa-row">
        {streaming ? (
          <button type="button" className="pnav-aa-send" onClick={stop}>Stop</button>
        ) : (
          <button type="button" className="pnav-aa-send" onClick={() => void send()} disabled={!query.trim()}>
            Ask
          </button>
        )}
        {streaming && <span className="pnav-aa-status">Thinking…</span>}
      </div>
      {error && <div className="pnav-aa-error">{error}</div>}
      {answer && <div className="pnav-aa-answer">{answer}</div>}
    </div>
  );
}

export default AskAnswer;
