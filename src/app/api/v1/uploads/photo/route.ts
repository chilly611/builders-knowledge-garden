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
 *   401  — not signed in (2026-05-22)
 *   500  — Supabase config missing or upload failed
 *
 * Auth: Requires a signed-in user (Bearer token). Previously this route
 * was unauthenticated, which combined with a public bucket and a trusted
 * client mime type allowed arbitrary unauthenticated uploads — confirmed
 * in the 2026-05-21 audit. We still use the service-role client to write
 * to storage (matches /api/v1/projects/[id]/attachments/route.ts), but
 * the path is prefixed with the user id so writes are partitioned by
 * uploader, mime type is sniffed from the bytes (not the client header)
 * before upload, and a simple per-user in-memory rate limit caps abuse.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-server';

const BUCKET = 'crm-photos';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Allowed image mime types — we verify by magic-byte sniff, not the
// client-supplied Content-Type header.
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

// 2026-05-22: lightweight per-user rate limit — 30 uploads / 10 min. The
// route is auth-gated now, so this is mainly a brake on a compromised
// session, not a DoS shield. The store is per-instance (Vercel) and
// resets on cold start; an attacker could hop instances but the upper
// bound on cost is bucket storage, not LLM tokens.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 30;
const rateLimitBuckets: Map<string, number[]> = new Map();
function rateLimitExceeded(userId: string): boolean {
  const now = Date.now();
  const arr = (rateLimitBuckets.get(userId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    rateLimitBuckets.set(userId, arr);
    return true;
  }
  arr.push(now);
  rateLimitBuckets.set(userId, arr);
  return false;
}

function sanitizeFilename(name: string): string {
  // Strip path separators, collapse whitespace, drop anything weird.
  const base = name.split(/[\\/]/).pop() || 'photo';
  return base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'photo';
}

/**
 * Magic-byte sniff. We don't trust the client mime header — uploads of
 * .html/.svg/.js disguised as image/png were the audit's named attack.
 * Returns the detected mime or null if the bytes don't look like one of
 * our allowed image formats.
 */
function sniffImageMime(buf: Uint8Array): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // GIF: 47 49 46 38 (GIF8)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  // WEBP: "RIFF"...."WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';
  // HEIC/HEIF: "....ftypheic|heix|hevc|mif1|msf1|heim|heis"
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
    if (brand === 'heic' || brand === 'heix' || brand === 'hevc' || brand === 'mif1' || brand === 'msf1') {
      return 'image/heic';
    }
  }
  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 2026-05-22 (Sec+Auth Burn 6): require auth. Public uploads to a public
  // bucket were a confirmed P0 — anyone could fill the bucket with hostile
  // payloads.
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse('Sign in to upload photos');
  if (rateLimitExceeded(user.id)) {
    return NextResponse.json(
      { ok: false, error: 'Too many uploads — slow down and try again in a few minutes.' },
      { status: 429 }
    );
  }

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

  // 2026-05-22: sniff mime from actual bytes — DO NOT trust file.type. The
  // audit hostile-upload case attached image/png as the Content-Type while
  // the body was HTML with a <script> tag; the bucket is public, so a
  // browser following the public URL would render the page same-origin
  // with the storage domain.
  const head = new Uint8Array(bytes.slice(0, 16));
  const sniffedMime = sniffImageMime(head);
  if (!sniffedMime || !ALLOWED_MIME.has(sniffedMime)) {
    return NextResponse.json(
      { ok: false, error: 'File does not appear to be a supported image (jpeg/png/webp/gif/heic).' },
      { status: 400 }
    );
  }
  const mimeType = sniffedMime;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const random = Math.random().toString(36).slice(2, 10);
  const sanitized = sanitizeFilename(file.name || 'photo');
  // Owner-prefixed path so we can scope deletes / audits by user later
  // without renaming objects.
  const path = `u/${user.id}/${Date.now()}-${random}-${sanitized}`;

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
