import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { Anthropic } from '@anthropic-ai/sdk';

const supabase = getServiceClient();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Quest {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  action_type: string;
  completed: boolean;
}

const LANE_QUESTS: Record<string, { title: string; description: string; action_type: string; xp_reward: number }[]> = {
  Builder: [
    {
      title: 'Complete a budget review',
      description: 'Review and finalize project budgets to ensure cost control',
      action_type: 'budget_under_target',
      xp_reward: 75,
    },
    {
      title: 'Resolve an open RFI',
      description: 'Address and close a Request for Information from stakeholders',
      action_type: 'rfi_resolved',
      xp_reward: 50,
    },
    {
      title: 'Generate a schedule update',
      description: 'Create or update project timeline and milestones',
      action_type: 'schedule_created',
      xp_reward: 75,
    },
  ],
  Dreamer: [
    {
      title: 'Save a new dream concept',
      description: 'Capture and save an architectural dream or design idea',
      action_type: 'dream_saved',
      xp_reward: 30,
    },
    {
      title: 'Explore 3 architectural styles',
      description: 'Research and view architectural styles or design inspirations',
      action_type: 'knowledge_entity_viewed',
      xp_reward: 50,
    },
    {
      title: 'Share your design with a friend',
      description: 'Share a saved dream or design concept with a collaborator',
      action_type: 'dream_shared',
      xp_reward: 50,
    },
  ],
  Specialist: [
    {
      title: 'Update crew rates to current standards',
      description: 'Review and adjust labor rates for your crew members',
      action_type: 'estimate_generated',
      xp_reward: 75,
    },
    {
      title: 'Review code changes in your jurisdiction',
      description: 'Audit recent building code updates relevant to your area',
      action_type: 'code_lookup',
      xp_reward: 50,
    },
    {
      title: 'Submit a compliance check',
      description: 'Verify project compliance with local regulations',
      action_type: 'compliance_check',
      xp_reward: 30,
    },
  ],
  Crew: [
    {
      title: 'Submit a safety log',
      description: 'Document daily safety observations and incidents',
      action_type: 'safety_log_submitted',
      xp_reward: 25,
    },
    {
      title: 'Review project documentation',
      description: 'Read through project specs and safety requirements',
      action_type: 'knowledge_searched',
      xp_reward: 30,
    },
    {
      title: 'Report site conditions',
      description: 'Document current site status and any issues',
      action_type: 'inspection_passed',
      xp_reward: 50,
    },
  ],
};

async function generateQuestsWithAI(
  userLane: string,
  userHistory: Record<string, number>
): Promise<{ title: string; description: string; action_type: string; xp_reward: number }[]> {
  const laneQuests = LANE_QUESTS[userLane] || LANE_QUESTS.Builder;

  // Use Claude to optionally customize quests based on user history
  // For now, return default quests; extend this with AI personalization as needed
  try {
    const prompt = `You are a quest designer for a construction/architecture project management gamification system.
The user is in the "${userLane}" lane and has recently completed these action types: ${Object.entries(userHistory)
      .map(([action, count]) => `${action} (${count} times)`)
      .join(', ')}.

Based on their lane and recent activity, generate 3 daily quests that:
1. Are achievable in one day
2. Encourage real project work (not artificial engagement)
3. Vary the types of actions they complete

Return ONLY a JSON array with 3 quest objects, each with: { title, description, action_type, xp_reward }
Do NOT include any markdown or explanation, just the JSON array.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      const parsed = JSON.parse(content.text);
      if (Array.isArray(parsed) && parsed.length === 3) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('AI quest generation error, falling back to defaults:', error);
  }

  return laneQuests;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if quests exist for today
    const { data: existingQuests, error: questError } = await supabase
      .from('quests')
      .select('id, title, description, xp_reward, action_type, completed')
      .eq('user_id', user.id)
      .eq('date', today);

    if (questError) throw questError;

    if (existingQuests && existingQuests.length === 3) {
      return NextResponse.json(existingQuests);
    }

    // Get user's lane
    const { data: userData } = await supabase
      .from('users')
      .select('lane')
      .eq('id', user.id)
      .single();

    const userLane = userData?.lane || 'Builder';

    // Get user's recent action history for personalization
    const { data: recentEvents } = await supabase
      .from('xp_events')
      .select('action')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const actionHistory: Record<string, number> = {};
    recentEvents?.forEach((event: any) => {
      actionHistory[event.action] = (actionHistory[event.action] || 0) + 1;
    });

    // Generate quests
    const generatedQuests = await generateQuestsWithAI(userLane, actionHistory);

    // Insert quests into database
    const quests: Quest[] = generatedQuests.map((quest) => ({
      id: `${user.id}-${today}-${Math.random().toString(36).substring(7)}`,
      title: quest.title,
      description: quest.description,
      xp_reward: quest.xp_reward,
      action_type: quest.action_type,
      completed: false,
    }));

    const { error: insertError } = await supabase.from('quests').insert(
      quests.map((quest) => ({
        user_id: user.id,
        date: today,
        title: quest.title,
        description: quest.description,
        xp_reward: quest.xp_reward,
        action_type: quest.action_type,
        completed: false,
      }))
    );

    if (insertError) throw insertError;

    return NextResponse.json(quests);
  } catch (error) {
    console.error('GET /api/v1/quests/daily error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quest_id } = await request.json();

    if (!quest_id) {
      return NextResponse.json(
        { error: 'Missing quest_id' },
        { status: 400 }
      );
    }

    // Mark quest as complete
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('xp_reward, action_type')
      .eq('id', quest_id)
      .eq('user_id', user.id)
      .single();

    if (questError) throw questError;

    const { error: updateError } = await supabase
      .from('quests')
      .update({ completed: true })
      .eq('id', quest_id);

    if (updateError) throw updateError;

    // Award XP for completing the quest
    let xpEarned = quest.xp_reward;

    // Check if all 3 quests are now complete for bonus multiplier
    const today = new Date().toISOString().split('T')[0];
    const { data: allQuests } = await supabase
      .from('quests')
      .select('completed')
      .eq('user_id', user.id)
      .eq('date', today);

    const allCompleted =
      allQuests && allQuests.length === 3 && allQuests.every((q) => q.completed);

    if (allCompleted) {
      xpEarned = Math.floor(xpEarned * 2); // 2x multiplier for completing all 3
    }

    // Award XP via the XP endpoint (simulating action completion)
    const { error: xpError } = await supabase.from('xp_events').insert({
      user_id: user.id,
      action: 'quest_completed',
      xp_earned: xpEarned,
      metadata: {
        quest_id,
        action_type: quest.action_type,
        all_quests_completed: allCompleted,
        bonus_applied: allCompleted,
      },
      created_at: new Date().toISOString(),
    });

    if (xpError) throw xpError;

    // Update user's total XP
    const { data: xpData } = await supabase
      .from('user_xp')
      .select('total_xp')
      .eq('user_id', user.id)
      .single();

    const newTotal = (xpData?.total_xp || 0) + xpEarned;

    const { error: upsertError } = await supabase
      .from('user_xp')
      .upsert(
        {
          user_id: user.id,
          total_xp: newTotal,
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) throw upsertError;

    return NextResponse.json({
      success: true,
      xp_earned: xpEarned,
      all_quests_completed: allCompleted,
      bonus_applied: allCompleted,
      new_total: newTotal,
    });
  } catch (error) {
    console.error('POST /api/v1/quests/complete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
