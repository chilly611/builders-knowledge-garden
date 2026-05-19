/**
 * POST /api/v1/uploads/photo
 *
 * Ship 10 (2026-05-18) — real photo upload pipeline behind the
 * "Who's asking?" lead-intake surface. Replaces the previous
 * `placeholder://<filename>` stub in WhoIsAskingClient with an actual
 * Supabase Storage upload, returning a public URL that can be persisted
 * into `crm_contacts.source_photo_url`.
 *
 * Request:
 *   Content-Type: multipart/form-data
 *   Field: `photo` (File, image/*, max 10 MB)
 *
 * Response (200):
 *   { ok: true, url, path, sizeBytes, mimeType }
 *
 * Errors:
 *   400  — validation (missing/oversize/non-image)
 *   500  — Supabase config missing or upload failed
 *
 * Auth: This route uses the service-role Supabase client (matches the
 * pattern in /api/v1/projects/[id]/attachments/route.ts). The `crm-photos`
 * bucket is PUBLIC, so we return `getPublicUrl(...)` directly — no signing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'crm-photos';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function sanitizeFilename(name: string): string {
  // Strip path separators, collapse whitespace, drop anything weird.
  const base = name.split(/[\\/]/).pop() || 'photo';
  return base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'photo';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Expected multipart/form-data body' },
      { status: 400 }
    );
  }

  const fileField = form.get('photo');
  if (!fileField || !(fileField instanceof File)) {
    return NextResponse.json(
      { ok: false, error: 'Missing `photo` file field' },
      { status: 400 }
    );
  }
  const file: File = fileField;

  const mimeType = file.type || 'application/octet-stream';
  if (!mimeType.startsWith('image/')) {
    return NextResponse.json(
      { ok: false, error: `Unsupported mime type: ${mimeType}` },
      { status: 400 }
    );
  }

  const sizeBytes = file.size;
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json(
      { ok: false, error: 'Empty file' },
      { status: 400 }
    );
  }
  if (sizeBytes > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: `File too large (${sizeBytes} bytes; max ${MAX_BYTES})` },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[uploads/photo] Supabase config missing');
    return NextResponse.json(
      { ok: false, error: 'Server storage not configured' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const random = Math.random().toString(36).slice(2, 10);
  const sanitized = sanitizeFilename(file.name || 'photo');
  const path = `${Date.now()}-${random}-${sanitized}`;

  // Convert the Web File to an ArrayBuffer for the storage SDK.
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch (err) {
    console.error('[uploads/photo] failed to read file bytes:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to read upload' },
      { status: 500 }
    );
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploads/photo] Supabase upload error:', uploadError);
    return NextResponse.json(
      { ok: false, error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = publicUrlData?.publicUrl;
  if (!publicUrl) {
    return NextResponse.json(
      { ok: false, error: 'Upload succeeded but public URL unavailable' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    url: publicUrl,
    path,
    sizeBytes,
    mimeType,
  });
}
