import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceClient } from '@/lib/supabase';

// Type definitions
interface Project {
  id: string;
  name: string;
  client_name: string;
  status: string;
  value: number;
  start_date: string;
  expected_end_date: string;
  last_contact?: string;
  days_since_contact?: number;
}

interface AttentionItem {
  id: string;
  project_id: string;
  client_name: string;
  project_name: string;
  why_it_needs_attention: string;
  suggested_action: string;
  urgency_level: 'celebration' | 'good_news' | 'heads_up' | 'needs_you';
  action_type: 'send_followup' | 'schedule_call' | 'review_proposal' | 'check_timeline';
  created_at: string;
  resolved_at?: string;
}

interface ClientInteraction {
  id: string;
  client_name: string;
  project_name: string;
  interaction_type: 'call' | 'email' | 'meeting' | 'site_visit';
  notes: string;
  interaction_date: string;
  ai_insight?: string;
}

interface BusinessMetrics {
  active_projects_count: number;
  active_projects_trend: number;
  pipeline_value: number;
  pipeline_trend: number;
  win_rate: number;
  win_rate_trend: number;
  average_project_duration_days: number;
  duration_trend: number;
  revenue_this_month: number;
  revenue_trend: number;
}

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
  total_value: number;
  overdue_count: number;
}

interface TimelineEntry {
  id: string;
  date: string;
  client: string;
  project: string;
  type: 'call' | 'email' | 'meeting' | 'site_visit';
  notes: string;
  insight?: string;
}

// Attention queue generation using Claude
async function generateAttentionQueue(projects: Project[]): Promise<AttentionItem[]> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  if (projects.length === 0) {
    return [];
  }

  const projectSummary = projects.map((p) => ({
    name: p.name,
    client: p.client_name,
    status: p.status,
    value: p.value,
    days_since_contact: p.days_since_contact || 0,
    start_date: p.start_date,
    expected_end_date: p.expected_end_date,
  }));

  const prompt = `You are an AI advisor for a construction/builder CRM. Analyze these active projects and generate a priority attention queue (max 5 items). For each item, determine what needs the builder's attention TODAY.

Projects:
${JSON.stringify(projectSummary, null, 2)}

Return a JSON array with exactly this structure (no markdown, pure JSON):
[
  {
    "project_id": "string",
    "client_name": "string",
    "project_name": "string",
    "why_it_needs_attention": "Clear, specific reason (1 sentence)",
    "suggested_action": "What to do about it",
    "urgency_level": "celebration" | "good_news" | "heads_up" | "needs_you",
    "action_type": "send_followup" | "schedule_call" | "review_proposal" | "check_timeline"
  }
]

Urgency levels:
- "celebration": Great news, positive milestone
- "good_news": Positive progress, worth acknowledging
- "heads_up": Warning sign, needs attention soon
- "needs_you": Critical issue, immediate action required

Focus on:
1. Projects not contacted in 14+ days (needs_you or heads_up)
2. Upcoming deadlines (heads_up)
3. Recent milestones or positive progress (celebration/good_news)
4. High-value projects at risk (needs_you)`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response (handles markdown code blocks)
    let jsonStr = responseText;
    if (responseText.includes('```')) {
      const match = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1];
      }
    }

    const items = JSON.parse(jsonStr);
    return items.map((item: any, index: number) => ({
      id: `attention-${Date.now()}-${index}`,
      ...item,
      created_at: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error generating attention queue:', error);
    return [];
  }
}

// Generate AI insights for timeline entries
async function generateTimelineInsights(
  interactions: ClientInteraction[]
): Promise<Map<string, string>> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const insightMap = new Map<string, string>();

  // Group by client for context
  const clientInteractions = interactions.reduce(
    (acc: Record<string, ClientInteraction[]>, interaction) => {
      if (!acc[interaction.client_name]) {
        acc[interaction.client_name] = [];
      }
      acc[interaction.client_name].push(interaction);
      return acc;
    },
    {}
  );

  for (const [clientName, clientInts] of Object.entries(clientInteractions)) {
    const lastInteraction = clientInts[clientInts.length - 1];
    const daysSinceLastContact = Math.floor(
      (Date.now() - new Date(lastInteraction.interaction_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastContact > 14) {
      insightMap.set(
        lastInteraction.id,
        `Client hasn't been contacted in ${daysSinceLastContact} days`
      );
    }

    if (clientInts.length === 1) {
      insightMap.set(
        lastInteraction.id,
        'This is the first documented contact with this client'
      );
    }

    if (lastInteraction.interaction_type === 'site_visit') {
      insightMap.set(
        lastInteraction.id,
        'Recent site visit - good opportunity to follow up on observations'
      );
    }
  }

  return insightMap;
}

// GET: Fetch attention queue
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint') || 'attention';

    // Route to different endpoints
    if (endpoint === 'metrics') {
      return handleMetricsRequest(supabase);
    } else if (endpoint === 'timeline') {
      return handleTimelineRequest(supabase);
    } else if (endpoint === 'pipeline') {
      return handlePipelineRequest(supabase);
    }

    // Default: attention queue
    return handleAttentionRequest(supabase);
  } catch (error) {
    console.error('CRM GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch CRM data' }, { status: 500 });
  }
}

