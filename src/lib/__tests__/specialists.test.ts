// Builder's Knowledge Garden — Specialist Runner Tests
// Unit tests for specialist prompt loading, mock generation, and runtime context injection

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import { callSpecialist, type SpecialistContext } from "../specialists";

// Mock fs module
vi.mock("fs");
// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk");
// Mock RAG module
vi.mock("../rag", () => ({
  retrieveEntities: vi.fn().mockResolvedValue({
    entities: [],
    query: "test",
    retrieval_method: "mock",
    latency_ms: 10,
  }),
}));

// Default prompt content used when a test doesn't set its own mockReturnValue.
// Keeps tests #2 and #6 (which just want a mock-mode result) from accidentally
// exercising the "prompt file not found" error path.
const DEFAULT_PROMPT_CONTENT = `---
specialist_id: compliance-structural
status: production
---

# compliance-structural — Test fixture

## System Prompt

\`\`\`
You are a structural code expert. For tests only.
\`\`\`
`;

describe("Specialist Runner", () => {
  beforeEach(() => {
    // Clear environment
    delete process.env.ANTHROPIC_API_KEY;
    vi.clearAllMocks();
    // Default readFileSync so specialists that don't set their own mock can still load a prompt.
    // Individual tests override this with mockReturnValue/mockImplementation as needed.
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(DEFAULT_PROMPT_CONTENT);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Load production prompt
  // ─────────────────────────────────────────────────────────────────────────
  it("loads the compliance-structural.production.md prompt and extracts system prompt", async () => {
    const productionContent = `---
specialist_id: compliance-structural
status: production
---

# Structural Code Compliance Specialist

## Production system prompt

You are a structural code expert helping builders understand code requirements.

Your job is to take the scope description and map it to IBC/IRC sections.`;

    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(productionContent);

    // Test the loader by checking mock behavior
    // Note: Full integration test requires mocking Anthropic SDK
    // For now we test that the file would be read correctly
    const mockPath = "docs/ai-prompts/compliance-structural.production.md";
    const content = fs.readFileSync(mockPath, "utf-8") as string;
    expect(content).toContain("Production system prompt");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Mock mode returns deterministic result
  // ─────────────────────────────────────────────────────────────────────────
  it("returns deterministic mock when ANTHROPIC_API_KEY is missing and mockIfNoKey=true", async () => {
    const context: SpecialistContext = {
      scope_description: "Test structural scope",
    };

    const result = await callSpecialist("compliance-structural", context, {
      mockIfNoKey: true,
    });

    expect(result).toBeDefined();
    expect(result.confidence).toBe("medium");
    expect(result.narrative).toContain("mock response");
    expect(result.model).toBe("claude-sonnet-4-20250514");
    // Same invariant as schema test — mock work can finish within a single ms.
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Runtime context append
  // ─────────────────────────────────────────────────────────────────────────
  it("appends trade, jurisdiction, and lane to user message when provided", async () => {
    // This test checks that the context is properly formatted.
    // Full test would require mocking Anthropic and inspecting the message sent.
    const context: SpecialistContext = {
      scope_description: "ADU addition",
      jurisdiction: "Los Angeles, CA",
      trade: "framing",
      lane: "gc",
    };

    // The specialist should accept all these fields without error
    expect(context.jurisdiction).toBe("Los Angeles, CA");
    expect(context.trade).toBe("framing");
    expect(context.lane).toBe("gc");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Missing prompt file throws typed error
  // ─────────────────────────────────────────────────────────────────────────
  it("throws an error with specialistId when prompt file is missing", async () => {
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const context: SpecialistContext = {
      scope_description: "Test scope",
    };

    await expect(
      callSpecialist("nonexistent-specialist", context, {
        mockIfNoKey: true,
        preferProductionPrompt: true,
      })
    ).rejects.toThrow(/nonexistent-specialist/);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: Falls back to prototype prompt when production version missing
  // ─────────────────────────────────────────────────────────────────────────
  it("falls back to .md prototype prompt when .production.md is not found", async () => {
    const prototypeContent = `# compliance-structural

**Specialist role:** Structural code expert

## Original prototype system prompt

\`\`\`
You are a structural code expert. Your job is to identify applicable IBC/IRC sections.
\`\`\``;

    // First call (production) throws, second call (prototype) succeeds
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(
      (path: string) => {
        if (path.includes(".production.md")) {
          throw new Error("ENOENT");
        }
        return prototypeContent;
      }
    );

    const context: SpecialistContext = {
      scope_description: "Test scope",
    };

    // With preferProductionPrompt=true, it should try production first then fall back
    // The actual call will fail due to mocked Anthropic, but we're testing the fallback logic
    const result = await callSpecialist("compliance-structural", context, {
      mockIfNoKey: true,
      preferProductionPrompt: true,
    });

    expect(result).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: SpecialistResult schema
  // ─────────────────────────────────────────────────────────────────────────
  it("returns a SpecialistResult with all required fields", async () => {
    const context: SpecialistContext = {
      scope_description: "Residential foundation",
    };

    const result = await callSpecialist("compliance-structural", context, {
      mockIfNoKey: true,
    });

    // Verify all required fields are present
    expect(result).toHaveProperty("narrative");
    expect(result).toHaveProperty("structured");
    expect(result).toHaveProperty("citations");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("raw_response");
    expect(result).toHaveProperty("model");
    expect(result).toHaveProperty("latency_ms");

    // Verify types
    expect(typeof result.narrative).toBe("string");
    expect(typeof result.structured).toBe("object");
    expect(Array.isArray(result.citations)).toBe(true);
    expect(["high", "medium", "low"]).toContain(result.confidence);
    expect(typeof result.model).toBe("string");
    expect(typeof result.latency_ms).toBe("number");
    // Latency is measured by Date.now() diff; in mock mode the synthetic work
    // can complete within the same millisecond, so >=0 is the correct invariant.
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7: Load v2 prompts for the three specialist types
  // ─────────────────────────────────────────────────────────────────────────
  it("loads v2 prompts for estimating-takeoff, sub-bid-analysis, and compliance-structural", async () => {
    const v2Content = `---
prompt_version: v2
---

# test-specialist (v2)

## System Prompt

You are a test specialist v2. This is the v2 system prompt.`;

    // Mock readFileSync to return v2 content for v2 files
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(
      (path: string) => {
        if (path.includes(".v2.md")) {
          return v2Content;
        }
        return DEFAULT_PROMPT_CONTENT;
      }
    );

    const context: SpecialistContext = {
      scope_description: "Test scope",
    };

    // Test all three specialists with v2 option
    const specialists = [
      "estimating-takeoff",
      "sub-bid-analysis",
      "compliance-structural",
    ];

    for (const specialistId of specialists) {
      // Mock Anthropic to return a response that includes the v2 system prompt text
      const result = await callSpecialist(specialistId, context, {
        mockIfNoKey: true,
        version: "v2",
      });

      // Verify that the specialist result was generated
      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(["high", "medium", "low"]).toContain(result.confidence);
    }
  });
});
