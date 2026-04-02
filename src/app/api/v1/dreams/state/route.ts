// Dream State — Persistent dream storage across all interfaces
// POST /api/v1/dreams/state — save or update dream state
// GET /api/v1/dreams/state?id=xxx — retrieve dream state
// GET /api/v1/dreams/state?user=xxx — list user's dreams

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DreamState {
  id?: string;
  user_id?: string;
  title: string;
  // Which interfaces have contributed to this dream
  interfaces_used: string[];
  // The accumulated dream data from ALL interfaces
  oracle_profile?: Record<string, unknown>;
  alchemist_recipe?: { ingredients: string[]; result?: string };
  quest_tokens?: string[];
  genome_dna?: Record<string, number>;
  narrator_story?: { path: string; scenes: string[] };
  collider_synthesis?: { dreamer_a: Record<string, string>; dreamer_b: Record<string, string>; result?: Record<string, unknown> };
  sandbox_blocks?: { x: number; y: number; type: string }[];
  voice_conversation?: { role: string; text: string }[];
  cosmos_selections?: { styles: string[]; materials: string[]; constraints: string[] };
  sketch_data?: string; // base64 canvas data
  describe_text?: string;
  inspire_photos?: string[];
  // Synthesized dream properties (updated as interfaces contribute)
  inferred_style?: string;
  inferred_materials?: string[];
  inferred_scale?: string;
  estimated_cost_range?: string;
  color_palette?: string[];
  renders?: string[]; // URLs to generated images
  // Metadata
  growth_stage: "seed" | "sprout" | "sapling" | "bloom";
  last_interface: string;
  created_at?: string;
  updated_at?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<DreamState> = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // Calculate growth stage based on interfaces used
    const interfaceCount = (body.interfaces_used || []).length;
    const growth_stage = interfaceCount <= 1 ? "seed" : interfaceCount <= 3 ? "sprout" : interfaceCount <= 6 ? "sapling" : "bloom";

    const dreamData = {
      ...body,
      growth_stage,
      updated_at: new Date().toISOString(),
    };

    if (body.id) {
      // Update existing dream
      const { data, error } = await supabase
        .from("dream_states")
        .update(dreamData)
        .eq("id", body.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ dream: data, updated: true });
    } else {
      // Create new dream
      const { data, error } = await supabase
        .from("dream_states")
        .insert({
          ...dreamData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ dream: data, created: true });
    }
  } catch (err) {
    console.error("Dream state error:", err);
    return NextResponse.json(
      { error: "Failed to save dream state", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("user");

    if (id) {
      const { data, error } = await supabase
        .from("dream_states")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return NextResponse.json({ dream: data });
    }

    if (userId) {
      const { data, error } = await supabase
        .from("dream_states")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return NextResponse.json({ dreams: data });
    }

    // Return recent public dreams
    const { data, error } = await supabase
      .from("dream_states")
      .select("id, title, growth_stage, interfaces_used, inferred_style, renders, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    return NextResponse.json({ dreams: data });
  } catch (err) {
    console.error("Dream state fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch dream state" },
      { status: 500 }
    );
  }
}
