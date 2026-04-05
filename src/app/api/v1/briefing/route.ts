import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceClient } from '@/lib/supabase';

interface BriefingRequest {
  lane: string;
  projects?: any[];
  location?: string;
  weather?: any;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  action_type: string;
}

interface BriefingResponse {
  briefing: string;
  quests: Quest[];
  generated_at: string;
}

const LANE_COLORS: Record<string, string> = {
  dreamer: '#1D9E75',
  builder: '#E8443A',
  specialist: '#D85A30',
  merchant: '#BA7517',
  ally: '#378ADD',
  crew: '#666666',
  fleet: '#BA7517',
  machine: '#7F77DD',
};

const LANE_PROMPTS: Record<string, string> = {
  dreamer: `You are a warm, encouraging briefing AI for dreamers. Generate a personalized morning briefing that:
- Uses aspirational, inspiring language
- References specific dream home features, design inspirations, or vision milestones
- Includes a personal touch ("We found three Mediterranean kitchens that match your Oracle profile...")
- Celebrates progress and possibilities
- Ends with a motivational thought for the day
Keep it under 150 words.`,

  builder: `You are a sharp, efficient briefing AI for builders. Generate a focused morning briefing that:
- Leads with project status and any critical issues ("5 projects, zero fires. Almost.")
- Identifies delays or problems with proposed solutions ("Steel delivery is 2 days late—I've already called the supplier")
- Lists key tasks in priority order
- Uses direct, action-oriented language
- Mentions logistics, supply chain, or timeline impacts
Keep it under 150 words.`,

  specialist: `You are a technical, code-focused briefing AI for specialists. Generate a professional briefing that:
- Highlights technical updates or requirements
- References code, systems, or regulatory changes
- Mentions bid adjustments, rate changes, or compliance items
- Uses industry-specific terminology
- Focuses on what needs updating or reviewing today
Keep it under 150 words.`,

  merchant: `You are a data-driven briefing AI for merchants. Generate an analytical briefing that:
- Opens with market data (prices, trends, demand signals)
- References competitive activity and contractor search patterns
- Uses percentages and specific numbers
- Identifies opportunities based on market conditions
- Suggests pricing or positioning adjustments
Keep it under 150 words.`,

  ally: `You are a professional, collaborative briefing AI for allies. Generate a partnership-focused briefing that:
- Highlights projects awaiting review or collaboration
- Lists approval deadlines and decision points
- References stakeholder needs and dependencies
- Uses inclusive, team-oriented language
- Emphasizes coordination and communication
Keep it under 150 words.`,

  crew: `You are a safety-first briefing AI for crew members. Generate a clear, simple briefing that:
- Opens with weather and environmental conditions
- Includes safety reminders (sunscreen, hydration, equipment checks)
- Lists today's work tasks in simple terms
- Mentions any hazards or safety considerations
- Uses plain, direct language
Keep it under 150 words.`,

  fleet: `You are a logistics-focused briefing AI for fleet managers. Generate an operational briefing that:
- Opens with deployment status ("All 8 units deployed")
- Flags maintenance schedules and readiness issues
- Identifies idle units and potential assignments
- Mentions demand signals or nearby opportunities
- Uses operational metrics and timelines
Keep it under 150 words.`,

  machine: `You are a structured JSON briefing AI for machine/AI systems. Generate a briefing that:
- Returns pure data in JSON format with no narrative
- Includes status metrics, alerts, and KPIs
- Structures information for programmatic parsing
- Uses consistent field names and data types
Keep it under 150 words.`,
};

