// Builder's Knowledge Garden — WorkflowRenderer Smoke Test
//
// These tests verify the contract between workflows.json and the renderer types.
// We don't render React here (no jsdom dependency) — that's intentional. The renderer
// is a pure shape wrapper over StepCard; if the input shape contract holds, the
// render tree follows by composition.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { Workflow } from "../WorkflowRenderer.types";
import type { StepType } from "../StepCard.types";

interface WorkflowsJson {
  workflows: Workflow[];
  metadata?: Record<string, unknown>;
}

function loadWorkflows(): WorkflowsJson {
  const path = resolve(process.cwd(), "app/docs/workflows.json");
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as WorkflowsJson;
}

describe("WorkflowRenderer contract", () => {
  const VALID_STEP_TYPES: StepType[] = [
    "text_input",
    "voice_input",
    "number_input",
    "location_input",
    "multi_select",
    "select",
    "file_upload",
    "template_chooser",
    "checklist",
    "analysis_result",
  ];

  it("loads q5 Code Compliance Lookup from workflows.json", () => {
    const { workflows } = loadWorkflows();
    const q5 = workflows.find((w) => w.id === "q5");
    expect(q5, "q5 must exist in workflows.json for the code-compliance route").toBeDefined();
    expect(q5?.label).toBe("Code Compliance Lookup");
    expect(q5?.steps.length).toBeGreaterThanOrEqual(4);
  });

  it("q5 includes both analysis_result steps wired to production prompts", () => {
    const { workflows } = loadWorkflows();
    const q5 = workflows.find((w) => w.id === "q5")!;
    const analysisSteps = q5.steps.filter((s) => s.type === "analysis_result");
    expect(analysisSteps.length).toBe(2);
    const promptIds = analysisSteps.map((s) => s.promptId).sort();
    expect(promptIds).toEqual(["compliance-electrical", "compliance-structural"]);
  });

  it("every q5 step has a valid StepType recognized by StepCard", () => {
    const { workflows } = loadWorkflows();
    const q5 = workflows.find((w) => w.id === "q5")!;
    for (const step of q5.steps) {
      expect(
        VALID_STEP_TYPES,
        `step ${step.id} has unknown type ${step.type}`
      ).toContain(step.type);
    }
  });

  it("every analysis_result step across all workflows either has promptId or is documented orphan", () => {
    const { workflows } = loadWorkflows();
    const orphans: Array<{ workflowId: string; stepId: string }> = [];
    let withPrompt = 0;
    for (const wf of workflows) {
      for (const step of wf.steps) {
        if (step.type !== "analysis_result") continue;
        if (step.promptId) {
          withPrompt++;
        } else {
          orphans.push({ workflowId: wf.id, stepId: step.id });
        }
      }
    }
    // Extraction report asserts 23 of 27 analysis steps have promptId; 4 orphans.
    expect(withPrompt).toBeGreaterThanOrEqual(23);
    expect(orphans.length).toBeLessThanOrEqual(4);
  });

  it("workflows.json uses camelCase field naming (source fidelity with prototype JS)", () => {
    const { workflows, metadata } = loadWorkflows();
    // snake_case renamed keys should not appear on workflow steps
    for (const wf of workflows) {
      for (const step of wf.steps) {
        const keys = Object.keys(step);
        expect(
          keys.filter((k) => k.includes("_")),
          `step ${step.id} has snake_case keys: ${keys}`
        ).toEqual([]);
      }
    }
    if (metadata && typeof metadata === "object") {
      // Metadata documents the rename
      const convention = (metadata as Record<string, unknown>).fieldNamingConvention;
      expect(
        typeof convention === "string" && convention.toLowerCase().includes("camelcase"),
        `metadata should document camelCase convention, got: ${String(convention)}`
      ).toBe(true);
    }
  });
});
