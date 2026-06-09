/**
 * /api/garden/capture — the "Ask or tell the garden" magic button's REAL
 * persistence path. Every input from the shared App Shell is captured to the
 * signed-in user's account memory in Supabase, tagged to project + lane:
 *
 *   POST (multipart/form-data)
 *     text        — the note / question (optional if a file is attached)
 *     lane        — lane slug ('owner' | 'gc' | …) the capture is tagged to
 *     projectId   — active project (optional; required to file an attachment)
 *     surface     — pathname the capture came from (for audit)
 *     file        — optional photo / video / file
 *
 *   → text  lands in `copilot_interactions` (query + citation_audit tag)
 *   → files upload to the `project-evidence` bucket and land in
 *     `project_attachments` (project_id/user_id native; lane in step_id)
 *
 *   GET ?projectId=&lane=  → the user's recent captures (survives reload)
 *
 * NO schema changes — project/lane tags reuse existing columns
 * (copilot_interactions.citation_audit jsonb; project_attachments.workflow_id
 * + step_id). INSERT on copilot_interactions is service-role only (RLS), so
 * this route runs server-side with the service client after verifying the
 * caller's Bearer token. Fail-closed: no token → 401.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'project-evidence';
const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function kindFromMime(mime: string | undefined): 'photo' | 'video' | 'file' {
  if (!mime) return 'file';
  if (mime.startsWith('image/')) return 'photo';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
}

function safeName(name: string): string {
  return (name || 'upload').replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const text = String(form.get('text') ?? '').trim();
  const lane = String(form.get('lane') ?? 'gc').slice(0, 40);
  const surface = String(form.get('surface') ?? '').slice(0, 200);
  const rawProjectId = String(form.get('projectId') ?? '').trim();
  const projectId = UUID_RE.test(rawProjectId) ? rawProjectId : null;
  const fileEntry = form.get('file');
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

  if (!text && !file) {
    return NextResponse.json({ error: 'Nothing to capture — add a note or a file' }, { status: 400 });
  }
  if (file && file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large (50MB max)' }, { status: 413 });
  }

  const svc = getServiceClient();
  let attachmentPath: string | null = null;
  let attachmentName: string | null = null;
  const kind = file ? kindFromMime(file.type) : null;

  // 1) File → storage + project_attachments (when a real project is in scope).
  if (file) {
    const path = `${user.id}/${projectId ?? 'unscoped'}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await svc.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upErr) {
      console.error('[garden/capture] storage upload failed:', upErr.message);
      return NextResponse.json({ error: 'Could not store the file' }, { status: 500 });
    }
    attachmentPath = path;
    attachmentName = file.name;

    if (projectId) {
      const { error: paErr } = await svc.from('project_attachments').insert({
        project_id: projectId,
        user_id: user.id,
        file_path: path,
        mime_type: file.type || 'application/octet-stream',
        byte_size: file.size,
        original_filename: file.name,
        caption: text || null,
        workflow_id: 'ask-the-garden',
        step_id: lane,
      });
      if (paErr) {
        console.error('[garden/capture] project_attachments insert failed:', paErr.message);
        // Non-fatal: the file is stored and we still log the interaction below.
      }
    }
  }

  // 2) Always log the interaction to account memory, tagged to project + lane.
  const query = text || (kind ? `Shared a ${kind}${attachmentName ? ` — ${attachmentName}` : ''}` : 'Sent to the garden');
  const { data: inserted, error: ciErr } = await svc
    .from('copilot_interactions')
    .insert({
      user_id: user.id,
      query,
      model: 'ask-the-garden',
      prompt_version: 'app-shell-v1',
      citation_audit: {
        source: 'ask_the_garden',
        project_id: projectId,
        lane,
        surface,
        attachment_path: attachmentPath,
        original_filename: attachmentName,
        kind,
      },
    })
    .select('id, created_at')
    .single();

  if (ciErr) {
    console.error('[garden/capture] copilot_interactions insert failed:', ciErr.message);
    return NextResponse.json({ error: 'Could not save to your garden' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: inserted?.id,
    created_at: inserted?.created_at,
    attachment: attachmentPath,
  });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  const lane = url.searchParams.get('lane');

  const svc = getServiceClient();
  let q = svc
    .from('copilot_interactions')
    .select('id, query, created_at, citation_audit')
    .eq('user_id', user.id)
    .eq('model', 'ask-the-garden')
    .order('created_at', { ascending: false })
    .limit(8);
  if (projectId) q = q.eq('citation_audit->>project_id', projectId);
  if (lane) q = q.eq('citation_audit->>lane', lane);

  const { data, error } = await q;
  if (error) {
    console.error('[garden/capture] recent fetch failed:', error.message);
    return NextResponse.json({ items: [] });
  }

  const items = (data ?? []).map((r) => {
    const ca = (r.citation_audit ?? {}) as { attachment_path?: string | null };
    return {
      id: r.id as string,
      query: r.query as string,
      created_at: r.created_at as string,
      has_attachment: !!ca.attachment_path,
    };
  });
  return NextResponse.json({ items });
}
