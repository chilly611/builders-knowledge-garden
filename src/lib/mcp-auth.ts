import { getServiceClient } from '@/lib/supabase';
import bcryptjs from 'bcryptjs';

const supabase = getServiceClient();

// Type definitions
export interface AuthenticatedAgent {
  id: string;
  name: string;
  owner_user_id: string;
  autonomy_mode: 'watch' | 'assist' | 'autonomous';
  permissions: string[];
  rate_limit_per_hour: number;
}

interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

const DEFAULT_RATE_LIMIT_PER_HOUR = 1000;

/**
 * Authenticate an agent based on the Authorization header.
 * Expected format: Authorization: Bearer bkg_agent_xxx
 *
 * Returns the authenticated agent or null if authentication fails.
 */
export async function authenticateAgent(request: Request): Promise<AuthenticatedAgent | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const providedKey = authHeader.slice(7);

    // Validate key format
    if (!providedKey.startsWith('bkg_agent_') || providedKey.length !== 42) {
      return null;
    }

    // Fetch all agents and check keys (bcrypt comparison required)
    const { data: agents, error } = await supabase
      .from('agent_identities')
      .select('id, name, owner_user_id, autonomy_mode, permissions, active, api_key_hash')
      .eq('active', true);

    if (error) {
      console.error('Error fetching agents:', error);
      return null;
    }

    if (!agents || agents.length === 0) {
      return null;
    }

    // Find matching agent by comparing hashed key
    for (const agent of agents) {
      const isMatch = await bcryptjs.compare(providedKey, agent.api_key_hash);
      if (isMatch) {
        return {
          id: agent.id,
          name: agent.name,
          owner_user_id: agent.owner_user_id,
          autonomy_mode: agent.autonomy_mode,
          permissions: agent.permissions || [],
          rate_limit_per_hour: DEFAULT_RATE_LIMIT_PER_HOUR,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('authenticateAgent error:', error);
    return null;
  }
}

/**
 * Check if an agent is authorized to use a specific tool.
 * Returns { allowed: true/false, reason?: string }
 */
export async function authorizeToolUse(
  agent: AuthenticatedAgent,
  toolName: string
): Promise<AuthorizationResult> {
  try {
    // Check if tool is in agent's permissions
    if (!agent.permissions.includes(toolName)) {
      return {
        allowed: false,
        reason: `Agent '${agent.name}' does not have permission to use tool '${toolName}'`,
      };
    }

    // Additional validation for 'assist' mode: ensure human review is flagged elsewhere
    if (agent.autonomy_mode === 'assist') {
      // This is a logical check only; the actual flagging happens in the MCP route
      console.log(`[ASSIST MODE] Tool '${toolName}' invoked by agent '${agent.name}' — flagging for human review`);
    }

    return { allowed: true };
  } catch (error) {
    console.error('authorizeToolUse error:', error);
    return {
      allowed: false,
      reason: 'Authorization check failed',
    };
  }
}

/**
 * Log an agent's action to the audit trail.
 * Records: agent_id, action, tool_name, input_summary, output_summary, duration_ms, timestamp
 */
export async function logAgentAction(
  agent: AuthenticatedAgent,
  action: string,
  toolName: string,
  inputSummary: string,
  outputSummary: string,
  durationMs: number
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();

    const { error } = await supabase.from('agent_audit_logs').insert({
      agent_id: agent.id,
      agent_name: agent.name,
      owner_user_id: agent.owner_user_id,
      action: action,
      tool_name: toolName,
      autonomy_mode: agent.autonomy_mode,
      input_summary: inputSummary,
      output_summary: outputSummary,
      duration_ms: durationMs,
      timestamp: timestamp,
    });

    if (error) {
      console.error('Error logging agent action:', error);
    }
  } catch (error) {
    console.error('logAgentAction error:', error);
  }
}

/**
 * Check if an agent has exceeded its rate limit (actions per hour).
 * Counts recent actions in the agent_audit_logs table for the last hour.
 *
 * Returns:
 * {
 *   allowed: boolean,
 *   remaining: number (of actions remaining this hour),
 *   reset_at: string (ISO timestamp when limit resets)
 * }
 */
export async function checkRateLimit(agent: AuthenticatedAgent): Promise<RateLimitResult> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const resetAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { data: logs, error } = await supabase
      .from('agent_audit_logs')
      .select('id', { count: 'exact' })
      .eq('agent_id', agent.id)
      .gte('timestamp', oneHourAgo);

    if (error) {
      console.error('Error checking rate limit:', error);
      // Default to allowing on error (fail open)
      return {
        allowed: true,
        remaining: agent.rate_limit_per_hour,
        reset_at: resetAt,
      };
    }

    const actionCount = logs?.length || 0;
    const remaining = Math.max(0, agent.rate_limit_per_hour - actionCount);
    const allowed = actionCount < agent.rate_limit_per_hour;

    return {
      allowed,
      remaining,
      reset_at: resetAt,
    };
  } catch (error) {
    console.error('checkRateLimit error:', error);
    // Fail open: allow the request
    return {
      allowed: true,
      remaining: agent.rate_limit_per_hour,
      reset_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }
}

/**
 * Comprehensive middleware function to authenticate and validate an agent request.
 * Returns the agent, rate limit check result, or error information.
 */
export async function validateAgentRequest(request: Request): Promise<{
  success: boolean;
  agent?: AuthenticatedAgent;
  rateLimit?: RateLimitResult;
  error?: string;
  status?: number;
}> {
  try {
    // Step 1: Authenticate the agent
    const agent = await authenticateAgent(request);
    if (!agent) {
      return {
        success: false,
        error: 'Invalid or missing agent credentials',
        status: 401,
      };
    }

    // Step 2: Check rate limit
    const rateLimit = await checkRateLimit(agent);
    if (!rateLimit.allowed) {
      return {
        success: false,
        agent,
        rateLimit,
        error: `Rate limit exceeded. Remaining actions: ${rateLimit.remaining}/${agent.rate_limit_per_hour}. Resets at ${rateLimit.reset_at}`,
        status: 429,
      };
    }

    return {
      success: true,
      agent,
      rateLimit,
    };
  } catch (error) {
    console.error('validateAgentRequest error:', error);
    return {
      success: false,
      error: 'Internal validation error',
      status: 500,
    };
  }
}

/**
 * Helper: Format a tool result summary for audit logging.
 * Truncates to 500 characters to keep logs manageable.
 */
export function summarizeOutput(data: any, maxLength: number = 500): string {
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
  } catch {
    return '[Unable to serialize output]';
  }
}

/**
 * Helper: Format tool input summary for audit logging.
 * Truncates to 300 characters.
 */
export function summarizeInput(data: any, maxLength: number = 300): string {
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
  } catch {
    return '[Unable to serialize input]';
  }
}
