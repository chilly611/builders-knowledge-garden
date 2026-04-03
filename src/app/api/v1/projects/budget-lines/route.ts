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
      .from('project_budget_lines')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ budget_lines: data || [] });
  } catch (e) {
    console.error('Budget Lines GET error:', e);
    return NextResponse.json({ budget_lines: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.project_id?.trim()) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }
    if (!body.category?.trim()) {
      return NextResponse.json({ error: 'category is required' }, { status: 400 });
    }
    const { data, error } = await getSupabase()
      .from('project_budget_lines')
      .insert([{
        project_id: body.project_id.trim(),
        category: body.category.trim(),
        description: body.description || null,
        estimated_amount: body.estimated_amount ? Number(body.estimated_amount) : null,
        actual_amount: body.actual_amount ? Number(body.actual_amount) : null,
        status: body.status || 'estimated',
        vendor: body.vendor || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ budget_line: data }, { status: 201 });
  } catch (e) {
    console.error('Budget Lines POST error:', e);
    return NextResponse.json({ error: 'Failed to create budget line' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { data, error } = await getSupabase()
      .from('project_budget_lines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ budget_line: data });
  } catch (e) {
    console.error('Budget Lines PATCH error:', e);
    return NextResponse.json({ error: 'Failed to update budget line' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    const { error } = await getSupabase()
      .from('project_budget_lines')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete budget line' }, { status: 500 });
  }
}
