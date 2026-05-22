'use client';

/**
 * ApprovalsClient — Owner's inbox of pending signatures.
 *
 * Gated by LaneGate allow={['owner']} so a GC who lands here sees a
 * polite "this is the owner view" notice. (The endpoint itself does NOT
 * gate by lane — anyone in required_signers can act — because a GC also
 * has signatures to chase. But the page label and copy is owner-centric.)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import LaneGate from '@/components/LaneGate';
import { useRealtimeChannel } from '@/lib/use-realtime-channel';

interface RequiredSigner {
  role: string;
  email?: string;
  user_id?: string;
}

interface SignedDocument {
  id: string;
  project_id: string;
  document_type: string;
  document_hash: string;
  pdf_url: string | null;
  title: string | null;
  status: string;
  required_signers: RequiredSigner[];
  created_by: string | null;
  created_at: string;
  finalized_at: string | null;
}

function daysOpen(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function titleFor(doc: SignedDocument): string {
  if (doc.title) return doc.title;
  switch (doc.document_type) {
    case 'change_order':
      return 'Change order';
    case 'draw_request':
      return 'Draw request';
    case 'lien_waiver':
      return 'Lien waiver';
    default:
      return doc.document_type;
  }
}

export default function ApprovalsClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SignedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch('/api/v1/signatures', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load approvals.');
        setItems([]);
      } else {
        setItems(json.signatures ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // REALTIME (2026-05-22): the approvals inbox should flip pending → signed
  // the instant any required signer puts ink on the document. Both tables
  // matter — `signature_events` (individual signatures) AND `signed_documents`
  // (the parent row, status moves to 'completed' when all signers are in).
  // Debounced because a single CO can fire two events back-to-back (owner
  // signs → status updates) and we'd rather coalesce.
  const refetchTimerRef = useRef<number | null>(null);
  const debouncedLoad = useCallback(() => {
    if (refetchTimerRef.current) window.clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = window.setTimeout(() => {
      void load();
    }, 500);
  }, []);
  useRealtimeChannel({ table: 'signature_events' }, debouncedLoad);
  useRealtimeChannel({ table: 'signed_documents' }, debouncedLoad);
  useEffect(() => () => {
    if (refetchTimerRef.current) window.clearTimeout(refetchTimerRef.current);
  }, []);

  async function rejectOne(id: string) {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const res = await fetch(`/api/v1/signatures/${id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reason: rejectReason }),
    });
    if (res.ok) {
      setRejecting(null);
      setRejectReason('');
      void load();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Reject failed.');
    }
  }

  return (
    <LaneGate
      allow={['owner', 'gc']}
      fallback={
        <div style={{ padding: 24, color: '#374151' }}>
          The Approvals inbox is for owners and GCs. Switch to a project where
          you hold one of those roles to see pending signatures.
        </div>
      }
    >
      <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          Approvals
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
          Change orders, draw requests, and lien waivers awaiting your sign-off.
          Every action here is recorded with your IP, timestamp, and the
          document hash — this is the project's system of record.
        </p>

        {loading && <div>Loading…</div>}
        {error && (
          <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>
        )}
        {!loading && items.length === 0 && (
          <div
            style={{
              padding: 24,
              background: '#f9fafb',
              borderRadius: 8,
              color: '#6b7280',
              textAlign: 'center',
            }}
          >
            Nothing waiting on you. New change orders and draws will appear here.
          </div>
        )}

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((doc) => (
            <li
              key={doc.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: '#0f766e',
                      fontWeight: 600,
                    }}
                  >
                    {doc.document_type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {titleFor(doc)}
                  </div>
                  <div
                    style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}
                  >
                    Project{' '}
                    <code style={{ fontSize: 11 }}>
                      {doc.project_id.slice(0, 8)}
                    </code>{' '}
                    · Open {daysOpen(doc.created_at)}d · Signers:{' '}
                    {(doc.required_signers ?? [])
                      .map((s) => `${s.role}${s.email ? ` (${s.email})` : ''}`)
                      .join(', ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link
                    href={`/killerapp/sign/${doc.id}`}
                    style={{
                      padding: '6px 12px',
                      background: '#0f766e',
                      color: '#ffffff',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Review &amp; sign
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      setRejecting(rejecting === doc.id ? null : doc.id)
                    }
                    style={{
                      padding: '6px 12px',
                      background: '#ffffff',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {rejecting === doc.id && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 8,
                    padding: 12,
                    background: '#fef2f2',
                    borderRadius: 6,
                  }}
                >
                  <label style={{ fontSize: 12, color: '#7f1d1d' }}>
                    Reason for rejection (optional but recommended)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: 8,
                      fontSize: 13,
                      border: '1px solid #fecaca',
                      borderRadius: 4,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => rejectOne(doc.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#b91c1c',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Confirm rejection
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejecting(null);
                        setRejectReason('');
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#ffffff',
                        color: '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </LaneGate>
  );
}
