import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { Anthropic } from '@anthropic-ai/sdk';

const supabase = getServiceClient();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// XP values by action
const XP_VALUES: Record<string, number> = {
  project_created: 100,
  rfi_resolved: 50,
  estimate_generated: 75,
  schedule_created: 75,
  dream_saved: 30,
  dream_shared: 50,
  knowledge_searched: 10,
  knowledge_entity_viewed: 5,
  code_lookup: 15,
  inspection_passed: 200,
  budget_under_target: 150,
  quest_completed: 0, // varies from quest definition
  streak_bonus: 0, // calculated as streak_days * 5
  safety_log_submitted: 25,
  compliance_check: 30,
};

// Level thresholds
const LEVEL_THRESHOLDS = {
  Apprentice: { min: 0, max: 499 },
  Builder: { min: 500, max: 1999 },
  Craftsman: { min: 2000, max: 4999 },
  Master: { min: 5000, max: 14999 },
  Architect: { min: 15000, max: Infinity },
};

function getLevelFromXP(xp: number): string {
  for (const [level, range] of Object.entries(LEVEL_THRESHOLDS)) {
    if (xp >= range.min && xp <= range.max) {
      return level;
    }
  }
  return 'Apprentice';
}

function getXPToNextLevel(xp: number): number {
  const currentLevel = getLevelFromXP(xp);
  const nextLevelThreshold = Object.values(LEVEL_THRESHOLDS).find(
    (range) => range.min > xp
  )?.min;

  if (!nextLevelThreshold) return 0; // Already at max
  return nextLevelThreshold - xp;
}

interface XPEvent {
  action: string;
  metadata?: Record<string, any>;
  timestamp?: string;
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

    // Fetch user's XP data
    const { data: xpData, error: xpError } = await supabase
      .from('user_xp')
      .select('total_xp, streak_days, longest_streak, last_activity_date')
      .eq('user_id', user.id)
      .single();

    if (xpError && xpError.code !== 'PGRST116') {
      throw xpError;
    }

    const totalXP = xpData?.total_xp || 0;
    const streakDays = xpData?.streak_days || 0;
    const longestStreak = xpData?.longest_streak || 0;
    const currentLevel = getLevelFromXP(totalXP);
    const xpToNextLevel = getXPToNextLevel(totalXP);

    // Fetch recent XP events (last 10)
    const { data: events, error: eventsError } = await supabase
      .from('xp_events')
      .select('action, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (eventsError) throw eventsError;

    return NextResponse.json({
      total_xp: totalXP,
      level: currentLevel,
      xp_to_next_level: xpToNextLevel,
      streak_days: streakDays,
      longest_streak: longestStreak,
      recent_events: events || [],
    });
  } catch (error) {
    console.error('GET /api/v1/xp error:', error);
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

    const body: XPEvent = await request.json();
    const { action, metadata } = body;

    if (!action || !XP_VALUES[action]) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    let xpEarned = XP_VALUES[action];

    // Get current user XP data
    let { data: xpData } = await supabase
      .from('user_xp')
      .select('total_xp, streak_days, longest_streak, last_activity_date')
      .eq('user_id', user.id)
      .single();

    if (!xpData) {
      // Create new record
      xpData = {
        total_xp: 0,
        streak_days: 0,
        longest_streak: 0,
        last_activity_date: null,
      };
    }

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    let newStreakDays = xpData.streak_days || 0;
    let newLongestStreak = xpData.longest_streak || 0;

    if (xpData.last_activity_date) {
      const lastActivityDate = new Date(xpData.last_activity_date)
        .toISOString()
        .split('T')[0];

      if (lastActivityDate !== today) {
        const daysDiff = Math.floor(
          (new Date(today).getTime() - new Date(lastActivityDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          newStreakDays += 1;
        } else if (daysDiff > 1) {
          newStreakDays = 1;
        }

        if (newStreakDays > newLongestStreak) {
          newLongestStreak = newStreakDays;
        }
      }
    } else {
      newStreakDays = 1;
      newLongestStreak = 1;
    }

    // Add streak bonus if applicable (daily bonus)
    if (action === 'streak_bonus') {
      xpEarned = newStreakDays * 5;
    }

    const newTotal = (xpData.total_xp || 0) + xpEarned;
    const oldLevel = getLevelFromXP(xpData.total_xp || 0);
    const newLevel = getLevelFromXP(newTotal);
    const leveledUp = oldLevel !== newLevel;

    // Update or insert XP data
    const { error: upsertError } = await supabase
      .from('user_xp')
      .upsert(
        {
          user_id: user.id,
          total_xp: newTotal,
          streak_days: newStreakDays,
          longest_streak: newLongestStreak,
          last_activity_date: today,
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) throw upsertError;

    // Log the XP event
    const { error: eventError } = await supabase.from('xp_events').insert({
      user_id: user.id,
      action,
      metadata,
      xp_earned: xpEarned,
      created_at: new Date().toISOString(),
    });

    if (eventError) throw eventError;

    return NextResponse.json({
      xp_earned: xpEarned,
      new_total: newTotal,
      level: newLevel,
      leveled_up: leveledUp,
      new_level: leveledUp ? newLevel : undefined,
      streak_days: newStreakDays,
    });
  } catch (error) {
    console.error('POST /api/v1/xp error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
