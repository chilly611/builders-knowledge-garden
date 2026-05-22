import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser, getServiceClient, unauthorizedResponse } from "@/lib/auth-server";

/**
 * /api/v1/punch-list — list + create punch items for a project.
 *
 * 2026-05-22 (BUDGET+SEC2 fix): same hostile pattern as /api/v1/rfis — was
 * service-role + no auth + projectId from the query string. Closed using
 * the same bearer-token + project-ownership gate.
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

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

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

    const { data, error } = await getServiceClient()
      .from("project_punch_items")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

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
    } = body;

    if (!projectId || !location || !description || !assigned_trade) {
      return NextResponse.json(
        { error: "projectId, location, description, and assigned_trade are required" },
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

    const { data, error } = await getServiceClient()
      .from("project_punch_items")
      .insert([
        {
          project_id: projectId,
          location,
          description,
          assigned_trade,
          priority: priority || "medium",
          status: "open",
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
