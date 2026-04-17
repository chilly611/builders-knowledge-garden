/**
 * StepCard Primitive — Type Definitions
 * Extracted from workflows.json and design spec
 */

/**
 * Step type union — the complete set of input and analysis types
 * supported by the Killer App workflow system.
 */
export type StepType =
  | 'text_input'
  | 'voice_input'
  | 'number_input'
  | 'location_input'
  | 'multi_select'
  | 'select'
  | 'file_upload'
  | 'template_chooser'
  | 'checklist'
  | 'analysis_result';

/**
 * Step status — tracks where a step is in its lifecycle
 */
export type StepStatus = 'pending' | 'in_progress' | 'complete';

/**
 * Template option for template_chooser step type
 */
export interface TemplateOption {
  icon?: string;
  name: string;
  desc: string;
}

/**
 * WorkflowStep — the data shape of a single step in a workflow
 * Mirrors the structure from workflows.json (camelCase)
 */
export interface WorkflowStep {
  id: string;
  label: string;
  type: StepType;
  promptId?: string;
  analysisTitle?: string;
  exampleOutput?: string;
  placeholder?: string;
  options?: string[];
  templates?: TemplateOption[];
  unit?: string;
  accept?: string;
  notes?: string;
}

/**
 * StepResult — emitted when a step is submitted/completed
 * Includes structured data for Time Machine replay capability
 */
export interface StepResult {
  type: 'step_opened' | 'step_saved' | 'step_skipped' | 'step_completed';
  stepId: string;
  payload?: unknown;
  timestamp: number;
}

/**
 * StepCardProps — component contract for StepCard
 * Supports all constitution-binding patterns:
 * - Goal 1 (plain language first): proMode allows label swapping
 * - Goal 5 (fearless navigation): onAction emits replayable events
 * - Goal 8 (machine-legible): structured data in hidden script tag
 * - Goal 9 (voice is equal): voice button visible on every textarea
 */
export interface StepCardProps {
  step: WorkflowStep;
  status?: StepStatus;
  stepNumber?: number;
  totalSteps?: number;
  xpReward?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onAction?: (result: StepResult) => void;
  renderAnalysis?: (step: WorkflowStep, input: string) => React.ReactNode;
  /**
   * Pro Toggle (constitution binding decision #1):
   * Visible, not buried. When true, labels shift from human arc to pro arc.
   * Currently a placeholder hook — label swap logic lives at workflow level.
   * Documented here for future implementers.
   */
  proMode?: boolean;
}
