import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId query parameter is required" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from("project_budget_lines")
      .select("*")
      .eq("project_id", projectId)
      .order("division", { ascending: true });

    if (error) {
      console.error("Supabase GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lines: data });
  } catch (err) {
    console.error("GET budget lines error:", err);
    return NextResponse.json(
      { error: "Failed to fetch budget lines" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Check if this is a bulk insert request
    if (body.lines && Array.isArray(body.lines)) {
      return handleBulkInsert(body);
    }

    // Single line creation
    const { projectId, division, name, budgeted, committed = 0, actual_spent = 0, notes } = body;

    if (!projectId || !division || !name || budgeted === undefined) {
      return NextResponse.json(
        { error: "projectId, division, name, and budgeted are required" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from("project_budget_lines")
      .insert([
        {
          project_id: projectId,
          division,
          name,
          budgeted,
          committed,
          actual_spent,
          notes: notes || null,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    console.error("POST budget line error:", err);
    return NextResponse.json(
      { error: "Failed to create budget line" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, budgeted, committed, actual_spent, notes, name, division } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {};

    if (budgeted !== undefined) updatePayload.budgeted = budgeted;
    if (committed !== undefined) updatePayload.committed = committed;
    if (actual_spent !== undefined) updatePayload.actual_spent = actual_spent;
    if (notes !== undefined) updatePayload.notes = notes;
    if (name !== undefined) updatePayload.name = name;
    if (division !== undefined) updatePayload.division = division;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from("project_budget_lines")
      .update(updatePayload)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Budget line not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data[0]);
  } catch (err) {
    console.error("PATCH budget line error:", err);
    return NextResponse.json(
      { error: "Failed to update budget line" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const { error } = await getSupabase()
      .from("project_budget_lines")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE budget line error:", err);
    return NextResponse.json(
      { error: "Failed to delete budget line" },
      { status: 500 }
    );
  }
}

async function handleBulkInsert(body: any) {
  try {
    const { projectId, lines } = body;

    if (!projectId || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "projectId and non-empty lines array are required" },
        { status: 400 }
      );
    }

    // Validate each line
    for (const line of lines) {
      if (!line.division || !line.name || line.budgeted === undefined) {
        return NextResponse.json(
          { error: "Each line must have division, name, and budgeted" },
          { status: 400 }
        );
      }
    }

    // Transform lines for insertion
    const insertPayload = lines.map((line: any) => ({
      project_id: projectId,
      division: line.division,
      name: line.name,
      budgeted: line.budgeted,
      committed: 0,
      actual_spent: 0,
      notes: line.notes || null,
    }));

    const { data, error } = await getSupabase()
      .from("project_budget_lines")
      .insert(insertPayload)
      .select();

    if (error) {
      console.error("Supabase bulk insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { lines: data, count: data.length },
      { status: 201 }
    );
  } catch (err) {
    console.error("Bulk insert budget lines error:", err);
    return NextResponse.json(
      { error: "Failed to bulk insert budget lines" },
      { status: 500 }
    );
  }
}
