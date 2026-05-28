/**
 * Project conversations API (Project Spine v1, 2026-05-03).
 *
 *   POST /api/v1/projects/[id]/conversations
 *     Append one row to project_conversations. Auth required.
 *
 *   GET /api/v1/projects/[id]/conversations
 *     List the project's conversation rows ordered by created_at asc.
 *
 * Ownership is enforced at the API layer via getAuthUser + a project
 * lookup. RLS on the underlying table is permissive (matches the
 * existing pattern across project_* tables).
 *
 * Next.js 15+ params signature is `{ params: Promise<{ id: string }> }`.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthUser,
  getServiceClient,
  unauthorizedResponse,
} from '@/lib/auth-server';
import { assertProjectReadAccess } from '@/lib/auth/projectOwnership';

interface ConversationRow {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// 2026-05-28 (auth-repair): see comment in attachments/route.ts. Local
// strict-owner check replaced by the shared guard so demo-allowlist
// projects don't 403 here either.
const assertProjectOwnership = (
  request: NextRequest,
  projectId: string,
  userId: string,
) => assertProjectReadAccess(request, projectId, userId);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { id: projectId } = await params;

    const ownership = await assertProjectOwnership(request, projectId, user.id);
    if (!ownership.ok) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    const { data, error } = await getServiceClient()
      .from('project_conversations')
      .select('id, project_id, role, content, metadata, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      conversations: (data ?? []) as ConversationRow[],
    });
  } catch (e) {
    console.error('Conversations GET error:', e);
    return NextResponse.json(
      { error: 'Failed to load conversations' },
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
      role?: string;
      content?: string;
      metadata?: Record<string, unknown>;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const role = body.role;
    const content = typeof body.content === 'string' ? body.content : '';
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
      return NextResponse.json(
        { error: "role must be 'user' | 'assistant' | 'system'" },
        { status: 400 }
      );
    }
    if (!content.trim()) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    const ownership = await assertProjectOwnership(request, projectId, user.id);
    if (!ownership.ok) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    const { data, error } = await getServiceClient()
      .from('project_conversations')
      .insert([
        {
          project_id: projectId,
          role,
          content,
          metadata: body.metadata ?? {},
        },
      ])
      .select('id, project_id, role, content, metadata, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json(
      { conversation: data as ConversationRow },
      { status: 201 }
    );
  } catch (e) {
    console.error('Conversations POST error:', e);
    return NextResponse.json(
      { error: 'Failed to append conversation' },
      { status: 500 }
    );
  }
}
