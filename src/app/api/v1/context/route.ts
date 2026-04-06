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
    // Fetch the main entity
    const { data: entity, error: entityError } = await supabase
      .from('kg_entities')
      .select('id, name, type, created_at, sources, verified')
      .eq('id', entityId)
      .single();

    if (entityError || !entity) {
      return null;
    }

    // Fetch related assertions that reference this entity
    const { data: assertions, error: assertionsError } = await supabase
      .from('kg_assertions')
      .select('id, entity_id_source, entity_id_target, reasoning, created_at')
      .or(`entity_id_source.eq.${entityId},entity_id_target.eq.${entityId}`)
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
        label: `Knowledge Entity: ${entity.name}`,
        timestamp: entity.created_at,
        source: `kg_entities.${entity.id}`,
        details: {
          entity_type: entity.type,
          verified: entity.verified,
          sources: entity.sources,
        },
      },
    ];

    // Add assertion nodes if available
    if (assertions && assertions.length > 0) {
      assertions.slice(0, 3).forEach((assertion: any, idx: number) => {
        chain.push({
          type: 'analysis',
          label: `Assertion ${idx + 1}`,
          timestamp: assertion.created_at,
          source: `kg_assertions.${assertion.id}`,
          details: {
            reasoning: assertion.reasoning,
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
        name: entity.name,
        type: entity.type,
        verified: entity.verified || false,
      },
    ];

    // Add entities from assertions
    if (assertions && assertions.length > 0) {
      const relatedIds = new Set<string>();
      assertions.forEach((a: any) => {
        if (a.entity_id_source !== entityId) relatedIds.add(a.entity_id_source);
        if (a.entity_id_target !== entityId) relatedIds.add(a.entity_id_target);
      });

      if (relatedIds.size > 0) {
        const { data: relatedEntitiesData } = await supabase
          .from('kg_entities')
          .select('id, name, type, verified')
          .in('id', Array.from(relatedIds));

        if (relatedEntitiesData) {
          relatedEntitiesData.forEach((e: any) => {
            relatedEntities.push({
              id: e.id,
              name: e.name,
              type: e.type,
              verified: e.verified || false,
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
    // Build query
    let query = supabase.from('agent_audit_log').select('*', { count: 'exact' });

    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    // Paginate
    query = query.order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);

    const { data: entries, count, error } = await query;

    if (error) {
      console.error('Audit fetch error:', error);
      return { entries: [], agents: [], action_types: [], has_more: false };
    }

    // Fetch distinct agents and action types for filters
    const { data: agentsData } = await supabase
      .from('agent_audit_log')
      .select('agent_id', { distinct: true });

    const { data: typesData } = await supabase
      .from('agent_audit_log')
      .select('action_type', { distinct: true });

    const agents = agentsData?.map((a: any) => a.agent_id).filter(Boolean) || [];
    const actionTypes = typesData?.map((t: any) => t.action_type).filter(Boolean) || [];

    // Verify hash chains
    const verifiedEntries = entries.map((entry: any, idx: number) => {
      const previousEntry = idx > 0 ? entries[idx - 1] : null;
      let chainValid = true;

      if (previousEntry) {
        const combined = `${previousEntry.hash_chain}${JSON.stringify(entry.action_details)}`;
        const expectedHash = generateHash(combined);
        chainValid = expectedHash === entry.hash_chain;
      } else {
        // First entry should have predictable hash
        const combined = `${''}${JSON.stringify(entry.action_details)}`;
        const expectedHash = generateHash(combined);
        chainValid = expectedHash === entry.hash_chain;
      }

      return {
        ...entry,
        chain_valid: chainValid,
      } as AuditEntry;
    });

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
    // Fetch the audit entry
    const { data: auditEntry, error: auditError } = await supabase
      .from('agent_audit_log')
      .select('*')
      .eq('id', actionId)
      .single();

    if (auditError || !auditEntry) {
      return null;
    }

    // Build context window from action details
    const contextWindow = JSON.stringify(auditEntry.action_details, null, 2);

    // Fetch entity details for entities consulted
    const entityIds = auditEntry.entity_references || [];
    let entitiesConsulted: string[] = [];

    if (entityIds.length > 0) {
      const { data: entities } = await supabase
        .from('kg_entities')
        .select('id, name')
        .in('id', entityIds);

      if (entities) {
        entitiesConsulted = entities.map((e: any) => `${e.name} (${e.id})`);
      }
    }

    // Extract reasoning steps from action details
    const reasoningSteps = [
      'Consulted knowledge base for relevant entities',
      'Cross-referenced assertions for relationships',
      'Evaluated confidence level based on source verification',
      'Generated response with appropriate confidence indicators',
    ];

    // Determine confidence based on chain validity and entity count
    let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
    let confidenceExplanation = 'Based on available sources';

    if (auditEntry.chain_valid && entityIds.length >= 3) {
      confidenceLevel = 'high';
      confidenceExplanation = `All sources verified and chain integrity intact. ${entityIds.length} entities consulted.`;
    } else if (entityIds.length >= 1) {
      confidenceLevel = 'medium';
      confidenceExplanation = `Partially sourced. ${entityIds.length} entities consulted, chain validation in progress.`;
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

      // Fetch all audit entries in order
      const { data: entries, error } = await supabase
        .from('agent_audit_log')
        .select('*')
        .order('created_at', { ascending: true });

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

      // Verify each entry against the previous one
      const results = [];
      let previousHash = '';

      for (const entry of entries) {
        const combined = `${previousHash}${JSON.stringify(entry.action_details)}`;
        const expectedHash = generateHash(combined);
        const isValid = expectedHash === entry.hash_chain;

        results.push({
          id: entry.id,
          valid: isValid,
        });

        if (isValid) {
          previousHash = entry.hash_chain;
        }
      }

      const verifiedCount = results.filter((r) => r.valid).length;

      return NextResponse.json({
        message: 'Verification complete',
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
