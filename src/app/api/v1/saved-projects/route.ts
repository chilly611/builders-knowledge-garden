// Saved Projects API â auth-gated CRUD for dream projects
// POST   /api/v1/saved-projects       â create a new project
// GET    /api/v1/saved-projects       â list user's projects (or get one with ?id=)
// PATCH  /api/v1/saved-projects       â update a project
// DELETE /api/v1/saved-projects?id=x  â delete a project

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getServiceClient, unauthorizedResponse } from "@/lib/auth-server";

// âââ CREATE âââ
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      title = "Untitled Project",
      description,
      interface: iface = "dream",
      interfaces_used = [iface],
      state = {},
      outputs = {},
      growth_stage = "seed",
      thumbnail_url,
      is_public = false,
      tags = [],
    } = body;

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("saved_projects")
      .insert({
        user_id: user.id,
        title,
        description,
        interface: iface,
        interfaces_used,
        state,
        outputs,
        growth_stage,
        thumbnail_url,
        is_public,
        tags,
        share_slug: is_public ? crypto.randomUUID().slice(0, 8) : null,
      })
      .select("id, title, interface, growth_stage, created_at")
      .single();

    if (error) {
      console.error("Saved project create error:", error);
      return NextResponse.json({ error: "Failed to create project", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 400 }
    );
  }
}

// âââ LIST / GET âââ
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const iface = searchParams.get("interface");

  try {
    const supabase = getServiceClient();

    // Single project fetch
    if (id) {
      const { data, error } = await supabase
        .from("saved_projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      return NextResponse.json({ project: data });
    }

    // List projects
    let query = supabase
      .from("saved_projects")
      .select("id, title, description, interface, interfaces_used, growth_stage, thumbnail_url, is_public, tags, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (iface) query = query.eq("interface", iface);

    const { data, error } = await query;

    if (error) {
      console.error("Saved project list error:", error);
      return NextResponse.json({ error: "Failed to list projects", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: data || [], total: (data || []).length, limit, offset });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list projects", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

// âââ UPDATE âââ
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Remove fields that shouldn't be directly updated
    delete updates.user_id;
    delete updates.created_at;

    const supabase = getServiceClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("saved_projects")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("saved_projects")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, title, interface, growth_stage, updated_at")
      .single();

    if (error) {
      console.error("Saved project update error:", error);
      return NextResponse.json({ error: "Failed to update project", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 400 }
    );
  }
}

// âââ DELETE âââ
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
    const { data: existing } = await supabase
      .from("saved_projects")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("saved_projects")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Saved project delete error:", error);
      return NextResponse.json({ error: "Failed to delete project", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete project", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
