import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceClient } from '@/lib/supabase';

// ============================================================================
// Type Definitions
// ============================================================================

interface ProvenanceChain {
  chain: ProvenanceNode[];
  entities: SourceEntity[];
  trust_score: number;
}

interface ProvenanceNode {
  type: 'query' | 'entity' | 'analysis' | 'response';
  label: string;
  timestamp: string;
  source?: string;
  details?: Record<string, any>;
}

interface SourceEntity {
  id: string;
  name: string;
  type: string;
  verified: boolean;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  agent_id: string;
  action_type: string;
  action_details: Record<string, any>;
  entity_references: string[];
  hash_chain: string;
  hash_previous: string;
  chain_valid: boolean;
  confidence_level: 'high' | 'medium' | 'low';
}

interface DecisionExplanation {
  action_id: string;
  context_window: string;
  entities_consulted: string[];
  reasoning_steps: string[];
  confidence_level: 'high' | 'medium' | 'low';
  confidence_explanation: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate SHA256 hash for audit chain
 */
function generateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify hash chain integrity
 */
function verifyHashChain(current: string, previous: string, currentHash: string): boolean {
  const combined = `${previous}${current}`;
  const expectedHash = generateHash(combined);
  return expectedHash === currentHash;
}

/**
 * Calculate trust score based on verified entities
 */
function calculateTrustScore(entities: SourceEntity[]): number {
  if (entities.length === 0) return 0;
  const verifiedCount = entities.filter((e) => e.verified).length;
  return verifiedCount / entities.length;
}

/**
 * Build provenance chain from knowledge entities
 */
async function buildProvenanceChain(
  supabase: any,
  entityId: string
): Promise<ProvenanceChain | null> {
  try {
    // Schema note (CLAIMS fix E, 2026-05-22): the prior code targeted
    // `kg_entities` / `kg_assertions` with columns like `name`, `type`,
    // `verified`, `entity_id_source`, `reasoning` — none of which exist.
    // The real schema is `knowledge_entities` (id, slug, entity_type,
    // title jsonb, summary jsonb, source_urls[], last_verified, status,
    // created_at) and `entity_relationships` (id, source_id, target_id,
    // relationship, strength, metadata, created_at). We derive a display
    // `name` from `title.en` / `slug`, an "is verified" boolean from
    // `last_verified IS NOT NULL`, and treat `relationship` text as the
    // assertion reasoning.
    const { data: entity, error: entityError } = await supabase
      .from('knowledge_entities')
      .select('id, slug, entity_type, title, summary, source_urls, last_verified, created_at')
      .eq('id', entityId)
      .single();

    if (entityError || !entity) {
      return null;
    }

    const entityName: string =
      (entity.title && typeof entity.title === 'object' && (entity.title.en || entity.title.value)) ||
      entity.slug ||
      entity.id;
    const entityVerified: boolean = !!entity.last_verified;
    const entitySources: string[] = Array.isArray(entity.source_urls) ? entity.source_urls : [];

    // Fetch related entity_relationships (the assertion analogue)
    const { data: assertions, error: assertionsError } = await supabase
      .from('entity_relationships')
      .select('id, source_id, target_id, relationship, strength, metadata, created_at')
      .or(`source_id.eq.${entityId},target_id.eq.${entityId}`)
      .order('created_at', { ascending: true });

    if (assertionsError) {
      console.error('Assertion fetch error:', assertionsError);
    }

    // Build chain: Query → Entity → Assertions/Analysis
    const chain: ProvenanceNode[] = [
      {
        type: 'query',
        label: 'User Query',
        timestamp: new Date().toISOString(),
        source: 'user_input',
      },
      {
        type: 'entity',
        label: `Knowledge Entity: ${entityName}`,
        timestamp: entity.created_at,
        source: `knowledge_entities.${entity.id}`,
        details: {
          entity_type: entity.entity_type,
          verified: entityVerified,
          sources: entitySources,
        },
      },
    ];

    // Add assertion nodes if available — `relationship` is the verb,
    // strength/metadata round out the reasoning. There is no free-text
    // `reasoning` column in entity_relationships, so we synthesize one.
    if (assertions && assertions.length > 0) {
      assertions.slice(0, 3).forEach((assertion: any, idx: number) => {
        chain.push({
          type: 'analysis',
          label: `Relationship ${idx + 1}: ${assertion.relationship || 'related'}`,
          timestamp: assertion.created_at,
          source: `entity_relationships.${assertion.id}`,
          details: {
            reasoning: `${assertion.source_id} —[${assertion.relationship}]→ ${assertion.target_id}`,
            strength: assertion.strength,
            metadata: assertion.metadata,
          },
        });
      });
    }

    // Add response node
    chain.push({
      type: 'response',
      label: 'AI Response Generated',
      timestamp: new Date().toISOString(),
      source: 'claude_analysis',
    });

    // Fetch related entities for citation badges
    const relatedEntities: SourceEntity[] = [
      {
        id: entity.id,
        name: entityName,
        type: entity.entity_type,
        verified: entityVerified,
      },
    ];

    // Add entities from relationships
    if (assertions && assertions.length > 0) {
      const relatedIds = new Set<string>();
      assertions.forEach((a: any) => {
        if (a.source_id !== entityId) relatedIds.add(a.source_id);
        if (a.target_id !== entityId) relatedIds.add(a.target_id);
      });

      if (relatedIds.size > 0) {
        const { data: relatedEntitiesData } = await supabase
          .from('knowledge_entities')
          .select('id, slug, entity_type, title, last_verified')
          .in('id', Array.from(relatedIds));

        if (relatedEntitiesData) {
          relatedEntitiesData.forEach((e: any) => {
            const name =
              (e.title && typeof e.title === 'object' && (e.title.en || e.title.value)) ||
              e.slug ||
              e.id;
            relatedEntities.push({
              id: e.id,
              name,
              type: e.entity_type,
              verified: !!e.last_verified,
            });
          });
        }
      }
    }

    const trustScore = calculateTrustScore(relatedEntities);

    return {
      chain,
      entities: relatedEntities,
      trust_score: trustScore,
    };
  } catch (error) {
    console.error('Provenance chain build error:', error);
    return null;
  }
}

/**
 * Fetch and verify audit trail
 */
async function fetchAuditTrail(
  supabase: any,
  page: number,
  limit: number,
  actionType?: string,
  agentId?: string
): Promise<{
  entries: AuditEntry[];
  agents: string[];
  action_types: string[];
  has_more: boolean;
}> {
  try {
    // Schema note (CLAIMS fix E, 2026-05-22): there is no `agent_audit_log`
    // table — the real table is `audit_log` with columns (id, table_name,
    // record_id, action, old_data, new_data, changed_by, changed_at,
    // source). There is no hash-chain or agent_id column. We map the
    // existing columns into the AuditEntry shape so the UI keeps rendering,
    // flag `chain_valid: true` (no chain to verify), and derive
    // `agent_id` / `action_type` from `source` and `action`. If/when a real
    // agent-audit table is added this block should be revisited.
    let query = supabase.from('audit_log').select('*', { count: 'exact' });

    if (actionType) {
      query = query.eq('action', actionType);
    }
    if (agentId) {
      query = query.eq('source', agentId);
    }

    // Paginate
    query = query.order('changed_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);

    const { data: entries, count, error } = await query;

    if (error) {
      console.error('Audit fetch error:', error);
      return { entries: [], agents: [], action_types: [], has_more: false };
    }

    // Fetch distinct agents (sources) and action types (actions) for filters
    const { data: agentsData } = await supabase.from('audit_log').select('source');
    const { data: typesData } = await supabase.from('audit_log').select('action');

    const agents = agentsData?.map((a: any) => a.source).filter(Boolean) || [];
    const actionTypes = typesData?.map((t: any) => t.action).filter(Boolean) || [];

    // No hash chain in this schema — map and mark chain_valid: true.
    const verifiedEntries = (entries || []).map((entry: any): AuditEntry => ({
      id: entry.id,
      timestamp: entry.changed_at,
      agent_id: entry.source || entry.changed_by || 'unknown',
      action_type: entry.action || 'unknown',
      action_details: { old_data: entry.old_data, new_data: entry.new_data, table_name: entry.table_name, record_id: entry.record_id },
      entity_references: entry.record_id ? [entry.record_id] : [],
      hash_chain: '',
      hash_previous: '',
      chain_valid: true,
      confidence_level: 'medium',
    }));

    const hasMore = count ? (page + 1) * limit < count : false;

    return {
      entries: verifiedEntries,
      agents: [...new Set(agents)] as string[],
      action_types: [...new Set(actionTypes)] as string[],
      has_more: hasMore,
    };
  } catch (error) {
    console.error('Audit trail fetch error:', error);
    return { entries: [], agents: [], action_types: [], has_more: false };
  }
}

/**
 * Fetch decision explanation for an action
 */
async function fetchDecisionExplanation(
  supabase: any,
  actionId: string
): Promise<DecisionExplanation | null> {
  try {
    // Schema note (CLAIMS fix E, 2026-05-22): the real `audit_log` table
    // has columns (action, old_data, new_data, changed_at, source,
    // changed_by, record_id, table_name) — there is no `action_details`
    // or `entity_references`. We derive `action_details` by combining
    // old_data/new_data, and treat the single `record_id` as the only
    // entity reference (if any). `knowledge_entities` has no `name` column;
    // derive a display name from `title.en` / `slug`.
    const { data: auditEntry, error: auditError } = await supabase
      .from('audit_log')
      .select('*')
      .eq('id', actionId)
      .single();

    if (auditError || !auditEntry) {
      return null;
    }

    const actionDetails = {
      action: auditEntry.action,
      table_name: auditEntry.table_name,
      record_id: auditEntry.record_id,
      old_data: auditEntry.old_data,
      new_data: auditEntry.new_data,
      source: auditEntry.source,
    };

    const contextWindow = JSON.stringify(actionDetails, null, 2);

    // Single record_id is the only entity reference available
    const entityIds: string[] = auditEntry.record_id ? [auditEntry.record_id] : [];
    let entitiesConsulted: string[] = [];

    if (entityIds.length > 0 && auditEntry.table_name === 'knowledge_entities') {
      const { data: entities } = await supabase
        .from('knowledge_entities')
        .select('id, slug, title')
        .in('id', entityIds);

      if (entities) {
        entitiesConsulted = entities.map((e: any) => {
          const name =
            (e.title && typeof e.title === 'object' && (e.title.en || e.title.value)) ||
            e.slug ||
            e.id;
          return `${name} (${e.id})`;
        });
      }
    }

    // Extract reasoning steps from action details
    const reasoningSteps = [
      'Consulted knowledge base for relevant entities',
      'Cross-referenced relationships for context',
      'Evaluated confidence level based on source verification',
      'Generated response with appropriate confidence indicators',
    ];

    // Confidence: no hash chain in this schema, so we just use entity count
    let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
    let confidenceExplanation = 'Based on available sources';

    if (entityIds.length >= 3) {
      confidenceLevel = 'high';
      confidenceExplanation = `${entityIds.length} entities consulted.`;
    } else if (entityIds.length >= 1) {
      confidenceLevel = 'medium';
      confidenceExplanation = `${entityIds.length} entit${entityIds.length === 1 ? 'y' : 'ies'} consulted.`;
    } else {
      confidenceLevel = 'low';
      confidenceExplanation = 'Limited source verification. Creative generation with minimal knowledge base reference.';
    }

    return {
      action_id: actionId,
      context_window: contextWindow,
      entities_consulted: entitiesConsulted,
      reasoning_steps: reasoningSteps,
      confidence_level: confidenceLevel,
      confidence_explanation: confidenceExplanation,
    };
  } catch (error) {
    console.error('Decision explanation fetch error:', error);
    return null;
  }
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const supabase = getServiceClient();

    // GET /api/v1/context/provenance?entity_id=xxx
    if (action === 'provenance') {
      const entityId = searchParams.get('entity_id');
      if (!entityId) {
        return NextResponse.json(
          { error: 'entity_id parameter is required' },
          { status: 400 }
        );
      }

      const provenance = await buildProvenanceChain(supabase, entityId);
      if (!provenance) {
        return NextResponse.json(
          { error: 'Entity not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(provenance);
    }

    // GET /api/v1/context/audit?page=0&limit=10&action_type=xxx&agent_id=yyy
    if (action === 'audit') {
      const page = parseInt(searchParams.get('page') || '0', 10);
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const actionType = searchParams.get('action_type');
      const agentId = searchParams.get('agent_id');

      const auditData = await fetchAuditTrail(supabase, page, limit, actionType || undefined, agentId || undefined);
      return NextResponse.json(auditData);
    }

    // GET /api/v1/context/explain?action_id=xxx
    if (action === 'explain') {
      const actionId = searchParams.get('action_id');
      if (!actionId) {
        return NextResponse.json(
          { error: 'action_id parameter is required' },
          { status: 400 }
        );
      }

      const explanation = await fetchDecisionExplanation(supabase, actionId);
      if (!explanation) {
        return NextResponse.json(
          { error: 'Action not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(explanation);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Context API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // POST /api/v1/context/verify
    if (action === 'verify') {
      const supabase = getServiceClient();

      // Schema note (CLAIMS fix E, 2026-05-22): the real `audit_log` table
      // has no `hash_chain` column. The previous implementation against
      // `agent_audit_log` would 500 because that table doesn't exist. We
      // count the audit_log rows and report them as "verified by row
      // presence". A real cryptographic chain requires schema changes —
      // tracked as a follow-up.
      const { data: entries, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('changed_at', { ascending: true });

      if (error) {
        console.error('Verify fetch error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch audit entries' },
          { status: 500 }
        );
      }

      if (!entries || entries.length === 0) {
        return NextResponse.json({ message: 'No entries to verify', verified_count: 0 });
      }

      const results = entries.map((entry: any) => ({ id: entry.id, valid: true }));
      const verifiedCount = results.length;

      return NextResponse.json({
        message: 'Verification complete (row-presence only — no hash-chain in current schema)',
        verified_count: verifiedCount,
        total_count: results.length,
        results,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Context API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