const QUEST_GENERATORS: Record<string, () => Quest[]> = {
  dreamer: () => [
    {
      id: 'dream-vision',
      title: 'Refine Your Vision',
      description: 'Update your dream home priorities or inspiration board',
      xp_reward: 100,
      action_type: 'vision',
    },
    {
      id: 'dream-research',
      title: 'Research & Save',
      description: 'Find and save 3 new design inspirations',
      xp_reward: 75,
      action_type: 'research',
    },
    {
      id: 'dream-share',
      title: 'Share Your Dream',
      description: 'Share your vision with a trusted advisor',
      xp_reward: 125,
      action_type: 'share',
    },
  ],

  builder: () => [
    {
      id: 'build-inspect',
      title: 'Site Inspection',
      description: 'Complete today\'s project site walkthrough',
      xp_reward: 150,
      action_type: 'inspection',
    },
    {
      id: 'build-supply',
      title: 'Supply Check',
      description: 'Verify material deliveries and inventory',
      xp_reward: 100,
      action_type: 'inventory',
    },
    {
      id: 'build-team',
      title: 'Team Briefing',
      description: 'Brief your crew on today\'s priorities',
      xp_reward: 125,
      action_type: 'briefing',
    },
  ],

  specialist: () => [
    {
      id: 'spec-review',
      title: 'Update Bids',
      description: 'Adjust active bids for rate changes',
      xp_reward: 150,
      action_type: 'bid',
    },
    {
      id: 'spec-code',
      title: 'Code Review',
      description: 'Review and sign off on specifications',
      xp_reward: 100,
      action_type: 'review',
    },
    {
      id: 'spec-partner',
      title: 'Partner Sync',
      description: 'Align with related specialists on your projects',
      xp_reward: 125,
      action_type: 'sync',
    },
  ],

  merchant: () => [
    {
      id: 'merc-price',
      title: 'Price Update',
      description: 'Adjust pricing based on market conditions',
      xp_reward: 150,
      action_type: 'pricing',
    },
    {
      id: 'merc-leads',
      title: 'Follow Leads',
      description: 'Contact contractors searching for your products',
      xp_reward: 125,
      action_type: 'leads',
    },
    {
      id: 'merc-forecast',
      title: 'Update Forecast',
      description: 'Review demand signals and adjust inventory',
      xp_reward: 100,
      action_type: 'forecast',
    },
  ],

  ally: () => [
    {
      id: 'ally-approve',
      title: 'Review & Approve',
      description: 'Sign off on pending project specs',
      xp_reward: 150,
      action_type: 'approval',
    },
    {
      id: 'ally-feedback',
      title: 'Share Feedback',
      description: 'Provide input on 2 partner submissions',
      xp_reward: 100,
      action_type: 'feedback',
    },
    {
      id: 'ally-sync',
      title: 'Team Sync',
      description: 'Schedule alignment with key stakeholders',
      xp_reward: 125,
      action_type: 'sync',
    },
  ],

  crew: () => [
    {
      id: 'crew-safety',
      title: 'Safety Check',
      description: 'Complete pre-work safety checklist',
      xp_reward: 100,
      action_type: 'safety',
    },
    {
      id: 'crew-work',
      title: 'Daily Work',
      description: 'Complete assigned work tasks',
      xp_reward: 150,
      action_type: 'work',
    },
    {
      id: 'crew-report',
      title: 'End-of-Day Report',
      description: 'Log hours and report completion',
      xp_reward: 75,
      action_type: 'report',
    },
  ],

  fleet: () => [
    {
      id: 'fleet-dispatch',
      title: 'Dispatch Units',
      description: 'Assign idle units to pending jobs',
      xp_reward: 150,
      action_type: 'dispatch',
    },
    {
      id: 'fleet-maintain',
      title: 'Schedule Maintenance',
      description: 'Book maintenance for units needing service',
      xp_reward: 125,
      action_type: 'maintenance',
    },
    {
      id: 'fleet-track',
      title: 'Track Performance',
      description: 'Review utilization and fuel metrics',
      xp_reward: 100,
      action_type: 'analytics',
    },
  ],

  machine: () => [
    {
      id: 'machine-sync',
      title: 'System Sync',
      description: 'Synchronize with upstream data sources',
      xp_reward: 100,
      action_type: 'sync',
    },
    {
      id: 'machine-optimize',
      title: 'Performance Tune',
      description: 'Optimize processing pipelines',
      xp_reward: 150,
      action_type: 'optimize',
    },
    {
      id: 'machine-validate',
      title: 'Data Validation',
      description: 'Validate data integrity and consistency',
      xp_reward: 125,
      action_type: 'validate',
    },
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body: BriefingRequest = await request.json();
    const { lane, projects = [], location, weather } = body;

    if (!lane) {
      return NextResponse.json(
        { error: 'Lane is required' },
        { status: 400 }
      );
    }

    const laneKey = lane.toLowerCase();
    const prompt = LANE_PROMPTS[laneKey] || LANE_PROMPTS.builder;
    const questGenerator = QUEST_GENERATORS[laneKey] || QUEST_GENERATORS.builder;

    // Build context for the prompt
    const contextLines: string[] = [];
    if (projects && projects.length > 0) {
      contextLines.push(`Active projects: ${projects.map((p) => p.name).join(', ')}`);
    }
    if (location) {
      contextLines.push(`Location: ${location}`);
    }
    if (weather) {
      contextLines.push(
        `Weather: ${weather.temp}°F, ${weather.condition}${weather.uvIndex ? `, UV: ${weather.uvIndex}` : ''}`
      );
    }

    const context = contextLines.length > 0 ? `\n\nContext:\n${contextLines.join('\n')}` : '';
    const fullPrompt = `${prompt}${context}`;

    // Call Anthropic API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    let briefingContent = '';

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
    });

    // Collect the streamed content
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        briefingContent += chunk.delta.text;
      }
    }

    // Generate quests
    const quests = questGenerator();

    // Prepare response
    const response: BriefingResponse = {
      briefing: briefingContent.trim(),
      quests,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Briefing generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate briefing' },
      { status: 500 }
    );
  }
}
