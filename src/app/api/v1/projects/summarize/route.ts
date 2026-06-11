import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';
import { assertProjectWriteAccess } from '@/lib/auth/projectOwnership';

const SYSTEM_PROMPT = `You're a foreman giving a project orientation. When given a project description, respond with a SUBSTANTIVE, SPECIFIC contractor take.

RESPOND WITH:
1. Opening: "Alright, here's how I'd read it:" or "Let me think this through:"
2. Then 2–4 concrete observations drawn from the scope:
   - BALLPARK COST RANGE in $X–$Y form
   - SQUARE FOOTAGE if known (e.g. "2,800 sf"), but do NOT quote $/sf — that
     gets derived by the UI from cost ÷ sqft so it always agrees with the
     live numbers. Quoting it in prose drifts as soon as either number
     changes.
   - 2–3 specific risk flags or complexity drivers
   - Long-lead items or site-specific concerns (jurisdiction, climate, code)
3. On its own line: \`Jurisdiction: <city>, <state>\`

VOICE: Foreman. Direct. No disclaimers. No "consult an architect." Specific numbers.
LENGTH: 150–220 words.
Do NOT include "What next?" action buttons.
Do NOT include phrases like "at $X/sf" or "$X–$Y/sf" — the UI renders that badge automatically from the project's cost range and sqft.`;

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  let projectId: string;
  try {
    const body = await request.json() as { project_id?: unknown };
    if (typeof body.project_id !== 'string' || !body.project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 });
    }
    projectId = body.project_id;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // P0 close (2026-06-11): was a strict `user_id !== user.id → 403`, which
  // locked invited collaborators (project_members) and demo users out of
  // re-summarizing — the AI take stayed stale after THEIR perfectly valid
  // field saves. Use the same shared write-access grants as the PATCH path
  // that triggers re-summaries in the first place.
  const access = await assertProjectWriteAccess(request, projectId, user.id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const supabase = getServiceClient();

  const { data: project, error } = await supabase
    .from('command_center_projects')
    .select('raw_input, jurisdiction')
    .eq('id', projectId)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const rawInput = project.raw_input?.trim();
  if (!rawInput) {
    return NextResponse.json({ error: 'Project has no description' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey });

  const userMessage = project.jurisdiction
    ? `${rawInput}\n\nJurisdiction: ${project.jurisdiction}`
    : rawInput;

  let fullText: string;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = msg.content[0];
    fullText = block.type === 'text' ? block.text.trim() : '';
  } catch (err) {
    console.error('[summarize] Claude error:', err);
    return NextResponse.json({ error: 'AI call failed' }, { status: 502 });
  }

  if (!fullText) {
    return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
  }

  // Trim to 600 chars to match the copilot cap on ai_summary.
  const ai_summary = fullText.length > 600
    ? `${fullText.slice(0, 597).trimEnd()}…`
    : fullText;

  // Don't report success if the persist failed — a 200 with a stale row is
  // exactly the silent-staleness P0 symptom (field saves, AI take doesn't).
  const { error: updateError } = await supabase
    .from('command_center_projects')
    .update({ ai_summary, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (updateError) {
    console.error('[summarize] persist error:', updateError);
    return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 });
  }

  return NextResponse.json({ ai_summary });
}
