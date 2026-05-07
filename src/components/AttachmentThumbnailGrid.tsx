'use client';

/**
 * AttachmentThumbnailGrid — rehydration grid for project_attachments.
 *
 * Renders a 3-column grid of signed-URL <img>/<video> thumbnails for
 * already-uploaded jobsite evidence. Click a thumbnail to enlarge in a
 * lightbox; in the lightbox you can edit the caption inline.
 *
 * Caption support (2026-05-07): caption shows below each thumbnail
 * (truncated to ~40 chars) and is editable in the lightbox. Save calls
 * onCaptionUpdate(attachmentId, caption) which the parent wires to
 * PATCH /api/v1/projects/<id>/attachments.
 *
 * Lightbox is a plain JS modal — no portal, no third-party dep, fixed
 * positioning. Click backdrop or press Esc to close (when not editing
 * caption — Esc commits the edit instead).
 */

import { useEffect, useState } from 'react';

export interface Attachment {
  id: string;
  project_id: string;
  user_id: string;
  file_path: string;
  mime_type: string;
  byte_size: number | bigint;
  original_filename: string | null;
  caption: string | null;
  workflow_id: string | null;
  step_id: string | null;
  exif_taken_at: string | null;
  exif_lat: number | null;
  exif_lng: number | null;
  created_at: string;
  signed_url: string | null;
  signed_url_expires_at: number | null;
}

interface AttachmentThumbnailGridProps {
  attachments: Attachment[];
  loading?: boolean;
  /**
   * Optional caption save handler. When provided, the lightbox renders a
   * caption input + Save button. When omitted, captions are read-only.
   */
  onCaptionUpdate?: (attachmentId: string, caption: string | null) => Promise<void> | void;
}

function isVideo(mimeType: string) {
  return mimeType.startsWith('video/');
}

export default function AttachmentThumbnailGrid({
  attachments,
  loading = false,
  onCaptionUpdate,
}: AttachmentThumbnailGridProps) {
  const [lightbox, setLightbox] = useState<Attachment | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [draftCaption, setDraftCaption] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  // Keep draft in sync when lightbox changes.
  useEffect(() => {
    if (lightbox) {
      setDraftCaption(lightbox.caption ?? '');
      setEditingCaption(false);
    }
  }, [lightbox]);

  // Esc closes lightbox UNLESS editing — Esc cancels the edit.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editingCaption) {
        setEditingCaption(false);
        setDraftCaption(lightbox.caption ?? '');
      } else {
        setLightbox(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, editingCaption]);

  if (loading && attachments.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--graphite)', opacity: 0.6 }} aria-live="polite">
        Loading attachments…
      </div>
    );
  }

  if (attachments.length === 0) return null;

  const handleSaveCaption = async () => {
    if (!lightbox || !onCaptionUpdate) return;
    setSavingCaption(true);
    try {
      const next = draftCaption.trim() || null;
      await onCaptionUpdate(lightbox.id, next);
      // Optimistically update the lightbox view so the user sees the new
      // caption rendered without waiting for the parent to refetch.
      setLightbox({ ...lightbox, caption: next });
      setEditingCaption(false);
    } finally {
      setSavingCaption(false);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
        }}
        data-testid="attachment-thumbnail-grid"
      >
        {attachments.map((a) => {
          const url = a.signed_url;
          const showVideo = isVideo(a.mime_type);
          const captionPreview =
            a.caption && a.caption.length > 40 ? `${a.caption.slice(0, 38)}…` : a.caption;
          return (
            <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                type="button"
                onClick={() => setLightbox(a)}
                aria-label={`View ${a.original_filename ?? 'attachment'}`}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  borderRadius: 8,
                  border: '1px solid var(--faded-rule, #C9C3B3)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  padding: 0,
                  background: '#000',
                  minHeight: 44,
                  minWidth: 44,
                }}
              >
                {url ? (
                  showVideo ? (
                    <video
                      src={url}
                      preload="metadata"
                      muted
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <img
                      src={url}
                      alt={a.original_filename ?? 'attachment'}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#444',
                      color: '#fff',
                      fontSize: 24,
                    }}
                  >
                    {showVideo ? '🎞️' : a.mime_type === 'application/pdf' ? '📄' : '🖼️'}
                  </div>
                )}
                {showVideo && url && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      bottom: 6,
                      left: 6,
                      fontSize: 16,
                      background: 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      borderRadius: 4,
                      padding: '0 6px',
                    }}
                  >
                    ▶
                  </span>
                )}
              </button>
              {captionPreview ? (
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--graphite, #2E2E30)',
                    margin: 0,
                    lineHeight: 1.3,
                    opacity: 0.85,
                  }}
                  title={a.caption ?? undefined}
                >
                  {captionPreview}
                </p>
              ) : onCaptionUpdate ? (
                <button
                  type="button"
                  onClick={() => { setLightbox(a); setEditingCaption(true); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: 11,
                    color: 'var(--graphite, #2E2E30)',
                    opacity: 0.5,
                    fontStyle: 'italic',
                    textAlign: 'left',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Add a caption
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Attachment preview"
          onClick={() => { if (!editingCaption) setLightbox(null); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            cursor: editingCaption ? 'default' : 'zoom-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#000',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              cursor: 'default',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {lightbox.signed_url ? (
                isVideo(lightbox.mime_type) ? (
                  <video
                    src={lightbox.signed_url}
                    controls
                    autoPlay
                    style={{ display: 'block', maxWidth: '90vw', maxHeight: '70vh' }}
                  />
                ) : (
                  <img
                    src={lightbox.signed_url}
                    alt={lightbox.original_filename ?? 'attachment'}
                    style={{ display: 'block', maxWidth: '90vw', maxHeight: '70vh', objectFit: 'contain' }}
                  />
                )
              ) : (
                <div
                  style={{
                    width: 320,
                    height: 240,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  Preview unavailable
                </div>
              )}
            </div>

            {/* Caption strip — at the bottom of the lightbox, always visible */}
            <div
              style={{
                background: 'rgba(0,0,0,0.55)',
                color: '#fff',
                padding: '12px 16px',
                fontSize: 13,
                lineHeight: 1.4,
                borderTop: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              {editingCaption && onCaptionUpdate ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={draftCaption}
                    onChange={(e) => setDraftCaption(e.target.value)}
                    placeholder="Caption — what does this show? (e.g. \"south corner flashing — torn after wind storm\")"
                    rows={2}
                    autoFocus
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.95)',
                      color: '#1a1a1a',
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.4)',
                      padding: 8,
                      fontSize: 13,
                      lineHeight: 1.4,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setEditingCaption(false); setDraftCaption(lightbox.caption ?? ''); }}
                      disabled={savingCaption}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.4)',
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: savingCaption ? 'wait' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCaption}
                      disabled={savingCaption}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--robins-egg, #7FCFCB)',
                        color: '#1a1a1a',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: savingCaption ? 'wait' : 'pointer',
                      }}
                    >
                      {savingCaption ? 'Saving…' : 'Save caption'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ flex: 1 }}>
                    {lightbox.caption ?? (
                      <span style={{ opacity: 0.7, fontStyle: 'italic' }}>
                        {onCaptionUpdate ? 'No caption yet.' : (lightbox.original_filename ?? '')}
                      </span>
                    )}
                  </span>
                  {onCaptionUpdate && (
                    <button
                      type="button"
                      onClick={() => setEditingCaption(true)}
                      style={{
                        background: 'transparent',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.5)',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {lightbox.caption ? 'Edit' : 'Add caption'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close preview"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(0,0,0,0.55)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 999,
                width: 36,
                height: 36,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
