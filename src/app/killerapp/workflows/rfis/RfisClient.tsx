'use client';

/**
 * RfisClient — two-panel RFI list/detail UI for /killerapp/workflows/rfis.
 *
 * Consumes /api/v1/rfis:
 *   - GET ?projectId=<id> → array of RFIs (auth required)
 *   - POST { projectId, subject, description?, assigned_to?, priority?, due_date? }
 *
 * The route is auth-gated and lets through:
 *   - the owner of command_center_projects.user_id === auth.uid()
 *   - any signed-in user when projectId is in the 3-project DEMO_PROJECT_IDS allowlist
 *   - any signed-in user when projectId === user_metadata.demo_project_id (trial accounts)
 *
 * Photos: handled by the existing AttachmentSection / AttachmentUploader
 * pipeline (workflow-scoped attachments, separate from `project_rfis` rows).
 * RFI subject acts as the stepId so each RFI's photo grid is scoped to it.
 *
 * Voice: useSpeechRecognition hook (Web Speech API) appends to description.
 *
 * Layout: two-panel desktop (list left / detail right). Mobile <640px stacks
 * vertically — list visible by default, detail expands when an RFI is opened
 * or "New RFI" is tapped.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import AttachmentSection from '@/components/AttachmentSection';

interface Rfi {
  id: string;
  project_id: string;
  number: number;
  subject: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  assigned_to: string | null;
  due_date: string | null;
  answer: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type StatusFilter = 'all' | 'open' | 'responded' | 'closed';

// Marin / ADU / Commercial TI — same allowlist the API uses. We default to
// Marin so an unauth'd visitor still gets *something* to look at (auth-gated
// fetches will fail noisily, but the layout is intact).
const DEFAULT_PROJECT_ID = '55730cd3-5225-493d-8b5c-49086d942565';

// Open + responded both count as "in flight" for the days-open ticker.
const OPEN_STATUSES = new Set(['draft', 'open', 'responded']);

async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

function daysOpen(createdAt: string | null): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  const now = Date.now();
  return Math.max(0, Math.floor((now - created) / (24 * 60 * 60 * 1000)));
}

function statusChipColors(status: string | null): {
  bg: string;
  fg: string;
  border: string;
} {
  const s = (status || 'draft').toLowerCase();
  if (s === 'responded') return { bg: '#E6F2EC', fg: '#1D6E50', border: '#9EC8B2' };
  if (s === 'closed') return { bg: '#E7E2D5', fg: '#4A4133', border: '#C9C3B3' };
  if (s === 'open') return { bg: '#FCEFD9', fg: '#8A5A1A', border: '#E0BD7A' };
  // draft / unknown
  return { bg: '#F1ECE0', fg: '#5A5240', border: '#C9C3B3' };
}

export default function RfisClient() {
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('project');
  const projectId = urlProjectId || DEFAULT_PROJECT_ID;

  const [rfis, setRfis] = useState<Rfi[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // selection: a row id, or 'new' for create mode
  const [selectedId, setSelectedId] = useState<string | 'new' | null>('new');

  // create-form state
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [specRef, setSpecRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // voice
  const {
    supported: voiceSupported,
    listening,
    transcript,
    interimTranscript,
    start: startVoice,
    stop: stopVoice,
    reset: resetVoice,
  } = useSpeechRecognition();

  // Append final voice transcripts onto the description textarea.
  useEffect(() => {
    if (transcript) {
      setDescription((prev) =>
        prev ? `${prev.trimEnd()} ${transcript.trim()}` : transcript.trim()
      );
      resetVoice();
    }
  }, [transcript, resetVoice]);

  const loadRfis = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await authedFetch(
        `/api/v1/rfis?projectId=${encodeURIComponent(projectId)}`
      );
      if (!res.ok) {
        if (res.status === 401) {
          setLoadError('Sign in (top right) to load RFIs for this project.');
        } else if (res.status === 403) {
          setLoadError("This project isn't yours, or you're not on the demo allowlist.");
        } else {
          const body = await res.json().catch(() => ({}));
          setLoadError(body.error || `Failed to load (${res.status})`);
        }
        setRfis([]);
        return;
      }
      const data = (await res.json()) as Rfi[];
      setRfis(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load RFIs.');
      setRfis([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadRfis();
  }, [loadRfis]);

  const visibleRfis = useMemo(() => {
    if (statusFilter === 'all') return rfis;
    return rfis.filter((r) => {
      const s = (r.status || 'draft').toLowerCase();
      if (statusFilter === 'open') return s === 'draft' || s === 'open';
      if (statusFilter === 'responded') return s === 'responded';
      if (statusFilter === 'closed') return s === 'closed';
      return true;
    });
  }, [rfis, statusFilter]);

  const selectedRfi = useMemo(
    () => (selectedId && selectedId !== 'new'
      ? rfis.find((r) => r.id === selectedId) ?? null
      : null),
    [rfis, selectedId]
  );

  const openCount = useMemo(
    () =>
      rfis.filter((r) => OPEN_STATUSES.has((r.status || 'draft').toLowerCase()))
        .length,
    [rfis]
  );

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setAssignedTo('');
    setPriority('medium');
    setSpecRef('');
    setSubmitError(null);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!subject.trim()) {
      setSubmitError('Subject is required.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    // Combine spec reference into description for now — the table has no
    // separate column for it and we don't want to overload `linked_entities`
    // in the very first version.
    const fullDescription = specRef.trim()
      ? `${description.trim()}\n\nSpec / drawing reference: ${specRef.trim()}`
      : description.trim();

    try {
      const res = await authedFetch('/api/v1/rfis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          subject: subject.trim(),
          description: fullDescription || null,
          assigned_to: assignedTo.trim() || null,
          priority,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSubmitError(body.error || `Submit failed (${res.status})`);
        return;
      }
      const created = (await res.json()) as Rfi;
      // Optimistic insert at top, then reload to pick up server-side fields.
      setRfis((prev) => [created, ...prev]);
      resetForm();
      setSelectedId(created.id);
      // Re-fetch in background to settle.
      void loadRfis();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── styles ──────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = {
    maxWidth: 1180,
    margin: '0 auto',
    padding: '24px 20px 80px',
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Inter", "Helvetica Neue", sans-serif',
    color: '#2E2E30',
  };

  const headerBar: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 20,
  };

  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 360px) 1fr',
    gap: 20,
  };

  return (
    <main style={wrap}>
      <style>{`
        @media (max-width: 640px) {
          .rfis-grid { grid-template-columns: 1fr !important; }
          .rfis-list-panel { max-height: ${selectedId ? '180px' : 'none'}; overflow: auto; }
        }
        .rfis-row:hover { background: #F4F0E6; }
        .rfis-row[data-active="true"] { background: #EAE1CB; border-color: #B6873A; }
        .rfis-tab[data-active="true"] {
          background: #1B3B5E; color: white; border-color: #1B3B5E;
        }
        .rfis-btn-primary { background: #B6873A; color: white; border: none; }
        .rfis-btn-primary:hover:not(:disabled) { background: #9E6F2F; }
        .rfis-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
        .rfis-mic-active { background: #D9642E !important; color: white !important; }
      `}</style>

      <div style={headerBar}>
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#B6873A',
              marginBottom: 4,
            }}
          >
            Build · Submit RFIs
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
              color: '#1B3B5E',
              letterSpacing: '-0.01em',
            }}
          >
            Ask the design team
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, opacity: 0.75 }}>
            Photos, voice, and a clock so nothing sits unanswered.
          </p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              opacity: 0.6,
              marginBottom: 2,
            }}
          >
            Awaiting response
          </div>
          <div
            style={{ fontSize: 22, fontWeight: 700, color: openCount > 0 ? '#D9642E' : '#1D6E50' }}
          >
            {openCount}
          </div>
        </div>
      </div>

      <div style={grid} className="rfis-grid">
        {/* LEFT — list */}
        <section
          className="rfis-list-panel"
          style={{
            border: '1px solid #C9C3B3',
            borderRadius: 12,
            background: '#FDF8F0',
            padding: 12,
          }}
        >
          {/* filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {(['all', 'open', 'responded', 'closed'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                className="rfis-tab"
                data-active={statusFilter === f}
                onClick={() => setStatusFilter(f)}
                style={{
                  fontSize: 12,
                  padding: '8px 12px',
                  minHeight: 36,
                  borderRadius: 999,
                  border: '1px solid #C9C3B3',
                  background: 'transparent',
                  color: '#2E2E30',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setSelectedId('new');
            }}
            className="rfis-btn-primary"
            style={{
              width: '100%',
              padding: '12px 16px',
              minHeight: 44,
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            + New RFI
          </button>

          {loading && (
            <p style={{ fontSize: 13, opacity: 0.7, margin: '8px 4px' }}>Loading…</p>
          )}
          {loadError && (
            <p style={{ fontSize: 13, color: '#A1473A', margin: '8px 4px' }}>
              {loadError}
            </p>
          )}
          {!loading && !loadError && visibleRfis.length === 0 && (
            <p style={{ fontSize: 13, opacity: 0.7, margin: '8px 4px' }}>
              No RFIs yet — tap “New RFI” to ask the design team a question.
            </p>
          )}

          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {visibleRfis.map((rfi) => {
              const chip = statusChipColors(rfi.status);
              const days = daysOpen(rfi.created_at);
              const active = selectedId === rfi.id;
              return (
                <li key={rfi.id} style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    className="rfis-row"
                    data-active={active}
                    onClick={() => setSelectedId(rfi.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 12,
                      minHeight: 64,
                      borderRadius: 10,
                      border: '1px solid #C9C3B3',
                      background: 'white',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          opacity: 0.6,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        RFI #{rfi.number}
                      </span>
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: chip.bg,
                          color: chip.fg,
                          border: `1px solid ${chip.border}`,
                          textTransform: 'capitalize',
                        }}
                      >
                        {rfi.status || 'draft'}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#1B3B5E',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rfi.subject}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.7,
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>{rfi.assigned_to || 'unassigned'}</span>
                      <span style={{ opacity: 0.6 }}>·</span>
                      <span>
                        {days} day{days === 1 ? '' : 's'} open
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* RIGHT — detail / create */}
        <section
          style={{
            border: '1px solid #C9C3B3',
            borderRadius: 12,
            background: '#FDF8F0',
            padding: 20,
            minHeight: 320,
          }}
        >
          {selectedId === 'new' && (
            <CreateRfiForm
              subject={subject}
              setSubject={setSubject}
              description={description}
              setDescription={setDescription}
              interimTranscript={interimTranscript}
              voiceSupported={voiceSupported}
              listening={listening}
              startVoice={startVoice}
              stopVoice={stopVoice}
              assignedTo={assignedTo}
              setAssignedTo={setAssignedTo}
              priority={priority}
              setPriority={setPriority}
              specRef={specRef}
              setSpecRef={setSpecRef}
              submitting={submitting}
              submitError={submitError}
              onSubmit={handleCreate}
              projectId={projectId}
            />
          )}

          {selectedRfi && (
            <DetailView rfi={selectedRfi} projectId={projectId} />
          )}

          {!selectedId && (
            <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>
              Pick an RFI on the left, or start a new one.
            </p>
          )}
        </section>
      </div>

      <p
        style={{
          fontSize: 12,
          opacity: 0.6,
          marginTop: 20,
          textAlign: 'center',
        }}
      >
        Project: <code>{projectId}</code> ·{' '}
        <Link
          href={`/killerapp${urlProjectId ? `?project=${encodeURIComponent(urlProjectId)}` : ''}`}
          style={{ color: '#1B3B5E' }}
        >
          back to workflow picker
        </Link>
      </p>
    </main>
  );
}

