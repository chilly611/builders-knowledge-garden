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
  const wf = parsed.workflows.find((w) => w.id === 'q4');
  if (!wf) throw new Error('Workflow q4 not found');
  return {
    workflow: wf,
    stages: parsed.lifecycleStages,
    jurisdictions: parsed.jurisdictions || [],
  };
}

describe('CodeComplianceClient — Happy Path', () => {
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

  it('workflow q4 loads with label "Contracts"', () => {
    expect(workflow).toBeDefined();
    expect(workflow.id).toBe('q4');
    expect(workflow.label).toBe('Contracts');
  });

  it('workflow q4 has multiple steps for template selection', () => {
    expect(workflow.steps.length).toBeGreaterThan(0);
    // First step should be template_chooser type
    const firstStep = workflow.steps[0];
    expect(firstStep.id).toBe('s4-1');
    expect(firstStep.type).toBe('template_chooser');
  });

  it('template chooser step includes contract templates', () => {
    const templateStep = workflow.steps.find((s) => s.type === 'template_chooser');
    expect(templateStep).toBeDefined();

    const templates = (templateStep as any).templates;
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);

    // Check that templates have names and descriptions
    templates.forEach((t: any) => {
      expect(t.name).toBeDefined();
      expect(t.desc).toBeDefined();
    });
  });

  it('template step includes standard contract types', () => {
    const templateStep = workflow.steps.find((s) => s.type === 'template_chooser');
    const templates = (templateStep as any).templates;

    const templateNames = templates.map((t: any) => t.name);

    // Should include client agreement, sub agreement, and lien waivers
    expect(templateNames.some((name: string) => name.includes('Client'))).toBe(true);
    expect(templateNames.some((name: string) => name.includes('Sub'))).toBe(true);
    expect(templateNames.some((name: string) => name.includes('Lien'))).toBe(true);
  });

  it('workflow has valid xp total', () => {
    expect(workflow.totalXp).toBeGreaterThan(0);
    expect(workflow.totalXp).toBe(100);
  });

  it('stages are loaded for lifecycle context', () => {
    expect(stages).toBeDefined();
    expect(Array.isArray(stages)).toBe(true);
    expect(stages.length).toBeGreaterThan(0);
  });

  it('jurisdictions are loaded from workflows.json', () => {
    expect(jurisdictions).toBeDefined();
    expect(Array.isArray(jurisdictions)).toBe(true);

    if (jurisdictions.length > 0) {
      // Check structure of a jurisdiction
      const jurisdiction = jurisdictions[0];
      expect(jurisdiction.id).toBeDefined();
      expect(jurisdiction.code).toBeDefined();
    }
  });

  it('can access groupJurisdictions utility', async () => {
    const { groupJurisdictions } = await import('@/lib/knowledge-data');
    expect(typeof groupJurisdictions).toBe('function');

    if (jurisdictions.length > 0) {
      const grouped = groupJurisdictions(jurisdictions);
      expect(Array.isArray(grouped)).toBe(true);

      // If we have jurisdictions, grouping should return an array of state groups
      if (grouped.length > 0) {
        const firstGroup = grouped[0];
        expect(firstGroup.state).toBeDefined();
        expect(firstGroup.counties).toBeDefined();
      }
    }
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

  it('workflow belongs to Lock stage (stageId 2)', () => {
    expect(workflow.stageId).toBe(2);
  });

  it('template step has required structure for conditional lien waivers', () => {
    const templateStep = workflow.steps.find((s) => s.type === 'template_chooser');
    const templates = (templateStep as any).templates;

    const liens = templates.filter((t: any) => t.name.includes('Lien'));
    expect(liens.length).toBeGreaterThanOrEqual(2);

    const liensNames: string[] = liens.map((l: any) => l.name);
    // Should have both conditional and unconditional variants
    expect(liensNames.some((n: string) => n.includes('Conditional'))).toBe(true);
    expect(liensNames.some((n: string) => n.includes('Unconditional'))).toBe(true);
  });
});
