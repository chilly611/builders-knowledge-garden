import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET — load saved (unresolved) attention items
export async function GET() {
  try {
    const { data } = await getSupabase()
      .from('command_center_attention')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(15);
    return NextResponse.json({ items: data || [] });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

// POST — run AI COO analysis on provided projects
export async function POST(request: NextRequest) {
  try {
    const { projects } = await request.json();

    if (!projects?.length) {
      return NextResponse.json({ items: [], message: 'No projects to analyze' });
    }

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const projectLines = projects.map((p: {
      name: string; phase: string; progress: number;
      budget_amount?: number; budget_status?: string;
      risk_level?: string; next_milestone?: string; milestone_date?: string;
      project_type?: string; location?: string; client_name?: string;
    }) => {
      const budget = p.budget_amount
        ? `$${Number(p.budget_amount).toLocaleString()}`
        : 'no budget set';
      const milestone = p.next_milestone
        ? `next: "${p.next_milestone}"${p.milestone_date ? ` on ${p.milestone_date}` : ''}`
        : 'no milestone set';
      return `- ${p.name} [${p.phase}, ${p.progress}% done, budget: ${budget} (${p.budget_status || 'on-track'}), risk: ${p.risk_level || 'medium'}, ${milestone}${p.location ? `, ${p.location}` : ''}${p.client_name ? `, client: ${p.client_name}` : ''}]`;
    }).join('\n');

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are an AI COO for a construction company. Today is ${today}.

Analyze these active projects and identify the most important items needing attention. Be a real COO — specific, actionable, dollar-aware.

PROJECTS:
${projectLines}

Return ONLY valid JSON (no markdown fences):
{
  "items": [
    {
      "urgency": "red",
      "title": "Short, punchy title",
      "project": "exact project name",
      "body": "1-2 sentences: what's the issue and why does it matter right now (be specific about costs, dates, risks)",
      "options": ["Action option 1", "Action option 2", "Action option 3"]
    }
  ]
}

RULES:
- 5-10 items total
- urgency: "red" = needs action TODAY, "yellow" = this week, "green" = good news/milestone reached
- options: 2-3 short action choices for red/yellow items; empty array [] for green
- Be construction-smart: mention real dollar impacts, code requirements, schedule ripples
- Prioritize: budget overruns > schedule slips > permit expirations > safety > payment delays > FYI
- For 0% progress projects in PLAN phase: suggest first steps
- For 90%+ projects in BUILD/DELIVER: flag final inspection, payment draws, punch list
- If budget is not set for an active project, flag that as yellow`,
      }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{"items":[]}';
    const clean = raw.replace(/```json[\s\S]*?```|```[\s\S]*?```/g, match =>
      match.replace(/```json\n?|```\n?/g, '')
    ).trim();

    let items: Array<{
      urgency: string; title: string; project: string; body: string; options: string[];
    }> = [];

    try {
      const parsed = JSON.parse(clean);
      items = parsed.items || [];
    } catch {
      // Try to extract JSON from the response
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        items = parsed.items || [];
      }
    }

    // Save to Supabase — clear old AI-generated items first, then insert new ones
    const sb = getSupabase();
    await sb.from('command_center_attention')
      .delete()
      .eq('ai_generated', true);

    if (items.length > 0) {
      await sb.from('command_center_attention').insert(
        items.map(item => ({
          project_name: item.project,
          urgency: item.urgency,
          title: item.title,
          body: item.body,
          options: item.options || [],
          ai_generated: true,
          resolved: false,
        }))
      );
    }

    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    console.error('AI analysis error:', e);
    return NextResponse.json({ error: 'Analysis failed — check ANTHROPIC_API_KEY', items: [] }, { status: 500 });
  }
}

// PATCH — resolve / dismiss an attention item
export async function PATCH(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { error } = await getSupabase()
      .from('command_center_attention')
      .update({ resolved: true })
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to resolve item' }, { status: 500 });
  }
}
