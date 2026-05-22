'use client';

/**
 * SignatureCapture — OWNER-LANE binding-signature primitive (2026-05-22).
 * =======================================================================
 *
 * Two methods, both backed by the same PATCH /api/v1/signatures/:id/sign:
 *
 *   1. Typed: text input ("Type your full legal name") gated by an
 *      explicit checkbox acknowledging the E-SIGN Act + CA UETA. The
 *      typed-name pattern is the same one Docusign, Dropbox Sign, and
 *      Documenso use for click-to-sign — legally on par with a drawn
 *      mark in 49 of 50 states (NY has a separate statute for some
 *      real-estate categories — flagged in SIGNATURE-SERVICES.md).
 *
 *   2. Drawn: an HTML <canvas> with mouse + touch handlers (pointer
 *      events) and a Clear button. On submit the canvas is exported
 *      as base64 PNG into signature_data.
 *
 * Either way the API call carries the server-captured ip + user_agent
 * back into signature_events, so the calling component only worries
 * about the visible UI.
 *
 * UX note: deliberately minimal styling so it slots into the sign
 * page or any modal without fighting a parent design system.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SignatureCaptureProps {
  signedDocumentId: string;
  signerRole: string;
  /** Pre-fill the typed-name field. */
  defaultSignerName?: string;
  /** Called after the signature event posts successfully. */
  onSigned?: (args: { finalized: boolean }) => void;
}

type Mode = 'typed' | 'drawn';

export default function SignatureCapture({
  signedDocumentId,
  signerRole,
  defaultSignerName = '',
  onSigned,
}: SignatureCaptureProps) {
  const [mode, setMode] = useState<Mode>('typed');
  const [typedName, setTypedName] = useState(defaultSignerName);
  const [esignAck, setEsignAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  // Resize canvas to its bounding box so coords map 1:1.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111827';
    }
  }, [mode]);

  function pointer(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = pointer(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastPoint.current) return;
    const p = pointer(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
    if (!hasInk) setHasInk(true);
  }
  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = false;
    lastPoint.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
  }
  function clearCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx?.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  }

  async function handleSubmit() {
    setError(null);

    if (mode === 'typed') {
      if (!typedName.trim()) {
        setError('Please type your full legal name.');
        return;
      }
      if (!esignAck) {
        setError('You must acknowledge the E-SIGN Act statement to proceed.');
        return;
      }
    } else {
      if (!hasInk) {
        setError('Please draw your signature in the box.');
        return;
      }
    }

    const signature_data =
      mode === 'typed' ? typedName.trim() : (canvasRef.current?.toDataURL('image/png') ?? '');

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`/api/v1/signatures/${signedDocumentId}/sign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          method: mode,
          signature_data,
          signer_role: signerRole,
          signer_name: mode === 'typed' ? typedName.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to record signature.');
      } else {
        setDone(true);
        onSigned?.({ finalized: Boolean(json.finalized) });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        style={{
          padding: 16,
          border: '1px solid #d1fae5',
          background: '#ecfdf5',
          borderRadius: 8,
          color: '#065f46',
        }}
      >
        Signature recorded. This event is now part of the project record (hash + IP + timestamp captured).
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 16,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setMode('typed')}
          aria-pressed={mode === 'typed'}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: mode === 'typed' ? '#0f766e' : '#e5e7eb',
            background: mode === 'typed' ? '#0f766e' : '#ffffff',
            color: mode === 'typed' ? '#ffffff' : '#111827',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Type name
        </button>
        <button
          type="button"
          onClick={() => setMode('drawn')}
          aria-pressed={mode === 'drawn'}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: mode === 'drawn' ? '#0f766e' : '#e5e7eb',
            background: mode === 'drawn' ? '#0f766e' : '#ffffff',
            color: mode === 'drawn' ? '#ffffff' : '#111827',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Draw signature
        </button>
      </div>

      {mode === 'typed' ? (
        <>
          <label
            htmlFor="sig-typed-name"
            style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}
          >
            Type your full legal name
          </label>
          <input
            id="sig-typed-name"
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="e.g. Rachel Hernandez"
            style={{
              padding: '8px 10px',
              fontSize: 18,
              fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive',
              border: '1px solid #d1d5db',
              borderRadius: 6,
            }}
          />
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: 12,
              color: '#374151',
              lineHeight: 1.4,
            }}
          >
            <input
              type="checkbox"
              checked={esignAck}
              onChange={(e) => setEsignAck(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              I understand that my typed name is a legally binding electronic
              signature under the federal E-SIGN Act (15 U.S.C. § 7001) and the
              California Uniform Electronic Transactions Act (Civ. Code § 1633.7),
              with the same legal effect as a handwritten signature on this
              document.
            </span>
          </label>
        </>
      ) : (
        <>
          <div
            style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}
          >
            Draw your signature
          </div>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              width: '100%',
              height: 160,
              border: '1px dashed #94a3b8',
              borderRadius: 6,
              background: '#f9fafb',
              touchAction: 'none',
              cursor: 'crosshair',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={clearCanvas}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                background: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        </>
      )}

      {error && (
        <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          padding: '10px 16px',
          fontSize: 14,
          fontWeight: 600,
          color: '#ffffff',
          background: submitting ? '#6b7280' : '#0f766e',
          border: 'none',
          borderRadius: 6,
          cursor: submitting ? 'wait' : 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        {submitting ? 'Recording…' : 'Sign and submit'}
      </button>

      <div style={{ fontSize: 11, color: '#6b7280' }}>
        Your IP address, browser, and the exact timestamp are captured on
        submit and become part of the audit log for this document.
      </div>
    </div>
  );
}
