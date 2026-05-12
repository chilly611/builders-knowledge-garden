'use client';

// Builder's Knowledge Garden — "Who's asking?" Client (Brief 1)
// Holds the capture state, listens for `bkg:crm:changed` to refresh, subscribes
// to journey-progress for the workflowId 'who-is-asking', renders the
// VoiceCaptureFAB + PhotoCaptureFAB, and shows a 30-second undo bar after each
// successful create (Time Machine primitive — Goal 5 / binding decision #2).

import { useCallback, useEffect, useRef, useState } from 'react';
import VoiceCaptureFAB from '@/components/crm/VoiceCaptureFAB';
import PhotoCaptureFAB from '@/components/crm/PhotoCaptureFAB';
import ContactCard from '@/components/crm/ContactCard';
import type { ContactWriteOkResult } from '@/lib/crm-spine';
import {
  emitJourneyEvent,
  resolveProjectId,
  subscribeJourney,
  type JourneyState,
} from '@/lib/journey-progress';

export interface InitialContact {
  id: string;
  firstName: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  lane?: string;
  lifecycleStage?: string;
  projectLocation?: string;
  source?: string;
  confidence?: number;
  lastContactAt?: string;
}

interface WhoIsAskingClientProps {
  initialContacts: InitialContact[];
  initialProjectId?: string;
}

interface UndoState {
  contactId: string;
  timeMachineHandle: string;
  expiresAt: number;
  label: string;
}

const UNDO_WINDOW_MS = 30_000;

