import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - fetch punch items for a project
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
      .from("project_punch_items")
      .select("*")
      .eq("project_id", projectId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/v1/projects/punch-items error:", error);
    return NextResponse.json(
      { error: "Failed to fetch punch items" },
      { status: 500 }
    );
  }
}

// POST - create new punch item
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, description, location, assigned_trade, priority, photo_url } = body;

    if (!projectId || !description) {
      return NextResponse.json(
        { error: "projectId and description are required" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from("project_punch_items")
      .insert({
        project_id: projectId,
        description,
        location: location || null,
        assigned_trade: assigned_trade || null,
        priority: priority || "medium",
        photo_url: photo_url || null,
        status: "open",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/projects/punch-items error:", error);
    return NextResponse.json(
      { error: "Failed to create punch item" },
      { status: 500 }
    );
  }
}

// PATCH - update punch item
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, assigned_trade, priority, photo_url, location, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};
    if (status !== undefined) updateData.status = status;
    if (assigned_trade !== undefined) updateData.assigned_trade = assigned_trade;
    if (priority !== undefined) updateData.priority = priority;
    if (photo_url !== undefined) updateData.photo_url = photo_url;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await getSupabase()
      .from("project_punch_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/v1/projects/punch-items error:", error);
    return NextResponse.json(
      { error: "Failed to update punch item" },
      { status: 500 }
    );
  }
}

// DELETE - remove punch item
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
      .from("project_punch_items")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/v1/projects/punch-items error:", error);
    return NextResponse.json(
      { error: "Failed to delete punch item" },
      { status: 500 }
    );
  }
}
