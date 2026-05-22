import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser, getServiceClient, unauthorizedResponse } from "@/lib/auth-server";

/**
 * /api/v1/budget — read/write the per-project budget summary.
 *
 * 2026-05-22 (DATA+DEMO consolidation): rewritten on top of
 * `project_budget_lines` (CSI-MasterFormat rows in Supabase) — the previous
 * implementation read/wrote a `project_budgets` TABLE that was never applied
 * to prod, so every call 404'd silently. We now synthesize the legacy
 * `{ budget, items, summary }` payload from `project_budget_lines` so the
 * existing consumers (BudgetWidget, GlobalBudgetWidget, budget-spine.ts) keep
 * working without a coordinated client-side rewrite.
 *
 * Source of truth: public.project_budget_lines (project_id, csi_division,
 *   description, budgeted, committed, actual_spent).
 *
 * Mapping into the legacy {items, summary} shape:
 *   - one BudgetItem per line, `amount = actual_spent`, plus one estimate
 *     BudgetItem (`is_estimate = true`, `amount = budgeted`) so the summary
 *     can distinguish "spent" vs "planned".
 *   - `category` is heuristically derived from `csi_division` + description
 *     (matches EstimatingClient's categorize() so AI-pushed rows round-trip).
 *   - `phase` is derived per row via resolveStageId(): if the row carries a
 *     stage_id (SCHEMA-ALPHA migration), it wins; otherwise inferStageId-
 *     FromDivision() maps the CSI MasterFormat number to a stage.  Each
 *     phase aggregates correctly across all 7 stages so the cockpit
 *     sparkline shows a real distribution.  Previous default-to-BUILD
 *     behaviour was a known limitation; this is the fix.
 *   - `totalBudget` is the sum of all `budgeted` columns.
 *
 * Ownership check: command_center_projects.user_id (saved_projects table
 * also doesn't exist in prod, despite the old route referencing it).
 */

interface ScheduledPayment {
  id: string;
  description: string;
  amount: number;
  category: string;
  phase: string;
  date: string;
  vendor: string | null;
}

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

  // ── W4.1e global COO additions ───────────────────────────────────────────
  actualExpenses: number;
  clientPaymentsReceived: number;
  plAfterPayments: number;
  next7DaysScheduled: ScheduledPayment[];
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

interface BudgetLineRow {
  id: string;
  project_id: string;
  csi_division: string;
  description: string | null;
  budgeted: number | string | null;
  committed: number | string | null;
  actual_spent: number | string | null;
  created_at: string;
  updated_at: string;
  // COCKPIT-FIXES Pain 3 (2026-05-22): optional column landing via the
  // SCHEMA-ALPHA migration. Read defensively — undefined when the column
  // hasn't shipped yet, which we backfill from csi_division below.
  stage_id?: number | string | null;
}

const DEFAULT_PHASE = "BUILD";

// Stage IDs → cockpit phase labels. Mirrors STAGE_TO_PHASE in
// ProjectCockpit.tsx; keep in sync if either side changes.
const STAGE_ID_TO_PHASE: Record<number, string> = {
  1: 'SIZE_UP',
  2: 'LOCK',
  3: 'PLAN',
  4: 'BUILD',
  5: 'ADAPT',
  6: 'COLLECT',
  7: 'REFLECT',
};

/**
 * COCKPIT-FIXES Pain 3 (2026-05-22): until every row has a stage_id
 * (SCHEMA-ALPHA backfill is pending), infer the stage from the CSI
 * MasterFormat division. The mapping mirrors the construction lifecycle —
 * mobilization/site work happen in PLAN, vertical construction is BUILD,
 * commissioning/specialties land in COLLECT, etc. Default is BUILD when
 * the division is anything not explicitly listed.
 *
 * NOTE: this is a READ-PATH heuristic. When the stage_id column ships +
 * is backfilled, the row's value wins — this function only fires when
 * row.stage_id is null/undefined.
 */
function inferStageIdFromDivision(division: string): number {
  const d = parseInt((division || '').replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(d)) return 4;
  // Procurement, general requirements, demo, site prep → PLAN
  if (d <= 2) return 3;
  // Concrete, masonry, metals, wood, thermal, openings, finishes → BUILD
  if (d >= 3 && d <= 9) return 4;
  // Specialties, equipment, furnishings, special construction → COLLECT
  if (d >= 10 && d <= 14) return 6;
  // Fire suppression, plumbing → BUILD
  if (d === 15 || d === 21 || d === 22) return 4;
  // HVAC, integrated automation, communications, electronic safety → BUILD
  if (d === 23 || d === 25 || d === 27 || d === 28) return 4;
  // Electrical (legacy + current) → BUILD
  if (d === 16 || d === 26) return 4;
  // Earthwork, exterior improvements, utilities → PLAN
  if (d >= 31 && d <= 33) return 3;
  // Contingency / unallocated (99) → BUILD bucket so the sparkline
  // doesn't show a phantom 8th stage.
  return 4;
}

