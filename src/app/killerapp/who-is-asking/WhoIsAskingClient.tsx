'use client';

/**
 * WhoIsAskingClient
 * ==================
 * Voice-extract surface for the "Who's asking?" lead-intake workflow
 * (Sprint B7, demo 2026-05-20).
 *
 * Foreman-vernacular flow:
 *   1. "Tell us who's asking." — voice button + transcript pill
 *   2. (optional) snap a photo of the truck / job site
 *   3. "Capture lead" — POSTs to /api/v1/crm/voice-extract
 *   4. "We caught:" — editable draft preview
 *   5. "Add to CRM" — persists + fires the journey event
 *   6. "Run it again" — reset
 *
 * Journey event emission is intentionally CLIENT-side (per
 * src/lib/journey-progress.ts which uses localStorage).
 */

import { useState, useRef, useEffect } from 'react';
import {
  colors,
  fonts,
  fontSizes,
  fontWeights,
  spacing,
  radii,
} from '@/design-system/tokens';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';

interface WhoIsAskingClientProps {
  initialProjectId?: string;
}

interface DraftLead {
  first_name: string;
  last_name?: string;
  company?: string;
  role?: string;
  estimated_value?: number;
  notes?: string;
}

interface ExtractResponse {
  contact: { id?: string; first_name?: string } | null;
  draft: DraftLead;
  meta: { extractor: string; projectId: string | null; photoUrl: string | null };
}

type Status =
  | 'idle'
  | 'capturing'
  | 'uploading'
  | 'extracting'
  | 'reviewing'
  | 'saving'
  | 'saved'
  | 'error';

