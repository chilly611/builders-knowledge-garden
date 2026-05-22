-- 2026-05-22c — HNSW index + match_knowledge_entities RPC for vector RAG.
--
-- Lights up the "vector path" in src/lib/code-sources/rag.ts. Without this
-- migration the cosine-similarity branch silently falls through to FTS
-- (queryByVector returns null on 42883 undefined_function).
--
-- Applies to: knowledge_entities.embedding (vector(1536)).
-- Backfilled by: `npm run embeddings` (src/scripts/generate-embeddings.ts).
-- Documented in: docs/EXTERNAL-CODE-SOURCES.md "Vector RAG" section.

-- HNSW index for fast cosine-similarity ANN.
-- With 2,256 rows the build is sub-second. For a future corpus >100k we
-- would split this into a CONCURRENTLY-built standalone statement to
-- avoid the table lock — see "Risk callouts" in EXTERNAL-CODE-SOURCES.md.
CREATE INDEX IF NOT EXISTS knowledge_entities_embedding_hnsw
  ON public.knowledge_entities
  USING hnsw (embedding vector_cosine_ops);

-- RPC called by rag.ts queryByVector(). Returns the same column shape
-- rag.ts already maps in rowToResult(), plus a `score` (1 - cosine dist).
CREATE OR REPLACE FUNCTION public.match_knowledge_entities(
  query_embedding vector(1536),
  match_limit int DEFAULT 5,
  entity_types text[] DEFAULT ARRAY['building_code','code_section','safety_regulation','standard']
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
  score float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ke.id,
    ke.slug,
    ke.title,
    ke.summary,
    ke.body,
    ke.search_text,
    ke.entity_type,
    ke.source_urls,
    ke.jurisdiction_ids,
    ke.metadata,
    (1 - (ke.embedding <=> query_embedding))::float AS score
  FROM public.knowledge_entities ke
  WHERE ke.embedding IS NOT NULL
    AND ke.status = 'published'
    AND ke.entity_type = ANY(entity_types)
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_limit;
$$;

GRANT EXECUTE ON FUNCTION public.match_knowledge_entities(vector, int, text[])
  TO anon, authenticated, service_role;
