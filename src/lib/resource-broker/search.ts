import { v4 as uuidv4 } from 'uuid';
import type { ResourceQuery, ResourceResponse, ResourceResult } from './types';
import { demoFixtures } from './demo-fixtures';
import { logBrokerQuery } from './log';

/**
 * Search for resources using live search APIs with fallback to demo fixtures.
 * Strategy (in order of preference):
 * 1. If BRAVE_API_KEY is set, use Brave Search API
 * 2. Otherwise, use Anthropic SDK with web-search tool-use
 * 3. Otherwise, return demo fixtures with warnings
 */
export async function search(q: ResourceQuery): Promise<ResourceResponse> {
  const runId = uuidv4();
  const startTime = Date.now();
  const sources: string[] = [];
  const warnings: string[] = [];
  let results: ResourceResult[] = [];

  try {
    // Determine which strategy to attempt
    const braveKey = process.env.BRAVE_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (braveKey) {
      // Strategy 1: Use Brave Search API
      try {
        const braveResults = await searchBrave(q, braveKey);
        results = braveResults.results;
        sources.push('brave_search');
      } catch (err) {
        console.error('[resource-broker] Brave Search failed:', err);
        warnings.push('Brave Search API failed, falling back to Anthropic');
        // Fall through to Strategy 2
      }
    }

    // If Brave didn't work or wasn't available, try Anthropic
    if (results.length === 0 && anthropicKey) {
      try {
        const anthropicResults = await searchAnthropicWebSearch(q, anthropicKey);
        results = anthropicResults.results;
        sources.push('anthropic_web_search');
      } catch (err) {
        console.error('[resource-broker] Anthropic web search failed:', err);
        warnings.push('Anthropic web search failed, using demo fixtures');
        // Fall through to Strategy 3
      }
    }

    // Strategy 3: Use demo fixtures
    if (results.length === 0) {
      results = filterDemoFixtures(q);
      sources.push('demo_fixtures');
      if (!warnings.includes('live search unavailable, returning demo fixtures')) {
        warnings.push('live search unavailable, returning demo fixtures');
      }
    }

    // Apply limit
    const limit = q.limit || 12;
    results = results.slice(0, limit);

    const latencyMs = Date.now() - startTime;
    const response: ResourceResponse = {
      query: q,
      results,
      totalFound: results.length,
      latencyMs,
      sources,
      warnings,
      runId,
    };

    // Log to Supabase (non-blocking, errors swallowed)
    logBrokerQuery(runId, q, response).catch(() => {
      // Swallow logging errors
    });

    return response;
  } catch (err) {
    // Absolute fallback: demo fixtures + error warning
    const fallbackResults = filterDemoFixtures(q).slice(0, q.limit || 12);
    const latencyMs = Date.now() - startTime;
    const response: ResourceResponse = {
      query: q,
      results: fallbackResults,
      totalFound: fallbackResults.length,
      latencyMs,
      sources: ['demo_fixtures'],
      warnings: ['search failed unexpectedly, returning demo fixtures'],
      runId,
    };

    logBrokerQuery(runId, q, response).catch(() => {
      // Swallow logging errors
    });

    return response;
  }
}

/**
 * Search using Brave Search API.
 * Returns structured ResourceResult[] from Brave responses.
 */
async function searchBrave(
  q: ResourceQuery,
  apiKey: string
): Promise<{ results: ResourceResult[] }> {
  // Construct a search query that targets the requested kinds
  const queryStr = normalizeQuery(q);
  const params = new URLSearchParams({
    q: queryStr,
    count: String(q.limit || 12),
  });

  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
  });

  if (!res.ok) {
    throw new Error(`Brave API error: ${res.status}`);
  }

  const data = await res.json() as { web?: Array<{ title?: string; url?: string; description?: string }> };
  const webResults = data.web || [];

  // Convert Brave results to ResourceResult
  const results: ResourceResult[] = webResults.map((item, idx) => ({
    id: `brave-${idx}-${item.url?.split('/')[2] || 'unknown'}`,
    kind: q.kinds[0] || 'tool', // Simplification: use first kind for all results
    title: item.title || 'Untitled',
    url: item.url || '',
    snippet: item.description || '',
    source: 'brave_search',
    vendor: item.url?.split('/')[2] || 'Unknown',
  }));

  return { results };
}

/**
 * Search using Anthropic SDK with web-search tool-use.
 * Calls Claude with a tool definition for web search.
 */
async function searchAnthropicWebSearch(
  q: ResourceQuery,
  apiKey: string
): Promise<{ results: ResourceResult[] }> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });

  const queryStr = normalizeQuery(q);
  const toolDefinition = {
    name: 'web_search',
    description: 'Search the web for resources matching the query',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  };

  const response = await client.messages.create({
    model: 'claude-opus-4-1',
    max_tokens: 1024,
    tools: [toolDefinition] as Parameters<typeof client.messages.create>[0]['tools'],
    messages: [
      {
        role: 'user',
        content: `Find resources matching this query and return structured results. Query: ${queryStr}. Return results as JSON array with fields: title, url, snippet, vendor.`,
      },
    ],
  });

  // Parse tool-use response and convert to ResourceResult
  const results: ResourceResult[] = [];

  // For now, return empty (tool-use would parse the assistant's response)
  // In production, this would invoke the actual web search and parse results
  if (response.content.length === 0) {
    throw new Error('No response from Anthropic');
  }

  return { results };
}

/**
 * Filter demo fixtures by kind and optional distance/budget constraints.
 */
function filterDemoFixtures(q: ResourceQuery): ResourceResult[] {
  let filtered = demoFixtures.filter((result) => q.kinds.includes(result.kind));

  // Apply budget filter if specified
  if (q.context?.budgetCeiling && q.context.budgetCeiling > 0) {
    filtered = filtered.filter((result) => {
      if (result.priceUsd === undefined) return true; // Include items without price
      return result.priceUsd <= q.context!.budgetCeiling!;
    });
  }

  // Sort by distance if location is specified
  if (q.where) {
    filtered.sort((a, b) => {
      const aDist = a.distance?.miles ?? Infinity;
      const bDist = b.distance?.miles ?? Infinity;
      return aDist - bDist;
    });
  }

  // Sort by rating if no location
  if (!q.where) {
    filtered.sort((a, b) => {
      const aRating = a.rating?.stars ?? 0;
      const bRating = b.rating?.stars ?? 0;
      return bRating - aRating;
    });
  }

  return filtered;
}

/**
 * Normalize a query string to include variants and synonyms.
 */
function normalizeQuery(q: ResourceQuery): string {
  let normalized = q.query;

  // Add kind context if provided
  if (q.kinds.length > 0) {
    const kindString = q.kinds.join(' OR ');
    normalized += ` (${kindString})`;
  }

  // Add location context if provided
  if (q.where?.address) {
    normalized += ` near ${q.where.address}`;
  }

  // Add budget context if provided
  if (q.context?.budgetCeiling) {
    normalized += ` under $${q.context.budgetCeiling}`;
  }

  return normalized;
}