// ── subcomponents ─────────────────────────────────────────────────────

interface CreateProps {
  subject: string;
  setSubject: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  interimTranscript: string;
  voiceSupported: boolean;
  listening: boolean;
  startVoice: () => void;
  stopVoice: () => void;
  assignedTo: string;
  setAssignedTo: (v: string) => void;
  priority: 'low' | 'medium' | 'high';
  setPriority: (v: 'low' | 'medium' | 'high') => void;
  specRef: string;
  setSpecRef: (v: string) => void;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (e: FormEvent) => void;
  projectId: string;
}

function CreateRfiForm(p: CreateProps) {
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#B6873A',
    marginBottom: 6,
    fontWeight: 600,
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    minHeight: 44,
    fontSize: 15,
    border: '1px solid #C9C3B3',
    borderRadius: 8,
    background: 'white',
    color: '#2E2E30',
    fontFamily: 'inherit',
  };

  return (
    <form onSubmit={p.onSubmit} noValidate>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          margin: '0 0 16px',
          color: '#1B3B5E',
        }}
      >
        New RFI
      </h2>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="rfi-subject">
          Subject *
        </label>
        <input
          id="rfi-subject"
          type="text"
          value={p.subject}
          onChange={(e) => p.setSubject(e.target.value)}
          placeholder='e.g. "Beam pocket detail on north wall"'
          style={inputStyle}
          required
          maxLength={200}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="rfi-description">
          What's the question?
        </label>
        <div style={{ position: 'relative' }}>
          <textarea
            id="rfi-description"
            value={p.description}
            onChange={(e) => p.setDescription(e.target.value)}
            placeholder="Describe what's unclear. Reference sheet numbers, dimensions, materials."
            rows={5}
            style={{
              ...inputStyle,
              minHeight: 120,
              paddingRight: 60,
              resize: 'vertical',
            }}
          />
          {p.voiceSupported && (
            <button
              type="button"
              onClick={() => (p.listening ? p.stopVoice() : p.startVoice())}
              className={p.listening ? 'rfis-mic-active' : ''}
              title={p.listening ? 'Stop' : 'Dictate'}
              aria-label={p.listening ? 'Stop dictation' : 'Start dictation'}
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '1px solid #C9C3B3',
                background: 'white',
                cursor: 'pointer',
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {p.listening ? '⏺' : '🎤'}
            </button>
          )}
        </div>
        {p.listening && (
          <p
            style={{
              fontSize: 12,
              color: '#D9642E',
              margin: '6px 0 0',
              fontStyle: 'italic',
            }}
          >
            {p.interimTranscript || 'Listening…'}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <label style={labelStyle} htmlFor="rfi-assigned">
            Assignee
          </label>
          <input
            id="rfi-assigned"
            type="text"
            value={p.assignedTo}
            onChange={(e) => p.setAssignedTo(e.target.value)}
            placeholder="Architect / engineer / owner"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="rfi-priority">
            Priority
          </label>
          <select
            id="rfi-priority"
            value={p.priority}
            onChange={(e) =>
              p.setPriority(e.target.value as 'low' | 'medium' | 'high')
            }
            style={inputStyle}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High — blocking work</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle} htmlFor="rfi-spec">
          Spec / drawing reference
        </label>
        <input
          id="rfi-spec"
          type="text"
          value={p.specRef}
          onChange={(e) => p.setSpecRef(e.target.value)}
          placeholder="A-501 / spec 06 10 00 / detail 3/A-302"
          style={inputStyle}
        />
      </div>

      {/* Photos — uses the workflow-scoped attachments system. The stepId
          stays stable ("rfi-create") so all pre-submit photos cluster
          together. Post-submit we'd ideally re-key on the new RFI id; for
          v1 we leave them on the create-step bucket. */}
      <AttachmentSection
        projectId={p.projectId}
        workflowId="q-rfi"
        stepId="rfi-create"
        title="Attach photos"
        subtitle="Snap what you're looking at — rear-camera capture stays on this RFI."
      />

      {p.submitError && (
        <p
          style={{
            background: '#FBE9E5',
            border: '1px solid #E0A399',
            color: '#A1473A',
            padding: 10,
            borderRadius: 8,
            margin: '12px 0',
            fontSize: 13,
          }}
        >
          {p.submitError}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button
          type="submit"
          className="rfis-btn-primary"
          disabled={p.submitting || !p.subject.trim()}
          style={{
            padding: '12px 20px',
            minHeight: 44,
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: p.submitting ? 'wait' : 'pointer',
          }}
        >
          {p.submitting ? 'Submitting…' : 'Submit RFI'}
        </button>
      </div>
    </form>
  );
}

function DetailView({ rfi, projectId }: { rfi: Rfi; projectId: string }) {
  const chip = statusChipColors(rfi.status);
  const days = daysOpen(rfi.created_at);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 11,
            opacity: 0.6,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          RFI #{rfi.number}
        </span>
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 999,
            background: chip.bg,
            color: chip.fg,
            border: `1px solid ${chip.border}`,
            textTransform: 'capitalize',
          }}
        >
          {rfi.status || 'draft'}
        </span>
        <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 'auto' }}>
          {days} day{days === 1 ? '' : 's'} open
        </span>
      </div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: '0 0 12px',
          color: '#1B3B5E',
        }}
      >
        {rfi.subject}
      </h2>

      <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <Field label="Assignee" value={rfi.assigned_to || 'unassigned'} />
        <Field
          label="Priority"
          value={(rfi.priority || 'medium').toString()}
        />
        {rfi.due_date && <Field label="Due date" value={rfi.due_date} />}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: '#B6873A',
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          Question
        </div>
        <div
          style={{
            background: 'white',
            border: '1px solid #C9C3B3',
            borderRadius: 8,
            padding: 12,
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {rfi.description || (
            <span style={{ opacity: 0.6 }}>No description provided.</span>
          )}
        </div>
      </div>

      {rfi.answer && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: '#1D6E50',
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            Response
          </div>
          <div
            style={{
              background: '#E6F2EC',
              border: '1px solid #9EC8B2',
              borderRadius: 8,
              padding: 12,
              whiteSpace: 'pre-wrap',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {rfi.answer}
          </div>
        </div>
      )}

      {/* Photos attached during creation — read-only view. */}
      <AttachmentSection
        projectId={projectId}
        workflowId="q-rfi"
        stepId="rfi-create"
        title="Attached photos"
        subtitle="Photos snapped when this RFI was filed."
      />

      <p style={{ fontSize: 12, opacity: 0.6, marginTop: 16 }}>
        Filed {rfi.created_at ? new Date(rfi.created_at).toLocaleString() : '—'}.
        Response + close-out wiring is on the next iteration — for now the
        design team replies via email and the GC marks it closed in the DB.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
      <span
        style={{
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: '#B6873A',
          fontWeight: 600,
          minWidth: 80,
        }}
      >
        {label}
      </span>
      <span style={{ color: '#2E2E30' }}>{value}</span>
    </div>
  );
}
