import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';

// Mock modules before any imports
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
  usePathname: vi.fn(() => '/killerapp/workflows/code-compliance'),
}));

vi.mock('@/lib/knowledge-data', () => ({
  groupJurisdictions: vi.fn((jurisdictions) => {
    // Simple grouping by state
    const grouped: Record<string, any> = {};
    jurisdictions.forEach((j: any) => {
      if (!grouped[j.state]) {
        grouped[j.state] = { state: j.state, counties: {} };
      }
      const county = j.county || '(statewide)';
      if (!grouped[j.state].counties[county]) {
        grouped[j.state].counties[county] = { county, jurisdictions: [] };
      }
      grouped[j.state].counties[county].jurisdictions.push(j);
    });

    return Object.values(grouped).map((state: any) => ({
      state: state.state,
      counties: Object.values(state.counties),
    }));
  }),
}));

interface WorkflowsJson {
  lifecycleStages: LifecycleStage[];
  workflows: Workflow[];
  jurisdictions: any[];
}

// Load workflow and jurisdictions from workflows.json
function loadWorkflow() {
  const raw = readFileSync(resolve(process.cwd(), 'docs/workflows.json'), 'utf-8');
  const parsed = JSON.parse(raw) as WorkflowsJson;
  const wf = parsed.workflows.find((w) => w.id === 'q5');
  if (!wf) throw new Error('Workflow q5 not found');
  return {
    workflow: wf,
    stages: parsed.lifecycleStages,
    jurisdictions: parsed.jurisdictions || [],
  };
}

describe('Code Compliance Workflow — Happy Path', () => {
  let workflow: Workflow;
  let stages: LifecycleStage[];
  let jurisdictions: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    const loaded = loadWorkflow();
    workflow = loaded.workflow;
    stages = loaded.stages;
    jurisdictions = loaded.jurisdictions;
  });

  it('workflow q5 loads with label "Check the codes" (brand-voice labelling)', () => {
    expect(workflow).toBeDefined();
    expect(workflow.id).toBe('q5');
    expect(workflow.label).toBe('Check the codes');
  });

  it('workflow q5 starts with router step s5-0', () => {
    expect(workflow.steps.length).toBeGreaterThan(0);
    const firstStep = workflow.steps[0];
    expect(firstStep.id).toBe('s5-0');
    expect(firstStep.type).toBe('analysis_result');
    expect(firstStep.promptId).toBe('compliance-router');
  });

  it('router step has analysis_result type and compliance-router promptId', () => {
    const routerStep = workflow.steps.find((s) => s.id === 's5-0');
    expect(routerStep).toBeDefined();
    expect((routerStep as any).analysisTitle).toBe('Routed Code Check');
    expect((routerStep as any).promptId).toBe('compliance-router');
  });

  it('workflow has 7 steps total (s5-0 through s5-6)', () => {
    expect(workflow.steps.length).toBe(7);
    const stepIds = workflow.steps.map((s) => s.id);
    expect(stepIds).toEqual(['s5-0', 's5-1', 's5-2', 's5-3', 's5-4', 's5-5', 's5-6']);
  });

  it('specialist steps s5-1 through s5-4 have analysis_result type', () => {
    const specialistSteps = workflow.steps.filter((s) => ['s5-1', 's5-2', 's5-3', 's5-4'].includes(s.id));
    expect(specialistSteps.length).toBe(4);
    specialistSteps.forEach((step) => {
      expect(step.type).toBe('analysis_result');
      expect((step as any).promptId).toBeDefined();
      expect((step as any).analysisTitle).toBeDefined();
    });
  });

  it('specialist steps have correct promptIds', () => {
    const step1 = workflow.steps.find((s) => s.id === 's5-1');
    const step2 = workflow.steps.find((s) => s.id === 's5-2');
    const step3 = workflow.steps.find((s) => s.id === 's5-3');
    const step4 = workflow.steps.find((s) => s.id === 's5-4');

    expect((step1 as any).promptId).toBe('compliance-structural');
    expect((step2 as any).promptId).toBe('compliance-electrical');
    expect((step3 as any).promptId).toBe('compliance-plumbing');
    expect((step4 as any).promptId).toBe('compliance-fire');
  });

  it('specialist steps do not have exampleOutput field', () => {
    const specialistSteps = workflow.steps.filter((s) => ['s5-1', 's5-2', 's5-3', 's5-4'].includes(s.id));
    specialistSteps.forEach((step) => {
      expect((step as any).exampleOutput).toBeUndefined();
    });
  });

  it('workflow has valid xp total', () => {
    expect(workflow.totalXp).toBeGreaterThan(0);
    expect(workflow.totalXp).toBe(75);
  });

  it('workflow belongs to Lock stage (stageId 2)', () => {
    expect(workflow.stageId).toBe(2);
  });

  it('stages are loaded for lifecycle context', () => {
    expect(stages).toBeDefined();
    expect(Array.isArray(stages)).toBe(true);
    expect(stages.length).toBeGreaterThan(0);
  });

  it('all steps have valid step types', () => {
    const validStepTypes = [
      'text_input',
      'voice_input',
      'number_input',
      'location_input',
      'multi_select',
      'select',
      'file_upload',
      'template_chooser',
      'checklist',
      'analysis_result',
    ];

    workflow.steps.forEach((step) => {
      expect(validStepTypes).toContain(step.type);
    });
  });

  it('final input steps s5-5 and s5-6 are text_input type', () => {
    const step5 = workflow.steps.find((s) => s.id === 's5-5');
    const step6 = workflow.steps.find((s) => s.id === 's5-6');

    expect(step5).toBeDefined();
    expect(step5?.type).toBe('text_input');
    expect(step6).toBeDefined();
    expect(step6?.type).toBe('text_input');
  });
});
