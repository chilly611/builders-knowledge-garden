import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');
    if (!project_id) {
      return NextResponse.json({ error: 'project_id query parameter is required' }, { status: 400 });
    }
    const { data, error } = await getSupabase()
      .from('project_rfis')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ rfis: data || [] });
  } catch (e) {
    console.error('RFIs GET error:', e);
    return NextResponse.json({ rfis: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.project_id?.trim()) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const { data, error } = await getSupabase()
      .from('project_rfis')
      .insert([{
        project_id: body.project_id.trim(),
        title: body.title.trim(),
        description: body.description || null,
        status: body.status || 'open',
        assigned_to: body.assigned_to || null,
        due_date: body.due_date || null,
        response: body.response || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ rfi: data }, { status: 201 });
  } catch (e) {
    console.error('RFIs POST error:', e);
    return NextResponse.json({ error: 'Failed to create RFI' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { data, error } = await getSupabase()
      .from('project_rfis')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ rfi: data });
  } catch (e) {
    console.error('RFIs PATCH error:', e);
    return NextResponse.json({ error: 'Failed to update RFI' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    const { error } = await getSupabase()
      .from('project_rfis')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete RFI' }, { status: 500 });
  }
}
