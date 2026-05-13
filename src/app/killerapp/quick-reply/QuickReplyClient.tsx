'use client';

// Builder's Knowledge Garden — Quick Reply Client (Brief 2)
//
// Inbox of inbound messages + AI drafts. Thumb-tap Send queues the message
// with a 90-second undo bar; tap Undo to retract.
//
// Patterns reused from WhoIsAskingClient: Pro Toggle, journey-progress
// 'started' on mount, data-bkg-surface for global AI/MCP awareness,
// inline JSON-LD ItemList for machine-legibility.

import { useCallback, useEffect, useRef, useState } from 'react';
import InboundMessageCard from '@/components/crm/InboundMessageCard';
import UndoBar from '@/components/crm/UndoBar';
import {
  draftReply,
  listInboxMessages,
  sendReply,
  undoSendReply,
  type BkgMessage,
  type DraftReplyOkResult,
  type MessageTone,
} from '@/lib/crm-spine';
import {
  emitJourneyEvent,
  resolveProjectId,
  subscribeJourney,
  type JourneyState,
} from '@/lib/journey-progress';

export type InitialMessage = BkgMessage;

interface Props {
  initialMessages: InitialMessage[];
}

interface PendingUndo {
  messageId: string;
  expiresAt: number;
  label: string;
}

const UNDO_WINDOW_MS = 90 * 1000;

// ─── Palette ────────────────────────────────────────────────────────────────
const BRASS = '#B6873A';
const INK = '#1A1A1A';
const PAPER = '#FFFDF7';
const ROBIN = '#81D8D0';
const TRACE = '#F4F0E6';

/**
 * Pair each inbound message with the most recent outbound draft for the
 * same contact (status='drafted' or 'queued'). The inbox card renders the
 * pair as a single Invitation Card.
 */
interface InboxPair {
  inbound: BkgMessage;
  draft?: BkgMessage;
}

function pairInboundAndDrafts(messages: BkgMessage[]): InboxPair[] {
  const inbounds = messages.filter((m) => m.direction === 'inbound');
  const drafts = messages.filter(
    (m) =>
      m.direction === 'outbound' &&
      (m.status === 'drafted' || m.status === 'queued')
  );
  return inbounds.map((inbound) => {
    const candidate = drafts
      .filter((d) => d.contactId === inbound.contactId)
      .sort(
        (a, b) =>
          Date.parse(b.createdAt) - Date.parse(a.createdAt)
      )[0];
    return { inbound, draft: candidate };
  });
}

