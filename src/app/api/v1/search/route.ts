import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { emitSearchSignal } from "@/lib/events";

// Knowledge Search API
// GET /api/v1/search?q=fire+exit+requirements&jurisdiction=ca-la&domain=codes&limit=20
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const jurisdiction = searchParams.get("jurisdiction");
  const domain = searchParams.get("domain");
  const entityType = searchParams.get("type");
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
  const offset = Number(searchParams.get("offset") || 0);

  if (!q && !domain && !entityType) {
    return NextResponse.json(
      { error: "Provide at least one of: q, domain, type" },
      { status: 400 }
    );
  }

  // Log search signal for RSI Loop 2 (even before the loop is active)
  const searchSignal = {
    query: q,
    jurisdiction,
    domain,
    entity_type: entityType,
    timestamp: new Date().toISOString(),
  };

  try {
    // Try Supabase if configured
    if (isSupabaseConfigured()) {
      let query_builder = supabase
        .from("knowledge_entities")
        .select("id, slug, title, summary, entity_type, domain, tags, metadata, category")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (q) {
        // Full-text search using PostgreSQL tsvector on generated search_text column
        query_builder = query_builder.textSearch("search_text", q, {
          type: "plain",
          config: "english",
        });
      }

      if (domain) {
        query_builder = query_builder.eq("domain", domain);
      }
      if (entityType) {
        query_builder = query_builder.eq("entity_type", entityType);
      }

      const { data, error, count } = await query_builder;

      // If FTS returns nothing, fall back to OR-based ilike search
      let resultData = data;
      if ((!data || data.length === 0) && q && !error) {
        const words = q.split(/\s+/).filter(w => w.length > 2).slice(0, 4);
        if (words.length > 0) {
          const orFilter = words.map(w => `search_text.ilike.%${w}%`).join(",");
          let fb = supabase
            .from("knowledge_entities")
            .select("id, slug, title, summary, entity_type, domain, tags, metadata, category")
            .eq("status", "published")
            .or(orFilter)
            .order("updated_at", { ascending: false })
            .range(offset, offset + limit - 1);
          if (domain) fb = fb.eq("domain", domain);
          if (entityType) fb = fb.eq("entity_type", entityType);
          const fbResult = await fb;
          if (!fbResult.error && fbResult.data) resultData = fbResult.data;
        }
      }

      if (error) {
        console.error("Supabase search error:", error);
        return NextResponse.json({ error: "Search failed", detail: error.message }, { status: 500 });
      }

      // Transform results: extract English title/summary from JSONB
      const results = (resultData || []).map((e) => ({
        id: e.id,
        slug: e.slug,
        title: typeof e.title === "object" ? e.title.en || e.title : e.title,
        summary: typeof e.summary === "object" ? e.summary.en || e.summary : e.summary,
        entity_type: e.entity_type,
        domain: e.domain,
        category: e.category,
        tags: e.tags,
        metadata: e.metadata,
      }));

      // Emit search signal for RSI Loop 2
      emitSearchSignal({ query: q, results_count: results.length, jurisdiction: jurisdiction || undefined, domain: domain || undefined });

      return NextResponse.json({
        results,
        total: count || results.length,
        query: q,
        filters: { jurisdiction, domain, entity_type: entityType },
        limit,
        offset,
        _signal: searchSignal,
      });
    }

    // Fallback: mock results when Supabase is not configured
    return NextResponse.json({
      results: [
        { id: "mock-1", slug: "ibc-903-2-1", title: "IBC Section 903.2.1 — Automatic Sprinkler Systems", summary: "Requirements for automatic sprinkler systems in buildings based on occupancy and area.", entity_type: "code_section", tags: ["fire-protection", "sprinkler"] },
        { id: "mock-2", slug: "osha-1926-502", title: "OSHA 1926.502 — Fall Protection Requirements", summary: "Duty to provide fall protection systems for workers at elevation.", entity_type: "safety_rule", tags: ["fall-protection", "safety"] },
        { id: "mock-3", slug: "concrete-4000psi", title: "Concrete — 4000 PSI Normal Weight", summary: "Standard concrete mix for structural applications. 150 pcf density.", entity_type: "material", tags: ["concrete", "structural"] },
      ],
      total: 3,
      query: q,
      filters: { jurisdiction, domain, entity_type: entityType },
      limit,
      offset,
      _mock: true,
      _signal: searchSignal,
    });
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
