import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('command_center_projects')
      .select('*')
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
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const { data, error } = await getSupabase()
      .from('command_center_projects')
      .insert([{
        name: body.name.trim(),
        phase: body.phase || 'PLAN',
        progress: Number(body.progress) || 0,
        budget_amount: body.budget_amount ? Number(body.budget_amount) : null,
        budget_status: body.budget_status || 'on-track',
        risk_level: body.risk_level || 'medium',
        next_milestone: body.next_milestone || null,
        milestone_date: body.milestone_date || null,
        project_type: body.project_type || null,
        location: body.location || null,
        client_name: body.client_name || null,
        notes: body.notes || null,
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
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
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
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    const { error } = await getSupabase()
      .from('command_center_projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
