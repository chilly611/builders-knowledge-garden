import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

type AutonomyMode = 'watch' | 'assist' | 'autonomous';
type ActionStatus = 'pending' | 'success' | 'denied' | 'error';
type ProposalStatus = 'awaiting_approval' | 'approved' | 'rejected' | 'escalated';

interface AgentAction {
  id: string;
  agent_id: string;
  agent_name: string;
  action_type: string;
  timestamp: string;
  status: ActionStatus;
  autonomy_mode: AutonomyMode;
  description: string;
  reasoning?: string;
  source_citations?: string[];
  impact_estimate?: string;
  xp_earned?: number;
}

interface AgentProposal {
  id: string;
  agent_id: string;
  agent_name: string;
  proposal_text: string;
  reasoning: string;
  estimated_impact: string;
  created_at: string;
  status: ProposalStatus;
  escalation_time_remaining?: number;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getErrorResponse(message: string, details?: string): NextResponse<ErrorResponse> {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ============================================================================
// ROUTE: GET /api/v1/agents/activity
// ============================================================================

async function handleGetActivity(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getServiceClient();
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const agentId = searchParams.get('agent_id');
    const mode = (searchParams.get('mode') as AutonomyMode | null) || undefined;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('agent_audit_log')
      .select(
        `
        id,
        agent_id,
        action_type,
        timestamp,
        status,
        metadata,
        agent_identities(id, name)
      `,
        { count: 'exact' },
      )
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (agentId && isValidUUID(agentId)) {
      query = query.eq('agent_id', agentId);
    }

    if (mode) {
      query = query.eq('metadata->>autonomy_mode', mode);
    }

    if (startDate) {
      query = query.gte('timestamp', new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte('timestamp', new Date(endDate).toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return getErrorResponse('Failed to fetch activities', error.message);
    }

    // Transform response
    const activities: AgentAction[] = (data || []).map((row: any) => ({
      id: row.id,
      agent_id: row.agent_id,
      agent_name: row.agent_identities?.name || row.agent_id,
      action_type: row.action_type,
      timestamp: row.timestamp,
      status: row.status,
      autonomy_mode: row.metadata?.autonomy_mode || 'watch',
      description: row.metadata?.description || '',
      reasoning: row.metadata?.reasoning,
      source_citations: row.metadata?.source_citations,
      impact_estimate: row.metadata?.impact_estimate,
      xp_earned: row.metadata?.xp_earned,
    }));

    return NextResponse.json(
      {
        activities,
        total: count || 0,
        limit,
        offset,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Activity fetch error:', message);
    return getErrorResponse('Internal server error', message);
  }
}

// ============================================================================
// ROUTE: GET /api/v1/agents/proposals
// ============================================================================

async function handleGetProposals(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get('status') || 'awaiting_approval';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data, error, count } = await supabase
      .from('agent_proposals')
      .select(
        `
        id,
        agent_id,
        proposal_text,
        reasoning,
        estimated_impact,
        created_at,
        status,
        agent_identities(id, name)
      `,
        { count: 'exact' },
      )
      .eq('status', status)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase query error:', error);
      return getErrorResponse('Failed to fetch proposals', error.message);
    }

    // Calculate escalation time for each proposal
    const proposals: AgentProposal[] = (data || []).map((row: any) => {
      const createdAt = new Date(row.created_at);
      const now = new Date();
      const elapsedMs = now.getTime() - createdAt.getTime();
      const escalationThresholdMs = 5 * 60 * 1000; // 5 minutes
      const escalationTimeRemaining = Math.max(0, escalationThresholdMs - elapsedMs);

      return {
        id: row.id,
        agent_id: row.agent_id,
        agent_name: row.agent_identities?.name || row.agent_id,
        proposal_text: row.proposal_text,
        reasoning: row.reasoning,
        estimated_impact: row.estimated_impact,
        created_at: row.created_at,
        status: row.status,
        escalation_time_remaining: Math.round(escalationTimeRemaining / 1000),
      };
    });

    return NextResponse.json(
      {
        proposals,
        total: count || 0,
        limit,
        offset,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Proposal fetch error:', message);
    return getErrorResponse('Internal server error', message);
  }
}

// ============================================================================
// ROUTE: PATCH /api/v1/agents/proposals/:id
// ============================================================================

async function handlePatchProposal(
  request: NextRequest,
  proposalId: string,
): Promise<NextResponse> {
  try {
    if (!proposalId || !isValidUUID(proposalId)) {
      return getErrorResponse('Invalid proposal ID');
    }

    const body = await request.json();
    const { approved, feedback } = body;

    if (typeof approved !== 'boolean') {
      return getErrorResponse('Missing or invalid "approved" field');
    }

    const supabase = getServiceClient();
    const newStatus: ProposalStatus = approved ? 'approved' : 'rejected';

    // Update proposal status
    const { error: updateError } = await supabase
      .from('agent_proposals')
      .update({
        status: newStatus,
        feedback,
        responded_at: new Date().toISOString(),
      })
      .eq('id', proposalId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return getErrorResponse('Failed to update proposal', updateError.message);
    }

    // Log the response action
    const { data: proposal, error: fetchError } = await supabase
      .from('agent_proposals')
      .select('agent_id')
      .eq('id', proposalId)
      .single();

    if (!fetchError && proposal) {
      await supabase.from('agent_audit_log').insert({
        agent_id: proposal.agent_id,
        action_type: 'proposal_response',
        status: 'success',
        metadata: {
          proposal_id: proposalId,
          approved,
          feedback,
          response_type: 'human_in_the_loop',
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        proposal_id: proposalId,
        status: newStatus,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Proposal patch error:', message);
    return getErrorResponse('Internal server error', message);
  }
}

// ============================================================================
// ROUTE: POST /api/v1/agents/kill
// ============================================================================

async function handleKillSwitch(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getServiceClient();

    // Revoke all agent permissions
    const { error: updateError } = await supabase
      .from('agent_identities')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('is_active', true);

    if (updateError) {
      console.error('Supabase revocation error:', updateError);
      return getErrorResponse('Failed to revoke permissions', updateError.message);
    }

    // Get all active agents
    const { data: agents, error: fetchError } = await supabase
      .from('agent_identities')
      .select('id')
      .eq('is_active', false)
      .eq('revoked_at', new Date().toISOString());

    if (!fetchError && agents) {
      // Log kill switch action for each agent
      const auditLogs = agents.map((agent: any) => ({
        agent_id: agent.id,
        action_type: 'emergency_revocation',
        status: 'success',
        metadata: {
          autonomy_mode: 'autonomous',
          action: 'all_permissions_revoked',
          trigger: 'emergency_kill_switch',
        },
      }));

      if (auditLogs.length > 0) {
        await supabase.from('agent_audit_log').insert(auditLogs);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'All agent permissions revoked',
        affected_agents: agents?.length || 0,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Kill switch error:', message);
    return getErrorResponse('Internal server error', message);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // GET /api/v1/agents/activity
  if (pathname === '/api/v1/agents/activity') {
    return handleGetActivity(request);
  }

  // GET /api/v1/agents/proposals
  if (pathname === '/api/v1/agents/proposals') {
    return handleGetProposals(request);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // PATCH /api/v1/agents/proposals/:id
  const proposalMatch = pathname.match(/^\/api\/v1\/agents\/proposals\/([^/]+)$/);
  if (proposalMatch) {
    return handlePatchProposal(request, proposalMatch[1]);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // POST /api/v1/agents/kill
  if (pathname === '/api/v1/agents/kill') {
    return handleKillSwitch(request);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
