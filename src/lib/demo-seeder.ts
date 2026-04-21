/**
 * Demo Project Seeder
 * ===================
 *
 * Static JSON import of the demo project's immutable shape, with typed
 * getters. Static import (vs runtime `fs.readFileSync`) is REQUIRED so
 * this module remains safe to import into `'use client'` components —
 * the previous version pulled in Node's `fs`/`path` and broke the
 * production `next build` bundle on Vercel.
 *
 * Used by:
 *   - /killerapp/projects/demo-project
 *   - ProjectDashboardClient (client component)
 *   - ProjectCompass as a fallback when no real project is active
 *   - Demo onboarding flows
 */

// Static import — Webpack/Turbopack bundle this at build time.
// tsconfig.json has `resolveJsonModule: true` so this typechecks fine.
import demoProjectData from '../../docs/demo-data/demo-project.json';

// ─── Types ────────────────────────────────────────────────────────────────

export interface DemoProjectClient {
  name: string;
  email: string;
  phone: string;
}

export interface DemoProjectTeamMember {
  name: string;
  role: string;
  trade: string;
  verified: boolean;
}

export interface DemoProjectActivity {
  ts: string;
  type: string;
  summary: string;
  source: string;
}

export interface DemoProjectOpenItem {
  priority: 'high' | 'med' | 'low';
  label: string;
  stage: number;
  dueBy?: string;
}

export interface DemoProjectRisk {
  level: 'green' | 'yellow' | 'red';
  text: string;
}

export interface DemoProjectBudgetCategory {
  budgeted: number;
  spent: number;
}

export interface DemoProjectBudget {
  approved: number;
  spent: number;
  committed: number;
  byCategory: Record<string, DemoProjectBudgetCategory>;
}

export interface DemoProject {
  id: string;
  name: string;
  address: string;
  client: DemoProjectClient;
  contractor: string;
  projectType: string;
  startDate: string;
  targetCompletion: string;
  currentStage: number;
  stageProgress: Record<number | string, number>;
  budget: DemoProjectBudget;
  team: DemoProjectTeamMember[];
  recentActivity: DemoProjectActivity[];
  openItems: DemoProjectOpenItem[];
  risks: DemoProjectRisk[];
}

// ─── Load at module init ───────────────────────────────────────────────────

// Static import is already resolved at build time. Cast once through the
// typed interface for downstream consumers.
const _demoProject: DemoProject = demoProjectData as DemoProject;

function loadDemoProject(): DemoProject {
  return _demoProject;
}

// ─── Typed getters ────────────────────────────────────────────────────────

export function getDemoProject(): DemoProject {
  return loadDemoProject();
}

export function getDemoProjectId(): string {
  return loadDemoProject().id;
}

export function getDemoProjectName(): string {
  return loadDemoProject().name;
}

export function getDemoProjectAddress(): string {
  return loadDemoProject().address;
}

export function getDemoProjectClient(): DemoProjectClient {
  return loadDemoProject().client;
}

export function getDemoProjectContractor(): string {
  return loadDemoProject().contractor;
}

export function getDemoProjectType(): string {
  return loadDemoProject().projectType;
}

export function getDemoProjectStartDate(): string {
  return loadDemoProject().startDate;
}

export function getDemoProjectTargetCompletion(): string {
  return loadDemoProject().targetCompletion;
}

export function getDemoProjectCurrentStage(): number {
  return loadDemoProject().currentStage;
}

export function getDemoProjectStageProgress(): Record<number | string, number> {
  return loadDemoProject().stageProgress;
}

export function getDemoProjectBudget(): DemoProjectBudget {
  return loadDemoProject().budget;
}

export function getDemoProjectTeam(): DemoProjectTeamMember[] {
  return loadDemoProject().team;
}

export function getDemoProjectActivity(): DemoProjectActivity[] {
  return loadDemoProject().recentActivity;
}

export function getDemoProjectOpenItems(): DemoProjectOpenItem[] {
  return loadDemoProject().openItems;
}

export function getDemoProjectRisks(): DemoProjectRisk[] {
  return loadDemoProject().risks;
}

/**
 * Derive a BudgetApiSummary from the demo project's budget structure.
 * This allows the ProjectCompass to render the same way for demo data
 * as it does for real API responses.
 */
export function getDemoProjectBudgetApiSummary() {
  const proj = loadDemoProject();
  const budget = proj.budget;

  // Map our budget structure to byPhase format for compass rendering.
  // We need to reverse-engineer the phases from the categories.
  // For demo purposes, allocate linearly across phases based on stage-category mapping.

  const phaseMapping: Record<string, number[]> = {
    DREAM: [1],
    DESIGN: [2],
    PLAN: [3],
    BUILD: [4, 5],
    DELIVER: [6],
    GROW: [7],
  };

  // A reasonable heuristic: map categories to phases based on when they're typically spent
  const categoryToPhase: Record<string, string> = {
    permits: 'DREAM',
    foundation: 'PLAN',
    framing: 'BUILD',
    'rough-mechanical': 'BUILD',
    roofing: 'BUILD',
    exterior: 'BUILD',
    'interior-finish': 'DELIVER',
    landscape: 'GROW',
    contingency: 'BUILD',
  };

  const byPhase: Record<
    string,
    { spent?: number; estimated?: number; count?: number }
  > = {};

  for (const phase of Object.keys(phaseMapping)) {
    byPhase[phase] = { spent: 0, estimated: 0, count: 0 };
  }

  for (const [cat, data] of Object.entries(budget.byCategory)) {
    const phase = categoryToPhase[cat] || 'BUILD';
    if (!byPhase[phase]) byPhase[phase] = { spent: 0, estimated: 0 };
    byPhase[phase].spent = (byPhase[phase].spent || 0) + data.spent;
    byPhase[phase].estimated =
      (byPhase[phase].estimated || 0) + (data.budgeted - data.spent);
    byPhase[phase].count = (byPhase[phase].count || 0) + 1;
  }

  // Assume we've received 50% of approved budget for the demo (realistic mid-flight state)
  const clientPaymentsReceived = budget.approved * 0.5;

  return {
    totalBudget: budget.approved,
    totalSpent: budget.spent,
    totalEstimated: budget.committed - budget.spent,
    actualExpenses: budget.spent,
    clientPaymentsReceived,
    plAfterPayments: clientPaymentsReceived - budget.spent,
    percentUsed: (budget.spent / budget.approved) * 100,
    byPhase,
  };
}
