'use client';

/**
 * AttachmentUploader — standalone component for uploading jobsite photos/videos
 * to projects. Phase 1: infrastructure only. Phase 2 will wire step-level integration.
 *
 * Props:
 *   projectId (required): UUID of the project to attach files to
 *   workflowId (optional): will be stored if provided, for Phase 2 step-level integration
 *   stepId (optional): will be stored if provided, for Phase 2 step-level integration
 *   onUploaded (optional): callback fired after all uploads complete, receives array of uploaded attachments
 *
 * Usage (Phase 2 integration):
 *   <AttachmentUploader projectId={projectId} workflowId="estimating" stepId="photos" onUploaded={...} />
 *
 * Features:
 *   - Drag-and-drop zone with click fallback
 *   - Rear camera trigger on mobile (capture="environment")
 *   - Per-file progress indicator
 *   - Client-side file size validation (50MB limit)
 *   - Styled consistent with BKG design language (Trace, Graphite, Robin's Egg, Brass, Archivo)
 *   - Error handling per-file (batch uploads continue even if one fails)
 *   - Auth-gated via Supabase client session
 *
 * EXIF parsing: Not implemented (exifr not in dependencies). Could be added in Phase 2.
 */

import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  // 2026-05-07: PDF support so q4 (signed contracts) and q8 (approved
  // permit docs) can use this same uploader. Camera capture stays for
  // photo workflows; <input> below accepts PDFs via accept="image/*,video/*,application/pdf".
  'application/pdf',
];

interface UploadedAttachment {
  id: string;
  file_path: string;
  original_filename: string | null;
  mime_type: string;
  byte_size: bigint;
  created_at: string;
}

interface FileUploadState {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  result?: UploadedAttachment;
}

interface AttachmentUploaderProps {
  projectId: string;
  workflowId?: string;
  stepId?: string;
  onUploaded?: (attachments: UploadedAttachment[]) => void;
}

export default function AttachmentUploader({
  projectId,
  workflowId,
  stepId,
  onUploaded,
}: AttachmentUploaderProps) {
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragZoneRef = useRef<HTMLDivElement>(null);

  const sanitizeFilename = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 200);
  };

  const uploadFile = async (file: File): Promise<UploadedAttachment | null> => {
    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large (max 50MB). This file is ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      }

      // Validate mime type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(`File type not allowed. Supported: images (JPEG/PNG/HEIC/WebP), videos (MP4/MOV/WebM), PDFs.`);
      }

      // Get auth session
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const userId = data.session?.user?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }

      // Generate unique file path: project-evidence/<user_id>/<projectId>/<uuid>-<sanitized_name>
      const fileId = crypto.randomUUID();
      const sanitized = sanitizeFilename(file.name);
      const ext = file.name.split('.').pop() || '';
      const uploadFilename = `${fileId}-${sanitized}`;
      const filePath = `${userId}/${projectId}/${uploadFilename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-evidence')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Record metadata via API
      const response = await fetch(`/api/v1/projects/${projectId}/attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          file_path: filePath,
          mime_type: file.type,
          byte_size: file.size,
          original_filename: file.name,
          caption: null,
          workflow_id: workflowId || null,
          step_id: stepId || null,
          exif_taken_at: null,
          exif_lat: null,
          exif_lng: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save metadata: ${errorData.error || 'unknown error'}`);
      }

      const { attachment } = await response.json();
      return attachment as UploadedAttachment;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(message);
    }
  };

  const handleFiles = useCallback(
    async (files: FileList) => {
      const newUploads: FileUploadState[] = Array.from(files).map((file) => ({
        file,
        status: 'pending',
        progress: 0,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      // Process uploads sequentially (could parallelize if desired)
      const uploadedAttachments: UploadedAttachment[] = [];

      for (let i = uploads.length; i < uploads.length + newUploads.length; i++) {
        const uploadState = uploads[i] || newUploads[i - uploads.length];
        if (!uploadState) continue;

        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === i ? { ...u, status: 'uploading' } : u
          )
        );

        try {
          const result = await uploadFile(uploadState.file);
          if (result) {
            uploadedAttachments.push(result);
            setUploads((prev) =>
              prev.map((u, idx) =>
                idx === i ? { ...u, status: 'success', progress: 100, result } : u
              )
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Upload failed';
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === i
                ? { ...u, status: 'error', error: errorMessage }
                : u
            )
          );
        }
      }

      // Fire callback after all uploads
      if (uploadedAttachments.length > 0 && onUploaded) {
        onUploaded(uploadedAttachments);
      }
    },
    [uploads.length, workflowId, stepId, projectId, onUploaded]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === dragZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const clearUploads = () => {
    setUploads([]);
  };

  const hasErrors = uploads.some((u) => u.status === 'error');
  const isUploading = uploads.some((u) => u.status === 'uploading' || u.status === 'pending');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
      }}
    >
      {/* Drag-and-drop zone */}
      <div
        ref={dragZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          position: 'relative',
          padding: '32px 16px',
          border: `2px dashed ${isDragging ? 'var(--robin)' : 'var(--faded-rule)'}`,
          borderRadius: '8px',
          backgroundColor: isDragging ? 'rgba(127, 207, 203, 0.08)' : 'var(--trace)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'center',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            fontSize: '32px',
          }}
        >
          📷
        </div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--graphite)',
          }}
        >
          Drop a file here
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--graphite)',
            opacity: 0.6,
          }}
        >
          or click to browse — photos, videos, or PDFs (max 50MB)
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          capture="environment"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Upload progress list */}
      {uploads.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {uploads.map((upload, idx) => {
            const statusIcon =
              upload.status === 'uploading'
                ? '⏳'
                : upload.status === 'success'
                  ? '✓'
                  : upload.status === 'error'
                    ? '✕'
                    : '⋯';

            const statusColor =
              upload.status === 'error'
                ? '#A1473A'
                : upload.status === 'success'
                  ? 'var(--robin)'
                  : 'var(--brass)';

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#fff',
                  border: `1px solid var(--faded-rule)`,
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    color: statusColor,
                    minWidth: '20px',
                    textAlign: 'center',
                  }}
                >
                  {statusIcon}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      color: 'var(--graphite)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {upload.file.name}
                  </div>
                  {upload.error && (
                    <div
                      style={{
                        color: '#A1473A',
                        fontSize: '11px',
                        marginTop: '4px',
                      }}
                    >
                      {upload.error}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--graphite)',
                    opacity: 0.6,
                  }}
                >
                  {(upload.file.size / 1024 / 1024).toFixed(1)}MB
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clear button */}
      {uploads.length > 0 && !isUploading && (
        <button
          onClick={clearUploads}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: `1px solid var(--faded-rule)`,
            borderRadius: '6px',
            color: 'var(--graphite)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'var(--font-archivo), sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--trace)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Clear {uploads.length === 1 ? 'file' : `${uploads.length} files`}
        </button>
      )}

      {/* Error summary */}
      {hasErrors && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#FFEBEE',
            border: '1px solid #A1473A',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#A1473A',
          }}
        >
          {uploads.filter((u) => u.status === 'error').length} file(s) failed to upload.
        </div>
      )}
    </div>
  );
}
