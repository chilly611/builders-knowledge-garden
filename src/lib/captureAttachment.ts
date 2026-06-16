'use client';

/**
 * uploadProjectAttachment — the canonical client-side "put a file on a project"
 * step, lifted verbatim from AttachmentUploader so the CaptureZone routes media
 * (photo/video/upload/sketch) through the exact same #21 persist path:
 *   client upload → Supabase Storage `project-evidence/<user_id>/<projectId>/…`
 *   → POST /api/v1/projects/<id>/attachments (metadata row).
 *
 * Auth-gated (needs a Supabase session). Throws on any failure so callers can
 * surface an honest error instead of silently dropping the capture.
 */

import { supabase } from '@/lib/supabase';

export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024; // 50MB

export const ALLOWED_ATTACHMENT_MIME = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
];

export interface UploadedAttachment {
  id: string;
  file_path: string;
  original_filename: string | null;
  mime_type: string;
  byte_size: number;
  created_at: string;
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 200);
}

export async function uploadProjectAttachment(
  file: File,
  projectId: string,
  opts: { workflowId?: string; stepId?: string; caption?: string } = {}
): Promise<UploadedAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `File too large (max 50MB). This file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`
    );
  }
  if (file.type && !ALLOWED_ATTACHMENT_MIME.includes(file.type)) {
    throw new Error('Unsupported file type. Use a photo, video, or PDF.');
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const userId = data.session?.user?.id;
  if (!token || !userId) {
    throw new Error('Not signed in');
  }

  const fileId = crypto.randomUUID();
  const sanitized = sanitizeFilename(file.name || 'capture');
  const filePath = `${userId}/${projectId}/${fileId}-${sanitized}`;

  const { error: uploadError } = await supabase.storage
    .from('project-evidence')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });
  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const response = await fetch(`/api/v1/projects/${projectId}/attachments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_path: filePath,
      mime_type: file.type || 'application/octet-stream',
      byte_size: file.size,
      original_filename: file.name || null,
      caption: opts.caption ?? null,
      workflow_id: opts.workflowId ?? null,
      step_id: opts.stepId ?? null,
      exif_taken_at: null,
      exif_lat: null,
      exif_lng: null,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to save attachment: ${errorData.error || response.status}`);
  }

  const { attachment } = await response.json();
  return attachment as UploadedAttachment;
}
