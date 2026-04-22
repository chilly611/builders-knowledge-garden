// RSI Feedback Module Tests

import { describe, it, expect, beforeEach, vi } from "vitest";
import { recordFeedback, recentFeedback } from "../feedback";

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => {
      if (table === "rsi_feedback") {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "test-fb-id-123" },
            error: null,
          }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                id: "fb-001",
                specialist_run_id: "run-001",
                signal: "thumbs_up",
                note: null,
                created_at: "2026-04-22T10:00:00Z",
              },
            ],
            error: null,
          }),
        };
      }
      return {};
    }),
  })),
}));

describe("RSI Feedback Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("recordFeedback inserts a feedback row and returns ID", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const result = await recordFeedback({
      specialistRunId: "run-123",
      userId: "user-456",
      signal: "thumbs_up",
      note: "Good answer",
      context: { jurisdiction: "CA" },
    });

    expect(result.id).toBe("test-fb-id-123");
  });

  it("recordFeedback returns empty ID if client not available", async () => {
    // No env vars set
    const result = await recordFeedback({
      specialistRunId: "run-123",
      signal: "thumbs_down",
    });

    expect(result.id).toBe("");
  });

  it("recentFeedback returns array of feedback rows", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const result = await recentFeedback(100);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].signal).toBe("thumbs_up");
  });

  it("recentFeedback returns empty array if client not available", async () => {
    // No env vars set
    const result = await recentFeedback(100);

    expect(result).toEqual([]);
  });
});
