// Budget Items API — auth-gated CRUD for individual budget items
// POST   /api/v1/budget/items              — add new expense
// PATCH  /api/v1/budget/items              — update item
// DELETE /api/v1/budget/items?id=xxx       — delete item

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getServiceClient, unauthorizedResponse } from "@/lib/auth-server";

const VALID_PHASES = ["DREAM", "DESIGN", "PLAN", "BUILD", "DELIVER", "GROW"];
const VALID_CATEGORIES = ["materials", "labor", "permits", "equipment", "subcontractor", "overhead", "other"];

async function verifyBudgetOwnership(budgetId: string, userId: string, supabase: any): Promise<boolean> {
  const { data: budget } = await supabase
    .from("project_budgets")
    .select("project_id")
    .eq("id", budgetId)
    .single();

  if (!budget) return false;

  const { data: project } = await supabase
    .from("saved_projects")
    .select("user_id")
    .eq("id", budget.project_id)
    .single();

  return project && project.user_id === userId;
}

// ─── CREATE ───
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      budget_id,
      phase = "DREAM",
      category = "other",
      description,
      amount,
      vendor,
      receipt_url,
      is_estimate = false,
      date = new Date().toISOString(),
    } = body;

    // Validation
    if (!budget_id || amount === undefined || !description) {
      return NextResponse.json(
        { error: "budget_id, description, and amount are required" },
        { status: 400 }
      );
    }

    if (amount < 0) {
      return NextResponse.json({ error: "amount must be positive" }, { status: 400 });
    }

    if (!VALID_PHASES.includes(phase)) {
      return NextResponse.json(
        { error: `Invalid phase. Must be one of: ${VALID_PHASES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Verify ownership
    const isOwner = await verifyBudgetOwnership(budget_id, user.id, supabase);
    if (!isOwner) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    // Create item
    const { data, error } = await supabase
      .from("budget_items")
      .insert({
        budget_id,
        phase,
        category,
        description,
        amount,
        vendor: vendor || null,
        receipt_url: receipt_url || null,
        is_estimate,
        date,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Budget item create error:", error);
      return NextResponse.json(
        { error: "Failed to create budget item", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 400 }
    );
  }
}

// ─── UPDATE ───
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Prevent invalid updates
    delete updates.budget_id;
    delete updates.created_at;

    // Validate phase if provided
    if (updates.phase && !VALID_PHASES.includes(updates.phase)) {
      return NextResponse.json(
        { error: `Invalid phase. Must be one of: ${VALID_PHASES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (updates.category && !VALID_CATEGORIES.includes(updates.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate amount if provided
    if (updates.amount !== undefined && updates.amount < 0) {
      return NextResponse.json({ error: "amount must be positive" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify ownership
    const { data: item } = await supabase
      .from("budget_items")
      .select("budget_id")
      .eq("id", id)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Budget item not found" }, { status: 404 });
    }

    const isOwner = await verifyBudgetOwnership(item.budget_id, user.id, supabase);
    if (!isOwner) {
      return NextResponse.json({ error: "Budget item not found" }, { status: 404 });
    }

    // Update item
    const { data, error } = await supabase
      .from("budget_items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Budget item update error:", error);
      return NextResponse.json(
        { error: "Failed to update budget item", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 400 }
    );
  }
}

// ─── DELETE ───
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();

    // Verify ownership
    const { data: item } = await supabase
      .from("budget_items")
      .select("budget_id")
      .eq("id", id)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Budget item not found" }, { status: 404 });
    }

    const isOwner = await verifyBudgetOwnership(item.budget_id, user.id, supabase);
    if (!isOwner) {
      return NextResponse.json({ error: "Budget item not found" }, { status: 404 });
    }

    // Delete item
    const { error } = await supabase.from("budget_items").delete().eq("id", id);

    if (error) {
      console.error("Budget item delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete budget item", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete budget item", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

