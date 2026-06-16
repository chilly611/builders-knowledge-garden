'use client';

/**
 * CaptureZone — the obvious first move on /killerapp (2026-06-15 redline, fix 1).
 *
 * A bright, grounded capture card that demotes "Pick a workflow" beneath it. One
 * card, one persist path: a real text box plus a modality row —
 *   talk · photo · video · upload · sketch · note
 * Every modality routes into the SAME #21 capture/persist path:
 *   text/voice → POST /api/v1/projects { raw_input }   (the project IS created)
 *   media      → + uploadProjectAttachment(file, projectId)
 *   → router.replace(/killerapp?project=<id>) so the project shell hydrates the
 *     AI take and the project survives reload (the shipping gate).
 *
 * Data-driven: zero hardcoded project names — the project is created from what
 * the user captures. Tokens only; no forbidden hex; honors prefers-reduced-motion.
 *
 * Voice uses the shared hook in dictation mode (continuous, auto-restart, no
 * silence cut-off, verbatim accumulation) so a rambling field description is
 * captured whole and shown live — never boiled down.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import { uploadProjectAttachment } from '@/lib/captureAttachment';

const ACTIVE_PROJECT_KEY = 'bkg-active-project';

type ModalityKind = 'photo' | 'video' | 'upload' | 'sketch';

interface PendingFile {
  id: string;
  file: File;
  kind: ModalityKind;
}

function deriveNameFromFiles(files: PendingFile[]): string {
  if (files.length === 1) {
    const { kind, file } = files[0];
    if (kind === 'sketch') return 'Sketch';
    return file.name || (kind === 'video' ? 'Video capture' : 'Photo capture');
  }
  const allPhotos = files.every((f) => f.kind === 'photo');
  if (allPhotos) return 'Photo capture';
  return 'Site capture';
}

export default function CaptureZone() {
  const router = useRouter();

  const [text, setText] = useState('');
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [sketchOpen, setSketchOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Voice in dictation mode — the fix-2 behavior: continuous, restart on
  // Chrome's ~60s onend, no silence cut-off, verbatim accumulation.
  const {
    supported: voiceSupported,
    listening,
    transcript,
    liveTranscript,
    error: voiceError,
    start: startVoice,
    stop: stopVoice,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    autoRestart: true,
    silenceTimeoutMs: null,
    accumulate: true,
  });

  // Flow finalized (verbatim) speech into the editable text box. The live,
  // not-yet-final words show in the listening panel below; both are the user's
  // raw words — nothing is rewritten.
  const lastTranscriptRef = useRef('');
  useEffect(() => {
    if (!transcript) {
      lastTranscriptRef.current = '';
      return;
    }
    const prev = lastTranscriptRef.current;
    if (transcript.length <= prev.length) {
      lastTranscriptRef.current = transcript;
      return;
    }
    const delta = transcript.slice(prev.length).trim();
    lastTranscriptRef.current = transcript;
    if (!delta) return;
    setText((t) => (t && !/\s$/.test(t) ? `${t} ${delta}` : `${t}${delta}`));
  }, [transcript]);

  const addFiles = (fileList: FileList | null, kind: ModalityKind) => {
    if (!fileList || fileList.length === 0) return;
    const next: PendingFile[] = Array.from(fileList).map((file) => ({
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}-${file.name}`,
      file,
      kind,
    }));
    setPending((p) => [...p, ...next]);
    setSubmitError(null);
  };

  const removePending = (id: string) => setPending((p) => p.filter((f) => f.id !== id));

  const hasContent = text.trim().length > 0 || pending.length > 0;

  async function handleCapture() {
    if (!hasContent || submitting) return;
    setSubmitError(null);
    setNeedsAuth(false);
    setSubmitting(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      // Honest anon path: keep the user's words/files on screen, nudge sign-in.
      if (!token) {
        setNeedsAuth(true);
        setSubmitting(false);
        return;
      }

      const raw = text.trim();
      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(raw ? { raw_input: raw } : { name: deriveNameFromFiles(pending) }),
      });
      if (!res.ok) throw new Error(`Couldn't start the project (${res.status}).`);
      const json = (await res.json()) as { project?: { id?: string } };
      const projectId = json.project?.id;
      if (!projectId) throw new Error("The project didn't come back with an id.");

      for (let i = 0; i < pending.length; i++) {
        setProgress(`Saving ${pending[i].kind} ${i + 1} of ${pending.length}…`);
        await uploadProjectAttachment(pending[i].file, projectId, { workflowId: 'capture' });
      }
      setProgress(null);

      try {
        window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
      } catch {
        /* ignore storage failures */
      }
      // Land on the project so the shell hydrates the AI take + it survives reload.
      router.replace(`/killerapp?project=${encodeURIComponent(projectId)}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Capture failed — try again.');
      setSubmitting(false);
      setProgress(null);
    }
  }

  const signInHref =
    typeof window !== 'undefined'
      ? `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
      : '/login';

  return (
    <section className="capz" aria-label="Capture what you're working on">
      <div className="capz-card">
        <div className="capz-eyebrow">Capture · start anywhere</div>
        <h1 className="capz-heading">What are you working on?</h1>
        <p className="capz-sub">
          Talk it out, snap a photo, sketch it, or jot a note. We&rsquo;ll start the project and
          keep your words.
        </p>

        <textarea
          ref={textareaRef}
          className="capz-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe it, or just start talking…"
          aria-label="Describe what you're working on"
          rows={3}
        />

        {/* Live voice panel — the LIVE transcript, verbatim, as they speak. */}
        {listening && (
          <div className="capz-live" aria-live="polite">
            <span className={`capz-live-dot${listening ? ' is-on' : ''}`} aria-hidden />
            <div className="capz-live-text">
              {liveTranscript ? liveTranscript : 'Listening… speak now.'}
            </div>
          </div>
        )}
        {voiceError && (
          <div className="capz-voice-err" role="status">
            {voiceError === 'permission-denied'
              ? 'Microphone access is blocked. Allow mic access in your browser and tap Talk again.'
              : voiceError === 'no-speech'
                ? "Didn't catch that — tap Talk and try again."
                : "Voice hit a snag — tap Talk to retry, or type instead."}
          </div>
        )}

        {/* Modality row — all route into the one capture/persist path. */}
        <div className="capz-modalities" role="group" aria-label="Capture modes">
          <button
            type="button"
            className={`capz-mode${listening ? ' is-active' : ''}`}
            onClick={() => (listening ? stopVoice() : startVoice())}
            aria-pressed={listening}
            disabled={!voiceSupported}
            title={voiceSupported ? undefined : 'Voice input is not supported in this browser'}
          >
            <IconMic />
            <span>{listening ? 'Stop' : 'Talk'}</span>
          </button>

          <button type="button" className="capz-mode" onClick={() => photoInputRef.current?.click()}>
            <IconCamera />
            <span>Photo</span>
          </button>

          <button type="button" className="capz-mode" onClick={() => videoInputRef.current?.click()}>
            <IconVideo />
            <span>Video</span>
          </button>

          <button type="button" className="capz-mode" onClick={() => uploadInputRef.current?.click()}>
            <IconUpload />
            <span>Upload</span>
          </button>

          <button type="button" className="capz-mode" onClick={() => setSketchOpen(true)}>
            <IconSketch />
            <span>Sketch</span>
          </button>

          <button
            type="button"
            className="capz-mode"
            onClick={() => textareaRef.current?.focus()}
          >
            <IconNote />
            <span>Note</span>
          </button>
        </div>

        {/* Hidden capture inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="capz-hidden-input"
          onChange={(e) => {
            addFiles(e.target.files, 'photo');
            e.target.value = '';
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="capz-hidden-input"
          onChange={(e) => {
            addFiles(e.target.files, 'video');
            e.target.value = '';
          }}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          multiple
          className="capz-hidden-input"
          onChange={(e) => {
            addFiles(e.target.files, 'upload');
            e.target.value = '';
          }}
        />

        {/* Pending media chips */}
        {pending.length > 0 && (
          <ul className="capz-pending" aria-label="Attached to this capture">
            {pending.map((f) => (
              <li key={f.id} className="capz-chip">
                <span className="capz-chip-kind">{f.kind}</span>
                <span className="capz-chip-name">{f.file.name || 'sketch.png'}</span>
                <span className="capz-chip-size">{(f.file.size / 1024 / 1024).toFixed(1)}MB</span>
                <button
                  type="button"
                  className="capz-chip-x"
                  onClick={() => removePending(f.id)}
                  aria-label={`Remove ${f.file.name || 'sketch'}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Submit */}
        <div className="capz-actions">
          <button
            type="button"
            className="capz-submit"
            onClick={handleCapture}
            disabled={!hasContent || submitting}
          >
            {submitting ? (progress ?? 'Capturing…') : 'Capture →'}
          </button>
          {hasContent && !submitting && (
            <span className="capz-hint">We&rsquo;ll open the project and run a first read.</span>
          )}
        </div>

        {submitError && (
          <div className="capz-error" role="alert">
            {submitError}
          </div>
        )}
        {needsAuth && (
          <div className="capz-auth" role="note">
            <strong>Sign in to save this.</strong> Your capture (and AI take) are kept on your
            account.{' '}
            <a href={signInHref} className="capz-auth-link">
              Sign in
            </a>{' '}
            — we&rsquo;ll bring you right back, words and all.
          </div>
        )}
      </div>

      {sketchOpen && (
        <SketchPad
          onCancel={() => setSketchOpen(false)}
          onAdd={(file) => {
            setPending((p) => [
              ...p,
              { id: `${Date.now()}-sketch`, file, kind: 'sketch' },
            ]);
            setSketchOpen(false);
            setSubmitError(null);
          }}
        />
      )}

      <style jsx>{`
        .capz {
          position: relative;
          z-index: 2;
          max-width: 720px;
          margin: 0 auto;
          width: 100%;
          padding: 56px 28px 8px;
        }
        .capz-card {
          background: var(--paper-cream);
          border: 1px solid var(--faded-rule);
          border-radius: 14px;
          padding: 24px 24px 22px;
          box-shadow: 0 2px 14px rgba(42, 38, 32, 0.06);
        }
        .capz-eyebrow {
          font-size: 11px;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: var(--brass);
          font-weight: 600;
          margin-bottom: 8px;
        }
        .capz-heading {
          font-family: var(--font-archivo-black), var(--font-archivo), sans-serif;
          font-size: clamp(26px, 4vw, 36px);
          line-height: 1.1;
          letter-spacing: -0.5px;
          color: var(--graphite);
          margin: 0 0 8px;
        }
        .capz-sub {
          font-size: 14px;
          line-height: 1.5;
          color: var(--graphite);
          opacity: 0.72;
          margin: 0 0 16px;
          max-width: 56ch;
        }
        .capz-textarea {
          width: 100%;
          box-sizing: border-box;
          resize: vertical;
          min-height: 84px;
          border: 1px solid var(--faded-rule);
          border-radius: 10px;
          background: var(--paper-vellum);
          padding: 14px 16px;
          font-family: var(--font-archivo), sans-serif;
          font-size: 15px;
          line-height: 1.5;
          color: var(--graphite);
          box-shadow: inset 0 1px 2px rgba(42, 38, 32, 0.05);
        }
        .capz-textarea:focus {
          outline: none;
          border-color: var(--robin);
        }
        .capz-textarea::placeholder {
          color: var(--graphite);
          opacity: 0.45;
        }
        .capz-live {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 12px;
          padding: 12px 14px;
          border: 1px solid var(--robin);
          border-radius: 10px;
          background: rgba(60, 122, 138, 0.08);
        }
        .capz-live-dot {
          flex-shrink: 0;
          width: 10px;
          height: 10px;
          margin-top: 5px;
          border-radius: 50%;
          background: var(--robin);
        }
        .capz-live-dot.is-on {
          animation: capz-pulse 1.4s ease-in-out infinite;
        }
        .capz-live-text {
          font-size: 14px;
          line-height: 1.5;
          color: var(--graphite);
          white-space: pre-wrap;
        }
        .capz-voice-err {
          margin-top: 10px;
          font-size: 13px;
          color: var(--graphite);
          opacity: 0.85;
        }
        .capz-modalities {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }
        .capz-mode {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 44px;
          padding: 8px 14px;
          border: 1px solid var(--faded-rule);
          border-radius: 999px;
          background: var(--paper-cream);
          color: var(--graphite);
          font-family: var(--font-archivo), sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
        }
        .capz-mode:hover:not(:disabled) {
          border-color: var(--robin);
          transform: translateY(-1px);
        }
        .capz-mode:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .capz-mode.is-active {
          background: rgba(60, 122, 138, 0.12);
          border-color: var(--robin);
          color: var(--robin);
        }
        .capz-mode :global(svg) {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
        .capz-hidden-input {
          display: none;
        }
        .capz-pending {
          list-style: none;
          margin: 16px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .capz-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border: 1px solid var(--faded-rule);
          border-radius: 8px;
          background: var(--paper-vellum);
          font-size: 13px;
          color: var(--graphite);
        }
        .capz-chip-kind {
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 10px;
          font-weight: 600;
          color: var(--brass);
          flex-shrink: 0;
        }
        .capz-chip-name {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .capz-chip-size {
          opacity: 0.6;
          flex-shrink: 0;
          font-size: 11px;
        }
        .capz-chip-x {
          flex-shrink: 0;
          border: none;
          background: transparent;
          color: var(--graphite);
          opacity: 0.55;
          cursor: pointer;
          font-size: 13px;
          min-width: 28px;
          min-height: 28px;
        }
        .capz-chip-x:hover {
          opacity: 1;
        }
        .capz-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 18px;
        }
        .capz-submit {
          min-height: 46px;
          padding: 12px 22px;
          border: none;
          border-radius: 10px;
          background: var(--robin);
          color: var(--paper-cream);
          font-family: var(--font-archivo), sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: filter 160ms ease, transform 160ms ease;
        }
        .capz-submit:hover:not(:disabled) {
          filter: brightness(1.06);
          transform: translateY(-1px);
        }
        .capz-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .capz-hint {
          font-size: 12px;
          color: var(--graphite);
          opacity: 0.6;
          font-style: italic;
        }
        .capz-error {
          margin-top: 12px;
          padding: 10px 12px;
          border: 1px solid var(--brass);
          border-radius: 8px;
          font-size: 13px;
          color: var(--graphite);
          background: rgba(176, 141, 92, 0.1);
        }
        .capz-auth {
          margin-top: 12px;
          padding: 11px 13px;
          border: 1px solid var(--robin);
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--graphite);
          background: rgba(60, 122, 138, 0.1);
        }
        .capz-auth-link {
          color: var(--robin);
          text-decoration: underline;
          font-weight: 600;
        }
        @keyframes capz-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.3);
          }
        }
        @media (max-width: 768px) {
          .capz {
            padding: 36px 18px 8px;
          }
          .capz-card {
            padding: 20px 16px 18px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .capz-live-dot.is-on {
            animation: none !important;
          }
          .capz-mode,
          .capz-submit {
            transition: none !important;
          }
          .capz-mode:hover:not(:disabled),
          .capz-submit:hover:not(:disabled) {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ── Sketch pad ──────────────────────────────────────────────────────────── */

function SketchPad({
  onAdd,
  onCancel,
}: {
  onAdd: (file: File) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Paper-cream ground so the exported PNG isn't transparent/black.
    ctx.fillStyle = '#F2E9D2'; // var(--paper-cream)
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#2A2620'; // var(--ink-graphite)
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const onUp = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#F2E9D2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const add = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      onAdd(new File([blob], `sketch-${Date.now()}.png`, { type: 'image/png' }));
    }, 'image/png');
  };

  return (
    <div className="capz-sketch-overlay" role="dialog" aria-modal="true" aria-label="Sketch">
      <div className="capz-sketch-box">
        <div className="capz-sketch-head">
          <span>Sketch it</span>
          <button type="button" className="capz-sketch-x" onClick={onCancel} aria-label="Close sketch">
            ✕
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={640}
          height={380}
          className="capz-sketch-canvas"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
        <div className="capz-sketch-actions">
          <button type="button" className="capz-sketch-clear" onClick={clear}>
            Clear
          </button>
          <button type="button" className="capz-sketch-add" onClick={add}>
            Add to capture →
          </button>
        </div>
      </div>

      <style jsx>{`
        .capz-sketch-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(42, 38, 32, 0.45);
          padding: 20px;
        }
        .capz-sketch-box {
          width: 100%;
          max-width: 680px;
          background: var(--paper-cream);
          border: 1px solid var(--faded-rule);
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 8px 32px rgba(42, 38, 32, 0.25);
        }
        .capz-sketch-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          color: var(--graphite);
          margin-bottom: 12px;
        }
        .capz-sketch-x {
          border: none;
          background: transparent;
          color: var(--graphite);
          opacity: 0.6;
          cursor: pointer;
          font-size: 15px;
          min-width: 32px;
          min-height: 32px;
        }
        .capz-sketch-x:hover {
          opacity: 1;
        }
        .capz-sketch-canvas {
          width: 100%;
          height: auto;
          aspect-ratio: 640 / 380;
          border: 1px solid var(--faded-rule);
          border-radius: 8px;
          background: var(--paper-cream);
          touch-action: none;
          cursor: crosshair;
          display: block;
        }
        .capz-sketch-actions {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-top: 14px;
        }
        .capz-sketch-clear {
          min-height: 44px;
          padding: 10px 16px;
          border: 1px solid var(--faded-rule);
          border-radius: 8px;
          background: transparent;
          color: var(--graphite);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .capz-sketch-add {
          min-height: 44px;
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          background: var(--robin);
          color: var(--paper-cream);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

/* ── Emoji-free line icons (stroke = currentColor) ───────────────────────── */

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}
function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}
function IconVideo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3z" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}
function IconSketch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16.5 3.5l4 4L8 20l-4.5 1L4.5 16.5z" />
      <path d="M14 6l4 4" />
    </svg>
  );
}
function IconNote() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h9l5 5v13a0 0 0 0 1 0 0H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h7M9 17h7" />
    </svg>
  );
}
