/**
 * Budget Spine
 * ============
 *
 * Single client-side entry point for every workflow that moves money.
 *
 * Per `docs/week3-spine-spec.md` §2 every workflow calls the typed helpers
 * below — never `fetch('/api/v1/budget/items', ...)` directly, never
 * Supabase from a workflow component. That way:
 *   - `BudgetWidget` already subscribes to `bkg:budget:changed` and refreshes.
 *   - P&L stays coherent because {phase, category} pairs are set consistently.
 *   - Silent failure is well-defined (no white-screen when unauthenticated).
 *
 * MVP shape:
 *   - Resolves the active project id from localStorage `bkg-active-project`.
 *   - Calls `GET /api/v1/budget?project_id=...` to find the `budget_id`.
 *   - Creates a default budget on first write if one doesn't exist yet.
 *   - POSTs the line item.
 *   - Dispatches `bkg:budget:changed` for downstream listeners.
 *
 * Clerk auth isn't wired on /killerapp yet; the spine uses the Supabase
 * session bearer token the same way `BudgetWidget.tsx` does.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────

export type BudgetPhase = 'DREAM' | 'DESIGN' | 'PLAN' | 'BUILD' | 'DELIVER' | 'GROW';

export type BudgetCategory =
  | 'materials'
  | 'labor'
  | 'permits'
  | 'equipment'
  | 'subcontractor'
  | 'overhead'
  | 'other';

export type BudgetWriteReason =
  | 'no-active-project'
  | 'not-authenticated'
  | 'budget-create-failed'
  | 'item-create-failed'
  | 'validation'
  | 'network';

export interface BudgetWriteOkResult {
  ok: true;
  itemId: string;
  budgetId: string;
}

export interface BudgetWriteFailResult {
  ok: false;
  reason: BudgetWriteReason;
  detail?: string;
}

export type BudgetWriteResult = BudgetWriteOkResult | BudgetWriteFailResult;

export interface BaseWriteInput {
  /** Required. Human-legible description: "20 yards concrete for foundation". */
  description: string;
  /** Required. Positive dollar amount. */
  amount: number;
  /** 1-7 lifecycle stage — spine translates to the API phase enum. */
  lifecycleStageId: number;
  /** Optional vendor / subcontractor / payee name. */
  vendor?: string;
  /** Optional. Defaults to true (estimates). Flip to false only when money actually moved. */
  isEstimate?: boolean;
  /** Optional. ISO date. Defaults to now. */
  date?: string;
  /** Optional receipt image URL (for q17 Expense Tracking). */
  receiptUrl?: string;
  /** Optional override of the project id. Defaults to localStorage `bkg-active-project`. */
  projectId?: string;
}

// ─── Supabase browser client (mirrors BudgetWidget.tsx) ───────────────────

