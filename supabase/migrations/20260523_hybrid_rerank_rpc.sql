-- 2026-05-23 — Hybrid (vector + FTS) rerank RPC over knowledge_entities.
--
-- Why this exists:
--   The `match_knowledge_entities` RPC (round 4, 20260522c) does pure
--   vector cosine similarity. That works well for fuzzy semantic queries
--   ("kitchen outlets near sink") but loses precision when the query
--   carries an exact section number ("NEC 210.52(C)(5)") — token-level
--   matches on "210.52" beat any semantic neighbor.
--
--   This RPC unions vector top-N and FTS top-N, then linearly combines
--   their normalized scores. The TypeScript adapter (`rag.ts`) applies a
--   third bonus on top: exact / prefix match of section number in
--   slug/title (γ · section_bonus). Keeping the section bonus in TS
--   lets us tune α/β/γ without redeploying SQL.
--
-- Score model (SQL side):
--   combined_score = 0.6 · vector_score + 0.4 · fts_score
--   - vector_score = (1 - cosine_distance)  ∈ [0, 1]
--   - fts_score    = ts_rank_cd / max_rank  ∈ [0, 1]  (normalized per query)
--
-- Backward compatibility:
--   The existing `match_knowledge_entities` RPC stays intact. The TS
--   adapter calls THIS RPC only when both an embedding AND a non-empty
--   query string are available; otherwise it falls through to the FTS
--   path that has shipped since 2026-04.
--
-- Risk callouts:
--   - FULL OUTER JOIN over `id` produces NULL columns when an FTS hit
--     has no vector hit (or vice versa). We pull all display columns
--     from a third subquery (`row_meta`) that joins on COALESCE(id) so
--     no row is missing slug/title.
--   - SECURITY DEFINER + SET search_path=public mirrors the existing
--     RPC; prevents search_path hijack and lets anon callers use it
--     without needing per-row RLS bypass.
--   - Empty plainto_tsquery (e.g. only stopwords) returns no FTS hits;
--     the COALESCE keeps vector-only results flowing through.

CREATE OR REPLACE FUNCTION public.hybrid_match_knowledge_entities(
  query_embedding vector(1536),
  query_text text,
  match_limit int DEFAULT 20,
  entity_types text[] DEFAULT ARRAY['building_code','code_section','safety_regulation','standard'],
  alpha_vector numeric DEFAULT 0.6,
  beta_fts numeric DEFAULT 0.4
)
RETURNS TABLE (
  id uuid,
  slug text,
  title jsonb,
  summary jsonb,
  body jsonb,
  search_text text,
  entity_type text,
  source_urls text[],
  jurisdiction_ids text[],
  metadata jsonb,
  vector_score numeric,
  fts_score numeric,
  combined_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH vector_hits AS (
    SELECT
      ke.id,
      (1 - (ke.embedding <=> query_embedding))::numeric AS vector_score
    FROM public.knowledge_entities ke
    WHERE ke.embedding IS NOT NULL
      AND ke.status = 'published'
      AND ke.entity_type = ANY(entity_types)
    ORDER BY ke.embedding <=> query_embedding
    LIMIT match_limit
  ),
  fts_raw AS (
    SELECT
      ke.id,
      ts_rank_cd(
        to_tsvector('english', COALESCE(ke.search_text, '')),
        plainto_tsquery('english', query_text)
      )::numeric AS raw_rank
    FROM public.knowledge_entities ke
    WHERE ke.search_text IS NOT NULL
      AND ke.status = 'published'
      AND ke.entity_type = ANY(entity_types)
      AND to_tsvector('english', COALESCE(ke.search_text, ''))
          @@ plainto_tsquery('english', query_text)
    ORDER BY raw_rank DESC
    LIMIT match_limit
  ),
  fts_hits AS (
    -- Normalize ts_rank_cd into [0,1] by dividing by the top score.
    -- Empty table is fine: outer COALESCE turns nulls into 0.
    SELECT
      fr.id,
      CASE
        WHEN (SELECT MAX(raw_rank) FROM fts_raw) > 0
        THEN (fr.raw_rank / (SELECT MAX(raw_rank) FROM fts_raw))::numeric
        ELSE 0::numeric
      END AS fts_score
    FROM fts_raw fr
  ),
  union_ids AS (
    SELECT id FROM vector_hits
    UNION
    SELECT id FROM fts_hits
  ),
  combined AS (
    SELECT
      u.id,
      COALESCE(v.vector_score, 0)::numeric AS vector_score,
      COALESCE(f.fts_score, 0)::numeric AS fts_score,
      (alpha_vector * COALESCE(v.vector_score, 0)
         + beta_fts * COALESCE(f.fts_score, 0))::numeric AS combined_score
    FROM union_ids u
    LEFT JOIN vector_hits v ON v.id = u.id
    LEFT JOIN fts_hits f ON f.id = u.id
  )
  SELECT
    ke.id,
    ke.slug,
    ke.title,
    ke.summary,
    ke.body,
    ke.search_text,
    ke.entity_type::text,
    ke.source_urls,
    ke.jurisdiction_ids,
    ke.metadata,
    c.vector_score,
    c.fts_score,
    c.combined_score
  FROM combined c
  JOIN public.knowledge_entities ke ON ke.id = c.id
  ORDER BY c.combined_score DESC
  LIMIT match_limit;
$$;

GRANT EXECUTE ON FUNCTION public.hybrid_match_knowledge_entities(
  vector, text, int, text[], numeric, numeric
) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.hybrid_match_knowledge_entities IS
  'Hybrid vector + FTS rerank over knowledge_entities. Combined score = α·vector + β·fts. Section-number bonus applied client-side in rag.ts. See docs/EXTERNAL-CODE-SOURCES.md "Hybrid RAG" section.';