function resolveStageId(row: BudgetLineRow): number {
  const raw = row.stage_id;
  if (raw !== null && raw !== undefined) {
    const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 7) return n;
  }
  return inferStageIdFromDivision(row.csi_division);
}

function phaseLabelForStage(stageId: number): string {
  return STAGE_ID_TO_PHASE[stageId] ?? DEFAULT_PHASE;
}

/**
 * Mirrors the categorize() heuristic in EstimatingClient.tsx so AI-pushed
 * rows and DB-seeded rows land in the same bucket.
 */
function categorize(label: string): string {
  const t = (label || "").toLowerCase();
  if (/plumb|electric|hvac|mechanical|roof|drywall|insul|tile|stucco|paint|landscap|solar|fire/.test(t)) return "subcontractor";
  if (/labor|crew|foreman|wages|payroll/.test(t)) return "labor";
  if (/permit|plan check|fee|impact|inspect|general requirement/.test(t)) return "permits";
  if (/profit|overhead|o&p|markup|margin/.test(t)) return "overhead";
  if (/equipment|rental|scaffold|lift|generator|crane|excavat/.test(t)) return "equipment";
  if (/insurance|bond|liability|workers comp/.test(t)) return "overhead";
  if (/admin|office|software|phone|mileage/.test(t)) return "overhead";
  if (/contingency|reserve|buffer/.test(t)) return "other";
  if (/concrete|gravel|rebar|sand|aggregate|wood|framing|finish|opening|thermal|moisture/.test(t)) return "materials";
  return "materials";
}

function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Project budget_lines → synthetic {items, summary} payload that matches the
 * shape the legacy BudgetWidget / GlobalBudgetWidget / budget-spine consume.
 */
function buildSummaryFromLines(
  projectId: string,
  userId: string,
  lines: BudgetLineRow[],
): { budget: ProjectBudget; items: BudgetItem[]; summary: BudgetSummary } {
  let totalBudget = 0;
  let totalSpent = 0;
  let totalEstimated = 0;
  const byPhase: Record<string, { spent: number; estimated: number; count: number }> = {};
  const byCategory: Record<string, { spent: number; estimated: number; count: number }> = {};
  const items: BudgetItem[] = [];

  for (const line of lines) {
    const budgeted = num(line.budgeted);
    const spent = num(line.actual_spent);
    const description = line.description || `CSI ${line.csi_division}`;
    const category = categorize(description);
    // COCKPIT-FIXES Pain 3 (2026-05-22): bucket each line by its stage
    // (column when present, csi_division-inferred otherwise) so the
    // cockpit sparkline shows a real distribution instead of one tall
    // BUILD column with six empty neighbours.
    const stageId = resolveStageId(line);
    const phase = phaseLabelForStage(stageId);

    totalBudget += budgeted;
    totalSpent += spent;
    totalEstimated += budgeted;

    if (!byPhase[phase]) byPhase[phase] = { spent: 0, estimated: 0, count: 0 };
    byPhase[phase].spent += spent;
    byPhase[phase].estimated += budgeted;
    byPhase[phase].count += 1;

    if (!byCategory[category]) byCategory[category] = { spent: 0, estimated: 0, count: 0 };
    byCategory[category].spent += spent;
    byCategory[category].estimated += budgeted;
    byCategory[category].count += 1;

    // Synthesize an actual-spend item (only if there's spend) and an estimate
    // item (always — so the legacy "totalEstimated" stays populated).
    if (spent > 0) {
      items.push({
        id: `${line.id}:actual`,
        budget_id: projectId,
        user_id: userId,
        phase,
        category,
        description,
        amount: spent,
        is_estimate: false,
        date: line.updated_at || line.created_at,
        created_at: line.created_at,
      });
    }
    items.push({
      id: `${line.id}:estimate`,
      budget_id: projectId,
      user_id: userId,
      phase,
      category,
      description,
      amount: budgeted,
      is_estimate: true,
      date: line.created_at,
      created_at: line.created_at,
    });
  }

  const remaining = totalBudget - totalSpent;
  const percentUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 10000) / 100 : 0;
  const projectedTotal = totalSpent + totalEstimated;
  const overUnder = totalBudget - projectedTotal;

  // Without per-row dates we don't have a meaningful burn rate. Return 0 so
  // downstream UIs don't show garbage; they already handle the empty case.
  const burnRate = 0;

  // Actual expenses == totalSpent; no client-payment rows in project_budget_lines.
  const actualExpenses = totalSpent;
  const clientPaymentsReceived = 0;
  const plAfterPayments = clientPaymentsReceived - actualExpenses;

  const earliest = lines.reduce<string | null>((acc, l) => {
    if (!acc) return l.created_at;
    return l.created_at < acc ? l.created_at : acc;
  }, null);

  const budget: ProjectBudget = {
    // Synthetic budget envelope — id mirrors project_id so legacy callers that
    // round-trip `budget.id` can still target this project.
    id: projectId,
    project_id: projectId,
    user_id: userId,
    total_budget: totalBudget,
    currency: "USD",
    alert_threshold: 80,
    created_at: earliest || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const summary: BudgetSummary = {
    totalBudget,
    totalSpent,
    totalEstimated,
    remaining,
    burnRate,
    projectedTotal,
    overUnder,
    percentUsed,
    byPhase,
    byCategory,
    actualExpenses,
    clientPaymentsReceived,
    plAfterPayments,
    next7DaysScheduled: [],
  };

  return { budget, items, summary };
}

