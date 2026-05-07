'use client';

/**
 * AttachmentSection — workflow-step-scoped photo/video evidence panel.
 *
 * Phase 2 of the photo/video upload system (2026-05-07). Phase 1 shipped
 * the standalone `AttachmentUploader` and the `/api/v1/projects/[id]/attachments`
 * routes. This component is the consumer atom every workflow client mounts
 * to give a workflow step its own evidence surface.
 *
 * Responsibilities:
 *   - Fetch existing attachments for (projectId, workflowId, stepId) on mount
 *   - Render an `AttachmentThumbnailGrid` of what's already there
 *   - Render an `AttachmentUploader` to add more
 *   - On successful upload: re-fetch the list AND optionally call
 *     `onUploaded` so the parent client can `recordStepEvent` (which marks
 *     the workflow step complete in the autosave JSONB and gives the user
 *     XP credit)
 *
 * Props:
 *   - projectId: required. UUID of the active project. If missing, render
 *     a "sign in / pick a project to start uploading" affordance.
 *   - workflowId: required. The workflow this evidence belongs to (e.g. "q15").
 *   - stepId: required. The named step inside the workflow (e.g. "upload").
 *     Pair (workflowId, stepId) is what we filter by when listing.
 *   - title: required. Section header. Foreman-vernacular ("Upload progress photos").
 *   - subtitle: optional. One-line context ("These show up in your daily log
 *     summary and are tagged to this project automatically.").
 *   - onUploaded: optional. Called with the new attachments after each
 *     successful batch. Workflow clients use this to call `recordStepEvent`.
 *
 * Why this lives at the workflow-client level (not inside StepCard):
 *   StepCard's existing `file_upload` step type is a stub from W7. Plumbing
 *   `projectId` + `workflowId` through StepCard would touch every workflow's
 *   render path — too risky pre-demo. Hosting this as a sibling section keeps
 *   the change surface tight: one new component + ~5 lines per workflow
 *   client. Subsequent sessions can fold this into StepCard if desired.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AttachmentUploader from './AttachmentUploader';
import AttachmentThumbnailGrid, {
  type Attachment,
} from './AttachmentThumbnailGrid';

interface AttachmentSectionProps {
  projectId: string | null | undefined;
  workflowId: string;
  stepId: string;
  title: string;
  subtitle?: string;
  onUploaded?: (attachments: Attachment[]) => void;
}

interface UploadedAttachment {
  id: string;
  file_path: string;
  original_filename: string | null;
  mime_type: string;
  byte_size: bigint | number;
  created_at: string;
}

async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export default function AttachmentSection({
  projectId,
  workflowId,
  stepId,
  title,
  subtitle,
  onUploaded,
}: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await authedFetch(
        `/api/v1/projects/${encodeURIComponent(projectId)}/attachments`
      );
      if (!res.ok) {
        // 401 = not signed in; surface a soft pill instead of an error
        if (res.status === 401) {
          setLoadError('signed-out');
          return;
        }
        const body = await res.json().catch(() => ({}));
        setLoadError(body.error || `Failed to load (${res.status})`);
        return;
      }
      const json = (await res.json()) as { attachments: Attachment[] };
      // Filter to the (workflowId, stepId) pair this section owns. The API
      // returns ALL attachments for the project; per-step filtering is
      // client-side because Postgres jsonb-style query params aren't worth
      // wiring for a preview surface.
      const filtered = (json.attachments || []).filter(
        (a) => a.workflow_id === workflowId && a.step_id === stepId
      );
      setAttachments(filtered);
    } catch (e) {
      console.error('AttachmentSection fetch error:', e);
      setLoadError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [projectId, workflowId, stepId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleUploaded = useCallback(
    (uploaded: UploadedAttachment[]) => {
      // Refetch so we have signed URLs (the POST response doesn't include
      // them — they're computed in the GET handler).
      fetchAttachments();
      // Caller hook (e.g. recordStepEvent) — give it the same shape as the
      // grid so it doesn't have to re-fetch independently. Cast through the
      // shared Attachment type; signed_url isn't in the POST response shape
      // but consumers (so far) don't need it.
      onUploaded?.(
        uploaded.map((a) => ({
          ...a,
          byte_size: typeof a.byte_size === 'bigint' ? Number(a.byte_size) : a.byte_size,
          signed_url: null,
          signed_url_expires_at: null,
          workflow_id: workflowId,
          step_id: stepId,
          caption: null,
        })) as Attachment[]
      );
    },
    [fetchAttachments, onUploaded, workflowId, stepId]
  );

  return (
    <section
      style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 960,
        margin: '0 auto',
        padding: '16px 28px',
      }}
      data-testid="attachment-section"
      data-workflow-id={workflowId}
      data-step-id={stepId}
    >
      <div
        style={{
          border: '1px solid var(--faded-rule, #C9C3B3)',
          borderRadius: 12,
          padding: 20,
          background: 'var(--trace, #F4F0E6)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: 'var(--brass, #B6873A)',
              marginBottom: 6,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                color: 'var(--graphite, #2E2E30)',
                opacity: 0.75,
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* No-project state: most likely an anonymous user who hasn't
            described a project yet. Send them home with a clear nudge. */}
        {!projectId && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--graphite)',
              opacity: 0.75,
              margin: 0,
            }}
          >
            Pick a project up top to start uploading evidence.
          </p>
        )}

        {projectId && loadError === 'signed-out' && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--graphite)',
              opacity: 0.75,
              margin: 0,
            }}
          >
            Sign in (top right) to upload and keep your photos.
          </p>
        )}

        {projectId && loadError && loadError !== 'signed-out' && (
          <p
            style={{
              fontSize: 13,
              color: '#A1473A',
              margin: '0 0 12px',
            }}
          >
            {loadError}
          </p>
        )}

        {projectId && loadError !== 'signed-out' && (
          <>
            {/* Existing attachments grid (rehydrated on mount). */}
            {attachments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <AttachmentThumbnailGrid
                  attachments={attachments}
                  loading={loading}
                />
              </div>
            )}

            {/* Uploader for new files. */}
            <AttachmentUploader
              projectId={projectId}
              workflowId={workflowId}
              stepId={stepId}
              onUploaded={handleUploaded}
            />
          </>
        )}
      </div>
    </section>
  );
}
