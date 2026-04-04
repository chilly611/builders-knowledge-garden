import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - fetch change orders for a project
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
      .from("project_change_orders")
      .select("*")
      .eq("project_id", projectId)
      .order("number", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/v1/projects/change-orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch change orders" },
      { status: 500 }
    );
  }
}

// POST - create new change order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, description, reason, cost_impact, schedule_impact_days } = body;

    if (!projectId || !description) {
      return NextResponse.json(
        { error: "projectId and description are required" },
        { status: 400 }
      );
    }

    // Get the next change order number
    const { data: existing } = await supabase
      .from("project_change_orders")
      .select("number")
      .eq("project_id", projectId)
      .order("number", { ascending: false })
      .limit(1);

    const nextNumber = (existing && existing.length > 0 ? existing[0].number : 0) + 1;

    const { data, error } = await supabase
      .from("project_change_orders")
      .insert({
        project_id: projectId,
        number: nextNumber,
        description,
        reason: reason || null,
        cost_impact: cost_impact || 0,
        schedule_impact_days: schedule_impact_days || 0,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/projects/change-orders error:", error);
    return NextResponse.json(
      { error: "Failed to create change order" },
      { status: 500 }
    );
  }
}

// PATCH - update change order
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, cost_impact, schedule_impact_days, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};
    if (status !== undefined) updateData.status = status;
    if (cost_impact !== undefined) updateData.cost_impact = cost_impact;
    if (schedule_impact_days !== undefined) updateData.schedule_impact_days = schedule_impact_days;
    if (description !== undefined) updateData.description = description;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("project_change_orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/v1/projects/change-orders error:", error);
    return NextResponse.json(
      { error: "Failed to update change order" },
      { status: 500 }
    );
  }
}

// DELETE - remove change order
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
      .from("project_change_orders")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/v1/projects/change-orders error:", error);
    return NextResponse.json(
      { error: "Failed to delete change order" },
      { status: 500 }
    );
  }
}