let browserClient: SupabaseClient | null = null;
function getBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes('placeholder')) {
    browserClient = createClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key'
    );
  } else {
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

async function getSessionToken(): Promise<string | null> {
  try {
    const supabase = getBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

// ─── Phase mapping ────────────────────────────────────────────────────────

// Maps the 7-stage lifecycle id → the 6-phase budget enum. See
// docs/week3-spine-spec.md §2 for the rationale.
const LIFECYCLE_TO_PHASE: Record<number, BudgetPhase> = {
  1: 'DREAM', // Size Up
  2: 'DESIGN', // Lock
  3: 'PLAN', // Plan
  4: 'BUILD', // Build
  5: 'BUILD', // Adapt — we keep adapt rows in BUILD so cost-of-goods stays unified
  6: 'DELIVER', // Collect
  7: 'GROW', // Reflect
};

function mapPhase(lifecycleStageId: number): BudgetPhase {
  return LIFECYCLE_TO_PHASE[lifecycleStageId] ?? 'PLAN';
}

// ─── Active project id ────────────────────────────────────────────────────

const ACTIVE_PROJECT_KEY = 'bkg-active-project';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getActiveProjectId(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

// ─── Budget resolution + lazy create ──────────────────────────────────────

interface BudgetFetchResult {
  ok: true;
  budgetId: string;
}

interface BudgetFetchMiss {
  ok: false;
  reason: 'missing';
}

interface BudgetFetchFail {
  ok: false;
  reason: BudgetWriteReason;
  detail?: string;
}

async function fetchBudgetId(
  projectId: string,
  token: string
): Promise<BudgetFetchResult | BudgetFetchMiss | BudgetFetchFail> {
  try {
    const res = await fetch(`/api/v1/budget?project_id=${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return { ok: false, reason: 'missing' };
    if (!res.ok) {
      return {
        ok: false,
        reason: 'network',
        detail: `budget lookup ${res.status}`,
      };
    }
    const data = (await res.json()) as { budget?: { id: string } };
    if (!data.budget?.id) return { ok: false, reason: 'missing' };
    return { ok: true, budgetId: data.budget.id };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function createDefaultBudget(
  projectId: string,
  token: string
): Promise<BudgetFetchResult | BudgetFetchFail> {
  try {
    const res = await fetch('/api/v1/budget', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        project_id: projectId,
        total_budget: 0, // user can raise it later; keeps overUnder math valid
        currency: 'USD',
        alert_threshold: 80,
        notes: 'Auto-created by workflow budget spine',
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        reason: 'budget-create-failed',
        detail: `budget create ${res.status}`,
      };
    }
    const data = (await res.json()) as { id: string };
    return { ok: true, budgetId: data.id };
  } catch (err) {
    return {
      ok: false,
      reason: 'budget-create-failed',
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function resolveBudgetId(
  projectId: string,
  token: string
): Promise<BudgetFetchResult | BudgetFetchFail> {
  const lookup = await fetchBudgetId(projectId, token);
  if (lookup.ok) return lookup;
  if (lookup.reason !== 'missing') return lookup;
  return createDefaultBudget(projectId, token);
}

// ─── Core write ───────────────────────────────────────────────────────────

interface CoreWriteInput extends BaseWriteInput {
  category: BudgetCategory;
}

async function writeBudgetItem(
  input: CoreWriteInput
): Promise<BudgetWriteResult> {
  if (!input.description || input.description.trim().length === 0) {
    return { ok: false, reason: 'validation', detail: 'description is required' };
  }
  if (typeof input.amount !== 'number' || Number.isNaN(input.amount) || input.amount < 0) {
    return {
      ok: false,
      reason: 'validation',
      detail: 'amount must be a non-negative number',
    };
  }

  const projectId = input.projectId ?? getActiveProjectId();
  if (!projectId) return { ok: false, reason: 'no-active-project' };

  const token = await getSessionToken();
  if (!token) return { ok: false, reason: 'not-authenticated' };

  const budget = await resolveBudgetId(projectId, token);
  if (!budget.ok) return budget;

  try {
    const res = await fetch('/api/v1/budget/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        budget_id: budget.budgetId,
        phase: mapPhase(input.lifecycleStageId),
        category: input.category,
        description: input.description.trim(),
        amount: input.amount,
        vendor: input.vendor ?? null,
        receipt_url: input.receiptUrl ?? null,
        is_estimate: input.isEstimate ?? true,
        date: input.date ?? new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        reason: 'item-create-failed',
        detail:
          (body as { error?: string; detail?: string }).detail ??
          (body as { error?: string }).error ??
          `HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as { item: { id: string } };

    if (isBrowser()) {
      window.dispatchEvent(
        new CustomEvent('bkg:budget:changed', {
          detail: {
            projectId,
            budgetId: budget.budgetId,
            itemId: data.item.id,
            category: input.category,
          },
        })
      );
    }

    return { ok: true, itemId: data.item.id, budgetId: budget.budgetId };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }
}

// ─── Typed helpers (workflow-facing surface) ──────────────────────────────

export function recordMaterialCost(input: BaseWriteInput): Promise<BudgetWriteResult> {
  return writeBudgetItem({ ...input, category: 'materials' });
}

export function recordSubcontractorCost(
  input: BaseWriteInput
): Promise<BudgetWriteResult> {
  return writeBudgetItem({ ...input, category: 'subcontractor' });
}

export function recordEquipmentCost(
  input: BaseWriteInput
): Promise<BudgetWriteResult> {
  return writeBudgetItem({ ...input, category: 'equipment' });
}

export function recordLaborCost(input: BaseWriteInput): Promise<BudgetWriteResult> {
  return writeBudgetItem({ ...input, category: 'labor' });
}

export function recordPermitCost(input: BaseWriteInput): Promise<BudgetWriteResult> {
  return writeBudgetItem({ ...input, category: 'permits' });
}

/**
 * q17 Expense Tracking — receipts the contractor actually paid. Defaults
 * is_estimate to FALSE because receipts are cash out the door.
 */
export function recordExpense(
  input: BaseWriteInput & { category?: BudgetCategory }
): Promise<BudgetWriteResult> {
  return writeBudgetItem({
    ...input,
    isEstimate: input.isEstimate ?? false,
    category: input.category ?? 'other',
  });
}

/**
 * Client payment reconciliation — stored as a NEGATIVE overhead line in
 * MVP so remaining = total_budget - totalSpent + clientPayments doesn't
 * need a separate column. When the invoice stack (AIA G702/G703) lands a
 * dedicated endpoint in Week 4, swap this to call that instead.
 */
export function recordClientPayment(
  input: Omit<BaseWriteInput, 'isEstimate'> & { invoiceNumber?: string }
): Promise<BudgetWriteResult> {
  return writeBudgetItem({
    ...input,
    description: input.invoiceNumber
      ? `Client payment — ${input.invoiceNumber} — ${input.description}`
      : `Client payment — ${input.description}`,
    amount: -Math.abs(input.amount),
    isEstimate: false,
    category: 'other',
  });
}

/**
 * Read-only helper for workflows that want to display current burn before
 * asking for a write (e.g. q2 Estimating shows "You've already estimated
 * $X across 3 categories").
 */
export async function getProjectBudget(projectId?: string): Promise<
  | { ok: true; budgetId: string; summary: unknown }
  | { ok: false; reason: BudgetWriteReason; detail?: string }
> {
  const pid = projectId ?? getActiveProjectId();
  if (!pid) return { ok: false, reason: 'no-active-project' };
  const token = await getSessionToken();
  if (!token) return { ok: false, reason: 'not-authenticated' };

  try {
    const res = await fetch(`/api/v1/budget?project_id=${pid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return {
        ok: false,
        reason: 'network',
        detail: `budget read ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      budget: { id: string };
      summary: unknown;
    };
    return { ok: true, budgetId: data.budget.id, summary: data.summary };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }
}
