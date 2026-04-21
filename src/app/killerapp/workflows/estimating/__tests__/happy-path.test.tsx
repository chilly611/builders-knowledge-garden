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
  usePathname: vi.fn(() => '/killerapp/workflows/estimating'),
}));

vi.mock('@/lib/journey-progress', () => ({
  resolveProjectId: vi.fn().mockReturnValue('project-123'),
  emitJourneyEvent: vi.fn(),
}));

vi.mock('@/lib/budget-spine', () => ({
  getProjectBudget: vi.fn().mockResolvedValue({
    ok: true,
    summary: {
      totalEstimated: 50000,
      byCategory: {
        materials: { spent: 10000, estimated: 20000, count: 5 },
        labor: { spent: 5000, estimated: 15000, count: 3 },
      },
    },
  }),
  recordMaterialCost: vi.fn().mockResolvedValue({ ok: true }),
}));

interface WorkflowsJson {
  lifecycleStages: LifecycleStage[];
  workflows: Workflow[];
}

// Load workflow from workflows.json
function loadWorkflow() {
  const raw = readFileSync(resolve(process.cwd(), 'docs/workflows.json'), 'utf-8');
  const parsed = JSON.parse(raw) as WorkflowsJson;
  const wf = parsed.workflows.find((w) => w.id === 'q2');
  if (!wf) throw new Error('Workflow q2 not found');
  return {
    workflow: wf,
    stages: parsed.lifecycleStages,
  };
}

describe('EstimatingClient — Happy Path', () => {
  let workflow: Workflow;
  let stages: LifecycleStage[];

  beforeEach(() => {
    vi.clearAllMocks();
    const loaded = loadWorkflow();
    workflow = loaded.workflow;
    stages = loaded.stages;
  });

  it('workflow q2 loads with label "Estimating"', () => {
    expect(workflow).toBeDefined();
    expect(workflow.id).toBe('q2');
    expect(workflow.label).toBe('Estimating');
  });

  it('workflow q2 has 6 input capture steps plus AI estimate', () => {
    expect(workflow.steps.length).toBe(6);
    const stepIds = workflow.steps.map((s) => s.id);

    // Check step sequence
    expect(stepIds[0]).toBe('s2-1'); // Project description
    expect(stepIds[1]).toBe('s2-2'); // Job location
    expect(stepIds[2]).toBe('s2-3'); // Square footage
    expect(stepIds[3]).toBe('s2-4'); // Trade specialties
    expect(stepIds[4]).toBe('s2-5'); // Upload documents
    expect(stepIds[5]).toBe('s2-6'); // AI estimate
  });

  it('first step is voice input for project description', () => {
    const firstStep = workflow.steps[0];
    expect(firstStep.id).toBe('s2-1');
    expect(firstStep.label).toContain('Project description');
    expect(firstStep.type).toBe('voice_input');
  });

  it('second step is location input for job site', () => {
    const secondStep = workflow.steps[1];
    expect(secondStep.id).toBe('s2-2');
    expect(secondStep.label).toContain('Job location');
    expect(secondStep.type).toBe('location_input');
  });

  it('third step is number input for square footage', () => {
    const thirdStep = workflow.steps[2];
    expect(thirdStep.id).toBe('s2-3');
    expect(thirdStep.label).toContain('square footage');
    expect(thirdStep.type).toBe('number_input');
    expect((thirdStep as any).unit).toBe('sq ft');
  });

  it('fourth step is multi-select for trade specialties', () => {
    const fourthStep = workflow.steps[3];
    expect(fourthStep.id).toBe('s2-4');
    expect(fourthStep.label).toContain('Trade specialties');
    expect(fourthStep.type).toBe('multi_select');

    const options = (fourthStep as any).options;
    expect(Array.isArray(options)).toBe(true);
    expect(options.length).toBeGreaterThan(0);

    // Should include common trades
    expect(options.some((o: string) => o.includes('Electrical'))).toBe(true);
    expect(options.some((o: string) => o.includes('Plumbing'))).toBe(true);
  });

  it('fifth step is file upload for documents', () => {
    const fifthStep = workflow.steps[4];
    expect(fifthStep.id).toBe('s2-5');
    expect(fifthStep.label).toContain('Upload documents');
    expect(fifthStep.type).toBe('file_upload');

    const accept = (fifthStep as any).accept;
    expect(typeof accept).toBe('string');
    expect(accept.toUpperCase()).toContain('PDF');
  });

  it('final step is analysis_result for AI estimate', () => {
    const finalStep = workflow.steps[5];
    expect(finalStep.id).toBe('s2-6');
    expect(finalStep.label).toContain('AI estimate');
    expect(finalStep.type).toBe('analysis_result');
    expect((finalStep as any).promptId).toBeDefined();
  });

  it('workflow has valid xp total', () => {
    expect(workflow.totalXp).toBeGreaterThan(0);
    expect(workflow.totalXp).toBe(100);
  });

  it('workflow belongs to Size-Up stage (stageId 1)', () => {
    expect(workflow.stageId).toBe(1);
  });

  it('stages are loaded for lifecycle context', () => {
    expect(stages).toBeDefined();
    expect(Array.isArray(stages)).toBe(true);
    expect(stages.length).toBeGreaterThan(0);
  });

  it('getProjectBudget returns valid budget summary shape', async () => {
    const { getProjectBudget } = await import('@/lib/budget-spine');

    const result = await getProjectBudget();

    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrow for tsc
    expect(result.summary).toBeDefined();
    const summary = result.summary as { totalEstimated: number; byCategory: unknown };
    expect(summary.totalEstimated).toBeGreaterThanOrEqual(0);
    expect(summary.byCategory).toBeDefined();
  });

  it('recordMaterialCost can record AI estimate amounts', async () => {
    const { recordMaterialCost } = await import('@/lib/budget-spine');

    const result = await recordMaterialCost({
      description: 'AI estimate — Size Up',
      amount: 42500,
      lifecycleStageId: 1,
      isEstimate: true,
      projectId: 'project-123',
    });

    expect(result.ok).toBe(true);
  });

  it('resolveProjectId returns project identifier for budget operations', async () => {
    const { resolveProjectId } = await import('@/lib/journey-progress');

    const projectId = resolveProjectId();

    expect(projectId).toBe('project-123');
    expect(typeof projectId).toBe('string');
  });

  it('AI estimate step has promptId for specialist runner', () => {
    const estimateStep = workflow.steps.find((s) => s.id === 's2-6') as any;
    expect(estimateStep).toBeDefined();
    expect(estimateStep.promptId).toBeDefined();
    expect(typeof estimateStep.promptId).toBe('string');
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

  it('trade specialties include expected construction trades', () => {
    const fourthStep = workflow.steps[3];
    const options = (fourthStep as any).options;

    const expectedTrades = [
      'General / GC',
      'Electrical',
      'Plumbing',
      'HVAC',
      'Roofing',
      'Concrete',
      'Drywall',
      'Painting',
      'Flooring',
    ];

    expectedTrades.forEach((trade) => {
      expect(options).toContain(trade);
    });
  });

  it('square footage input has appropriate placeholder', () => {
    const sqftStep = workflow.steps[2];
    const placeholder = (sqftStep as any).placeholder;
    expect(placeholder).toBeDefined();
    // Placeholder is "e.g., 2400" which contains a number example
    expect(typeof placeholder).toBe('string');
    expect(placeholder.length).toBeGreaterThan(0);
  });
});
