import { describe, it, expect } from 'vitest';
import {
  STARTER_PROMPTS,
  DEFAULT_STARTERS,
  getStartersForWorkflow,
  StarterPrompt,
} from '../stage-prompts';

describe('stage-prompts', () => {
  /**
   * Verify all 17 live workflow keys are defined in STARTER_PROMPTS.
   */
  it('should have starters for all 17 live workflows', () => {
    const EXPECTED_WORKFLOWS = [
      'estimating',
      'contract-templates',
      'code-compliance',
      'job-sequencing',
      'worker-count',
      'permit-applications',
      'sub-management',
      'equipment',
      'supply-ordering',
      'services-todos',
      'hiring',
      'weather-scheduling',
      'daily-log',
      'osha-toolbox',
      'expenses',
      'outreach',
      'compass-nav',
    ];

    for (const workflow of EXPECTED_WORKFLOWS) {
      expect(STARTER_PROMPTS[workflow], `Missing prompts for ${workflow}`).toBeDefined();
    }

    // Verify count exactly matches
    expect(Object.keys(STARTER_PROMPTS).length).toBe(EXPECTED_WORKFLOWS.length);
  });

  /**
   * Each workflow should have exactly 3 starter prompts.
   */
  it('should have exactly 3 starters per workflow', () => {
    for (const [workflow, starters] of Object.entries(STARTER_PROMPTS)) {
      expect(
        starters.length,
        `${workflow} should have 3 starters, got ${starters.length}`
      ).toBe(3);
    }
  });

  /**
   * Each starter prompt should have label and prompt fields, non-empty.
   */
  it('should have valid label and prompt in each starter', () => {
    for (const [workflow, starters] of Object.entries(STARTER_PROMPTS)) {
      for (let i = 0; i < starters.length; i++) {
        const starter = starters[i];
        expect(starter, `${workflow}[${i}] is undefined`).toBeDefined();
        expect(starter.label, `${workflow}[${i}].label is empty`).toBeTruthy();
        expect(
          starter.label.length,
          `${workflow}[${i}].label too short`
        ).toBeGreaterThan(0);
        expect(starter.prompt, `${workflow}[${i}].prompt is empty`).toBeTruthy();
        expect(
          starter.prompt.length,
          `${workflow}[${i}].prompt too short`
        ).toBeGreaterThan(20);
      }
    }
  });

  /**
   * Verify DEFAULT_STARTERS structure and content.
   */
  it('should have valid default starters', () => {
    expect(Array.isArray(DEFAULT_STARTERS)).toBe(true);
    expect(DEFAULT_STARTERS.length).toBe(3);

    for (let i = 0; i < DEFAULT_STARTERS.length; i++) {
      const starter = DEFAULT_STARTERS[i];
      expect(starter.label).toBeTruthy();
      expect(starter.prompt).toBeTruthy();
      expect(starter.prompt.length).toBeGreaterThan(20);
    }
  });

  /**
   * getStartersForWorkflow should return DEFAULT_STARTERS when workflowId is undefined.
   */
  it('should return DEFAULT_STARTERS when workflowId is undefined', () => {
    const result = getStartersForWorkflow(undefined);
    expect(result).toEqual(DEFAULT_STARTERS);
  });

  /**
   * getStartersForWorkflow should return DEFAULT_STARTERS for unknown workflows.
   */
  it('should return DEFAULT_STARTERS for unknown workflows', () => {
    const result = getStartersForWorkflow('unknown-workflow');
    expect(result).toEqual(DEFAULT_STARTERS);
  });

  /**
   * getStartersForWorkflow should return the correct starters for a known workflow.
   */
  it('should return correct starters for known workflows', () => {
    const estimatingStarters = getStartersForWorkflow('estimating');
    expect(estimatingStarters).toEqual(STARTER_PROMPTS['estimating']);
    expect(estimatingStarters.length).toBe(3);

    const jobSeqStarters = getStartersForWorkflow('job-sequencing');
    expect(jobSeqStarters).toEqual(STARTER_PROMPTS['job-sequencing']);
    expect(jobSeqStarters.length).toBe(3);
  });

  /**
   * Verify StarterPrompt interface compliance.
   */
  it('should conform to StarterPrompt interface', () => {
    const testStarter: StarterPrompt = {
      label: 'Test Label',
      prompt: 'This is a test prompt with enough content.',
    };
    expect(testStarter.label).toBeTruthy();
    expect(testStarter.prompt).toBeTruthy();
  });

  /**
   * Verify exports exist and are correct types.
   */
  it('should export all required items', () => {
    expect(typeof STARTER_PROMPTS).toBe('object');
    expect(Array.isArray(DEFAULT_STARTERS)).toBe(true);
    expect(typeof getStartersForWorkflow).toBe('function');
  });
});