export default function WhoIsAskingClient({
  initialContacts,
  initialProjectId,
}: WhoIsAskingClientProps): JSX.Element {
  const [contacts, setContacts] = useState<InitialContact[]>(initialContacts);
  const [proMode, setProMode] = useState<boolean>(false);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [completedOnce, setCompletedOnce] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const projectIdRef = useRef<string>(initialProjectId ?? 'default');

  // Resolve real project id on mount (avoid SSR mismatch).
  useEffect(() => {
    projectIdRef.current = initialProjectId ?? resolveProjectId();
    // Emit journey 'started' once.
    emitJourneyEvent({
      type: 'started',
      workflowId: 'who-is-asking',
      projectId: projectIdRef.current,
    });
  }, [initialProjectId]);

  // Subscribe to journey state — keeps Pro-Toggle status surfacing in sync.
  useEffect(() => {
    const unsub = subscribeJourney(projectIdRef.current, (_state: JourneyState) => {
      // No-op for v1; subscribing keeps the listener attached so future
      // surfaces can react without re-wiring.
    });
    return unsub;
  }, []);

  // Refresh list when any CRM write fires.
  const refreshList = useCallback(async () => {
    try {
      const url = new URL('/api/v1/crm', window.location.origin);
      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) return;
      const data = (await res.json()) as { contacts?: Array<Record<string, unknown>> };
      if (!data.contacts) return;
      const mapped: InitialContact[] = data.contacts.map((c) => ({
        id: String(c.id),
        firstName: String(c.first_name ?? 'Unknown'),
        lastName: c.last_name ? String(c.last_name) : undefined,
        company: c.company ? String(c.company) : undefined,
        email: c.email ? String(c.email) : undefined,
        phone: c.phone ? String(c.phone) : undefined,
        lane: c.lane ? String(c.lane) : undefined,
        lifecycleStage: c.lifecycle_stage ? String(c.lifecycle_stage) : 'lead',
        projectLocation: c.project_location ? String(c.project_location) : undefined,
        source: c.source ? String(c.source) : 'manual',
        confidence: typeof c.confidence === 'number' ? c.confidence : undefined,
        lastContactAt: c.last_contact_at ? String(c.last_contact_at) : undefined,
      }));
      setContacts(mapped);
    } catch (err) {
      console.debug('[who-is-asking] refresh skipped:', err);
    }
  }, []);

  useEffect(() => {
    const onChanged = () => {
      void refreshList();
    };
    window.addEventListener('bkg:crm:changed', onChanged as EventListener);
    return () => window.removeEventListener('bkg:crm:changed', onChanged as EventListener);
  }, [refreshList]);

  // Tick the undo timer.
  useEffect(() => {
    if (!undo) return;
    const id = window.setInterval(() => {
      if (Date.now() >= undo.expiresAt) {
        setUndo(null);
        window.clearInterval(id);
      } else {
        // force re-render for the countdown
        setUndo((u) => (u ? { ...u } : null));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [undo]);

  const handleCaptureSuccess = useCallback(
    (result: ContactWriteOkResult, label: string) => {
      setStatusMessage(`Saved: ${label}. Undo within 30s.`);
      setUndo({
        contactId: result.contactId,
        timeMachineHandle: result.timeMachineHandle,
        expiresAt: Date.now() + UNDO_WINDOW_MS,
        label,
      });
      if (!completedOnce) {
        emitJourneyEvent({
          type: 'completed',
          workflowId: 'who-is-asking',
          projectId: projectIdRef.current,
        });
        setCompletedOnce(true);
      }
      // List refresh is driven by the 'bkg:crm:changed' listener.
    },
    [completedOnce]
  );

  const handleUndo = useCallback(async () => {
    if (!undo) return;
    try {
      // Time Machine: mark archived=true via the existing PATCH endpoint.
      // (A dedicated /crm_undo endpoint with previous_state restore is a v2 follow-up.)
      const res = await fetch('/api/v1/crm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: undo.contactId, archived: true }),
      });
      if (res.ok) {
        setStatusMessage(`Undone: ${undo.label}.`);
        setUndo(null);
        void refreshList();
      }
    } catch (err) {
      console.error('[who-is-asking] undo failed:', err);
    }
  }, [undo, refreshList]);

  const handleCaptureError = useCallback((reason: string, detail?: string) => {
    setStatusMessage(`Could not save: ${reason}${detail ? ` (${detail})` : ''}`);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <main
      data-bkg-surface="who-is-asking"
      style={{
        minHeight: 'calc(100vh - 48px)',
        padding: '24px 16px 140px',
        maxWidth: 720,
        margin: '0 auto',
        color: 'var(--ink, #1A1A1A)',
        fontFamily: 'var(--font-body, "Archivo", system-ui, sans-serif)',
        position: 'relative',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
            fontSize: proMode ? 28 : 24,
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          {proMode ? 'Contacts' : "Who's asking, and what do I know about them?"}
        </h1>
        <button
          type="button"
          onClick={() => setProMode((p) => !p)}
          aria-pressed={proMode}
          style={{
            background: proMode ? '#1D9E75' : 'transparent',
            color: proMode ? '#FFF' : '#1D9E75',
            border: '1px solid #1D9E75',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Pro {proMode ? 'On' : 'Off'}
        </button>
      </header>

      {/* Inline JSON-LD: machine-legible per Goal 8. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: "Who's asking — recent contacts",
            itemListElement: contacts.slice(0, 10).map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'Person',
                '@id': `bkg:contact:${c.id}`,
                name: [c.firstName, c.lastName].filter(Boolean).join(' '),
                additionalType:
                  'https://builders.theknowledgegardens.com/schemas/bkg_contact',
              },
            })),
          }),
        }}
      />

      {contacts.length === 0 ? (
        <p
          style={{
            background: 'var(--paper, #FFFDF7)',
            border: '1px dashed #C9C2A6',
            padding: 20,
            borderRadius: 12,
            color: '#6B6655',
            fontSize: 15,
          }}
        >
          Snap a photo or hold the mic to add your first contact. They land here
          with name and address inferred — no form, no fields.
        </p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {contacts.map((c) => (
            <li key={c.id}>
              <ContactCard
                contact={{
                  id: c.id,
                  firstName: c.firstName,
                  lastName: c.lastName,
                  company: c.company,
                  email: c.email,
                  phone: c.phone,
                  lane: c.lane,
                  lifecycleStage: c.lifecycleStage,
                  projectLocation: c.projectLocation,
                  source: c.source,
                  confidence: c.confidence,
                  lastContactAt: c.lastContactAt,
                }}
                proMode={proMode}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Floating action zone */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          zIndex: 50,
        }}
      >
        <PhotoCaptureFAB
          projectId={projectIdRef.current}
          onSuccess={(r) => handleCaptureSuccess(r, 'photo')}
          onError={handleCaptureError}
        />
        <VoiceCaptureFAB
          projectId={projectIdRef.current}
          onSuccess={(r, transcript) => handleCaptureSuccess(r, transcript || 'voice note')}
          onError={handleCaptureError}
        />
      </div>

      {/* Status / undo bar */}
      {(statusMessage || undo) && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#1A1A1A',
            color: '#FFFDF7',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            zIndex: 60,
            fontSize: 14,
          }}
        >
          <span>{statusMessage}</span>
          {undo && (
            <button
              type="button"
              onClick={handleUndo}
              style={{
                background: '#B6873A', // brass
                color: '#1A1A1A',
                border: 'none',
                borderRadius: 999,
                padding: '8px 18px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Undo ({Math.max(0, Math.ceil((undo.expiresAt - Date.now()) / 1000))}s)
            </button>
          )}
        </div>
      )}
    </main>
  );
}
