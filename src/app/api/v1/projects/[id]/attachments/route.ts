/**
 * Project attachments API (Phase 1: infrastructure only, 2026-05-06)
 *
 * GET /api/v1/projects/[id]/attachments
 *   List attachments for the project. Auth required, only returns user's own attachments.
 *   Response: { attachments: [{...row, signed_url, signed_url_expires_at}] }
 *   Signed URLs valid for 1 hour.
 *
 * POST /api/v1/projects/[id]/attachments
 *   Record metadata after client-side upload to Supabase Storage.
 *   Body: { file_path, mime_type, byte_size, original_filename?, caption?, workflow_id?, step_id?, exif_taken_at?, exif_lat?, exif_lng? }
 *   Response: { attachment: {...inserted row} }
 *
 * DELETE /api/v1/projects/[id]/attachments
 *   Delete attachment and its storage object.
 *   Body: { id }
 *   Response: { success: true }
 *
 * Ownership is enforced at the API layer via getAuthUser + project lookup.
 * RLS on the underlying table matches the pattern: owner can select/insert/update/delete
 * where user_id = auth.uid().
 *
 * Next.js 15+ params signature is `{ params: Promise<{ id: string }> }`.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthUser,
  getServiceClient,
  unauthorizedResponse,
} from '@/lib/auth-server';
import { createClient } from '@supabase/supabase-js';

interface AttachmentRow {
  id: string;
  project_id: string;
  user_id: string;
  file_path: string;
  mime_type: string;
  byte_size: bigint;
  original_filename: string | null;
  caption: string | null;
  workflow_id: string | null;
  step_id: string | null;
  exif_taken_at: string | null;
  exif_lat: number | null;
  exif_lng: number | null;
  created_at: string;
}

async function assertProjectOwnership(
  projectId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data, error } = await getServiceClient()
    .from('command_center_projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (error || !data) {
    return { ok: false, status: 404, error: 'Project not found' };
  }

  if (data.user_id !== userId) {
    return {
      ok: false,
      status: 403,
      error: 'Unauthorized: you do not own this project',
    };
  }

  return { ok: true };
}

/**
 * Generate a signed URL for an attachment (1 hour expiry).
 */
