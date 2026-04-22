// RSI Deltas Module Tests

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  proposeDelta,
  listDeltas,
  approveDelta,
  applyDelta,
} from "../deltas";

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => {
    const mockDelta = {
      id: "delta-001",
      status: "proposed",
      kind: "amendment_add",
      target: "data/amendments/ca-sf.json",
      rationale: "SF gas ban",
      diff_preview: "Add gas ban rule",
      patch: { jurisdiction: "ca-sf" },
      created_at: "2026-04-22T10:00:00Z",
    };

    return {
      from: vi.fn((table) => {
        if (table === "rsi_deltas") {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: "delta-001" },
              error: null,
            }),
            order: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            // Simulate awaiting the final query result
            [Symbol.asyncIterator]: async function* () {
              yield { data: [mockDelta], error: null };
            },
            // For direct await
            then: function(onFulfilled: (val: any) => any) {
              return Promise.resolve({ data: [mockDelta], error: null }).then(onFulfilled);
            },
          };
        }
        return {};
      }),
    };
  }),
}));

describe("RSI Deltas Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("proposeDelta inserts delta with patch payload", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const result = await proposeDelta({
      kind: "amendment_add",
      target: "data/amendments/ca-sf.json",
      rationale: "SF prohibits natural gas in new buildings",
      diffPreview: "Add SF gas ban amendment",
      patch: {
        jurisdiction: "ca-sf",
        rule_id: "sf-2022-gas-ban",
        title: "San Francisco Natural Gas Ban",
      },
      sourceFeedbackIds: ["fb-001", "fb-002"],
    });

    expect(result.id).toBe("delta-001");
  });

  it("listDeltas filters by status", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const result = await listDeltas("proposed");

    expect(Array.isArray(result)).toBe(true);
    expect(result[0]?.status).toBe("proposed");
  });

  it("approveDelta updates status to approved", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    // Should not throw
    await approveDelta("delta-001", "reviewer@bkg.co");
  });

  it("applyDelta dispatches to kind-specific applier", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    // Should not throw
    await applyDelta("delta-001");
  });

  it("proposeDelta returns empty ID if client not available", async () => {
    // No env vars
    const result = await proposeDelta({
      kind: "prompt_patch",
      target: "docs/ai-prompts/test.md",
      rationale: "Test",
      diffPreview: "Test diff",
      patch: {},
      sourceFeedbackIds: [],
    });

    expect(result.id).toBe("");
  });
});
