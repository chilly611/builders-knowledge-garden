import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - fetch RFIs for a project
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId query parameter is required" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from("project_rfis")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/v1/projects/rfis error:", error);
    return NextResponse.json(
      { error: "Failed to fetch RFIs" },
      { status: 500 }
    );
  }
}

// POST - create new RFI
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, subject, description, assigned_to, priority, due_date, linked_entities } = body;

    if (!projectId || !subject) {
      return NextResponse.json(
        { error: "projectId and subject are required" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from("project_rfis")
      .insert({
        project_id: projectId,
        subject,
        description: description || null,
        assigned_to: assigned_to || null,
        priority: priority || "medium",
        due_date: due_date || null,
        linked_entities: linked_entities || [],
        status: "open",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/projects/rfis error:", error);
    return NextResponse.json(
      { error: "Failed to create RFI" },
      { status: 500 }
    );
  }
}

// PATCH - update RFI
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, priority, assigned_to, due_date, answer, linked_entities } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (answer !== undefined) updateData.answer = answer;
    if (linked_entities !== undefined) updateData.linked_entities = linked_entities;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await getSupabase()
      .from("project_rfis")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/v1/projects/rfis error:", error);
    return NextResponse.json(
      { error: "Failed to update RFI" },
      { status: 500 }
    );
  }
}

// DELETE - remove RFI
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const { error } = await getSupabase()
      .from("project_rfis")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/v1/projects/rfis error:", error);
    return NextResponse.json(
      { error: "Failed to delete RFI" },
      { status: 500 }
    );
  }
}
