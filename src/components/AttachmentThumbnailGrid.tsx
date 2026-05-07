'use client';

/**
 * AttachmentThumbnailGrid — rehydration grid for project_attachments.
 *
 * Renders a 3-column grid of signed-URL <img>/<video> thumbnails for
 * already-uploaded jobsite evidence. Click a thumbnail to enlarge in a
 * lightbox. Empty/loading states are intentionally minimal — the parent
 * (AttachmentSection) controls the surrounding chrome.
 *
 * Data shape matches what `GET /api/v1/projects/[id]/attachments` returns:
 *   - signed_url is generated server-side, valid 1 hour
 *   - mime_type tells us whether to render as <img> or <video>
 *   - workflow_id / step_id are stamped on each row at upload time
 *
 * Lightbox:
 *   Plain JS modal. No portal — sits inside the same React tree, fixed
 *   positioning. Click backdrop or press Esc to close. No third-party
 *   dependency to keep the bundle slim and the demo path stable.
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
}

function isVideo(mimeType: string) {
  return mimeType.startsWith('video/');
}

export default function AttachmentThumbnailGrid({
  attachments,
  loading = false,
}: AttachmentThumbnailGridProps) {
  const [lightbox, setLightbox] = useState<Attachment | null>(null);

  // Esc closes the lightbox.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  if (loading && attachments.length === 0) {
    return (
      <div
        style={{
          fontSize: 12,
          color: 'var(--graphite)',
          opacity: 0.6,
        }}
        aria-live="polite"
      >
        Loading attachments…
      </div>
    );
  }

  if (attachments.length === 0) return null;

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
          return (
            <button
              key={a.id}
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
                  // Video poster — first frame via metadata preload.
                  <video
                    src={url}
                    preload="metadata"
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <img
                    src={url}
                    alt={a.original_filename ?? 'attachment'}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                )
              ) : (
                // Fallback when signed URL generation failed (rare).
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
                  {showVideo ? '🎞️' : '🖼️'}
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
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Attachment preview"
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            cursor: 'zoom-out',
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
            }}
          >
            {lightbox.signed_url ? (
              isVideo(lightbox.mime_type) ? (
                <video
                  src={lightbox.signed_url}
                  controls
                  autoPlay
                  style={{
                    display: 'block',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                  }}
                />
              ) : (
                <img
                  src={lightbox.signed_url}
                  alt={lightbox.original_filename ?? 'attachment'}
                  style={{
                    display: 'block',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                  }}
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
            {(lightbox.original_filename || lightbox.caption) && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '12px 16px',
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)',
                  color: '#fff',
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                {lightbox.caption ?? lightbox.original_filename}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
