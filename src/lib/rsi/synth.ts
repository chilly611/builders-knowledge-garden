// RSI Synthesis Engine
// Clusters feedback + specialist runs and proposes deltas via LLM

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { recentFeedback } from "./feedback";
import { proposeDelta } from "./deltas";
import type { Database } from "@/types/database";

function getRSIClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  try {
    return createClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    });
  } catch {
    return null;
  }
}

interface SpecialistRunRow {
  id: string;
  specialist_id: string;
  input_json?: Record<string, unknown> | null;
  output_json?: Record<string, unknown> | null;
  created_at: string;
}

interface FeedbackCluster {
  specialist: string;
  feedbackIds: string[];
  keywords: string[];
  signal: string;
  runIds: string[];
}

/**
 * Synthesize proposed deltas from recent feedback.
 * Pulls feedback and specialist runs since sinceIso, clusters by specialist + keywords,
 * calls LLM to propose one delta per cluster, inserts proposed deltas.
 */
export async function synthesizeDeltas(sinceIso: string): Promise<{ proposed: number }> {
  const client = getRSIClient();
  if (!client) {
    return { proposed: 0 };
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  if (!process.env.ANTHROPIC_API_KEY) {
    console.debug("[RSI Synth] ANTHROPIC_API_KEY not set, skipping synthesis");
    return { proposed: 0 };
  }

  try {
    // 1. Fetch recent feedback
    const feedback = await recentFeedback(500);
    const recentFb = feedback.filter(
      (f) => new Date(f.created_at) >= new Date(sinceIso)
    );

    if (recentFb.length === 0) {
      return { proposed: 0 };
    }

    // 2. Fetch specialist runs referenced by feedback
    const runIds = recentFb.map((f) => f.specialist_run_id).filter(Boolean);
    const { data: runs, error: runsError } = await client
      .from("specialist_runs")
      .select("*")
      .in("id", runIds)
      .limit(500);

    if (runsError) {
      console.debug("[RSI Synth] runs fetch error:", runsError);
      return { proposed: 0 };
    }

    const runsBySpecialist = new Map<string, SpecialistRunRow[]>();
    for (const run of runs || []) {
      const specialist = (run as any).specialist_id;
      if (!runsBySpecialist.has(specialist)) {
        runsBySpecialist.set(specialist, []);
      }
      runsBySpecialist.get(specialist)!.push(run as unknown as SpecialistRunRow);
    }

    // 3. Cluster feedback by specialist + signal
    const clusters: FeedbackCluster[] = [];
    for (const specialist of runsBySpecialist.keys()) {
      const fbForSpecialist = recentFb.filter((f) => {
        const run = runs?.find((r) => (r as any).id === f.specialist_run_id);
        return run && (run as any).specialist_id === specialist;
      });

      // Group by signal type
      const bySignal = new Map<string, typeof fbForSpecialist>();
      for (const f of fbForSpecialist) {
        if (!bySignal.has(f.signal)) {
          bySignal.set(f.signal, []);
        }
        bySignal.get(f.signal)!.push(f);
      }

      for (const [signal, group] of bySignal.entries()) {
        if (group.length > 0) {
          const keywords = extractKeywords(group);
          clusters.push({
            specialist,
            feedbackIds: group.map((f) => f.id),
            keywords,
            signal,
            runIds: group.map((f) => f.specialist_run_id).filter(Boolean),
          });
        }
      }
    }

    // 4. For each cluster, call LLM to synthesize a delta
    let proposedCount = 0;
    for (const cluster of clusters) {
      const clusterRuns = runs?.filter((r) =>
        cluster.runIds.includes((r as any).id)
      ) || [];

      const synthPrompt = buildSynthesisPrompt(cluster, clusterRuns as unknown as SpecialistRunRow[]);

      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: synthPrompt,
            },
          ],
        });

        const text =
          response.content[0].type === "text" ? response.content[0].text : "";
        const delta = parseSynthesisResponse(text, cluster);

        if (delta) {
          const result = await proposeDelta(delta);
          if (result.id) {
            proposedCount++;
          }
        }
      } catch (err) {
        console.debug("[RSI Synth] LLM call failed for cluster:", cluster, err);
      }
    }

    return { proposed: proposedCount };
  } catch (err) {
    console.debug("[RSI Synth] synthesis error:", err);
    return { proposed: 0 };
  }
}

/**
 * Extract keywords from feedback group (from notes and context).
 */
function extractKeywords(feedback: Array<{ note?: string | null; context?: Record<string, unknown> | null }>): string[] {
  const keywords: string[] = [];
  for (const f of feedback) {
    if (f.note) {
      keywords.push(...f.note.split(/\s+/).slice(0, 5));
    }
    if (f.context && typeof f.context === 'object') {
      const contextStr = JSON.stringify(f.context);
      keywords.push(...contextStr.split(/\s+/).slice(0, 5));
    }
  }
  return [...new Set(keywords)].slice(0, 10);
}

/**
 * Build the synthesis prompt for the LLM.
 */
function buildSynthesisPrompt(
  cluster: FeedbackCluster,
  runs: SpecialistRunRow[]
): string {
  const runSummaries = runs
    .map((r) => {
      const input = r.input_json ? JSON.stringify(r.input_json).slice(0, 200) : "unknown";
      const output = r.output_json ? JSON.stringify(r.output_json).slice(0, 200) : "unknown";
      return `Run ${r.id.slice(0, 8)}: Input="${input}" Output="${output}"`;
    })
    .join("\n");

  return `You are BKG's self-improvement synthesizer. You look at specialist run outcomes + user corrections and propose ONE concrete, reviewable delta per cluster.

**Cluster Data:**
- Specialist: ${cluster.specialist}
- Signal: ${cluster.signal} (count: ${cluster.feedbackIds.length})
- Keywords: ${cluster.keywords.join(", ")}
- Feedback IDs: ${cluster.feedbackIds.slice(0, 5).join(", ")}
- Sample runs:
${runSummaries}

**Task:** Propose ONE delta (kind in: prompt_patch, entity_add, entity_update, amendment_add, specialist_tool_tweak).

Return ONLY valid JSON with no markdown or extra text:
{
  "kind": "prompt_patch" | "entity_add" | "entity_update" | "amendment_add" | "specialist_tool_tweak",
  "target": "path/to/file.md or entity_id",
  "rationale": "Why this delta fixes the cluster",
  "diffPreview": "Human-readable summary of the change",
  "patch": { /* machine-applicable payload */ }
}`;
}

/**
 * Parse LLM response into a delta proposal.
 */
function parseSynthesisResponse(
  text: string,
  cluster: FeedbackCluster
): Parameters<typeof proposeDelta>[0] | null {
  try {
    const json = JSON.parse(text);
    if (!json.kind || !json.target || !json.rationale || !json.diffPreview) {
      return null;
    }

    return {
      kind: json.kind,
      target: json.target,
      rationale: json.rationale,
      diffPreview: json.diffPreview,
      patch: json.patch || {},
      sourceFeedbackIds: cluster.feedbackIds,
    };
  } catch {
    return null;
  }
}
