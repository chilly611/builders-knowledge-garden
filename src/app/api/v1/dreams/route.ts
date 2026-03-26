// Builder's Knowledge Garden — Dreams API
// POST /api/v1/dreams — Create dream
// GET /api/v1/dreams — List dreams (by session_id)
// PATCH /api/v1/dreams — Update dream by id

import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input_mode, prompt, lane, jurisdiction, building_type,
      style_slug, materials, codes, estimate_low, estimate_high,
      timeline_months, confidence_score, growth_stage, quiz_answers,
      sketch_data, photo_analyses, taste_profile, session_id } = body;

    if (!input_mode) {
      return NextResponse.json({ error: "input_mode is required" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured", fallback: "localStorage" }, { status: 503 });
    }

    const { data, error } = await supabase.from("dreams").insert({
      input_mode, prompt, lane, jurisdiction, building_type, style_slug,
      materials: materials || [], codes: codes || [],
      estimate_low, estimate_high, timeline_months,
      confidence_score: confidence_score || 0,
      growth_stage: growth_stage || "seed",
      quiz_answers, sketch_data, photo_analyses, taste_profile,
      session_id: session_id || crypto.randomUUID(),
    }).select("id, created_at, share_slug").single();

    if (error) {
      console.error("Dream create error:", error);
      return NextResponse.json({ error: "Failed to create dream", detail: error.message }, { status: 500 });
    }

    // Emit RSI signal
    await supabase.from("dream_signals").insert({
      dream_id: data.id,
      signal_type: "dream_created",
      signal_data: { input_mode, lane, jurisdiction, building_type, confidence_score },
    }).then(() => {});

    return NextResponse.json({ dream: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", detail: err instanceof Error ? err.message : "Unknown" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured", fallback: "localStorage" }, { status: 503 });
  }

  let query = supabase.from("dreams")
    .select("id, input_mode, prompt, lane, jurisdiction, building_type, style_slug, materials, codes, estimate_low, estimate_high, timeline_months, confidence_score, growth_stage, shared, share_slug, created_at, updated_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (sessionId) query = query.eq("session_id", sessionId);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to list dreams", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ dreams: data || [], total: count, limit, offset });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { data, error } = await supabase.from("dreams")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, confidence_score, growth_stage, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update dream", detail: error.message }, { status: 500 });
    }

    // Emit signal
    await supabase.from("dream_signals").insert({
      dream_id: id,
      signal_type: "dream_updated",
      signal_data: { fields_updated: Object.keys(updates) },
    }).then(() => {});

    return NextResponse.json({ dream: data });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", detail: err instanceof Error ? err.message : "Unknown" }, { status: 400 });
  }
}
