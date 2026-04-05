import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import bcryptjs from 'bcryptjs';

const supabase = getServiceClient();

// Type definitions
interface Agent {
  id: string;
  owner_user_id: string;
  name: string;
  description?: string;
  autonomy_mode: 'watch' | 'assist' | 'autonomous';
  permissions: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentRegistrationRequest {
  name: string;
  description?: string;
  autonomy_mode?: 'watch' | 'assist' | 'autonomous';
  permissions?: string[];
}

interface AgentUpdateRequest {
  autonomy_mode?: 'watch' | 'assist' | 'autonomous';
  permissions?: string[];
  active?: boolean;
}

const DEFAULT_PERMISSIONS = {
  watch: ['search_knowledge', 'list_building_types', 'list_jurisdictions'],
  assist: [
    'search_knowledge',
    'list_building_types',
    'list_jurisdictions',
    'get_building_details',
    'search_regulations',
    'get_regulation_details',
    'create_compliance_report',
    'update_jurisdiction_data',
    'submit_variance_request',
    'track_approval_status',
    'notify_stakeholders',
    'export_documentation',
  ],
  autonomous: [
    'search_knowledge',
    'list_building_types',
    'list_jurisdictions',
    'get_building_details',
    'search_regulations',
    'get_regulation_details',
    'create_compliance_report',
    'update_jurisdiction_data',
    'submit_variance_request',
    'track_approval_status',
    'notify_stakeholders',
    'export_documentation',
  ],
};

// Helper: Get user ID from request (assumes auth middleware sets it)
async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

// Helper: Generate API key
function generateApiKey(): string {
  return 'bkg_agent_' + [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

// Helper: Hash API key
async function hashApiKey(key: string): Promise<string> {
  return bcryptjs.hash(key, 10);
}

// GET /api/v1/agents — List user's agents
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('agent_identities')
      .select('id, owner_user_id, name, description, autonomy_mode, permissions, active, created_at, updated_at')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    return NextResponse.json({ agents: data || [] });
  } catch (error) {
    console.error('GET /api/v1/agents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/agents — Register a new agent
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AgentRegistrationRequest = await request.json();

    // Validate input
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required and must be a non-empty string' }, { status: 400 });
    }

    const autonomyMode = body.autonomy_mode || 'watch';
    if (!['watch', 'assist', 'autonomous'].includes(autonomyMode)) {
      return NextResponse.json({ error: 'Invalid autonomy_mode' }, { status: 400 });
    }

    // Determine permissions
    let permissions = body.permissions || DEFAULT_PERMISSIONS[autonomyMode as keyof typeof DEFAULT_PERMISSIONS];
    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'permissions must be an array of strings' }, { status: 400 });
    }

    // Generate API key and hash
    const plainApiKey = generateApiKey();
    const hashedApiKey = await hashApiKey(plainApiKey);

    // Insert agent record
    const agentId = uuidv4();
    const now = new Date().toISOString();

    const { error: insertError } = await supabase.from('agent_identities').insert({
      id: agentId,
      owner_user_id: userId,
      name: body.name.trim(),
      description: body.description || null,
      autonomy_mode: autonomyMode,
      permissions: permissions,
      api_key_hash: hashedApiKey,
      active: true,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to register agent' }, { status: 500 });
    }

    // Return agent info WITH plain API key (shown only once)
    return NextResponse.json(
      {
        agent_id: agentId,
        name: body.name.trim(),
        autonomy_mode: autonomyMode,
        permissions: permissions,
        api_key: plainApiKey,
        note: 'Save your API key — it will not be shown again',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/v1/agents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/v1/agents?id=xxx — Update agent
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agentId = request.nextUrl.searchParams.get('id');
    if (!agentId) {
      return NextResponse.json({ error: 'Missing agent id parameter' }, { status: 400 });
    }

    // Verify agent belongs to user
    const { data: agent, error: fetchError } = await supabase
      .from('agent_identities')
      .select('id, owner_user_id')
      .eq('id', agentId)
      .single();

    if (fetchError || !agent || agent.owner_user_id !== userId) {
      return NextResponse.json({ error: 'Agent not found or unauthorized' }, { status: 404 });
    }

    const body: AgentUpdateRequest = await request.json();

    // Build update object
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.autonomy_mode !== undefined) {
      if (!['watch', 'assist', 'autonomous'].includes(body.autonomy_mode)) {
        return NextResponse.json({ error: 'Invalid autonomy_mode' }, { status: 400 });
      }
      updates.autonomy_mode = body.autonomy_mode;
    }

    if (body.permissions !== undefined) {
      if (!Array.isArray(body.permissions)) {
        return NextResponse.json({ error: 'permissions must be an array of strings' }, { status: 400 });
      }
      updates.permissions = body.permissions;
    }

    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') {
        return NextResponse.json({ error: 'active must be a boolean' }, { status: 400 });
      }
      updates.active = body.active;
    }

    const { data, error: updateError } = await supabase
      .from('agent_identities')
      .update(updates)
      .eq('id', agentId)
      .select();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }

    return NextResponse.json({ agent: data?.[0] || {} });
  } catch (error) {
    console.error('PATCH /api/v1/agents/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/v1/agents?id=xxx — Deactivate agent
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agentId = request.nextUrl.searchParams.get('id');
    if (!agentId) {
      return NextResponse.json({ error: 'Missing agent id parameter' }, { status: 400 });
    }

    // Verify agent belongs to user
    const { data: agent, error: fetchError } = await supabase
      .from('agent_identities')
      .select('id, owner_user_id')
      .eq('id', agentId)
      .single();

    if (fetchError || !agent || agent.owner_user_id !== userId) {
      return NextResponse.json({ error: 'Agent not found or unauthorized' }, { status: 404 });
    }

    // Soft delete: set active to false
    const { error: updateError } = await supabase
      .from('agent_identities')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', agentId);

    if (updateError) {
      console.error('Delete error:', updateError);
      return NextResponse.json({ error: 'Failed to deactivate agent' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Agent deactivated successfully' });
  } catch (error) {
    console.error('DELETE /api/v1/agents/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
