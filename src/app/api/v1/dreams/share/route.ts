// Builder's Knowledge Garden — Dream Share API
// POST /api/v1/dreams/share — Generate shareable link
// Body: { dream_id: string }

import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 8; i++) slug += chars[Math.floor(Math.random() * chars.length)];
  return slug;
}

export async function POST(req: NextRequest) {
  try {
    const { dream_id } = await req.json();
    if (!dream_id) return NextResponse.json({ error: "dream_id required" }, { status: 400 });
    if (!isSupabaseConfigured()) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // Check if already shared
    const { data: existing } = await supabase.from("dreams")
      .select("share_slug").eq("id", dream_id).eq("shared", true).single();

    if (existing?.share_slug) {
      return NextResponse.json({ share_slug: existing.share_slug, url: `/dream/shared/${existing.share_slug}` });
    }

    const shareSlug = generateSlug();
    const { error } = await supabase.from("dreams")
      .update({ shared: true, share_slug: shareSlug, updated_at: new Date().toISOString() })
      .eq("id", dream_id);

    if (error) {
      return NextResponse.json({ error: "Failed to share dream", detail: error.message }, { status: 500 });
    }

    await supabase.from("dream_signals").insert({
      dream_id, signal_type: "dream_shared", signal_data: { share_slug: shareSlug },
    }).then(() => {});

    return NextResponse.json({ share_slug: shareSlug, url: `/dream/shared/${shareSlug}` });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", detail: err instanceof Error ? err.message : "Unknown" }, { status: 400 });
  }
}
