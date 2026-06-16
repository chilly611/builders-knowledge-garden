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
import { authedFetch } from '@/lib/authed-fetch';
import { useProject } from '@/lib/hooks/useProject';
import { useProjectLedger } from '@/components/app-shell/useProjectLedger';
import { applyJurisdictionOverride } from '@/lib/project-display';
import { isDemoFixtureId, getDemoFixture } from '@/lib/projects/getCanonicalProject';

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

// AI-take backstop (2026-06-15 redline, fix 3): if the "Running the numbers…"
// pulse hasn't resolved to real text within this window, fall back to an honest
// terminal state instead of pulsing forever.
const AI_TAKE_TIMEOUT_MS = 20_000;

function setActiveProjectInLocalStorage(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } catch {
    // ignore storage failures
  }
}

/**
 * The copilot prompts trained the AI to end its response with a
 * machine-readable action block:
 *
 *   **What next?**
 *   - [Estimate the job](action:/killerapp/workflows/estimating)
 *   - [Check codes](action:/killerapp/workflows/code-compliance)
 *   - [Contract templates](action:/killerapp/workflows/contract-templates)
 *
 * The shell renders its own static "What next?" CTA row from
 * `NextStepLink` components below the AI take. If we render aiText raw
 * with `whiteSpace: 'pre-wrap'`, the markdown shows up as literal text
 * AND the static row renders below — duplicate UI, raw markdown leaking.
 *
 * Strip the trailing block before display. We DON'T re-render via
 * markdownToJsx here because the static row is the canonical source of
 * truth for which workflows the next-step links go to (the prompt
 * sometimes omits one or all three; the static row is always reliable).
 */

function stripTrailingActionBlock(text: string): string {
  if (!text) return text;
  // Match `**What next?**` (case-insensitive, optional surrounding
  // whitespace and newlines) followed by everything after it.
  let cleaned = text.replace(
    /\n*\s*\*\*\s*what\s+next\??\s*\*\*[\s\S]*$/i,
    ''
  );
  // 2026-05-19 (Ship 15): the model habitually writes a lead-in like
  // "Here's where I'd start:" or "Next steps:" right before the
  // `**What next?**` action list. Once we strip the action list the
  // lead-in becomes a dangling header with nothing under it — looks
  // broken on screen. Strip any trailing short line ending in `:`
  // (capped at 120 chars to avoid eating long prose that happens to
  // end in a colon). The canonical action chips render below.
  cleaned = cleaned.replace(/\n+[^\n]{1,120}:\s*$/, '');
  return cleaned.trimEnd();
}

