/**
 * RKG — usage metering + agent-commerce billing hooks.
 *
 * Two jobs:
 *   1. Answer the day-90 RKG checkpoint question — "did any agent actually call
 *      us?" — by recording every tool call to the `mcp_usage` ledger.
 *   2. Stage the per-query / per-transaction billing rails (Coinbase x402, AP2,
 *      etc.) WITHOUT enforcing payment yet: advertise price + metering posture
 *      on every response so agent wallets can discover the cost.
 *
 * Metering must NEVER break a tool call: all writes are best-effort and the
 * `mcp_usage` table is optional — if it doesn't exist, we degrade to the
 * in-process event bus + a one-time console warning.
 */
import { getServiceClient } from "@/lib/supabase";
import { eventBus } from "@/lib/events";
import { RKG_PRICING } from "./registry";
import type { Caller } from "./auth";

export const RKG_USAGE_EVENT = "mcp.rkg_tool_called";

export interface UsageRecord {
  garden: string;
  tool: string;
  tier: Caller["tier"];
  key_id: string;
  label: string;
  ip: string;
  ok: boolean;
  latency_ms: number;
  /** Billable units (default 1 per call; reserved for heavier tools later). */
  units?: number;
}

let warnedNoTable = false;

/** Record one tool call. Best-effort: emits an in-process event always, and
 *  inserts into `mcp_usage` when the table + service key are available. */
export async function recordUsage(rec: UsageRecord): Promise<void> {
  const units = rec.units ?? 1;

  // 1) In-process event — always fires, powers live dashboards / RSI loops.
  try {
    await eventBus.emit(
      RKG_USAGE_EVENT,
      { ...rec, units, indicative_price_usd: units * RKG_PRICING.metered.indicative_unit_price_usd },
      { source: "rkg-mcp" },
    );
  } catch {
    /* never throw from metering */
  }

  // 2) Durable ledger — optional, best-effort.
  try {
    const svc = getServiceClient();
    const { error } = await svc.from("mcp_usage").insert({
      garden: rec.garden,
      tool: rec.tool,
      tier: rec.tier,
      key_id: rec.key_id,
      label: rec.label,
      ip: rec.ip,
      ok: rec.ok,
      latency_ms: rec.latency_ms,
      units,
    });
    if (error && !warnedNoTable) {
      warnedNoTable = true;
      console.warn(
        `[rkg-metering] usage ledger write skipped (${error.message}). ` +
          "Apply supabase/migrations/*_mcp_usage.sql to enable durable metering.",
      );
    }
  } catch {
    /* never throw from metering */
  }
}

/** Headers that advertise the metering / billing posture on every MCP response.
 *  Honours the emerging x402 discovery pattern without enforcing payment yet. */
export function billingHeaders(caller: Caller): Record<string, string> {
  const metered = caller.tier === "metered";
  return {
    "X-RKG-Tier": caller.tier,
    "X-RKG-Metered": metered ? "true" : "false",
    // Per-call price agents/wallets can plan against (USD). Not charged yet.
    "X-RKG-Unit-Price-USD": String(RKG_PRICING.metered.indicative_unit_price_usd),
    // Rails we intend to settle over; see docs/rkg/agent-commerce-readiness.md.
    "X-RKG-Payment-Rails": "x402,ap2",
    // Discovery: agents that hit a paywall later can read terms here.
    "X-RKG-Pricing": "/api/gardens#pricing",
  };
}

/** Read a light usage summary from the ledger (for the directory / health).
 *  Returns null if the ledger is unavailable. */
export async function getUsageSummary(
  garden?: string,
): Promise<{ total_calls: number; since: string | null } | null> {
  try {
    const svc = getServiceClient();
    let q = svc.from("mcp_usage").select("*", { count: "exact", head: true });
    if (garden) q = q.eq("garden", garden);
    const { count, error } = await q;
    if (error) return null;
    return { total_calls: count ?? 0, since: null };
  } catch {
    return null;
  }
}