async function getSignedUrl(filePath: string): Promise<{ url: string; expiresAt: number } | { error: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { error: 'Supabase config missing' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const ONE_HOUR = 3600;

  const { data, error } = await supabase.storage
    .from('project-evidence')
    .createSignedUrl(filePath, ONE_HOUR);

  if (error || !data) {
    return { error: `Failed to generate signed URL: ${error?.message || 'unknown'}` };
  }

  return {
    url: data.signedUrl,
    expiresAt: Date.now() + ONE_HOUR * 1000,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { id: projectId } = await params;

    const ownership = await assertProjectOwnership(projectId, user.id);
    if (!ownership.ok) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    const { data, error } = await getServiceClient()
      .from('project_attachments')
      .select(
        'id, project_id, user_id, file_path, mime_type, byte_size, original_filename, caption, workflow_id, step_id, exif_taken_at, exif_lat, exif_lng, created_at'
      )
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const attachments = await Promise.all(
      (data ?? []).map(async (row: AttachmentRow) => {
        const signedResult = await getSignedUrl(row.file_path);
        return {
          ...row,
          signed_url: 'url' in signedResult ? signedResult.url : null,
          signed_url_expires_at: 'expiresAt' in signedResult ? signedResult.expiresAt : null,
        };
      })
    );

    return NextResponse.json({ attachments });
  } catch (e) {
    console.error('Attachments GET error:', e);
    return NextResponse.json(
      { error: 'Failed to load attachments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { id: projectId } = await params;

    let body: {
      file_path?: string;
      mime_type?: string;
      byte_size?: number;
      original_filename?: string;
      caption?: string;
      workflow_id?: string;
      step_id?: string;
      exif_taken_at?: string;
      exif_lat?: number;
      exif_lng?: number;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate required fields
    const file_path = body.file_path?.trim();
    const mime_type = body.mime_type?.trim();
    const byte_size = body.byte_size;

    if (!file_path || !mime_type || typeof byte_size !== 'number' || byte_size <= 0) {
      return NextResponse.json(
        { error: 'file_path, mime_type, and byte_size are required' },
        { status: 400 }
      );
    }

    // Verify file_path starts with user's folder to prevent cross-user writes
    const expectedPrefix = `${user.id}/`;
    if (!file_path.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: 'file_path must start with your user ID folder' },
        { status: 403 }
      );
    }

    const ownership = await assertProjectOwnership(projectId, user.id);
    if (!ownership.ok) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    // Insert metadata row
    const { data, error } = await getServiceClient()
      .from('project_attachments')
      .insert([
        {
          project_id: projectId,
          user_id: user.id,
          file_path,
          mime_type,
          byte_size,
          original_filename: body.original_filename || null,
          caption: body.caption || null,
          workflow_id: body.workflow_id || null,
          step_id: body.step_id || null,
          exif_taken_at: body.exif_taken_at || null,
          exif_lat: body.exif_lat || null,
          exif_lng: body.exif_lng || null,
        },
      ])
      .select(
        'id, project_id, user_id, file_path, mime_type, byte_size, original_filename, caption, workflow_id, step_id, exif_taken_at, exif_lat, exif_lng, created_at'
      )
      .single();

    if (error) throw error;

    return NextResponse.json(
      { attachment: data as AttachmentRow },
      { status: 201 }
    );
  } catch (e) {
    console.error('Attachments POST error:', e);
    return NextResponse.json(
      { error: 'Failed to save attachment metadata' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { id: projectId } = await params;

    let body: { id?: string; caption?: string | null };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const attachmentId = body.id?.trim();
    if (!attachmentId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    // Caption is optional but, if present, must be a string. Cap at 500
    // chars to avoid abuse — a caption is for "this is the broken
    // flashing on the south corner", not an essay.
    const caption = body.caption === null ? null : (body.caption ?? null);
    if (caption !== null && typeof caption !== 'string') {
      return NextResponse.json({ error: 'caption must be a string or null' }, { status: 400 });
    }
    if (caption && caption.length > 500) {
      return NextResponse.json({ error: 'caption too long (max 500 chars)' }, { status: 400 });
    }

    const ownership = await assertProjectOwnership(projectId, user.id);
    if (!ownership.ok) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    // Verify attachment ownership before updating.
    const { data: existing, error: fetchError } = await getServiceClient()
      .from('project_attachments')
      .select('id, user_id')
      .eq('id', attachmentId)
      .eq('project_id', projectId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: you do not own this attachment' }, { status: 403 });
    }

    const { data, error } = await getServiceClient()
      .from('project_attachments')
      .update({ caption })
      .eq('id', attachmentId)
      .select(
        'id, project_id, user_id, file_path, mime_type, byte_size, original_filename, caption, workflow_id, step_id, exif_taken_at, exif_lat, exif_lng, created_at'
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ attachment: data as AttachmentRow });
  } catch (e) {
    console.error('Attachments PATCH error:', e);
    return NextResponse.json(
      { error: 'Failed to update attachment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { id: projectId } = await params;

    let body: { id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const attachmentId = body.id?.trim();
    if (!attachmentId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const ownership = await assertProjectOwnership(projectId, user.id);
    if (!ownership.ok) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    // Fetch the attachment to get file_path and verify ownership
    const { data: attachmentRow, error: fetchError } = await getServiceClient()
      .from('project_attachments')
      .select('file_path, user_id')
      .eq('id', attachmentId)
      .eq('project_id', projectId)
      .single();

    if (fetchError || !attachmentRow) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    if (attachmentRow.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: you do not own this attachment' },
        { status: 403 }
      );
    }

    const filePath = attachmentRow.file_path;

    // Delete from storage first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.storage.from('project-evidence').remove([filePath]);
    }

    // Delete metadata row
    const { error: deleteError } = await getServiceClient()
      .from('project_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Attachments DELETE error:', e);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
