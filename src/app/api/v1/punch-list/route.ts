import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser, getServiceClient, unauthorizedResponse } from "@/lib/auth-server";

/**
 * /api/v1/punch-list — list + create + update punch items for a project.
 *
 * 2026-05-22 (BUDGET+SEC2 fix): same hostile pattern as /api/v1/rfis — was
 * service-role + no auth + projectId from the query string. Closed using
 * the same bearer-token + project-ownership gate.
 *
 * 2026-05-22 (PUNCH-LIST-UI): foreman-speed reduction. POST now requires
 * only `description` + `projectId`; `photo_url`, `location`,
 * `assigned_trade`, and `priority` are all optional. Tony-foreman's
 * feedback: nobody types "location" and "trade" on a ladder. PATCH added
 * for resolve/defer toggles. GET supports `?status=open` filter.
 */

const DEMO_PROJECT_IDS = new Set<string>([
  '55730cd3-5225-493d-8b5c-49086d942565', // Marin farmhouse
  'aa11b22c-1111-4d78-aaaa-bbccdd112233', // ADU in Sausalito
  'bb22c33d-2222-4d78-bbbb-ccddee223344', // Commercial TI in SoMa
]);

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

async function verifyProjectAccess(
  request: NextRequest,
  projectId: string,
  userId: string,
): Promise<boolean> {
  if (DEMO_PROJECT_IDS.has(projectId)) return true;
  const callerDemoProjectId = await getCallerDemoProjectId(request);
  if (callerDemoProjectId && callerDemoProjectId === projectId) return true;
  const { data, error } = await getServiceClient()
    .from('command_center_projects')
    .select('id, user_id')
    .eq('id', projectId)
    .maybeSingle();
  if (error || !data) return false;
  return String(data.user_id) === String(userId);
}

// Statuses are constrained by a CHECK on project_punch_items:
//   'open' | 'in_progress' | 'complete' | 'verified'
// The UI surface uses "Resolved" copy, but on the wire we speak the DB's
// vocabulary — the client maps 'complete' ↔ "Resolved" presentationally.
const ALLOWED_STATUSES = new Set<string>([
  "open",
  "in_progress",
  "complete",
  "verified",
]);
const ALLOWED_TRADES = new Set<string>([
  "Electrical",
  "Plumbing",
  "Drywall",
  "Paint",
  "HVAC",
  "Framing",
  "Trim",
  "Painting",
  "Other",
]);

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const allowed = await verifyProjectAccess(request, projectId, user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 403 }
      );
    }

    let query = getServiceClient()
      .from("project_punch_items")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (status && ALLOWED_STATUSES.has(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      projectId,
      location,
      description,
      assigned_trade,
      priority,
      photo_url,
    } = body;

    // 2026-05-22 (PUNCH-LIST-UI): reduce required fields to the foreman
    // minimum. Description carries the punch; everything else (photo,
    // location, trade, priority) is optional and can be filled in later
    // from a different surface (or inferred from photo EXIF / trade
    // picker / a follow-up triage step).
    if (!projectId || !description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { error: "projectId and a non-empty description are required" },
        { status: 400 }
      );
    }

    // Cheap input bound — protects the DB from accidental paste-bombs.
    if (description.length > 2000) {
      return NextResponse.json(
        { error: "description too long (max 2000 chars)" },
        { status: 400 }
      );
    }

    const allowed = await verifyProjectAccess(request, projectId, user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 403 }
      );
    }

    // Normalize trade to allowed list when supplied; unknown values fall
    // through to "Other" rather than rejecting the punch.
    const trade =
      typeof assigned_trade === "string" && ALLOWED_TRADES.has(assigned_trade)
        ? assigned_trade
        : assigned_trade
        ? "Other"
        : null;

    const { data, error } = await getServiceClient()
      .from("project_punch_items")
      .insert([
        {
          project_id: projectId,
          location: typeof location === "string" && location.length > 0 ? location : null,
          description: description.trim(),
          assigned_trade: trade,
          priority: typeof priority === "string" && priority.length > 0 ? priority : "medium",
          status: "open",
          photo_url: typeof photo_url === "string" && photo_url.length > 0 ? photo_url : null,
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/punch-list?id=<uuid>
 *
 * Updates status / assigned_trade / location / description on an existing
 * punch item. Used by the swipe-to-resolve + reassign-trade flows in
 * PunchListClient. Project ownership is verified against the row's
 * project_id, not a body field, so callers can't move a punch item
 * between projects by lying about projectId.
 */
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { status, assigned_trade, location, description, photo_url } = body || {};

    // Verify the row exists and the caller owns the project.
    const svc = getServiceClient();
    const { data: row, error: lookupError } = await svc
      .from("project_punch_items")
      .select("id, project_id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const allowed = await verifyProjectAccess(request, row.project_id, user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 403 }
      );
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof status === "string") {
      if (!ALLOWED_STATUSES.has(status)) {
        return NextResponse.json(
          { error: `status must be one of ${[...ALLOWED_STATUSES].join(", ")}` },
          { status: 400 }
        );
      }
      patch.status = status;
    }
    if (typeof assigned_trade === "string") {
      patch.assigned_trade = ALLOWED_TRADES.has(assigned_trade) ? assigned_trade : "Other";
    }
    if (typeof location === "string") {
      patch.location = location.length > 0 ? location : null;
    }
    if (typeof description === "string" && description.trim().length > 0) {
      if (description.length > 2000) {
        return NextResponse.json(
          { error: "description too long (max 2000 chars)" },
          { status: 400 }
        );
      }
      patch.description = description.trim();
    }
    if (typeof photo_url === "string") {
      patch.photo_url = photo_url.length > 0 ? photo_url : null;
    }

    if (Object.keys(patch).length === 1) {
      // Only updated_at — nothing meaningful to write.
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 }
      );
    }

    const { data, error } = await svc
      .from("project_punch_items")
      .update(patch)
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data?.[0] ?? null);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/punch-list?id=<uuid>
 *
 * Long-press delete from the list. Same project-ownership gate as PATCH.
 */
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const svc = getServiceClient();
    const { data: row, error: lookupError } = await svc
      .from("project_punch_items")
      .select("id, project_id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const allowed = await verifyProjectAccess(request, row.project_id, user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 403 }
      );
    }

    const { error } = await svc.from("project_punch_items").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
