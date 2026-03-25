import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Entity Detail API
// GET /api/v1/entities/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Entity ID required" }, { status: 400 });
  }

  try {
    if (isSupabaseConfigured()) {
      // Detect if the id is a UUID or a slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      const { data, error } = await supabase
        .from("knowledge_entities")
        .select("*")
        .eq(isUuid ? "id" : "slug", id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Entity not found" }, { status: 404 });
      }

      // Transform JSONB fields for English-first response
      const entity = {
        ...data,
        title: typeof data.title === "object" ? data.title.en || data.title : data.title,
        summary: typeof data.summary === "object" ? data.summary.en || data.summary : data.summary,
        body: typeof data.body === "object" ? data.body.en || data.body : data.body,
      };

      return NextResponse.json({ entity });
    }

    // Fallback mock
    return NextResponse.json({
      entity: {
        id,
        slug: id,
        title: `Knowledge Entity: ${id}`,
        summary: "This is a mock entity. Connect Supabase to see real data from 40K+ entities.",
        entity_type: "code_section",
        body: "Full entity content will be served from the knowledge engine.",
        metadata: {},
        tags: [],
        source_refs: [],
        _mock: true,
      },
    });
  } catch (err) {
    console.error("Entity API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