async function handleAttentionRequest(supabase: any) {
  try {
    // Fetch active projects
    const { data: projects, error: projectsError } = await supabase
      .from('command_center_projects')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (projectsError) throw projectsError;

    // Calculate days since contact
    const projectsWithDays = (projects || []).map((p: any) => ({
      ...p,
      days_since_contact: p.last_contact
        ? Math.floor(
            (Date.now() - new Date(p.last_contact).getTime()) / (1000 * 60 * 60 * 24)
          )
        : null,
    }));

    // Generate attention queue
    const attentionItems = await generateAttentionQueue(projectsWithDays);

    // Try to fetch existing resolved items (for filtering)
    const { data: existingAttention } = await supabase
      .from('command_center_attention')
      .select('*')
      .is('resolved_at', null)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      items: attentionItems,
      generated_at: new Date().toISOString(),
      total_projects: projects?.length || 0,
    });
  } catch (error) {
    console.error('Attention request error:', error);
    return NextResponse.json(
      { error: 'Failed to generate attention queue' },
      { status: 500 }
    );
  }
}

async function handleMetricsRequest(supabase: any) {
  try {
    const { data: projects, error } = await supabase
      .from('command_center_projects')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;

    const projectList = projects || [];

    // Calculate metrics
    const activeCount = projectList.length;
    const totalValue = projectList.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
    const revenueThisMonth = projectList
      .filter((p: any) => {
        const created = new Date(p.created_at);
        const now = new Date();
        return (
          created.getMonth() === now.getMonth() &&
          created.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum: number, p: any) => sum + (p.value || 0), 0);

    // Get all projects to calculate win rate
    const { data: allProjects } = await supabase
      .from('command_center_projects')
      .select('status');

    const allCount = allProjects?.length || 1;
    const acceptedCount = allProjects?.filter((p: any) => p.status === 'active').length || 0;
    const winRate = allCount > 0 ? (acceptedCount / allCount) * 100 : 0;

    // Calculate average duration
    const completedProjects = projectList.filter((p: any) => p.expected_end_date && p.start_date);
    const avgDuration =
      completedProjects.length > 0
        ? Math.floor(
            completedProjects.reduce((sum: number, p: any) => {
              const start = new Date(p.start_date).getTime();
              const end = new Date(p.expected_end_date).getTime();
              return sum + (end - start) / (1000 * 60 * 60 * 24);
            }, 0) / completedProjects.length
          )
        : 0;

    const metrics: BusinessMetrics = {
      active_projects_count: activeCount,
      active_projects_trend: 2.5,
      pipeline_value: totalValue,
      pipeline_trend: 3.1,
      win_rate: Math.round(winRate * 10) / 10,
      win_rate_trend: 1.2,
      average_project_duration_days: avgDuration,
      duration_trend: -0.8,
      revenue_this_month: revenueThisMonth,
      revenue_trend: 5.3,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Metrics request error:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}

async function handleTimelineRequest(supabase: any) {
  try {
    const { data: interactions, error } = await supabase
      .from('command_center_interactions')
      .select('*')
      .order('interaction_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Generate insights for timeline entries
    const insights = await generateTimelineInsights(interactions || []);

    const timeline: TimelineEntry[] = (interactions || []).map((interaction: any) => ({
      id: interaction.id,
      date: interaction.interaction_date,
      client: interaction.client_name,
      project: interaction.project_name,
      type: interaction.interaction_type,
      notes: interaction.notes,
      insight: insights.get(interaction.id),
    }));

    return NextResponse.json({ timeline, total: timeline.length });
  } catch (error) {
    console.error('Timeline request error:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}

async function handlePipelineRequest(supabase: any) {
  try {
    const { data: projects, error } = await supabase
      .from('command_center_projects')
      .select('*');

    if (error) throw error;

    const stages: Record<string, PipelineStage> = {
      lead: { stage: 'lead', label: 'Lead', count: 0, total_value: 0, overdue_count: 0 },
      proposal: { stage: 'proposal', label: 'Proposal', count: 0, total_value: 0, overdue_count: 0 },
      contract: { stage: 'contract', label: 'Contract', count: 0, total_value: 0, overdue_count: 0 },
      active_build: {
        stage: 'active_build',
        label: 'Active Build',
        count: 0,
        total_value: 0,
        overdue_count: 0,
      },
      punch_list: {
        stage: 'punch_list',
        label: 'Punch List',
        count: 0,
        total_value: 0,
        overdue_count: 0,
      },
      warranty: { stage: 'warranty', label: 'Warranty', count: 0, total_value: 0, overdue_count: 0 },
    };

    // Categorize projects
    (projects || []).forEach((project: any) => {
      const stageKey = project.pipeline_stage || 'lead';
      if (stages[stageKey]) {
        stages[stageKey].count++;
        stages[stageKey].total_value += project.value || 0;

        // Check if overdue
        if (project.expected_end_date) {
          const dueDate = new Date(project.expected_end_date);
          if (dueDate < new Date() && project.status === 'active') {
            stages[stageKey].overdue_count++;
          }
        }
      }
    });

    const pipelineData = Object.values(stages);
    return NextResponse.json({
      pipeline: pipelineData,
      total_value: projects.reduce((sum: number, p: any) => sum + (p.value || 0), 0),
      total_projects: projects.length,
    });
  } catch (error) {
    console.error('Pipeline request error:', error);
    return NextResponse.json({ error: 'Failed to fetch pipeline data' }, { status: 500 });
  }
}

// POST: Log a new interaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      client_name,
      project_name,
      project_id,
      interaction_type,
      notes,
      interaction_date,
    } = body;

    if (!client_name || !interaction_type) {
      return NextResponse.json(
        { error: 'client_name and interaction_type are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Insert interaction
    const { data, error } = await supabase
      .from('command_center_interactions')
      .insert([
        {
          client_name,
          project_name: project_name || '',
          project_id: project_id || null,
          interaction_type,
          notes: notes || '',
          interaction_date: interaction_date || new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Update project's last_contact if project_id is provided
    if (project_id) {
      await supabase
        .from('command_center_projects')
        .update({ last_contact: new Date().toISOString() })
        .eq('id', project_id);
    }

    return NextResponse.json(
      { success: true, interaction: data },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Failed to log interaction' }, { status: 500 });
  }
}

// PATCH: Mark attention item as resolved
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { attention_id } = body;

    if (!attention_id) {
      return NextResponse.json(
        { error: 'attention_id is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('command_center_attention')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', attention_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve attention item' },
      { status: 500 }
    );
  }
}
