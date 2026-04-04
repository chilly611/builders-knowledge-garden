import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - fetch submittals for a project
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

    const { data, error } = await supabase
      .from("project_submittals")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/v1/projects/submittals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch submittals" },
      { status: 500 }
    );
  }
}

// POST - create new submittal
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, spec_section, description, subcontractor, due_date, linked_entities } = body;

    if (!projectId || !description) {
      return NextResponse.json(
        { error: "projectId and description are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("project_submittals")
      .insert({
        project_id: projectId,
        spec_section: spec_section || null,
        description,
        subcontractor: subcontractor || null,
        due_date: due_date || null,
        linked_entities: linked_entities || [],
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/projects/submittals error:", error);
    return NextResponse.json(
      { error: "Failed to create submittal" },
      { status: 500 }
    );
  }
}

// PATCH - update submittal
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, review_notes, subcontractor, due_date, linked_entities } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};
    if (status !== undefined) updateData.status = status;
    if (review_notes !== undefined) updateData.review_notes = review_notes;
    if (subcontractor !== undefined) updateData.subcontractor = subcontractor;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (linked_entities !== undefined) updateData.linked_entities = linked_entities;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("project_submittals")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/v1/projects/submittals error:", error);
    return NextResponse.json(
      { error: "Failed to update submittal" },
      { status: 500 }
    );
  }
}

// DELETE - remove submittal
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

    const { error } = await supabase
      .from("project_submittals")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/v1/projects/submittals error:", error);
    return NextResponse.json(
      { error: "Failed to delete submittal" },
      { status: 500 }
    );
  }
}
