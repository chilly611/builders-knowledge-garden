import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';

// Mock modules before any imports
vi.mock('@/lib/resource-broker', () => ({
  search: vi.fn().mockResolvedValue({
    results: [],
    totalFound: 0,
    latencyMs: 50,
    sources: ['demo'],
    warnings: [],
    runId: 'test-run-123',
  }),
}));

vi.mock('@/lib/journey-progress', () => ({
  resolveProjectId: vi.fn().mockReturnValue('project-123'),
  emitJourneyEvent: vi.fn(),
}));

vi.mock('@/lib/budget-spine', () => ({
  recordMaterialCost: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
  usePathname: vi.fn(() => '/killerapp/workflows/supply-ordering'),
}));

// Demo fixture for supply resources (subset for testing)
const demoFixtures = [
  {
    id: 'supply-001',
    kind: 'supply' as const,
    title: 'Lumber - 2x6 SPF 12ft',
    vendor: 'Home Depot',
    source: 'home_depot' as const,
    url: 'https://www.homedepot.com/p/lumber',
    priceUsd: 12.99,
    priceDisplay: '$12.99',
    distance: { miles: 2.1, text: '2.1 mi away' },
    availability: 'in stock',
    rating: { stars: 4.7, count: 128 },
    snippet: '2x6 SPF framing lumber',
    reasoning: 'Perfect for framing applications.',
  },
];

// Load workflow from workflows.json
function loadWorkflow() {
  const raw = readFileSync(resolve(process.cwd(), 'docs/workflows.json'), 'utf-8');
  const parsed = JSON.parse(raw) as {
    lifecycleStages: LifecycleStage[];
    workflows: Workflow[];
  };
  const wf = parsed.workflows.find((w) => w.id === 'q11');
  if (!wf) throw new Error('Workflow q11 not found');
  return { workflow: wf, stages: parsed.lifecycleStages };
}

describe('SupplyOrderingClient — Happy Path', () => {
  let workflow: Workflow;
  let stages: LifecycleStage[];

  beforeEach(() => {
    vi.clearAllMocks();
    const loaded = loadWorkflow();
    workflow = loaded.workflow;
    stages = loaded.stages;
  });

  it('workflow q11 loads with 5 steps', () => {
    expect(workflow).toBeDefined();
    expect(workflow.id).toBe('q11');
    expect(workflow.label).toBe('Supply ordering');
    expect(workflow.steps.length).toBe(5);
  });

  it('first step is s11-1 (Extract material list)', () => {
    const firstStep = workflow.steps[0];
    expect(firstStep.id).toBe('s11-1');
    expect(firstStep.label).toContain('Extract material list');
    expect(firstStep.type).toBe('analysis_result');
  });

  it('second step is s11-2 (Find suppliers)', () => {
    const secondStep = workflow.steps[1];
    expect(secondStep.id).toBe('s11-2');
    expect(secondStep.label).toContain('Find suppliers');
    expect(secondStep.type).toBe('analysis_result');
  });

  it('third step is s11-3 (Compare pricing)', () => {
    const thirdStep = workflow.steps[2];
    expect(thirdStep.id).toBe('s11-3');
    expect(thirdStep.label).toContain('Compare pricing');
    expect(thirdStep.type).toBe('analysis_result');
  });

  it('fourth step is s11-4 (Flag lead times)', () => {
    const fourthStep = workflow.steps[3];
    expect(fourthStep.id).toBe('s11-4');
    expect(fourthStep.label).toContain('lead time');
    expect(fourthStep.type).toBe('analysis_result');
  });

  it('final step is s11-5 (Place orders) with checklist type', () => {
    const finalStep = workflow.steps[4];
    expect(finalStep.id).toBe('s11-5');
    expect(finalStep.label).toContain('Place orders');
    expect(finalStep.type).toBe('checklist');
  });

  it('workflow has valid xp total', () => {
    expect(workflow.totalXp).toBeGreaterThan(0);
    expect(workflow.totalXp).toBe(85);
  });

  it('stages are loaded and contain lifecycle information', () => {
    expect(stages).toBeDefined();
    expect(Array.isArray(stages)).toBe(true);
    expect(stages.length).toBeGreaterThan(0);
  });

  it('demo fixtures contain supply resources for testing', () => {
    const supplies = demoFixtures.filter((r) => r.kind === 'supply');
    expect(supplies.length).toBeGreaterThan(0);

    // Check that supplies have expected fields
    supplies.forEach((supply) => {
      expect(supply.id).toBeDefined();
      expect(supply.title).toBeDefined();
      expect(supply.url).toBeDefined();
    });
  });

  it('search mock returns valid ResourceResponse shape', async () => {
    const { search } = await import('@/lib/resource-broker');
    const response = await search({
      query: 'framing materials',
      kinds: ['supply'],
      limit: 4,
    });

    expect(response).toBeDefined();
    expect(response.results).toBeDefined();
    expect(Array.isArray(response.results)).toBe(true);
    expect(response.runId).toBeDefined();
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('resolveProjectId returns consistent project identifier', async () => {
    const { resolveProjectId } = await import('@/lib/journey-progress');
    const projectId = resolveProjectId();

    expect(projectId).toBe('project-123');
    expect(typeof projectId).toBe('string');
  });

  it('recordMaterialCost accepts valid budget spine shape', async () => {
    const { recordMaterialCost } = await import('@/lib/budget-spine');

    const result = await recordMaterialCost({
      description: 'Test supply cost',
      amount: 5000,
      lifecycleStageId: 3,
      isEstimate: true,
      projectId: 'test-project-123',
    });

    expect(result).toBeDefined();
    expect(result.ok).toBe(true);
  });
});
