import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET — return the latest heartbeat report
export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('heartbeat_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return NextResponse.json({ report: data || null });
  } catch (e) {
    console.error('Heartbeat GET error:', e);
    return NextResponse.json({ report: null });
  }
}

// POST — generate a new heartbeat (called by cron or manually)
export async function POST(request: NextRequest) {
  // Verify cron secret for scheduled calls
  const authHeader = request.headers.get('authorization');
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const body = await request.json().catch(() => ({}));
  const location = body.location || 'United States';
  const projectTypes = body.project_types || ['residential', 'commercial'];

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    // Call Claude with web search to gather real-time intelligence
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as Parameters<typeof anthropic.messages.create>[0]['tools'],
      messages: [{
        role: 'user',
        content: `You are an AI COO for construction companies. Today is ${today}. Generate a comprehensive nightly intelligence briefing for contractors operating in ${location} working on ${projectTypes.join(', ')} projects.

Search the web for CURRENT information across ALL of these categories and compile a briefing:

1. WEATHER & ENVIRONMENT: Current conditions and 7-day forecast. Any severe weather, frost, heavy rain, high winds, extreme heat alerts. Air quality index and wildfire smoke. Impact on outdoor work, concrete pours, roofing.

2. MATERIAL PRICES: Current lumber (framing lumber futures), steel rebar and structural steel, ready-mix concrete, copper wire prices. Any supply disruptions, tariff changes, or major price movements this week.

3. CODES & REGULATIONS: Any new building code adoptions, OSHA safety bulletins, EPA updates, or local ordinance changes. Any product safety recalls for construction materials or equipment.

4. INFRASTRUCTURE: Major road closures or construction that could affect job site access or material deliveries. Utility outages, grid issues, water main breaks affecting construction areas. Any permit office closures or changes.

5. LABOR & MARKET: Construction labor market conditions. Any union activity, wage changes, or worker shortage alerts. Construction industry economic indicators (housing starts, permits pulled this week).

6. FINANCIAL: Current construction loan rates, material cost indices. Any tax credits, incentives, or financing changes relevant to construction. Inflation impact on construction costs.

7. LEGAL & COMPLIANCE: Recent contractor license requirement changes, lien law updates, insurance requirement shifts. Any notable contractor enforcement actions or new liability precedents.

8. SUPPLY CHAIN: Lead time changes for key materials (windows, doors, HVAC equipment, electrical gear). Port conditions affecting imported materials. Supplier news.

9. SAFETY ALERTS: New OSHA citations patterns, equipment recalls, hazard bulletins. Fall protection, excavation, heat illness, silica exposure news.

10. LOCAL OPPORTUNITIES: New permits pulled in the area (signals competitor activity and market health). Infrastructure projects that need subcontractors. Government contracts posted.

Return ONLY valid JSON (no markdown, no backticks):
{
  "summary": "2-3 sentence executive summary of the most important things contractors need to know today",
  "generated_at": "${today}",
  "location": "${location}",
  "alert_level": "green|yellow|red",
  "alert_reason": "Why this level (one sentence)",
  "categories": {
    "weather": {
      "headline": "short headline",
      "status": "green|yellow|red",
      "details": "2-3 sentences with specifics",
      "action": "What contractors should do today"
    },
    "materials": {
      "headline": "short headline",
      "status": "green|yellow|red", 
      "details": "2-3 sentences with specifics",
      "action": "Recommendation"
    },
    "codes_regulations": {
      "headline": "short headline",
      "status": "green|yellow|red",
      "details": "2-3 sentences",
      "action": "What to check or do"
    },
    "infrastructure": {
      "headline": "short headline",
      "status": "green|yellow|red",
      "details": "2-3 sentences",
      "action": "Plan accordingly"
    },
    "labor_market": {
      "headline": "short headline",
      "status": "green|yellow|red",
      "details": "2-3 sentences",
      "action": "Recommendation"
    },
    "financial": {
      "headline": "short headline",
      "status": "green|yellow|red",
      "details": "2-3 sentences",
      "action": "Financial action item"
    },
    "legal_compliance": {
      "headline": "short headline",
      "status": "green|yellow|red",
      "details": "2-3 sentences",
      "action": "Compliance action"
    },
    "supply_chain": {
      "headline": "short headline",
      "status": "green|yellow|red",
      "details": "2-3 sentences",
      "action": "Procurement action"
    },
    "safety": {
      "headline": "short headline",
      "status": "green|yellow|red",
      "details": "2-3 sentences",
      "action": "Safety action for today"
    },
    "opportunities": {
      "headline": "short headline",
      "status": "green|yellow|red",
      "details": "2-3 sentences",
      "action": "Business development action"
    }
  },
  "top_actions": [
    "Most important thing to do today #1",
    "Most important thing to do today #2",
    "Most important thing to do today #3"
  ]
}`,
      }],
    });

    // Extract the text content (Claude may use web search tool calls first)
    let reportText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        reportText = block.text;
      }
    }

    // Parse JSON from response
    const clean = reportText
      .replace(/```json[\s\S]*?```|```[\s\S]*?```/g, m => m.replace(/```json\n?|```\n?/g, ''))
      .trim();

    let reportData: Record<string, unknown> = {};
    try {
      // Try to find JSON in the response
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      reportData = {
        summary: 'Intelligence briefing generated — see categories for details.',
        generated_at: today,
        location,
        alert_level: 'green',
        alert_reason: 'No critical issues detected.',
        categories: {},
        top_actions: [],
        raw: reportText,
      };
    }

    // Save to Supabase
    const { data: saved, error: saveError } = await getSupabase()
      .from('heartbeat_reports')
      .insert([{
        location,
        project_types: projectTypes,
        alert_level: reportData.alert_level || 'green',
        summary: reportData.summary || '',
        report_data: reportData,
        generated_by: isCron ? 'cron' : 'manual',
      }])
      .select()
      .single();

    if (saveError) throw saveError;

    return NextResponse.json({ report: saved, ok: true });
  } catch (e) {
    console.error('Heartbeat generation error:', e);
    return NextResponse.json({ error: 'Heartbeat generation failed', details: String(e) }, { status: 500 });
  }
}
