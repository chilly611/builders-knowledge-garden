'use client';

/**
 * SignPageClient — UI for /killerapp/sign/[id].
 *
 * Loads the signed_documents row, identifies the caller's matching
 * required_signer (by user_id or email), shows the PDF preview, and
 * mounts SignatureCapture for that role. If the caller is not a
 * required signer, shows a "you can't sign this" notice.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import SignatureCapture from '@/components/SignatureCapture';

interface RequiredSigner {
  role: string;
  email?: string;
  user_id?: string;
  name?: string;
}

interface SignedDocument {
  id: string;
  project_id: string;
  document_type: string;
  document_id: string | null;
  document_hash: string;
  pdf_url: string | null;
  title: string | null;
  status: string;
  required_signers: RequiredSigner[];
  created_at: string;
  finalized_at: string | null;
}

interface SignatureEvent {
  id: string;
  signer_user_id: string | null;
  signer_email: string | null;
  signer_role: string;
  signature_method: string;
  signed_at: string;
}

export default function SignPageClient({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<SignedDocument | null>(null);
  const [events, setEvents] = useState<SignatureEvent[]>([]);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [matchedRole, setMatchedRole] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const u = userData.user;
      if (!u) {
        setError('Please log in to view this document.');
        setLoading(false);
        return;
      }
      setUser({ id: u.id, email: u.email ?? '' });

      const { data: docData, error: docErr } = await supabase
        .from('signed_documents')
        .select('*')
        .eq('id', id)
        .single();
      if (docErr || !docData) {
        setError('Document not found.');
        setLoading(false);
        return;
      }
      setDoc(docData as SignedDocument);

      const { data: evData } = await supabase
        .from('signature_events')
        .select('id, signer_user_id, signer_email, signer_role, signature_method, signed_at')
        .eq('signed_document_id', id)
        .order('signed_at', { ascending: true });
      setEvents((evData ?? []) as SignatureEvent[]);

      const required = (docData.required_signers ?? []) as RequiredSigner[];
      const callerEmail = u.email?.toLowerCase() ?? '';
      const match = required.find(
        (s) =>
          (s.user_id && s.user_id === u.id) ||
          (s.email && s.email.toLowerCase() === callerEmail)
      );
      setMatchedRole(match?.role ?? null);

      const already = (evData ?? []).some(
        (ev) =>
          ev.signer_user_id === u.id ||
          (ev.signer_email && ev.signer_email.toLowerCase() === callerEmail)
      );
      setAlreadySigned(already);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }
  if (error) {
    return <div style={{ padding: 24, color: '#b91c1c' }}>{error}</div>;
  }
  if (!doc) return null;

  const totalSigners = (doc.required_signers ?? []).length;
  const signedCount = events.length;

  return (
    <div style={{ padding: 24, maxWidth: 880, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <a
          href="/killerapp/workflows/approvals"
          style={{ color: '#0f766e', fontSize: 13 }}
        >
          ← Approvals inbox
        </a>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        {doc.title || `${doc.document_type} signature`}
      </h1>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Type: <strong>{doc.document_type}</strong> · Project:{' '}
        <code style={{ fontSize: 12 }}>{doc.project_id.slice(0, 8)}…</code> · Status:{' '}
        <strong>{doc.status}</strong> · {signedCount} of {totalSigners} signed
      </div>

      {/* PDF preview — if pdf_url is set we embed, else show a stub. */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          background: '#f9fafb',
          minHeight: 360,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {doc.pdf_url ? (
          <iframe
            src={doc.pdf_url}
            style={{ width: '100%', height: 480, border: 'none', background: '#fff' }}
            title="Document preview"
          />
        ) : (
          <div style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            PDF preview not attached. Document hash is captured on signature:
            <div
              style={{
                marginTop: 8,
                fontFamily: 'monospace',
                fontSize: 11,
                wordBreak: 'break-all',
              }}
            >
              {doc.document_hash}
            </div>
          </div>
        )}
      </div>

      {doc.status !== 'pending' ? (
        <div
          style={{
            padding: 16,
            background: '#f3f4f6',
            borderRadius: 8,
            color: '#374151',
          }}
        >
          This document is no longer pending. Status: <strong>{doc.status}</strong>.
          {doc.finalized_at && (
            <> Finalized at {new Date(doc.finalized_at).toLocaleString()}.</>
          )}
        </div>
      ) : alreadySigned ? (
        <div
          style={{
            padding: 16,
            background: '#ecfdf5',
            borderRadius: 8,
            color: '#065f46',
          }}
        >
          You have already signed this document. Waiting on the other signer(s).
        </div>
      ) : !matchedRole ? (
        <div
          style={{
            padding: 16,
            background: '#fef3c7',
            borderRadius: 8,
            color: '#78350f',
          }}
        >
          You are not listed as a required signer on this document
          {user?.email && (
            <>
              {' '}
              (logged in as <strong>{user.email}</strong>)
            </>
          )}
          . If this is wrong, ask the sender to add your email to the signer list.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#374151' }}>
            Signing as <strong>{matchedRole}</strong>.
          </div>
          <SignatureCapture
            signedDocumentId={doc.id}
            signerRole={matchedRole}
            defaultSignerName={user?.email?.split('@')[0] ?? ''}
            onSigned={() => {
              void load();
            }}
          />
        </>
      )}

      {events.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Signature audit trail
          </h2>
          <ul style={{ fontSize: 12, color: '#374151', paddingLeft: 18 }}>
            {events.map((ev) => (
              <li key={ev.id}>
                <strong>{ev.signer_role}</strong> ({ev.signer_email ?? '—'}) ·{' '}
                {ev.signature_method} ·{' '}
                {ev.signed_at ? new Date(ev.signed_at).toLocaleString() : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
