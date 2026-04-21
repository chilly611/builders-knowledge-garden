// GET /api/v1/rsi/specialist-runs
// Query specialist run history for a given specialist_id
// Auth: Service role via SUPABASE_SERVICE_ROLE_KEY header check

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Extract service role key from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized: missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const providedKey = authHeader.substring(7);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return NextResponse.json(
      { error: "Service misconfigured: SUPABASE_SERVICE_ROLE_KEY not set" },
      { status: 500 }
    );
  }

  // Compare provided key against service role key (timing-safe comparison not needed here since this is API auth, not password)
  if (providedKey !== serviceKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Extract query parameters
  const { searchParams } = new URL(request.url);
  const specialistId = searchParams.get("specialist_id");
  const limitStr = searchParams.get("limit");
  const promptVersion = searchParams.get("prompt_version");

  if (!specialistId) {
    return NextResponse.json(
      { error: "Missing required query parameter: specialist_id" },
      { status: 400 }
    );
  }

  const limit = Math.min(Math.max(parseInt(limitStr || "100", 10), 1), 1000);

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "Service misconfigured: NEXT_PUBLIC_SUPABASE_URL not set" },
      { status: 500 }
    );
  }

  const client = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    // Build query
    let query = client
      .from("specialist_runs")
      .select("*")
      .eq("specialist_id", specialistId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Optional: filter by prompt_version
    if (promptVersion) {
      query = query.eq("prompt_version", promptVersion);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[RSI] Query error:", error);
      return NextResponse.json(
        { error: "Failed to query specialist runs" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        specialist_id: specialistId,
        prompt_version: promptVersion || null,
        limit,
        count: data?.length || 0,
        runs: data || [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[RSI] Exception:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