export default function QuickReplyClient({ initialMessages }: Props) {
  const [messages, setMessages] = useState<BkgMessage[]>(initialMessages);
  const [proMode, setProMode] = useState<boolean>(false);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const projectIdRef = useRef<string>('default');

  // Resolve real project id + emit journey 'started' once.
  useEffect(() => {
    projectIdRef.current = resolveProjectId();
    emitJourneyEvent({
      type: 'started',
      workflowId: 'quick-reply',
      projectId: projectIdRef.current,
    });
  }, []);

  useEffect(() => {
    const unsub = subscribeJourney(
      projectIdRef.current,
      (_state: JourneyState) => {
        // hook for future surfaces; no-op v1
      }
    );
    return unsub;
  }, []);

  // Refresh from /api/v1/crm/messages?inbox=1 whenever a draft or send fires.
  const refresh = useCallback(async () => {
    const fresh = await listInboxMessages();
    if (Array.isArray(fresh) && fresh.length >= 0) {
      setMessages(fresh);
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      void refresh();
    };
    window.addEventListener('bkg:crm:message:drafted', onChange as EventListener);
    window.addEventListener('bkg:crm:message:queued', onChange as EventListener);
    window.addEventListener('bkg:crm:message:undone', onChange as EventListener);
    window.addEventListener('bkg:crm:changed', onChange as EventListener);
    return () => {
      window.removeEventListener('bkg:crm:message:drafted', onChange as EventListener);
      window.removeEventListener('bkg:crm:message:queued', onChange as EventListener);
      window.removeEventListener('bkg:crm:message:undone', onChange as EventListener);
      window.removeEventListener('bkg:crm:changed', onChange as EventListener);
    };
  }, [refresh]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleDraft = useCallback(
    async (pair: InboxPair, tone?: MessageTone): Promise<DraftReplyOkResult | null> => {
      if (!pair.inbound.contactId) {
        setStatusMessage('Cannot draft — inbound has no linked contact.');
        return null;
      }
      const result = await draftReply({
        contactId: pair.inbound.contactId,
        inboundMessageId: pair.inbound.id,
        tone,
      });
      if (!result.ok) {
        setStatusMessage(
          `Couldn't draft: ${result.reason}${result.detail ? ` (${result.detail})` : ''}`
        );
        return null;
      }
      setStatusMessage(`Draft ready for ${pair.inbound.contactName ?? 'this contact'}.`);
      return result;
    },
    []
  );

  const handleSend = useCallback(
    async (pair: InboxPair, body?: string) => {
      if (!pair.draft) {
        setStatusMessage('Nothing to send — draft a reply first.');
        return;
      }
      const result = await sendReply({
        draftMessageId: pair.draft.id,
        body,
      });
      if (!result.ok) {
        setStatusMessage(
          `Couldn't send: ${result.reason}${result.detail ? ` (${result.detail})` : ''}`
        );
        return;
      }
      const label = pair.inbound.contactName ?? 'reply';
      setPendingUndo({
        messageId: result.messageId,
        expiresAt: Date.now() + UNDO_WINDOW_MS,
        label,
      });
      setStatusMessage(`Sending to ${label} — undo within 90s.`);
    },
    []
  );

  const handleUndo = useCallback(async () => {
    if (!pendingUndo) return;
    const result = await undoSendReply(pendingUndo.messageId);
    if (result.ok) {
      setStatusMessage('Send canceled.');
      setPendingUndo(null);
      void refresh();
    } else {
      setStatusMessage(
        result.reason === 'undo-window-expired'
          ? 'Too late — already sent.'
          : `Could not undo: ${result.reason}`
      );
      setPendingUndo(null);
    }
  }, [pendingUndo, refresh]);

  const handleExpire = useCallback(() => {
    setPendingUndo(null);
    setStatusMessage('Message sent.');
    void refresh();
  }, [refresh]);

  // ─── Render ─────────────────────────────────────────────────────────

  const pairs = pairInboundAndDrafts(messages);

  return (
    <main
      data-bkg-surface="quick-reply"
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
            color: INK,
          }}
        >
          {proMode ? 'Inbox' : 'Quick reply'}
        </h1>
        <button
          type="button"
          onClick={() => setProMode((p) => !p)}
          aria-pressed={proMode}
          style={{
            background: proMode ? BRASS : 'transparent',
            color: proMode ? PAPER : BRASS,
            border: `1px solid ${BRASS}`,
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Pro: {proMode ? 'on' : 'off'}
        </button>
      </header>

      {/* Machine-legible inline ItemList. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Quick Reply — inbox',
            itemListElement: pairs.slice(0, 20).map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'Message',
                '@id': `bkg:message:${p.inbound.id}`,
                text: p.inbound.body,
                sender: {
                  '@type': 'Person',
                  name: p.inbound.contactName ?? 'Unknown',
                },
              },
            })),
          }),
        }}
      />

      {pairs.length === 0 && (
        <div
          style={{
            background: TRACE,
            border: '1px dashed #C9C2A6',
            padding: 20,
            borderRadius: 12,
            color: '#6B6655',
            fontSize: 15,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <p style={{ margin: 0 }}>
            No messages waiting. When someone texts you, drafts appear here.
          </p>
          {proMode && (
            <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>
              Configure your Twilio number in env to receive inbound SMS.
            </p>
          )}
        </div>
      )}

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '16px 0 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {pairs.map((pair) => (
          <li key={pair.inbound.id}>
            <InboundMessageCard
              inbound={pair.inbound}
              draft={pair.draft}
              proMode={proMode}
              onDraft={(tone) => handleDraft(pair, tone)}
              onSend={(body) => handleSend(pair, body)}
            />
          </li>
        ))}
      </ul>

      {statusMessage && !pendingUndo && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: INK,
            color: PAPER,
            padding: '12px 16px',
            zIndex: 60,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage('')}
            aria-label="dismiss"
            style={{
              background: 'transparent',
              border: 'none',
              color: ROBIN,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            dismiss
          </button>
        </div>
      )}

      {pendingUndo && (
        <UndoBar
          messageId={pendingUndo.messageId}
          expiresAt={pendingUndo.expiresAt}
          label={pendingUndo.label}
          onUndo={handleUndo}
          onExpire={handleExpire}
        />
      )}
    </main>
  );
}
