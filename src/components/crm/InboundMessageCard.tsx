'use client';

// Builder's Knowledge Garden — InboundMessageCard (Brief 2)
//
// Invitation Card for an inbound message + its AI draft. Shows:
//   - contact face/initials, lifecycle stage chip
//   - inbound message body (gentle, trace-paper background)
//   - if no draft yet: "Tap to draft a reply" button (warm-tone default)
//   - if drafted: AI draft in brass-tinted chip, tone chips, Send (big),
//     Edit (small)
//
// Pro Mode reveals: voice-match score, intent tags, reasoning trace,
// commitment / price warnings.

import { useEffect, useMemo, useState } from 'react';
import VoiceTone from './VoiceTone';
import type {
  BkgMessage,
  DraftReplyOkResult,
  MessageTone,
} from '@/lib/crm-spine';

const BRASS = '#B6873A';
const ROBIN = '#81D8D0';
const INK = '#1A1A1A';
const PAPER = '#FFFDF7';
const TRACE = '#F4F0E6';
const GRAPHITE = '#2E2E30';
const RED = '#E8443A';

interface Props {
  inbound: BkgMessage;
  draft?: BkgMessage;
  proMode?: boolean;
  onDraft: (tone?: MessageTone) => Promise<DraftReplyOkResult | null>;
  onSend: (body?: string) => Promise<void>;
}

function initialsFromName(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

function timeAgo(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function InboundMessageCard({
  inbound,
  draft,
  proMode = false,
  onDraft,
  onSend,
}: Props) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [tone, setTone] = useState<MessageTone>(
    (draft?.aiTone as MessageTone | undefined) ?? 'warm'
  );
  const [drafting, setDrafting] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editBody, setEditBody] = useState<string>(draft?.body ?? '');

  useEffect(() => {
    setEditBody(draft?.body ?? '');
  }, [draft?.body]);

  const initials = useMemo(
    () => initialsFromName(inbound.contactName ?? inbound.body),
    [inbound.contactName, inbound.body]
  );

  const handleDraft = async (nextTone?: MessageTone) => {
    setDrafting(true);
    try {
      const result = await onDraft(nextTone ?? tone);
      if (result) {
        setTone(result.toneUsed);
      }
    } finally {
      setDrafting(false);
    }
  };

  const handleToneChange = async (next: MessageTone) => {
    setTone(next);
    if (draft) {
      // Re-draft with the new tone.
      await handleDraft(next);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend(editMode && editBody.trim() !== (draft?.body ?? '') ? editBody : undefined);
      setEditMode(false);
    } finally {
      setSending(false);
    }
  };

  const queued = draft?.status === 'queued';
  const containsCommitment = draft?.containsCommitment ?? false;
  const containsPrice = draft?.containsPrice ?? false;

  return (
    <article
      data-bkg-card="inbound-message"
      data-bkg-message-id={inbound.id}
      style={{
        background: PAPER,
        border: '1px solid #E4DCC4',
        borderRadius: 14,
        padding: 14,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header: avatar + name + lifecycle + time */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: BRASS,
            color: PAPER,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 0.5,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: INK,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {inbound.contactName ?? 'Unknown'}
          </div>
          <div style={{ fontSize: 12, color: GRAPHITE }}>
            {inbound.contactLifecycleStage
              ? `${inbound.contactLifecycleStage} · `
              : ''}
            {timeAgo(inbound.createdAt)}
          </div>
        </div>
      </header>

      {/* Inbound body */}
      <div
        style={{
          background: TRACE,
          border: '1px solid #E4DCC4',
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 15,
          lineHeight: 1.4,
          color: INK,
          whiteSpace: 'pre-wrap',
        }}
      >
        {inbound.body}
      </div>

      {/* Draft area */}
      {!draft && (
        <button
          type="button"
          onClick={() => handleDraft()}
          disabled={drafting}
          style={{
            background: BRASS,
            color: PAPER,
            border: 'none',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 15,
            fontWeight: 700,
            cursor: drafting ? 'wait' : 'pointer',
          }}
        >
          {drafting ? 'Drafting…' : 'Tap to draft a reply'}
        </button>
      )}

      {draft && (
        <>
          {/* Tone chips */}
          <VoiceTone
            value={tone === 'custom' ? 'warm' : tone}
            onChange={(t) => void handleToneChange(t)}
            disabled={drafting || sending || queued}
          />

          {/* Draft body */}
          {editMode ? (
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={3}
              style={{
                background: '#FFF8E6',
                border: `1px solid ${BRASS}`,
                borderRadius: 10,
                padding: 10,
                fontSize: 15,
                lineHeight: 1.4,
                color: INK,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          ) : (
            <div
              role="textbox"
              aria-readonly="true"
              style={{
                background: '#FFF8E6',
                border: `1px solid ${BRASS}`,
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 15,
                lineHeight: 1.4,
                color: INK,
                whiteSpace: 'pre-wrap',
                position: 'relative',
              }}
            >
              {draft.body}
              {queued && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 8,
                    fontSize: 11,
                    color: BRASS,
                    fontWeight: 700,
                  }}
                >
                  Sending…
                </span>
              )}
            </div>
          )}

          {/* Warnings */}
          {(containsCommitment || containsPrice) && (
            <div
              style={{
                fontSize: 12,
                color: RED,
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {containsCommitment && <span>⚠ Commits you to something</span>}
              {containsPrice && <span>⚠ Mentions a price</span>}
            </div>
          )}

          {/* Pro details */}
          {proMode && (
            <div
              style={{
                fontSize: 12,
                color: GRAPHITE,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                background: TRACE,
                padding: '8px 10px',
                borderRadius: 8,
              }}
            >
              {draft.reasoning && (
                <div>
                  <strong>Why:</strong> {draft.reasoning}
                </div>
              )}
              {typeof draft.voiceMatchScore === 'number' && (
                <div>
                  <strong>Voice match:</strong>{' '}
                  {(draft.voiceMatchScore * 100).toFixed(0)}%
                </div>
              )}
              {draft.intentTags && draft.intentTags.length > 0 && (
                <div>
                  <strong>Intent:</strong> {draft.intentTags.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Action row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || queued}
              style={{
                flex: 1,
                background: queued ? GRAPHITE : ROBIN,
                color: INK,
                border: 'none',
                borderRadius: 10,
                padding: '14px 16px',
                fontSize: 16,
                fontWeight: 800,
                cursor: sending || queued ? 'wait' : 'pointer',
              }}
            >
              {queued
                ? 'Queued (90s window)'
                : sending
                  ? 'Sending…'
                  : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => setEditMode((e) => !e)}
              disabled={queued}
              style={{
                background: 'transparent',
                color: BRASS,
                border: `1px solid ${BRASS}`,
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: 700,
                cursor: queued ? 'not-allowed' : 'pointer',
              }}
            >
              {editMode ? 'Stop editing' : 'Edit'}
            </button>
          </div>
        </>
      )}

      {/* Expand affordance — progressive reveal of thread context (v1: no-op placeholder) */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        style={{
          background: 'transparent',
          border: 'none',
          color: GRAPHITE,
          fontSize: 12,
          cursor: 'pointer',
          alignSelf: 'flex-start',
          padding: 0,
        }}
      >
        {expanded ? '▴ hide details' : '▾ show details'}
      </button>
      {expanded && (
        <div style={{ fontSize: 12, color: GRAPHITE }}>
          <div>
            <strong>Inbound ID:</strong> {inbound.id}
          </div>
          {draft && (
            <div>
              <strong>Draft ID:</strong> {draft.id}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
