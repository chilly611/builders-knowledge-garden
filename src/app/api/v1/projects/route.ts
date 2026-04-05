import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';

function getSupabase() {
  return getServiceClient();
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ projects: [] });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    // Single project fetch by ID
    if (projectId) {
      const { data: project, error } = await getSupabase()
        .from('command_center_projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (error || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Fetch related data in parallel
      const supabase = getSupabase();
      const [budgetRes, scheduleRes, complianceRes] = await Promise.all([
        supabase.from('project_budget_lines').select('*').eq('project_id', projectId),
        supabase.from('project_schedules').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1),
        supabase.from('project_compliance').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1),
      ]);

      return NextResponse.json({
        ...project,
        budget_lines: budgetRes.data || [],
        schedule: scheduleRes.data?.[0] || null,
        compliance: complianceRes.data?.[0] || null,
      });
    }

    // List all projects
    const { data, error } = await getSupabase()
      .from('command_center_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ projects: data || [] });
  } catch (e) {
    console.error('Projects GET error:', e);
    return NextResponse.json({ projects: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from('command_center_projects')
      .insert([{
        user_id: user.id,
        name: body.name.trim(),
        phase: body.phase || 'PLAN',
        progress: Number(body.progress) || 0,
        budget_amount: body.budget_amount ? Number(body.budget_amount) : null,
        budget_status: body.budget_status || 'on-track',
        risk_level: body.risk_level || 'medium',
        next_milestone: body.next_milestone || null,
        milestone_date: body.milestone_date || null,
        project_type: body.project_type || body.building_type || null,
        location: body.location || null,
        client_name: body.client_name || null,
        notes: body.notes || null,
        jurisdiction: body.jurisdiction || null,
        start_date: body.start_date || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ project: data }, { status: 201 });
  } catch (e) {
    console.error('Projects POST error:', e);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Verify ownership via auth token (not client-passed user_id)
    const { data: existingProject, error: fetchError } = await getSupabase()
      .from('command_center_projects')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (existingProject.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: you do not own this project' }, { status: 403 });
    }

    // Remove user_id from updates to prevent ownership transfer
    delete updates.user_id;

    const { data, error } = await getSupabase()
      .from('command_center_projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ project: data });
  } catch (e) {
    console.error('Projects PATCH error:', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Verify ownership via auth token
    const { data: existingProject, error: fetchError } = await getSupabase()
      .from('command_center_projects')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (existingProject.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: you do not own this project' }, { status: 403 });
    }

    const { error } = await getSupabase()
      .from('command_center_projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Projects DELETE error:', e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