export default function KillerappProjectShell() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // C1 spine (2026-05-18): project identity + record now come from
  // ProjectContext. This component still owns conversations + streaming
  // (those are copilot concerns, not project-identity concerns).
  const { project, projectId, loading: projectLoading, setActiveProject, refreshProject } = useProject();

  // Re-fetch the project record every time this page mounts so facts like
  // jurisdiction and sqft are always current after workflow edits.
  useEffect(() => {
    if (projectId) refreshProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [streaming, setStreaming] = useState(false);
  // 2026-06-02: when the copilot can't produce an AI take (401 anon, 5xx,
  // network), record WHY so the UI can show a graceful state instead of the
  // "Running the numbers…" pulse spinning forever. 'auth' → invite sign-in.
  // 'empty' = signed-in, but the project has nothing to summarize (no
  // raw_input / ai_summary / conversation) — an honest terminal state, not a
  // spinner. 'auth' = sign-in needed. 'error' = copilot failed or timed out.
  const [aiUnavailable, setAiUnavailable] = useState<null | 'auth' | 'error' | 'empty'>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const triggeredStreamFor = useRef<string | null>(null);

  // Anon short-circuit (2026-06-02): for signed-out viewers the auto-trigger
  // pipeline stalls before it ever calls the copilot (conversations 401,
  // ledger gating), so the 401 handler below never runs and the pulse spun
  // forever. If there is no session, say "sign in" immediately — if the
  // project carries a public ai_summary, aiText wins and this is ignored.
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(Boolean(data.session));
      if (!data.session) setAiUnavailable('auth');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // C1 spine: on bare /killerapp with no ?project= but a stored project,
  // align the URL via setActiveProject. Skip when the user just got
  // bounced (toast=needs-project) — we don't want to fight a redirect.
  useEffect(() => {
    if (projectId) return;
    if (searchParams.get('toast')) return;
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (stored && (UUID_REGEX.test(stored) || stored.startsWith('demo-'))) {
        setActiveProject(stored);
      }
    } catch {
      // ignore storage failures
    }
  }, [projectId, router, searchParams]);

  useEffect(() => {
    // Always clear stale streaming text when the active project changes.
    setStreamingResponse('');

    if (!projectId) {
      setConversations([]);
      setStreaming(false);
      return;
    }

    setActiveProjectInLocalStorage(projectId);

    // DEMO FIXTURES: the seeded demos (Marin, Folsom) show a fixture AI take
    // (see rawAiText), so never load their project_conversations — Marin's
    // latest row drifted to a stale answer, and Folsom has none. Skip the fetch.
    if (isDemoFixtureId(projectId)) {
      setConversations([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // C1 spine (2026-05-18): project fetch lives in ProjectProvider.
        // Shell only owns conversations (copilot concern).
        const convRes = await authedFetch(
          `/api/v1/projects/${encodeURIComponent(projectId)}/conversations`
        );

        if (cancelled) return;
        if (convRes.ok) {
          const convJson = await convRes.json();
          setConversations(
            (convJson.conversations as ConversationRow[]) ?? []
          );
        }
      } catch (e) {
        if (!cancelled) setError('Could not load conversations.');
        console.error('Conversations hydrate error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Auto-trigger stream when project has no assistant message yet.
  const ledger = useProjectLedger(projectId);

  useEffect(() => {
    if (!projectId || !project) return;
    if (isDemoFixtureId(projectId)) return; // seeded demos use a fixture take — never auto-fire copilot
    if (project.id !== projectId) return; // guard: project record not yet refreshed for this id
    if (loading || streaming) return;
    if (!ledger.ready) return; // wait for the project's REAL current stage before firing
    if (triggeredStreamFor.current === projectId) return;

    const hasAssistantMessage = conversations.some(
      (c) => c.role === 'assistant'
    );
    if (hasAssistantMessage) return;

    const seedQuery = project.raw_input?.trim();
    if (!seedQuery) return;

    triggeredStreamFor.current = projectId;
    void streamCopilot(projectId, seedQuery, ledger.journey?.currentStage ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, project, conversations, loading, streaming, ledger.ready]);

  async function streamCopilot(pid: string, query: string, stageId: number = 0) {
    setStreaming(true);
    setStreamingResponse('');
    setAiUnavailable(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch('/api/v1/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, projectId: pid, stage: stageId }),
      });

      if (!res.ok || !res.body) {
        setError('Copilot is unavailable right now.');
        // 401/403 = signed-out viewer (the copilot API requires auth). Tell
        // the AI-take panel WHY so it renders "sign in" instead of pulsing
        // forever — the anon /killerapp infinite-spinner bug. (2026-06-02)
        setAiUnavailable(res.status === 401 || res.status === 403 ? 'auth' : 'error');
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
      setAiUnavailable('error');
    } finally {
      setStreaming(false);
    }
  }

  async function refreshAfterStream(pid: string) {
    try {
      // C1 spine: dispatch the changed event to make the Provider re-fetch
      // the project (so fresh ai_summary lands). Also refresh conversations.
      window.dispatchEvent(
        new CustomEvent('bkg:project:changed', { detail: { id: pid } })
      );
      const convRes = await authedFetch(
        `/api/v1/projects/${encodeURIComponent(pid)}/conversations`
      );
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

  const displayQuery = useMemo(
    () =>
      project?.jurisdiction ? applyJurisdictionOverride(userQuery, project.jurisdiction) : userQuery,
    [userQuery, project?.jurisdiction]
  );

  // The displayed AI take, computed BEFORE the early return so the resolve
  // effects below can depend on it (Rules of Hooks).
  //
  // Precedence (2026-05-19, Ship 14): prefer streamingResponse whenever it has
  // content — it's the most recent text the user saw — because the server write
  // to project_conversations is fire-and-forget, so refreshAfterStream often
  // fetches before the row exists (persistedAssistant undefined, ai_summary
  // empty on a brand-new project) and the body would otherwise flash back to a
  // spinner the moment the stream ends.
  // DEMO FIXTURES (Marin, Folsom): always render the stable fixture take, never
  // the latest project_conversations row (Marin's drifted; Folsom has none).
  // The trailing **What next?** block is stripped — the picker below is the
  // canonical CTA source.
  const aiText = useMemo(() => {
    const demoTake = projectId ? getDemoFixture(projectId)?.aiTake : undefined;
    const raw = demoTake
      ? demoTake
      : streamingResponse || persistedAssistant?.content || project?.ai_summary || '';
    return stripTrailingActionBlock(raw);
  }, [projectId, streamingResponse, persistedAssistant, project?.ai_summary]);

  // Is there anything for the copilot to summarize for this project?
  const hasSeed = useMemo(() => userQuery.trim().length > 0, [userQuery]);

  // Resolve the "Running the numbers…" pulse to an HONEST terminal state
  // (2026-06-15 redline, fix 3). Without this, a signed-in user on a project
  // with no raw_input / ai_summary / conversation never fires the auto-trigger
  // (no seed query), so aiUnavailable stays null and the pulse spins forever.
  useEffect(() => {
    if (!projectId || isDemoFixtureId(projectId)) return;
    if (aiText || aiUnavailable) return;
    if (streaming || loading || projectLoading) return; // still working
    if (!project || !ledger.ready) return; // still hydrating
    if (signedIn === false) return; // anon already resolves to 'auth'
    if (hasSeed) return; // a take is genuinely coming via the auto-trigger
    setAiUnavailable('empty');
  }, [projectId, aiText, aiUnavailable, streaming, loading, projectLoading, project, ledger.ready, signedIn, hasSeed]);

  // Timeout backstop: even when a take SHOULD be coming, never pulse forever —
  // if nothing resolves within the window (stalled stream, an auto-trigger that
  // never fired), fall back to the honest error state.
  useEffect(() => {
    if (!projectId || isDemoFixtureId(projectId)) return;
    if (aiText || aiUnavailable) return;
    const timer = setTimeout(() => {
      setAiUnavailable((prev) => prev ?? 'error');
    }, AI_TAKE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [projectId, aiText, aiUnavailable, streaming, loading, projectLoading, hasSeed]);

  if (!projectId) return null;

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
          {displayQuery && (
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
                {displayQuery}
              </p>
            </div>
          )}

          {(() => {
            const sqftMatch = !project?.sqft && project?.raw_input
              ? project.raw_input.match(/\b([\d,]+)\s*(?:sf|sqft|sq\s?ft|square\s?(?:feet|foot|ft))\b/i)
              : null;
            const sqft = project?.sqft ?? (sqftMatch ? sqftMatch[1].replace(/,/g, '') : null);
            const facts: string[] = [];
            if (project?.project_type) facts.push(project.project_type);
            if (project?.jurisdiction) facts.push(project.jurisdiction);
            // Locale PINNED (2026-06-02): bare toLocaleString() formats with
            // the runtime's locale — Vercel's server ICU vs the visitor's
            // browser can disagree ("4,950" vs "4.950"), and since this line
            // is in the SSR'd HTML the mismatch is the React #418 hydration
            // error seen on prod /killerapp. en-US matches every other number
            // format in the app (see app-shell/config.ts fmtUsd).
            if (sqft) facts.push(`${Number(sqft).toLocaleString('en-US')} sq ft`);
            if (!facts.length) return null;
            return (
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--graphite)', opacity: 0.7 }}>
                {facts.join(' · ')}
              </p>
            );
          })()}

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
            ) : aiUnavailable ? (
              // 2026-06-02 / 2026-06-15 (fix 3): the take couldn't run (anon
              // 401, 5xx, network), there's nothing to summarize ('empty'), or
              // it timed out. Never leave the pulse spinning forever — say why.
              <div
                style={{
                  fontSize: 14,
                  color: 'var(--graphite)',
                  opacity: 0.75,
                }}
                aria-live="polite"
              >
                {aiUnavailable === 'auth' ? (
                  <>
                    <a
                      href={`/login?next=${encodeURIComponent(
                        window.location.pathname + window.location.search
                      )}`}
                      style={{ color: 'var(--brass, #B6873A)', textDecoration: 'underline' }}
                    >
                      Sign in
                    </a>{' '}
                    to see the AI take for this project.
                  </>
                ) : aiUnavailable === 'empty' ? (
                  <>
                    No AI take yet — this project doesn&rsquo;t have a description to summarize.
                    Pick a workflow below to get going.
                  </>
                ) : (
                  <>The AI take isn&rsquo;t available right now — it&rsquo;ll be here next visit.</>
                )}
              </div>
            ) : (
              // A take is genuinely in flight (auto-trigger / live stream). The
              // fix-3 effects above guarantee this pulse resolves to an honest
              // empty/error state and can't spin forever.
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
                  data-bkg-pulse
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: 'var(--brass, #B6873A)',
                    animation: 'bkg-spine-pulse 1.4s ease-in-out infinite',
                  }}
                />
                Running the numbers…
              </div>
            )}
          </div>

          {/* "Choose your next move" panel REMOVED (2026-06-15 redline, fix 1):
              it duplicated the workflow picker. The cockpit now shows ONE
              ordered workflow presentation — the 7-stage list (1→7) on the
              /killerapp page below — instead of this 3-stage subset plus that
              full list. The AI take stays here; workflow selection lives in the
              single demoted picker. */}
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
      @media (prefers-reduced-motion: reduce) {
        [data-bkg-pulse] { animation: none !important; }
      }
    `}</style>
  );
}

// NextStepLink / NEXT_STEP_GROUPS / NextStepCard were removed with the
// "Choose your next move" panel (2026-06-15 redline, fix 1 — de-double the IA).
// Workflow selection now lives in the single ordered 7-stage picker on the
// /killerapp page.
