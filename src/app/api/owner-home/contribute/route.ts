/**
 * POST /api/owner-home/contribute
 *
 * The Owner's field-log composer (SA3). Accepts a note + optional file
 * reference and records it to the Owner's "contributions" stream — the same
 * stream the GC sees in the project's field log.
 *
 * The write is gated by the Lens: 'create' on `photos_field_logs`. A denied
 * Lens fails closed with 403 even if the client UI somehow enabled the button.
 *
 * PERSISTENCE IS NOT WIRED. There is no contributions table in the current
 * schema (the seed uses a static OwnerContribution[]). This endpoint validates
 * the permission + payload and acknowledges; persisting to a shared
 * contributions store is a follow-up once that table lands. See tasks.todo.md.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { checkLensPermission } from '@/lib/lens/check-permission';

const ALLOWED_KINDS = new Set(['photo', 'video', 'sketch', 'receipt']);

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const preview = process.env.NODE_ENV !== 'production' && url.searchParams.get('preview') === '1';

  let body: { projectId?: string; kind?: string; note?: string; fileName?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projectId, kind, note } = body;
  if (!projectId || !kind || !note?.trim()) {
    return NextResponse.json({ error: 'projectId, kind, and note are required' }, { status: 400 });
  }
  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: 'Unsupported kind' }, { status: 400 });
  }

  if (!preview) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const decision = await checkLensPermission({
      userId: user.id,
      projectId,
      dataCategory: 'photos_field_logs',
      action: 'create',
    });
    if (decision !== 'permitted') {
      return NextResponse.json({ error: 'Your Lens does not permit adding to the field log' }, { status: 403 });
    }
  }

  // TODO(persistence): insert into the contributions store once it exists, so
  // the entry shows up in both the Owner field log and the GC view.
  return NextResponse.json({ ok: true, recorded: { kind, hasFile: !!body.fileName } });
}
