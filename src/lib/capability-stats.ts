/**
 * Capability stats — the ONE source for "how big is the knowledge garden"
 * claims anywhere in the app (homepage counters, API self-descriptions,
 * copilot prompts). Moved out of src/app/page.tsx (2026-06-02) so every
 * surface reads the same numbers instead of hardcoding marketing copy
 * ("40,000+", "142+") that drifted from reality.
 *
 * Live counts query Supabase the same way /api/v1/mcp does (public,
 * RLS-safe). If Supabase is unconfigured or the query fails, fall back to
 * the verified numbers — NEVER zero, never invented.
 *
 * Verified live 2026-06-01: 2,256 published knowledge entities, 44
 * jurisdictions (California-first).
 */
import { supabase, isSupabaseConfigured } from "./supabase";

export const CAPABILITY_FALLBACK = { entities: 2256, jurisdictions: 44 } as const;

export async function getCapabilityStats(): Promise<{ entities: number; jurisdictions: number }> {
  if (!isSupabaseConfigured()) return CAPABILITY_FALLBACK;
  try {
    const [entitiesRes, jurisdictionsRes] = await Promise.all([
      supabase.from("knowledge_entities").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("jurisdictions").select("*", { count: "exact", head: true }),
    ]);
    return {
      // `||` guards null/0 counts (e.g. RLS) so public surfaces never say zero.
      entities: entitiesRes.count || CAPABILITY_FALLBACK.entities,
      jurisdictions: jurisdictionsRes.count || CAPABILITY_FALLBACK.jurisdictions,
    };
  } catch {
    return CAPABILITY_FALLBACK;
  }
}
