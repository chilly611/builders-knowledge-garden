// Builder's Knowledge Garden — Event Bus
// In-process pub/sub for module communication + RSI signal collection
// Architecture doc says: "Everything emits events. Events trigger downstream reactions."
// Start in-process, extract to NATS JetStream when needed.

type EventHandler = (payload: EventPayload) => void | Promise<void>;

export interface EventPayload {
  type: string;
  source: string;
  timestamp: string;
  data: Record<string, unknown>;
  userId?: string;
  orgId?: string;
  sessionId?: string;
}

// ─── EVENT TYPES ───
// Naming convention: module.action (e.g., "search.query", "copilot.response", "project.created")
export const EVENT_TYPES = {
  // Search signals (RSI Loop 2)
  SEARCH_QUERY: "search.query",
  SEARCH_CLICK: "search.click",
  SEARCH_SAVE: "search.save",
  SEARCH_REFINE: "search.refine",

  // Copilot signals (RSI Loop 5)
  COPILOT_QUERY: "copilot.query",
  COPILOT_RESPONSE: "copilot.response",
  COPILOT_FEEDBACK: "copilot.feedback",
  COPILOT_CITATION: "copilot.citation",

  // Project signals
  PROJECT_CREATED: "project.created",
  PROJECT_PHASE_CHANGED: "project.phase_changed",
  PROJECT_CODE_REVIEWED: "project.code_reviewed",

  // MCP signals
  MCP_TOOL_CALLED: "mcp.tool_called",

  // Auth signals
  AUTH_LOGIN: "auth.login",
  AUTH_UPGRADE: "auth.upgrade",

  // Knowledge signals (RSI Loop 1)
  KNOWLEDGE_ENTITY_VIEWED: "knowledge.entity_viewed",
  KNOWLEDGE_GAP_DETECTED: "knowledge.gap_detected",

  // Compliance signals (RSI Loop 4)
  COMPLIANCE_CHECK: "compliance.check",
  COMPLIANCE_OVERRIDE: "compliance.override",
} as const;

// ─── BUS IMPLEMENTATION ───
class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private eventLog: EventPayload[] = [];
  private maxLogSize = 10000;

  on(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    // Return unsubscribe function
    return () => this.handlers.get(type)?.delete(handler);
  }

  // Subscribe to all events matching a prefix (e.g., "search.*")
  onPrefix(prefix: string, handler: EventHandler): () => void {
    const wrappedHandler: EventHandler = (payload) => {
      if (payload.type.startsWith(prefix.replace("*", ""))) {
        handler(payload);
      }
    };
    return this.on("__all__", wrappedHandler);
  }

  async emit(type: string, data: Record<string, unknown>, meta?: Partial<EventPayload>): Promise<void> {
    const payload: EventPayload = {
      type,
      source: meta?.source || "unknown",
      timestamp: new Date().toISOString(),
      data,
      userId: meta?.userId,
      orgId: meta?.orgId,
      sessionId: meta?.sessionId,
    };

    // Log for RSI (even before loops are active)
    this.eventLog.push(payload);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize / 2);
    }

    // Notify specific handlers
    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try { await handler(payload); }
        catch (err) { console.error(`Event handler error for ${type}:`, err); }
      }
    }

    // Notify wildcard handlers
    const allHandlers = this.handlers.get("__all__");
    if (allHandlers) {
      for (const handler of allHandlers) {
        try { await handler(payload); }
        catch (err) { console.error(`Wildcard handler error:`, err); }
      }
    }
  }

  // Get recent events (for RSI loops and debugging)
  getRecentEvents(type?: string, limit = 100): EventPayload[] {
    const events = type
      ? this.eventLog.filter(e => e.type === type || e.type.startsWith(type.replace("*", "")))
      : this.eventLog;
    return events.slice(-limit);
  }

  // Get event counts by type (for dashboards)
  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of this.eventLog) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
    return counts;
  }

  // Clear log (for testing)
  clear(): void {
    this.eventLog = [];
  }
}

// Singleton instance
export const eventBus = new EventBus();

// ─── CONVENIENCE EMITTERS ───
// Use these in API routes and UI components

export function emitSearchSignal(data: {
  query: string;
  results_count: number;
  jurisdiction?: string;
  domain?: string;
}) {
  return eventBus.emit(EVENT_TYPES.SEARCH_QUERY, data, { source: "search-api" });
}

export function emitCopilotSignal(data: {
  query: string;
  entities_retrieved: string[];
  entities_cited: string[];
  prompt_version: string;
  model: string;
  latency_ms: number;
}) {
  return eventBus.emit(EVENT_TYPES.COPILOT_QUERY, data, { source: "copilot-api" });
}

export function emitMCPSignal(data: {
  tool: string;
  parameters: Record<string, unknown>;
  latency_ms: number;
}) {
  return eventBus.emit(EVENT_TYPES.MCP_TOOL_CALLED, data, { source: "mcp-api" });
}
