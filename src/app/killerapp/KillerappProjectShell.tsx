'use client';

/**
 * KillerappProjectShell (Project Spine v1, 2026-05-03)
 *
 * Client island that hangs above the workflow picker on /killerapp.
 *
 * - Without `?project=<id>`: renders nothing.
 * - With `?project=<id>`: hydrates the project (raw_input, ai_summary)
 *   + conversations from the API, then renders the user query, the AI
 *   response, and three "What next?" CTAs that route into per-workflow
 *   pages with the project id appended.
 *
 * If the project has raw_input but no assistant conversation yet, this
 * component auto-fires a /api/v1/copilot stream so the AI response
 * shows up without a refresh dance.
 *
 * Suspense:
 *   This component uses `useSearchParams`. Parent MUST wrap in <Suspense>.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProjectRecord {
  id: string;
  name: string | null;
  raw_input: string | null;
  ai_summary: string | null;
  jurisdiction: string | null;
  project_type: string | null;
  estimated_cost_low: number | null;
  estimated_cost_high: number | null;
  user_id: string | null;
}

interface ConversationRow {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

const ACTIVE_PROJECT_KEY = 'bkg-active-project';

async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers });
}

function setActiveProjectInLocalStorage(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } catch {
    // ignore storage failures
  }
}

export default function KillerappProjectShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [streaming, setStreaming] = useState(false);
  const triggeredStreamFor = useRef<string | null>(null);

  // 2026-05-06: When the user lands on bare /killerapp (no ?project=) but
  // we have a recently-active project in localStorage, restore the URL
  // so KillerAppNav stage chips, action-button URL rewrites, and the
  // workflow-hook fallback all see the project context. Without this the
  // user's "Quick estimate"/"Check codes" clicks would bounce back home.
  // Skip when the user just got bounced (toast=needs-project) — we don't
  // want to fight a redirect loop with whatever sent them here.
  useEffect(() => {
    if (projectId) return;
    if (searchParams.get('toast')) return;
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (stored && UUID_REGEX.test(stored)) {
        router.replace(`/killerapp?project=${encodeURIComponent(stored)}`);
      }
    } catch {
      // ignore storage failures
    }
  }, [projectId, router, searchParams]);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setConversations([]);
      setStreamingResponse('');
      setStreaming(false);
      return;
    }

    setActiveProjectInLocalStorage(projectId);

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [projRes, convRes] = await Promise.all([
          authedFetch(`/api/v1/projects?id=${encodeURIComponent(projectId)}`),
          authedFetch(
            `/api/v1/projects/${encodeURIComponent(projectId)}/conversations`
          ),
        ]);

        if (!projRes.ok) {
          if (cancelled) return;
          setError(
            projRes.status === 404
              ? "We couldn't find that project."
              : 'Sign in to view this project.'
          );
          setLoading(false);
          return;
        }
        const projJson = await projRes.json();
        if (cancelled) return;
        setProject(projJson as ProjectRecord);

        if (convRes.ok) {
          const convJson = await convRes.json();
          if (!cancelled) {
            setConversations(
              (convJson.conversations as ConversationRow[]) ?? []
            );
          }
        }
      } catch (e) {
        if (!cancelled) setError('Could not load this project.');
        console.error('Project hydrate error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Auto-trigger stream when project has no assistant message yet.
  useEffect(() => {
    if (!projectId || !project) return;
    if (loading || streaming) return;
    if (triggeredStreamFor.current === projectId) return;

    const hasAssistantMessage = conversations.some(
      (c) => c.role === 'assistant'
    );
    if (hasAssistantMessage) return;

    const seedQuery = project.raw_input?.trim();
    if (!seedQuery) return;

    triggeredStreamFor.current = projectId;
    void streamCopilot(projectId, seedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, project, conversations, loading, streaming]);

  async function streamCopilot(pid: string, query: string) {
    setStreaming(true);
    setStreamingResponse('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch('/api/v1/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, projectId: pid, stage: 0 }),
      });

      if (!res.ok || !res.body) {
        setError('Copilot is unavailable right now.');
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assembled = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith('data:')) continue;
          const json = line.slice(5).trim();
          try {
            const parsed = JSON.parse(json) as
              | { type: 'meta' }
              | { type: 'chunk'; text: string }
              | { type: 'complete'; text: string }
              | { type: 'done' }
              | { type: 'error'; message?: string };
            if (parsed.type === 'chunk') {
              assembled += parsed.text;
              setStreamingResponse(assembled);
            } else if (parsed.type === 'complete') {
              assembled = parsed.text;
              setStreamingResponse(assembled);
            } else if (parsed.type === 'error') {
              setError(parsed.message ?? 'Copilot error');
            }
          } catch {
            // ignore parse errors on partial frames
          }
        }
      }

      // After stream closes, refresh conversations so we get the
      // server-persisted version + project's parsed ai_summary.
      await refreshAfterStream(pid);
    } catch (e) {
      console.error('Copilot stream error:', e);
      setError('Copilot stream failed.');
    } finally {
      setStreaming(false);
    }
  }

  async function refreshAfterStream(pid: string) {
    try {
      const [projRes, convRes] = await Promise.all([
        authedFetch(`/api/v1/projects?id=${encodeURIComponent(pid)}`),
        authedFetch(
          `/api/v1/projects/${encodeURIComponent(pid)}/conversations`
        ),
      ]);
      if (projRes.ok) setProject(await projRes.json());
      if (convRes.ok) {
        const convJson = await convRes.json();
        setConversations(
          (convJson.conversations as ConversationRow[]) ?? []
        );
      }
    } catch {
      // ignore — UI can still show streamed text
    }
  }

  // INP fix (2026-05-06): Memoize expensive array operations (.filter, .find)
  // to avoid recomputing on every render. These DOM operations can be costly.
  //
  // CRITICAL (2026-05-06b): These useMemo calls MUST come BEFORE the
  // `if (!projectId) return null` early return. Hooks-after-early-return
  // is a Rules of Hooks violation and crashes React during SSR/client
  // mismatch. (Same pattern bug took out KillerAppNav + GlobalAiFab.)
  const persistedAssistant = useMemo(
    () => conversations.filter((c) => c.role === 'assistant').at(-1),
    [conversations]
  );
  const userQuery = useMemo(
    () =>
      project?.raw_input ??
      conversations.find((c) => c.role === 'user')?.content ??
      '',
    [project?.raw_input, conversations]
  );

  if (!projectId) return null;

  const aiText = streaming ? streamingResponse : persistedAssistant?.content ?? project?.ai_summary ?? '';

  return (
    <section
      style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 960,
        margin: '0 auto',
        padding: '24px 28px 8px',
      }}
      data-testid="killerapp-project-shell"
    >
      <PulseKeyframes />
      {error && !project ? (
        <div
          style={{
            border: '1px solid var(--faded-rule)',
            borderRadius: 12,
            padding: 24,
            background: 'var(--trace)',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: 'var(--graphite)' }}>
            {error}{' '}
            <Link href="/killerapp" style={{ textDecoration: 'underline' }}>
              Start a new project →
            </Link>
          </p>
        </div>
      ) : (
        <div
          style={{
            border: '1px solid var(--faded-rule)',
            borderRadius: 12,
            padding: 24,
            background: 'var(--trace)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
          }}
        >
          {userQuery && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: 'var(--brass, #B6873A)',
                  marginBottom: 6,
                }}
              >
                Your project
              </div>
              <p
                style={{
                  fontSize: 18,
                  lineHeight: 1.45,
                  color: 'var(--graphite)',
                  margin: 0,
                }}
              >
                {userQuery}
              </p>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: 'var(--brass, #B6873A)',
                marginBottom: 6,
              }}
            >
              AI take {streaming ? '· streaming…' : ''}
            </div>
            {aiText ? (
              <div
                style={{
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: 'var(--graphite)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {aiText}
              </div>
            ) : (
              // The auto-trigger fires on hydrate, so the empty state is
              // a brief flash. Show a "thinking" pulse instead of stale
              // "hit refresh" copy that confused users into thinking the
              // AI was broken when it was just streaming.
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  color: 'var(--graphite)',
                  opacity: 0.7,
                }}
                aria-live="polite"
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: 'var(--brass, #B6873A)',
                    animation: 'bkg-spine-pulse 1.4s ease-in-out infinite',
                  }}
                />
                Thinking through your project…
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--faded-rule)',
              paddingTop: 16,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: 'var(--graphite)',
                opacity: 0.6,
                marginRight: 8,
              }}
            >
              What next?
            </span>
            <NextStepLink
              href={`/killerapp/workflows/estimating?project=${encodeURIComponent(projectId)}`}
              label="Estimate the job"
            />
            <NextStepLink
              href={`/killerapp/workflows/code-compliance?project=${encodeURIComponent(projectId)}`}
              label="Check codes"
            />
            <NextStepLink
              href={`/killerapp/workflows/contract-templates?project=${encodeURIComponent(projectId)}`}
              label="Contract templates"
            />
          </div>
        </div>
      )}
    </section>
  );
}

// Pulse keyframes for the "thinking" indicator — lifted from the same
// pattern used in WorkflowPickerSearchBox + GlobalAiFab so the visual
// language stays consistent.
function PulseKeyframes() {
  return (
    <style jsx global>{`
      @keyframes bkg-spine-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.55; transform: scale(1.25); }
      }
    `}</style>
  );
}

function NextStepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '10px 14px',
        minHeight: 44,
        minWidth: 44,
        border: '0.5px solid var(--faded-rule)',
        borderRadius: 8,
        background: 'transparent',
        fontSize: 13,
        color: 'var(--graphite)',
        textDecoration: 'none',
        fontWeight: 500,
      }}
      data-testid={`next-step-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {label} →
    </Link>
  );
}