export default function WhoIsAskingClient({ initialProjectId }: WhoIsAskingClientProps) {
  const {
    supported,
    listening,
    transcript,
    interimTranscript,
    start,
    stop,
    reset: resetVoice,
    error: voiceError,
  } = useSpeechRecognition();

  const [manualTranscript, setManualTranscript] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [draft, setDraft] = useState<DraftLead | null>(null);
  const [contact, setContact] = useState<ExtractResponse['contact']>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Combine the finalized transcript + interim chunk for the pill display
  // and for the "what we'll send" value. When the user types manually, that
  // takes precedence.
  const combinedSpoken = `${transcript} ${interimTranscript}`.trim();
  const effectiveTranscript = manualTranscript.trim() || combinedSpoken;

  useEffect(() => {
    if (photoFile) {
      const url = URL.createObjectURL(photoFile);
      setPhotoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPhotoUrl(null);
  }, [photoFile]);

  const handleToggleListen = () => {
    if (listening) {
      stop();
    } else {
      setManualTranscript('');
      setErrorMsg(null);
      start();
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
  };

  const handleCapture = async () => {
    if (!effectiveTranscript) {
      setErrorMsg('Say or type something first.');
      return;
    }
    setErrorMsg(null);
    setPhotoUploadError(null);

    // 1. If a photo was attached, upload it FIRST. On failure we surface a
    //    small inline note and continue without the photo — the contact is
    //    still more valuable than the picture.
    let uploadedPhotoUrl: string | undefined;
    if (photoFile) {
      setStatus('uploading');
      try {
        const fd = new FormData();
        fd.append('photo', photoFile);
        const upRes = await fetch('/api/v1/uploads/photo', {
          method: 'POST',
          body: fd,
        });
        const upJson = (await upRes.json().catch(() => ({}))) as {
          ok?: boolean;
          url?: string;
          error?: string;
        };
        if (!upRes.ok || !upJson.ok || !upJson.url) {
          throw new Error(upJson.error || `Photo upload failed (${upRes.status})`);
        }
        uploadedPhotoUrl = upJson.url;
      } catch (err) {
        console.error('[who-is-asking] photo upload failed:', err);
        setPhotoUploadError(
          err instanceof Error ? err.message : 'Photo upload failed — saving lead without it.'
        );
      }
    }

    // 2. Extract + persist the contact.
    setStatus('extracting');
    try {
      const projectId = initialProjectId || resolveProjectId();
      const res = await fetch('/api/v1/crm/voice-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: effectiveTranscript,
          photoUrl: uploadedPhotoUrl,
          projectId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Extract failed (${res.status})`);
      }
      const data = (await res.json()) as ExtractResponse;
      setDraft(data.draft);
      setContact(data.contact);
      setStatus('reviewing');
    } catch (err) {
      console.error('[who-is-asking] capture failed:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Capture failed');
      setStatus('error');
    }
  };

  const handleDraftChange = (field: keyof DraftLead, value: string) => {
    if (!draft) return;
    if (field === 'estimated_value') {
      const numeric = Number(value.replace(/[^0-9.]/g, ''));
      setDraft({ ...draft, estimated_value: Number.isFinite(numeric) ? numeric : 0 });
      return;
    }
    setDraft({ ...draft, [field]: value });
  };

  const handleConfirmAddToCrm = () => {
    setStatus('saving');
    const projectId = initialProjectId || resolveProjectId();
    // Fire the journey event client-side. The contact itself was already
    // persisted by the voice-extract route — this just lights up the dot.
    try {
      emitJourneyEvent({
        type: 'step_completed',
        workflowId: 'crm-lead-intake',
        projectId,
        stepId: 'wia-1',
        stepIndex: 0,
        totalSteps: 1,
      });
    } catch (err) {
      console.error('[who-is-asking] journey event emit failed:', err);
    }
    setStatus('saved');
  };

  const handleReset = () => {
    resetVoice();
    setManualTranscript('');
    setPhotoFile(null);
    setDraft(null);
    setContact(null);
    setErrorMsg(null);
    setPhotoUploadError(null);
    setStatus('idle');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const inputBoxStyle: React.CSSProperties = {
    width: '100%',
    padding: spacing[3],
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.ink[900],
    border: `1px solid ${colors.ink[200]}`,
    borderRadius: radii.sm,
    backgroundColor: '#FFFFFF',
  };

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: spacing[6],
        fontFamily: fonts.body,
      }}
    >
      {/* STEP 1 — voice capture */}
      {status === 'idle' ||
      status === 'capturing' ||
      status === 'uploading' ||
      status === 'extracting' ||
      status === 'error' ? (
        <section aria-label="Voice capture">
          <h2
            style={{
              fontSize: fontSizes.xl,
              fontWeight: fontWeights.semibold,
              color: colors.ink[900],
              margin: 0,
              marginBottom: spacing[2],
            }}
          >
            Tell us who&apos;s asking.
          </h2>
          <p
            style={{
              fontSize: fontSizes.sm,
              color: colors.ink[500],
              margin: 0,
              marginBottom: spacing[5],
            }}
          >
            Hit the mic and say their name, company, what they want. Or type it.
          </p>

          <button
            type="button"
            onClick={handleToggleListen}
            disabled={!supported || status === 'extracting' || status === 'uploading'}
            aria-pressed={listening}
            style={{
              padding: `${spacing[3]} ${spacing[5]}`,
              fontSize: fontSizes.sm,
              fontWeight: fontWeights.semibold,
              fontFamily: fonts.body,
              border: `1px solid ${listening ? colors.amber.main : colors.ink[300]}`,
              borderRadius: radii.full,
              backgroundColor: listening ? colors.amber.main : '#FFFFFF',
              color: listening ? '#FFFFFF' : colors.ink[900],
              cursor: supported ? 'pointer' : 'not-allowed',
              minHeight: 44,
              minWidth: 200,
              transition: '150ms ease',
            }}
            data-testid="wia-mic-button"
          >
            {listening ? 'Listening… tap to stop' : supported ? 'Tap to speak' : 'Voice not supported — type below'}
          </button>

          {/* Transcript pill (aria-live for screen readers — W7.Q.2 pattern) */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style={{
              marginTop: spacing[4],
              padding: spacing[4],
              minHeight: 80,
              border: `1px dashed ${colors.ink[200]}`,
              borderRadius: radii.md,
              backgroundColor: colors.ink[50],
              fontSize: fontSizes.sm,
              color: colors.ink[700],
              fontStyle: combinedSpoken ? 'normal' : 'italic',
            }}
          >
            {combinedSpoken || (listening ? 'Listening…' : 'Your transcript will show up here.')}
          </div>

          {/* Manual fallback */}
          <label
            style={{
              display: 'block',
              marginTop: spacing[4],
              fontSize: fontSizes.xs,
              fontWeight: fontWeights.semibold,
              color: colors.ink[500],
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing[2],
            }}
          >
            Or type it
          </label>
          <textarea
            value={manualTranscript}
            onChange={(e) => setManualTranscript(e.target.value)}
            rows={3}
            placeholder="e.g., Mike Tanaka from Tanaka Roofing — needs a re-roof estimate on a 2200 sqft tile job in Pasadena."
            style={{ ...inputBoxStyle, resize: 'vertical' }}
          />

          {/* Photo upload */}
          <div style={{ marginTop: spacing[4] }}>
            <label
              style={{
                display: 'block',
                fontSize: fontSizes.xs,
                fontWeight: fontWeights.semibold,
                color: colors.ink[500],
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: spacing[2],
              }}
            >
              Optional — snap their truck or business card
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ fontSize: fontSizes.sm, fontFamily: fonts.body }}
            />
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Lead capture preview"
                style={{
                  marginTop: spacing[3],
                  maxWidth: 200,
                  maxHeight: 160,
                  border: `1px solid ${colors.ink[200]}`,
                  borderRadius: radii.sm,
                }}
              />
            )}
          </div>

          {voiceError && (
            <p style={{ marginTop: spacing[3], color: colors.status.error, fontSize: fontSizes.sm }}>
              Mic trouble: {voiceError}. Type it instead.
            </p>
          )}
          {status === 'uploading' && (
            <p
              role="status"
              aria-live="polite"
              style={{ marginTop: spacing[3], color: colors.ink[500], fontSize: fontSizes.sm }}
            >
              Uploading photo…
            </p>
          )}
          {photoUploadError && (
            <p style={{ marginTop: spacing[3], color: colors.status.error, fontSize: fontSizes.sm }}>
              {photoUploadError}
            </p>
          )}
          {errorMsg && (
            <p style={{ marginTop: spacing[3], color: colors.status.error, fontSize: fontSizes.sm }}>
              {errorMsg}
            </p>
          )}

          <div style={{ marginTop: spacing[5], display: 'flex', gap: spacing[3] }}>
            <button
              type="button"
              onClick={handleCapture}
              disabled={
                status === 'extracting' || status === 'uploading' || !effectiveTranscript
              }
              style={{
                padding: `${spacing[3]} ${spacing[5]}`,
                fontSize: fontSizes.sm,
                fontWeight: fontWeights.semibold,
                fontFamily: fonts.body,
                border: 'none',
                borderRadius: radii.full,
                backgroundColor:
                  status === 'extracting' || status === 'uploading' || !effectiveTranscript
                    ? colors.ink[200]
                    : colors.navy,
                color: '#FFFFFF',
                cursor:
                  status === 'extracting' || status === 'uploading' || !effectiveTranscript
                    ? 'not-allowed'
                    : 'pointer',
                minHeight: 44,
              }}
              data-testid="wia-capture-button"
            >
              {status === 'uploading'
                ? 'Uploading photo…'
                : status === 'extracting'
                  ? 'Catching it…'
                  : 'Capture lead'}
            </button>
          </div>
        </section>
      ) : null}

      {/* STEP 2 — review draft */}
      {(status === 'reviewing' || status === 'saving' || status === 'saved') && draft && (
        <section aria-label="Lead draft preview" style={{ marginTop: spacing[6] }}>
          <h2
            style={{
              fontSize: fontSizes.xl,
              fontWeight: fontWeights.semibold,
              color: colors.ink[900],
              margin: 0,
              marginBottom: spacing[2],
            }}
          >
            We caught:
          </h2>
          <p
            style={{
              fontSize: fontSizes.sm,
              color: colors.ink[500],
              margin: 0,
              marginBottom: spacing[5],
            }}
          >
            Look it over. Fix anything that&apos;s off. Good?
          </p>

          <div
            style={{
              border: `1px solid ${colors.ink[200]}`,
              borderRadius: radii.md,
              padding: spacing[4],
              backgroundColor: colors.paper.cream,
              display: 'grid',
              gap: spacing[3],
            }}
          >
            <DraftField
              label="First name"
              value={draft.first_name || ''}
              onChange={(v) => handleDraftChange('first_name', v)}
            />
            <DraftField
              label="Company"
              value={draft.company || ''}
              onChange={(v) => handleDraftChange('company', v)}
            />
            <DraftField
              label="Role"
              value={draft.role || ''}
              onChange={(v) => handleDraftChange('role', v)}
            />
            <DraftField
              label="Estimated value (USD)"
              value={draft.estimated_value ? String(draft.estimated_value) : ''}
              onChange={(v) => handleDraftChange('estimated_value', v)}
            />
            <DraftField
              label="Notes"
              value={draft.notes || ''}
              onChange={(v) => handleDraftChange('notes', v)}
              multiline
            />
          </div>

          {status === 'saved' ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginTop: spacing[5],
                padding: spacing[4],
                border: `1px solid ${colors.status.success}`,
                borderRadius: radii.md,
                backgroundColor: colors.status.successLight,
                color: colors.status.success,
                fontSize: fontSizes.sm,
              }}
            >
              Added to CRM
              {contact && contact.first_name ? ` — ${contact.first_name} is in the pipeline.` : '.'}
            </div>
          ) : (
            <div style={{ marginTop: spacing[5], display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleConfirmAddToCrm}
                disabled={status === 'saving'}
                style={{
                  padding: `${spacing[3]} ${spacing[5]}`,
                  fontSize: fontSizes.sm,
                  fontWeight: fontWeights.semibold,
                  fontFamily: fonts.body,
                  border: 'none',
                  borderRadius: radii.full,
                  backgroundColor: colors.orange,
                  color: '#FFFFFF',
                  cursor: status === 'saving' ? 'wait' : 'pointer',
                  minHeight: 44,
                }}
                data-testid="wia-confirm-button"
              >
                Add to CRM
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: `${spacing[3]} ${spacing[5]}`,
                  fontSize: fontSizes.sm,
                  fontWeight: fontWeights.medium,
                  fontFamily: fonts.body,
                  border: `1px solid ${colors.ink[300]}`,
                  borderRadius: radii.full,
                  backgroundColor: 'transparent',
                  color: colors.ink[700],
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                Run it again
              </button>
            </div>
          )}

          {status === 'saved' && (
            <div style={{ marginTop: spacing[4] }}>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: `${spacing[3]} ${spacing[5]}`,
                  fontSize: fontSizes.sm,
                  fontWeight: fontWeights.medium,
                  fontFamily: fonts.body,
                  border: `1px solid ${colors.ink[300]}`,
                  borderRadius: radii.full,
                  backgroundColor: 'transparent',
                  color: colors.ink[700],
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                Run it again
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function DraftField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const sharedStyle: React.CSSProperties = {
    width: '100%',
    padding: spacing[2],
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.ink[900],
    border: `1px solid ${colors.ink[200]}`,
    borderRadius: radii.sm,
    backgroundColor: '#FFFFFF',
  };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
      <span
        style={{
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          color: colors.ink[500],
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{ ...sharedStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={sharedStyle}
        />
      )}
    </label>
  );
}
