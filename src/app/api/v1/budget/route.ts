import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getServiceClient, unauthorizedResponse } from "@/lib/auth-server";

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalEstimated: number;
  remaining: number;
  burnRate: number;
  projectedTotal: number;
  overUnder: number;
  percentUsed: number;
  byPhase: Record<string, { spent: number; estimated: number; count: number }>;
  byCategory: Record<string, { spent: number; estimated: number; count: number }>;
}

interface BudgetItem {
  id: string;
  budget_id: string;
  user_id: string;
  phase: string;
  category: string;
  description: string;
  amount: number;
  vendor?: string;
  receipt_url?: string;
  is_estimate: boolean;
  date: string;
  created_at: string;
}

interface ProjectBudget {
  id: string;
  project_id: string;
  user_id: string;
  total_budget: number;
  currency: string;
  alert_threshold: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

function computeBudgetSummary(budget: ProjectBudget, items: BudgetItem[]): BudgetSummary {
  let totalSpent = 0;
  let totalEstimated = 0;
  const byPhase: Record<string, { spent: number; estimated: number; count: number }> = {};
  const byCategory: Record<string, { spent: number; estimated: number; count: number }> = {};
  let earliestDate = Date.now();

  items.forEach((item) => {
    const amount = parseFloat(item.amount.toString());

    if (item.is_estimate) {
      totalEstimated += amount;
    } else {
      totalSpent += amount;
    }

    // Track by phase
    if (!byPhase[item.phase]) {
      byPhase[item.phase] = { spent: 0, estimated: 0, count: 0 };
    }
    if (item.is_estimate) {
      byPhase[item.phase].estimated += amount;
    } else {
      byPhase[item.phase].spent += amount;
    }
    byPhase[item.phase].count += 1;

    // Track by category
    if (!byCategory[item.category]) {
      byCategory[item.category] = { spent: 0, estimated: 0, count: 0 };
    }
    if (item.is_estimate) {
      byCategory[item.category].estimated += amount;
    } else {
      byCategory[item.category].spent += amount;
    }
    byCategory[item.category].count += 1;

    // Track earliest date for burn rate
    const itemDate = new Date(item.date).getTime();
    if (itemDate < earliestDate) {
      earliestDate = itemDate;
    }
  });

  const budgetAmount = parseFloat(budget.total_budget.toString());
  const remaining = budgetAmount - totalSpent;
  const percentUsed = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

  // Calculate burn rate (spent per day since first item)
  let burnRate = 0;
  if (totalSpent > 0 && earliestDate < Date.now()) {
    const daysSinceStart = (Date.now() - earliestDate) / (1000 * 60 * 60 * 24);
    burnRate = daysSinceStart > 0 ? totalSpent / daysSinceStart : 0;
  }

  // Project total based on burn rate
  const projectedTotal = totalSpent + totalEstimated;
  const overUnder = budgetAmount - projectedTotal;

  return {
    totalBudget: budgetAmount,
    totalSpent,
    totalEstimated,
    remaining,
    burnRate: Math.round(burnRate * 100) / 100,
    projectedTotal,
    overUnder,
    percentUsed: Math.round(percentUsed * 100) / 100,
    byPhase,
    byCategory,
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("project_id");

  if (!projectId) {
    return NextResponse.json(
      { error: "project_id query parameter required" },
      { status: 400 }
    );
  }

  try {
    const db = getServiceClient();

    // Verify project ownership
    const { data: project, error: projectError } = await db
      .from("saved_projects")
      .select("id, user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project || project.user_id !== user.id) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }

    // Fetch budget
    const { data: budget, error: budgetError } = await db
      .from("project_budgets")
      .select("*")
      .eq("project_id", projectId)
      .single();

    // If no budget exists, return 404
    if (budgetError || !budget) {
      return NextResponse.json(
        { error: "No budget found for this project" },
        { status: 404 }
      );
    }

    // Fetch budget items
    const { data: items, error: itemsError } = await db
      .from("budget_items")
      .select("*")
      .eq("budget_id", budget.id)
      .order("date", { ascending: false });

    if (itemsError) throw itemsError;

    const summary = computeBudgetSummary(budget, items || []);

    return NextResponse.json({
      budget,
      items: items || [],
      summary,
    });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { project_id, total_budget, currency = "USD", alert_threshold, notes } = body;

    if (!project_id || total_budget === undefined) {
      return NextResponse.json(
        { error: "project_id and total_budget required" },
        { status: 400 }
      );
    }

    const db = getServiceClient();

    // Verify project ownership
    const { data: project, error: projectError } = await db
      .from("saved_projects")
      .select("id, user_id")
      .eq("id", project_id)
      .single();

    if (projectError || !project || project.user_id !== user.id) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if budget already exists
    const { data: existingBudget } = await db
      .from("project_budgets")
      .select("id")
      .eq("project_id", project_id)
      .single();

    if (existingBudget) {
      return NextResponse.json(
        { error: "Budget already exists for this project" },
        { status: 409 }
      );
    }

    // Create budget
    const { data: newBudget, error: insertError } = await db
      .from("project_budgets")
      .insert({
        project_id,
        user_id: user.id,
        total_budget: parseFloat(total_budget),
        currency,
        alert_threshold: alert_threshold || 80,
        notes,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(newBudget, { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { id, total_budget, alert_threshold, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Budget ID required" },
        { status: 400 }
      );
    }

    const db = getServiceClient();

    // Verify budget ownership chain
    const { data: budget, error: fetchError } = await db
      .from("project_budgets")
      .select("id, user_id, project_id")
      .eq("id", id)
      .single();

    if (fetchError || !budget || budget.user_id !== user.id) {
      return NextResponse.json(
        { error: "Budget not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update budget
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (total_budget !== undefined) updateData.total_budget = parseFloat(total_budget);
    if (alert_threshold !== undefined) updateData.alert_threshold = alert_threshold;
    if (notes !== undefined) updateData.notes = notes;

    const { data: updatedBudget, error: updateError } = await db
      .from("project_budgets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedBudget);
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Budget ID required" },
      { status: 400 }
    );
  }

  try {
    const db = getServiceClient();

    // Verify budget ownership
    const { data: budget, error: fetchError } = await db
      .from("project_budgets")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !budget || budget.user_id !== user.id) {
      return NextResponse.json(
        { error: "Budget not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete budget (cascading delete handles items)
    const { error: deleteError } = await db
      .from("project_budgets")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
  }
