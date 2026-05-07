'use client';

/**
 * WorkflowPickerSearchBox (W9.D.6 fix)
 * =====================================
 *
 * A quiet, single-line engraved field that lives under the hero subhead.
 * The TOC below is the real navigation — this box is a secondary nudge
 * for users who want to type what they're working on instead of scanning
 * the stage list.
 *
 * W9.D.6 FIX: Intent routing now live!
 * - Short queries (≤3 words) or workflow slugs → router.push as navigation
 * - Multi-word queries or scope keywords → copilot call (stage=0)
 * - Streams response inline below input with markdownToJsx rendering
 * - Loading state + Clear button to reset
 *
 * Heuristic for navigation vs copilot:
 * - Query is <= 3 words AND matches a workflow slug/alias → navigate
 * - Otherwise (scope keywords like sqft, $, ADU, remodel, etc) → copilot
 *
 * Scope keywords that trigger copilot: sqft, square feet, $, budget, project,
 * ADU, remodel, build, new construction, scope, addition, renovation
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { markdownToJsx } from '@/design-system/components/utils/markdownToJsx';
import { supabase } from '@/lib/supabase';

// Narrow typing for the Web Speech API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

// Workflow slug aliases for navigation shortcuts
const WORKFLOW_SLUGS = new Set([
  'estimating', 'q2',
  'code-compliance', 'q5', 'compliance', 'codes',
  'job-sequencing', 'q6', 'sequencing', 'sequence',
  'worker-count', 'q7', 'crew',
  'permit-applications', 'q8', 'permits',
  'sub-management', 'q9', 'subs',
  'equipment', 'q10',
  'supply-ordering', 'q11', 'supply', 'materials',
  'services-todos', 'q12', 'services',
  'hiring', 'q13',
  'weather-scheduling', 'q14', 'weather',
  'daily-log', 'q15', 'log',
  'osha-toolbox', 'q16', 'safety',
  'expenses', 'q17',
  'outreach', 'q18',
  'compass-nav', 'q19',
  'contract-templates', 'q4', 'contracts',
]);

// Scope keywords that indicate a project description (not a workflow slug)
const SCOPE_KEYWORDS = /\b(sqft|square\s+feet|square\s+ft|\$|\d+k|\d+m|budget|project|adu|remodel|build|new\s+construction|scope|addition|renovation|kitchen|bath|bedroom|story|basement|garage|patio|deck|fence)\b/i;

export default function WorkflowPickerSearchBox() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [responseContent, setResponseContent] = useState<React.ReactNode[] | null>(null);
  // 2026-05-07 demo readiness: anon users don't realize their work won't
  // save until they refresh and lose it. Detect auth state once on mount;
  // if anonymous, render a soft inline nudge after the AI streams.
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setIsAnonymous(!data.session);
    });
    return () => { cancelled = true; };
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<AnySpeechRecognition>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (Ctor) setVoiceSupported(true);
  }, []);

  const startVoice = () => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition: AnySpeechRecognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: AnySpeechRecognition) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i]?.[0]?.transcript ?? '';
        if (event.results[i]?.isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      const currentTranscript = final || interim;
      if (currentTranscript) {
        setValue((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const shouldUseCopilot = (q: string): boolean => {
    const words = q.trim().split(/\s+/);

    // If 3 or fewer words, check if it's a workflow slug
    if (words.length <= 3) {
      const normalized = q.toLowerCase().trim();
      if (WORKFLOW_SLUGS.has(normalized)) {
        return false; // Use navigation
      }
    }

    // If query contains scope keywords, use copilot
    if (SCOPE_KEYWORDS.test(q)) {
      return true;
    }

    // If >3 words, default to copilot
    if (words.length > 3) {
      return true;
    }

    // Otherwise navigate (short, no scope keywords, not a slug)
    return false;
  };

  /**
   * Project Spine v1 (2026-05-03):
   * On a copilot-qualified query, FIRST create a project record from
   * raw_input, THEN router.replace `/killerapp?project=<id>`. The
   * KillerappProjectShell auto-fires the /api/v1/copilot stream once
   * the URL has the project id, persists the AI response to
   * project_conversations, and renders inline.
   *
   * If the user is anonymous (no session), fall back to the legacy
   * inline-stream path so they at least see an answer (just not
   * persisted). They can sign in later to start saving projects.
   */
  const callCopilot = async (q: string) => {
    setLoading(true);
    setError(null);
    setResponseContent(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      // Authenticated → create a real project and redirect.
      if (token) {
        try {
          const projRes = await fetch('/api/v1/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ raw_input: q }),
          });
          if (projRes.ok) {
            const json = (await projRes.json()) as { project: { id: string } };
            const projectId = json.project?.id;
            if (projectId) {
              router.replace(
                `/killerapp?project=${encodeURIComponent(projectId)}`
              );
              setLoading(false);
              return;
            }
          }
          // Fall through to inline path on any failure (graceful degrade).
        } catch (e) {
          console.error('Project create failed; falling back to inline:', e);
        }
      }

      // Anonymous OR project-create fell through — inline-stream path
      // (legacy W9.D.6 behavior). Response shows in this component but
      // doesn't persist to DB; refresh wipes it.
      const projectId =
        typeof window !== 'undefined'
          ? localStorage?.getItem?.('bkg-active-project') ?? 'default'
          : 'default';

      const response = await fetch('/api/v1/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, stage: 0, projectId }),
      });

      if (!response?.ok) {
        throw new Error(`API error: ${response?.status ?? 'unknown'}`);
      }

      const reader = response?.body?.getReader?.();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let streamDone = false;

      while (!streamDone) {
        const result = await reader.read?.();
        if (!result) break;

        const { done, value } = result;
        if (done) {
          streamDone = true;
          break;
        }

        if (!value) continue;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line && line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);
              if (event?.type === 'complete' && event?.text) {
                fullText = event.text;
              } else if (event?.type === 'done') {
                streamDone = true;
                break;
              } else if (event?.type === 'error') {
                throw new Error(event?.message || 'Stream error');
              }
            } catch (e) {
              // ignore malformed JSON
            }
          }
        }
      }

      if (fullText && typeof fullText === 'string') {
        try {
          const rendered = markdownToJsx(fullText);
          if (Array.isArray(rendered)) {
            setResponseContent(rendered);
          }
        } catch (renderErr) {
          const msg =
            renderErr instanceof Error ? renderErr.message : 'Render error';
          setError(`Failed to render response: ${msg}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch orientation: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    const q = value.trim();
    if (!q) {
      router.push('/killerapp/workflows/code-compliance');
      return;
    }

    if (shouldUseCopilot(q)) {
      // Copilot route
      callCopilot(q);
    } else {
      // Navigation route: check if it's a slug and convert to full path
      const normalized = q.toLowerCase();
      let href = '/killerapp/workflows/code-compliance'; // Default fallback

      if (normalized === 'estimating' || normalized === 'q2') {
        href = '/killerapp/workflows/estimating';
      } else if (normalized === 'code-compliance' || normalized === 'q5' || normalized === 'compliance' || normalized === 'codes') {
        href = '/killerapp/workflows/code-compliance';
      } else if (normalized === 'job-sequencing' || normalized === 'q6' || normalized === 'sequencing' || normalized === 'sequence') {
        href = '/killerapp/workflows/job-sequencing';
      } else if (normalized === 'worker-count' || normalized === 'q7' || normalized === 'crew') {
        href = '/killerapp/workflows/worker-count';
      } else if (normalized === 'permit-applications' || normalized === 'q8' || normalized === 'permits') {
        href = '/killerapp/workflows/permit-applications';
      } else if (normalized === 'sub-management' || normalized === 'q9' || normalized === 'subs') {
        href = '/killerapp/workflows/sub-management';
      } else if (normalized === 'equipment' || normalized === 'q10') {
        href = '/killerapp/workflows/equipment';
      } else if (normalized === 'supply-ordering' || normalized === 'q11' || normalized === 'supply' || normalized === 'materials') {
        href = '/killerapp/workflows/supply-ordering';
      } else if (normalized === 'services-todos' || normalized === 'q12' || normalized === 'services') {
        href = '/killerapp/workflows/services-todos';
      } else if (normalized === 'hiring' || normalized === 'q13') {
        href = '/killerapp/workflows/hiring';
      } else if (normalized === 'weather-scheduling' || normalized === 'q14' || normalized === 'weather') {
        href = '/killerapp/workflows/weather-scheduling';
      } else if (normalized === 'daily-log' || normalized === 'q15' || normalized === 'log') {
        href = '/killerapp/workflows/daily-log';
      } else if (normalized === 'osha-toolbox' || normalized === 'q16' || normalized === 'safety') {
        href = '/killerapp/workflows/osha-toolbox';
      } else if (normalized === 'expenses' || normalized === 'q17') {
        href = '/killerapp/workflows/expenses';
      } else if (normalized === 'outreach' || normalized === 'q18') {
        href = '/killerapp/workflows/outreach';
      } else if (normalized === 'compass-nav' || normalized === 'q19') {
        href = '/killerapp/workflows/compass-nav';
      } else if (normalized === 'contract-templates' || normalized === 'q4' || normalized === 'contracts') {
        href = '/killerapp/workflows/contract-templates';
      }

      router.push(href);
    }
  };

  const clearResponse = () => {
    setResponseContent(null);
    setError(null);
    setValue('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Input row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--trace)',
          border: '0.5px solid var(--faded-rule)',
          borderRadius: 10,
          padding: '4px 6px 4px 14px',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <input
          id="workflow-picker-search"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Describe what you're building — voice or text"
          aria-label="Describe what you're working on"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-archivo), sans-serif',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--graphite)',
            padding: '10px 0',
            minWidth: 0,
          }}
        />

        {voiceSupported && (
          <button
            type="button"
            onClick={listening ? stopVoice : startVoice}
            aria-pressed={listening}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            style={{
              background: listening ? 'rgba(182, 135, 58, 0.12)' : 'transparent',
              border: 'none',
              borderRadius: 6,
              padding: '8px 10px',
              minHeight: 44,
              minWidth: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: listening ? 'var(--brass)' : 'var(--graphite)',
              fontSize: 14,
              cursor: 'pointer',
              opacity: listening ? 1 : 0.55,
              fontFamily: 'inherit',
              transition: 'opacity 0.15s ease',
            }}
          >
            {listening ? '⏺' : '🎤'}
          </button>
        )}

        <button
          type="button"
          onClick={submit}
          aria-label="Search workflows"
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            padding: '8px 10px',
            minHeight: 44,
            minWidth: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--graphite)',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            opacity: 0.6,
            fontFamily: 'inherit',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6';
          }}
        >
          →
        </button>
      </div>

      {/* Response panel (shown only if copilot was called) */}
      {(loading || responseContent || error) && (
        <div
          style={{
            background: '#F4F0E6', // Trace cream
            border: '1px solid var(--faded-rule)',
            borderRadius: 12,
            padding: 20,
            color: 'var(--graphite)',
          }}
        >
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--graphite)' }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'var(--brass)',
                  animation: 'bkg-ai-pulse 1.4s ease-in-out infinite',
                }}
              />
              Running the numbers…
            </div>
          )}

          {error && (
            <div
              style={{
                fontSize: 14,
                color: '#d32f2f',
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          {responseContent && (
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {responseContent}
            </div>
          )}

          {responseContent && isAnonymous && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                fontSize: 12,
                color: 'var(--graphite, #2E2E30)',
                background: 'rgba(127, 207, 203, 0.12)',
                border: '1px solid var(--robins-egg, #7FCFCB)',
                borderRadius: 8,
                lineHeight: 1.5,
              }}
              role="note"
            >
              <strong style={{ fontWeight: 600 }}>Heads up:</strong>{' '}
              your work won&rsquo;t save if you refresh.{' '}
              <a
                href="/login?next=/killerapp"
                style={{ color: 'var(--graphite)', textDecoration: 'underline' }}
              >
                Sign in
              </a>{' '}
              to keep this project.
            </div>
          )}

          {responseContent && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={clearResponse}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--faded-rule)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  color: 'var(--graphite)',
                  cursor: 'pointer',
                  opacity: 0.7,
                  fontFamily: 'inherit',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes bkg-ai-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