/**
 * Demo project allowlist — mirrors /api/v1/projects/route.ts. Any
 * authenticated user can READ the 3 seeded demo projects so trial-contractor
 * accounts can run the demo without account-juggling.
 */
const DEMO_PROJECT_IDS = new Set<string>([
  '55730cd3-5225-493d-8b5c-49086d942565', // Marin farmhouse
  'aa11b22c-1111-4d78-aaaa-bbccdd112233', // ADU in Sausalito
  'bb22c33d-2222-4d78-bbbb-ccddee223344', // Commercial TI in SoMa
]);

/**
 * 2026-05-22 (BUDGET+SEC2 fix): trial-contractor accounts carry their seeded
 * demo project id in user_metadata.demo_project_id. Diego (specialty-trial-01)
 * and Tony hit "Unauthorized" on the Marin budget because the strict user_id
 * check rejected their accounts even though their JWT named Marin. Mirror the
 * helper from /api/v1/projects/route.ts so this route accepts the same three
 * ownership signals.
 */
async function getCallerDemoProjectId(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    const sb = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return null;
    const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
    const v = meta.demo_project_id;
    return typeof v === 'string' && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

async function verifyProjectOwnership(
  db: ReturnType<typeof getServiceClient>,
  projectId: string,
  userId: string,
  request?: NextRequest,
): Promise<boolean> {
  // (a) Demo allowlist — read access for the 3 seeded projects.
  if (DEMO_PROJECT_IDS.has(projectId)) return true;
  // (b) JWT demo_project_id — trial contractors.
  if (request) {
    const callerDemoProjectId = await getCallerDemoProjectId(request);
    if (callerDemoProjectId && callerDemoProjectId === projectId) return true;
  }
  // (c) Strict ownership.
  const { data, error } = await db
    .from("command_center_projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (error || !data) return false;
  // user_id is `text` in command_center_projects — coerce both sides.
  return String(data.user_id) === String(userId);
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

    const owns = await verifyProjectOwnership(db, projectId, user.id, request);
    if (!owns) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }

    const { data: lines, error: linesError } = await db
      .from("project_budget_lines")
      .select("*")
      .eq("project_id", projectId)
      .order("csi_division", { ascending: true });

    if (linesError) throw linesError;

    // Empty budget → return 404 to match the old contract (BudgetWidget's
    // empty state hinges on this; budget-spine.createDefaultBudget triggers
    // a POST when it sees a 404).
    if (!lines || lines.length === 0) {
      return NextResponse.json(
        { error: "No budget found for this project" },
        { status: 404 }
      );
    }

    const payload = buildSummaryFromLines(projectId, user.id, lines as BudgetLineRow[]);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}

/**
 * POST = "create budget envelope for this project".
 *
 * project_budget_lines has no per-project envelope row, so creating one is a
 * no-op against the table. We still verify ownership + return a synthetic
 * ProjectBudget so callers (notably budget-spine.createDefaultBudget) can
 * proceed; subsequent line writes go through bulk-upsert via PATCH or the
 * dedicated /api/v1/projects/budget-lines route.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      project_id,
      total_budget,
      currency = "USD",
      alert_threshold,
      notes,
    } = body;

    if (!project_id || total_budget === undefined) {
      return NextResponse.json(
        { error: "project_id and total_budget required" },
        { status: 400 }
      );
    }

    const db = getServiceClient();
    const owns = await verifyProjectOwnership(db, project_id, user.id, request);
    if (!owns) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }

    // If the caller passed `lines`, upsert them into project_budget_lines so
    // the API doubles as a bulk-seed entry point. Otherwise it's just an
    // envelope ack.
    if (Array.isArray(body.lines) && body.lines.length > 0) {
      const rows = body.lines
        .filter((l: any) => l && l.csi_division)
        .map((l: any) => ({
          project_id,
          csi_division: String(l.csi_division),
          description: l.description ?? null,
          budgeted: num(l.budgeted ?? l.amount ?? 0),
          committed: num(l.committed ?? 0),
          actual_spent: num(l.actual_spent ?? 0),
        }));
      if (rows.length > 0) {
        const { error: insertError } = await db
          .from("project_budget_lines")
          .insert(rows);
        if (insertError) throw insertError;
      }
    }

    const synthetic: ProjectBudget = {
      id: project_id,
      project_id,
      user_id: user.id,
      total_budget: parseFloat(total_budget),
      currency,
      alert_threshold: alert_threshold || 80,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return NextResponse.json(synthetic, { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}

/**
 * PATCH = upsert/update budget lines for a project.
 *
 * Two shapes accepted:
 *   1. { id, total_budget?, alert_threshold?, notes? }  ← legacy envelope edit
 *      (no-op against project_budget_lines; we acknowledge it so callers
 *      that round-trip the envelope keep working.)
 *   2. { project_id, lines: [{ csi_division, description?, budgeted?,
 *      committed?, actual_spent? }] }  ← bulk upsert by csi_division
 */
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { id, project_id, lines, total_budget, alert_threshold, notes } = body;

    const targetProjectId = project_id || id;
    if (!targetProjectId) {
      return NextResponse.json(
        { error: "project_id or id required" },
        { status: 400 }
      );
    }

    const db = getServiceClient();
    const owns = await verifyProjectOwnership(db, targetProjectId, user.id, request);
    if (!owns) {
      return NextResponse.json(
        { error: "Budget not found or unauthorized" },
        { status: 404 }
      );
    }

    if (Array.isArray(lines)) {
      // Upsert by (project_id, csi_division). Update budgeted/committed/spent
      // on conflict, keep other lines intact.
      const rows = lines
        .filter((l: any) => l && l.csi_division)
        .map((l: any) => ({
          project_id: targetProjectId,
          csi_division: String(l.csi_division),
          description: l.description ?? null,
          budgeted: num(l.budgeted ?? l.amount ?? 0),
          committed: num(l.committed ?? 0),
          actual_spent: num(l.actual_spent ?? 0),
        }));
      if (rows.length > 0) {
        // Two-step: delete existing rows for the divisions we're updating,
        // then insert. Saves a unique-index requirement we don't have yet.
        const divisions = rows.map((r) => r.csi_division);
        await db
          .from("project_budget_lines")
          .delete()
          .eq("project_id", targetProjectId)
          .in("csi_division", divisions);
        const { error: insertError } = await db
          .from("project_budget_lines")
          .insert(rows);
        if (insertError) throw insertError;
      }
    }

    // Echo back a synthetic envelope so legacy clients are happy.
    const synthetic: Partial<ProjectBudget> = {
      id: targetProjectId,
      project_id: targetProjectId,
      user_id: user.id,
      ...(total_budget !== undefined ? { total_budget: parseFloat(total_budget) } : {}),
      ...(alert_threshold !== undefined ? { alert_threshold } : {}),
      ...(notes !== undefined ? { notes } : {}),
      updated_at: new Date().toISOString(),
    };
    return NextResponse.json(synthetic);
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

/**
 * DELETE ?id=<projectId> — wipes ALL project_budget_lines for that project.
 * Matches the old "delete budget envelope cascades to items" semantics.
 */
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
    const owns = await verifyProjectOwnership(db, id, user.id, request);
    if (!owns) {
      return NextResponse.json(
        { error: "Budget not found or unauthorized" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await db
      .from("project_budget_lines")
      .delete()
      .eq("project_id", id);

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
