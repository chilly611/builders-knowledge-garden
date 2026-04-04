import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, feedback, timestamp } = body;

    if (!messageId || !feedback) {
      return NextResponse.json({ error: "Missing messageId or feedback" }, { status: 400 });
    }

    // Log to Supabase if configured
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      await supabase.from("copilot_feedback").insert({
        message_id: messageId,
        feedback,
        created_at: timestamp || new Date().toISOString(),
      });
    }

    // Always log for observability
    console.log("[Copilot Feedback]", { messageId, feedback, timestamp });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Copilot Feedback] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
